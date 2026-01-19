import { useEffect, useRef } from 'react';
import type * as THREE from 'three';
import { TILE_SIZE } from '@/constants/three';
import { gridToWorld } from '@/services/three/coordinates';
import type { GridSize } from '@/types/battle';
import type { Terrain3D } from '@/types/battle3d';
import { useTerrainMeshContext } from './contexts/TerrainMeshContext';

interface TerrainMeshProps {
  terrain: Terrain3D;
  gridSize: GridSize;
}

export const TerrainMesh = ({ terrain, gridSize }: TerrainMeshProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { register, unregister } = useTerrainMeshContext();

  useEffect(() => {
    if (meshRef.current) {
      register(terrain.id, meshRef.current);
      return () => unregister(terrain.id);
    }
  }, [terrain.id, register, unregister]);

  const position = gridToWorld(terrain.position, gridSize, terrain.height / 2);

  return (
    <mesh
      ref={meshRef}
      raycast={() => null}
      position={[position.x, position.y, position.z]}
      castShadow
      receiveShadow
      userData={{ terrainId: terrain.id, terrainType: terrain.type }}
    >
      {getTerrainGeometry(terrain)}
      {getTerrainMaterial(terrain)}
    </mesh>
  );
};

function getTerrainGeometry(terrain: Terrain3D) {
  switch (terrain.type) {
    case 'Wall':
      return <boxGeometry args={[TILE_SIZE, terrain.height, TILE_SIZE * 0.2]} />;
    case 'Barrel':
      return <cylinderGeometry args={[0.3, 0.35, terrain.height, 8]} />;
    case 'Container':
      return <boxGeometry args={[TILE_SIZE * 2, terrain.height, TILE_SIZE]} />;
    case 'Floor':
      return <boxGeometry args={[TILE_SIZE, terrain.height, TILE_SIZE]} />;
    case 'Obstacle':
    default:
      return <boxGeometry args={[TILE_SIZE * 0.8, terrain.height, TILE_SIZE * 0.8]} />;
  }
}

function getTerrainMaterial(terrain: Terrain3D) {
  const colors: Record<string, string> = {
    Wall: '#666666',
    Barrel: '#8B4513',
    Container: '#2E5090',
    Obstacle: '#555555',
    Floor: '#1a1a2e',
  };

  return <meshStandardMaterial color={colors[terrain.type] || colors.Obstacle} />;
}
