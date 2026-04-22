import { EngineBattleState, BattleAction, EngineDeps } from '../types';
import { findBestTarget, findBestWeaponForTarget } from '../rules/targetingRules';
import { getShortestPath } from '../../utils/pathfinding';
import { evaluateMovementOptions } from './complexAIUtils';
import { Position } from '@/types/character';
import { RngState } from '../../rng/rng';
import { ShootingWeapon } from '../rules/shootingRules';
import { hasLineOfSight } from '../rules/visibilityRules';

// Inline distance helper
function getDistance(p1: Position, p2: Position): number {
    return Math.max(Math.abs(p1.x - p2.x), Math.abs(p1.y - p2.y));
}

/**
 * Generates an Action Plan for an Aggressive AI participant.
 */
export function generateAggressiveAIPlan(
    state: EngineBattleState,
    actorId: string,
    deps: EngineDeps
): { actions: BattleAction[], nextRng: RngState } {
    const actor = state.battle.participants.find(p => p.id === actorId);
    let currentRng = state.rng;
    const plan: BattleAction[] = [];

    if (!actor || actor.status === 'casualty' || actor.actionsRemaining <= 0) {
        return { actions: [], nextRng: currentRng };
    }

    const enemies = state.battle.participants.filter(p => 
        p.side !== actor.side && p.status !== 'casualty'
    );

    // 1. Identify Target
    const { targetId, nextRng } = findBestTarget(state, actorId, enemies, deps);
    currentRng = nextRng;

    const target = enemies.find(e => e.id === targetId) || 
                   enemies.sort((a, b) => getDistance(actor.position, a.position) - getDistance(actor.position, b.position))[0];

    if (!target) return { actions: [], nextRng: currentRng };

    // 1.1 Weapon Selection
    const { weapon } = findBestWeaponForTarget(actor, target, actor.weapons as ShootingWeapon[]);
    const isHeavy = weapon?.traits.includes('heavy');

    const dist = getDistance(actor.position, target.position);
    const speed = actor.stats.speed;

    // 2. Action Logic
    
    // Rule: Heavy weapon figures will not move if they have a Line of Sight to a target.
    if (isHeavy && targetId) {
        plan.push({ type: 'SHOOT_ATTACK', attackerId: actorId, targetId: target.id, weapon });
        return { actions: plan, nextRng: currentRng };
    }

    const isChargeMode = !targetId || dist <= 12;

    if (isChargeMode) {
        // FAST AS POSSIBLE (Full Speed)
        const path = getShortestPath(state, actor.position, target.position);
        
        if (path && path.length > 0) {
            const movePath = path.filter(p => p.x !== target.position.x || p.y !== target.position.y);
            
            if (movePath.length > 0) {
                const moveTarget = movePath.slice(0, speed)[movePath.slice(0, speed).length - 1];
                plan.push({ type: 'MOVE_PARTICIPANT', participantId: actorId, to: moveTarget });
                
                const finalDist = getDistance(moveTarget, target.position);
                // Rule: They will not enter a Brawl with an opponent that has higher Combat Skill.
                if (finalDist <= 1 && actor.stats.combat >= target.stats.combat) {
                    plan.push({ type: 'BRAWL_ATTACK', attackerId: actorId, targetId: target.id, weapon });
                } else if (targetId && hasLineOfSight(state, moveTarget, target.position) && weapon.range > 1) {
                    // If couldn't brawl but can shoot, do it!
                    plan.push({ type: 'SHOOT_ATTACK', attackerId: actorId, targetId: target.id, weapon });
                }
            } else if (dist <= 1 && actor.stats.combat >= target.stats.combat) {
                plan.push({ type: 'BRAWL_ATTACK', attackerId: actorId, targetId: target.id, weapon });
            }
        }
    } else {
        // TACTICAL ADVANCE: At least half move towards them, prioritizing cover.
        const { bestCell } = evaluateMovementOptions(state, actorId, target.id, speed, {
            cover: 200,
            los: 100,
            distance: -50,
            proximity: 0
        });

        if (bestCell.x !== actor.position.x || bestCell.y !== actor.position.y) {
            plan.push({ type: 'MOVE_PARTICIPANT', participantId: actorId, to: bestCell });
        }

        plan.push({ type: 'SHOOT_ATTACK', attackerId: actorId, targetId: target.id, weapon });
    }

    return { actions: plan, nextRng: currentRng };
}
