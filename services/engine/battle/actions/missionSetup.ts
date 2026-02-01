import { EngineBattleState, BattleEvent, EngineLogEntry, EngineDeps } from '../types';
import type { Position } from '@/types/character';
import type { Battle } from '@/types/battle';
import type { RngState } from '../rng/rng';
import { cloneDeep } from '@/services/utils/cloneDeep';

function isValidPosition(pos: Position, battle: Battle): boolean {
    if (pos.x < 0 || pos.x >= battle.gridSize.width || pos.y < 0 || pos.y >= battle.gridSize.height) return false;
    // Check terrain blockage (simplified collision check)
    const terrain = battle.terrain.find((t) => 
        pos.x >= t.position.x && pos.x < t.position.x + t.size.width &&
        pos.y >= t.position.y && pos.y < t.position.y + t.size.height
    );
    if (terrain && terrain.isImpassable) return false;
    return true;
}

// Deterministic random position
function getRandomPosition(battle: Battle, rng: RngState, deps: EngineDeps): { pos: Position, nextRng: RngState } {
    let currentRng = rng;
    // Try 50 times to find a valid spot
    for (let i = 0; i < 50; i++) {
        const rX = deps.rng.d100(currentRng);
        currentRng = rX.next;
        const x = rX.value % battle.gridSize.width;
        
        const rY = deps.rng.d100(currentRng);
        currentRng = rY.next;
        const y = rY.value % battle.gridSize.height;
        
        const pos = { x, y };
        if (isValidPosition(pos, battle)) {
            return { pos, nextRng: currentRng };
        }
    }
    // Fallback to center if all fails
    return { 
        pos: { x: Math.floor(battle.gridSize.width / 2), y: Math.floor(battle.gridSize.height / 2) }, 
        nextRng: currentRng 
    };
}

export function missionSetup(
    state: EngineBattleState,
    deps: EngineDeps
): { next: EngineBattleState; events: BattleEvent[]; log: EngineLogEntry[] } {
    const { battle, rng } = state;
    let currentRng = rng;
    const log: EngineLogEntry[] = [];
    
    // Deep copy battle.mission to mutate safely
    const nextMission = cloneDeep(battle.mission);
    
    // 1. Eliminate: Target Selection (Parity with setupBattle)
    if (nextMission.type === 'Eliminate' && !nextMission.targetEnemyId) {
        const enemies = battle.participants.filter(p => p.type === 'enemy' && !p.isUnique);
        if (enemies.length > 0) {
            // V1 uses Math.random(). Here we use seeded RNG.
            // This is a divergence unless we mock RNG to match specific outcome or accept difference.
            const r = deps.rng.d100(currentRng);
            currentRng = r.next;
            const index = r.value % enemies.length;
            nextMission.targetEnemyId = enemies[index].id;
            log.push({ key: 'log.mission.eliminate.targetSelected', params: { id: nextMission.targetEnemyId } });
        }
    }

    // 2. Protect: VIP Setup (Parity with setupBattle - partly handled there, but we ensure)
    // setupBattle already creates VIP. If missing, we can't easily create full character here without more services.
    // So we skip creation but maybe validate.

    // 3. Access / Search: Objective Position
    if ((nextMission.type === 'Access' || nextMission.type === 'Search') && !nextMission.objectivePosition) {
        const { pos, nextRng } = getRandomPosition(battle, currentRng, deps);
        currentRng = nextRng;
        nextMission.objectivePosition = pos;
        
        if (nextMission.type === 'Search') {
            nextMission.searchRadius = 1;
            nextMission.searchedPositions = [];
        }
    }

    // 4. Acquire / Deliver: Item Position
    if ((nextMission.type === 'Acquire' || nextMission.type === 'Deliver') && !nextMission.itemPosition && !nextMission.itemCarrierId) {
         const { pos, nextRng } = getRandomPosition(battle, currentRng, deps);
         currentRng = nextRng;
         nextMission.itemPosition = pos;
         
         if (nextMission.type === 'Deliver' && !nextMission.objectivePosition) {
             // Deliver needs destination too
             const destResult = getRandomPosition(battle, currentRng, deps);
             currentRng = destResult.nextRng;
             nextMission.objectivePosition = destResult.pos;
         }
    }
    
    // 5. Patrol: Points
    if (nextMission.type === 'Patrol' && (!nextMission.patrolPoints || nextMission.patrolPoints.length === 0)) {
        const points = [];
        for (let i = 0; i < 3; i++) {
             const { pos, nextRng } = getRandomPosition(battle, currentRng, deps);
             currentRng = nextRng;
             points.push({ id: `patrol_${i}`, visited: false, position: pos });
        }
        nextMission.patrolPoints = points;
    }

    return {
        next: {
            ...state,
            battle: {
                ...battle,
                mission: nextMission
            },
            rng: currentRng
        },
        events: [], // No UI events for setup (internal)
        log
    };
}
