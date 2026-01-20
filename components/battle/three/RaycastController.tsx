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
  onCellInspect: (pos: Position, screen: { x: number; y: number }) => void;
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

export const RaycastController = ({ gridSize, onCellHover, onCellClick, onCellInspect }: RaycastControllerProps) => {
  const { camera, raycaster } = useThree();
  const intersectionRef = useRef(new Vector3());
  const gestureRef = useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
    longPressed: boolean;
    timer: ReturnType<typeof setTimeout> | null;
  }>({ pointerId: null, startX: 0, startY: 0, longPressed: false, timer: null });

  const onCellHoverRef = useRef(onCellHover);
  useEffect(() => {
    onCellHoverRef.current = onCellHover;
  }, [onCellHover]);

  const hoverCallback = useCallback((pos: Position | null) => onCellHoverRef.current(pos), []);

  const [throttledHover, cleanupThrottle] = useThrottle(hoverCallback, 50);

  useEffect(() => {
    return () => {
      cleanupThrottle();
      if (gestureRef.current.timer) clearTimeout(gestureRef.current.timer);
      gestureRef.current.timer = null;
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

  const clearGestureTimer = useCallback(() => {
    if (gestureRef.current.timer) clearTimeout(gestureRef.current.timer);
    gestureRef.current.timer = null;
  }, []);

  const pickCell = useCallback(
    (event: ThreeEvent<PointerEvent | MouseEvent>) => {
      raycaster.setFromCamera((event as any).pointer, camera);
      const hit = raycaster.ray.intersectPlane(pickingPlane, intersectionRef.current);
      if (!hit) return null;
      const gridPos = worldToGrid(intersectionRef.current, gridSize);
      if (!isValidGridPos(gridPos, gridSize)) return null;
      return gridPos;
    },
    [camera, gridSize, pickingPlane, raycaster]
  );

  const handlePointerDown = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      const pos = pickCell(event);
      if (!pos) return;
      gestureRef.current.pointerId = event.pointerId;
      gestureRef.current.startX = event.clientX;
      gestureRef.current.startY = event.clientY;
      gestureRef.current.longPressed = false;
      clearGestureTimer();
      gestureRef.current.timer = setTimeout(() => {
        gestureRef.current.longPressed = true;
        onCellInspect(pos, { x: gestureRef.current.startX, y: gestureRef.current.startY });
      }, 450);
    },
    [clearGestureTimer, onCellInspect, pickCell]
  );

  const handlePointerMoveWithCancel = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (gestureRef.current.pointerId === event.pointerId) {
        const dx = event.clientX - gestureRef.current.startX;
        const dy = event.clientY - gestureRef.current.startY;
        if (dx * dx + dy * dy > 64) {
          clearGestureTimer();
        }
      }
      handlePointerMove(event);
    },
    [clearGestureTimer, handlePointerMove]
  );

  const handlePointerUp = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (gestureRef.current.pointerId !== event.pointerId) return;
      clearGestureTimer();
      event.stopPropagation();
      if (gestureRef.current.longPressed) {
        gestureRef.current.pointerId = null;
        gestureRef.current.longPressed = false;
        return;
      }
      const pos = pickCell(event);
      if (pos) onCellClick(pos);
      gestureRef.current.pointerId = null;
      gestureRef.current.longPressed = false;
    },
    [clearGestureTimer, onCellClick, pickCell]
  );

  const handlePointerCancel = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (gestureRef.current.pointerId !== event.pointerId) return;
      clearGestureTimer();
      gestureRef.current.pointerId = null;
      gestureRef.current.longPressed = false;
    },
    [clearGestureTimer]
  );

  return (
    <mesh
      position={[0, 0, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerMove={handlePointerMoveWithCancel}
      onPointerOut={handlePointerOut}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <planeGeometry args={[gridSize.width * TILE_SIZE, gridSize.height * TILE_SIZE]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
};
