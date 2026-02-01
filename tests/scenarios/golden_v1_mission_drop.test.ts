import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestCharacter, createTestEnemy, createMinimalBattle } from '../fixtures/battleFixtures';
import { applyHitAndSaves } from '@/services/rules/damage';
import { checkMissionStatus } from '@/services/rules/mission';
import { mockRng } from '../helpers/mockRng';
import { createBattleSignature } from '../helpers/battleSignature';

vi.mock('@/services/utils/rolls', () => ({
  rollD6: vi.fn(),
  rollD100: vi.fn(),
}));

import { rollD6 } from '@/services/utils/rolls';

describe('Golden V1 Mission Item Drop', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    mockRng.reset();
  });

  describe('Item Drop Logic (Casualty)', () => {
    it('Scenario 1: Enemy carrying item is killed -> Item drops (Roll 2-6)', () => {
      const attacker = createTestCharacter({ id: 'atk', position: { x: 0, y: 0 } });
      const carrier = createTestEnemy({ id: 'carrier', position: { x: 5, y: 5 }, stats: { toughness: 3 } });
      
      const battle = createMinimalBattle({ 
          participants: [attacker, carrier],
          missionType: 'Acquire' 
      });
      // Setup mission state
      battle.mission.itemCarrierId = carrier.id;
      battle.mission.itemPosition = null;

      // Attacker hits carrier with lethal damage
      // Rolls:
      // 1. Luck (if any) -> Carrier has 0 luck
      // 2. Saving Throw (if any) -> Carrier has no armor
      // 3. Damage Roll: Base 6 (auto lethal)
      // 4. Drop Roll: 4 (Item drops)

      mockRng.queueD6(
          6, // Damage Roll (Critical/Lethal)
          4  // Drop Roll (2-6 = Drop)
      );
      vi.mocked(rollD6).mockImplementation(() => mockRng.d6());

      // Use the reference from the battle to ensure updates persist
      const actualCarrier = battle.participants.find(p => p.id === carrier.id)!;
      const actualAttacker = battle.participants.find(p => p.id === attacker.id)!;

      const weapon = { id: 'rifle', range: 24, shots: 1, damage: 0, traits: [] };
      const logs = applyHitAndSaves(battle, actualAttacker, actualCarrier, weapon, true);

      const logKeys = logs.map(l => (typeof l === 'string' ? l : l.key));
      expect(logKeys).toMatchSnapshot();
      expect(createBattleSignature(battle)).toMatchSnapshot();
      
      expect(actualCarrier.status).toBe('casualty');
      expect(battle.mission.itemCarrierId).toBeNull();
      expect(battle.mission.itemPosition).toEqual({ x: 5, y: 5 });
      expect(battle.mission.itemDestroyed).toBeFalsy();

      mockRng.assertEmpty();
    });

    it('Scenario 2: Enemy carrying item is killed -> Item destroyed (Roll 1)', () => {
        const attacker = createTestCharacter({ id: 'atk', position: { x: 0, y: 0 } });
        const carrier = createTestEnemy({ id: 'carrier', position: { x: 5, y: 5 }, stats: { toughness: 3 } });
        
        const battle = createMinimalBattle({ 
            participants: [attacker, carrier],
            missionType: 'Acquire' 
        });
        // Setup mission state
        battle.mission.itemCarrierId = carrier.id;
        battle.mission.itemPosition = null;
  
        // Rolls:
        // 1. Damage Roll: Base 6 (auto lethal)
        // 2. Drop Roll: 1 (Item destroyed)
  
        mockRng.queueD6(
            6, // Damage Roll
            1  // Drop Roll (1 = Destroyed)
        );
        vi.mocked(rollD6).mockImplementation(() => mockRng.d6());
  
        // Use the reference from the battle to ensure updates persist
      const actualCarrier = battle.participants.find(p => p.id === carrier.id)!;
      const actualAttacker = battle.participants.find(p => p.id === attacker.id)!;
  
      const weapon = { id: 'rifle', range: 24, shots: 1, damage: 0, traits: [] };
      const logs = applyHitAndSaves(battle, actualAttacker, actualCarrier, weapon, true);
  
      const logKeys = logs.map(l => (typeof l === 'string' ? l : l.key));
      expect(logKeys).toMatchSnapshot();
      expect(createBattleSignature(battle)).toMatchSnapshot();
      
      expect(actualCarrier.status).toBe('casualty');
      expect(battle.mission.itemCarrierId).toBeNull();
      expect(battle.mission.itemPosition).toBeNull();
      expect(battle.mission.itemDestroyed).toBe(true);
        
        // Verify mission status update
        checkMissionStatus(battle, 'after_action');
        expect(battle.mission.status).toBe('failure');
  
        mockRng.assertEmpty();
      });
  });
});