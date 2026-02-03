import { useTranslation } from '../../i18n';
import Button from '../ui/Button';
import { useBattleStore } from '@/stores/battleStore';
import { useMultiplayerStore } from '@/stores/multiplayerStore';
import { isEngineV2MpDebugEnabled } from '@/src/config/engineV2Debug';

export function EngineV2HudControls() {
  const { t } = useTranslation();
  const engineV2Enabled = useBattleStore(s => s.engineV2Enabled);
  const phase = useBattleStore(s => s.battle?.phase ?? null);
  const hasBattle = useBattleStore(s => !!s.battle);
  const hasRng = useBattleStore(s => !!s.rng);
  const dispatchEngineAction = useBattleStore(s => s.actions.dispatchEngineAction);
  const engineNetPendingClientActionId = useBattleStore(s => s.engineNetPendingClientActionId);
  const multiplayerRole = useMultiplayerStore(s => s.multiplayerRole);

  const mpDebug = isEngineV2MpDebugEnabled();

  if (!engineV2Enabled) return null;
  if (multiplayerRole !== null && !mpDebug) return null;

  const disabledBase = !hasBattle || !hasRng || !!engineNetPendingClientActionId;
  const canRoll = !disabledBase && phase === 'reaction_roll';
  const canAdvance = !disabledBase && (phase === 'quick_actions' || phase === 'enemy_actions' || phase === 'slow_actions');

  return (
    <div className="flex flex-wrap gap-2 justify-center mt-2">
      <Button
        disabled={!canRoll}
        onClick={() => {
          if (engineNetPendingClientActionId) return;
          dispatchEngineAction({ type: 'ROLL_INITIATIVE' });
        }}
        title={t('tooltips.engineV2.rollInitiative')}
        variant="primary"
        className="text-sm py-1 px-3"
        data-testid="enginev2-roll-initiative"
      >
        {t('battle.engineV2.rollInitiative')}
      </Button>

      <Button
        disabled={!canAdvance}
        onClick={() => {
          if (engineNetPendingClientActionId) return;
          dispatchEngineAction({ type: 'ADVANCE_PHASE' });
        }}
        title={t('tooltips.engineV2.advancePhase')}
        variant="secondary"
        className="text-sm py-1 px-3"
        data-testid="enginev2-advance-phase"
      >
        {t('battle.engineV2.advancePhase')}
      </Button>
    </div>
  );
}
