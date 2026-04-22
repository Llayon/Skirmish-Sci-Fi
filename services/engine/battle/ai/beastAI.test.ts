import { describe, it, expect } from 'vitest';
import { generateBeastAIPlan } from './beastAI';
import { EngineBattleState, EngineDeps } from '../types';
import { Battle, BattleParticipant, Terrain } from '@/types';
import { ShootingWeapon } from '../rules/shootingRules';

describe('beastAI: generateBeastAIPlan', () => {
    const createParticipant = (id: string, pos: { x: number, y: number }, side: 'player' | 'enemy' = 'enemy'): BattleParticipant => ({
        id,
        name: id,
        position: pos,
        status: 'active',
        stats: { speed: 4, reactions: 3, combat: 3, toughness: 3, savvy: 3, aim: 0, luck: 0 },
        type: side === 'player' ? 'character' : 'enemy',
        side,
        weapons: [{ id: 'claws', range: 1, shots: 1, damage: 1, traits: [] } as ShootingWeapon],
        activeEffects: [],
        consumables: [],
        stunTokens: 0,
        actionsRemaining: 2,
        actionsTaken: { move: false, combat: false, dash: false, interact: false },
        currentLuck: 0,
        consumablesUsedThisTurn: 0,
        utilityDevices: []
    } as unknown as BattleParticipant);

    const createState = (participants: BattleParticipant[], terrain: Terrain[] = []): EngineBattleState => ({
        schemaVersion: 1,
        battle: {
            terrain,
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

    it('Scenario 1: Beast stalking from distance (prefer cover)', () => {
        const actor = createParticipant('Beast', { x: 0, y: 0 }, 'enemy');
        const player = createParticipant('Player', { x: 15, y: 0 }, 'player');
        const terrain: Terrain[] = [{ 
            id: 'c1', name: 'Cover', type: 'Obstacle', position: { x: 2, y: 1 }, size: { width: 1, height: 1 }, 
            providesCover: true, blocksLineOfSight: false, isDifficult: false, isImpassable: false
        } as Terrain];
        const state = createState([actor, player], terrain);

        const { actions } = generateBeastAIPlan(state, actor.id, deps);

        expect(actions).toHaveLength(1);
        expect(actions[0]).toMatchObject({ type: 'MOVE_PARTICIPANT', to: { x: 2, y: 1 } });
    });

    it('Scenario 2: Beast pounces when within move distance', () => {
        const actor = createParticipant('Beast', { x: 0, y: 0 }, 'enemy');
        const player = createParticipant('Player', { x: 4, y: 0 }, 'player'); // dist 4, speed 4
        const state = createState([actor, player]);

        const { actions } = generateBeastAIPlan(state, actor.id, deps);

        expect(actions).toHaveLength(2);
        expect(actions[0].type).toBe('MOVE_PARTICIPANT');
        expect(actions[0]).toMatchObject({ to: { x: 3, y: 0 } });
        expect(actions[1]).toMatchObject({ type: 'BRAWL_ATTACK' });
    });

    it('Regression: Stalking Beast shoots if it has ranged weapon and is out of pounce range', () => {
        const actor = createParticipant('Beast', { x: 0, y: 0 }, 'enemy');
        // Give beast a ranged weapon
        actor.weapons = [{ id: 'needle_rifle', range: 18, shots: 1, damage: 1, traits: [] } as ShootingWeapon];
        
        const player = createParticipant('Player', { x: 15, y: 0 }, 'player'); // 15 away, speed 4.
        const state = createState([actor, player]);

        const { actions } = generateBeastAIPlan(state, actor.id, deps);

        // Expected: Move towards target and SHOOT
        expect(actions.some(a => a.type === 'MOVE_PARTICIPANT')).toBe(true);
        expect(actions.some(a => a.type === 'SHOOT_ATTACK')).toBe(true);
    });
});
