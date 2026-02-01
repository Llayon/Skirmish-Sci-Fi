import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { Plane, Vector3 } from 'three';
import { TILE_SIZE } from '@/constants/three';
import { isValidGridPos, worldToGrid } from '@/services/three/coordinates';
import type { GridSize, Position } from '@/types/battle';

interface RaycastControllerProps {
  gridSize: GridSize;
  onCellHover: (pos: Position | null) => void;
  onCellClick: (pos: Position) => void;
}

function useThrottle<T extends (...args: any[]) => any>(func: T, delay: number): [T, () => void] {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const throttled = useCallback(
    ((...args: any[]) => {
      if (timeoutRef.current) return;
      func(...args);
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
      }, delay);
    }) as T,
    [delay, func]
  );

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return [throttled, cleanup];
}

export const RaycastController = ({ gridSize, onCellHover, onCellClick }: RaycastControllerProps) => {
  const { camera, raycaster } = useThree();
  const intersectionRef = useRef(new Vector3());

  const onCellHoverRef = useRef(onCellHover);
  useEffect(() => {
    onCellHoverRef.current = onCellHover;
  }, [onCellHover]);

  const hoverCallback = useCallback((pos: Position | null) => onCellHoverRef.current(pos), []);

  const [throttledHover, cleanupThrottle] = useThrottle(hoverCallback, 50);

  useEffect(() => {
    return () => {
      cleanupThrottle();
    };
  }, [cleanupThrottle]);

  const pickingPlane = useMemo(() => new Plane(new Vector3(0, 1, 0), 0), []);

  const handlePointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      raycaster.setFromCamera(event.pointer, camera);
      const hit = raycaster.ray.intersectPlane(pickingPlane, intersectionRef.current);

      if (!hit) {
        cleanupThrottle();
        onCellHoverRef.current(null);
        return;
      }

      const gridPos = worldToGrid(intersectionRef.current, gridSize);
      if (isValidGridPos(gridPos, gridSize)) {
        throttledHover(gridPos);
      } else {
        cleanupThrottle();
        onCellHoverRef.current(null);
      }
    },
    [camera, cleanupThrottle, gridSize, pickingPlane, raycaster, throttledHover]
  );

  const handlePointerOut = useCallback(() => {
    cleanupThrottle();
    onCellHoverRef.current(null);
  }, [cleanupThrottle]);

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      raycaster.setFromCamera(event.pointer, camera);
      const hit = raycaster.ray.intersectPlane(pickingPlane, intersectionRef.current);

      if (!hit) return;

      const gridPos = worldToGrid(intersectionRef.current, gridSize);
      if (isValidGridPos(gridPos, gridSize)) {
        onCellClick(gridPos);
      }
    },
    [camera, gridSize, onCellClick, pickingPlane, raycaster]
  );

  return (
    <mesh
      position={[0, 0, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <planeGeometry args={[gridSize.width * TILE_SIZE, gridSize.height * TILE_SIZE]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
};
