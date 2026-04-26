import { useMemo } from 'react';
import { useTranslation } from '../../i18n';
import Button from '../ui/Button';
import { useBattleStore } from '@/stores/battleStore';
import { useMultiplayerStore } from '@/stores/multiplayerStore';
import { isEngineV2MpDebugEnabled } from '@/src/config/engineV2Debug';
import { CURRENT_ENGINE_SCHEMA_VERSION, type EngineBattleState } from '@/services/engine/battle/types';
import { findJumpDownTargets, pickSafestJumpDownTarget } from '@/services/engine/battle/rules/jumpRules';

export function EngineV2HudControls() {
  const { t } = useTranslation();
  const engineV2Enabled = useBattleStore(s => s.engineV2Enabled);
  const battle = useBattleStore(s => s.battle);
  const rng = useBattleStore(s => s.rng);
  const phase = battle?.phase ?? null;
  const hasBattle = !!battle;
  const hasRng = !!rng;
  const selectedParticipantId = useBattleStore(s => s.selectedParticipantId);
  const dispatchEngineAction = useBattleStore(s => s.actions.dispatchEngineAction);
  const multiplayerRole = useMultiplayerStore(s => s.multiplayerRole);

  const mpDebug = isEngineV2MpDebugEnabled();

  const jumpTarget = useMemo(() => {
    if (!battle || !rng || !selectedParticipantId) return null;
    const state: EngineBattleState = {
      schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION,
      battle,
      rng,
    };
    const targets = findJumpDownTargets(state, selectedParticipantId);
    return pickSafestJumpDownTarget(targets);
  }, [battle, rng, selectedParticipantId]);

  if (!engineV2Enabled) return null;
  if (multiplayerRole !== null && !mpDebug) return null;

  const disabledBase = !hasBattle || !hasRng;
  const canRoll = !disabledBase && phase === 'reaction_roll';
  const canAdvance = !disabledBase && (phase === 'quick_actions' || phase === 'enemy_actions' || phase === 'slow_actions');
  const canJumpDown = !disabledBase && !!selectedParticipantId && !!jumpTarget;

  return (
    <div className="flex flex-wrap gap-2 justify-center mt-2">
      <Button
        disabled={!canRoll}
        onClick={() => dispatchEngineAction({ type: 'ROLL_INITIATIVE' })}
        title={t('tooltips.engineV2.rollInitiative')}
        variant="primary"
        className="text-sm py-1 px-3"
        data-testid="enginev2-roll-initiative"
      >
        {t('battle.engineV2.rollInitiative')}
      </Button>

      <Button
        disabled={!canAdvance}
        onClick={() => dispatchEngineAction({ type: 'ADVANCE_PHASE' })}
        title={t('tooltips.engineV2.advancePhase')}
        variant="secondary"
        className="text-sm py-1 px-3"
        data-testid="enginev2-advance-phase"
      >
        {t('battle.engineV2.advancePhase')}
      </Button>

      <Button
        disabled={!canJumpDown}
        onClick={() => {
          if (!selectedParticipantId || !jumpTarget) return;
          dispatchEngineAction({
            type: 'JUMP_DOWN',
            participantId: selectedParticipantId,
            to: jumpTarget.to,
          });
        }}
        title={
          jumpTarget
            ? t('tooltips.engineV2.jumpDown', { drop: jumpTarget.drop, risk: jumpTarget.risksFallDamage ? '!' : '' })
            : t('tooltips.engineV2.jumpDownUnavailable')
        }
        variant={jumpTarget?.risksFallDamage ? 'danger' : 'secondary'}
        className="text-sm py-1 px-3"
        data-testid="enginev2-jump-down"
      >
        {t('battle.engineV2.jumpDown')}
      </Button>
    </div>
  );
}
