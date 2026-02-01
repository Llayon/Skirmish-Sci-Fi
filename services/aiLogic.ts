import { Battle, BattleParticipant, Position, AIActionPlan, Weapon, Enemy } from '../types';
import { distance, findReachableCells, findPath, isPointInTerrain, findFleePath } from './gridUtils';
import { hasLineOfSight, calculateCover } from './rules/visibility';
import { getWeaponById } from './data/items';


// ===================================================================================
//
//  AI HELPER FUNCTIONS
//
// ===================================================================================

const getBestRangedWeapon = (enemy: BattleParticipant): Weapon | undefined => {
    const weapons = enemy.weapons.map(cw => getWeaponById(cw.weaponId)).filter((w): w is Weapon => !!w && w.range !== 'brawl' && typeof w.range === 'number');
    if (weapons.length === 0) return undefined;
    // Simple logic: return longest range weapon. Can be improved.
    return weapons.sort((a, b) => (b.range as number) - (a.range as number))[0];
};

const hasHeavyWeapon = (enemy: BattleParticipant): boolean => {
    return enemy.weapons.some(cw => getWeaponById(cw.weaponId)?.traits.includes('heavy'));
}

const findNearestOpponent = (enemy: BattleParticipant, battle: Battle): BattleParticipant | null => {
    const opponents = battle.participants.filter(p => p.type === 'character' && p.status !== 'casualty');

    // For "Protect" mission, the VIP is the highest priority target.
    if (battle.mission.type === 'Protect' && battle.mission.vipId) {
        const vip = opponents.find(p => p.id === battle.mission.vipId);
        if (vip) return vip;
    }
    
    if (opponents.length === 0) return null;
    return opponents.reduce((closest, opp) => 
        distance(enemy.position, opp.position) < distance(enemy.position, closest.position) ? opp : closest
    );
};

const findNearestFriendly = (enemy: BattleParticipant, battle: Battle): BattleParticipant | null => {
    const friends = battle.participants.filter(p => p.type === 'enemy' && p.id !== enemy.id && p.status !== 'casualty');
    if (friends.length === 0) return null;
     return friends.reduce((closest, friend) => 
        distance(enemy.position, friend.position) < distance(enemy.position, closest.position) ? friend : closest
    );
}

// ===================================================================================
//
//  AI BEHAVIOR IMPLEMENTATIONS
//
// ===================================================================================

const getCautiousAction = (enemy: BattleParticipant, battle: Battle): AIActionPlan => {
    const weapon = getBestRangedWeapon(enemy);
    const opponents = battle.participants.filter(p => p.type === 'character' && p.status !== 'casualty');

    // Cautious AI must brawl if forced into it.
    const engagedOpponent = opponents.find(opp => distance(enemy.position, opp.position) <= 1);
    if (engagedOpponent) {
        return { type: 'brawl', targetId: engagedOpponent.id };
    }

    // Find a target that is in Line of Sight and in range
    const potentialTargets = opponents.filter(opp => 
        hasLineOfSight(enemy, opp, battle) && weapon && typeof weapon.range === 'number' && distance(enemy.position, opp.position) <= weapon.range
    );

    // 1. If has a target, shoot from cover
    if (potentialTargets.length > 0) {
        const target = potentialTargets[0]; // Simplification: pick the first one
        const canAim = enemy.actionsRemaining >= 2 && enemy.status !== 'stunned';
        const isAimed = canAim && calculateCover(target, enemy, battle); // Aim if AI is in cover
        return { type: 'shoot', targetId: target.id, weaponId: weapon!.id, isAimed };
    }
    
    // 2. If no target, move to a position in cover that gives a shot, staying > 12 spaces away
    const target = findNearestOpponent(enemy, battle);
    if (target) {
        const reachable = findReachableCells(enemy.position, enemy.stats.speed, battle, enemy.id);
        let bestPos: Position | null = null;
        let bestPath: Position[] | null = null;
        for (const [posKey] of reachable.entries()) {
            const [x, y] = posKey.split(',').map(Number);
            const newPos = {x, y};
            const tempEnemy = { ...enemy, position: newPos };
            if (calculateCover(target, tempEnemy, battle) && 
                hasLineOfSight(tempEnemy, target, battle) &&
                weapon && typeof weapon.range === 'number' && distance(newPos, target.position) <= weapon.range &&
                distance(newPos, target.position) > 12) {
                
                const path = findPath(enemy.position, newPos, battle, enemy.id, true);
                if (path) {
                    bestPos = newPos;
                    bestPath = path;
                    break; // Found a good spot
                }
            }
        }
        if (bestPos && bestPath) {
            return { type: 'move', targetPos: bestPos, path: bestPath };
        }
    }

    // 3. Fallback: Hold position
    return { type: 'hold', reason: 'No safe shot or move available.' };
};

const getAggressiveAction = (enemy: BattleParticipant, battle: Battle): AIActionPlan => {
    const nearestOpponent = findNearestOpponent(enemy, battle);
    if (!nearestOpponent) return { type: 'hold', reason: 'No opponents found' };

    // --- 1. PRIORITIZE BRAWLING ---
    if (distance(enemy.position, nearestOpponent.position) <= 1) {
        return { type: 'brawl', targetId: nearestOpponent.id };
    }

    // --- 2. PRIORITIZE SHOOTING IF CLEAR SHOT ---
    const weapon = getBestRangedWeapon(enemy);
    const distToTarget = distance(enemy.position, nearestOpponent.position);
    if (weapon && typeof weapon.range === 'number' && hasLineOfSight(enemy, nearestOpponent, battle) && distToTarget <= weapon.range) {
        // Aggressive AI doesn't bother with aiming, just shoots.
        return { type: 'shoot', targetId: nearestOpponent.id, weaponId: weapon.id, isAimed: false };
    }

    // --- 3. PRIORITIZE MOVING CLOSER ---
    const path = findPath(enemy.position, nearestOpponent.position, battle, enemy.id);
    if (path && path.length > 1) {
        // Dash if far away or no line of sight to get closer faster.
        const shouldDash = distance(enemy.position, nearestOpponent.position) > 12 || !hasLineOfSight(enemy, nearestOpponent, battle);
        
        const movePoints = shouldDash ? enemy.stats.speed + 2 : enemy.stats.speed;
        
        const targetNodeIndex = Math.min(movePoints, path.length - 1);
        
        // Only move if we can actually get closer
        if (targetNodeIndex > 0) {
            const newPos = path[targetNodeIndex];
            const pathToTarget = path.slice(0, targetNodeIndex + 1);
            return { type: 'move', targetPos: newPos, path: pathToTarget };
        }
    }
    
    // --- 4. FALLBACK ---
    return { type: 'hold', reason: 'Cannot attack or move closer' };
};

const getTacticalAction = (enemy: BattleParticipant, battle: Battle): AIActionPlan => {
    const nearestOpponent = findNearestOpponent(enemy, battle);
    if (!nearestOpponent) return { type: 'hold', reason: 'No opponents found' };

    // Always brawl if engaged.
    if (distance(enemy.position, nearestOpponent.position) <= 1) {
        return { type: 'brawl', targetId: nearestOpponent.id };
    }

    const weapon = getBestRangedWeapon(enemy);

    // --- 1. PRIORITIZE ATTACKING FROM CURRENT POSITION ---

    if (weapon && typeof weapon.range === 'number' && hasLineOfSight(enemy, nearestOpponent, battle) && distance(enemy.position, nearestOpponent.position) <= weapon.range) {
        const canAim = enemy.actionsRemaining >= 2 && enemy.status !== 'stunned';
        const isAimed = canAim && calculateCover(nearestOpponent, enemy, battle); // Aim if in cover
        return { type: 'shoot', targetId: nearestOpponent.id, weaponId: weapon.id, isAimed };
    }

    // --- 2. IF NO ATTACK IS POSSIBLE, CONSIDER MOVING ---

    // Find a position that has a clear shot and is in cover
    const reachable = findReachableCells(enemy.position, enemy.stats.speed, battle, enemy.id);
    let bestCoverPos: Position | null = null;
    let bestCoverPath: Position[] | null = null;
    let shortestPathToCover = Infinity;

    for (const [posKey] of reachable.entries()) {
        const [x, y] = posKey.split(',').map(Number);
        const newPos = {x, y};
        const tempEnemy = { ...enemy, position: newPos };
        // Check for cover against the NEAREST opponent, not necessarily the one we'll shoot
        if (calculateCover(nearestOpponent, tempEnemy, battle) && hasLineOfSight(tempEnemy, nearestOpponent, battle)) {
            const pathToCover = findPath(enemy.position, newPos, battle, enemy.id, true);
            if (pathToCover && pathToCover.length < shortestPathToCover) {
                bestCoverPos = newPos;
                bestCoverPath = pathToCover;
                shortestPathToCover = pathToCover.length;
            }
        }
    }
    if (bestCoverPos && bestCoverPath) {
        return { type: 'move', targetPos: bestCoverPos, path: bestCoverPath };
    }

    // If no cover move is available, consider moving to brawl if it's a good idea
    if (enemy.stats.combat > nearestOpponent.stats.combat) {
        const pathToBrawl = findPath(enemy.position, nearestOpponent.position, battle, enemy.id, false); // Path to adjacent
        if (pathToBrawl && pathToBrawl.length -1 <= enemy.stats.speed) {
             const moveIndex = Math.min(enemy.stats.speed, pathToBrawl.length - 1);
             return { type: 'move', targetPos: pathToBrawl[moveIndex], path: pathToBrawl.slice(0, moveIndex + 1) };
        }
    }
    
    // If nothing else, just advance towards the enemy to a better position, but don't dash.
    const path = findPath(enemy.position, nearestOpponent.position, battle, enemy.id, true);
    if (path && path.length > 1) {
        const moveDistance = enemy.stats.speed;
        const targetIndex = Math.min(moveDistance, path.length - 1);
        return { type: 'move', targetPos: path[targetIndex], path: path.slice(0, targetIndex + 1) };
    }

    // --- 3. FALLBACK ---
    return { type: 'hold', reason: 'No advantageous action available' };
};

const getRampagingAction = (enemy: BattleParticipant, battle: Battle): AIActionPlan => {
    const nearestOpponent = findNearestOpponent(enemy, battle);
    if (!nearestOpponent) return { type: 'hold' };

    // Rampagers with Heavy weapons will stand still and fire
    const weapon = getBestRangedWeapon(enemy);
    if (weapon && typeof weapon.range === 'number' && hasHeavyWeapon(enemy) && hasLineOfSight(enemy, nearestOpponent, battle) && distance(enemy.position, nearestOpponent.position) <= weapon.range) {
        return { type: 'shoot', targetId: nearestOpponent.id, weaponId: weapon.id, isAimed: false };
    }
    
    // Always attempt to enter Brawling combat.
    if (distance(enemy.position, nearestOpponent.position) <= 1) {
        return { type: 'brawl', targetId: nearestOpponent.id };
    }
    
    // Move as fast as possible towards the closest opponent
    const path = findPath(enemy.position, nearestOpponent.position, battle, enemy.id);
    if (path && path.length > 1) {
        const moveDistance = enemy.stats.speed + 2; // Dash
        const newPosIndex = Math.min(moveDistance, path.length - 1);
        const newPos = path[newPosIndex];
        return { type: 'move', targetPos: newPos, path: path.slice(0, newPosIndex + 1) };
    }
    
    return { type: 'hold' };
};

const getDefensiveAction = (enemy: BattleParticipant, battle: Battle): AIActionPlan => {
    const nearestOpponent = findNearestOpponent(enemy, battle);
    if (!nearestOpponent) return { type: 'hold' };

    // Defensive AI must brawl if engaged.
    if (distance(enemy.position, nearestOpponent.position) <= 1) {
        return { type: 'brawl', targetId: nearestOpponent.id };
    }

    // Remain in their initial half of the table
    const homeY = Math.floor(battle.gridSize.height / 2) - 1;
    if (enemy.position.y > homeY) {
        const path = findPath(enemy.position, {x: enemy.position.x, y: homeY}, battle, enemy.id, true);
        if (path) {
            const moveIndex = Math.min(enemy.stats.speed, path.length - 1);
            return { type: 'move', targetPos: path[moveIndex], path: path.slice(0, moveIndex + 1) };
        }
    }
    
    // Stand still to Aim if in Cover with a shot
    const weapon = getBestRangedWeapon(enemy);
    if (weapon && typeof weapon.range === 'number' && calculateCover(nearestOpponent, enemy, battle) && hasLineOfSight(enemy, nearestOpponent, battle)) {
        return { type: 'shoot', targetId: nearestOpponent.id, weaponId: weapon.id, isAimed: true };
    }
    
    // Move to brawl if opponents enter their terrain features and they have equal or better Combat Skill
    const enemyTerrain = battle.terrain.find(t => isPointInTerrain(enemy.position, t));
    if (enemyTerrain && isPointInTerrain(nearestOpponent.position, enemyTerrain) && enemy.stats.combat >= nearestOpponent.stats.combat) {
        if (distance(enemy.position, nearestOpponent.position) <= 1) {
            return { type: 'brawl', targetId: nearestOpponent.id };
        }
        const path = findPath(enemy.position, nearestOpponent.position, battle, enemy.id);
        if (path && path.length > 1) {
            const adjacentIndex = path.length - 2;
            const moveIndex = Math.min(enemy.stats.speed, adjacentIndex);
            return { type: 'move', targetPos: path[moveIndex], path: path.slice(0, moveIndex + 1) };
        }
    }
    
    // Advance to weapons range, but will remain in their initial half of the table, and will remain in Cover
    const reachable = findReachableCells(enemy.position, enemy.stats.speed, battle, enemy.id);
    let bestPos: Position | null = null;
    let bestPath: Position[] | null = null;
    for (const [posKey] of reachable.entries()) {
        const [x,y] = posKey.split(',').map(Number);
        const newPos = {x, y};
        if (newPos.y > battle.gridSize.height / 2) continue; // Stay in own half

        const tempEnemy = { ...enemy, position: newPos };
        if (calculateCover(nearestOpponent, tempEnemy, battle) && hasLineOfSight(tempEnemy, nearestOpponent, battle)) {
            const pathToPos = findPath(enemy.position, newPos, battle, enemy.id, true);
            if (pathToPos) {
                 bestPos = newPos;
                 bestPath = pathToPos;
                 break;
            }
        }
    }
    if (bestPos && bestPath) return { type: 'move', targetPos: bestPos, path: bestPath };
    
    return { type: 'hold' };
};

const getBeastAction = (enemy: BattleParticipant, battle: Battle): AIActionPlan => {
    const nearestOpponent = findNearestOpponent(enemy, battle);
    if (!nearestOpponent) return { type: 'hold' };

    const twoMovesDist = enemy.stats.speed * 2;
    const canBrawlInTwoMoves = distance(enemy.position, nearestOpponent.position) <= twoMovesDist;
    const path = findPath(enemy.position, nearestOpponent.position, battle, enemy.id);

    // If can enter a Brawl within two moves, break cover and go
    if (canBrawlInTwoMoves) {
         if (distance(enemy.position, nearestOpponent.position) <= 1) {
            return { type: 'brawl', targetId: nearestOpponent.id };
         }
         if (path && path.length > 1) {
            const moveIndex = Math.min(enemy.stats.speed + 2, path.length - 1);
            return { type: 'move', targetPos: path[moveIndex], path: path.slice(0, moveIndex + 1) };
         }
    }

    // Otherwise, move to break Line of Sight and maneuver closer.
    const reachable = findReachableCells(enemy.position, enemy.stats.speed + 2, battle, enemy.id);
    let bestPos: Position | null = null;
    let bestPath: Position[] | null = null;
    let bestDist = distance(enemy.position, nearestOpponent.position);

    for (const [posKey] of reachable.entries()) {
         const [x,y] = posKey.split(',').map(Number);
         const newPos = {x,y};
         const tempEnemy = { ...enemy, position: newPos };
         const d = distance(newPos, nearestOpponent.position);
         if (!hasLineOfSight(tempEnemy, nearestOpponent, battle) && d < bestDist) {
            const pathToPos = findPath(enemy.position, newPos, battle, enemy.id, true);
            if (pathToPos) {
              bestPos = newPos;
              bestPath = pathToPos;
              bestDist = d;
            }
         }
    }
    if (bestPos && bestPath) return { type: 'move', targetPos: bestPos, path: bestPath };
    
    // Fallback: move towards target
    if (path && path.length > 1) {
        const moveIndex = Math.min(enemy.stats.speed + 2, path.length - 1);
        return { type: 'move', targetPos: path[moveIndex], path: path.slice(0, moveIndex + 1) };
    }

    return { type: 'hold' };
};

const getGuardianAction = (enemy: BattleParticipant, battle: Battle): AIActionPlan => {
    // Guardian AI must brawl if engaged to protect themselves.
    const nearestOpponentToGuardian = findNearestOpponent(enemy, battle);
    if (nearestOpponentToGuardian && distance(enemy.position, nearestOpponentToGuardian.position) <= 1) {
        return { type: 'brawl', targetId: nearestOpponentToGuardian.id };
    }

    // Simplification: Guardian protects the nearest non-Guardian friendly
    const nonGuardians = battle.participants.filter(p => {
        if (p.type === 'enemy') {
            return p.id !== enemy.id && p.ai !== 'Guardian';
        }
        return false;
    });

    if (nonGuardians.length === 0) return getAggressiveAction(enemy, battle); // Fallback if no leader

    const leader = nonGuardians.reduce((closest, friend) => 
        distance(enemy.position, friend.position) < distance(enemy.position, closest.position) ? friend : closest
    );

    // Must always remain within 3 spaces of that figure
    if (distance(enemy.position, leader.position) > 3) {
        const path = findPath(enemy.position, leader.position, battle, enemy.id);
        if (path && path.length > 1) {
            const moveIndex = Math.min(enemy.stats.speed, path.length - 1);
            return { type: 'move', targetPos: path[moveIndex], path: path.slice(0, moveIndex + 1) };
        }
    }

    // Attack the same targets using the same methods
    const nearestOpponentToLeader = findNearestOpponent(leader, battle);
    if (!nearestOpponentToLeader) return { type: 'hold' };

    if (distance(leader.position, nearestOpponentToLeader.position) <= 1) { // Leader would brawl
        if (distance(enemy.position, nearestOpponentToLeader.position) <= 1) {
            return { type: 'brawl', targetId: nearestOpponentToLeader.id };
        }
        const path = findPath(enemy.position, nearestOpponentToLeader.position, battle, enemy.id);
        if (path && path.length > 1) {
            const adjacentIndex = path.length - 2;
            const moveIndex = Math.min(enemy.stats.speed, adjacentIndex);
            return { type: 'move', targetPos: path[moveIndex], path: path.slice(0, moveIndex + 1) };
        }
    } else { // Leader would shoot
        const weapon = getBestRangedWeapon(enemy);
        if (weapon && typeof weapon.range === 'number' && hasLineOfSight(enemy, nearestOpponentToLeader, battle) && distance(enemy.position, nearestOpponentToLeader.position) <= weapon.range) {
            return { type: 'shoot', targetId: nearestOpponentToLeader.id, weaponId: weapon.id, isAimed: false };
        }
    }

    return { type: 'hold' };
};


// ===================================================================================
//
//  AI DISPATCHER
//
// ===================================================================================

const aiBehaviors: Record<string, (enemy: BattleParticipant, battle: Battle) => AIActionPlan> = {
    'Aggressive': getAggressiveAction,
    'Tactical': getTacticalAction,
    'Cautious': getCautiousAction,
    'Rampaging': getRampagingAction,
    'Defensive': getDefensiveAction,
    'Beast': getBeastAction,
    'Guardian': getGuardianAction,
};

export const getEnemyAIAction = (enemy: BattleParticipant, battle: Battle, isStunned: boolean): AIActionPlan => {
  if (enemy.type !== 'enemy') {
    return { type: 'hold', reason: 'Not an enemy unit.' };
  }

  // --- Overrides ---
  // 1. Frozen in Time
  if (enemy.activeEffects.some(e => e.isFrozenInTime)) {
    return { type: 'hold', reason: 'Frozen in time.' };
  }
  // 2. Panicked: Overrides normal actions.
  const terrifyingEffect = enemy.activeEffects.find(e => e.sourceId === 'terrifying');
  if (terrifyingEffect && terrifyingEffect.fleeFrom && terrifyingEffect.fleeDistance) {
    const fleeToPos = findFleePath(enemy.position, terrifyingEffect.fleeFrom, terrifyingEffect.fleeDistance, battle, enemy.id);
    if (distance(fleeToPos, enemy.position) > 0) {
      const path = findPath(enemy.position, fleeToPos, battle, enemy.id, true);
      return { type: 'move', targetPos: fleeToPos, path: path || [enemy.position, fleeToPos] };
    } else {
      return { type: 'hold', reason: 'log.enemyPhase.fleeTrapped' };
    }
  }
  
  // 3. Prevent Movement
  const preventMoveEffect = enemy.activeEffects.find(e => e.preventMovement);
  if (preventMoveEffect) {
    const plan = aiBehaviors[enemy.ai](enemy, battle);
    if (plan.type === 'move') {
      // If the AI wants to move but can't, it will try to shoot instead, or hold.
      const shootPlan = aiBehaviors[enemy.ai]({...enemy, activeEffects: []}, battle);
      if (shootPlan.type === 'shoot') return shootPlan;
      return { type: 'hold', reason: 'Cannot move due to an effect.' };
    }
    return plan;
  }

  const behaviorFn = aiBehaviors[enemy.ai] || getAggressiveAction;
  
  // Stunned enemies cannot brawl
  if (isStunned) {
      const plan = behaviorFn(enemy, battle);
      if (plan.type === 'brawl') {
          return { type: 'hold', reason: 'Stunned and cannot brawl' };
      }
      return plan;
  }
  
  return behaviorFn(enemy, battle);
};
