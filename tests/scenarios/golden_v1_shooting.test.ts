
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { createBattleSignature } from '../helpers/battleSignature';
import { createTestCharacter, createTestEnemy, createMinimalBattle, createCoverTerrain } from '../fixtures/battleFixtures';
import { resolveShooting } from '@/services/rules/shooting';
import { calculateCover } from '@/services/rules/visibility';
import { Weapon } from '@/types/items';
import * as gridUtils from '@/services/gridUtils';

// RNG Mock setup
vi.mock('@/services/utils/rolls', () => ({
  rollD6: vi.fn(),
  rollD100: vi.fn(),
}));

import { rollD6 } from '@/services/utils/rolls';

const COLONY_RIFLE: Weapon = { id: 'colony_rifle', range: 24, shots: 1, damage: 0, traits: [] };

describe('Golden V1 Shooting Rules', () => {
  let findDodgePositionSpy: MockInstance;
  
  beforeEach(() => {
    vi.restoreAllMocks(); // Restore original implementations
    vi.clearAllMocks();   // Clear call history

    vi.spyOn(gridUtils, 'findPushbackPosition').mockReturnValue(null);
    findDodgePositionSpy = vi.spyOn(gridUtils, 'findDodgePosition').mockReturnValue({
      finalPos: { x: 0, y: 0 },
      distance: 0,
    });
  });

  describe('Basic Hit/Miss', () => {
    it('Scenario 1: Basic hit -> non-lethal -> stunned +1 token', () => {
      const attacker = createTestCharacter({ id: 'atk', position: { x: 0, y: 0 }, stats: { combat: 1 } });
      const target = createTestEnemy({ id: 'tgt', position: { x: 0, y: 5 }, stats: { toughness: 4 } });
      const battle = createMinimalBattle({ participants: [attacker, target] });

      vi.mocked(rollD6)
        .mockReturnValueOnce(4) // Hit
        .mockReturnValueOnce(1); // Damage

      const resultLogs = resolveShooting(attacker, target, COLONY_RIFLE, battle, false, false, null);
      battle.log.push(...resultLogs);

      const logs = battle.log.map(l => (typeof l === 'string' ? l : l.key));
      expect(logs).toContain('log.info.hit');
      
      expect(target.status).toBe('stunned');
      expect(target.stunTokens).toBe(1);

      expect(createBattleSignature(battle)).toMatchSnapshot();
    });

    it('Scenario 2: Miss -> no state change', () => {
      const attacker = createTestCharacter({ id: 'atk', position: { x: 0, y: 0 }, stats: { combat: 0 } });
      const target = createTestEnemy({ id: 'tgt', position: { x: 0, y: 5 }, stats: { toughness: 4 } });
      const battle = createMinimalBattle({ participants: [attacker, target] });

      vi.mocked(rollD6).mockReturnValueOnce(1); // Miss (1 + 0 < 4)

      const resultLogs = resolveShooting(attacker, target, COLONY_RIFLE, battle, false, false, null);
      battle.log.push(...resultLogs);

      const logs = battle.log.map(l => (typeof l === 'string' ? l : l.key));
      expect(logs).toContain('log.info.miss');
      expect(target.status).toBe('active');

      expect(createBattleSignature(battle)).toMatchSnapshot();
    });
  });

  describe('Modifiers', () => {
    it('Scenario 3: Aimed reroll (1 -> reroll -> hit) + lethal casualty', () => {
      const attacker = createTestCharacter({ id: 'atk', position: { x: 0, y: 0 }, stats: { combat: 1 } });
      const target = createTestEnemy({ id: 'tgt', position: { x: 0, y: 5 }, stats: { toughness: 4 } });
      const battle = createMinimalBattle({ participants: [attacker, target] });

      vi.mocked(rollD6)
        .mockReturnValueOnce(1) // Miss
        .mockReturnValueOnce(5) // Reroll -> Hit (5+1=6)
        .mockReturnValueOnce(6); // Damage (6 > 4 -> Lethal)

      const resultLogs = resolveShooting(attacker, target, COLONY_RIFLE, battle, true, false, null);
      battle.log.push(...resultLogs);

      expect(target.status).toBe('casualty');
      
      const rollInfo = resultLogs.find(l => l.key === 'log.info.rollInfo');
      expect(String(rollInfo?.params?.reroll ?? '')).toContain('Rerolled');

      expect(createBattleSignature(battle)).toMatchSnapshot();
    });

    it('Scenario 4: Cover present', () => {
      const attacker = createTestCharacter({ id: 'atk', position: { x: 0, y: 0 }, stats: { combat: 0 } });
      const target = createTestEnemy({ id: 'tgt', position: { x: 0, y: 10 }, stats: { toughness: 4 } });
      // Cover AT target's position. Per V1 rules, this gives +1 to target number.
      // Ideally cover should be adjacent, but this works for basic mechanic verification.
      
      const battle = createMinimalBattle({ 
          participants: [attacker, target],
          terrain: [createCoverTerrain(target.position)]
      });

      // Explicit assertion for cover presence
      expect(calculateCover(attacker, target, battle)).toBe(true);

      vi.mocked(rollD6).mockReturnValueOnce(4); 
      
      const resultLogs = resolveShooting(attacker, target, COLONY_RIFLE, battle, false, false, null);
      battle.log.push(...resultLogs);

      expect(createBattleSignature(battle)).toMatchSnapshot();
    });

    it('Scenario 5: Heavy penalty after move', () => {
      const attacker = createTestCharacter({ 
          id: 'atk', 
          position: { x: 0, y: 0 }, 
          stats: { combat: 1 },
          actionsTaken: { move: true, combat: false, dash: false, interact: false } 
      });
      const target = createTestEnemy({ id: 'tgt', position: { x: 0, y: 5 }, stats: { toughness: 4 } });
      const battle = createMinimalBattle({ participants: [attacker, target] });
      const heavyWeapon = { ...COLONY_RIFLE, traits: ['heavy'] };

      vi.mocked(rollD6)
        .mockReturnValueOnce(5) // Roll 5. Penalty -1? -> 4. +1 Combat = 5. Hits?
        .mockReturnValueOnce(1); // Damage

      const resultLogs = resolveShooting(attacker, target, heavyWeapon, battle, false, false, null);
      battle.log.push(...resultLogs);

      const logs = battle.log.map(l => (typeof l === 'string' ? l : l.key));
      expect(logs).toContain('log.trait.heavyPenalty');
      expect(logs).toContain('log.info.hit');

      expect(createBattleSignature(battle)).toMatchSnapshot();
    });

    it('Scenario 6a: Snap Shot OFF (distance 7) -> Miss', () => {
      const attacker = createTestCharacter({ id: 'atk', position: { x: 0, y: 0 }, stats: { combat: 0 } });
      const target = createTestEnemy({ id: 'tgt', position: { x: 0, y: 7 }, stats: { toughness: 4 } });
      const battle = createMinimalBattle({ participants: [attacker, target] });
      const snapWeapon = { ...COLONY_RIFLE, traits: ['snap_shot'] };

      vi.mocked(rollD6).mockReturnValueOnce(4); // Miss (A/B designed around roll=4 boundary)

      const resultLogs = resolveShooting(attacker, target, snapWeapon, battle, false, false, null);
      battle.log.push(...resultLogs);

      const logs = battle.log.map(l => (typeof l === 'string' ? l : l.key));
      expect(logs).toContain('log.info.miss');
      expect(createBattleSignature(battle)).toMatchSnapshot();
    });

    it('Scenario 6b: Snap Shot ON (distance 6) -> Hit', () => {
      const attacker = createTestCharacter({ id: 'atk', position: { x: 0, y: 0 }, stats: { combat: 0 } });
      const target = createTestEnemy({ id: 'tgt', position: { x: 0, y: 6 }, stats: { toughness: 4 } });
      const battle = createMinimalBattle({ participants: [attacker, target] });
      const snapWeapon = { ...COLONY_RIFLE, traits: ['snap_shot'] };

      vi.mocked(rollD6)
        .mockReturnValueOnce(4) // 4 + bonus(+1) = 5 -> Hit
        .mockReturnValueOnce(1); // Damage

      const resultLogs = resolveShooting(attacker, target, snapWeapon, battle, false, false, null);
      battle.log.push(...resultLogs);

      const logs = battle.log.map(l => (typeof l === 'string' ? l : l.key));
      expect(logs).toContain('log.trait.snapShotBonus');
      expect(logs).toContain('log.info.hit');
      expect(createBattleSignature(battle)).toMatchSnapshot();
    });
  });

  describe('Damage Resolution', () => {
    it('Scenario 7: Lethal hit -> casualty (no saves)', () => {
      const attacker = createTestCharacter({ id: 'atk', position: { x: 0, y: 0 }, stats: { combat: 1 } });
      const target = createTestEnemy({ id: 'tgt', position: { x: 0, y: 5 }, stats: { toughness: 4 } });
      const battle = createMinimalBattle({ participants: [attacker, target] });

      vi.mocked(rollD6)
        .mockReturnValueOnce(5) // Hit
        .mockReturnValueOnce(6); // Damage 6 > 4 -> Lethal

      const resultLogs = resolveShooting(attacker, target, COLONY_RIFLE, battle, false, false, null);
      battle.log.push(...resultLogs);

      const logs = battle.log.map(l => (typeof l === 'string' ? l : l.key));
      expect(logs).toContain('log.info.lethalHit');
      expect(target.status).toBe('casualty');
      expect(createBattleSignature(battle)).toMatchSnapshot();
    });

    it('Scenario 8: Armor save success downgrades lethal -> stunned', () => {
      const attacker = createTestCharacter({ id: 'atk', position: { x: 0, y: 0 }, stats: { combat: 1 } });
      const target = createTestEnemy({ 
          id: 'tgt', 
          position: { x: 0, y: 5 }, 
          stats: { toughness: 4 },
          armor: 'combat_armor',
          currentLuck: 0
      });
      const battle = createMinimalBattle({ participants: [attacker, target] });

      // Correct order: Hit -> Save -> Damage (if save succeeded, damage roll still happens to check lethality)
      vi.mocked(rollD6)
        .mockReturnValueOnce(5) // Hit
        .mockReturnValueOnce(5) // Save Roll (Assuming 5 is success for combat armor)
        .mockReturnValueOnce(6); // Damage (Lethal)

      const resultLogs = resolveShooting(attacker, target, COLONY_RIFLE, battle, false, false, null);
      battle.log.push(...resultLogs);

      const logs = battle.log.map(l => (typeof l === 'string' ? l : l.key));
      expect(logs).toContain('log.info.saveCheck');
      expect(logs).toContain('log.info.saveDowngradesHit');
      expect(target.status).toBe('stunned');
      expect(target.stunTokens).toBe(0); 
      
      expect(createBattleSignature(battle)).toMatchSnapshot();
    });

    it('Scenario 9: Piercing bypasses armor save', () => {
      const attacker = createTestCharacter({ id: 'atk', position: { x: 0, y: 0 }, stats: { combat: 1 } });
      const target = createTestEnemy({ 
          id: 'tgt', 
          position: { x: 0, y: 5 }, 
          stats: { toughness: 4 },
          armor: 'combat_armor'
      });
      const battle = createMinimalBattle({ participants: [attacker, target] });
      const piercingWeapon = { ...COLONY_RIFLE, traits: ['piercing'] };

      vi.mocked(rollD6)
        .mockReturnValueOnce(5) // Hit
        .mockReturnValueOnce(6); // Damage (Lethal)
        // No save roll expected

      const resultLogs = resolveShooting(attacker, target, piercingWeapon, battle, false, false, null);
      battle.log.push(...resultLogs);

      const logs = battle.log.map(l => (typeof l === 'string' ? l : l.key));
      expect(logs).toContain('log.trait.savePierced');
      expect(logs).not.toContain('log.info.saveCheck');
      expect(target.status).toBe('casualty');

      expect(createBattleSignature(battle)).toMatchSnapshot();
    });

    it('Scenario 10: Stim-pack prevents lethal -> stunned + token', () => {
      const attacker = createTestCharacter({ id: 'atk', position: { x: 0, y: 0 }, stats: { combat: 1 } });
      const target = createTestEnemy({ 
          id: 'tgt', 
          position: { x: 0, y: 5 }, 
          stats: { toughness: 4 },
          consumables: ['stim-pack']
      });
      const battle = createMinimalBattle({ participants: [attacker, target] });

      vi.mocked(rollD6)
        .mockReturnValueOnce(5) // Hit
        .mockReturnValueOnce(6); // Damage (Lethal)

      const resultLogs = resolveShooting(attacker, target, COLONY_RIFLE, battle, false, false, null);
      battle.log.push(...resultLogs);

      const logs = battle.log.map(l => (typeof l === 'string' ? l : l.key));
      expect(logs).toContain('log.info.stimPackSave');
      expect(target.status).toBe('stunned');
      expect(target.stunTokens).toBe(1);
      expect(target.consumables).not.toContain('stim-pack');

      expect(createBattleSignature(battle)).toMatchSnapshot();
    });

    it('Scenario 11: Luck success dodge', () => {
      const attacker = createTestCharacter({ id: 'atk', position: { x: 0, y: 0 }, stats: { combat: 1 } });
      const target = createTestEnemy({ 
          id: 'tgt', 
          position: { x: 0, y: 5 }, 
          stats: { toughness: 4 },
          currentLuck: 1
      });
      const battle = createMinimalBattle({ participants: [attacker, target] });

      findDodgePositionSpy.mockReturnValue({ 
        finalPos: { x: 6, y: 5 }, 
        distance: 1, 
      });

      vi.mocked(rollD6)
        .mockReturnValueOnce(5) // Hit
        .mockReturnValueOnce(4); // Luck roll (4+? Assuming success)

      const resultLogs = resolveShooting(attacker, target, COLONY_RIFLE, battle, false, false, null);
      battle.log.push(...resultLogs);

      const logs = battle.log.map(l => (typeof l === 'string' ? l : l.key));
      expect(logs).toContain('log.info.luckSuccess');
      expect(target.position).toEqual({ x: 6, y: 5 });
      expect(target.currentLuck).toBe(0);

      expect(createBattleSignature(battle)).toMatchSnapshot();
    });

    it('Scenario 12: Stun escalation (3 tokens -> casualty)', () => {
      const attacker = createTestCharacter({ id: 'atk', position: { x: 0, y: 0 }, stats: { combat: 1 } });
      const target = createTestEnemy({ id: 'tgt', position: { x: 0, y: 5 }, stats: { toughness: 6 } });
      const battle = createMinimalBattle({ participants: [attacker, target] });
      const multiShotWeapon = { ...COLONY_RIFLE, shots: 3, damage: 0 };

      vi.mocked(rollD6)
        // Shot 1
        .mockReturnValueOnce(5) // Hit
        .mockReturnValueOnce(1) // Damage 1 vs 6 (Non-lethal) -> Stun 1
        // Shot 2
        .mockReturnValueOnce(5) // Hit
        .mockReturnValueOnce(1) // Damage 1 -> Stun 2
        // Shot 3
        .mockReturnValueOnce(5) // Hit
        .mockReturnValueOnce(1); // Damage 1 -> Stun 3 -> Casualty (Stun Collapse)

      const resultLogs = resolveShooting(attacker, target, multiShotWeapon, battle, false, false, null);
      battle.log.push(...resultLogs);

      const logs = battle.log.map(l => (typeof l === 'string' ? l : l.key));
      expect(logs).toContain('log.info.stunCollapse');
      expect(target.status).toBe('casualty');

      expect(createBattleSignature(battle)).toMatchSnapshot();
    });

    it('Scenario 13: Impact adds +1 stun', () => {
      const attacker = createTestCharacter({ id: 'atk', position: { x: 0, y: 0 }, stats: { combat: 1 } });
      const target = createTestEnemy({ id: 'tgt', position: { x: 0, y: 5 }, stats: { toughness: 6 } });
      const battle = createMinimalBattle({ participants: [attacker, target] });
      const impactWeapon = { ...COLONY_RIFLE, traits: ['impact'] };

      vi.mocked(rollD6)
        .mockReturnValueOnce(5) // Hit
        .mockReturnValueOnce(1); // Damage 1 (Non-lethal)

      const resultLogs = resolveShooting(attacker, target, impactWeapon, battle, false, false, null);
      battle.log.push(...resultLogs);

      const logs = battle.log.map(l => (typeof l === 'string' ? l : l.key));
      expect(logs).toContain('log.trait.impactStun');
      expect(target.stunTokens).toBe(2); // 1 base + 1 impact

      expect(createBattleSignature(battle)).toMatchSnapshot();
    });

    it('Scenario 14: Critical trait baseline', () => {
      const attacker = createTestCharacter({ id: 'atk', position: { x: 0, y: 0 }, stats: { combat: 1 } });
      const target = createTestEnemy({ id: 'tgt', position: { x: 0, y: 5 }, stats: { toughness: 6 } });
      const battle = createMinimalBattle({ participants: [attacker, target] });
      const criticalWeapon = { ...COLONY_RIFLE, traits: ['critical'] };

      vi.mocked(rollD6)
        .mockReturnValueOnce(6) // Hit (Nat 6) -> Critical trigger?
        .mockReturnValueOnce(1) // Damage 1
        .mockReturnValueOnce(1); // Extra roll just in case

      const resultLogs = resolveShooting(attacker, target, criticalWeapon, battle, false, false, null);
      battle.log.push(...resultLogs);

      const logs = battle.log.map(l => (typeof l === 'string' ? l : l.key));
      expect(logs).toContain('log.info.resolvingShot');
      
      // NOTE: This snapshot is expected to change when critical ordering is fixed (PR-0b-4).
      expect(createBattleSignature(battle)).toMatchSnapshot();
    });
  });
});
