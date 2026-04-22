import { describe, it, expect } from 'vitest';
import { generateAggressiveAIPlan } from './aggressiveAI';
import { EngineBattleState, EngineDeps } from '../types';
import { Battle, BattleParticipant } from '@/types';
import { ShootingWeapon } from '../rules/shootingRules';

describe('AI: Aggressive behavior', () => {
    const createParticipant = (id: string, pos: { x: number, y: number }, side: 'player' | 'enemy' = 'enemy', combat: number = 3): BattleParticipant => ({
        id,
        name: id,
        position: pos,
        status: 'active',
        stats: { speed: 4, reactions: 3, combat, toughness: 3, savvy: 3, aim: 0, luck: 0 },
        type: side === 'player' ? 'character' : 'enemy',
        side,
        weapons: [{ id: 'pistol', range: 12, shots: 1, damage: 1, traits: [] } as ShootingWeapon],
        activeEffects: [],
        consumables: [],
        stunTokens: 0,
        actionsRemaining: 2,
        actionsTaken: { move: false, combat: false, dash: false, interact: false },
        currentLuck: 0,
        consumablesUsedThisTurn: 0,
        utilityDevices: []
    } as unknown as BattleParticipant);

    const createState = (participants: BattleParticipant[]): EngineBattleState => ({
        schemaVersion: 1,
        battle: {
            terrain: [],
            participants,
            gridSize: { width: 20, height: 20 }
        } as unknown as Battle,
        rng: { cursor: 0, seed: 123 }
    });

    const deps: EngineDeps = {
        rng: {
            d6: (s) => ({ value: 1, next: s }),
            d100: (s) => ({ value: 50, next: s })
        }
    } as EngineDeps;

    it('Scenario: Aggressive enemy charges and brawls a weaker opponent', () => {
        const actor = createParticipant('Enemy', { x: 0, y: 0 }, 'enemy', 3);
        const player = createParticipant('Player', { x: 2, y: 0 }, 'player', 1);
        const state = createState([actor, player]);

        const { actions } = generateAggressiveAIPlan(state, actor.id, deps);

        expect(actions).toHaveLength(2);
        expect(actions[0]).toMatchObject({ type: 'MOVE_PARTICIPANT', to: { x: 1, y: 0 } });
        expect(actions[1]).toMatchObject({ type: 'BRAWL_ATTACK', targetId: 'Player' });
    });

    it('Regression: Aggressive enemy shoots after moving if target is still out of brawl range', () => {
        const actor = createParticipant('Enemy', { x: 0, y: 0 }, 'enemy', 3);
        const player = createParticipant('Player', { x: 6, y: 0 }, 'player', 3); 
        const state = createState([actor, player]);

        const { actions } = generateAggressiveAIPlan(state, actor.id, deps);

        // Expected: Move to (4,0) then SHOOT
        expect(actions).toHaveLength(2);
        expect(actions[0]).toMatchObject({ type: 'MOVE_PARTICIPANT', to: { x: 4, y: 0 } });
        expect(actions[1]).toMatchObject({ type: 'SHOOT_ATTACK', targetId: 'Player' });
    });

    it('Scenario: Aggressive enemy with distant target moves tactical advance', () => {
        const actor = createParticipant('Enemy', { x: 0, y: 0 }, 'enemy', 3);
        const player = createParticipant('Player', { x: 15, y: 0 }, 'player', 3); 
        const state = createState([actor, player]);

        const { actions } = generateAggressiveAIPlan(state, actor.id, deps);

        expect(actions).toHaveLength(2);
        const moveAction = actions[0];
        if (moveAction.type === 'MOVE_PARTICIPANT') {
            expect(moveAction.to.x).toBeGreaterThanOrEqual(2);
        }
        expect(actions[1]).toMatchObject({ type: 'SHOOT_ATTACK', targetId: 'Player' });
    });
});
