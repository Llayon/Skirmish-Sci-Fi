import { Vector3 } from 'three';
import { TILE_SIZE } from '@/constants/three';
import type { GridSize, Position } from '@/types/battle';

export function gridToWorld(pos: Position, gridSize: GridSize, height = 0): Vector3 {
  const halfWidth = (gridSize.width * TILE_SIZE) / 2;
  const halfHeight = (gridSize.height * TILE_SIZE) / 2;

  const x = -halfWidth + TILE_SIZE / 2 + pos.x * TILE_SIZE;
  const z = -halfHeight + TILE_SIZE / 2 + pos.y * TILE_SIZE;

  return new Vector3(x, height, z);
}

export function worldToGrid(world: Vector3, gridSize: GridSize): Position {
  const halfWidth = (gridSize.width * TILE_SIZE) / 2;
  const halfHeight = (gridSize.height * TILE_SIZE) / 2;

  const x = Math.floor((world.x + halfWidth) / TILE_SIZE);
  const y = Math.floor((world.z + halfHeight) / TILE_SIZE);

  return { x, y };
}

export function isValidGridPos(pos: Position, gridSize: GridSize): boolean {
  return pos.x >= 0 && pos.x < gridSize.width && pos.y >= 0 && pos.y < gridSize.height;
}

