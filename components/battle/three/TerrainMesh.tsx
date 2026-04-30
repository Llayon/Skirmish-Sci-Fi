import type { GridSize } from '@/types/battle';
import type { Terrain3D } from '@/types/battle3d';
import { GLBTerrainMesh } from './GLBTerrainMesh';
import { PrimitiveTerrainMesh } from './PrimitiveTerrainMesh';

interface TerrainMeshProps {
  terrain: Terrain3D;
  gridSize: GridSize;
}

export const TerrainMesh = ({ terrain, gridSize }: TerrainMeshProps) => {
  if (terrain.modelRef) {
    return <GLBTerrainMesh terrain={terrain} gridSize={gridSize} />;
  }
  return <PrimitiveTerrainMesh terrain={terrain} gridSize={gridSize} />;
};
