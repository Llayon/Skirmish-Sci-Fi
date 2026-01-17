

import React, { useState, useEffect, useRef } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useTranslation } from '@/i18n';
import { Loader, Link, Wifi, WifiOff, Users } from 'lucide-react';
import { Crew } from '@/types';
import { useCampaignProgressStore, useBattleStore, useMultiplayerStore, useCrewStore } from '@/stores';
import { handleError } from '@/services/utils/errorHandler';

/**
 * A component that handles the multiplayer lobby state.
 * It manages peer-to-peer connections for hosting or joining a game,
 * displays connection status, and facilitates the exchange of crew information
 * before starting a multiplayer battle.
 * @returns {React.ReactElement | null} The rendered lobby, or null if the player's crew is not loaded.
 */
const MultiplayerLobby: React.FC = () => {
  const { t } = useTranslation();
  const [hostId, setHostId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [opponentCrew, setOpponentCrew] = useState<Crew | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const { multiplayerRole, joinId } = useMultiplayerStore();
  const abortMultiplayerBattle = useMultiplayerStore(state => state.actions.abortMultiplayer);

  const { setBattleFromLobby, startMultiplayerBattle } = useCampaignProgressStore(state => state.actions);
  const sendFullBattleSync = useBattleStore(state => state.actions.sendFullBattleSync);
  
  const crew = useCrewStore(state => state.crew);
  const isHost = multiplayerRole === 'host';

  const crewRef = useRef(crew);
  useEffect(() => {
    crewRef.current = crew;
  }, [crew]);
  
  const joinUrl = hostId ? `${window.location.origin}${window.location.pathname}?join=${hostId}` : '';

  useEffect(() => {
    if (!crew) return;

    const setup = async () => {
      setStatusMessage(isHost ? t('battle.multiplayerLobby.waitingForOpponent') : t('battle.multiplayerLobby.connectingToHost'));
      
      const { multiplayerService } = await import('@/services/multiplayerService');
      
      const onConnect = multiplayerService.onConnect(() => {
        setIsConnected(true);
        setIsConnecting(false);
        setErrorMessage(null);
        if (isHost) {
          multiplayerService.send({ type: 'CREW_SHARE', payload: crewRef.current! });
        }
      });

      const onServerDisconnect = multiplayerService.onServerDisconnect(() => {
        setIsConnected(false);
        setIsConnecting(true);
        setStatusMessage(t('battle.multiplayerLobby.reconnecting'));
      });

      const onDisconnect = multiplayerService.onDisconnect(() => {
        setIsConnected(false);
        setOpponentCrew(null);
        setErrorMessage(t('battle.multiplayerLobby.connectionLost'));
        setIsConnecting(false);
      });
      
      const onPeerError = multiplayerService.onPeerError((err: any) => {
        let message;
        if (err.message === 'connection-failed') {
            message = t('battle.multiplayerLobby.connectionFailed');
            setTimeout(() => abortMultiplayerBattle(), 5000);
        } else if (err.type === 'peer-unavailable' || err.message.includes('peer-unavailable')) {
            message = t('battle.multiplayerLobby.peerUnavailable');
        } else if (err.type === 'network' || err.type === 'server-error') {
            message = t('battle.multiplayerLobby.serverError');
        } else {
             message = t('battle.multiplayerLobby.connectionLost');
        }
        handleError(err, { type: 'PeerConnection' }, message);
        setErrorMessage(message);
        setIsConnected(false);
        setIsConnecting(false);
      });

      const onData = multiplayerService.onData((message) => {
        if (message.type === 'CREW_SHARE') {
          setOpponentCrew(message.payload);
          if (!isHost) {
             multiplayerService.send({ type: 'CREW_SHARE', payload: crewRef.current! });
          }
        }
        if (message.type === 'START_BATTLE') {
          setBattleFromLobby(message.payload, 'guest');
        }
      });

      const onSyncRequest = multiplayerService.onSyncRequest(() => {
        sendFullBattleSync();
      });

      const onReconnecting = multiplayerService.onReconnecting(() => {
        setStatusMessage(t('battle.multiplayerLobby.reconnecting'));
        setIsConnected(false);
        setIsConnecting(true);
      });
      
      try {
        if (isHost) {
          const id = await multiplayerService.host();
          setHostId(id);
        } else if (joinId) {
          await multiplayerService.join(joinId);
        }
      } catch (e: any) {
        let message = t('battle.multiplayerLobby.connectionLost');
        if (e.type === 'peer-unavailable' || e.message.includes('peer-unavailable')) {
            message = t('battle.multiplayerLobby.peerUnavailable');
        } else if (e.type === 'network' || e.type === 'server-error') {
            message = t('battle.multiplayerLobby.serverError');
        }
        handleError(e, { type: 'PeerInitialization' }, message);
        setErrorMessage(message);
        setIsConnecting(false);
      }
      
      return () => {
        onConnect();
        onServerDisconnect();
        onDisconnect();
        onPeerError();
        onData();
        onSyncRequest();
        onReconnecting();
      };
    };
    
    const cleanupPromise = setup();

    return () => {
      cleanupPromise.then(cleanup => {
        if (cleanup) cleanup();
      });
    };
  }, [isHost, joinId, setBattleFromLobby, t, crew, sendFullBattleSync, abortMultiplayerBattle, multiplayerRole]);
  
  const handleStartBattle = () => {
     import('@/components/battle/BattleView');
     if (!isHost || !opponentCrew || !crew) return;
     startMultiplayerBattle(crew, opponentCrew);
  };

  const ConnectionStatus = () => (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${errorMessage ? 'bg-danger/20 text-danger' : isConnected ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
      {isConnected ? <Wifi size={14} /> : (isConnecting ? <Loader size={14} className="animate-spin" /> : <WifiOff size={14} />)}
      <span>{errorMessage ? t('battle.multiplayerLobby.connectionErrorTitle') : isConnected ? t('battle.multiplayerLobby.connectionStatusConnected') : (isConnecting ? t('battle.multiplayerLobby.reconnecting') : t('battle.multiplayerLobby.connectionStatusDisconnected'))}</span>
    </div>
  );
  
  if (!crew) return null;

  return (
    <Card className="max-w-2xl mx-auto text-center">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold font-orbitron text-primary">{t('battle.multiplayerLobby.title')}</h2>
        <ConnectionStatus />
      </div>

      {errorMessage && (
        <div className="space-y-4 text-center mt-4 text-danger animate-fade-in">
          <p className="font-bold text-lg">{t('battle.multiplayerLobby.connectionErrorTitle')}</p>
          <p className="text-text-base">{errorMessage}</p>
        </div>
      )}

      {!errorMessage && !isConnected && (
        <div className="space-y-4">
          <Loader className="animate-spin mx-auto text-primary" />
          <p className="text-text-base">{statusMessage}</p>
          {isHost && hostId && (
            <div className="mt-4 space-y-2">
                <p className="text-text-base">{t('battle.multiplayerLobby.inviteMessage')}</p>
                <div className="p-3 bg-surface-base rounded-md flex items-center gap-3">
                    <Link size={20} className="text-primary" />
                    <input type="text" readOnly value={joinUrl} className="bg-transparent text-text-base w-full focus:outline-none" />
                    <Button onClick={() => navigator.clipboard.writeText(joinUrl)}>{t('buttons.copy')}</Button>
                </div>
            </div>
          )}
        </div>
      )}
      
      {!errorMessage && isConnected && (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
                <Card className="bg-surface-base/50 border-primary">
                    <h3 className="font-bold text-lg text-primary">{t(isHost ? 'battle.multiplayerLobby.yourCrew' : 'battle.multiplayerLobby.hostCrew')}</h3>
                    <p>{isHost ? crew.name : opponentCrew?.name || t('battle.multiplayerLobby.waitingForInfo')}</p>
                    <p className="text-sm text-text-muted flex items-center gap-2 mt-1">
                        <Users size={14} /> 
                        {t('battle.multiplayerLobby.members', { count: isHost ? crew.members.length : opponentCrew?.members.length || '...' })}
                    </p>
                </Card>
                <Card className="bg-surface-base/50 border-danger">
                    <h3 className="font-bold text-lg text-danger">{t(!isHost ? 'battle.multiplayerLobby.yourCrew' : 'battle.multiplayerLobby.opponentCrew')}</h3>
                    <p>{!isHost ? crew.name : opponentCrew?.name || t('battle.multiplayerLobby.waitingForInfo')}</p>
                    <p className="text-sm text-text-muted flex items-center gap-2 mt-1">
                        <Users size={14} />
                        {t('battle.multiplayerLobby.members', { count: !isHost ? crew.members.length : opponentCrew?.members.length || '...' })}
                    </p>
                </Card>
            </div>
            
            {isHost && (
                <Button onClick={handleStartBattle} disabled={!opponentCrew} variant="primary">
                    {t('battle.multiplayerLobby.startBattle')}
                </Button>
            )}

            {!isHost && (
                <p className="text-text-base flex items-center justify-center gap-2">
                    <Loader size={16} className="animate-spin" />
                    {t('battle.multiplayerLobby.waitingForHost')}
                </p>
            )}
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-border">
        <Button onClick={abortMultiplayerBattle} variant="secondary">
          {t('buttons.returnToCampaign')}
        </Button>
      </div>
    </Card>
  );
};

export default MultiplayerLobby;