
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestCharacter, createTestEnemy, createMinimalBattle } from '../../fixtures/battleFixtures';
import { resolveShooting } from '@/services/rules/shooting';
import { Weapon } from '@/types/items';
import * as gridUtils from '@/services/gridUtils';

vi.mock('@/services/utils/rolls', () => ({
  rollD6: vi.fn(),
  rollD100: vi.fn(),
}));

import { rollD6 } from '@/services/utils/rolls';

describe('Bug: Shallow copy traits mutation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.spyOn(gridUtils, 'findPushbackPosition').mockReturnValue(null);
    vi.spyOn(gridUtils, 'findDodgePosition').mockReturnValue({
      finalPos: { x: 0, y: 0 },
      distance: 0,
    });
  });

  it('should NOT mutate original weapon traits after shot', () => {
    const attacker = createTestCharacter({ id: 'atk', position: { x: 0, y: 0 }, stats: { combat: 1 } });
    const target = createTestEnemy({ id: 'tgt', position: { x: 0, y: 5 }, stats: { toughness: 6 } });
    const battle = createMinimalBattle({ participants: [attacker, target] });
    
    // Weapon with shock_attachment_impact (adds impact at ≤8 range)
    const weapon: Weapon = {
      id: 'test_weapon',
      range: 24,
      shots: 1,
      damage: 0,
      traits: ['shock_attachment_impact']
    };
    
    // Copy original traits for comparison
    const originalTraits = [...weapon.traits];
    
    vi.mocked(rollD6)
      .mockReturnValueOnce(5)  // Hit
      .mockReturnValueOnce(1); // Non-lethal damage

    const logs = resolveShooting(attacker, target, weapon, battle, false, false, null);
    
    // 1) Verify that impact was actually applied (triggered logic)
    expect(logs.some(l => l.key === 'log.trait.impactStun')).toBe(true);
    // Base stun (1) + Impact (1) = 2
    expect(target.stunTokens).toBe(2);

    // 2) Original weapon should NOT be mutated
    expect(weapon.traits).toEqual(originalTraits);
    expect(weapon.traits).not.toContain('impact');
  });

  it('should NOT accumulate traits across multiple shots with same weapon instance', () => {
    // Shared weapon instance across multiple battles/targets
    const weapon: Weapon = {
      id: 'test_weapon',
      range: 24,
      shots: 1,
      damage: 0,
      traits: ['shock_attachment_impact']
    };

    // Run 3 independent shots with fresh targets but same weapon
    for (let i = 0; i < 3; i++) {
        const attacker = createTestCharacter({ id: `atk_${i}`, position: { x: 0, y: 0 }, stats: { combat: 1 } });
        const target = createTestEnemy({ id: `tgt_${i}`, position: { x: 0, y: 5 }, stats: { toughness: 10 } });
        const battle = createMinimalBattle({ participants: [attacker, target] });

        vi.mocked(rollD6)
            .mockReturnValueOnce(5)  // Hit
            .mockReturnValueOnce(1); // Non-lethal damage

        const logs = resolveShooting(attacker, target, weapon, battle, false, false, null);

        // Verify impact applied in THIS shot
        expect(logs.some(l => l.key === 'log.trait.impactStun'), `Iteration ${i}: Impact should apply`).toBe(true);
    }
    
    // Traits should still be just the original one
    expect(weapon.traits.length).toBe(1);
    expect(weapon.traits).toEqual(['shock_attachment_impact']);
  });
});
