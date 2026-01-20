import { lazy, Suspense, useRef, useState } from 'react';
import Card from '../ui/Card';
import { useTranslation } from '../../i18n';
import BattleGrid from './BattleGrid';
import AnimationLayer from './AnimationLayer';
import BattleHUD from './BattleHUD';
import { useBattleStore } from '@/stores';
import { Loader, SlidersHorizontal } from 'lucide-react';
import { useGameState } from '../../hooks/useGameState';
import { useMultiplayer } from '../../hooks/useMultiplayer';
import { useBattleLogic } from '../../hooks/useBattleLogic';
import { useBattleAutomations } from '../../hooks/useBattleAutomations';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import ViewModeToggle from './ViewModeToggle';
import BattleLoadingScreen from './BattleLoadingScreen';
import Button from '../ui/Button';
import BattleHudSettingsModal from './BattleHudSettingsModal';
import { useBattleHotkeys } from '@/hooks/battle/useBattleHotkeys';
import BattleHelpOverlay from './BattleHelpOverlay';
import { useSettingsStore } from '@/stores/settingsStore';
import { useHudStore } from '@/stores';
import { useShallow } from 'zustand/react/shallow';

const BattleView3D = lazy(() => import('./BattleView3D'));

/**
 * The main component for the tactical battle screen.
 * It orchestrates the rendering of the grid, HUD, and animation layers.
 * It also contains logic for camera centering and automatic turn progression in solo mode.
 * @returns {React.ReactElement} The rendered battle view.
 */
const BattleView = () => {
  const { t } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const { battle } = useGameState();
  const { isReconnecting } = useMultiplayer();
  const showEnemyTurnBanner = useBattleStore(state => state.showEnemyTurnBanner);
  const isAnimating = useBattleStore((state) => state.animatingParticipantId !== null);
  const { endBattle } = useBattleStore(state => state.actions);
  
  const battleLogic = useBattleLogic();
  useBattleAutomations(scrollContainerRef);
  const [is3D, setIs3D] = useLocalStorage('battleViewMode', false);
  const [isHudModalOpen, setHudModalOpen] = useState(false);
  const [isHelpOpen, setHelpOpen] = useState(false);
  const { reducedVfx } = useSettingsStore(useShallow((s) => ({ reducedVfx: s.reducedVfx })));
  const { hudPreset, applyHudPreset } = useHudStore(
    useShallow((s) => ({
      hudPreset: s.preset,
      applyHudPreset: s.actions.applyPreset,
    }))
  );

  if (!battle) {
    return <div>Loading battle...</div>;
  }

  useBattleHotkeys({
    battleLogic,
    is3D,
    toggleHudModal: () => setHudModalOpen((v) => !v),
    toggleHelp: () => setHelpOpen((v) => !v),
  });

  const cycleHudPreset = () => {
    const order = ['full', 'tactical', 'minimal'] as const;
    const idx = order.indexOf(hudPreset as any);
    const next = idx === -1 ? order[0] : order[(idx + 1) % order.length];
    applyHudPreset(next);
  };

  const hudPresetLabel =
    hudPreset === 'full'
      ? t('battle.hud.presetFull')
      : hudPreset === 'tactical'
        ? t('battle.hud.presetTactical')
        : hudPreset === 'minimal'
          ? t('battle.hud.presetMinimal')
          : hudPreset === 'spectator'
            ? t('battle.hud.presetSpectator')
            : t('battle.hud.presetCustom');

  const onBattlefieldContextMenu = (e: any) => {
    e.preventDefault();
    if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
    if (battleLogic.uiState.mode !== 'idle') battleLogic.handlers.cancelAction();
  };

  const BattleEndScreen = () => {
    if (battle.phase !== 'battle_over' || (battle.mission.status !== 'success' && battle.mission.status !== 'failure')) {
      return null;
    }

    const outcome = battle.mission.status;

    const titleKey = outcome === 'success' ? 'battle.victory' : 'battle.defeat';
    const messageKey = `missions.results.${battle.mission.type}.${outcome}`;

    return (
      <div className='fixed inset-0 bg-surface-base/80 backdrop-blur-sm flex items-center justify-center z-40'>
        <Card className='text-center py-10 animate-slide-up'>
          <h2 className={`text-4xl sm:text-5xl font-bold font-orbitron mb-4 ${outcome === 'success' ? 'text-success' : 'text-danger'}`}>{t(titleKey)}</h2>
          <p className='text-text-base mb-8 max-w-md mx-auto'>{t(messageKey)}</p>
          <button onClick={() => endBattle()} className='py-3 px-6 text-lg bg-primary hover:bg-primary/80 text-text-inverted font-bold rounded-md'>{t('buttons.returnToCampaign')}</button>
        </Card>
      </div>
    );
  };

  return (
    <div className='w-full h-full lg:relative flex flex-col lg:block'>
      {isReconnecting && (
        <div className='fixed inset-0 bg-surface-base/80 flex flex-col items-center justify-center z-50 text-primary text-xl sm:text-2xl font-orbitron animate-pulse backdrop-blur-sm'>
          <Loader size={48} className='animate-spin mb-4' />
          {t('battle.multiplayerLobby.reconnecting')}
        </div>
      )}
      {showEnemyTurnBanner && (
        <div className='fixed inset-0 bg-surface-base/50 flex items-center justify-center z-50 text-danger text-4xl sm:text-5xl lg:text-6xl font-orbitron enemy-turn-banner pointer-events-none animate-fade-out'>
          {t('battle.infoPanel.enemyTurnBanner')}
        </div>
      )}

      <div className="flex items-center justify-end px-2 py-2">
        <Button className="mr-2 px-3 py-1 text-sm" onClick={() => setHudModalOpen(true)}>
          <SlidersHorizontal className="w-4 h-4" />
          HUD
        </Button>
        <ViewModeToggle is3D={is3D} setIs3D={setIs3D} disabled={isAnimating} />
        <Button className="ml-2 px-3 py-1 text-sm" onClick={() => cycleHudPreset()}>
          UI: {hudPresetLabel}
        </Button>
      </div>

      <div
        ref={scrollContainerRef}
        className={`${is3D ? 'overflow-hidden' : 'overflow-auto'} h-[calc(100vh-120px)] flex-grow`}
      >
        <div
          ref={gridContainerRef}
          className={is3D ? 'relative w-full h-full min-h-[520px]' : 'relative inline-block min-w-full'}
          data-testid="battlefield"
          onContextMenu={onBattlefieldContextMenu}
        >
          {is3D ? (
            <Suspense fallback={<BattleLoadingScreen />}>
              <BattleView3D battleLogic={battleLogic} />
            </Suspense>
          ) : (
            <>
              <BattleGrid battleLogic={battleLogic} />
              <AnimationLayer gridRef={gridContainerRef} />
            </>
          )}
          {is3D && !isHelpOpen && (
            <div
              className={`absolute bottom-3 left-3 pointer-events-none z-10 text-xs text-text-base bg-surface-overlay/70 ${reducedVfx ? '' : 'backdrop-blur-sm'} border border-border rounded-md px-2 py-1`}
            >
              {t('battle.help.miniHint')}
            </div>
          )}
        </div>
      </div>

      <div className="lg:absolute lg:inset-0 lg:pointer-events-none">
        <BattleHUD battleLogic={battleLogic} />
      </div>

      {isHudModalOpen && (
        <BattleHudSettingsModal
          onClose={() => setHudModalOpen(false)}
          onOpenHelp={() => {
            setHudModalOpen(false);
            setHelpOpen(true);
          }}
          is3D={is3D}
        />
      )}
      {isHelpOpen && <BattleHelpOverlay onClose={() => setHelpOpen(false)} is3D={is3D} />}
      {battle.phase === 'battle_over' && <BattleEndScreen />}
    </div>
  );
};

export default BattleView;
