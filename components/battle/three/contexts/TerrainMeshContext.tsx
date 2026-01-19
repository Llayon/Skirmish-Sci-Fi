import { createContext, useCallback, useContext, useRef, type PropsWithChildren } from 'react';
import type * as THREE from 'three';

interface TerrainMeshContextValue {
  register: (id: string, mesh: THREE.Mesh) => void;
  unregister: (id: string) => void;
  getMesh: (id: string) => THREE.Mesh | undefined;
}

const TerrainMeshContext = createContext<TerrainMeshContextValue | null>(null);

export const TerrainMeshProvider = ({ children }: PropsWithChildren) => {
  const meshesRef = useRef(new Map<string, THREE.Mesh>());

  const register = useCallback((id: string, mesh: THREE.Mesh) => {
    meshesRef.current.set(id, mesh);
  }, []);

  const unregister = useCallback((id: string) => {
    meshesRef.current.delete(id);
  }, []);

  const getMesh = useCallback((id: string) => {
    return meshesRef.current.get(id);
  }, []);

  return (
    <TerrainMeshContext.Provider value={{ register, unregister, getMesh }}>
      {children}
    </TerrainMeshContext.Provider>
  );
};

export function useTerrainMeshContext(): TerrainMeshContextValue {
  const context = useContext(TerrainMeshContext);
  if (!context) {
    throw new Error('useTerrainMeshContext must be used within TerrainMeshProvider');
  }
  return context;
}
