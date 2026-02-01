import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMinimalBattle, createTestEnemy } from '../../fixtures/battleFixtures';
import { createBattleSignature } from '../../helpers/battleSignature';
import { reduceBattle } from '@/services/engine/battle/reduceBattle';
import { CURRENT_ENGINE_SCHEMA_VERSION } from '@/services/engine/battle/types';
import { createScriptedRngState, d6, d100 } from '@/services/engine/rng/rng';
import { mockRng } from '../../helpers/mockRng';

describe('Parity: Mission Setup (Eliminate)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockRng.reset();
        vi.spyOn(Math, 'random');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('Scenario: Eliminate Mission - Target Selection', () => {
        // 1. Setup
        const enemy1 = createTestEnemy({ id: 'e1', name: 'Enemy 1', position: { x: 0, y: 0 } });
        const enemy2 = createTestEnemy({ id: 'e2', name: 'Enemy 2', position: { x: 1, y: 0 } });
        
        const baselineBattle = createMinimalBattle({
            participants: [enemy1, enemy2],
            missionType: 'Eliminate'
        });
        
        // Ensure initial state is clean
        baselineBattle.mission.targetEnemyId = undefined;

        const battleV1 = structuredClone(baselineBattle);
        const battleV2 = structuredClone(baselineBattle);

        // 2. V1 Execution (Mimicking setupBattle logic for Eliminate)
        // Logic: const target = potentialTargets[Math.floor(Math.random() * potentialTargets.length)];
        
        // Force Math.random to pick second enemy (index 1)
        // 0.6 * 2 = 1.2 -> floor = 1
        vi.mocked(Math.random).mockReturnValue(0.6);
        
        const potentialTargets = battleV1.participants.filter(p => p.type === 'enemy' && !p.isUnique);
        const targetIndex = Math.floor(Math.random() * potentialTargets.length);
        const target = potentialTargets[targetIndex];
        battleV1.mission.targetEnemyId = target.id;

        // 3. V2 Replay
        // Logic: d100 % length
        // We want index 1. Length is 2.
        // d100 needs to return something where x % 2 == 1. E.g. 1, 3, 5...
        
        const engineState = {
            schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION,
            battle: battleV2,
            rng: createScriptedRngState([{ die: 'd100', value: 1 }]) // d100 returns 1 -> 1 % 2 = 1
        };

        const result = reduceBattle(engineState, { type: 'MISSION_SETUP' }, { rng: { d6, d100 } });

        // 4. Assertions
        expect(result.next.rng.cursor).toBe(1);
        
        // Compare Mission State
        expect(result.next.battle.mission.targetEnemyId).toBe(battleV1.mission.targetEnemyId);
        expect(result.next.battle.mission.targetEnemyId).toBe('e2');
        
        // Compare Full Signature (excluding logs/rng which differ by nature)
        const sigV1 = createBattleSignature(battleV1);
        const sigV2 = createBattleSignature(result.next.battle);
        sigV1.log = [];
        sigV2.log = [];
        
        expect(sigV2).toEqual(sigV1);
    });
});
