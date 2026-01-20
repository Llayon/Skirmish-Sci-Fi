import React, { useEffect, useRef } from 'react';
import type { BattleParticipant } from '@/types';
import type { Position, Terrain } from '@/types/battle';
import TileInspector from './TileInspector';

type FloatingTileInspectorProps = {
  pos: Position;
  terrain: Terrain | null;
  occupiedBy: BattleParticipant | null;
  isReachable: boolean;
  isCoverSpot: boolean;
  pinnedPosition: { x: number; y: number } | null;
  offsetX?: number;
  offsetY?: number;
};

const FloatingTileInspector: React.FC<FloatingTileInspectorProps> = ({
  pos,
  terrain,
  occupiedBy,
  isReachable,
  isCoverSpot,
  pinnedPosition,
  offsetX = 20,
  offsetY = 20,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!pinnedPosition) {
      el.style.transform = 'translate3d(-9999px, -9999px, 0)';
      return;
    }
    el.style.transform = `translate3d(${pinnedPosition.x + offsetX}px, ${pinnedPosition.y + offsetY}px, 0)`;
  }, [offsetX, offsetY, pinnedPosition]);

  return (
    <div ref={containerRef} className="fixed pointer-events-none z-50 will-change-transform" style={{ top: 0, left: 0 }}>
      <TileInspector pos={pos} terrain={terrain} occupiedBy={occupiedBy} isReachable={isReachable} isCoverSpot={isCoverSpot} />
    </div>
  );
};

export default FloatingTileInspector;

