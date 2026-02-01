import type { BattleParticipant, Position } from '@/types/battle';

export type ShootingWeapon = {
    id: string;
    range: number;
    shots: number;
    damage: number;
    traits: string[];
};

// Inline distance helper to keep rules pure and self-contained
function distance(p1: Position, p2: Position): number {
    const dx = Math.abs(p1.x - p2.x);
    const dy = Math.abs(p1.y - p2.y);
    return Math.max(dx, dy);
}

export function calculateEffectiveCombatOpenShot(attacker: BattleParticipant): number {
    return attacker.stats.combat;
}

export function calculateHitTargetNumberOpenShot(
    attacker: BattleParticipant,
    target: BattleParticipant,
    weapon: ShootingWeapon
): { targetNumber: number; reasonKey?: string } {
    const dist = distance(attacker.position, target.position);
    const weaponRange = typeof weapon.range === 'number' ? weapon.range : 0;

    if (dist > weaponRange) {
        return { targetNumber: 99, reasonKey: 'log.info.outOfRange' };
    }
    
    // Open shot logic (assuming no cover for this vertical slice)
    if (dist <= 6) {
        return { targetNumber: 3, reasonKey: 'log.info.targetReasonShortOpen' };
    }
    
    // Default to long range open (TN 5) if within range and > 6
    // (This covers the remaining case since dist > weaponRange is handled above)
    return { targetNumber: 5, reasonKey: 'log.info.targetReasonLongOpenOrShortCover' };
}
