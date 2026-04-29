export * from './items';
export * from './character';
export * from './campaign';
export * from './battle';
export * from './battle3d';
export * from './multiplayer';

import type { FeatureType } from './battle';
import type { Position } from './character';

export type TacticalAnchorType = 'sniper_nest' | 'objective_point' | 'choke_anchor' | 'danger_zone';

export type InteractiveTerrainType = 'door' | 'explosive_barrel' | 'hackable_turret' | 'lockable_door';

export interface TacticalZoneSpec {
  id: string;
  bounds: { x: number; y: number; width: number; height: number };
  requirements: {
    minCoverCells: number;
    maxCoverCells: number;
    needsElevation: boolean;
    minPathsTo: string[];
    chokepointCount: number;
    anchorChance: number;
  };
  themeWeights: Partial<Record<FeatureType, number>>;
}

export interface PlacedAnchor {
  type: TacticalAnchorType;
  position: Position;
  zoneId: string;
}
