import { useEffect, useRef } from "react";
import type * as THREE from "three";
import { TILE_SIZE } from "@/constants/three";
import { gridToWorld } from "@/services/three/coordinates";
import type { GridSize } from "@/types/battle";
import type { Terrain3D } from "@/types/battle3d";
import { useTerrainMeshContext } from "./contexts/TerrainMeshContext";

interface PrimitiveTerrainMeshProps {
  terrain: Terrain3D;
  gridSize: GridSize;
}

export const PrimitiveTerrainMesh = ({
  terrain,
  gridSize,
}: PrimitiveTerrainMeshProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { register, unregister } = useTerrainMeshContext();

  useEffect(() => {
    if (meshRef.current) {
      register(terrain.id, meshRef.current);
      return () => unregister(terrain.id);
    }
  }, [terrain.id, register, unregister]);

  // Give flat pieces (floors, roofs) a thin visible slab so they render as
  // a platform rather than collapsing to zero. Rules never consult visual
  // height — they read baseElevation + objectHeight from the Terrain data —
  // so this slab is purely cosmetic.
  const visualHeight = terrain.height > 0 ? terrain.height : 0.05;
  const centerY = terrain.baseElevation + visualHeight / 2;
  // terrain.position is the footprint's top-left cell; the mesh must be
  // centered over the middle of the footprint, otherwise multi-cell pieces
  // (like a roof or interior over a 5x3 building) appear shifted.
  const centerCellX = terrain.position.x + (terrain.size.width - 1) / 2;
  const centerCellY = terrain.position.y + (terrain.size.height - 1) / 2;
  const position = gridToWorld(
    { x: centerCellX, y: centerCellY },
    gridSize,
    centerY,
  );

  return (
    <mesh
      ref={meshRef}
      raycast={() => null}
      position={[position.x, position.y, position.z]}
      castShadow
      receiveShadow
      userData={{ terrainId: terrain.id, terrainType: terrain.type }}
    >
      {getTerrainGeometry(terrain, visualHeight)}
      {getTerrainMaterial(terrain)}
    </mesh>
  );
};

function getTerrainGeometry(terrain: Terrain3D, visualHeight: number) {
  // Floor pieces (interiors, roofs, landing pads) cover their full footprint —
  // their geometry must scale with terrain.size. Other shapes keep their
  // original hardcoded silhouettes; their footprints are typically 1×1 or
  // 1×2 in the generator, so the mismatch stays small.
  const fw = terrain.size.width * TILE_SIZE;
  const fh = terrain.size.height * TILE_SIZE;
  switch (terrain.type) {
    case "Wall":
      return <boxGeometry args={[TILE_SIZE, visualHeight, TILE_SIZE * 0.2]} />;
    case "Barrel":
      return <cylinderGeometry args={[0.3, 0.35, visualHeight, 8]} />;
    case "Container":
      return <boxGeometry args={[TILE_SIZE * 2, visualHeight, TILE_SIZE]} />;
    case "Floor":
      return <boxGeometry args={[fw, visualHeight, fh]} />;
    case "Obstacle":
    default:
      return (
        <boxGeometry args={[TILE_SIZE * 0.8, visualHeight, TILE_SIZE * 0.8]} />
      );
  }
}

function getTerrainMaterial(terrain: Terrain3D) {
  const colors: Record<string, string> = {
    Wall: "#666666",
    Barrel: "#8B4513",
    Container: "#2E5090",
    Obstacle: "#555555",
    Floor: "#1a1a2e",
  };

  return (
    <meshStandardMaterial color={colors[terrain.type] || colors.Obstacle} />
  );
}
