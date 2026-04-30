import { useMemo } from "react";

import { gridToWorld } from "@/services/three/coordinates";
import type { GridSize } from "@/types/battle";
import type { Terrain3D } from "@/types/battle3d";
import { useTerrainAtlas } from "@/hooks/useTerrainAtlas";

interface GLBTerrainMeshProps {
  terrain: Terrain3D;
  gridSize: GridSize;
}

export const GLBTerrainMesh = ({ terrain, gridSize }: GLBTerrainMeshProps) => {
  const { getGeometry } = useTerrainAtlas();

  const geometry = useMemo(() => {
    if (!terrain.modelRef) return null;
    return getGeometry(terrain.modelRef);
  }, [terrain.modelRef, getGeometry]);

  if (!geometry) return null;

  // Center the mesh over the terrain footprint
  const centerCellX = terrain.position.x + (terrain.size.width - 1) / 2;
  const centerCellY = terrain.position.y + (terrain.size.height - 1) / 2;
  const centerY = terrain.baseElevation + terrain.height / 2;
  const position = gridToWorld(
    { x: centerCellX, y: centerCellY },
    gridSize,
    centerY,
  );

  // Scale handling: GLB mesh scale to be verified after export
  // const scaleX = terrain.size.width * TILE_SIZE;
  // const scaleZ = terrain.size.height * TILE_SIZE;

  return (
    <mesh
      position={[position.x, position.y, position.z]}
      geometry={geometry}
      castShadow
      receiveShadow
      raycast={() => null}
      userData={{ terrainId: terrain.id, terrainType: terrain.type }}
    >
      <meshStandardMaterial color="#888888" roughness={0.7} metalness={0.3} />
    </mesh>
  );
};
