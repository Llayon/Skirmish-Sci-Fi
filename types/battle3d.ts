import type { GridSize, Position, ParticipantStatus } from './battle';

export type Terrain3DType = 'Wall' | 'Barrel' | 'Container' | 'Obstacle' | 'Floor';

export interface Terrain3D {
  id: string;
  type: Terrain3DType;
  /** Top-left grid cell of the footprint (matches Terrain.position). */
  position: Position;
  /** Footprint in grid cells. Renderers should center geometry over the
   *  middle of this rectangle, not over the position cell. */
  size: { width: number; height: number };
  /**
   * World-space y-coordinate of the bottom of this piece (0 = ground).
   * Non-zero for pieces like roofs that sit above the ground (e.g. a
   * building roof has `baseElevation: 2`).
   */
  baseElevation: number;
  /** Vertical thickness of the piece above its base. Walls and crates
   *  have a visible height; flat floors/roofs are near-zero. */
  height: number;
}

export interface UnitVitality3D {
  current: number;
  max: number;
  label: string;
}

export interface Unit3D {
  id: string;
  type: 'character' | 'enemy';
  position: Position;
  status: ParticipantStatus;
  stunTokens: number;
  isSelected: boolean;
  isActive: boolean;
  isHovered: boolean;
  isAnimating: boolean;
  vitality: UnitVitality3D;
}

export interface BattleView3D {
  gridSize: GridSize;
  terrain: Terrain3D[];
  units: Unit3D[];
  availableMoves: Position[];
}
