import type { Battle, Position, Terrain } from '@/types/battle';
import type { BattleParticipant } from '@/types/character';
import type { BattleView3D, Terrain3D, Terrain3DType, Unit3D } from '@/types/battle3d';

export function mapBattleTo3D(
  battle: Battle,
  selectedParticipantId: string | null,
  activeParticipantId: string | null,
  availableMoves: Position[],
  animatingParticipantId: string | null,
  hoveredParticipantId?: string | null
): BattleView3D {
  return {
    gridSize: battle.gridSize,
    terrain: battle.terrain.map(mapTerrainTo3D),
    units: battle.participants.map((p) =>
      mapParticipantTo3D(p, selectedParticipantId, activeParticipantId, animatingParticipantId, hoveredParticipantId ?? null)
    ),
    availableMoves,
  };
}

function mapParticipantTo3D(
  p: BattleParticipant,
  selectedParticipantId: string | null,
  activeParticipantId: string | null,
  animatingParticipantId: string | null,
  hoveredParticipantId: string | null
): Unit3D {
  const vitalityMax = 6;
  const vitalityCurrent = p.status === 'casualty' ? 0 : Math.max(0, vitalityMax - p.stunTokens);

  return {
    id: p.id,
    type: p.type,
    position: p.position,
    status: p.status,
    stunTokens: p.stunTokens,
    isSelected: p.id === selectedParticipantId,
    isActive: p.id === activeParticipantId,
    isHovered: p.id === hoveredParticipantId,
    isAnimating: p.id === animatingParticipantId,
    vitality: {
      current: vitalityCurrent,
      max: vitalityMax,
      label: 'STUN',
    },
  };
}

function mapTerrainTo3D(t: Terrain): Terrain3D {
  const type = getTerrain3DType(t);
  const height = getTerrainHeight(type);

  return {
    id: t.id,
    type,
    position: t.position,
    height,
    providesCover: !!t.providesCover,
    blocksLineOfSight: !!t.blocksLineOfSight,
  };
}

function getTerrain3DType(t: Terrain): Terrain3DType {
  if (t.name === 'Barrel') return 'Barrel';
  if (t.name === 'Container') return 'Container';

  if (t.name === 'Wall') return 'Wall';
  if (t.name.includes('Building') || t.name.includes('Structure')) return 'Wall';
  if (t.blocksLineOfSight || t.isImpassable) return 'Wall';

  return 'Obstacle';
}

function getTerrainHeight(type: Terrain3DType): number {
  switch (type) {
    case 'Wall':
      return 1.6;
    case 'Container':
      return 1.2;
    case 'Barrel':
      return 0.9;
    case 'Obstacle':
      return 0.7;
    case 'Floor':
    default:
      return 0.05;
  }
}
