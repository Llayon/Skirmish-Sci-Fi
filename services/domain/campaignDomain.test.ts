import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CampaignDomain } from './campaignDomain';
import { Rival } from '../../types';

// Mocking the rollD6 utility
const rolls = vi.hoisted(() => ({
    rollD6: vi.fn(),
}));

vi.mock('../utils/rolls', () => ({
    rollD6: rolls.rollD6,
}));

describe('CampaignDomain', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('calculateUpkeepCost', () => {
    it('should be 0 for crews with less than 4 active members', () => {
      expect(CampaignDomain.calculateUpkeepCost(3, false, false, null, null)).toBe(0);
    });

    it('should be 1 for crews with 4 to 6 active members', () => {
      expect(CampaignDomain.calculateUpkeepCost(4, false, false, null, null)).toBe(1);
      expect(CampaignDomain.calculateUpkeepCost(6, false, false, null, null)).toBe(1);
    });

    it('should increase by 1 for each member beyond 6', () => {
      expect(CampaignDomain.calculateUpkeepCost(7, false, false, null, null)).toBe(2);
      expect(CampaignDomain.calculateUpkeepCost(8, false, false, null, null)).toBe(3);
    });

    it('should be 0 if the crew has ration packs, regardless of size', () => {
      expect(CampaignDomain.calculateUpkeepCost(10, true, false, null, null)).toBe(0);
    });
  });

  describe('resolveRivalActivity', () => {
    const activeRival: Rival = { id: 'rival1', name: 'Zorg', status: 'active' };
    const defeatedRival: Rival = { id: 'rival2', name: 'Grak', status: 'defeated' };

    it('should not track and return null id if there are no active rivals', () => {
      const { tracked, rivalId } = CampaignDomain.resolveRivalActivity(0, [defeatedRival]);
      expect(tracked).toBe(false);
      expect(rivalId).toBeNull();
      expect(rolls.rollD6).not.toHaveBeenCalled();
    });

    it('should track if roll + decoys is less than or equal to rival count', () => {
        rolls.rollD6.mockReturnValue(1); // Roll 1 is <= 1 active rival.
        const { tracked, rivalId } = CampaignDomain.resolveRivalActivity(0, [activeRival]);
        expect(tracked).toBe(true);
        expect(rivalId).toBe('rival1');
    });

    it('should not track if roll + decoys is greater than rival count', () => {
        rolls.rollD6.mockReturnValue(5); // Roll 5 is > 1 active rival.
        const { tracked } = CampaignDomain.resolveRivalActivity(0, [activeRival]);
        expect(tracked).toBe(false);
    });

    it('should factor in decoys to make tracking harder', () => {
        rolls.rollD6.mockReturnValue(1);
        // 1 (roll) + 1 (decoy) = 2. 2 is not <= 1 rival. So not tracked.
        const { tracked } = CampaignDomain.resolveRivalActivity(1, [activeRival]);
        expect(tracked).toBe(false);
    });
  });
});