import { useMemo, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { TILE_SIZE } from '@/constants/three';
import type { GridSize } from '@/types/battle';

interface ThreeCanvasProps {
  gridSize: GridSize;
  children: ReactNode;
}

export const ThreeCanvas = ({ gridSize, children }: ThreeCanvasProps) => {
  const cameraPosition = useMemo(() => {
    const maxDim = Math.max(gridSize.width, gridSize.height) * TILE_SIZE;
    const y = Math.max(6, maxDim * 1.2);
    return [0, y, y] as const;
  }, [gridSize.height, gridSize.width]);

  return (
    <Canvas className="w-full h-full" camera={{ position: cameraPosition, fov: 50, near: 0.1, far: 4000 }}>
      <color attach="background" args={['#0b1220']} />
      <ambientLight intensity={0.9} />
      <hemisphereLight intensity={0.6} groundColor="#0b0f1a" />
      <directionalLight position={[30, 60, 30]} intensity={1.4} castShadow />
      <OrbitControls
        enableRotate
        enablePan
        enableZoom
        maxPolarAngle={Math.PI / 2.05}
        minPolarAngle={Math.PI / 6}
      />
      {children}
    </Canvas>
  );
};
