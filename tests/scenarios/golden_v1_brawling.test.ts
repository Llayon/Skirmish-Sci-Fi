
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestCharacter, createTestEnemy, createMinimalBattle } from '../fixtures/battleFixtures';
import { resolveBrawling } from '@/services/rules/brawling';
import { mockRng } from '../helpers/mockRng';
import { createBattleSignature } from '../helpers/battleSignature';
import * as gridUtils from '@/services/gridUtils';

vi.mock('@/services/utils/rolls', () => ({
  rollD6: vi.fn(),
  rollD100: vi.fn(),
}));

import { rollD6 } from '@/services/utils/rolls';

describe('Golden V1 Brawl Rules', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    mockRng.reset();
  });

  describe('Basic 1v1 Brawl', () => {
    it('Scenario 1: Attacker wins basic brawl (unarmed)', () => {
      // Use center positions to allow natural pushback
      const attacker = createTestCharacter({ id: 'atk', position: { x: 5, y: 5 }, stats: { combat: 1 } });
      const target = createTestEnemy({ id: 'tgt', position: { x: 5, y: 6 }, stats: { combat: 0 } });
      const battle = createMinimalBattle({ participants: [attacker, target] });

      // Attacker roll: 4 + 1 (combat) = 5
      // Defender roll: 3 + 0 (combat) = 3
      // Winner: Attacker (5 > 3)
      // Damage: Defender takes 1 hit (non-lethal) -> 1 stun
      
      // Exact rolls needed:
      mockRng.queueD6(
          4, // Atk Base
          3, // Def Base
          1  // Damage Roll
      ); 
      vi.mocked(rollD6).mockImplementation(() => mockRng.d6());

      const logs = resolveBrawling(attacker, target, undefined, battle, null);

      const logKeys = logs.map(l => (typeof l === 'string' ? l : l.key));
      expect(logKeys).toMatchSnapshot();
      expect(createBattleSignature(battle)).toMatchSnapshot();
      expect(target.stunTokens).toBe(1);
      
      expect(battle.followUpState).toBeNull();
      
      mockRng.assertEmpty();
    });

    it('Scenario 2: Defender wins basic brawl (unarmed)', () => {
        const attacker = createTestCharacter({ id: 'atk', position: { x: 5, y: 5 }, stats: { combat: 0 } });
        const target = createTestEnemy({ id: 'tgt', position: { x: 5, y: 6 }, stats: { combat: 2 } });
        const battle = createMinimalBattle({ participants: [attacker, target] });
  
        // Attacker roll: 2 + 0 = 2
        // Defender roll: 5 + 2 = 7
        // Winner: Defender (7 > 2)
        // Damage: Attacker takes 1 hit -> 1 stun
        mockRng.queueD6(
            2, // Atk
            5, // Def
            1  // Dmg
        ); 
        vi.mocked(rollD6).mockImplementation(() => mockRng.d6());
  
        const logs = resolveBrawling(attacker, target, undefined, battle, null);
  
        const logKeys = logs.map(l => (typeof l === 'string' ? l : l.key));
        expect(logKeys).toMatchSnapshot();
        expect(createBattleSignature(battle)).toMatchSnapshot();
        expect(attacker.stunTokens).toBe(1); // Now 1 because pushback ends combat
        expect(battle.followUpState).toBeNull();
        
        mockRng.assertEmpty();
      });
  });

  describe('Weapon Traits & Modifiers', () => {
    it('Scenario 3: Melee weapon bonus (+2)', () => {
        const attacker = createTestCharacter({ id: 'atk', position: { x: 5, y: 5 }, stats: { combat: 0 } });
        const target = createTestEnemy({ id: 'tgt', position: { x: 5, y: 6 }, stats: { combat: 0 } });
        
        // Give attacker a melee weapon
        attacker.weapons.push({ instanceId: 'blade_inst', weaponId: 'blade' });
        const battle = createMinimalBattle({ participants: [attacker, target] });

        // Attacker roll: 3 + 2 (melee) = 5
        // Defender roll: 4 + 0 = 4
        // Winner: Attacker
        mockRng.queueD6(
            3, // Atk
            4, // Def
            1  // Dmg
        );
        vi.mocked(rollD6).mockImplementation(() => mockRng.d6());

        const logs = resolveBrawling(attacker, target, 'blade_inst', battle, null);

        const logKeys = logs.map(l => (typeof l === 'string' ? l : l.key));
        expect(logKeys).toMatchSnapshot();
        expect(createBattleSignature(battle)).toMatchSnapshot();
        expect(target.stunTokens).toBe(1);
        
        mockRng.assertEmpty();
    });

    it('Scenario 4: Pistol bonus (+1)', () => {
        const attacker = createTestCharacter({ id: 'atk', position: { x: 5, y: 5 }, stats: { combat: 0 } });
        const target = createTestEnemy({ id: 'tgt', position: { x: 5, y: 6 }, stats: { combat: 0 } });
        
        // Give attacker a pistol
        attacker.weapons.push({ instanceId: 'pistol_inst', weaponId: 'hand_gun' });
        const battle = createMinimalBattle({ participants: [attacker, target] });

        // Attacker roll: 3 + 1 (pistol) = 4
        // Defender roll: 3 + 0 = 3
        // Winner: Attacker
        mockRng.queueD6(
            3, // Atk
            3, // Def
            1  // Dmg
        );
        vi.mocked(rollD6).mockImplementation(() => mockRng.d6());

        const logs = resolveBrawling(attacker, target, 'pistol_inst', battle, null);

        const logKeys = logs.map(l => (typeof l === 'string' ? l : l.key));
        expect(logKeys).toMatchSnapshot();
        expect(createBattleSignature(battle)).toMatchSnapshot();
        
        mockRng.assertEmpty();
    });
  });

  describe('Outnumbered', () => {
      it('Scenario 5: 1v2 Brawl - Attacker vs 2 Enemies', () => {
        const attacker = createTestCharacter({ id: 'atk', position: { x: 5, y: 5 }, stats: { combat: 2 } });
        const enemy1 = createTestEnemy({ id: 'e1', position: { x: 5, y: 4 }, stats: { combat: 0 } });
        const enemy2 = createTestEnemy({ id: 'e2', position: { x: 5, y: 6 }, stats: { combat: 0 } });
        
        const battle = createMinimalBattle({ participants: [attacker, enemy1, enemy2] });

        // Round 1: Attacker vs Enemy1 (Attacker outnumbered -1 penalty)
        // Attacker: 4 + 2 (combat) - 1 (outnumbered) = 5
        // Enemy1: 3 + 0 = 3
        // Winner: Attacker -> Enemy1 takes hit
        
        // Round 2 does not happen because Enemy1 is pushed back and winnerId is null.

        mockRng.queueD6(
            4, 3, 1 // Round 1: Atk, Def, Dmg
        );
        vi.mocked(rollD6).mockImplementation(() => mockRng.d6());

        const logs = resolveBrawling(attacker, enemy1, undefined, battle, null);

        const logKeys = logs.map(l => (typeof l === 'string' ? l : l.key));
        expect(logKeys).toMatchSnapshot();
        expect(createBattleSignature(battle)).toMatchSnapshot();
        expect(enemy1.stunTokens).toBe(1);
        expect(enemy2.stunTokens).toBe(0); // Round 2 skipped
        expect(enemy2.status).toBe('active');
        
        mockRng.assertEmpty();
    });
  });

  describe('Trapped (Corner Case)', () => {
    it('Scenario 6: Defender trapped in corner (cannot be pushed back)', () => {
        // Defender at 0,0 (Corner)
        // Attacker at 0,1
        const attacker = createTestCharacter({ id: 'atk', position: { x: 0, y: 1 }, stats: { combat: 1 } });
        const target = createTestEnemy({ id: 'tgt', position: { x: 0, y: 0 }, stats: { combat: 0 } });
        const battle = createMinimalBattle({ participants: [attacker, target] });

        // Force pushback to fail (trapped)
        vi.spyOn(gridUtils, 'findPushbackPosition').mockReturnValue(null);

        // Attacker wins every round.
        // Defender cannot be pushed back (would go to 0, -1).
        // Combat loop capped at 5 rounds.
        
        // 5 Rounds * 3 rolls (Atk, Def, Dmg) = 15 rolls.
        const rolls = [];
        for (let i = 0; i < 5; i++) {
            rolls.push(4, 3, 1);
        }

        mockRng.queueD6(...rolls);
        vi.mocked(rollD6).mockImplementation(() => mockRng.d6());

        const logs = resolveBrawling(attacker, target, undefined, battle, null);

        const logKeys = logs.map(l => (typeof l === 'string' ? l : l.key));
        expect(logKeys).toMatchSnapshot();
        expect(createBattleSignature(battle)).toMatchSnapshot();
        
        // Check for specific trapped log
        // Baseline: brawl loop capped at 5 to prevent infinite loops
        const hasTrappedLog = logKeys.some(key => key === 'log.info.brawlTrapped' || key === 'log.info.brawlTrappedCannotPush');
        expect(hasTrappedLog).toBe(true);

        // 5 rounds. In rounds 2-5, Defender starts stunned.
        // Rule: "Stunned character adds stun tokens to attacker's roll, then clears stun."
        // So each round: Stun (1) -> Bonus to Atk -> Stun Cleared -> Hit -> Stun (1).
        // At the end of round 5, Defender has 1 stun token.
        expect(target.stunTokens).toBe(1);
        expect(battle.followUpState).toBeNull();
        
        mockRng.assertEmpty();
    });
  });
});
