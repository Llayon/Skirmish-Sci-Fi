import { describe, it, expect } from "vitest";
import { generateTerrain } from "./terrainGenerator";
import { createRng } from "./engine/rng/rng";
import { TerrainTheme, WorldTrait } from "../types";

const gridSize = { width: 32, height: 32 };

function stripIds(terrain: Record<string, unknown>[]) {
  return terrain.map((t) => {
    const copy = { ...t };
    delete copy.id;
    delete copy.parentId;
    return copy;
  });
}

describe("Zone-based terrain generation", () => {
  const themes: TerrainTheme[] = [
    "Industrial",
    "Wilderness",
    "AlienRuin",
    "CrashSite",
  ];

  themes.forEach((theme) => {
    it(`[${theme}] every terrain piece is inside the grid`, () => {
      const { terrain } = generateTerrain(theme, gridSize, [], createRng(7777));
      for (const t of terrain) {
        expect(t.position.x).toBeGreaterThanOrEqual(0);
        expect(t.position.y).toBeGreaterThanOrEqual(0);
        expect(t.position.x + t.size.width).toBeLessThanOrEqual(gridSize.width);
        expect(t.position.y + t.size.height).toBeLessThanOrEqual(
          gridSize.height,
        );
      }
    });

    it(`[${theme}] no overlapping terrain pieces`, () => {
      const { terrain } = generateTerrain(theme, gridSize, [], createRng(7777));
      for (let i = 0; i < terrain.length; i++) {
        for (let j = i + 1; j < terrain.length; j++) {
          const a = terrain[i];
          const b = terrain[j];
          const overlap =
            a.position.x < b.position.x + b.size.width &&
            a.position.x + a.size.width > b.position.x &&
            a.position.y < b.position.y + b.size.height &&
            a.position.y + a.size.height > b.position.y;
          // Interior and Roof of the same building share the same footprint by design
          const sameBuilding = a.parentId && a.parentId === b.parentId;
          if (
            sameBuilding &&
            ((a.type === "Interior" && b.name.endsWith(" Roof")) ||
              (b.type === "Interior" && a.name.endsWith(" Roof")))
          ) {
            continue;
          }
          expect(overlap).toBe(false);
        }
      }
    });

    it(`[${theme}] has at least one elevated position`, () => {
      const { terrain } = generateTerrain(theme, gridSize, [], createRng(7777));
      const elevated = terrain.filter((t) => (t.baseElevation ?? 0) > 0);
      expect(elevated.length).toBeGreaterThan(0);
    });

    it(`[${theme}] has interactive props when expected`, () => {
      const { terrain } = generateTerrain(theme, gridSize, [], createRng(7777));
      const interactive = terrain.filter((t) => t.isInteractive);
      expect(interactive.length).toBeGreaterThan(0);
    });
  });

  it("determinism: same seed produces identical terrain", () => {
    const a = generateTerrain("Industrial", gridSize, [], createRng(12345));
    const b = generateTerrain("Industrial", gridSize, [], createRng(12345));
    expect(stripIds(a.terrain)).toEqual(stripIds(b.terrain));
  });

  it("different seeds produce different terrain", () => {
    const a = generateTerrain("Industrial", gridSize, [], createRng(1));
    const b = generateTerrain("Industrial", gridSize, [], createRng(2));
    expect(stripIds(a.terrain)).not.toEqual(stripIds(b.terrain));
  });

  it("world trait crystals adds Crystal pieces", () => {
    const { terrain } = generateTerrain(
      "Wilderness",
      gridSize,
      [{ id: "crystals", name: "Crystals", description: "" }] as WorldTrait[],
      createRng(4242),
    );
    const crystals = terrain.filter((t) => t.name === "Crystal");
    expect(crystals.length).toBeGreaterThan(0);
  });
});
