import { describe, it, expect } from 'vitest';
import { shootAttack } from './shootAttack';
import { createScriptedRngState, d6, d100 } from '../../rng/rng';
import { CURRENT_ENGINE_SCHEMA_VERSION, type EngineBattleState, type BattleAction, type EngineLogEntry } from '../types';
import { createMinimalBattle, createTestCharacter, createTestEnemy } from '@/tests/fixtures/battleFixtures';

function getTargetNumFromEngineLog(log: EngineLogEntry[]): number {
    const entry = log.find(l => l.key === 'log.info.targetNumber');
    if (!entry) throw new Error('Target number log entry not found');
    const targetNum = entry.params?.targetNum;
    if (typeof targetNum !== 'number') throw new Error(`Expected targetNum to be a number, got: ${targetNum}`);
    return targetNum;
}

describe('shootAttack (Engine Unit)', () => {
    it('Scenario 1: Simple Miss', () => {
        // Setup
        const attacker = createTestCharacter({ id: 'atk', name: 'Shooter', position: { x: 0, y: 0 }, stats: { combat: 0 } });
        const target = createTestEnemy({ id: 'tgt', name: 'Target', position: { x: 0, y: 5 }, stats: { toughness: 3 } });
        const battle = createMinimalBattle({ participants: [attacker, target] });
        battle.phase = 'quick_actions';

        // RNG: Roll 1 (Guaranteed Miss)
        const rng = createScriptedRngState([{ die: 'd6', value: 1 }]);
        const state: EngineBattleState = { schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION, battle, rng };

        const action: Extract<BattleAction, { type: 'SHOOT_ATTACK' }> = {
            type: 'SHOOT_ATTACK',
            attackerId: 'atk',
            targetId: 'tgt',
            weapon: {
                id: 'pistol',
                range: 12,
                shots: 1,
                damage: 1,
                traits: []
            }
        };

        const result = shootAttack(state, action, { rng: { d6, d100 } });

        // Assertions
        expect(result.next.rng.cursor).toBe(1); // 1 die consumed
        expect(result.events).toHaveLength(2);
        
        const declared = result.events.find(e => e.type === 'SHOOT_DECLARED');
        expect(declared).toBeDefined();

        const resolved = result.events.find(e => e.type === 'SHOT_RESOLVED');
        expect(resolved).toBeDefined();
        if (resolved && resolved.type === 'SHOT_RESOLVED') {
            expect(resolved.hit).toBe(false);
            expect(resolved.roll).toBe(1);
        }

        // Verify log contains miss
        const missLog = result.log.find(l => l.key === 'log.info.miss');
        expect(missLog).toBeDefined();

        // Verify Target Number (TN) for Open Shot
        // Dist = 5 (<= 6) => TN 3
        const targetNum = getTargetNumFromEngineLog(result.log);
        expect(targetNum).toBe(3);
    });

    it('Scenario 2: Hit but No Damage (Applies Stun and Pushback)', () => {
        // Setup
        const attacker = createTestCharacter({ id: 'atk', name: 'Shooter', position: {x:0,y:0}, stats: { combat: 5 } });
        const target = createTestEnemy({ id: 'tgt', name: 'Target', position: {x:0,y:5}, stats: { toughness: 6 } });
        const battle = createMinimalBattle({ participants: [attacker, target] });
        battle.phase = 'quick_actions';
        battle.gridSize = { width: 10, height: 10 }; // Ensure room for pushback

        // RNG: 
        // 1. Hit Roll: 6 (Hit)
        // 2. Damage Roll: 1 (Total 1 < 6 -> No Damage)
        const rng = createScriptedRngState([{ die: 'd6', value: 6 }, { die: 'd6', value: 1 }]);
        const state: EngineBattleState = { schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION, battle, rng };

        const action: Extract<BattleAction, { type: 'SHOOT_ATTACK' }> = {
            type: 'SHOOT_ATTACK',
            attackerId: 'atk',
            targetId: 'tgt',
            weapon: {
                id: 'pistol',
                range: 12,
                shots: 1,
                damage: 0,
                traits: []
            }
        };

        const result = shootAttack(state, action, { rng: { d6, d100 } });

        // Assertions
        expect(result.next.rng.cursor).toBe(2); // 2 dice consumed
        
        const resolved = result.events.find(e => e.type === 'SHOT_RESOLVED');
        expect(resolved).toBeDefined();
        if (resolved && resolved.type === 'SHOT_RESOLVED') {
            expect(resolved.hit).toBe(true);
            expect(resolved.roll).toBe(6);
        }

        // Verify log contains hit and damage roll
        expect(result.log.find(l => l.key === 'log.info.hit')).toBeDefined();
        expect(result.log.find(l => l.key === 'log.info.damageRoll')).toBeDefined();
        
        // Verify Stun applied (Stage 4.2C)
        expect(result.log.find(l => l.key === 'log.info.outcomeStunned')).toBeDefined();
        
        const targetResult = result.next.battle.participants.find(p => p.id === 'tgt');
        expect(targetResult?.stunTokens).toBe(1);
        expect(targetResult?.status).toBe('stunned');

        // Verify Pushback applied (Stage 4.2D)
        // Attacker(0,0) -> Target(0,5) -> Pushback(0,6)
        expect(targetResult?.position).toEqual({ x: 0, y: 6 });
        expect(result.log.find(l => l.key === 'log.info.pushedBack')).toBeDefined();
        
        const movedEvent = result.events.find(e => e.type === 'PARTICIPANT_MOVED');
        expect(movedEvent).toEqual(expect.objectContaining({
            type: 'PARTICIPANT_MOVED',
            participantId: 'tgt',
            from: { x: 0, y: 5 },
            to: { x: 0, y: 6 }
        }));
    });

    it('Scenario 2b: Pushback Blocked (Map Bounds)', () => {
        // Setup
        const attacker = createTestCharacter({ id: 'atk', name: 'Shooter', position: {x:0,y:0}, stats: { combat: 5 } });
        const target = createTestEnemy({ id: 'tgt', name: 'Target', position: {x:0,y:9}, stats: { toughness: 6 } });
        // Target is at bottom edge (0,9) on 10x10 map (height=10 => max index 9)
        const battle = createMinimalBattle({ participants: [attacker, target] });
        battle.gridSize = { width: 10, height: 10 };
        battle.phase = 'quick_actions';

        // RNG: Hit, No Damage
        const rng = createScriptedRngState([{ die: 'd6', value: 6 }, { die: 'd6', value: 1 }]);
        const state: EngineBattleState = { schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION, battle, rng };

        const action: Extract<BattleAction, { type: 'SHOOT_ATTACK' }> = {
            type: 'SHOOT_ATTACK',
            attackerId: 'atk',
            targetId: 'tgt',
            weapon: {
                id: 'pistol',
                range: 12,
                shots: 1,
                damage: 0,
                traits: []
            }
        };

        const result = shootAttack(state, action, { rng: { d6, d100 } });

        // Assertions
        const targetResult = result.next.battle.participants.find(p => p.id === 'tgt');
        expect(targetResult?.stunTokens).toBe(1);
        expect(targetResult?.status).toBe('stunned');
        
        // Pushback blocked by map edge -> Position unchanged
        expect(targetResult?.position).toEqual({ x: 0, y: 9 });
        expect(result.log.find(l => l.key === 'log.info.notPushedBack')).toBeDefined();
        expect(result.events.find(e => e.type === 'PARTICIPANT_MOVED')).toBeUndefined();
    });

    it('Scenario 2c: Pushback skipped when gridSize missing (Safety Check)', () => {
        // Setup
        const attacker = createTestCharacter({ id: 'atk', name: 'Shooter', position: {x:0,y:0}, stats: { combat: 5 } });
        const target = createTestEnemy({ id: 'tgt', name: 'Target', position: {x:0,y:5}, stats: { toughness: 6 } });
        const battle = createMinimalBattle({ participants: [attacker, target] });
        
        // Explicitly remove gridSize to simulate old/incomplete state
        // Use structuredClone to ensure we don't affect the original object/fixtures
        const battleNoGrid = structuredClone(battle);
        (battleNoGrid as unknown as { gridSize?: undefined }).gridSize = undefined;
        battleNoGrid.phase = 'quick_actions';

        // RNG: Hit, No Damage
        const rng = createScriptedRngState([{ die: 'd6', value: 6 }, { die: 'd6', value: 1 }]);
        const state: EngineBattleState = { schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION, battle: battleNoGrid, rng };

        const action: Extract<BattleAction, { type: 'SHOOT_ATTACK' }> = {
            type: 'SHOOT_ATTACK',
            attackerId: 'atk',
            targetId: 'tgt',
            weapon: {
                id: 'pistol',
                range: 12,
                shots: 1,
                damage: 0,
                traits: []
            }
        };

        const result = shootAttack(state, action, { rng: { d6, d100 } });

        // Assertions
        const targetResult = result.next.battle.participants.find(p => p.id === 'tgt');
        expect(targetResult?.stunTokens).toBe(1);
        expect(targetResult?.status).toBe('stunned');
        
        // Pushback skipped due to missing gridSize -> Position unchanged
        expect(targetResult?.position).toEqual({ x: 0, y: 5 });
        expect(result.log.find(l => l.key === 'log.info.notPushedBack')).toBeDefined();
        expect(result.events.find(e => e.type === 'PARTICIPANT_MOVED')).toBeUndefined();
    });

    it('Scenario 3: Neural Optimization prevents stun', () => {
        // Setup
        const attacker = createTestCharacter({ id: 'atk', name: 'Shooter', position: {x:0,y:0}, stats: { combat: 5 } });
        const target = createTestCharacter({ 
            id: 'tgt_neural', 
            name: 'Target', 
            position: {x:0,y:5}, 
            stats: { toughness: 6 },
            implants: ['neural_optimization']
        });
        const battle = createMinimalBattle({ participants: [attacker, target] });
        battle.phase = 'quick_actions';

        // RNG: 
        // 1. Hit Roll: 6 (Hit)
        // 2. Damage Roll: 1 (Total 1 < 6 -> No Damage)
        const rng = createScriptedRngState([{ die: 'd6', value: 6 }, { die: 'd6', value: 1 }]);
        const state: EngineBattleState = { schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION, battle, rng };

        const action: Extract<BattleAction, { type: 'SHOOT_ATTACK' }> = {
            type: 'SHOOT_ATTACK',
            attackerId: 'atk',
            targetId: 'tgt_neural',
            weapon: {
                id: 'pistol',
                range: 12,
                shots: 1,
                damage: 0,
                traits: []
            }
        };

        const result = shootAttack(state, action, { rng: { d6, d100 } });

        // Assertions
        expect(result.next.rng.cursor).toBe(2); 
        
        // Verify Neural Optimization log
        expect(result.log.find(l => l.key === 'log.trait.neuralOptimization')).toBeDefined();
        
        // Verify NO Stun applied
        const targetResult = result.next.battle.participants.find(p => p.id === 'tgt_neural');
        expect(targetResult?.stunTokens).toBe(0);
        expect(targetResult?.status).toBe('active');
    });

    it('Scenario 4: Lethal hit sets casualty', () => {
        // Setup
        const attacker = createTestCharacter({ id: 'atk', name: 'Shooter', position: {x:0,y:0}, stats: { combat: 5 } });
        const target = createTestEnemy({ id: 'tgt', name: 'Target', position: {x:0,y:5}, stats: { toughness: 3 } });
        const battle = createMinimalBattle({ participants: [attacker, target] });
        battle.phase = 'quick_actions';

        // RNG: 
        // 1. Hit Roll: 6 (Hit)
        // 2. Damage Roll: 6 (Total 6 >= 3) -> LETHAL
        const rng = createScriptedRngState([{ die: 'd6', value: 6 }, { die: 'd6', value: 6 }]);
        const state: EngineBattleState = { schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION, battle, rng };

        const action: Extract<BattleAction, { type: 'SHOOT_ATTACK' }> = {
            type: 'SHOOT_ATTACK',
            attackerId: 'atk',
            targetId: 'tgt',
            weapon: {
                id: 'rifle',
                range: 24,
                shots: 1,
                damage: 0,
                traits: []
            }
        };

        const result = shootAttack(state, action, { rng: { d6, d100 } });

        // Assertions
        expect(result.next.rng.cursor).toBe(2); 
        
        // Verify Logs
        expect(result.log.find(l => l.key === 'log.info.lethalHit')).toBeDefined();
        expect(result.log.find(l => l.key === 'log.info.outcomeCasualty')).toBeDefined();
        
        // Verify State
        const targetResult = result.next.battle.participants.find(p => p.id === 'tgt');
        expect(targetResult?.status).toBe('casualty');
        expect(targetResult?.actionsRemaining).toBe(0);
        // Position should not change for casualty (unless pushback rule changes later)
        expect(targetResult?.position).toEqual({ x: 0, y: 5 });
    });
});
