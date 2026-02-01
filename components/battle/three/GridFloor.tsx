import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { TILE_SIZE } from '@/constants/three';

interface GridFloorProps {
  gridSize: { width: number; height: number };
}

export const GridFloor = ({ gridSize }: GridFloorProps) => {
  const gridTexture = useMemo(() => {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#182237';
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = '#2f3f66';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(gridSize.width, gridSize.height);

    return texture;
  }, [gridSize.width, gridSize.height]);

  useEffect(() => {
    return () => {
      gridTexture?.dispose();
    };
  }, [gridTexture]);

  if (!gridTexture) return null;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow raycast={() => null}>
      <planeGeometry args={[gridSize.width * TILE_SIZE, gridSize.height * TILE_SIZE]} />
      <meshStandardMaterial map={gridTexture} />
    </mesh>
  );
};
