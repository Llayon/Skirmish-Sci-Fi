import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestCharacter, createMinimalBattle } from '../../fixtures/battleFixtures';
import { coreResolverMiddleware } from '@/services/application/middleware/coreResolverMiddleware';
import { mockRng } from '../../helpers/mockRng';
import { createMockRngScriptRecorder } from '../../helpers/mockRngRecorder';
import { createBattleSignature } from '../../helpers/battleSignature';
import { createScriptedRngState, d6, d100 } from '@/services/engine/rng/rng';
import { reduceBattle } from '@/services/engine/battle/reduceBattle';
import { CURRENT_ENGINE_SCHEMA_VERSION } from '@/services/engine/battle/types';
import { Battle, PlayerAction, LogEntry } from '@/types';
import type { MiddlewareContext } from '@/services/application/middleware/types';

// V1 Mocks
vi.mock('@/services/utils/rolls', () => ({
  rollD6: vi.fn(),
  rollD100: vi.fn(),
}));
import { rollD6 } from '@/services/utils/rolls';

// Helper to run V1 middleware
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

describe('Parity: Reactions / Initiative', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    mockRng.reset();
  });

  it('Scenario 1: Basic Reaction Roll (Success vs Failure)', () => {
    // 1. Prepare Baseline
    const char1 = createTestCharacter({ id: 'c1', name: 'Quick', position: { x: 0, y: 0 }, stats: { reactions: 1 } });
    const char2 = createTestCharacter({ id: 'c2', name: 'Slow', position: { x: 0, y: 1 }, stats: { reactions: 1 } });
    
    const baselineBattle = createMinimalBattle({ participants: [char1, char2] });
    // Force phase to reaction_roll to match engine expectation
    baselineBattle.phase = 'reaction_roll';

    const battleV1 = structuredClone(baselineBattle);
    const battleV2 = structuredClone(baselineBattle);

    // 2. Run V1 (Record)
    const recorder = createMockRngScriptRecorder(mockRng);
    
    // Mock Rolls:
    // Char 1: 1 (Success <= 1)
    // Char 2: 2 (Fail > 1)
    recorder.queueD6(1, 2);
    vi.mocked(rollD6).mockImplementation(() => recorder.d6());

    const action: PlayerAction = { type: 'roll_initiative', payload: {} };
    runMiddleware(battleV1, action);

    recorder.assertEmpty();
    const script = recorder.getScript();

    // 3. Run V2 (Replay)
    const engineState = { 
        schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION, 
        battle: battleV2, 
        rng: createScriptedRngState(script) 
    };
    
    const result = reduceBattle(engineState, { type: 'ROLL_INITIATIVE' }, { rng: { d6, d100 } });

    // 4. Parity Assertion
    expect(result.next.rng.cursor).toBe(script.length); // All rolls consumed
    
    const sigV1 = createBattleSignature(battleV1);
    const sigV2 = createBattleSignature(result.next.battle);
    
    expect(sigV1).toEqual(sigV2);
  });
});
