import { useCallback, useEffect, useRef } from 'react';
import type * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { CHARACTER_HEIGHT } from '@/constants/three';
import { gridToWorld } from '@/services/three/coordinates';
import type { GridSize, Position } from '@/types/battle';
import type { Unit3D } from '@/types/battle3d';
import { useParticipantMeshContext } from './contexts/ParticipantMeshContext';

interface ParticipantMeshProps {
  unit: Unit3D;
  gridSize: GridSize;
  onClick: (id: string, pos: Position) => void;
  onHover: (pos: Position | null) => void;
}

export const ParticipantMesh = ({ unit, gridSize, onClick, onHover }: ParticipantMeshProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const { register, unregister } = useParticipantMeshContext();

  useEffect(() => {
    if (groupRef.current) {
      register(unit.id, groupRef.current);
      return () => unregister(unit.id);
    }
  }, [unit.id, register, unregister]);

  useEffect(() => {
    if (!groupRef.current || unit.isAnimating) return;
    const position = gridToWorld(unit.position, gridSize, 0);
    groupRef.current.position.set(position.x, position.y, position.z);
  }, [gridSize, unit.isAnimating, unit.position]);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onClick(unit.id, unit.position);
    },
    [onClick, unit.id, unit.position]
  );

  const isCasualty = unit.status === 'casualty';

  return (
    <group
      ref={groupRef}
      onClick={handleClick}
      onPointerEnter={() => onHover(unit.position)}
      onPointerLeave={() => onHover(null)}
      rotation={isCasualty ? [Math.PI / 2, 0, 0] : [0, 0, 0]}
    >
      <mesh castShadow position={[0, CHARACTER_HEIGHT / 2, 0]}>
        <capsuleGeometry args={[0.3, 0.8, 4, 8]} />
        <meshStandardMaterial
          color={getUnitColor(unit)}
          emissive={unit.isHovered ? '#0ea5e9' : '#000000'}
          emissiveIntensity={unit.isHovered ? 0.35 : 0}
          transparent={isCasualty}
          opacity={isCasualty ? 0.5 : 1}
        />
      </mesh>

      {unit.isHovered && !unit.isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[0.45, 0.6, 48]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.45} toneMapped={false} />
        </mesh>
      )}

      {unit.isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[0.42, 0.6, 48]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.9} toneMapped={false} />
        </mesh>
      )}

      {unit.isActive && !unit.isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[0.52, 0.7, 48]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.55} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
};

function getUnitColor(unit: Unit3D): string {
  if (unit.status === 'casualty') return '#666666';
  if (unit.isSelected) return '#34d399';
  if (unit.isActive) return '#fbbf24';
  return unit.type === 'character' ? '#4a90d9' : '#d94a4a';
}
