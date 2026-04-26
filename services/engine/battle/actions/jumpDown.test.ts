import { describe, it, expect } from 'vitest';
import { jumpDown } from './jumpDown';
import { createScriptedRngState, d6, d100 } from '../../rng/rng';
import { CURRENT_ENGINE_SCHEMA_VERSION, type EngineBattleState, type BattleAction } from '../types';
import { createMinimalBattle, createTestCharacter } from '@/tests/fixtures/battleFixtures';
import type { Terrain } from '@/types/battle';

const roofAt = (x: number, y: number, w: number, h: number, baseElevation = 2): Terrain => ({
    id: `roof_${x}_${y}`,
    name: 'Building Roof',
    type: 'Area',
    position: { x, y },
    size: { width: w, height: h },
    isDifficult: false,
    providesCover: false,
    blocksLineOfSight: false,
    isImpassable: false,
    baseElevation,
    objectHeight: 0,
});

function setup(opts: { fromZ: number; toughness?: number; rngScript?: { die: 'd6'; value: 1|2|3|4|5|6 }[] }) {
    const character = createTestCharacter({
        id: 'jumper',
        position: { x: 1, y: 1 },
        stats: { toughness: opts.toughness ?? 4 },
    });
    const terrain = opts.fromZ > 0 ? [roofAt(0, 0, 4, 4, opts.fromZ)] : [];
    const battle = createMinimalBattle({ participants: [character], terrain });
    const rng = createScriptedRngState(opts.rngScript ?? []);
    const state: EngineBattleState = { schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION, battle, rng };
    return state;
}

describe('jumpDown action', () => {
    it('moves participant to destination and rng untouched on safe drop (<3)', () => {
        // fromZ=2, toZ=0, drop=2 — below threshold, no fall damage roll.
        const state = setup({ fromZ: 2 });
        const action: Extract<BattleAction, { type: 'JUMP_DOWN' }> = {
            type: 'JUMP_DOWN', participantId: 'jumper', to: { x: 5, y: 1 },
        };
        const { next, events, log } = jumpDown(state, action, { rng: { d6, d100 } });
        expect(next.battle.participants[0].position).toEqual({ x: 5, y: 1 });
        expect(next.battle.participants[0].status).toBe('active');
        expect(events.find(e => e.type === 'PARTICIPANT_MOVED')).toBeDefined();
        expect(events.find(e => e.type === 'FALL_DAMAGE_RESOLVED')).toBeUndefined();
        expect(log.find(l => l.key === 'log.action.jumpDown')).toBeDefined();
        expect(log.find(l => l.key === 'log.info.fallDamage')).toBeUndefined();
    });

    it('drop ≥ 3 with low roll stuns when damage < toughness', () => {
        // fromZ=3, drop=3, d6=1 → damage=4 vs toughness=5 → stun.
        const state = setup({ fromZ: 3, toughness: 5, rngScript: [{ die: 'd6', value: 1 }] });
        const action: Extract<BattleAction, { type: 'JUMP_DOWN' }> = {
            type: 'JUMP_DOWN', participantId: 'jumper', to: { x: 5, y: 1 },
        };
        const { next, events } = jumpDown(state, action, { rng: { d6, d100 } });
        const p = next.battle.participants[0];
        expect(p.status).toBe('stunned');
        expect(p.stunTokens).toBe(1);
        const fall = events.find(e => e.type === 'FALL_DAMAGE_RESOLVED');
        expect(fall).toMatchObject({ outcome: 'stunned', dropHeight: 3, d6Roll: 1, damage: 4, toughness: 5 });
    });

    it('drop ≥ 3 with high roll kills when damage ≥ toughness', () => {
        // fromZ=4, drop=4, d6=6 → damage=10 vs toughness=4 → casualty.
        const state = setup({ fromZ: 4, toughness: 4, rngScript: [{ die: 'd6', value: 6 }] });
        const action: Extract<BattleAction, { type: 'JUMP_DOWN' }> = {
            type: 'JUMP_DOWN', participantId: 'jumper', to: { x: 5, y: 1 },
        };
        const { next, events } = jumpDown(state, action, { rng: { d6, d100 } });
        const p = next.battle.participants[0];
        expect(p.status).toBe('casualty');
        expect(p.actionsRemaining).toBe(0);
        const fall = events.find(e => e.type === 'FALL_DAMAGE_RESOLVED');
        expect(fall).toMatchObject({ outcome: 'casualty', damage: 10 });
    });

    it('throws when destination is not strictly lower (no upward jump)', () => {
        const state = setup({ fromZ: 0 });
        const action: Extract<BattleAction, { type: 'JUMP_DOWN' }> = {
            type: 'JUMP_DOWN', participantId: 'jumper', to: { x: 5, y: 1 },
        };
        expect(() => jumpDown(state, action, { rng: { d6, d100 } })).toThrow(/strictly lower/);
    });

    it('throws when participant is a casualty', () => {
        const state = setup({ fromZ: 3 });
        state.battle.participants[0].status = 'casualty';
        const action: Extract<BattleAction, { type: 'JUMP_DOWN' }> = {
            type: 'JUMP_DOWN', participantId: 'jumper', to: { x: 5, y: 1 },
        };
        expect(() => jumpDown(state, action, { rng: { d6, d100 } })).toThrow(/Casualty cannot jump/);
    });

    it('does not advance RNG when drop is below threshold', () => {
        const state = setup({ fromZ: 2 });
        const before = state.rng.cursor;
        const action: Extract<BattleAction, { type: 'JUMP_DOWN' }> = {
            type: 'JUMP_DOWN', participantId: 'jumper', to: { x: 5, y: 1 },
        };
        const { next } = jumpDown(state, action, { rng: { d6, d100 } });
        expect(next.rng.cursor).toBe(before);
    });
});
