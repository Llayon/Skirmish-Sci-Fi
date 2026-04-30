import { Suspense } from "react";
import type { GridSize } from "@/types/battle";
import type { Terrain3D } from "@/types/battle3d";
import { GLBTerrainMesh } from "./GLBTerrainMesh";
import { ModularTerrainMesh } from "./ModularTerrainMesh";
import { PrimitiveTerrainMesh } from "./PrimitiveTerrainMesh";

interface TerrainMeshProps {
  terrain: Terrain3D;
  gridSize: GridSize;
}

export const TerrainMesh = ({ terrain, gridSize }: TerrainMeshProps) => {
  console.log(
    `[TerrainMesh] ${terrain.name}: modelPath=${terrain.modelPath}, modelRef=${terrain.modelRef}, type=${terrain.type}`,
  );

  // Priority: modular individual glTF -> atlas GLB -> primitive
  if (terrain.modelPath) {
    return (
      <Suspense
        fallback={
          <PrimitiveTerrainMesh terrain={terrain} gridSize={gridSize} />
        }
      >
        <ModularTerrainMesh terrain={terrain} gridSize={gridSize} />
      </Suspense>
    );
  }
  if (terrain.modelRef) {
    return (
      <Suspense
        fallback={
          <PrimitiveTerrainMesh terrain={terrain} gridSize={gridSize} />
        }
      >
        <GLBTerrainMesh terrain={terrain} gridSize={gridSize} />
      </Suspense>
    );
  }
  return <PrimitiveTerrainMesh terrain={terrain} gridSize={gridSize} />;
};
