import { useCallback, useMemo } from 'react';
import { useBattleStore } from '@/stores';
import type { BattleLogic } from '@/hooks/useBattleLogic';
import type { Position } from '@/types/battle';
import { mapBattleTo3D } from '@/services/adapters/battle3dAdapter';
import { GridFloor } from './three/GridFloor';
import { HPBars3D } from './three/HPBars3D';
import { MoveHighlights } from './three/MoveHighlights';
import { ParticipantMesh } from './three/ParticipantMesh';
import { RaycastController } from './three/RaycastController';
import { TerrainMesh } from './three/TerrainMesh';
import { ThreeCanvas } from './three/ThreeCanvas';
import { AnimationSystem3D } from './three/AnimationSystem3D';
import { ParticipantMeshProvider } from './three/contexts/ParticipantMeshContext';
import { TerrainMeshProvider } from './three/contexts/TerrainMeshContext';
import { CameraCommands3D } from './three/CameraCommands3D';
import { AimingLine3D } from './three/AimingLine3D';
import { TargetTooltip3D } from './three/TargetTooltip3D';

interface BattleView3DProps {
  battleLogic: BattleLogic;
}

const BattleView3D = ({ battleLogic }: BattleView3DProps) => {
  const battle = useBattleStore((s) => s.battle);
  const selectedParticipantId = useBattleStore((s) => s.selectedParticipantId);
  const activeParticipantId = useBattleStore((s) => s.battle?.activeParticipantId ?? null);
  const animatingParticipantId = useBattleStore((s) => s.animatingParticipantId);
  const hoveredParticipantId = useBattleStore((s) => s.hoveredParticipantId);
  const inspectLockedParticipantId = useBattleStore((s) => s.inspectLockedParticipantId);
  const inspectLockedTile = useBattleStore((s) => s.inspectLockedTile);
  const { setSelectedParticipantId, setHoveredParticipantId, setInspectLockedParticipantId, setInspectLockedPointer, setInspectLockedTile, setInspectLockedTilePointer } = useBattleStore((s) => s.actions);

  const participantsByPosition = useMemo(() => {
    const map = new Map<string, string>();
    if (!battle) return map;
    battle.participants.forEach((p) => {
      map.set(`${p.position.x},${p.position.y}`, p.id);
    });
    return map;
  }, [battle]);

  const availableMoves = useMemo(() => {
    const reachableCells = battleLogic.derivedData.reachableCells;
    if (!reachableCells) return [];
    const result: Position[] = [];
    for (const posKey of reachableCells.keys()) {
      const [xStr, yStr] = posKey.split(',');
      result.push({ x: Number(xStr), y: Number(yStr) });
    }
    return result;
  }, [battleLogic.derivedData.reachableCells]);

  const coverMovePositions = useMemo(() => {
    const cover = battleLogic.derivedData.coverStatus;
    if (!cover || cover.size === 0) return [];
    const result: Position[] = [];
    for (const [posKey, providesCover] of cover.entries()) {
      if (!providesCover) continue;
      const [xStr, yStr] = posKey.split(',');
      result.push({ x: Number(xStr), y: Number(yStr) });
    }
    return result;
  }, [battleLogic.derivedData.coverStatus]);

  const coverArrows = useMemo(() => {
    const dirs = battleLogic.derivedData.coverDirections as Map<string, { dx: -1 | 0 | 1; dy: -1 | 0 | 1 }> | undefined;
    if (!dirs || dirs.size === 0) return [];
    const result: { pos: Position; angle: number }[] = [];
    for (const [posKey, dir] of dirs.entries()) {
      const [xStr, yStr] = posKey.split(',');
      const pos = { x: Number(xStr), y: Number(yStr) };
      const angle = Math.atan2(dir.dx, dir.dy);
      result.push({ pos, angle });
    }
    return result;
  }, [battleLogic.derivedData.coverDirections]);

  const hoveredPath = useMemo(() => {
    return battleLogic.derivedData.hoveredPath ?? null;
  }, [battleLogic.derivedData.hoveredPath]);

  const validShootTargetIds = battleLogic.derivedData.validShootTargetIds;
  const attacker = battleLogic.characterPerformingAction;
  const aimTarget = useMemo(() => {
    if (!battle || battleLogic.uiState.mode !== 'shoot' || !hoveredParticipantId) return null;
    return battle.participants.find((p) => p.id === hoveredParticipantId) ?? null;
  }, [battle, battleLogic.uiState.mode, hoveredParticipantId]);
  const isAimTargetValid = aimTarget ? validShootTargetIds.has(aimTarget.id) : false;

  const onCellHover = useCallback(
    (pos: Position | null) => {
      battleLogic.handlers.setHoveredPos(pos);
      if (inspectLockedParticipantId || inspectLockedTile) return;
      if (pos) {
        const participantId = participantsByPosition.get(`${pos.x},${pos.y}`) ?? null;
        setHoveredParticipantId(participantId);
      } else {
        setHoveredParticipantId(null);
      }
    },
    [battleLogic.handlers, inspectLockedParticipantId, inspectLockedTile, participantsByPosition, setHoveredParticipantId]
  );

  const onCellClick = useCallback(
    (pos: Position) => {
      if (inspectLockedParticipantId) {
        setInspectLockedParticipantId(null);
        setHoveredParticipantId(null);
        setInspectLockedPointer(null);
      }
      setInspectLockedTile(null);
      setInspectLockedTilePointer(null);
      if (battleLogic.uiState.mode !== 'idle') {
        battleLogic.handlers.handleGridClick(pos);
        return;
      }

      const participantId = participantsByPosition.get(`${pos.x},${pos.y}`);
      if (participantId) {
        setSelectedParticipantId(participantId);
        battleLogic.handlers.cancelAction();
      } else {
        setSelectedParticipantId(null);
      }
    },
    [battleLogic.handlers, battleLogic.uiState.mode, inspectLockedParticipantId, participantsByPosition, setHoveredParticipantId, setInspectLockedParticipantId, setInspectLockedPointer, setInspectLockedTile, setInspectLockedTilePointer, setSelectedParticipantId]
  );

  const onCellInspect = useCallback(
    (pos: Position, screen: { x: number; y: number }) => {
      setInspectLockedTile(pos);
      setInspectLockedTilePointer(screen);
    },
    [setInspectLockedTile, setInspectLockedTilePointer]
  );

  const onUnitClick = useCallback(
    (id: string, pos: Position) => {
      if (inspectLockedParticipantId) {
        setInspectLockedParticipantId(null);
        setHoveredParticipantId(null);
        setInspectLockedPointer(null);
      }
      setInspectLockedTile(null);
      setInspectLockedTilePointer(null);
      if (battleLogic.uiState.mode !== 'idle') {
        battleLogic.handlers.handleGridClick(pos);
        return;
      }
      setSelectedParticipantId(id);
      battleLogic.handlers.cancelAction();
    },
    [battleLogic.handlers, battleLogic.uiState.mode, inspectLockedParticipantId, setHoveredParticipantId, setInspectLockedParticipantId, setInspectLockedPointer, setInspectLockedTile, setInspectLockedTilePointer, setSelectedParticipantId]
  );

  const onUnitInspect = useCallback(
    (id: string, pos: Position, screen: { x: number; y: number }) => {
      setInspectLockedTile(null);
      setInspectLockedTilePointer(null);
      setInspectLockedParticipantId(id);
      setInspectLockedPointer(screen);
      battleLogic.handlers.setHoveredPos(pos);
      setHoveredParticipantId(id);
    },
    [battleLogic.handlers, setHoveredParticipantId, setInspectLockedParticipantId, setInspectLockedPointer, setInspectLockedTile, setInspectLockedTilePointer]
  );

  const battleView3D = useMemo(() => {
    if (!battle) return null;
    return mapBattleTo3D(battle, selectedParticipantId, activeParticipantId, availableMoves, animatingParticipantId, hoveredParticipantId);
  }, [activeParticipantId, animatingParticipantId, availableMoves, battle, selectedParticipantId, hoveredParticipantId]);

  if (!battleView3D) return null;

  const { gridSize, terrain, units } = battleView3D;

  return (
    <div className="relative w-full h-full">
      <TerrainMeshProvider>
        <ParticipantMeshProvider>
          <ThreeCanvas gridSize={gridSize}>
            <GridFloor gridSize={gridSize} />
            <CameraCommands3D gridSize={gridSize} />

            {battle && attacker && battleLogic.uiState.mode === 'shoot' && (
              <AimingLine3D battle={battle as any} attacker={attacker as any} target={aimTarget as any} />
            )}
            {battle &&
              attacker &&
              battleLogic.uiState.mode === 'shoot' &&
              aimTarget &&
              isAimTargetValid &&
              battleLogic.uiState.weaponInstanceId && (
                <TargetTooltip3D
                  battle={battle as any}
                  attacker={attacker as any}
                  target={aimTarget as any}
                  weaponInstanceId={battleLogic.uiState.weaponInstanceId}
                />
              )}

            {terrain.map((t) => (
              <TerrainMesh key={t.id} terrain={t} gridSize={gridSize} />
            ))}

            {units.map((u) => (
              <ParticipantMesh
                key={u.id}
                unit={u}
                gridSize={gridSize}
                onClick={onUnitClick}
                onInspect={onUnitInspect}
                onHover={onCellHover}
                isValidTarget={validShootTargetIds.has(u.id)}
              />
            ))}

            <MoveHighlights
              positions={availableMoves}
              coverPositions={coverMovePositions}
              coverArrows={coverArrows}
              pathPositions={hoveredPath}
              gridSize={gridSize}
            />
            <HPBars3D units={units} gridSize={gridSize} />
            <AnimationSystem3D gridSize={gridSize} />

            <RaycastController gridSize={gridSize} onCellHover={onCellHover} onCellClick={onCellClick} onCellInspect={onCellInspect} />
          </ThreeCanvas>
        </ParticipantMeshProvider>
      </TerrainMeshProvider>
    </div>
  );
};

export default BattleView3D;
