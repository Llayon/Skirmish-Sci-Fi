import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { TILE_SIZE } from '@/constants/three';
import { gridToWorld } from '@/services/three/coordinates';
import type { GridSize, Position } from '@/types/battle';

interface MoveHighlightsProps {
  positions: Position[];
  coverPositions?: Position[];
  coverArrows?: { pos: Position; angle: number }[];
  pathPositions?: Position[] | null;
  gridSize: GridSize;
}

export const MoveHighlights = ({ positions, coverPositions, coverArrows, pathPositions, gridSize }: MoveHighlightsProps) => {
  const normalMeshRef = useRef<THREE.InstancedMesh>(null);
  const coverMeshRef = useRef<THREE.InstancedMesh>(null);
  const coverArrowMeshRef = useRef<THREE.InstancedMesh>(null);
  const pathMeshRef = useRef<THREE.InstancedMesh>(null);
  const pathRibbonMeshRef = useRef<THREE.InstancedMesh>(null);

  const coverKeySet = useMemo(() => {
    if (!coverPositions || coverPositions.length === 0) return new Set<string>();
    return new Set(coverPositions.map((p) => `${p.x},${p.y}`));
  }, [coverPositions]);

  const normalPositions = useMemo(() => {
    if (positions.length === 0) return [];
    if (coverKeySet.size === 0) return positions;
    return positions.filter((p) => !coverKeySet.has(`${p.x},${p.y}`));
  }, [coverKeySet, positions]);

  const coverOnlyPositions = useMemo(() => {
    if (!coverPositions || coverPositions.length === 0) return [];
    const allowed = new Set(positions.map((p) => `${p.x},${p.y}`));
    return coverPositions.filter((p) => allowed.has(`${p.x},${p.y}`));
  }, [coverPositions, positions]);

  useEffect(() => {
    if (!normalMeshRef.current || normalPositions.length === 0) return;

    const dummy = new THREE.Object3D();
    normalPositions.forEach((pos, i) => {
      const world = gridToWorld(pos, gridSize, 0.02);
      dummy.position.set(world.x, world.y, world.z);
      dummy.rotation.x = -Math.PI / 2;
      dummy.updateMatrix();
      normalMeshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    normalMeshRef.current.instanceMatrix.needsUpdate = true;
  }, [gridSize, normalPositions]);

  useEffect(() => {
    if (!coverMeshRef.current || coverOnlyPositions.length === 0) return;

    const dummy = new THREE.Object3D();
    coverOnlyPositions.forEach((pos, i) => {
      const world = gridToWorld(pos, gridSize, 0.021);
      dummy.position.set(world.x, world.y, world.z);
      dummy.rotation.x = -Math.PI / 2;
      dummy.updateMatrix();
      coverMeshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    coverMeshRef.current.instanceMatrix.needsUpdate = true;
  }, [coverOnlyPositions, gridSize]);

  useEffect(() => {
    if (!coverArrowMeshRef.current || !coverArrows || coverArrows.length === 0) return;

    const dummy = new THREE.Object3D();
    coverArrows.forEach(({ pos, angle }, i) => {
      const world = gridToWorld(pos, gridSize, 0.031);
      dummy.position.set(world.x, world.y, world.z);
      dummy.rotation.set(-Math.PI / 2, angle, 0);
      dummy.updateMatrix();
      coverArrowMeshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    coverArrowMeshRef.current.instanceMatrix.needsUpdate = true;
  }, [coverArrows, gridSize]);

  useEffect(() => {
    if (!pathMeshRef.current || !pathPositions || pathPositions.length === 0) return;

    const dummy = new THREE.Object3D();
    pathPositions.forEach((pos, i) => {
      const world = gridToWorld(pos, gridSize, 0.03);
      dummy.position.set(world.x, world.y, world.z);
      dummy.rotation.x = -Math.PI / 2;
      dummy.updateMatrix();
      pathMeshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    pathMeshRef.current.instanceMatrix.needsUpdate = true;
  }, [gridSize, pathPositions]);

  const pathSegments = useMemo(() => {
    if (!pathPositions || pathPositions.length < 2) return [];
    const segs: { mid: THREE.Vector3; angle: number; length: number }[] = [];
    for (let i = 0; i < pathPositions.length - 1; i++) {
      const a = gridToWorld(pathPositions[i], gridSize, 0.032);
      const b = gridToWorld(pathPositions[i + 1], gridSize, 0.032);
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const length = Math.sqrt(dx * dx + dz * dz);
      if (length <= 0.0001) continue;
      const mid = new THREE.Vector3((a.x + b.x) / 2, a.y, (a.z + b.z) / 2);
      const angle = Math.atan2(dx, dz);
      segs.push({ mid, angle, length });
    }
    return segs;
  }, [gridSize, pathPositions]);

  useEffect(() => {
    if (!pathRibbonMeshRef.current || pathSegments.length === 0) return;
    const dummy = new THREE.Object3D();
    pathSegments.forEach((seg, i) => {
      dummy.position.copy(seg.mid);
      dummy.rotation.set(-Math.PI / 2, seg.angle, 0);
      dummy.scale.set(1, seg.length, 1);
      dummy.updateMatrix();
      pathRibbonMeshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    pathRibbonMeshRef.current.instanceMatrix.needsUpdate = true;
  }, [pathSegments]);

  if (positions.length === 0 && (!pathPositions || pathPositions.length === 0)) return null;

  return (
    <group raycast={() => null}>
      {normalPositions.length > 0 && (
        <instancedMesh ref={normalMeshRef} args={[null!, null!, normalPositions.length]} raycast={() => null}>
          <planeGeometry args={[TILE_SIZE * 0.9, TILE_SIZE * 0.9]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.16} side={THREE.DoubleSide} toneMapped={false} />
        </instancedMesh>
      )}

      {coverOnlyPositions.length > 0 && (
        <instancedMesh ref={coverMeshRef} args={[null!, null!, coverOnlyPositions.length]} raycast={() => null}>
          <planeGeometry args={[TILE_SIZE * 0.9, TILE_SIZE * 0.9]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.18} side={THREE.DoubleSide} toneMapped={false} />
        </instancedMesh>
      )}

      {coverArrows && coverArrows.length > 0 && (
        <instancedMesh ref={coverArrowMeshRef} args={[null!, null!, coverArrows.length]} raycast={() => null}>
          <coneGeometry args={[0.16, 0.26, 3]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.55} toneMapped={false} />
        </instancedMesh>
      )}

      {pathSegments.length > 0 && (
        <instancedMesh ref={pathRibbonMeshRef} args={[null!, null!, pathSegments.length]} raycast={() => null}>
          <planeGeometry args={[TILE_SIZE * 0.22, 1]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.6} side={THREE.DoubleSide} toneMapped={false} />
        </instancedMesh>
      )}

      {pathPositions && pathPositions.length > 0 && (
        <instancedMesh ref={pathMeshRef} args={[null!, null!, pathPositions.length]} raycast={() => null}>
          <planeGeometry args={[TILE_SIZE * 0.55, TILE_SIZE * 0.55]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.3} side={THREE.DoubleSide} toneMapped={false} />
        </instancedMesh>
      )}
    </group>
  );
};
