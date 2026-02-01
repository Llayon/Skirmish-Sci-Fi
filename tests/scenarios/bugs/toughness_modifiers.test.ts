
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

describe('Bug: Toughness modifiers not applied', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.spyOn(gridUtils, 'findPushbackPosition').mockReturnValue(null);
    vi.spyOn(gridUtils, 'findDodgePosition').mockReturnValue({
      finalPos: { x: 0, y: 0 },
      distance: 0,
    });
  });

  it('flex_armor should increase effective toughness when stationary', () => {
    const attacker = createTestCharacter({ id: 'atk', position: { x: 0, y: 0 }, stats: { combat: 1 } });
    
    // Target with flex_armor and base toughness 4
    // flex_armor gives +1 toughness if not moved
    // Effective toughness should be 5
    const target = createTestEnemy({
      id: 'tgt',
      position: { x: 0, y: 5 },
      stats: { toughness: 4 },
      armor: 'flex_armor',
      actionsTaken: { move: false, combat: false, dash: false, interact: false }
    });
    
    const battle = createMinimalBattle({ participants: [attacker, target] });
    
    const weapon: Weapon = { id: 'test_gun', range: 24, shots: 1, damage: 0, traits: [] };
    
    // Roll 5 for hit, roll 4 for damage
    // Damage total: 4 + 0 = 4
    // Base toughness: 4 → lethal (4 >= 4)
    // With flex_armor: effective toughness 5 → non-lethal (4 < 5)
    vi.mocked(rollD6)
      .mockReturnValueOnce(5)  // Hit
      .mockReturnValueOnce(4); // Damage roll

    resolveShooting(attacker, target, weapon, battle, false, false, null);
    
    // With flex_armor bonus, this should NOT be lethal
    expect(target.status).toBe('stunned');
    expect(target.stunTokens).toBe(1);
  });

  it('flex_armor should NOT increase toughness after moving', () => {
    const attacker = createTestCharacter({ id: 'atk', position: { x: 0, y: 0 }, stats: { combat: 1 } });
    
    const target = createTestEnemy({
      id: 'tgt',
      position: { x: 0, y: 5 },
      stats: { toughness: 4 },
      armor: 'flex_armor',
      actionsTaken: { move: true, combat: false, dash: false, interact: false }  // MOVED
    });
    
    const battle = createMinimalBattle({ participants: [attacker, target] });
    
    const weapon: Weapon = { id: 'test_gun', range: 24, shots: 1, damage: 0, traits: [] };
    
    // Same damage (4), but no flex_armor bonus because moved
    // 4 >= 4 → lethal
    vi.mocked(rollD6)
      .mockReturnValueOnce(5)  // Hit
      .mockReturnValueOnce(4); // Damage roll

    resolveShooting(attacker, target, weapon, battle, false, false, null);
    
    // Without flex_armor bonus, this IS lethal
    expect(target.status).toBe('casualty');
  });
});
