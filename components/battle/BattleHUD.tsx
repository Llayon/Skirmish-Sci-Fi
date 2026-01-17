

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { BattleLogic } from '../../hooks/useBattleLogic';
import ActionControls from './ActionControls';
import CharacterStatus from './CharacterStatus';
import MissionPanel from './MissionPanel';
import BattleLog from './BattleLog';
import { useBattleStore, useMultiplayerStore } from '@/stores';
import { useGameState } from '../../hooks/useGameState';
import ReactionRollPanel from './ReactionRollPanel';
import { Loader } from 'lucide-react';
import { useTranslation } from '../../i18n';
import ActionQueue from './ActionQueue';
import TargetInspector from './TargetInspector';
import { shallow } from 'zustand/shallow';

interface BattleHUDProps {
  battleLogic: BattleLogic;
}

const BattleHUD: React.FC<BattleHUDProps> = ({ battleLogic }) => {
  const { t } = useTranslation();
  const { battle } = useGameState();
  const selectedParticipantId = useBattleStore(state => state.selectedParticipantId);
  const activeParticipantId = useBattleStore(state => state.battle?.activeParticipantId);
  const hoveredParticipantId = useBattleStore(state => state.hoveredParticipantId);

  const participants = battle?.participants;
  const multiplayerRole = useMultiplayerStore(state => state.multiplayerRole);
  
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
        setMousePosition({ x: event.clientX, y: event.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const activeParticipant = useMemo(() => participants?.find(p => p.id === activeParticipantId), [participants, activeParticipantId]);
  const selectedParticipant = useMemo(() => participants?.find(p => p.id === selectedParticipantId), [participants, selectedParticipantId]);
  const hoveredParticipant = useMemo(() => participants?.find(p => p.id === hoveredParticipantId), [participants, hoveredParticipantId]);


  const participantToDisplay = selectedParticipant || activeParticipant;

  const canPerformAction = useMemo(() => {
    if (!participantToDisplay) return false;
    if (multiplayerRole) {
      return battle?.activePlayerRole === multiplayerRole && participantToDisplay.id.startsWith(multiplayerRole);
    }
    return activeParticipant && participantToDisplay.id === activeParticipant.id;
  }, [participantToDisplay, activeParticipant, battle?.activePlayerRole, multiplayerRole]);

  if (!battle) return null;

  const isOpponentTurn = multiplayerRole
    ? battle.activePlayerRole !== multiplayerRole && battle.activePlayerRole !== null
    : battle.phase === 'enemy_actions';

  return (
    <div className='battle-hud-grid p-4'>
      <div className='hud-queue animate-fade-in'>
        <ActionQueue />
      </div>

      <div className='hud-mission self-start animate-fade-in' style={{ animationDelay: '100ms' }}>
        <MissionPanel mission={battle.mission} />
      </div>

      <div className='hud-status self-end animate-fade-in' style={{ animationDelay: '200ms' }}>
        {participantToDisplay && <CharacterStatus participant={participantToDisplay} />}
      </div>

      <div className='hud-actions self-end flex justify-center animate-slide-up' style={{ animationDelay: '400ms' }}>
        {battle.phase === 'reaction_roll' ? (
          <ReactionRollPanel />
        ) : isOpponentTurn ? (
          <div className='text-center p-4 bg-surface-raised/80 rounded-md backdrop-blur-sm'>
            <p className='font-bold text-danger font-orbitron'>{t(multiplayerRole ? 'battle.phase.opponent_turn' : 'battle.phase.enemy_turn')}</p>
            {!multiplayerRole && <Loader size={16} className='animate-spin text-danger mx-auto mt-2' />}
          </div>
        ) : canPerformAction && participantToDisplay ? (
          <ActionControls participant={participantToDisplay} battleLogic={battleLogic} />
        ) : null}
      </div>

      <div className='hud-log self-end animate-fade-in' style={{ animationDelay: '300ms' }}>
        <BattleLog log={battle.log} />
      </div>
      
      {hoveredParticipant && hoveredParticipant.id !== selectedParticipantId && (
        <div
          className="fixed pointer-events-none z-50 transition-transform duration-100"
          style={{
            top: mousePosition.y + 20,
            left: mousePosition.x + 20,
          }}
        >
          <TargetInspector participant={hoveredParticipant} />
        </div>
      )}
    </div>
  );
};

export default BattleHUD;