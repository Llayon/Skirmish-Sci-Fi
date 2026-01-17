import { describe, it, expect, vi } from 'vitest';
import { BattleDomain } from './battleDomain';
import { BattleParticipant, ActiveEffect } from '../../types';

// Mock getProtectiveDeviceById
vi.mock('../data/items', async () => {
    const actual = await vi.importActual('../data/items');
    return {
        ...actual,
        getProtectiveDeviceById: (id: string) => {
            if (id === 'battle_dress') return { id: 'battle_dress', type: 'armor', traits: ['battle_dress_reactions'] };
            return undefined;
        }
    };
});

const createMockParticipant = (id: string, x: number, y: number, type: 'character' | 'enemy' = 'character'): BattleParticipant => ({
    id,
    type,
    name: id,
    position: { x, y },
    stats: { reactions: 1, speed: 5, combat: 1, toughness: 3, savvy: 0, luck: 1 },
    status: 'active',
    activeEffects: [],
    // Fill in other required properties with defaults
} as BattleParticipant);

describe('BattleDomain', () => {
    describe('calculateEffectiveStats', () => {
        it('should return base stats if there are no effects or gear', () => {
            const char = createMockParticipant('char1', 0, 0);
            const stats = BattleDomain.calculateEffectiveStats(char);
            expect(stats).toEqual(char.stats);
        });

        it('should apply stat modifiers from active effects', () => {
            const char = createMockParticipant('char1', 0, 0);
            const effect: ActiveEffect = {
                sourceId: 'combat_serum',
                sourceName: 'Combat Serum',
                duration: 1,
                statModifiers: { combat: 1, reactions: 1 }
            };
            char.activeEffects.push(effect);

            const stats = BattleDomain.calculateEffectiveStats(char);
            expect(stats.combat).toBe(2); // 1 (base) + 1 (effect)
            expect(stats.reactions).toBe(2); // 1 (base) + 1 (effect)
        });

        it('should apply gear bonuses like battle dress', () => {
            const char = createMockParticipant('char1', 0, 0);
            char.armor = 'battle_dress';

            const stats = BattleDomain.calculateEffectiveStats(char);
            expect(stats.reactions).toBe(2); // 1 (base) + 1 (gear)
        });

        it('should cap reactions at 4 from battle dress', () => {
            const char = createMockParticipant('char1', 0, 0);
            char.stats.reactions = 4;
            char.armor = 'battle_dress';

            const stats = BattleDomain.calculateEffectiveStats(char);
            expect(stats.reactions).toBe(4);
        });
        
        it('should NOT apply active effects when context is reaction_roll', () => {
            const char = createMockParticipant('char1', 0, 0);
            const effect: ActiveEffect = {
                sourceId: 'combat_serum',
                sourceName: 'Combat Serum',
                duration: 1,
                statModifiers: { combat: 1, reactions: 1 }
            };
            char.activeEffects.push(effect);
            
            const stats = BattleDomain.calculateEffectiveStats(char, 'reaction_roll');
            expect(stats.reactions).toBe(1); // Should ignore the +1 from the effect
        });
    });

    describe('isEngaged', () => {
        it('should be true if a participant is adjacent to an opponent', () => {
            const char = createMockParticipant('char1', 5, 5, 'character');
            const enemy = createMockParticipant('enemy1', 5, 6, 'enemy');
            const participants = [char, enemy];
            expect(BattleDomain.isEngaged(char, participants, null)).toBe(true);
        });

        it('should be false if adjacent to a friendly unit', () => {
            const char1 = createMockParticipant('char1', 5, 5, 'character');
            const char2 = createMockParticipant('char2', 5, 6, 'character');
            const participants = [char1, char2];
            expect(BattleDomain.isEngaged(char1, participants, null)).toBe(false);
        });

        it('should be false if not adjacent to any unit', () => {
            const char = createMockParticipant('char1', 5, 5, 'character');
            const enemy = createMockParticipant('enemy1', 8, 8, 'enemy');
            const participants = [char, enemy];
            expect(BattleDomain.isEngaged(char, participants, null)).toBe(false);
        });
        
        it('should ignore casualties', () => {
            const char = createMockParticipant('char1', 5, 5, 'character');
            const enemy = createMockParticipant('enemy1', 5, 6, 'enemy');
            (enemy as any).status = 'casualty';
            const participants = [char, enemy];
            expect(BattleDomain.isEngaged(char, participants, null)).toBe(false);
        });
    });
});