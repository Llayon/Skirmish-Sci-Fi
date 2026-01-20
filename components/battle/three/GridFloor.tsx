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

    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#0b1220');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const noise = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < noise.data.length; i += 4) {
      const v = (Math.random() - 0.5) * 10;
      noise.data[i] = Math.min(255, Math.max(0, noise.data[i] + v));
      noise.data[i + 1] = Math.min(255, Math.max(0, noise.data[i + 1] + v));
      noise.data[i + 2] = Math.min(255, Math.max(0, noise.data[i + 2] + v));
    }
    ctx.putImageData(noise, 0, 0);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, size, size);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(size / 2, 0);
    ctx.lineTo(size / 2, size);
    ctx.moveTo(0, size / 2);
    ctx.lineTo(size, size / 2);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(gridSize.width, gridSize.height);
    texture.anisotropy = 4;
    texture.colorSpace = THREE.SRGBColorSpace;

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
      <meshStandardMaterial map={gridTexture} roughness={0.95} metalness={0.05} />
    </mesh>
  );
};
