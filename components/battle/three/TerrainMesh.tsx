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
  // Priority: modular individual glTF → atlas GLB → primitive
  if (terrain.modelPath) {
    return <ModularTerrainMesh terrain={terrain} gridSize={gridSize} />;
  }
  if (terrain.modelRef) {
    return <GLBTerrainMesh terrain={terrain} gridSize={gridSize} />;
  }
  return <PrimitiveTerrainMesh terrain={terrain} gridSize={gridSize} />;
};
