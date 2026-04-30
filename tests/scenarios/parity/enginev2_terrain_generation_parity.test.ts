import { describe, it, expect } from "vitest";
import { Terrain, TerrainTheme } from "@/types";
import { generateTerrain } from "@/services/terrainGenerator";
import { createRng } from "@/services/engine/rng/rng";

// Strip runtime-assigned ids so structural comparisons are stable across runs.
function stripIds(terrain: Terrain[]): Omit<Terrain, "id" | "parentId">[] {
  return terrain.map((t) => {
    const copy: Partial<Terrain> = { ...t };
    delete copy.id;
    delete copy.parentId;
    return copy as Omit<Terrain, "id" | "parentId">;
  });
}

// Originally captured as V1 → V2 parity baseline (Block A, commit 5f379b3).
// Since Block B2 the generator emits building roofs and will evolve further,
// so the baseline now serves as a V2 structural-regression guard rather
// than a V1 parity contract. V1 parity is preserved in git history.
describe("Terrain Generation (V2 Structural Baseline)", () => {
  describe("Determinism — same seed produces identical terrain", () => {
    const themes: TerrainTheme[] = [
      "Industrial",
      "Wilderness",
      "AlienRuin",
      "CrashSite",
    ];
    const gridSize = { width: 32, height: 32 };

    themes.forEach((theme) => {
      it(`[${theme}] two runs with seed=12345 produce the same layout`, () => {
        const { terrain: first } = generateTerrain(
          theme,
          gridSize,
          [],
          createRng(12345),
        );
        const { terrain: second } = generateTerrain(
          theme,
          gridSize,
          [],
          createRng(12345),
        );

        expect(stripIds(first)).toEqual(stripIds(second));
      });
    });

    it("different seeds produce different layouts", () => {
      const { terrain: a } = generateTerrain(
        "Industrial",
        gridSize,
        [],
        createRng(1),
      );
      const { terrain: b } = generateTerrain(
        "Industrial",
        gridSize,
        [],
        createRng(2),
      );

      expect(stripIds(a)).not.toEqual(stripIds(b));
    });

    it("returns an advanced RNG state whose cursor reflects rolls consumed", () => {
      const { rng } = generateTerrain(
        "Industrial",
        gridSize,
        [],
        createRng(12345),
      );
      expect(rng.cursor).toBeGreaterThan(0);
      expect(rng.seed).toBe(12345);
    });
  });

  describe("Structural invariants", () => {
    const gridSize = { width: 32, height: 32 };

    it("every terrain piece is fully inside the grid", () => {
      const { terrain } = generateTerrain(
        "Industrial",
        gridSize,
        [],
        createRng(7777),
      );

      expect(terrain.length).toBeGreaterThan(0);
      for (const t of terrain) {
        expect(t.position.x).toBeGreaterThanOrEqual(0);
        expect(t.position.y).toBeGreaterThanOrEqual(0);
        expect(t.position.x + t.size.width).toBeLessThanOrEqual(gridSize.width);
        expect(t.position.y + t.size.height).toBeLessThanOrEqual(
          gridSize.height,
        );
        expect(t.size.width).toBeGreaterThan(0);
        expect(t.size.height).toBeGreaterThan(0);
      }
    });

    it("every terrain piece has defined baseElevation and objectHeight", () => {
      const { terrain } = generateTerrain(
        "Industrial",
        gridSize,
        [],
        createRng(7777),
      );

      for (const t of terrain) {
        expect(typeof t.baseElevation).toBe("number");
        expect(typeof t.objectHeight).toBe("number");
        expect(t.baseElevation).toBeGreaterThanOrEqual(0);
        expect(t.objectHeight).toBeGreaterThanOrEqual(0);
      }
    });

    it("rulebook heights: walls 2, containers 1, doors flat, interiors flat", () => {
      const { terrain } = generateTerrain(
        "Industrial",
        gridSize,
        [],
        createRng(7777),
      );

      const walls = terrain.filter((t) => t.name === "Wall");
      const containers = terrain.filter((t) => t.name === "Container");
      const doors = terrain.filter((t) => t.name === "Door");
      const interiors = terrain.filter((t) => t.type === "Interior");

      expect(walls.length).toBeGreaterThan(0);
      walls.forEach((w) => {
        expect(w.baseElevation).toBe(0);
        expect(w.objectHeight).toBe(2);
      });
      containers.forEach((c) => {
        expect(c.baseElevation).toBe(0);
        expect(c.objectHeight).toBe(1);
      });
      doors.forEach((d) => {
        expect(d.baseElevation).toBe(0);
        expect(d.objectHeight).toBe(0);
      });
      interiors.forEach((i) => {
        expect(i.baseElevation).toBe(0);
        expect(i.objectHeight).toBe(0);
      });
    });

    it("every building emits a flat roof at baseElevation 2", () => {
      // Each building gets Walls (objectHeight 2) + Interior (flat at 0) +
      // Roof (flat at baseElevation 2) + Door (flat at 0). Roof footprint
      // matches Interior footprint: same parentId, position, size.
      const { terrain } = generateTerrain(
        "Industrial",
        gridSize,
        [],
        createRng(7777),
      );

      const interiors = terrain.filter((t) => t.type === "Interior");
      const roofs = terrain.filter((t) => t.name.endsWith(" Roof"));

      expect(interiors.length).toBeGreaterThan(0);
      expect(roofs.length).toBe(interiors.length);

      for (const roof of roofs) {
        expect(roof.baseElevation).toBe(2);
        expect(roof.objectHeight).toBe(0);
        expect(roof.isImpassable).toBe(false);
        expect(roof.blocksLineOfSight).toBe(false);
        const matchingInterior = interiors.find(
          (i) => i.parentId === roof.parentId,
        );
        expect(matchingInterior).toBeDefined();
        expect(roof.position).toEqual(matchingInterior!.position);
        expect(roof.size).toEqual(matchingInterior!.size);
      }
    });

    it('world trait "crystals" adds Crystal terrain pieces', () => {
      const { terrain } = generateTerrain(
        "Wilderness",
        gridSize,
        [
          {
            id: "crystals",
            name: "Crystals",
            description: "",
          } as unknown as Parameters<typeof generateTerrain>[2][number],
        ],
        createRng(4242),
      );
      const crystalCount = terrain.filter((t) => t.name === "Crystal").length;
      expect(crystalCount).toBeGreaterThan(0);
    });
  });

  describe("Golden baseline — V2 structural signature", () => {
    const gridSize = { width: 32, height: 32 };

    // These snapshots were first captured with a V1 generator driven by a
    // Mulberry32-equivalent float source. The V2 generator here uses
    // services/engine/rng/rng directly with the same seed and must reproduce
    // the exact same layout — these assertions are the parity gate.
    const themes: TerrainTheme[] = [
      "Industrial",
      "Wilderness",
      "AlienRuin",
      "CrashSite",
    ];

    themes.forEach((theme) => {
      it(`[${theme}] terrain signature at seed=12345 matches snapshot`, () => {
        const { terrain } = generateTerrain(
          theme,
          gridSize,
          [],
          createRng(12345),
        );

        const signature = {
          count: terrain.length,
          pieces: stripIds(terrain).map((t) => ({
            name: t.name,
            type: t.type,
            x: t.position.x,
            y: t.position.y,
            w: t.size.width,
            h: t.size.height,
            isDifficult: t.isDifficult,
            providesCover: t.providesCover,
            blocksLineOfSight: t.blocksLineOfSight,
            isImpassable: t.isImpassable,
            baseElevation: t.baseElevation,
            objectHeight: t.objectHeight,
          })),
        };

        expect(signature).toMatchSnapshot();
      });
    });
  });

  describe("Mission-aware baseline — Eliminate", () => {
    const gridSize = { width: 32, height: 32 };

    const themes: TerrainTheme[] = [
      "Industrial",
      "Wilderness",
      "AlienRuin",
      "CrashSite",
    ];

    themes.forEach((theme) => {
      it(`[${theme}] Eliminate terrain signature at seed=12345 matches snapshot`, () => {
        const { terrain } = generateTerrain(
          theme,
          gridSize,
          [],
          createRng(12345),
          "Eliminate",
        );

        const signature = {
          count: terrain.length,
          pieces: stripIds(terrain).map((t) => ({
            name: t.name,
            type: t.type,
            x: t.position.x,
            y: t.position.y,
            w: t.size.width,
            h: t.size.height,
            isDifficult: t.isDifficult,
            providesCover: t.providesCover,
            blocksLineOfSight: t.blocksLineOfSight,
            isImpassable: t.isImpassable,
            baseElevation: t.baseElevation,
            objectHeight: t.objectHeight,
          })),
        };

        expect(signature).toMatchSnapshot();
      });
    });
  });

  describe("Mission-aware baseline — Protect", () => {
    const gridSize = { width: 32, height: 32 };

    const themes: TerrainTheme[] = [
      "Industrial",
      "Wilderness",
      "AlienRuin",
      "CrashSite",
    ];

    themes.forEach((theme) => {
      it(`[${theme}] Protect terrain signature at seed=12345 matches snapshot`, () => {
        const { terrain } = generateTerrain(
          theme,
          gridSize,
          [],
          createRng(12345),
          "Protect",
        );

        const signature = {
          count: terrain.length,
          pieces: stripIds(terrain).map((t) => ({
            name: t.name,
            type: t.type,
            x: t.position.x,
            y: t.position.y,
            w: t.size.width,
            h: t.size.height,
            isDifficult: t.isDifficult,
            providesCover: t.providesCover,
            blocksLineOfSight: t.blocksLineOfSight,
            isImpassable: t.isImpassable,
            baseElevation: t.baseElevation,
            objectHeight: t.objectHeight,
          })),
        };

        expect(signature).toMatchSnapshot();
      });
    });
  });
});
