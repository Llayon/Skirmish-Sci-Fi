
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestCharacter, createTestEnemy, createMinimalBattle } from '../../fixtures/battleFixtures';
import { resolveShooting } from '@/services/rules/shooting';
import * as gridUtils from '@/services/gridUtils';

// Mock dependencies
vi.mock('@/services/utils/rolls', () => ({
  rollD6: vi.fn(),
  rollD100: vi.fn(),
}));
import { rollD6 } from '@/services/utils/rolls';

// We need to mock getProtectiveDeviceById to return our test screen
vi.mock('@/services/data/items', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/data/items')>();
  const originalGetProtectiveDeviceById = actual.getProtectiveDeviceById;
  return {
    ...actual,
    getProtectiveDeviceById: vi.fn((id: string | undefined) => {
      if (id === 'TEST_STEALTH_SCREEN') {
        return {
          id: 'TEST_STEALTH_SCREEN',
          type: 'screen',
          traits: ['stealth_gear_long_range_penalty'] // This trait applies -1 hit at >9 range
        };
      }
      return originalGetProtectiveDeviceById(id);
    }),
  };
});

describe('Bug: screen traits affect shooting hit roll', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.spyOn(gridUtils, 'findPushbackPosition').mockReturnValue(null);
    vi.spyOn(gridUtils, 'findDodgePosition').mockReturnValue({ finalPos: { x: 0, y: 0 }, distance: 0 });
  });

  it('stealth screen should apply long-range penalty to attacker hit roll', () => {
    const weapon = { id: 'colony_rifle', range: 24, shots: 1, damage: 0, traits: [] } as const;

    // Distance > 9 for the trait to work
    // Attacker at 0,0. Target at 0,10. Distance is 10.
    const attackerPos = { x: 0, y: 0 };
    const targetPos = { x: 0, y: 10 };

    // Case A: no screen => hit
    // Combat 0. Range 10 (long range) -> TN 5 (open) or 6 (cover).
    // Assuming open: TN 5. Roll 5 -> Hit.
    const attackerA = createTestCharacter({ id: 'atk', position: attackerPos, stats: { combat: 0 } });
    const targetA = createTestEnemy({ id: 'tgt', position: targetPos, stats: { toughness: 6 } });
    const battleA = createMinimalBattle({ participants: [attackerA, targetA] });

    vi.mocked(rollD6).mockReturnValueOnce(5); // Hit (5 >= 5)
    // Damage roll might follow if hit, but we only care about hit/miss here.
    // If it hits, it rolls damage. If it misses, it stops.
    // Let's queue a damage roll just in case to avoid underflow errors, though we won't check it.
    vi.mocked(rollD6).mockReturnValueOnce(1); 

    const logsA = resolveShooting(attackerA, targetA, weapon, battleA, false, false, null);
    expect(logsA.some(l => l.key === 'log.info.hit')).toBe(true);
    expect(logsA.some(l => l.key === 'log.trait.stealthPenalty')).toBe(false);

    // Case B: target has screen with stealth penalty => miss
    // Same roll (5). Penalty -1 -> 4. TN 5 -> Miss.
    const attackerB = createTestCharacter({ id: 'atk', position: attackerPos, stats: { combat: 0 } });
    const targetB = createTestEnemy({ 
      id: 'tgt', 
      position: targetPos, 
      stats: { toughness: 6 }, 
      screen: 'TEST_STEALTH_SCREEN', 
    });
    const battleB = createMinimalBattle({ participants: [attackerB, targetB] });

    vi.mocked(rollD6).mockReturnValueOnce(5); // Base roll
    // No damage roll expected if it misses

    const logsB = resolveShooting(attackerB, targetB, weapon, battleB, false, false, null);

    // Verify trait applied
    expect(logsB.some(l => l.key === 'log.trait.stealthPenalty')).toBe(true);
    // Verify outcome is miss
    expect(logsB.some(l => l.key === 'log.info.miss')).toBe(true);
  });
});
