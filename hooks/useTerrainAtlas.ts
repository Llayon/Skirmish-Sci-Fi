import { useGLTF } from '@react-three/drei';
import { useCallback } from 'react';
import * as THREE from 'three';

/**
 * Loads the terrain GLB atlas once and provides a function to retrieve
 * cloned geometry by mesh name.
 */
export function useTerrainAtlas() {
  const { scene } = useGLTF('/assets/terrain_atlas.glb');

  const getGeometry = useCallback(
    (name: string): THREE.BufferGeometry | null => {
      if (!scene) return null;
      const mesh = scene.getObjectByName(name) as THREE.Mesh | undefined;
      if (!mesh || !mesh.geometry) return null;
      return mesh.geometry.clone();
    },
    [scene],
  );

  const hasGeometry = useCallback(
    (name: string): boolean => {
      if (!scene) return false;
      const mesh = scene.getObjectByName(name) as THREE.Mesh | undefined;
      return !!mesh && !!mesh.geometry;
    },
    [scene],
  );

  return { getGeometry, hasGeometry, loaded: !!scene };
}

/** Preload the atlas at app startup */
useGLTF.preload('/assets/terrain_atlas.glb');
