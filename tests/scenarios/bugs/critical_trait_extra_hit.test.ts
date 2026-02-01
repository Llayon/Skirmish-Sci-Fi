
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestCharacter, createTestEnemy, createMinimalBattle } from '../../fixtures/battleFixtures';
import { resolveShooting } from '@/services/rules/shooting';
import { Weapon } from '@/types/items';
import * as gridUtils from '@/services/gridUtils';

vi.mock('@/services/utils/rolls', () => ({
  rollD6: vi.fn(),
  rollD100: vi.fn(),
}));

import { rollD6 } from '@/services/utils/rolls';

describe('Bug: Critical trait ordering (extra hit on natural 6)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.spyOn(gridUtils, 'findPushbackPosition').mockReturnValue(null);
    vi.spyOn(gridUtils, 'findDodgePosition').mockReturnValue({
      finalPos: { x: 0, y: 0 },
      distance: 0,
    });
  });

  it('should trigger extra hit when rolling natural 6 with critical trait', () => {
    const attacker = createTestCharacter({ id: 'atk', position: { x: 0, y: 0 }, stats: { combat: 0 } });
    // High toughness to ensure survival and verify stun tokens count
    const target = createTestEnemy({ id: 'tgt', position: { x: 0, y: 5 }, stats: { toughness: 6 } });
    const battle = createMinimalBattle({ participants: [attacker, target] });

    const weapon: Weapon = {
      id: 'test_crit_weapon',
      range: 24,
      shots: 1,
      damage: 0,
      traits: ['critical']
    };

    // Sequence of rolls:
    // 1. Hit roll: 6 (Natural 6 -> Critical triggers extra hit)
    // 2. Damage roll #1: 1 (Non-lethal -> 1 stun)
    // 3. Damage roll #2: 1 (Non-lethal -> 1 stun)
    vi.mocked(rollD6)
      .mockReturnValueOnce(6) // Hit (Critical)
      .mockReturnValueOnce(1) // Damage 1
      .mockReturnValueOnce(1); // Damage 2

    const logs = resolveShooting(attacker, target, weapon, battle, false, false, null);

    // Verify critical hit log exists
    expect(logs.some(l => l.key === 'log.trait.criticalHit')).toBe(true);

    // Verify target took 2 hits (2 stuns)
    // 1 base + 1 extra from critical
    expect(target.stunTokens).toBe(2);
    expect(target.status).toBe('stunned');
  });

  it('should NOT trigger extra hit on 6 if it is a MISS (e.g. high TN)', () => {
     // This test ensures we respect isHit check inside the critical hook
     const attacker = createTestCharacter({ id: 'atk', position: { x: 0, y: 0 }, stats: { combat: -10 } }); // Huge penalty
     const target = createTestEnemy({ id: 'tgt', position: { x: 0, y: 5 }, stats: { toughness: 6 } });
     const battle = createMinimalBattle({ participants: [attacker, target] });
 
     const weapon: Weapon = {
       id: 'test_crit_weapon',
       range: 24,
       shots: 1,
       damage: 0,
       traits: ['critical']
     };
 
     // Hit roll: 6 (Natural 6)
     // Bonus: -10
     // Final: -4
     // Target Number: 3 (short range)
     // Result: Miss (-4 < 3)
     vi.mocked(rollD6).mockReturnValueOnce(6);
 
     const logs = resolveShooting(attacker, target, weapon, battle, false, false, null);
 
     // Verify NO critical hit log
     expect(logs.some(l => l.key === 'log.trait.criticalHit')).toBe(false);
     expect(logs.some(l => l.key === 'log.info.miss')).toBe(true);
     
     // Target should have no damage
     expect(target.stunTokens).toBe(0);
  });
});
