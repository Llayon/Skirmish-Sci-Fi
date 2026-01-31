import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestCharacter, createTestEnemy, createMinimalBattle } from '../../fixtures/battleFixtures';
import { resolveShooting } from '@/services/rules/shooting';
import * as gridUtils from '@/services/gridUtils';
import { mockRng } from '../../helpers/mockRng';
import { createMockRngScriptRecorder } from '../../helpers/mockRngRecorder';
import { createBattleSignature } from '../../helpers/battleSignature';
import { createScriptedRngState, d6, d100 } from '@/services/engine/rng/rng';
import { reduceBattle } from '@/services/engine/battle/reduceBattle';
import { CURRENT_ENGINE_SCHEMA_VERSION } from '@/services/engine/battle/types';
import { Battle, Weapon } from '@/types';

// Helper: Type guard for LogEntry (V1 or generic object)
function isLogEntryObject(x: unknown): x is { key: string; params?: unknown } {
  return typeof x === 'object' && x !== null && 'key' in x;
}

// Helper: Safely extract targetNum from log entry
function getTargetNumFromLogEntry(entry: unknown): number {
  if (!isLogEntryObject(entry)) {
    throw new Error(`Expected log entry object, got: ${JSON.stringify(entry)}`);
  }
  const params = (entry as { params?: unknown }).params;
  if (typeof params !== 'object' || params === null) {
    throw new Error(`Expected params object in log entry, got: ${JSON.stringify(params)}`);
  }
  const targetNum = (params as Record<string, unknown>).targetNum;
  if (typeof targetNum !== 'number') {
    throw new Error(`Expected targetNum to be a number, got: ${targetNum}`);
  }
  return targetNum;
}

// V1 Mocks
vi.mock('@/services/utils/rolls', () => ({
  rollD6: vi.fn(),
  rollD100: vi.fn(),
}));
import { rollD6 } from '@/services/utils/rolls';

describe('Parity: Shooting (Vertical Slice)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    mockRng.reset();
    // We allow findPushbackPosition to run normally to match Engine V2's pure implementation
    // But we mock it to ensure it behaves deterministically and mirrors our V2 logic for this test
    vi.spyOn(gridUtils, 'findPushbackPosition').mockImplementation((targetPos, sourcePos) => {
        const dx = targetPos.x - sourcePos.x;
        const dy = targetPos.y - sourcePos.y;
        // Simple pure pushback logic for test parity
        return { x: targetPos.x + Math.sign(dx), y: targetPos.y + Math.sign(dy) };
    });
  });

  it('Scenario 1: Basic Shooting MISS', () => {
    // 1. Prepare Baseline
    // Attacker: Combat 0
    // Target: Toughness 6 (irrelevant for MISS but good for realism)
    // Distance: 5 hexes
    // Weapon: Range 24, 1 shot
    // TN Calculation: Base 7 (assumed for range/cover/etc defaults) - Combat 0 = 7+? 
    // Wait, standard TN logic: 
    // Base TN usually depends on range bands or fixed rules. 
    // Let's assume simplest case: TN is calculated by BattleDomain. 
    // We just need a roll that FAILS.
    
    const attacker = createTestCharacter({ id: 'atk', name: 'Shooter', position: { x: 0, y: 0 }, stats: { combat: 0 } });
    const target = createTestEnemy({ id: 'tgt', name: 'Target', position: { x: 0, y: 5 }, stats: { toughness: 6 } });
    
    const baselineBattle = createMinimalBattle({ participants: [attacker, target] });
    // Force phase to match action
    baselineBattle.phase = 'quick_actions';

    const battleV1 = structuredClone(baselineBattle);
    const battleV2 = structuredClone(baselineBattle);

    // 2. Run V1 (Record)
    const recorder = createMockRngScriptRecorder(mockRng);
    
    // Mock Rolls:
    // Roll 1: Shooting Roll. 
    // A roll of 1 is usually a miss unless modifiers are huge.
    recorder.queueD6(1); 
    vi.mocked(rollD6).mockImplementation(() => recorder.d6());

    const atk = battleV1.participants.find(p => p.id === 'atk')!;
    const tgt = battleV1.participants.find(p => p.id === 'tgt')!;
    
    const weapon: Weapon = { 
        id: 'test_weapon', 
        range: 24, 
        shots: 1, 
        damage: 0, 
        traits: [],
    };

    const logsV1 = resolveShooting(atk, tgt, weapon, battleV1, false, false, null);

    recorder.assertEmpty();
    const script = recorder.getScript();
    
    // Assert V1 Outcome (Strong Parity)
    const missLog = logsV1.find(l => typeof l !== 'string' && l.key === 'log.info.miss');
    expect(missLog, 'V1 should produce a MISS log').toBeDefined();
    
    const hitLog = logsV1.find(l => typeof l !== 'string' && l.key === 'log.info.hit');
    expect(hitLog, 'V1 should NOT produce a HIT log').toBeUndefined();

    // 3. Run V2 (Replay)
    const engineState = { 
        schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION, 
        battle: battleV2, 
        rng: createScriptedRngState(script) 
    };
    
    // Construct Engine Action
    // Note: We pass the weapon object directly as per vertical slice requirement
    const action = { 
        type: 'SHOOT_ATTACK' as const, 
        attackerId: 'atk', 
        targetId: 'tgt', 
        weapon: {
            id: weapon.id,
            range: weapon.range as number,
            shots: weapon.shots,
            damage: weapon.damage,
            traits: weapon.traits
        }
    };

    const result = reduceBattle(engineState, action, { rng: { d6, d100 } });

    // 4. Parity Assertion
    expect(result.next.rng.cursor).toBe(script.length); // All rolls consumed
    
    const sigV1 = createBattleSignature(battleV1);
    const sigV2 = createBattleSignature(result.next.battle);
    
    expect(sigV1).toEqual(sigV2);
    
    // Check Events
    const resolvedEvent = result.events.find(e => e.type === 'SHOT_RESOLVED');
    expect(resolvedEvent).toBeDefined();
    if (resolvedEvent && resolvedEvent.type === 'SHOT_RESOLVED') {
        expect(resolvedEvent.hit).toBe(false);
        expect(resolvedEvent.roll).toBe(1);
    }

    // Check TN Parity
    const tnLogV1 = logsV1.find(l => typeof l !== 'string' && l.key === 'log.info.targetNumber');
    const tnLogV2 = result.log.find(l => l.key === 'log.info.targetNumber');
    
    expect(tnLogV1).toBeDefined();
    expect(tnLogV2).toBeDefined();
    
    const v1TargetNum = getTargetNumFromLogEntry(tnLogV1);
    const v2TargetNum = getTargetNumFromLogEntry(tnLogV2);
    
    expect(v2TargetNum).toBe(v1TargetNum);
  });

  it('Scenario 2: Basic Shooting HIT but no damage (Applies Stun)', () => {
    // 1. Prepare Baseline
    // Attacker: Combat 5 (Guaranteed Hit)
    // Target: Character with Toughness 6 (no neural optimization, so should be STUNNED)
    
    const attacker = createTestCharacter({ id: 'atk_hit', name: 'Shooter', position: { x: 0, y: 0 }, stats: { combat: 5 } });
    const target = createTestCharacter({ 
        id: 'tgt_hit', 
        name: 'Target', 
        position: { x: 0, y: 5 }, 
        stats: { toughness: 6 },
        // No implants
    });
    
    const baselineBattle = createMinimalBattle({ participants: [attacker, target] });
    baselineBattle.phase = 'quick_actions';

    const battleV1 = structuredClone(baselineBattle);
    const battleV2 = structuredClone(baselineBattle);

    // 2. Run V1 (Record)
    const recorder = createMockRngScriptRecorder(mockRng);
    
    // Mock Rolls:
    // Roll 1: Shooting Roll = 6. (6 + 5 >= TN 3) -> HIT
    // Roll 2: Damage Roll = 1. (1 + 0 < 6) -> Non-lethal
    recorder.queueD6(6); 
    recorder.queueD6(1);
    vi.mocked(rollD6).mockImplementation(() => recorder.d6());

    const atk = battleV1.participants.find(p => p.id === 'atk_hit')!;
    const tgt = battleV1.participants.find(p => p.id === 'tgt_hit')!;
    
    const weapon: Weapon = { 
        id: 'test_weapon', 
        range: 24, 
        shots: 1, 
        damage: 0, 
        traits: [],
    };

    const logsV1 = resolveShooting(atk, tgt, weapon, battleV1, false, false, null);

    recorder.assertEmpty();
    const script = recorder.getScript();
    
    // Assert V1 Outcome
    const hitLog = logsV1.find(l => typeof l !== 'string' && l.key === 'log.info.hit');
    expect(hitLog, 'V1 should produce a HIT log').toBeDefined();
    
    // Verify Stun in V1
    const stunLog = logsV1.find(l => typeof l !== 'string' && l.key === 'log.info.outcomeStunned');
    expect(stunLog, 'V1 should produce a Stun log').toBeDefined();
    
    const targetV1 = battleV1.participants.find(p => p.id === 'tgt_hit');
    expect(targetV1?.stunTokens).toBe(1);
    expect(targetV1?.status).toBe('stunned');
    
    // Ensure position changed (pushback enabled)
    expect(targetV1?.position).toEqual({ x: 0, y: 6 });

    // 3. Run V2 (Replay)
    const engineState = { 
        schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION, 
        battle: battleV2, 
        rng: createScriptedRngState(script) 
    };
    
    const action = { 
        type: 'SHOOT_ATTACK' as const, 
        attackerId: 'atk_hit', 
        targetId: 'tgt_hit', 
        weapon: {
            id: weapon.id,
            range: weapon.range as number,
            shots: weapon.shots,
            damage: weapon.damage,
            traits: weapon.traits
        }
    };

    const result = reduceBattle(engineState, action, { rng: { d6, d100 } });

    // 4. Parity Assertion
    expect(result.next.rng.cursor).toBe(script.length); // All rolls consumed (Hit + Damage)
    
    const sigV1 = createBattleSignature(battleV1);
    const sigV2 = createBattleSignature(result.next.battle);
    
    expect(sigV1).toEqual(sigV2);
    
    // Check Events
    const resolvedEvent = result.events.find(e => e.type === 'SHOT_RESOLVED');
    expect(resolvedEvent).toBeDefined();
    if (resolvedEvent && resolvedEvent.type === 'SHOT_RESOLVED') {
        expect(resolvedEvent.hit).toBe(true);
        expect(resolvedEvent.roll).toBe(6);
    }

    // Check TN Parity
    const tnLogV1 = logsV1.find(l => typeof l !== 'string' && l.key === 'log.info.targetNumber');
    const tnLogV2 = result.log.find(l => l.key === 'log.info.targetNumber');
    
    expect(tnLogV1).toBeDefined();
    expect(tnLogV2).toBeDefined();
    
    const v1TargetNum = getTargetNumFromLogEntry(tnLogV1);
    const v2TargetNum = getTargetNumFromLogEntry(tnLogV2);
    
    expect(v2TargetNum).toBe(v1TargetNum);
  });
});
