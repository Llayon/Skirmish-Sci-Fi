import type {
  BattleAction,
  BattleEvent,
  EngineBattleState,
  EngineLogEntry,
} from "../types";
import { isScriptedRngState } from "../../rng/rng";
import { generateTerrain as runTerrainGenerator } from "@/services/terrainGenerator";

type GenerateTerrainAction = Extract<
  BattleAction,
  { type: "GENERATE_TERRAIN" }
>;

/**
 * Engine V2 action that produces a deterministic battlefield layout.
 *
 * Consumes the engine's seeded RNG to place terrain pieces, replacing
 * any existing battle.terrain and battle.gridSize. The returned state
 * carries the advanced RNG cursor so downstream actions in the same
 * reducer session continue from a deterministic offset.
 *
 * Scripted RNG is rejected: layout generation draws floats (via
 * nextFloat), which the scripted RNG protocol does not currently model.
 * Seed a scripted run through the battle-level seed instead.
 */
export function generateTerrain(
  state: EngineBattleState,
  action: GenerateTerrainAction,
): { next: EngineBattleState; events: BattleEvent[]; log: EngineLogEntry[] } {
  if (isScriptedRngState(state.rng)) {
    throw new Error(
      "GENERATE_TERRAIN requires a seeded RNG state (scripted RNG does not model nextFloat).",
    );
  }

  const { terrain, rng: nextRng } = runTerrainGenerator(
    action.theme,
    action.gridSize,
    action.worldTraits ?? [],
    state.rng,
    action.missionType,
  );

  const events: BattleEvent[] = [
    {
      type: "TERRAIN_GENERATED",
      theme: action.theme,
      pieceCount: terrain.length,
    },
  ];

  const log: EngineLogEntry[] = [
    {
      key: "log.terrain.generated",
      params: { theme: action.theme, count: terrain.length },
    },
  ];

  return {
    next: {
      ...state,
      battle: {
        ...state.battle,
        gridSize: action.gridSize,
        terrain,
      },
      rng: nextRng,
    },
    events,
    log,
  };
}
