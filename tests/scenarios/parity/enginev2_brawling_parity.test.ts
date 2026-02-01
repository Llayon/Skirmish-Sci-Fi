import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestCharacter, createMinimalBattle } from '../../fixtures/battleFixtures';
import { mockRng } from '../../helpers/mockRng';
import { createBattleSignature } from '../../helpers/battleSignature';
import { createScriptedRngState, d6, d100 } from '@/services/engine/rng/rng';
import { reduceBattle } from '@/services/engine/battle/reduceBattle';
import { CURRENT_ENGINE_SCHEMA_VERSION } from '@/services/engine/battle/types';
import { PlayerAction, Battle, LogEntry } from '@/types';
import { coreResolverMiddleware } from '@/services/application/middleware/coreResolverMiddleware';
import type { MiddlewareContext } from '@/services/application/middleware/types';

// V1 Mocks
vi.mock('@/services/utils/rolls', () => ({
  rollD6: vi.fn(),
  rollD100: vi.fn(),
}));
import { rollD6 } from '@/services/utils/rolls';

// Mock Data Items
vi.mock('@/services/data/items', () => ({
  getWeaponById: vi.fn((id) => {
      if (id === 'combat_blade') return { id: 'combat_blade', name: 'Combat Blade', damage: 1, range: 'brawl', traits: ['melee'] };
      return undefined;
  }),
  getConsumableById: vi.fn(),
  getProtectiveDeviceById: vi.fn(),
  getArmorById: vi.fn(),
}));

const runMiddleware = (battle: Battle, action: PlayerAction) => {
    const logEntries: LogEntry[] = [];
    const context: MiddlewareContext = {
        battle,
        action,
        multiplayerRole: null,
        logEntries,
        success: true
    };
    const next = vi.fn();
    coreResolverMiddleware(context, next);
    return { logEntries, next };
};

describe('Parity: Brawling (Vertical Slice)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    mockRng.reset();
  });

  it('Scenario 1: Simple Brawl, Attacker Wins (Non-lethal + Trapped/NoPushback -> Lethal)', () => {
    const weaponId = 'combat_blade'; 
    const weaponInstanceId = 'w1';
    
    const attacker = createTestCharacter({ 
        id: 'c1', name: 'Killer', stats: { combat: 2 }, position: { x: 0, y: 0 },
        weapons: [{ instanceId: weaponInstanceId, weaponId }]
    });
    
    const targetBase = createTestCharacter({ id: 'c2', name: 'Victim', stats: { combat: 0, toughness: 3 }, position: { x: 0, y: 1 } });
    const target = { ...targetBase, type: 'enemy' as const, ai: 'Aggressive' as const };
    
    // Blocker to prevent pushback from (0,1) -> (0,2)
    const blocker = createTestCharacter({ id: 'b1', name: 'Wall', position: { x: 0, y: 2 } });

    const baselineBattle = createMinimalBattle({ participants: [attacker, target, blocker] });
    const battleV1 = structuredClone(baselineBattle);
    const battleV2 = structuredClone(baselineBattle);

    // Standard Recorder with strict queue
    // Round 1: Attacker(5), Defender(3), Damage(1) -> Stunned, Pushback Fails (Trapped)
    // Round 2: Attacker(4), Defender(4), Damage(6) -> Lethal
    mockRng.queueD6(5, 3, 1, 4, 4, 6);
    
    const script: { die: 'd6' | 'd100', value: number }[] = [];
    
    vi.mocked(rollD6).mockImplementation(() => {
        const val = mockRng.d6(); 
        script.push({ die: 'd6', value: val });
        return val;
    });

    const actionV1: PlayerAction = { 
        type: 'brawl', payload: { characterId: 'c1', targetId: 'c2', weaponInstanceId }
    };

    runMiddleware(battleV1, actionV1);
    
    // V1 Assertions
    expect(battleV1.participants.find(p => p.id === 'c2')!.status).toBe('casualty');

    mockRng.assertEmpty();
    expect(script.length).toBe(6);
    
    const engineState = { 
        schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION, 
        battle: battleV2, 
        rng: createScriptedRngState(script) 
    };
    
    const actionV2 = { 
        type: 'BRAWL_ATTACK' as const, 
        attackerId: 'c1', 
        targetId: 'c2', 
        weapon: { id: weaponId, damage: 1, traits: ['melee'] }
    };

    const result = reduceBattle(engineState, actionV2, { rng: { d6, d100 } });

    expect(result.next.rng.cursor).toBe(script.length);
    
    const sigV1 = createBattleSignature(battleV1);
    const sigV2 = createBattleSignature(result.next.battle);
    
    // We expect logs to match now, so we won't clear them
    // But let's verify if log parity is perfect. V1 might have extra logs for "outnumbered" checks (loop 0) or other things.
    // V1 logs:
    // ...
    
    // Check if V2 matches.
    // User Feedback: "Log parity is vacuum" because we don't push to battle.log in V2 or harness.
    // Explicitly clear logs to admit we are testing State Parity only for now.
    sigV1.log = [];
    sigV2.log = [];
    
    expect(sigV2).toEqual(sigV1);
    
    // Ensure no movement events occurred in this scenario (Trapped -> Lethal)
    const movedEvents = result.events.filter((e) => e.type === 'PARTICIPANT_MOVED'); 
    expect(movedEvents.length).toBe(0);
  });

  it('Scenario 2: Brawl with Lethal Damage', () => {
    const weaponId = 'combat_blade'; 
    const weaponInstanceId = 'w1';
    
    const attacker = createTestCharacter({ 
        id: 'c1', name: 'Killer', stats: { combat: 2 }, position: { x: 0, y: 0 },
        weapons: [{ instanceId: weaponInstanceId, weaponId }]
    });
    // Safely create enemy without 'as any'
    // Assuming createTestCharacter returns Character type which might not have 'type' field configurable?
    // Let's create a full object if factory doesn't support it, or use Object.assign.
    // The cleanest way in tests is to use spread + explicit type cast IF factory is limited.
    // But we want to avoid 'as any'.
    // Better: Helper function or spread with specific type.
    const targetBase = createTestCharacter({ id: 'c2', name: 'Victim', stats: { combat: 0, toughness: 3 }, position: { x: 0, y: 1 } });
    const target = { ...targetBase, type: 'enemy' as const, ai: 'Aggressive' as const }; 

    const baselineBattle = createMinimalBattle({ participants: [attacker, target] });
    const battleV1 = structuredClone(baselineBattle);
    const battleV2 = structuredClone(baselineBattle);

    // Standard Recorder with strict queue
    mockRng.queueD6(5, 3, 4); // Attacker(5), Defender(3), Damage(4)
    // Manual recorder used to ensure capture works reliability in this mock environment
    // while strictly adhering to mockRng queue mechanism (no manual overrides).
    const script: { die: 'd6' | 'd100', value: number }[] = [];
    
    // Link V1 to recorder properly
    vi.mocked(rollD6).mockImplementation(() => {
        const val = mockRng.d6(); // Uses queue
        script.push({ die: 'd6', value: val });
        return val;
    });

    const actionV1: PlayerAction = { 
        type: 'brawl', payload: { characterId: 'c1', targetId: 'c2', weaponInstanceId }
    };

    runMiddleware(battleV1, actionV1);
    
    expect(battleV1.participants[1].status).toBe('casualty');

    // Ensure strict RNG usage (no left-over rolls)
    mockRng.assertEmpty();
    // Ensure strict RNG usage (script should match queued length)
    expect(script.length).toBe(3);
    
    const engineState = { 
        schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION, 
        battle: battleV2, 
        rng: createScriptedRngState(script) 
    };
    
    const actionV2 = { 
        type: 'BRAWL_ATTACK' as const, 
        attackerId: 'c1', 
        targetId: 'c2', 
        weapon: { id: weaponId, damage: 1, traits: ['melee'] }
    };

    const result = reduceBattle(engineState, actionV2, { rng: { d6, d100 } });

    expect(result.next.rng.cursor).toBe(script.length);
    
    const sigV1 = createBattleSignature(battleV1);
    const sigV2 = createBattleSignature(result.next.battle);
    sigV1.log = [];
    sigV2.log = [];
    
    expect(sigV2).toEqual(sigV1);
    
    // Ensure no movement events occurred in this scenario (Lethal)
    const movedEvents = result.events.filter((e) => e.type === 'PARTICIPANT_MOVED');
    expect(movedEvents.length).toBe(0);
  });

  it('Scenario 3: Brawl with Successful Pushback (Non-lethal)', () => {
    const weaponId = 'combat_blade'; 
    const weaponInstanceId = 'w1';
    
    const attacker = createTestCharacter({ 
        id: 'c1', name: 'Killer', stats: { combat: 2 }, position: { x: 0, y: 0 },
        weapons: [{ instanceId: weaponInstanceId, weaponId }]
    });
    
    const targetBase = createTestCharacter({ id: 'c2', name: 'Victim', stats: { combat: 0, toughness: 4 }, position: { x: 0, y: 1 } });
    const target = { ...targetBase, type: 'enemy' as const, ai: 'Aggressive' as const };
    
    // No blocker, pushback should succeed

    const baselineBattle = createMinimalBattle({ participants: [attacker, target] });
    const battleV1 = structuredClone(baselineBattle);
    const battleV2 = structuredClone(baselineBattle);

    // Round 1: Attacker(5), Defender(3), Damage(1) -> Stunned, Pushback Succeeds
    mockRng.queueD6(5, 3, 1);
    
    const script: { die: 'd6' | 'd100', value: number }[] = [];
    
    vi.mocked(rollD6).mockImplementation(() => {
        const val = mockRng.d6(); 
        script.push({ die: 'd6', value: val });
        return val;
    });

    const actionV1: PlayerAction = { 
        type: 'brawl', payload: { characterId: 'c1', targetId: 'c2', weaponInstanceId }
    };

    runMiddleware(battleV1, actionV1);
    
    // V1 Assertions
    const victimV1 = battleV1.participants.find(p => p.id === 'c2')!;
    expect(victimV1.status).toBe('stunned');
    expect(victimV1.position).not.toEqual({ x: 0, y: 1 }); // Should have moved

    mockRng.assertEmpty();
    expect(script.length).toBe(3);
    
    const engineState = { 
        schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION, 
        battle: battleV2, 
        rng: createScriptedRngState(script) 
    };
    
    const actionV2 = { 
        type: 'BRAWL_ATTACK' as const, 
        attackerId: 'c1', 
        targetId: 'c2', 
        weapon: { id: weaponId, damage: 1, traits: ['melee'] }
    };

    const result = reduceBattle(engineState, actionV2, { rng: { d6, d100 } });

    expect(result.next.rng.cursor).toBe(script.length);
    
    const sigV1 = createBattleSignature(battleV1);
    const sigV2 = createBattleSignature(result.next.battle);
    
    // Clear logs for state parity
    sigV1.log = [];
    sigV2.log = [];
    
    expect(sigV2).toEqual(sigV1);
    
    // Check Events
    // Expect 1 movement event (pushback succeeded immediately in applyBrawlDamage or end of loop)
    const movedEvents = result.events.filter((e) => e.type === 'PARTICIPANT_MOVED');

    // Should be movement (pushback success)
    expect(movedEvents.length).toBeGreaterThan(0);

    // All movement events should be for the victim
    for (const e of movedEvents) {
        expect(e.participantId).toBe('c2');
        expect(e.from).not.toEqual(e.to);
    }

    // Chain validation: from/to must be consistent
    expect(movedEvents[0].from).toEqual(targetBase.position);
    for (let i = 1; i < movedEvents.length; i++) {
        expect(movedEvents[i].from).toEqual(movedEvents[i - 1].to);
    }

    // Final event should match final state
    const victimV2 = result.next.battle.participants.find((p) => p.id === 'c2');
    expect(victimV2).toBeDefined();
    expect(movedEvents[movedEvents.length - 1].to).toEqual(victimV2!.position);
    
    // Check winner resolution
    const resolveEvent = result.events.find(e => e.type === 'BRAWL_RESOLVED');
    expect(resolveEvent).toBeDefined();
    expect(resolveEvent!.winnerId).toBe('c1');
    expect(resolveEvent!.loserId).toBe('c2');
  });
});
