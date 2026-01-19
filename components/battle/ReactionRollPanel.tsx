import React, { useCallback, useMemo, useState } from 'react';
import { BattleParticipant } from '@/types';
import Button from '@/components/ui/Button';
import { useTranslation } from '@/i18n';
import { Dices, RotateCw, Loader } from 'lucide-react';
import { BattleDomain } from '@/services/domain/battleDomain';
import { useBattleStore, useCampaignProgressStore, useMultiplayerStore } from '@/stores';

type ReactionRollPanelProps = {};

const ReactionRollPanel: React.FC<ReactionRollPanelProps> = () => {
  const { t } = useTranslation();

  const { setBattle, dispatchAction, advancePhase } = useBattleStore(state => state.actions);
  const battle = useBattleStore(state => state.battle!);
  const { reactionRolls: rawReactionRolls, reactionRerollsUsed, participants, firstPlayerRole, difficulty, canSeizeInitiative, seizeInitiativePenalty } = battle;
  const reactionRolls = rawReactionRolls ?? {};

  const campaign = useCampaignProgressStore(state => state.campaign)!;
  const { updateCampaign } = useCampaignProgressStore(state => state.actions);

  const multiplayerRole = useMultiplayerStore(state => state.multiplayerRole);

  const [isRolling, setIsRolling] = useState(false);

  const handleRollInitiative = useCallback(() => {
    if (multiplayerRole) {
      setIsRolling(true);
      // Fallback to reset loading state in case of an error
      setTimeout(() => setIsRolling(false), 5000);
    }
    dispatchAction({ type: 'roll_initiative', payload: {} });
  }, [dispatchAction, multiplayerRole]);

  const handleSeizeInitiative = useCallback(() => {
    const hasFeral = battle.participants.some(p => p.type === 'character' && p.specialAbilities?.includes('feral_initiative'));
    const penalty = hasFeral ? 0 : seizeInitiativePenalty || 0;
    
    // The core logic for seizing initiative is now in the action resolver,
    // this handler just needs to trigger it. The penalty is used there. For now, we ensure the button is disabled correctly.

    if (campaign.storyPoints > 0 && !reactionRerollsUsed) {
      updateCampaign(c => { c.storyPoints -= 1; });
      setBattle(b => {
        b.reactionRerollsUsed = true;
        b.log.push({ key: 'log.info.initiativeReroll' });
        b.reactionRolls = {};
        b.quickActionOrder = [];
        b.slowActionOrder = [];
      });
      setTimeout(() => handleRollInitiative(), 50);
    }
  }, [campaign, reactionRerollsUsed, updateCampaign, setBattle, handleRollInitiative, battle, seizeInitiativePenalty]);

  const renderMultiplayerPanel = () => {
    const hostChars = useMemo(() => (Array.isArray(participants) ? participants : []).filter(p => p.id.startsWith('host')), [participants]);
    const guestChars = useMemo(() => (Array.isArray(participants) ? participants : []).filter(p => p.id.startsWith('guest')), [participants]);

    const hostTeamHasRolled = hostChars.some(p => reactionRolls[p.id]);
    const guestTeamHasRolled = guestChars.some(p => reactionRolls[p.id]);

    const myTeamHasRolled = multiplayerRole === 'host' ? hostTeamHasRolled : guestTeamHasRolled;
    const firstPlayerHasRolled = firstPlayerRole === 'host' ? hostTeamHasRolled : guestTeamHasRolled;

    const isMyTurnToRoll =
      (multiplayerRole === firstPlayerRole && !myTeamHasRolled) ||
      (multiplayerRole !== firstPlayerRole && firstPlayerHasRolled && !myTeamHasRolled);

    const bothHaveRolled = hostTeamHasRolled && guestTeamHasRolled;

    let statusMessage = '';
    if (!isMyTurnToRoll && !bothHaveRolled) {
      if (myTeamHasRolled) {
        statusMessage = t('battle.reactionPhase.waitingFor.secondPlayer');
      } else {
        statusMessage = t('battle.reactionPhase.waitingFor.firstPlayer');
      }
    }

    const RollDisplay = ({ title, characters }: { title: string, characters: BattleParticipant[] }) => (
      <div className='text-left space-y-2 text-sm p-3 bg-surface-overlay/50 rounded-md max-h-32 overflow-y-auto'>
        <h5 className='font-bold text-text-base border-b border-border pb-1 mb-2 sticky top-0 bg-surface-overlay/50 backdrop-blur-sm'>{title}</h5>
        {characters.map(char => {
          const result = reactionRolls[char.id];
          if (!result) {
            return (
              <div key={char.id} className='flex justify-between items-center opacity-50'>
                <span>{char.name}</span>
                <span>...</span>
              </div>
            );
          }

          const effectiveStats = BattleDomain.calculateEffectiveStats(char, 'reaction_roll');
          const reactionStat = effectiveStats.reactions;

          return (
            <div key={char.id} className='flex justify-between items-center animate-fade-in'>
              <span>{char.name}</span>
              <div className='flex items-center gap-3'>
                <span className='text-text-muted text-xs'>(Roll: {result.roll} vs {reactionStat})</span>
                {result.success ?
                  <span className='font-bold text-success'>{t('battle.reactionPhase.success')}</span> :
                  <span className='font-bold text-danger'>{t('battle.reactionPhase.fail')}</span>
                }
              </div>
            </div>
          );
        })}
      </div>
    );

    const yourTitle = t('battle.multiplayerLobby.yourCrew');
    const opponentTitle = t('battle.multiplayerLobby.opponentCrew');
    const anyoneHasRolled = hostTeamHasRolled || guestTeamHasRolled;

    return (
      <div className='space-y-4'>
        {anyoneHasRolled && (
          <>
            <RollDisplay
              title={multiplayerRole === 'host' ? yourTitle : opponentTitle}
              characters={hostChars}
            />
            <RollDisplay
              title={multiplayerRole === 'guest' ? yourTitle : opponentTitle}
              characters={guestChars}
            />
          </>
        )}

        <div className='min-h-[50px] flex items-center justify-center'>
          {isMyTurnToRoll && !bothHaveRolled && (
            <div className='flex flex-wrap gap-2 justify-center'>
              <Button onClick={handleRollInitiative} variant='primary' isLoading={isRolling} disabled={isRolling}>
                <Dices size={16} /> {t('buttons.rollInitiative')}
              </Button>
            </div>
          )}
          {statusMessage && (
            <div className='flex items-center justify-center gap-2 text-text-muted pt-2 animate-fade-in'>
              <Loader size={16} className='animate-spin' />
              <span>{statusMessage}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  const renderSoloPanel = () => {
    const hasRolled = Object.keys(reactionRolls).length > 0;
    const playerCharacters = useMemo(() => (Array.isArray(participants) ? participants : []).filter(p => p.type === 'character'), [participants]);
    const canSeize = canSeizeInitiative !== false;

    return !hasRolled ? (
      <div className='flex flex-wrap gap-2 justify-center'>
        <Button onClick={handleRollInitiative}><Dices size={16} /> {t('buttons.rollInitiative')}</Button>
        {difficulty !== 'insanity' && canSeize && (
            <Button onClick={handleSeizeInitiative} disabled={campaign.storyPoints <= 0 || reactionRerollsUsed}>
                <RotateCw size={16} /> {t('buttons.seizeInitiative', { storyPoints: campaign.storyPoints })}
            </Button>
        )}
      </div>
    ) : (
      <div className='space-y-4'>
        <div className='text-left space-y-2 text-sm max-h-48 overflow-y-auto p-2 bg-surface-overlay/50 rounded-md'>
          {playerCharacters.map(char => {
            const result = reactionRolls[char.id];
            if (!result) return null;

            const effectiveStats = BattleDomain.calculateEffectiveStats(char, 'reaction_roll');
            const reactionStat = effectiveStats.reactions;

            return (
              <div key={char.id} className='flex justify-between items-center animate-fade-in'>
                <span>{char.name}</span>
                <div className='flex items-center gap-3'>
                  <span className='text-text-muted text-xs'>(Roll: {result.roll} vs {reactionStat})</span>
                  {result.success ?
                    <span className='font-bold text-success'>{t('battle.reactionPhase.success')}</span> :
                    <span className='font-bold text-danger'>{t('battle.reactionPhase.fail')}</span>
                  }
                </div>
              </div>
            )
          })}
        </div>
        <div className='flex flex-wrap gap-2 justify-center'>
          <Button onClick={() => advancePhase()} variant='primary'>{t('buttons.startRound')}</Button>
          {difficulty !== 'insanity' && canSeize && (
            <Button onClick={handleSeizeInitiative} disabled={campaign.storyPoints <= 0 || reactionRerollsUsed}>
                <RotateCw size={16} /> {t('buttons.seizeInitiative', { storyPoints: campaign.storyPoints })}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className='bg-surface-base/50 rounded-md p-4 text-center'>
      <h4 className='font-bold text-lg font-orbitron text-primary mb-3'>{t('battle.reactionPhase.title')}</h4>
      {multiplayerRole ? renderMultiplayerPanel() : renderSoloPanel()}
    </div>
  );
};

export default ReactionRollPanel;
