
import { useState, useEffect } from 'react';
import { useMultiplayerStore, useBattleStore } from '../stores';
import { multiplayerService } from '../services/multiplayerService';
import { PlayerAction } from '../types';

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
        };

        setConnectionStatus('connecting'); // Assume connecting when role is set

        const handleData = (message: any) => {
            if (message.type === 'PLAYER_ACTION' && multiplayerRole === 'host') {
                dispatchAction(message.payload as PlayerAction);
            } else if (message.type === 'BATTLE_UPDATE' && multiplayerRole === 'guest') {
                setBattle(draft => {
                    Object.assign(draft, message.payload);
                });
            }
        };

        const handlePeerError = (err: any) => {
            if (err.message === 'connection-failed' || err.type === 'peer-unavailable') {
                abortMultiplayerBattle();
            }
        };
        
        const unsubData = multiplayerService.onData(handleData);
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
