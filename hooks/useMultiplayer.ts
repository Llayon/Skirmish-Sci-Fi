import { useState, useEffect } from 'react';
import { useMultiplayerStore, useBattleStore } from '../stores';
import { multiplayerService } from '../services/multiplayerService';
import { PlayerAction } from '../types';
import type { MultiplayerMessage } from '../types/multiplayer';

export const useMultiplayer = () => {
    const multiplayerRole = useMultiplayerStore(state => state.multiplayerRole);
    const abortMultiplayerBattle = useMultiplayerStore(state => state.actions.abortMultiplayer);
    const { setBattle, dispatchAction } = useBattleStore(state => state.actions);
    
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
    const [isReconnecting, setIsReconnecting] = useState(false);

    useEffect(() => {
        if (!multiplayerRole) {
            setConnectionStatus('disconnected');
            setIsReconnecting(false);
            return;
        }

        setConnectionStatus('connecting'); // Assume connecting when role is set

        const handleData = (message: MultiplayerMessage) => {
            // Engine V2 Handling
            const engineV2Enabled = useBattleStore.getState().engineV2Enabled;
            
            if (engineV2Enabled) {
                if (message.type === 'ENGINE_ACTION' && multiplayerRole === 'guest') {
                    const result = useBattleStore.getState().actions.handleEngineActionFromNetwork(message.payload);
                    if (!result.ok && (result.reason === 'hash_mismatch' || result.reason === 'invalid_action' || result.reason === 'out_of_order_ack')) {
                        const state = useBattleStore.getState();
                        if (state.battle) {
                            multiplayerService.send({ 
                                type: 'ENGINE_SYNC_REQUEST', 
                                payload: { battleId: state.battle.id, lastReceivedSeq: state.engineNetRemoteSeq } 
                            });
                        }
                    }
                    return;
                }
                
                if (message.type === 'ENGINE_SNAPSHOT' && multiplayerRole === 'guest') {
                    useBattleStore.getState().actions.applyEngineSnapshotFromNetwork(message.payload);
                    return;
                }

                if (message.type === 'ENGINE_SYNC_REQUEST' && multiplayerRole === 'host') {
                    useBattleStore.getState().actions.handleEngineSyncRequestFromNetwork(message.payload);
                    return;
                }

                if (message.type === 'ENGINE_SYNC_RESPONSE' && multiplayerRole === 'guest') {
                    useBattleStore.getState().actions.handleEngineSyncResponseFromNetwork(message.payload);
                    return;
                }

                if (message.type === 'ENGINE_ACTION_REJECT' && multiplayerRole === 'guest') {
                    useBattleStore.getState().actions.handleEngineActionRejectFromNetwork(message.payload);
                    const state = useBattleStore.getState();
                    if (state.battle) {
                        multiplayerService.send({ 
                            type: 'ENGINE_SYNC_REQUEST', 
                            payload: { battleId: state.battle.id, lastReceivedSeq: state.engineNetRemoteSeq } 
                        });
                    }
                    return;
                }

                if (message.type === 'ENGINE_PROPOSE_ACTION' && multiplayerRole === 'host') {
                    const store = useBattleStore.getState();
                    if (!store.battle || (message.payload.battleId && store.battle.id !== message.payload.battleId)) {
                        multiplayerService.send({ 
                            type: 'ENGINE_ACTION_REJECT', 
                            payload: { 
                                clientActionId: message.payload.clientActionId, 
                                reason: 'battle_id_mismatch',
                                battleId: message.payload.battleId 
                            } 
                        });
                        return;
                    }
                    if (store.engineNetResyncing) {
                         multiplayerService.send({ 
                            type: 'ENGINE_ACTION_REJECT', 
                            payload: { 
                                clientActionId: message.payload.clientActionId, 
                                reason: 'resyncing',
                                battleId: message.payload.battleId 
                            } 
                        });
                        return;
                    }

                    try {
                        store.actions.dispatchEngineAction(message.payload.action, { clientActionId: message.payload.clientActionId });
                    } catch (e) {
                        multiplayerService.send({ 
                            type: 'ENGINE_ACTION_REJECT', 
                            payload: { 
                                clientActionId: message.payload.clientActionId, 
                                reason: 'invalid_action',
                                battleId: message.payload.battleId 
                            } 
                        });
                    }
                    return;
                }
            }

            // Legacy V1 Handling
            if (message.type === 'PLAYER_ACTION' && multiplayerRole === 'host') {
                dispatchAction(message.payload as PlayerAction);
            } else if (message.type === 'BATTLE_UPDATE' && multiplayerRole === 'guest') {
                setBattle(draft => {
                    Object.assign(draft, message.payload);
                });
            }
        };

        const handlePeerError = (err: { message?: string; type?: string }) => {
            if (err.message === 'connection-failed' || err.type === 'peer-unavailable') {
                abortMultiplayerBattle();
            }
        };
        
        const unsubData = multiplayerService.onData(handleData);
        const unsubSyncRequest = multiplayerService.onSyncRequest(() => {
            if (multiplayerRole !== 'host') return;

            const store = useBattleStore.getState();
            const engineV2Enabled = store.engineV2Enabled;
            if (engineV2Enabled) {
                const snapshot = store.actions.createEngineSnapshotForNetwork();
                if (snapshot && store.battle) {
                    multiplayerService.send({ 
                        type: 'ENGINE_SYNC_RESPONSE', 
                        payload: {
                            battleId: store.battle.id,
                            startSeq: snapshot.seq,
                            actions: [],
                            snapshot
                        } 
                    });
                }
            } else {
                store.actions.sendFullBattleSync();
            }
        });

        const unsubReconnecting = multiplayerService.onReconnecting(() => {
            setConnectionStatus('connecting');
            setIsReconnecting(true);
        });
        const unsubConnect = multiplayerService.onConnect(() => {
            setConnectionStatus('connected');
            setIsReconnecting(false);
        });
        const unsubDisconnect = multiplayerService.onDisconnect(() => {
            setConnectionStatus('disconnected');
        });
        const unsubError = multiplayerService.onPeerError(handlePeerError);

        return () => {
            unsubData();
            unsubSyncRequest();
            unsubReconnecting();
            unsubConnect();
            unsubDisconnect();
            unsubError();
        };
    }, [multiplayerRole, dispatchAction, setBattle, abortMultiplayerBattle]);

    return {
        connectionStatus,
        isReconnecting,
        isHost: multiplayerRole === 'host',
        isGuest: multiplayerRole === 'guest',
        multiplayerRole,
    };
};
