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
  const modelPath = terrain.modelPath;
  // GLTFLoader resolves relative URIs (e.g. .bin files, texture PNGs)
  // against the page base URL unless we tell it otherwise via
  // setResourcePath. We derive the folder from the glTF path so that
  // companion files load from the same directory.
  const resourcePath = useMemo(() => {
    if (!modelPath) return "";
    const lastSlash = modelPath.lastIndexOf("/");
    return lastSlash >= 0 ? modelPath.substring(0, lastSlash + 1) : "";
  }, [modelPath]);

  const { scene } = useGLTF(
    modelPath || "__invalid__",
    false, // draco
    false, // meshopt
    (loader) => {
      if (resourcePath) {
        loader.setResourcePath(resourcePath);
      }
    },
  );

  console.log(
    `[ModularTerrainMesh] ${terrain.name}: modelPath=${modelPath}, resourcePath=${resourcePath}, scene=${!!scene}, children=${scene?.children?.length || 0}`,
  );

  const meshGroup = useMemo(() => {
    if (!scene || !modelPath || modelPath === "__invalid__") {
      console.warn(`[ModularTerrainMesh] No scene or modelPath for ${terrain.name}`);
      return null;
    }
    const mesh = findFirstMesh(scene);
    if (!mesh || !mesh.geometry) {
      console.warn(
        `[ModularTerrainMesh] No mesh found in ${modelPath}`,
      );
      return null;
    }

    console.log(`[ModularTerrainMesh] Found mesh ${mesh.name} for ${terrain.name}`);

    // Clone the entire mesh hierarchy to preserve materials and transforms
    const cloned = mesh.clone();
    cloned.traverse((child) => {
      if (child.type === "Mesh" && (child as THREE.Mesh).geometry) {
        (child as THREE.Mesh).geometry = (child as THREE.Mesh).geometry.clone();
      }
    });

    return cloned;
  }, [scene, modelPath, terrain.name]);

  const { scale, yOffset } = useMemo(() => {
    if (!meshGroup) return { scale: [1, 1, 1] as const, yOffset: 0 };
    const box = new THREE.Box3().setFromObject(meshGroup);
    const size = new THREE.Vector3();
    box.getSize(size);
    const min = new THREE.Vector3();
    box.getMin(min);

    if (size.x === 0 || size.y === 0 || size.z === 0) {
      return { scale: [1, 1, 1] as const, yOffset: 0 };
    }

    const targetW = terrain.size.width;
    const targetD = terrain.size.height;
    // For flat surfaces (landing pad, roof) keep original Y scale so the
    // model does not collapse to a line. For vertical props scale to height.
    const targetH = terrain.height > 0.1 ? terrain.height : size.y;

    const s: [number, number, number] = [
      targetW / size.x,
      targetH / size.y,
      targetD / size.z,
    ];

    // Shift the model down so its bounding-box bottom sits at local y=0.
    // That way the world position (set to baseElevation) places the bottom
    // exactly on the terrain elevation.
    const offset = -min.y * s[1];

    console.log(
      `[ModularTerrainMesh] ${terrain.name} bbox size=${size.x.toFixed(2)}x${size.y.toFixed(2)}x${size.z.toFixed(2)} scale=${s.map((v) => v.toFixed(2)).join("x")} yOffset=${offset.toFixed(2)}`,
    );

    return { scale: s, yOffset: offset };
  }, [meshGroup, terrain.size.width, terrain.size.height, terrain.height, terrain.name]);

  if (!meshGroup) return null;

  const centerCellX = terrain.position.x + (terrain.size.width - 1) / 2;
  const centerCellY = terrain.position.y + (terrain.size.height - 1) / 2;
  // Place the bottom of the model at baseElevation (not the centre).
  const position = gridToWorld(
    { x: centerCellX, y: centerCellY },
    gridSize,
    terrain.baseElevation,
  );

  console.log(`[ModularTerrainMesh] Rendering ${terrain.name} at`, position);

  return (
    <group
      position={[position.x, position.y, position.z]}
      userData={{ terrainId: terrain.id, terrainType: terrain.type }}
    >
      <group scale={scale} position={[0, yOffset, 0]}>
        <primitive object={meshGroup} castShadow receiveShadow />
      </group>
    </group>
  );
};
