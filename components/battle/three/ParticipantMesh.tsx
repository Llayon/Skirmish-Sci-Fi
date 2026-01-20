import { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
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
  onInspect: (id: string, pos: Position, screen: { x: number; y: number }) => void;
  onHover: (pos: Position | null) => void;
  isValidTarget: boolean;
}

export const ParticipantMesh = ({ unit, gridSize, onClick, onInspect, onHover, isValidTarget }: ParticipantMeshProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const { register, unregister } = useParticipantMeshContext();
  const gestureRef = useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
    longPressed: boolean;
    timer: ReturnType<typeof setTimeout> | null;
  }>({ pointerId: null, startX: 0, startY: 0, longPressed: false, timer: null });

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

  const clearGestureTimer = useCallback(() => {
    if (gestureRef.current.timer) clearTimeout(gestureRef.current.timer);
    gestureRef.current.timer = null;
  }, []);

  useEffect(() => {
    return () => {
      clearGestureTimer();
    };
  }, [clearGestureTimer]);

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (unit.status === 'casualty') return;
      gestureRef.current.pointerId = e.pointerId;
      gestureRef.current.startX = e.clientX;
      gestureRef.current.startY = e.clientY;
      gestureRef.current.longPressed = false;
      clearGestureTimer();
      gestureRef.current.timer = setTimeout(() => {
        gestureRef.current.longPressed = true;
        onInspect(unit.id, unit.position, { x: gestureRef.current.startX, y: gestureRef.current.startY });
      }, 450);
    },
    [clearGestureTimer, onInspect, unit.id, unit.position, unit.status]
  );

  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (gestureRef.current.pointerId !== e.pointerId) return;
    const dx = e.clientX - gestureRef.current.startX;
    const dy = e.clientY - gestureRef.current.startY;
    if (dx * dx + dy * dy > 64) {
      clearGestureTimer();
    }
  }, [clearGestureTimer]);

  const handlePointerUp = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (gestureRef.current.pointerId !== e.pointerId) return;
      clearGestureTimer();
      e.stopPropagation();
      if (gestureRef.current.longPressed) {
        gestureRef.current.pointerId = null;
        gestureRef.current.longPressed = false;
        return;
      }
      onClick(unit.id, unit.position);
      gestureRef.current.pointerId = null;
      gestureRef.current.longPressed = false;
    },
    [clearGestureTimer, onClick, unit.id, unit.position]
  );

  const handlePointerCancel = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (gestureRef.current.pointerId !== e.pointerId) return;
      clearGestureTimer();
      gestureRef.current.pointerId = null;
      gestureRef.current.longPressed = false;
    },
    [clearGestureTimer]
  );

  const isCasualty = unit.status === 'casualty';

  return (
    <group
      ref={groupRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerEnter={() => onHover(unit.position)}
      onPointerLeave={() => onHover(null)}
      rotation={isCasualty ? [Math.PI / 2, 0, 0] : [0, 0, 0]}
    >
      {!isCasualty && (unit.isHovered || unit.isSelected || unit.isActive || isValidTarget) && (
        <mesh castShadow={false} position={[0, CHARACTER_HEIGHT / 2, 0]} scale={[1.12, 1.06, 1.12]} renderOrder={10}>
          <capsuleGeometry args={[0.3, 0.8, 4, 8]} />
          <meshBasicMaterial
            color={
              unit.isSelected
                ? '#22c55e'
                : isValidTarget
                  ? '#ef4444'
                  : unit.isActive
                    ? '#f59e0b'
                    : '#38bdf8'
            }
            transparent
            opacity={unit.isSelected ? 0.55 : isValidTarget ? 0.38 : unit.isActive ? 0.32 : 0.28}
            side={THREE.BackSide}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}

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

      {isValidTarget && !isCasualty && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
          <ringGeometry args={[0.72, 0.82, 56]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.35} toneMapped={false} />
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
