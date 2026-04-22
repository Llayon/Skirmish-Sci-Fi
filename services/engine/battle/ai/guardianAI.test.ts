import { describe, it, expect } from 'vitest';
import { generateGuardianAIPlan } from './guardianAI';
import { EngineBattleState, EngineDeps } from '../types';
import { Battle, BattleParticipant } from '@/types';
import { ShootingWeapon } from '../rules/shootingRules';

describe('guardianAI: generateGuardianAIPlan', () => {
    const createParticipant = (id: string, pos: { x: number, y: number }, side: 'player' | 'enemy' = 'enemy'): BattleParticipant => ({
        id,
        name: id,
        position: pos,
        status: 'active',
        stats: { speed: 4, reactions: 3, combat: 3, toughness: 3, savvy: 3, aim: 0, luck: 0 },
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

    it('Scenario 1: Guardian follows Lead when out of tether range', () => {
        const lead = createParticipant('Master', { x: 0, y: 0 }, 'enemy');
        const actor = createParticipant('Drone', { x: 10, y: 0 }, 'enemy');
        const player = createParticipant('Player', { x: 0, y: 5 }, 'player');
        const state = createState([lead, actor, player]);

        const { actions } = generateGuardianAIPlan(state, actor.id, deps, lead.id);

        expect(actions.some(a => a.type === 'MOVE_PARTICIPANT')).toBe(true);
        const moveAction = actions.find(a => a.type === 'MOVE_PARTICIPANT');
        if (moveAction && moveAction.type === 'MOVE_PARTICIPANT') {
            expect(moveAction.to.x).toBeLessThan(10);
        }
    });

    it('Scenario 2: Guardian shoots at target near Lead', () => {
        const lead = createParticipant('Master', { x: 0, y: 0 }, 'enemy');
        const actor = createParticipant('Drone', { x: 1, y: 1 }, 'enemy'); // Already close
        const player = createParticipant('Player', { x: 0, y: 5 }, 'player');
        const state = createState([lead, actor, player]);

        const { actions } = generateGuardianAIPlan(state, actor.id, deps, lead.id);

        expect(actions).toHaveLength(1);
        expect(actions[0]).toMatchObject({ type: 'SHOOT_ATTACK', targetId: 'Player' });
    });

    it('Scenario 3: Guardian mimics lead combat method (Brawl)', () => {
        const lead = createParticipant('Master', { x: 5, y: 5 }, 'enemy');
        lead.actionsTaken.combat = true;
        lead.actionsTaken.move = false;

        const actor = createParticipant('Drone', { x: 5, y: 6 }, 'enemy'); // Adjacent to lead
        const player = createParticipant('Player', { x: 5, y: 7 }, 'player'); // Adjacent to drone
        const state = createState([lead, actor, player]);

        const { actions } = generateGuardianAIPlan(state, actor.id, deps, lead.id);

        expect(actions.some(a => a.type === 'BRAWL_ATTACK')).toBe(true);
    });
});
