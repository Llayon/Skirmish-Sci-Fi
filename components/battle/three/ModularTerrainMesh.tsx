import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { gridToWorld } from "@/services/three/coordinates";
import type { GridSize } from "@/types/battle";
import type { Terrain3D } from "@/types/battle3d";

interface ModularTerrainMeshProps {
  terrain: Terrain3D;
  gridSize: GridSize;
}

function findFirstMesh(node: THREE.Object3D): THREE.Mesh | null {
  if (node.type === "Mesh") {
    return node as THREE.Mesh;
  }
  for (const child of node.children) {
    const found = findFirstMesh(child);
    if (found) return found;
  }
  return null;
}

export const ModularTerrainMesh = ({
  terrain,
  gridSize,
}: ModularTerrainMeshProps) => {
  const { scene } = useGLTF(terrain.modelPath || "");

  const meshGroup = useMemo(() => {
    if (!scene || !terrain.modelPath) return null;
    const mesh = findFirstMesh(scene);
    if (!mesh || !mesh.geometry) {
      console.warn(
        `[ModularTerrainMesh] No mesh found in ${terrain.modelPath}`,
      );
      return null;
    }

    // Clone the entire mesh hierarchy to preserve materials and transforms
    const cloned = mesh.clone();
    cloned.traverse((child) => {
      if (child.type === "Mesh" && (child as THREE.Mesh).geometry) {
        (child as THREE.Mesh).geometry = (child as THREE.Mesh).geometry.clone();
      }
    });

    return cloned;
  }, [scene, terrain.modelPath]);

  if (!meshGroup) return null;

  const centerCellX = terrain.position.x + (terrain.size.width - 1) / 2;
  const centerCellY = terrain.position.y + (terrain.size.height - 1) / 2;
  const centerY = terrain.baseElevation + terrain.height / 2;
  const position = gridToWorld(
    { x: centerCellX, y: centerCellY },
    gridSize,
    centerY,
  );

  return (
    <group
      position={[position.x, position.y, position.z]}
      userData={{ terrainId: terrain.id, terrainType: terrain.type }}
    >
      <primitive object={meshGroup} castShadow receiveShadow />
    </group>
  );
};
