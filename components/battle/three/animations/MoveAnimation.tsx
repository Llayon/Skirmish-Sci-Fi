import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { gridToWorld } from '@/services/three/coordinates';
import type { GridSize, Position } from '@/types/battle';
import { useParticipantMeshContext } from '../contexts/ParticipantMeshContext';

interface MoveAnimationProps {
  unitId: string;
  path: Position[];
  gridSize: GridSize;
  durationMs: number;
}

export const MoveAnimation = ({ unitId, path, gridSize, durationMs }: MoveAnimationProps) => {
  const { getMesh } = useParticipantMeshContext();

  const mesh = useMemo(() => getMesh(unitId), [getMesh, unitId]);
  const completedRef = useRef(false);
  const elapsedRef = useRef(0);

  const worldPoints = useMemo(() => {
    return path.map((p) => gridToWorld(p, gridSize, 0));
  }, [gridSize, path]);

  const { cumulative, totalDistance } = useMemo(() => {
    const distances: number[] = [0];
    let total = 0;
    for (let i = 1; i < worldPoints.length; i++) {
      total += worldPoints[i]!.distanceTo(worldPoints[i - 1]!);
      distances.push(total);
    }
    return { cumulative: distances, totalDistance: total };
  }, [worldPoints]);

  useEffect(() => {
    completedRef.current = false;
    elapsedRef.current = 0;
  }, [unitId, path, durationMs]);

  useFrame((_, delta) => {
    if (!mesh) return;
    if (completedRef.current) return;
    if (worldPoints.length < 2) return;
    if (totalDistance <= 0) return;

    elapsedRef.current += delta * 1000;
    const t = Math.min(1, elapsedRef.current / durationMs);
    const targetDistance = totalDistance * t;

    let segmentIndex = 0;
    for (let i = 1; i < cumulative.length; i++) {
      if (cumulative[i]! >= targetDistance) {
        segmentIndex = i - 1;
        break;
      }
      segmentIndex = i - 1;
    }

    const segStartDist = cumulative[segmentIndex] ?? 0;
    const segEndDist = cumulative[segmentIndex + 1] ?? totalDistance;
    const segT = segEndDist === segStartDist ? 1 : (targetDistance - segStartDist) / (segEndDist - segStartDist);

    const a = worldPoints[segmentIndex] ?? new Vector3();
    const b = worldPoints[segmentIndex + 1] ?? a;
    const pos = a.clone().lerp(b, segT);
    mesh.position.set(pos.x, pos.y, pos.z);

    if (t >= 1) {
      completedRef.current = true;
    }
  });

  return null;
};
