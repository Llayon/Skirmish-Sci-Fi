import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import type { BattleParticipant } from '@/types';
import type { Battle } from '@/types/battle';
import { CHARACTER_HEIGHT } from '@/constants/three';
import { gridToWorld } from '@/services/three/coordinates';
import { calculateCover, hasLineOfSight } from '@/services/rules/visibility';

type AimingLine3DProps = {
  battle: Battle;
  attacker: BattleParticipant;
  target: BattleParticipant | null;
};

export const AimingLine3D = ({ battle, attacker, target }: AimingLine3DProps) => {
  const data = useMemo(() => {
    if (!target) return null;
    if (target.status === 'casualty') return null;

    const start = gridToWorld(attacker.position, battle.gridSize, CHARACTER_HEIGHT * 0.9);
    const end = gridToWorld(target.position, battle.gridSize, CHARACTER_HEIGHT * 0.9);

    const hasLos = hasLineOfSight(attacker, target, battle as any);
    const hasCover = hasLos ? calculateCover(attacker, target, battle as any) : false;

    const color = !hasLos ? '#ef4444' : hasCover ? '#38bdf8' : '#22c55e';
    return { start, end, color, dashed: !hasLos };
  }, [attacker, battle, target]);

  if (!data) return null;

  return (
    <Line
      points={[
        [data.start.x, data.start.y, data.start.z],
        [data.end.x, data.end.y, data.end.z],
      ]}
      color={data.color}
      lineWidth={2}
      dashed={data.dashed}
      dashSize={0.25}
      gapSize={0.18}
      transparent
      opacity={0.85}
      raycast={() => null}
    />
  );
};

