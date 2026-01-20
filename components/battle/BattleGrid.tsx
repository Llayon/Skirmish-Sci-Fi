
import React, { useCallback, useMemo } from 'react';
import { BattleParticipant, Position, Terrain, BattleCellParticipantViewModel } from '../../types';
import Card from '../ui/Card';
import BattleCell from './BattleCell';
import { isOpponent as isParticipantOpponent } from '../../services/participantUtils';
import { distance } from '../../services/gridUtils';
import { calculateCover, hasLineOfSight } from '../../services/rules/visibility';
import { getWeaponById } from '../../services/data/items';
import { Building, Container, Cog, Construction, CircleDot, Cylinder, Trophy, Truck, Box, Mountain, Signpost, DoorOpen, Gem } from 'lucide-react';
import { BattleLogic } from '../../hooks/useBattleLogic';
import { useGameState } from '../../hooks/useGameState';
import { useBattleStore, useMultiplayerStore } from '@/stores';
import { BattleDomain } from '../../services/domain/battleDomain';

// AI-Generated Tile Assets (Paths)
const TILE_FLOOR_PATHS = [
  '/assets/tiles/floor_1.png',
  '/assets/tiles/floor_2.png',
  '/assets/tiles/floor_3.png',
  '/assets/tiles/floor_4.png',
];
const TILE_WALL_PATH = '/assets/tiles/wall_1.png';
const TILE_FLOOR_GRATE_PATH = '/assets/tiles/grate_1.png';
const TILE_FLOOR_INTERIOR_PATH = TILE_FLOOR_GRATE_PATH; // Re-use grate for now

const TERRAIN_VISUALS: Record<string, { style: React.CSSProperties, icon: React.ReactNode }> = {
  'Large Structure': { style: { backgroundImage: `url(${TILE_WALL_PATH})` }, icon: null },
  'Building A': { style: { backgroundImage: `url(${TILE_WALL_PATH})` }, icon: null },
  'Building B': { style: { backgroundImage: `url(${TILE_WALL_PATH})` }, icon: null },
  'Building': { style: { backgroundImage: `url(${TILE_WALL_PATH})` }, icon: null },
  'Wall': { style: { backgroundImage: `url(${TILE_WALL_PATH})` }, icon: null },
  'Large Structure Interior': { style: { backgroundImage: `url(${TILE_FLOOR_INTERIOR_PATH})` }, icon: null },
  'Building A Interior': { style: { backgroundImage: `url(${TILE_FLOOR_INTERIOR_PATH})` }, icon: null },
  'Building B Interior': { style: { backgroundImage: `url(${TILE_FLOOR_INTERIOR_PATH})` }, icon: null },
  'Building Interior': { style: { backgroundImage: `url(${TILE_FLOOR_INTERIOR_PATH})` }, icon: null },
  'Control Tower Interior': { style: { backgroundImage: `url(${TILE_FLOOR_INTERIOR_PATH})` }, icon: null },
  'Door': { style: { backgroundImage: `url(${TILE_FLOOR_GRATE_PATH})` }, icon: <DoorOpen size={16} className='text-warning opacity-80' /> },
  'Control Tower': { style: { backgroundImage: `url(${TILE_WALL_PATH})` }, icon: <Building size={16} className='text-text-muted opacity-60' /> },
  'Container': { style: { backgroundColor: 'hsl(var(--color-secondary))' }, icon: <Container size={16} className='text-text-muted opacity-60' /> },
  'Equipment': { style: { backgroundColor: 'hsl(var(--color-warning) / 0.3)' }, icon: <Cog size={16} className='text-warning opacity-70' /> },
  'Machinery': { style: { backgroundColor: 'hsl(var(--color-warning) / 0.3)' }, icon: <Cog size={16} className='text-warning opacity-70' /> },
  'Fence Post': { style: { backgroundColor: 'hsl(var(--color-warning) / 0.3)' }, icon: <Construction size={16} className='text-warning opacity-70' /> },
  'Barricade': { style: { backgroundColor: 'hsl(var(--color-warning) / 0.3)' }, icon: <Construction size={16} className='text-warning opacity-70' /> },
  'Ruined Wall': { style: { backgroundColor: 'hsl(var(--color-secondary) / 0.6)' }, icon: <Construction size={16} className='text-text-muted opacity-70' /> },
  'Wreckage Line': { style: { backgroundColor: 'hsl(var(--color-secondary) / 0.6)' }, icon: <Construction size={16} className='text-text-muted opacity-70' /> },
  'Landing Pad': { style: { backgroundColor: 'hsl(var(--color-surface-overlay) / 0.5)' }, icon: <CircleDot size={16} className='text-text-muted opacity-50' /> },
  'Barrel': { style: { backgroundImage: `url(${TILE_FLOOR_GRATE_PATH})` }, icon: <Cylinder size={16} className='text-warning opacity-70' /> },
  'Sign Post': { style: {}, icon: <Signpost size={16} className='text-text-muted opacity-90' /> },
  'Statue': { style: { backgroundColor: 'hsl(var(--color-secondary))' }, icon: <Trophy size={16} className='text-text-muted opacity-70' /> },
  'Vehicle': { style: { backgroundColor: 'hsl(var(--color-danger) / 0.7)' }, icon: <Truck size={16} className='text-danger opacity-70' /> },
  'Scatter': { style: { backgroundColor: 'hsl(var(--color-surface-overlay) / 0.7)' }, icon: <Box size={16} className='text-text-muted opacity-70' /> },
  'Rubble': { style: { backgroundColor: 'hsl(var(--color-secondary) / 0.7)' }, icon: <Box size={16} className='text-text-muted opacity-70' /> },
  'Hill': { style: { backgroundColor: 'hsl(var(--color-success) / 0.3)' }, icon: <Mountain size={16} className='text-success opacity-50' /> },
  'Rock Ridge': { style: { backgroundColor: 'hsl(var(--color-secondary) / 0.6)' }, icon: <Mountain size={16} className='text-text-muted opacity-60' /> },
  'Crystal': { style: { backgroundColor: 'hsl(var(--color-primary) / 0.2)' }, icon: <Gem size={16} className='text-primary opacity-80' /> },
  'default': { style: { backgroundColor: 'hsl(var(--color-accent) / 0.3)' }, icon: null },
};

/**
 * Props for the BattleGrid component.
 * @property {BattleLogic} battleLogic - The hooks and handlers for managing battle UI state and actions.
 */
interface BattleGridProps {
  battleLogic: BattleLogic;
}

/**
 * Renders the main tactical grid for the battle.
 * It maps over the grid dimensions and renders a BattleCell for each coordinate,
 * passing down calculated props for display (terrain, participants, highlights, etc.).
 * @param {BattleGridProps} props - The component props.
 * @returns {React.ReactElement} The rendered battle grid.
 */
const BattleGrid: React.FC<BattleGridProps> = ({ battleLogic }) => {
  const { battle } = useGameState();
  const { uiState, derivedData, handlers, characterPerformingAction, validShootTargetIds, rangeDisplayWeaponInstanceId } = battleLogic;

  const multiplayerRole = useMultiplayerStore(state => state.multiplayerRole);
  const activeParticipantId = useBattleStore(state => state.battle?.activeParticipantId);
  const animatingParticipantId = useBattleStore(state => state.animatingParticipantId);
  const selectedParticipantId = useBattleStore(state => state.selectedParticipantId);
  const pendingActionFor = useBattleStore(state => state.pendingActionFor);
  const { setSelectedParticipantId, setHoveredParticipantId } = useBattleStore(state => state.actions);

  const { gridSize, participants, terrain, mission, notableSight } = battle;

  const activeParticipant = useMemo(() => {
    return participants?.find(p => p.id === activeParticipantId);
  }, [participants, activeParticipantId]);

  const isMyTurn = useMemo(() => {
    if (!battle) return false;
    return multiplayerRole
      ? battle.activePlayerRole === multiplayerRole
      : !!activeParticipantId;
  }, [battle.activePlayerRole, multiplayerRole, activeParticipantId]);


  const participantsByPosition = useMemo(() => {
    const map = new Map<string, BattleParticipant>();
    participants.forEach(p => {
      map.set(`${p.position.x},${p.position.y}`, p);
    });
    return map;
  }, [participants]);

  const terrainByPosition = useMemo(() => {
    const map = new Map<string, Terrain>();
    const sortedTerrain = [...terrain].sort((a, b) => {
      if (a.type === 'Door' && b.type !== 'Door') return 1;
      if (b.type !== 'Door' && a.type !== 'Door') return -1;
      if (a.name.includes('Interior') && !b.name.includes('Interior')) return -1;
      if (!a.name.includes('Interior') && b.name.includes('Interior')) return 1;
      return 0;
    });

    for (const t of sortedTerrain) {
      for (let y = t.position.y; y < t.position.y + t.size.height; y++) {
        for (let x = t.position.x; x < t.position.x + t.size.width; x++) {
          map.set(`${x},${y}`, t);
        }
      }
    }
    return map;
  }, [terrain]);

  const onParticipantSelect = useCallback((participant: BattleParticipant) => {
    if (battle.phase === 'battle_over') {
      setSelectedParticipantId(participant.id);
      handlers.cancelAction();
      return;
    }

    setSelectedParticipantId(participant.id);
    handlers.cancelAction();
  }, [battle.phase, setSelectedParticipantId, handlers]);

  const handleCellClick = useCallback((pos: Position, participant: BattleParticipant | undefined) => {
    if (uiState.mode !== 'idle') {
      handlers.handleGridClick(pos);
    } else if (participant) {
      onParticipantSelect(participant);
    }
  }, [uiState, handlers, onParticipantSelect]);

  const handleHover = useCallback((pos: Position | null) => {
    handlers.setHoveredPos(pos);
    if (pos) {
        const participant = participantsByPosition.get(`${pos.x},${pos.y}`);
        setHoveredParticipantId(participant ? participant.id : null);
    } else {
        setHoveredParticipantId(null);
    }
  }, [handlers.setHoveredPos, participantsByPosition, setHoveredParticipantId]);

  const cells = useMemo(() => {
    const cellComponents = [];
    const actor = characterPerformingAction || participants.find(p => p.id === activeParticipantId);
    const actorForRange = activeParticipant;

    for (let y = 0; y < gridSize.height; y++) {
      for (let x = 0; x < gridSize.width; x++) {
        const pos = { x, y };
        const posKey = `${x},${y}`;
        const participant = participantsByPosition.get(posKey);
        const terrainAtPos = terrainByPosition.get(posKey);

        const tileIndex = (x * 19 + y * 73) % TILE_FLOOR_PATHS.length;
        let cellStyle: React.CSSProperties = { backgroundImage: `url(${TILE_FLOOR_PATHS[tileIndex]})` };
        const highlightClasses: string[] = [];
        let pathOverlayClass: string | undefined = undefined;

        let cellBorder = 'border-border/50';
        let isClickable = false;
        let cellIcon: React.ReactNode = null;
        let providesCoverForMove = false;

        if (terrainAtPos) {
          const visual = TERRAIN_VISUALS[terrainAtPos.name] || TERRAIN_VISUALS.default;
          cellStyle = { ...cellStyle, ...visual.style };
          cellIcon = visual.icon;
        }

        const isReachableMoveCell = (uiState.mode === 'move' || uiState.mode === 'follow_up_move') && derivedData.reachableCells?.has(posKey);

        const isItemOnGround = mission.itemPosition?.x === x && mission.itemPosition.y === y;
        const isSearched = mission.type === 'Search' && mission.searchedPositions?.some(p => p.x === x && p.y === y);
        const isNotableSight = notableSight?.present && !notableSight.acquiredBy && notableSight.position?.x === x && notableSight.position.y === y;

        const isHighlightedForInteraction = derivedData.interactionHighlightPositions.has(posKey) && uiState.mode === 'idle' && !isSearched;

        if (isHighlightedForInteraction) {
          switch (mission.type) {
            case 'Secure': case 'Protect': highlightClasses.push('bg-info/20'); cellBorder = 'border-info/50'; break;
            case 'Acquire':
            case 'MoveThrough': highlightClasses.push('bg-success/20'); cellBorder = 'border-success/50'; break;
            case 'Access': highlightClasses.push('bg-primary/30'); cellBorder = 'border-primary/70 animate-pulse'; break;
            case 'Deliver':
              if (mission.objectivePosition && mission.objectivePosition.x === x && mission.objectivePosition.y === y) {
                highlightClasses.push('bg-success/30');
                cellBorder = 'border-success/70 animate-pulse';
              }
              break;
            case 'Patrol': highlightClasses.push('bg-warning/20'); cellBorder = 'border-warning/50 animate-pulse'; break;
            default: highlightClasses.push('bg-warning/30'); cellBorder = 'border-warning/70'; break;
          }
        }

        if ((isItemOnGround || isNotableSight) && uiState.mode === 'idle' && !isSearched) {
          highlightClasses.push('bg-accent/20');
          cellBorder = 'border-accent/70';
        }

        if (rangeDisplayWeaponInstanceId && actorForRange) {
          const weaponData = BattleDomain.getEffectiveWeapon(actorForRange, rangeDisplayWeaponInstanceId);
          if (weaponData && typeof weaponData.range === 'number') {
            const ghostTarget = { ...actorForRange, position: pos, id: 'ghost-target-for-los' };
            if (
              distance(actorForRange.position, pos) <= weaponData.range &&
              hasLineOfSight(actorForRange, ghostTarget, battle)
            ) {
              highlightClasses.push('bg-accent/20');
            }
          }
        }

        if (isMyTurn && uiState.mode !== 'idle') {
          if (isReachableMoveCell) {
            providesCoverForMove = derivedData.coverStatus.get(posKey) ?? false;
            if (uiState.mode === 'move') {
              highlightClasses.push(uiState.isDash ? 'bg-warning/25' : (providesCoverForMove ? 'bg-info/25' : 'bg-primary/25'));
              cellBorder = uiState.isDash ? 'border-warning/60' : 'border-primary/60';
            } else { // follow_up_move
              highlightClasses.push('bg-success/25');
              cellBorder = 'border-success/60';
            }
            isClickable = true;
          } else if (uiState.mode === 'shoot' && uiState.weaponInstanceId && participant && validShootTargetIds.has(participant.id)) {
            highlightClasses.push('bg-danger/25');
            cellBorder = 'border-danger/60';
            isClickable = true;
          } else if (uiState.mode === 'brawling' && participant && actor && isParticipantOpponent(actor, participant, multiplayerRole) && distance(actor.position, participant.position) <= 1) {
            highlightClasses.push('bg-danger/25');
            cellBorder = 'border-danger/60';
            isClickable = true;
          }
        }

        const isPath = derivedData.hoveredPath?.some(p => p.x === x && p.y === y);
        const isPathEnd = isPath && derivedData.hoveredPath![derivedData.hoveredPath!.length - 1].x === x && derivedData.hoveredPath![derivedData.hoveredPath!.length - 1].y === y;

        if (isPath) {
          pathOverlayClass = isPathEnd ? 'bg-primary/40' : 'bg-primary/20';
        }

        const highlightOverlayClass = highlightClasses.length > 0 ? highlightClasses.join(' ') : undefined;

        let participantViewModel: BattleCellParticipantViewModel | undefined;
        if (participant) {
          const isOpponent = multiplayerRole ? !participant.id.startsWith(multiplayerRole) : participant.type === 'enemy';
          participantViewModel = {
            id: participant.id,
            name: participant.name || '',
            type: participant.type,
            status: participant.status,
            stunTokens: participant.stunTokens,
            isOpponent,
            isItemCarrier: mission.itemCarrierId === participant.id,
            isSelected: selectedParticipantId === participant.id,
            isActive: activeParticipantId === participant.id,
            isAnimating: animatingParticipantId === participant.id,
            isPending: pendingActionFor === participant.id,
            hasCoverFromAttacker: !!(characterPerformingAction && validShootTargetIds.has(participant.id) && calculateCover(characterPerformingAction, participant, battle)),
            isMissionTarget: mission.type === 'Eliminate' && mission.targetEnemyId === participant.id,
            isUnique: (participant as any).isUnique,
          };
        }

        cellComponents.push(
          <BattleCell
            key={posKey}
            x={x}
            y={y}
            onCellClick={() => handleCellClick(pos, participant)}
            onHover={handleHover}
            cellStyle={cellStyle}
            cellBorder={cellBorder}
            cellIcon={cellIcon}
            highlightOverlayClass={highlightOverlayClass}
            pathOverlayClass={pathOverlayClass}
            isClickable={isClickable}
            isPathEnd={!!isPathEnd}
            isReachableMoveCell={!!isReachableMoveCell}
            providesCoverForMove={providesCoverForMove}
            participant={participantViewModel}
            isItemOnGround={!!isItemOnGround}
            isSearched={!!isSearched}
            isNotableSight={!!isNotableSight}
            pathCost={isPathEnd ? derivedData.reachableCells?.get(posKey) : undefined}
          />
        );
      }
    }
    return cellComponents;
  }, [
    gridSize, participants, terrain, mission, notableSight,
    participantsByPosition, terrainByPosition, uiState, derivedData,
    activeParticipantId, animatingParticipantId, selectedParticipantId, pendingActionFor,
    multiplayerRole, isMyTurn, characterPerformingAction, validShootTargetIds,
    handleCellClick, handlers.setHoveredPos, battle, rangeDisplayWeaponInstanceId, activeParticipant, handleHover
  ]);

  return (
    <div className='inline-block min-w-full'>
      <Card className='p-1 sm:p-2'>
        <div data-testid='battle-grid-content' className='grid gap-0' style={{ gridTemplateColumns: `repeat(${gridSize.width}, 1fr)` }}>
          {cells}
        </div>
      </Card>
    </div>
  );
};

export default BattleGrid;
