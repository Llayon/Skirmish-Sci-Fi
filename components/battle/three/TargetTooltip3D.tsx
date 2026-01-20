import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import type { BattleParticipant } from '@/types';
import type { Battle } from '@/types/battle';
import { CHARACTER_HEIGHT } from '@/constants/three';
import { gridToWorld } from '@/services/three/coordinates';
import { getWeaponById } from '@/services/data/items';
import { BattleDomain } from '@/services/domain/battleDomain';

type TargetTooltip3DProps = {
  battle: Battle;
  attacker: BattleParticipant;
  target: BattleParticipant;
  weaponInstanceId: string;
};

export const TargetTooltip3D = ({ battle, attacker, target, weaponInstanceId }: TargetTooltip3DProps) => {
  const view = useMemo(() => {
    const weaponInstance = attacker.weapons.find((w) => w.instanceId === weaponInstanceId);
    if (!weaponInstance) return null;

    const weapon = getWeaponById(weaponInstance.weaponId);
    if (!weapon) return null;

    const { targetNumber } = BattleDomain.calculateHitTargetNumber(attacker as any, target as any, weapon as any, battle as any);
    const attackerEffectiveStats = BattleDomain.calculateEffectiveStats(attacker as any);
    const requiredBase = targetNumber - attackerEffectiveStats.combat;

    const chance =
      targetNumber >= 99
        ? 0
        : requiredBase <= 1
          ? 100
          : requiredBase > 6
            ? 0
            : Math.round(((7 - requiredBase) / 6) * 100);

    const label = targetNumber >= 99 ? 'OOR' : `TN ${targetNumber}`;
    return { label, chance };
  }, [attacker, battle, target, weaponInstanceId]);

  const pos = useMemo(() => gridToWorld(target.position, battle.gridSize, CHARACTER_HEIGHT + 0.9), [battle.gridSize, target.position]);

  if (!view) return null;

  return (
    <Html position={[pos.x, pos.y, pos.z]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
      <div className="bg-surface-overlay/85 backdrop-blur-sm border border-border/70 rounded px-2 py-1 text-[11px] leading-tight shadow-lg">
        <div className="font-bold text-text-base">{view.label}</div>
        <div className="text-text-muted">{view.chance}%</div>
      </div>
    </Html>
  );
};

