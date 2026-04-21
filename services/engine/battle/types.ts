import type { Battle, BattlePhase } from '@/types/battle';
import type { RngState } from '../rng/rng';
import type { Position } from '@/types/character';
import type { JsonValue } from '../types';

/**
 * Engine-specific log entry type.
 * Decoupled from application LogEntry to maintain boundary.
 */
export interface EngineLogEntry {
    key: string;
    params?: Record<string, JsonValue>;
}

/**
 * Current engine state schema version.
 * Increment when EngineBattleState structure changes.
 */
export const CURRENT_ENGINE_SCHEMA_VERSION = 1 as const;

/**
 * The full deterministic state of the battle engine.
 * Includes the Battle data model and the current RNG state.
 */
export interface EngineBattleState {
    schemaVersion: typeof CURRENT_ENGINE_SCHEMA_VERSION;
    battle: Battle;
    rng: RngState;
}

/**
 * All possible actions the engine can process.
 * Add new actions here as discriminated union members.
 */
export type BattleAction = 
    | { type: 'ROLL_INITIATIVE' }
    | { type: 'MOVE_PARTICIPANT'; participantId: string; to: Position }
    | { type: 'SHOOT_ATTACK'; attackerId: string; targetId: string; weapon: { id: string; range: number; shots: number; damage: number; traits: string[] } }
    | { type: 'BRAWL_ATTACK'; attackerId: string; targetId: string; weapon?: { id: string; damage: number; traits: string[] } }
    | { type: 'ADVANCE_PHASE' }
    | { type: 'END_TURN'; participantId?: string };

/**
 * Events emitted by the engine for UI/Animation consumption.
 * These are transient and not part of the persisted state.
 */
export type BattleEvent =
    | { type: 'REACTION_ROLLED'; participantId: string; roll: number; success: boolean }
    | { type: 'TURN_ORDER_SET'; quick: string[]; slow: string[] }
    | { type: 'PARTICIPANT_MOVED'; participantId: string; from: Position; to: Position }
    | { type: 'SHOOT_DECLARED'; attackerId: string; targetId: string; weaponId: string }
    | { type: 'SHOT_RESOLVED'; attackerId: string; targetId: string; hit: boolean; roll: number }
    | { type: 'BRAWL_DECLARED'; attackerId: string; targetId: string }
    | { type: 'BRAWL_RESOLVED'; attackerId: string; targetId: string; winnerId: string | null; loserId: string | null }
    | { type: 'PHASE_CHANGED'; from: BattlePhase; to: BattlePhase }
    | { type: 'ACTIVE_PARTICIPANT_SET'; participantId: string | null }
    | { type: 'TURN_INDEX_SET'; index: number }
    | { type: 'ROUND_INCREMENTED'; round: number };

/**
 * Dependencies injected into the reducer.
 * Pure functions for RNG handling.
 */
export interface EngineDeps {
    rng: {
        d6: (state: RngState) => { value: 1|2|3|4|5|6; next: RngState };
        d100: (state: RngState) => { value: number; next: RngState };
    };
}

/**
 * Result of a reducer step.
 * - next: The new state
 * - events: Array of events for UI
 * - log: New log entries (delta) to be appended
 * - stateHash: Deterministic hash of the next state
 */
export interface BattleEngineResult {
    next: EngineBattleState;
    events: BattleEvent[];
    log: EngineLogEntry[];
    stateHash: string;
}

export type EngineVerifyResult =
  | { ok: true; stepsCount: number; replayedHash: string }
  | { ok: false; reason: 'no_baseline' }
  | { ok: false; reason: 'no_expected_hash' }
  | { ok: false; reason: 'hash_mismatch'; expectedHash: string; replayedHash: string; stepsCount: number };

export interface EngineSnapshot {
    schemaVersion: typeof CURRENT_ENGINE_SCHEMA_VERSION;
    battle: Battle;
    rng: RngState;
    stateHash: string;
}
