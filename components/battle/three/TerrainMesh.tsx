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
    <group position={[position.x, position.y, position.z]} userData={{ terrainId: terrain.id, terrainType: terrain.type }}>
      <mesh ref={meshRef} raycast={() => null} castShadow receiveShadow>
        {getTerrainGeometry(terrain)}
        {getTerrainMaterial(terrain)}
      </mesh>
      {terrain.providesCover && (
        <mesh raycast={() => null} scale={[1.03, 1.03, 1.03]}>
          {getTerrainGeometry(terrain)}
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.22} wireframe toneMapped={false} />
        </mesh>
      )}
    </group>
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
    Wall: '#64748b',
    Barrel: '#a16207',
    Container: '#2563eb',
    Obstacle: '#475569',
    Floor: '#111827',
  };

  const roughness: Record<string, number> = {
    Wall: 0.85,
    Barrel: 0.7,
    Container: 0.55,
    Obstacle: 0.9,
    Floor: 0.95,
  };

  const metalness: Record<string, number> = {
    Wall: 0.15,
    Barrel: 0.25,
    Container: 0.5,
    Obstacle: 0.1,
    Floor: 0.05,
  };

  const emissive = terrain.type === 'Container' ? '#1d4ed8' : '#000000';
  const emissiveIntensity = terrain.type === 'Container' ? 0.12 : 0;

  return (
    <meshStandardMaterial
      color={colors[terrain.type] || colors.Obstacle}
      roughness={roughness[terrain.type] ?? 0.9}
      metalness={metalness[terrain.type] ?? 0.1}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
    />
  );
}
