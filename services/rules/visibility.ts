import { Battle, BattleParticipant, Position, Terrain } from '../../types';
import { distance, isPointInTerrain } from '../gridUtils';
import { getProtectiveDeviceById } from '../data/items';

// Helper function, kept private to the domain
function isAtEdgeOfArea(position: Position, areaTerrain: Terrain, battle: Battle): boolean {
    if (!isPointInTerrain(position, areaTerrain)) return false;

    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;

            const adjacentPos = { x: position.x + dx, y: position.y + dy };

            if (adjacentPos.x < 0 || adjacentPos.x >= battle.gridSize.width || adjacentPos.y < 0 || adjacentPos.y >= battle.gridSize.height) {
                return true;
            }

            if (!isPointInTerrain(adjacentPos, areaTerrain)) {
                const isBlockedByImpassable = battle.terrain.some(t => t.isImpassable && isPointInTerrain(adjacentPos, t));
                if (!isBlockedByImpassable) {
                    return true;
                }
            }
        }
    }
    return false;
};

// Helper function, kept private to the domain
function chebyshevDistanceToRect(point: Position, rect: {x:number, y:number, width:number, height:number}): number {
    const dx = Math.max(rect.x - point.x, 0, point.x - (rect.x + rect.width - 1));
    const dy = Math.max(rect.y - point.y, 0, point.y - (rect.y + rect.height - 1));
    return Math.max(dx, dy);
}


/**
 * Checks for a clear line of sight between two participants, considering terrain and other figures.
 */
export const hasLineOfSight = (from: BattleParticipant, to: BattleParticipant, battle: Battle): boolean => {
    if (battle.maxVisibility && distance(from.position, to.position) > battle.maxVisibility) {
        // Gloom rule: "Characters that fire can be fired upon at any range, however."
        if (to.hasFiredThisRound) {
            // Visibility is ignored for this target, but LoS can still be blocked by terrain.
        } else {
            return false;
        }
    }
    
    const fromTerrain = battle.terrain.find(t => (t.type === 'Area' || t.type === 'Interior') && isPointInTerrain(from.position, t));
    const toTerrain = battle.terrain.find(t => (t.type === 'Area' || t.type === 'Interior') && isPointInTerrain(to.position, t));

    if (fromTerrain && toTerrain && fromTerrain.id === toTerrain.id) {
        if (fromTerrain.type === 'Area' && distance(from.position, to.position) > 3) {
            return false;
        }
    } else if (fromTerrain && !isAtEdgeOfArea(from.position, fromTerrain, battle)) {
        return false;
    } else if (toTerrain && !isAtEdgeOfArea(to.position, toTerrain, battle)) {
        return false;
    }

    const blockingTerrain = battle.terrain.filter(t => t.blocksLineOfSight);
    const otherParticipants = battle.participants.filter(p => p.id !== from.id && p.id !== to.id && p.status !== 'casualty');

    const x1 = from.position.x, y1 = from.position.y;
    const x2 = to.position.x, y2 = to.position.y;
    const dx = Math.abs(x2 - x1), sx = x1 < x2 ? 1 : -1;
    const dy = -Math.abs(y2 - y1), sy = y1 < y2 ? 1 : -1;
    let err = dx + dy, x = x1, y = y1;

    while (true) {
        if (!((x === x1 && y === y1) || (x === x2 && y === y2))) {
            const pointOnLine = { x, y };
            for (const terrain of blockingTerrain) {
                if (isPointInTerrain(pointOnLine, terrain)) {
                    if (terrain.type === 'Door') {
                        const fromIsAdj = distance(from.position, terrain.position) <= 1;
                        const toIsAdj = distance(to.position, terrain.position) <= 1;
                        if (fromIsAdj || toIsAdj) continue;
                    }
                    return false;
                }
            }
            if (otherParticipants.some(p => p.position.x === x && p.position.y === y)) return false;
        }
        if (x === x2 && y === y2) break;
        let e2 = 2 * err;
        if (e2 >= dy) { err += dy; x += sx; }
        if (e2 <= dx) { err += dx; y += sy; }
    }
    return true;
}

/**
 * Calculates if a target has cover from an attacker.
 */
export const calculateCover = (attacker: BattleParticipant, target: BattleParticipant, battle: Battle): boolean => {
    if (!hasLineOfSight(attacker, target, battle)) return false;

    const terrainTargetIsIn = battle.terrain.find(t => isPointInTerrain(target.position, t));
    if (terrainTargetIsIn && terrainTargetIsIn.providesCover) return true;
    
    const screen = target.screen ? getProtectiveDeviceById(target.screen) : undefined;
    if (screen?.traits?.includes('camo_cloak') && distance(attacker.position, target.position) > 4) {
        const allCoverTerrain = battle.terrain.filter(t => t.providesCover || t.type === 'Area');
        const isNearCover = allCoverTerrain.some(t => {
            const rect = {x: t.position.x, y: t.position.y, width: t.size.width, height: t.size.height };
            return chebyshevDistanceToRect(target.position, rect) <= 2;
        });
        if (isNearCover) return true;
    }

    const coverProvidingTerrain = battle.terrain.filter(t => t.providesCover);
    if (coverProvidingTerrain.length === 0) return false;
    
    const x1 = attacker.position.x, y1 = attacker.position.y;
    const x2 = target.position.x, y2 = target.position.y;
    const dx = Math.abs(x2 - x1), sx = x1 < x2 ? 1 : -1;
    const dy = -Math.abs(y2 - y1), sy = y1 < y2 ? 1 : -1;
    let err = dx + dy, x = x1, y = y1;

    while (true) {
        if (!((x === x1 && y === y1) || (x === x2 && y === y2))) {
           if (coverProvidingTerrain.some(t => isPointInTerrain({ x, y }, t))) return true;
        }
        if (x === x2 && y === y2) break;
        let e2 = 2 * err;
        if (e2 >= dy) { err += dy; x += sx; }
        if (e2 <= dx) { err += dx; y += sy; }
    }
    return false;
}