import { describe, it, expect, beforeEach } from 'vitest';
import { getEnemyAIAction } from './aiLogic';
import { Battle, BattleParticipant, Terrain } from '../types';

const createMockParticipant = (id: string, x: number, y: number, type: 'character' | 'enemy', ai: any = null): BattleParticipant => ({
    id,
    type,
    ai,
    name: id,
    position: { x, y },
    stats: { reactions: 1, speed: 5, combat: 1, toughness: 3, savvy: 0, luck: 1 },
    status: 'active',
    actionsRemaining: 2,
    actionsTaken: { move: false, combat: false, dash: false, interact: false },
    stunTokens: 0,
    currentLuck: 1,
    activeEffects: [],
    consumablesUsedThisTurn: 0,
    weapons: [{ instanceId: 'w1', weaponId: 'military_rifle' }],
} as BattleParticipant);

describe('Enemy AI Logic', () => {
    let battle: Battle;
    let character: BattleParticipant;

    beforeEach(() => {
        character = createMockParticipant('player1', 10, 10, 'character');
        battle = {
            id: 'test_battle',
            participants: [character],
            gridSize: { width: 20, height: 20 },
            terrain: [],
            mission: { type: 'FightOff', titleKey: '', descriptionKey: '', status: 'in_progress' },
            log: [], round: 1, phase: 'enemy_actions',
        } as unknown as Battle;
    });

    it('Aggressive AI should move towards the nearest opponent', () => {
        const enemy = createMockParticipant('aggro_bot', 1, 1, 'enemy', 'Aggressive');
        // Remove ranged weapons so AI will move instead of shoot
        enemy.weapons = [];
        battle.participants.push(enemy);
        const action = getEnemyAIAction(enemy, battle, false);
        expect(action.type).toBe('move');
        if (action.type === 'move') {
            // It should move closer to (10,10)
            expect(action.targetPos.x).toBeGreaterThan(1);
            expect(action.targetPos.y).toBeGreaterThan(1);
        }
    });

    it('Aggressive AI should shoot if it has a clear shot', () => {
        const enemy = createMockParticipant('aggro_bot', 10, 5, 'enemy', 'Aggressive');
        battle.participants.push(enemy);
        const action = getEnemyAIAction(enemy, battle, false);
        expect(action.type).toBe('shoot');
        if (action.type === 'shoot') {
            expect(action.targetId).toBe('player1');
            expect(action.isAimed).toBe(false);
        }
    });

    it('Cautious AI should aim if it has a shot from cover', () => {
        const enemy = createMockParticipant('cautious_bot', 10, 8, 'enemy', 'Cautious');
        const coverAtPos: Terrain = { id: 'coverAtPos', type: 'Individual', name: 'Barrel', position: { x: 10, y: 8 }, size: { width: 1, height: 1 }, providesCover: true } as Terrain;
        battle.terrain = [coverAtPos];
        battle.participants.push(enemy);

        const shootAction = getEnemyAIAction(enemy, battle, false);
        expect(shootAction.type).toBe('shoot');
        if (shootAction.type === 'shoot') {
            expect(shootAction.isAimed).toBe(true); // Aims because it is in cover
        }
    });
    
    it('Tactical AI should prioritize shooting from cover', () => {
        const enemy = createMockParticipant('tactical_bot', 10, 8, 'enemy', 'Tactical');
        const cover: Terrain = { id: 'cover', type: 'Individual', name: 'Barrel', position: { x: 10, y: 8 }, size: { width: 1, height: 1 }, providesCover: true } as Terrain;
        battle.terrain.push(cover);
        battle.participants.push(enemy);

        const action = getEnemyAIAction(enemy, battle, false);
        expect(action.type).toBe('shoot');
        if (action.type === 'shoot') {
            expect(action.targetId).toBe('player1');
            expect(action.isAimed).toBe(true); // Aims because it's in cover
        }
    });

    it('Any AI should brawl if engaged', () => {
        const enemy = createMockParticipant('brawl_bot', 11, 10, 'enemy', 'Cautious');
        battle.participants.push(enemy);
        const action = getEnemyAIAction(enemy, battle, false);
        expect(action.type).toBe('brawl');
        if (action.type === 'brawl') {
            expect(action.targetId).toBe('player1');
        }
    });
    
    it('Panicked AI should flee', () => {
        const enemy = createMockParticipant('panicked_bot', 9, 9, 'enemy', 'Aggressive');
        enemy.activeEffects.push({
            sourceId: 'terrifying',
            sourceName: 'Fearsome Roar',
            duration: 1,
            fleeFrom: { x: 10, y: 10 },
            fleeDistance: 5,
        });
        battle.participants.push(enemy);
        
        const action = getEnemyAIAction(enemy, battle, false);
        expect(action.type).toBe('move');
        if (action.type === 'move') {
            // It should move away from (10,10)
            expect(action.targetPos.x).toBeLessThan(9);
            expect(action.targetPos.y).toBeLessThan(9);
        }
    });
});