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

interface BattleView3DProps {
  battleLogic: BattleLogic;
}

const BattleView3D = ({ battleLogic }: BattleView3DProps) => {
  const battle = useBattleStore((s) => s.battle);
  const selectedParticipantId = useBattleStore((s) => s.selectedParticipantId);
  const activeParticipantId = useBattleStore((s) => s.battle?.activeParticipantId ?? null);
  const animatingParticipantId = useBattleStore((s) => s.animatingParticipantId);
  const hoveredParticipantId = useBattleStore((s) => s.hoveredParticipantId);
  const { setSelectedParticipantId, setHoveredParticipantId } = useBattleStore((s) => s.actions);

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

  const onCellHover = useCallback(
    (pos: Position | null) => {
      battleLogic.handlers.setHoveredPos(pos);
      if (pos) {
        const participantId = participantsByPosition.get(`${pos.x},${pos.y}`) ?? null;
        setHoveredParticipantId(participantId);
      } else {
        setHoveredParticipantId(null);
      }
    },
    [battleLogic.handlers, participantsByPosition, setHoveredParticipantId]
  );

  const onCellClick = useCallback(
    (pos: Position) => {
      if (battleLogic.uiState.mode !== 'idle') {
        battleLogic.handlers.handleGridClick(pos);
        return;
      }

      const participantId = participantsByPosition.get(`${pos.x},${pos.y}`);
      if (participantId) {
        setSelectedParticipantId(participantId);
        battleLogic.handlers.cancelAction();
      }
    },
    [battleLogic.handlers, battleLogic.uiState.mode, participantsByPosition, setSelectedParticipantId]
  );

  const onUnitClick = useCallback(
    (id: string, pos: Position) => {
      if (battleLogic.uiState.mode !== 'idle') {
        battleLogic.handlers.handleGridClick(pos);
        return;
      }
      setSelectedParticipantId(id);
      battleLogic.handlers.cancelAction();
    },
    [battleLogic.handlers, battleLogic.uiState.mode, setSelectedParticipantId]
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

            {terrain.map((t) => (
              <TerrainMesh key={t.id} terrain={t} gridSize={gridSize} />
            ))}

            {units.map((u) => (
              <ParticipantMesh key={u.id} unit={u} gridSize={gridSize} onClick={onUnitClick} onHover={onCellHover} />
            ))}

            <MoveHighlights positions={availableMoves} gridSize={gridSize} />
            <HPBars3D units={units} gridSize={gridSize} />
            <AnimationSystem3D gridSize={gridSize} />

            <RaycastController gridSize={gridSize} onCellHover={onCellHover} onCellClick={onCellClick} />
          </ThreeCanvas>
        </ParticipantMeshProvider>
      </TerrainMeshProvider>
    </div>
  );
};

export default BattleView3D;
