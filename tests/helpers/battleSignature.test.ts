
import { describe, it, expect } from 'vitest';
import { createBattleSignature } from './battleSignature';
import { createMinimalBattle, createTestCharacter, createTestEnemy } from '../fixtures/battleFixtures';
import { Battle } from '@/types/battle';

describe('battleSignature', () => {
  it('should generate stable signature for identical battles', () => {
    const p1 = createTestCharacter({ id: 'p1', position: { x: 0, y: 0 } });
    const p2 = createTestCharacter({ id: 'p2', position: { x: 0, y: 0 } });
    const battle1 = createMinimalBattle({ participants: [p1, p2] });
    const battle2 = createMinimalBattle({ participants: [p1, p2] }); // Deep copy implied by fresh creation

    const sig1 = createBattleSignature(battle1);
    const sig2 = createBattleSignature(battle2);

    expect(sig1).toEqual(sig2);
  });

  it('should sort participants by ID', () => {
    const p1 = createTestCharacter({ id: 'a', position: { x: 0, y: 0 } });
    const p2 = createTestCharacter({ id: 'b', position: { x: 0, y: 0 } });
    
    // createMinimalBattle sets activeId to first participant's ID
    const battle1 = createMinimalBattle({ participants: [p1, p2] }); // activeId: 'a'
    const battle2 = createMinimalBattle({ participants: [p2, p1] }); // activeId: 'b'

    // We manually align activeId to ensure we only test participant sorting, not battle initialization logic
    battle2.activeParticipantId = 'a';

    expect(createBattleSignature(battle1)).toEqual(createBattleSignature(battle2));
    expect(createBattleSignature(battle1).participants[0].id).toBe('a');
  });

  it('should detect state changes (position)', () => {
    const p1 = createTestCharacter({ id: 'p1', position: { x: 1, y: 1 } });
    const battle1 = createMinimalBattle({ participants: [p1] });
    
    const p1Moved = { ...p1, position: { x: 1, y: 2 } };
    const battle2 = createMinimalBattle({ participants: [p1Moved] });

    expect(createBattleSignature(battle1)).not.toEqual(createBattleSignature(battle2));
  });

  it('should detect state changes (status)', () => {
    const p1 = createTestCharacter({ id: 'p1', position: { x: 0, y: 0 }, status: 'active' });
    const battle1 = createMinimalBattle({ participants: [p1] });
    
    const p1Stunned = { ...p1, status: 'stunned' as const };
    const battle2 = createMinimalBattle({ participants: [p1Stunned] });

    expect(createBattleSignature(battle1)).not.toEqual(createBattleSignature(battle2));
  });

  it('should sort active effects by sourceId and NOT mutate original array', () => {
    const effect1 = { sourceId: 'z_last', sourceName: 'Z', duration: 1 };
    const effect2 = { sourceId: 'a_first', sourceName: 'A', duration: 1 };

    // Create array in unsorted order
    const originalEffects = [effect1, effect2];
    const p1 = createTestCharacter({ id: 'p1', position: { x: 0, y: 0 }, activeEffects: originalEffects });
    const battle = createMinimalBattle({ participants: [p1] });

    const sig = createBattleSignature(battle);
    
    // Check signature is sorted
    const sigEffects = sig.participants[0].effects;
    expect(sigEffects[0]).toContain('a_first');
    expect(sigEffects[1]).toContain('z_last');

    // Check original array is NOT mutated (order preserved)
    expect(p1.activeEffects[0]).toBe(effect1);
    expect(p1.activeEffects[1]).toBe(effect2);
  });

  it('should NOT include sourceName in effect signature (stability)', () => {
     const effect1 = { sourceId: 'buff', sourceName: 'Buff Name V1', duration: 2 };
     const effect2 = { sourceId: 'buff', sourceName: 'Buff Name V2 (Fixed Typo)', duration: 2 };
     
     const p1 = createTestCharacter({ id: 'p1', position: { x: 0, y: 0 }, activeEffects: [effect1] });
     const p2 = createTestCharacter({ id: 'p1', position: { x: 0, y: 0 }, activeEffects: [effect2] });

     const battle1 = createMinimalBattle({ participants: [p1] });
     const battle2 = createMinimalBattle({ participants: [p2] });

     expect(createBattleSignature(battle1)).toEqual(createBattleSignature(battle2));
  });

  it('should ignore log params but capture keys', () => {
    const battle1 = createMinimalBattle({ participants: [] });
    battle1.log = [{ key: 'HIT', params: { roll: 10 } }];

    const battle2 = createMinimalBattle({ participants: [] });
    battle2.log = [{ key: 'HIT', params: { roll: 5 } }]; // Different param

    const battle3 = createMinimalBattle({ participants: [] });
    battle3.log = [{ key: 'MISS', params: { roll: 1 } }]; // Different key

    expect(createBattleSignature(battle1)).toEqual(createBattleSignature(battle2));
    expect(createBattleSignature(battle1)).not.toEqual(createBattleSignature(battle3));
  });

  it('should only include last N log entries', () => {
    const longLog = Array(20).fill(null).map((_, i) => ({ key: `MSG_${i}` }));
    const battle = createMinimalBattle({ participants: [] });
    battle.log = longLog;
    
    const sig = createBattleSignature(battle);
    expect(sig.log.length).toBe(10);
    expect(sig.log[9]).toBe('MSG_19'); // Last one
    expect(sig.log[0]).toBe('MSG_10'); // First of the last 10
  });

  it('should capture significant mission state including type', () => {
    const battle1 = createMinimalBattle({ participants: [] });
    battle1.mission = { ...battle1.mission, type: 'Patrol' };

    const battle2 = createMinimalBattle({ participants: [] });
    battle2.mission = { ...battle2.mission, type: 'Secure' };

    expect(createBattleSignature(battle1)).not.toEqual(createBattleSignature(battle2));
  });

  it('should ignore insignificant mission fields', () => {
    const battle1 = createMinimalBattle({ participants: [] });
    battle1.mission = { ...battle1.mission, descriptionKey: 'desc1' };

    const battle2 = createMinimalBattle({ participants: [] });
    battle2.mission = { ...battle2.mission, descriptionKey: 'desc2' };

    expect(createBattleSignature(battle1)).toEqual(createBattleSignature(battle2));
  });

  it('should sort reaction rolls', () => {
    const battle1 = createMinimalBattle({ participants: [] });
    battle1.reactionRolls = {
      'b_char': { roll: 5, success: true },
      'a_char': { roll: 3, success: false }
    };

    const battle2 = createMinimalBattle({ participants: [] });
    battle2.reactionRolls = {
      'a_char': { roll: 3, success: false },
      'b_char': { roll: 5, success: true }
    };

    expect(createBattleSignature(battle1)).toEqual(createBattleSignature(battle2));
    // Check first element is 'a_char'
    expect(createBattleSignature(battle1).reactionRolls[0]).toContain('a_char');
  });

  it('should NOT include missing keys in mission signature (no noise nulls)', () => {
    const battle = createMinimalBattle({ participants: [] });
    battle.mission = { 
      type: 'Patrol', 
      status: 'in_progress',
      // targetEnemyId is missing
      // itemCarrierId is missing
    } as unknown as Battle['mission'];

    const sig = createBattleSignature(battle);
    
    expect(sig.mission).toHaveProperty('type', 'Patrol');
    expect(sig.mission).toHaveProperty('status', 'in_progress');
    
    // Should NOT have these properties at all (not even undefined)
    expect(sig.mission).not.toHaveProperty('targetEnemyId');
    expect(sig.mission).not.toHaveProperty('itemCarrierId');
    expect(Object.keys(sig.mission)).toEqual(['type', 'status']);
  });

  it('should handle both character and enemy types', () => {
    const char = createTestCharacter({ id: 'c1', position: { x: 0, y: 0 } });
    const enemy = createTestEnemy({ id: 'e1', position: { x: 1, y: 1 } });
    
    const battle = createMinimalBattle({ participants: [char, enemy] });
    const sig = createBattleSignature(battle);
    
    expect(sig.participants[0].type).toBe('character');
    expect(sig.participants[1].type).toBe('enemy');
  });

  it('should include weapon IDs in participant signature', () => {
    const char = createTestCharacter({ 
      id: 'c1', 
      position: { x: 0, y: 0 }, 
      weapons: [ 
        { instanceId: 'w1', weaponId: 'colony_rifle' }, 
        { instanceId: 'w2', weaponId: 'hand_gun' } 
      ] 
    });
    
    const battle = createMinimalBattle({ participants: [char] });
    const sig = createBattleSignature(battle);
    
    expect(sig.participants[0].weapons).toEqual(['colony_rifle', 'hand_gun']);
  });
});
