import type { GridSize, Position, ParticipantStatus } from './battle';

export type Terrain3DType = 'Wall' | 'Barrel' | 'Container' | 'Obstacle' | 'Floor';

export interface Terrain3D {
  id: string;
  type: Terrain3DType;
  position: Position;
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
  isAnimating: boolean;
  vitality: UnitVitality3D;
}

export interface BattleView3D {
  gridSize: GridSize;
  terrain: Terrain3D[];
  units: Unit3D[];
  availableMoves: Position[];
}

