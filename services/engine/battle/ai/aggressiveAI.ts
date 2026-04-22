import { EngineBattleState, BattleAction, EngineDeps } from '../types';
import { findBestTarget } from '../rules/targetingRules';
import { getShortestPath } from '../../utils/pathfinding';
import { evaluateMovementOptions } from './complexAIUtils';
import { Position } from '@/types/character';
import { RngState } from '../../rng/rng';
import { ShootingWeapon } from '../rules/shootingRules';

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
        p.id !== actorId && p.status !== 'casualty' && p.type === 'character'
    );

    // 1. Identify Target
    const { targetId, nextRng } = findBestTarget(state, actorId, enemies, deps);
    currentRng = nextRng;

    const target = enemies.find(e => e.id === targetId) || 
                   enemies.sort((a, b) => getDistance(actor.position, a.position) - getDistance(actor.position, b.position))[0];

    if (!target) return { actions: [], nextRng: currentRng };

    const dist = getDistance(actor.position, target.position);
    const speed = actor.stats.speed;
    const weapon = actor.weapons[0] as ShootingWeapon;
    const isHeavy = weapon?.traits.includes('heavy');

    // 2. Action Logic
    
    // Rule: Heavy weapon figures will not move if they have a Line of Sight to a target.
    if (isHeavy && targetId) {
        plan.push({ type: 'SHOOT_ATTACK', attackerId: actorId, targetId: target.id, weapon });
        return { actions: plan, nextRng: currentRng };
    }

    // Rule: Enemies that are unable to see any opposition, or which are within 12", 
    // will advance as fast as possible towards the nearest opponent, attempting to enter into a Brawl.
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
                // (Meaning: Actor.Combat >= Target.Combat)
                if (finalDist <= 1 && actor.stats.combat >= target.stats.combat) {
                    plan.push({ type: 'BRAWL_ATTACK', attackerId: actorId, targetId: target.id, weapon });
                }
            } else if (dist <= 1 && actor.stats.combat >= target.stats.combat) {
                plan.push({ type: 'BRAWL_ATTACK', attackerId: actorId, targetId: target.id, weapon });
            }
        }
    } else {
        // TACTICAL ADVANCE: At least half move towards them, attempting to remain in Cover if possible.
        // We use evaluateMovementOptions with a preference for cover but a mandatory distance reduction.
        
        // We evaluate cells up to FULL speed, but we prioritize those that are at least half speed away 
        // from the start and provide cover.
        const { bestCell } = evaluateMovementOptions(state, actorId, target.id, speed, {
            cover: 200,    // High priority for cover
            los: 100,      // Need to see them
            distance: -50, // Wants to get closer (at least half move)
            proximity: 0
        });

        if (bestCell.x !== actor.position.x || bestCell.y !== actor.position.y) {
            plan.push({ type: 'MOVE_PARTICIPANT', participantId: actorId, to: bestCell });
        }

        // Shoot if LoS exists
        plan.push({ type: 'SHOOT_ATTACK', attackerId: actorId, targetId: target.id, weapon });
    }

    return { actions: plan, nextRng: currentRng };
}
