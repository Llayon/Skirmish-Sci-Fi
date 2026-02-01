
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

describe('Bug: Switch fire respects weapon range', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.spyOn(gridUtils, 'findPushbackPosition').mockReturnValue(null);
    vi.spyOn(gridUtils, 'findDodgePosition').mockReturnValue({
      finalPos: { x: 0, y: 0 },
      distance: 0,
    });
  });

  it('should NOT switch fire to a target out of weapon range', () => {
    const attacker = createTestCharacter({ id: 'atk', position: { x: 0, y: 0 }, stats: { combat: 0 } });
    
    // Target 1: Within range (10)
    const target1 = createTestEnemy({ id: 'tgt1', position: { x: 10, y: 0 }, stats: { toughness: 4 } });
    
    // Target 2: Within 3" of Target 1 (at 12,0 -> dist 2 from tgt1), BUT out of weapon range (12 > 10)
    const target2 = createTestEnemy({ id: 'tgt2', position: { x: 12, y: 0 }, stats: { toughness: 4 } });
    
    const battle = createMinimalBattle({ participants: [attacker, target1, target2] });

    const weapon: Weapon = {
      id: 'test_rifle',
      range: 10,
      shots: 2,
      damage: 0,
      traits: []
    };

    // Rolls for Shot 1 (Target 1):
    // Hit: 5
    // Damage: 6 (Lethal vs Toughness 4) -> Casualty
    vi.mocked(rollD6)
      .mockReturnValueOnce(5)
      .mockReturnValueOnce(6);

    // No rolls for Shot 2 expected because Target 2 is out of range
    
    const logs = resolveShooting(attacker, target1, weapon, battle, false, false, null);

    // Verify Target 1 is down
    expect(target1.status).toBe('casualty');
    expect(logs.some(l => l.key === 'log.info.outcomeCasualty' && l.params?.name === target1.name)).toBe(true);

    // Verify switch fire did NOT happen
    expect(logs.some(l => l.key === 'log.info.targetDownSwitchFire')).toBe(false);
    expect(logs.some(l => l.key === 'log.info.targetEliminatedNoTargets')).toBe(true);

    // Verify Target 2 is untouched
    expect(target2.status).toBe('active');
    expect(target2.stunTokens).toBe(0);

    // Verify only 2 rolls consumed
    expect(vi.mocked(rollD6).mock.calls.length).toBe(2);
  });

  it('should switch fire if target is within range', () => {
    const attacker = createTestCharacter({ id: 'atk', position: { x: 0, y: 0 }, stats: { combat: 0 } });
    
    // Target 1: Within range (10)
    const target1 = createTestEnemy({ id: 'tgt1', position: { x: 8, y: 0 }, stats: { toughness: 4 } });
    
    // Target 2: Within 3" of Target 1 (at 10,0 -> dist 2), AND within range (10)
    const target2 = createTestEnemy({ id: 'tgt2', position: { x: 10, y: 0 }, stats: { toughness: 4 } });
    
    const battle = createMinimalBattle({ participants: [attacker, target1, target2] });

    const weapon: Weapon = {
      id: 'test_rifle',
      range: 10,
      shots: 2,
      damage: 0,
      traits: []
    };

    // Shot 1: Hit + Kill
    // Shot 2: Hit + Kill
    vi.mocked(rollD6)
      .mockReturnValueOnce(5).mockReturnValueOnce(6) // Shot 1
      .mockReturnValueOnce(5).mockReturnValueOnce(6); // Shot 2

    const logs = resolveShooting(attacker, target1, weapon, battle, false, false, null);

    // Both targets down
    expect(target1.status).toBe('casualty');
    expect(target2.status).toBe('casualty');
    
    // Switch fire happened
    expect(logs.some(l => l.key === 'log.info.targetDownSwitchFire')).toBe(true);
  });
});
