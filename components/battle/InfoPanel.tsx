import React, { useMemo } from 'react';
import { useTranslation } from '../../i18n';
import ReactionRollPanel from './ReactionRollPanel';
import ParticipantInfo from './ParticipantInfo';
import ActionControls from './ActionControls';
import Button from '../ui/Button';
import { Loader } from 'lucide-react';
import { useBattleStore, useMultiplayerStore } from '../../stores';
import { useGameState } from '../../hooks/useGameState';
import { BattleLogic } from '../../hooks/useBattleLogic';

/**
 * Props for the InfoPanel component.
 * @property {BattleLogic} battleLogic - The hooks and handlers for managing battle UI state and actions.
 */
interface InfoPanelProps {
  battleLogic: BattleLogic;
}

/**
 * DEPRECATED. This component's logic has been integrated into BattleHUD.
 * A panel that displays information about the selected or active participant and provides action controls.
 * It adapts its display based on the current battle phase and player turn.
 * @param {InfoPanelProps} props - The component props.
 * @returns {React.ReactElement | null} The rendered info panel.
 * @deprecated This component is no longer used and will be removed. See `BattleHUD` instead.
 */
const InfoPanel: React.FC<InfoPanelProps> = ({ battleLogic }) => {
  const { t } = useTranslation();
  const { battle } = useGameState();
  const { uiState } = battleLogic;

  const selectedParticipantId = useBattleStore(state => state.selectedParticipantId);
  const { setSelectedParticipantId, endTurn } = useBattleStore(state => state.actions);

  const multiplayerRole = useMultiplayerStore(state => state.multiplayerRole);

  const activeParticipantId = battle?.activeParticipantId;
  const participants = battle?.participants;

  const activeParticipant = useMemo(() => {
    return participants?.find(p => p.id === activeParticipantId);
  }, [participants, activeParticipantId]);

  const selectedParticipant = useMemo(() => {
    return participants?.find(p => p.id === selectedParticipantId);
  }, [participants, selectedParticipantId]);

  const participantToDisplay = selectedParticipant || activeParticipant;

  const canPerformAction = useMemo(() => {
    if (!participantToDisplay) return false;
    if (multiplayerRole) {
      // In multiplayer, you can only control your own characters when it's your turn.
      return battle?.activePlayerRole === multiplayerRole && participantToDisplay.id.startsWith(multiplayerRole);
    }
    // In solo, you can only control characters when it's their turn.
    return activeParticipant && participantToDisplay.id === activeParticipant.id;
  }, [participantToDisplay, activeParticipant, battle?.activePlayerRole, multiplayerRole]);


  const instructionText = useMemo(() => {
    if (!canPerformAction || !activeParticipant) return '';

    const actor = activeParticipant;

    const isPanicked = actor.activeEffects && actor.activeEffects.some(e => e.sourceId === 'terrifying');
    if (isPanicked) return t('battle.infoPanel.panickedInstruction');

    if (battle?.followUpState?.participantId === actor.id) {
      return t('battle.infoPanel.instructionFollowUp');
    }

    switch (uiState.mode) {
      case 'move':
        return uiState.isDash ? t('battle.infoPanel.instructionDash') : t('battle.infoPanel.instructionMove');
      case 'shoot':
        return t('battle.infoPanel.instructionShoot');
      case 'brawling':
      case 'selectingBrawlWeapon':
        return t('battle.infoPanel.instructionBrawl');
      default: return '';
    }
  }, [uiState, activeParticipant, canPerformAction, battle?.followUpState, t]);

  if (!battle) return null;

  if (battle.phase === 'reaction_roll') {
    return <ReactionRollPanel />;
  }

  const isOpponentTurn = multiplayerRole
    ? battle.activePlayerRole !== multiplayerRole && battle.activePlayerRole !== null
    : battle.phase === 'enemy_actions';


  if (isOpponentTurn) {
    return (
      <div className='text-center p-4 bg-surface-base/50 rounded-md'>
        <p className='font-bold text-danger font-orbitron'>{t(multiplayerRole ? 'battle.phase.opponent_turn' : 'battle.phase.enemy_turn')}</p>
        {!multiplayerRole && <div className='flex items-center justify-center gap-2 mt-1'>
          <Loader size={16} className='animate-spin text-danger' />
        </div>}
      </div>
    );
  }

  if (!participantToDisplay) {
    if (multiplayerRole && battle.activePlayerRole === multiplayerRole) {
      return (
        <div className='text-center p-4 bg-surface-base/50 rounded-md'>
          <p className='font-bold text-success font-orbitron'>{t('battle.phase.your_turn')}</p>
          <p className='text-text-base mt-2'>{t('battle.infoPanel.selectCharacterToActivate')}</p>
          <Button onClick={() => endTurn(null)} variant='primary' className='w-full mt-4'>{t('buttons.endTurn')}</Button>
        </div>
      )
    }
    return (
      <div className='text-center p-4 bg-surface-base/50 rounded-md'>
        {battle.phase === 'enemy_actions' ? <Loader size={16} className='animate-spin text-danger' /> : t('battle.infoPanel.waiting')}
      </div>
    );
  }

  const isOpponent = multiplayerRole ? !participantToDisplay.id.startsWith(multiplayerRole) : participantToDisplay.type === 'enemy';

  return (
    <div className={`bg-surface-base/50 rounded-md p-3 border ${isOpponent ? 'border-danger/30' : 'border-transparent'}`}>
      <ParticipantInfo participant={participantToDisplay} mission={battle.mission!} participants={participants!} multiplayerRole={multiplayerRole} />

      <div className='border-t border-border pt-3 mt-3'>
        {canPerformAction ? (
          <ActionControls
            participant={participantToDisplay}
            battleLogic={battleLogic}
          />
        ) : (
          <Button onClick={() => setSelectedParticipantId(null)} variant='secondary' className='w-full mt-4'>
            {t('buttons.close')}
          </Button>
        )}
      </div>
      <div className='h-6 mt-2 text-center text-primary text-sm flex items-center justify-center transition-opacity duration-300' style={{ opacity: instructionText ? 1 : 0 }}>
        {instructionText}
      </div>
    </div>
  );
};

export default InfoPanel;