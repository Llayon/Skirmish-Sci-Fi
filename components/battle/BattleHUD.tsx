

import React, { useMemo } from 'react';
import { BattleLogic } from '../../hooks/useBattleLogic';
import ActionControls from './ActionControls';
import CharacterStatus from './CharacterStatus';
import MissionPanel from './MissionPanel';
import BattleLog from './BattleLog';
import { useBattleStore, useHudStore, useMultiplayerStore } from '@/stores';
import { useGameState } from '../../hooks/useGameState';
import ReactionRollPanel from './ReactionRollPanel';
import { Loader } from 'lucide-react';
import { useTranslation } from '../../i18n';
import ActionQueue from './ActionQueue';
import { useShallow } from 'zustand/react/shallow';
import HudPanel from '../ui/HudPanel';
import { sanitizeToText } from '@/services/utils/sanitization';
import FloatingTargetInspector from './FloatingTargetInspector';
import FloatingTileInspector from './FloatingTileInspector';

interface BattleHUDProps {
  battleLogic: BattleLogic;
}

const BattleHUD: React.FC<BattleHUDProps> = ({ battleLogic }) => {
  const { t } = useTranslation();
  const { battle } = useGameState();
  const {
    selectedParticipantId,
    activeParticipantId,
    hoveredParticipantId,
    inspectLockedParticipantId,
    inspectLockedPointer,
    inspectLockedTile,
    inspectLockedTilePointer,
    animatingParticipantId,
    isProcessingEnemies,
  } = useBattleStore(
    useShallow((state) => ({
      selectedParticipantId: state.selectedParticipantId,
      activeParticipantId: state.battle?.activeParticipantId,
      hoveredParticipantId: state.hoveredParticipantId,
      inspectLockedParticipantId: state.inspectLockedParticipantId,
      inspectLockedPointer: state.inspectLockedPointer,
      inspectLockedTile: state.inspectLockedTile,
      inspectLockedTilePointer: state.inspectLockedTilePointer,
      animatingParticipantId: state.animatingParticipantId,
      isProcessingEnemies: state.isProcessingEnemies,
    }))
  );
  const { preset, panels, collapsed, density, autoHideSecondaryPanels, toggleCollapsed } = useHudStore(
    useShallow((state) => ({
      preset: state.preset,
      panels: state.panels,
      collapsed: state.collapsed,
      density: state.density,
      autoHideSecondaryPanels: state.autoHideSecondaryPanels,
      toggleCollapsed: state.actions.toggleCollapsed,
    }))
  );

  const participants = battle?.participants;
  const multiplayerRole = useMultiplayerStore(state => state.multiplayerRole);

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

  const isMinimalLayout = preset === 'minimal';
  const isBusy =
    battleLogic.uiState.mode !== 'idle' || animatingParticipantId !== null || isProcessingEnemies || battle?.phase === 'enemy_actions';
  const effectivePanels =
    autoHideSecondaryPanels && isBusy ? { ...panels, queue: false, mission: false, status: false, log: false } : panels;

  if (!battle) return null;

  const inspectedTile = inspectLockedTile
    ? {
        pos: inspectLockedTile,
        occupiedBy: battle.participants.find((p) => p.position.x === inspectLockedTile.x && p.position.y === inspectLockedTile.y) ?? null,
        terrain:
          battle.terrain.find((t) => {
            const withinX = inspectLockedTile.x >= t.position.x && inspectLockedTile.x < t.position.x + t.size.width;
            const withinY = inspectLockedTile.y >= t.position.y && inspectLockedTile.y < t.position.y + t.size.height;
            return withinX && withinY;
          }) ?? null,
        isReachable: battleLogic.derivedData.reachableCells?.has(`${inspectLockedTile.x},${inspectLockedTile.y}`) ?? false,
        isCoverSpot: battleLogic.derivedData.coverStatus?.get(`${inspectLockedTile.x},${inspectLockedTile.y}`) ?? false,
      }
    : null;

  const isOpponentTurn = multiplayerRole
    ? battle.activePlayerRole !== multiplayerRole && battle.activePlayerRole !== null
    : battle.phase === 'enemy_actions';

  const actionBlock = battle.phase === 'reaction_roll' ? (
    <ReactionRollPanel />
  ) : isOpponentTurn ? (
    <div className='text-center p-4 bg-surface-raised/80 rounded-md backdrop-blur-sm'>
      <p className='font-bold text-danger font-orbitron'>{t(multiplayerRole ? 'battle.phase.opponent_turn' : 'battle.phase.enemy_turn')}</p>
      {!multiplayerRole && <Loader size={16} className='animate-spin text-danger mx-auto mt-2' />}
    </div>
  ) : canPerformAction && participantToDisplay ? (
    <ActionControls participant={participantToDisplay} battleLogic={battleLogic} />
  ) : null;

  if (isMinimalLayout) {
    return (
      <div className='p-4'>
        <div className="space-y-3">
          {effectivePanels.mission && battle?.mission && (
            <HudPanel
              title={t('battle.hud.mission')}
              collapsed={collapsed.mission}
              onToggle={() => toggleCollapsed('mission')}
              expandLabel={t('battle.hud.expand')}
              collapseLabel={t('battle.hud.collapse')}
              density={density}
            >
              <MissionPanel mission={battle.mission} embedded />
            </HudPanel>
          )}
          {effectivePanels.actions && (
            <div className='hud-actions self-end flex justify-center animate-slide-up'>
              {actionBlock}
            </div>
          )}
        </div>
      </div>
    );
  }

  const activeParticipantName = (() => {
    const activeId = battle.activeParticipantId;
    if (!activeId) return null;
    const p = battle.participants.find((x) => x.id === activeId);
    if (!p) return null;
    if (p.type === 'character') return sanitizeToText(p.name);
    const nameParts = p.name.split(' #');
    return `${t(`enemies.${nameParts[0]}`)} #${nameParts[1]}`;
  })();

  const missionSummary = (() => {
    if (!battle.mission) return null;
    const title = t(battle.mission.titleKey);
    let progress = '';
    switch (battle.mission.type) {
      case 'Patrol': {
        const visited = battle.mission.patrolPoints?.filter((p) => p.visited).length || 0;
        const total = battle.mission.patrolPoints?.length || 0;
        progress = t('missions.progress.patrol', { visited, total });
        break;
      }
      case 'Secure':
        progress = t('missions.progress.secure', { current: battle.mission.secureRoundsCompleted || 0, total: 2 });
        break;
      case 'MoveThrough':
        progress = t('missions.progress.move_through', { current: battle.mission.crewMembersExited || 0, total: 2 });
        break;
      default:
        progress = '';
    }
    return progress ? `${title} • ${progress}` : title;
  })();

  return (
    <div className='battle-hud-grid p-4'>
      {effectivePanels.queue && (
        <div className='hud-queue animate-fade-in'>
          <HudPanel
            title={`${t('battle.hud.queue')} • ${t(`battle.phase.${battle.phase}`)}`}
            collapsed={collapsed.queue}
            onToggle={() => toggleCollapsed('queue')}
            expandLabel={t('battle.hud.expand')}
            collapseLabel={t('battle.hud.collapse')}
            density={density}
            collapsedContent={activeParticipantName ? t('battle.hud.summary.active', { name: activeParticipantName }) : null}
          >
            <ActionQueue embedded compact={density === 'compact'} />
          </HudPanel>
        </div>
      )}

      {effectivePanels.mission && (
        <div className='hud-mission self-start animate-fade-in' style={{ animationDelay: '100ms' }}>
          <HudPanel
            title={t('battle.hud.mission')}
            collapsed={collapsed.mission}
            onToggle={() => toggleCollapsed('mission')}
            expandLabel={t('battle.hud.expand')}
            collapseLabel={t('battle.hud.collapse')}
            density={density}
            collapsedContent={missionSummary}
          >
            <MissionPanel mission={battle.mission} embedded />
          </HudPanel>
        </div>
      )}

      {effectivePanels.status && (
        <div className='hud-status self-end animate-fade-in' style={{ animationDelay: '200ms' }}>
          {participantToDisplay && (
            <HudPanel
              title={t('battle.hud.status')}
              collapsed={collapsed.status}
              onToggle={() => toggleCollapsed('status')}
              expandLabel={t('battle.hud.expand')}
              collapseLabel={t('battle.hud.collapse')}
              density={density}
            >
              <CharacterStatus participant={participantToDisplay} embedded density={density} />
            </HudPanel>
          )}
        </div>
      )}

      {effectivePanels.actions && (
        <div className='hud-actions self-end flex justify-center animate-slide-up' style={{ animationDelay: '400ms' }}>
          <HudPanel
            title={t('battle.hud.actions')}
            collapsed={collapsed.actions}
            onToggle={() => toggleCollapsed('actions')}
            expandLabel={t('battle.hud.expand')}
            collapseLabel={t('battle.hud.collapse')}
            density={density}
          >
            {actionBlock}
          </HudPanel>
        </div>
      )}

      {effectivePanels.log && (
        <div className='hud-log self-end animate-fade-in' style={{ animationDelay: '300ms' }}>
          <HudPanel
            title={t('battle.battleLog')}
            collapsed={collapsed.log}
            onToggle={() => toggleCollapsed('log')}
            expandLabel={t('battle.hud.expand')}
            collapseLabel={t('battle.hud.collapse')}
            density={density}
            collapsedContent={t('battle.hud.summary.log', { count: battle.log.length })}
          >
            <BattleLog log={battle.log} embedded heightClassName={density === 'compact' ? 'h-28' : 'h-40'} />
          </HudPanel>
        </div>
      )}
      
      {hoveredParticipant && hoveredParticipant.id !== selectedParticipantId && (
        <FloatingTargetInspector
          participant={hoveredParticipant}
          pinned={inspectLockedParticipantId === hoveredParticipant.id}
          pinnedPosition={inspectLockedPointer}
        />
      )}

      {inspectedTile && (
        <FloatingTileInspector
          pos={inspectedTile.pos}
          terrain={inspectedTile.terrain}
          occupiedBy={inspectedTile.occupiedBy}
          isReachable={inspectedTile.isReachable}
          isCoverSpot={inspectedTile.isCoverSpot}
          pinnedPosition={inspectLockedTilePointer}
        />
      )}
    </div>
  );
};

export default BattleHUD;
