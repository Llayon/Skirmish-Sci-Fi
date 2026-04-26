import type { Position } from '@/types/character';
import type { Terrain } from '@/types/battle';

/**
 * Whether the cell `point` lies within the rectangular footprint of
 * `terrain`. Multi-cell aware (uses `terrain.size`).
 */
export function isPointInTerrain(point: Position, terrain: Terrain): boolean {
    return (
        point.x >= terrain.position.x &&
        point.x < terrain.position.x + terrain.size.width &&
        point.y >= terrain.position.y &&
        point.y < terrain.position.y + terrain.size.height
    );
}
