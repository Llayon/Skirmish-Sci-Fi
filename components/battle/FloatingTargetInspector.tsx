import React, { useEffect, useRef } from 'react';
import type { BattleParticipant } from '@/types';
import TargetInspector from './TargetInspector';

type FloatingTargetInspectorProps = {
  participant: BattleParticipant;
  pinned?: boolean;
  pinnedPosition?: { x: number; y: number } | null;
  offsetX?: number;
  offsetY?: number;
};

const FloatingTargetInspector: React.FC<FloatingTargetInspectorProps> = ({
  participant,
  pinned,
  pinnedPosition,
  offsetX = 20,
  offsetY = 20,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (pinned && pinnedPosition) {
      el.style.transform = `translate3d(${pinnedPosition.x + offsetX}px, ${pinnedPosition.y + offsetY}px, 0)`;
      return;
    }

    const updatePosition = () => {
      rafRef.current = null;
      el.style.transform = `translate3d(${lastXRef.current + offsetX}px, ${lastYRef.current + offsetY}px, 0)`;
    };

    const onPointerMove = (event: PointerEvent) => {
      lastXRef.current = event.clientX;
      lastYRef.current = event.clientY;
      if (rafRef.current != null) return;
      rafRef.current = window.requestAnimationFrame(updatePosition);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [offsetX, offsetY, pinned, pinnedPosition]);

  return (
    <div
      ref={containerRef}
      className="fixed pointer-events-none z-50 will-change-transform"
      style={{ top: 0, left: 0, transform: 'translate3d(-9999px, -9999px, 0)' }}
    >
      <TargetInspector participant={participant} pinned={pinned} />
    </div>
  );
};

export default FloatingTargetInspector;
