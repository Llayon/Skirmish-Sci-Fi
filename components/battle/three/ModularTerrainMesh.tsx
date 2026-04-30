import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import { gridToWorld } from "@/services/three/coordinates";
import type { GridSize } from "@/types/battle";
import type { Terrain3D } from "@/types/battle3d";

interface ModularTerrainMeshProps {
  terrain: Terrain3D;
  gridSize: GridSize;
}

/**
 * Loads an individual glTF file for a terrain piece.
 * Used with modular asset kits (e.g. Modular SciFi MegaKit).
 * Falls back to primitive if the file fails to load.
 */
export const ModularTerrainMesh = ({
  terrain,
  gridSize,
}: ModularTerrainMeshProps) => {
  const { scene } = useGLTF(terrain.modelPath || "");

  const geometry = useMemo(() => {
    if (!scene || !terrain.modelPath) return null;
    // Take the first mesh found in the glTF scene
    const mesh = scene.children.find((child) => child.type === "Mesh") as
      | THREE.Mesh
      | undefined;
    if (!mesh || !mesh.geometry) return null;
    return mesh.geometry.clone();
  }, [scene, terrain.modelPath]);

  if (!geometry) return null;

  const centerCellX = terrain.position.x + (terrain.size.width - 1) / 2;
  const centerCellY = terrain.position.y + (terrain.size.height - 1) / 2;
  const centerY = terrain.baseElevation + terrain.height / 2;
  const position = gridToWorld(
    { x: centerCellX, y: centerCellY },
    gridSize,
    centerY,
  );

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
