import { useMemo, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { TILE_SIZE } from '@/constants/three';
import type { GridSize } from '@/types/battle';
import { useSettingsStore } from '@/stores/settingsStore';
import { useShallow } from 'zustand/react/shallow';

interface ThreeCanvasProps {
  gridSize: GridSize;
  children: ReactNode;
}

export const ThreeCanvas = ({ gridSize, children }: ThreeCanvasProps) => {
  const { reducedMotion, threeQuality, camera3dPreset, camera3dInvertWheel, camera3dZoomSpeed, camera3dPanSpeed, camera3dRotateSpeed } =
    useSettingsStore(
      useShallow((s) => ({
        reducedMotion: s.reducedMotion,
        threeQuality: s.threeQuality,
        camera3dPreset: s.camera3dPreset,
        camera3dInvertWheel: s.camera3dInvertWheel,
        camera3dZoomSpeed: s.camera3dZoomSpeed,
        camera3dPanSpeed: s.camera3dPanSpeed,
        camera3dRotateSpeed: s.camera3dRotateSpeed,
      }))
    );

  const cameraPosition = useMemo(() => {
    const maxDim = Math.max(gridSize.width, gridSize.height) * TILE_SIZE;
    const y = Math.max(6, maxDim * 1.2);
    return [0, y, y] as const;
  }, [gridSize.height, gridSize.width]);

  const controlsConfig = useMemo(() => {
    const presetMult = camera3dPreset === 'cinematic' ? 0.75 : 1;
    const absZoom = Math.max(0.1, Math.min(5, camera3dZoomSpeed)) * presetMult;
    return {
      zoomSpeed: (camera3dInvertWheel ? -absZoom : absZoom) as number,
      panSpeed: Math.max(0.1, Math.min(5, camera3dPanSpeed)) * presetMult,
      rotateSpeed: Math.max(0.1, Math.min(5, camera3dRotateSpeed)) * presetMult,
      enableDamping: !reducedMotion,
      dampingFactor: camera3dPreset === 'cinematic' ? 0.18 : 0.12,
      minPolarAngle: camera3dPreset === 'cinematic' ? Math.PI / 4 : Math.PI / 6,
      maxPolarAngle: Math.PI / 2.05,
    };
  }, [camera3dInvertWheel, camera3dPanSpeed, camera3dPreset, camera3dRotateSpeed, camera3dZoomSpeed, reducedMotion]);

  return (
    <Canvas
      className="w-full h-full"
      shadows={threeQuality !== 'low'}
      camera={{ position: cameraPosition, fov: 50, near: 0.1, far: 4000 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ touchAction: 'none' }}
    >
      <color attach="background" args={['#0b1220']} />
      <fog attach="fog" args={['#0b1220', 12, threeQuality === 'low' ? 40 : 55]} />
      <ambientLight intensity={0.45} />
      <hemisphereLight intensity={0.32} groundColor="#070b14" />
      <directionalLight
        position={[26, 46, 18]}
        intensity={1.28}
        color="#cfe2ff"
        castShadow={threeQuality !== 'low'}
        shadow-mapSize-width={threeQuality === 'high' ? 1024 : 512}
        shadow-mapSize-height={threeQuality === 'high' ? 1024 : 512}
        shadow-camera-near={1}
        shadow-camera-far={120}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-bias={-0.0002}
      />
      <directionalLight position={[-22, 18, -26]} intensity={0.6} color="#7dd3fc" />
      <OrbitControls
        makeDefault
        enableRotate
        enablePan
        enableZoom
        enableDamping={controlsConfig.enableDamping}
        dampingFactor={controlsConfig.dampingFactor}
        zoomSpeed={controlsConfig.zoomSpeed}
        panSpeed={controlsConfig.panSpeed}
        rotateSpeed={controlsConfig.rotateSpeed}
        maxPolarAngle={controlsConfig.maxPolarAngle}
        minPolarAngle={controlsConfig.minPolarAngle}
        touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
      />
      {children}
    </Canvas>
  );
};
