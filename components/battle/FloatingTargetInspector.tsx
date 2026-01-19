import React, { useEffect, useRef } from 'react';
import type { BattleParticipant } from '@/types';
import TargetInspector from './TargetInspector';

type FloatingTargetInspectorProps = {
  participant: BattleParticipant;
  offsetX?: number;
  offsetY?: number;
};

const FloatingTargetInspector: React.FC<FloatingTargetInspectorProps> = ({ participant, offsetX = 20, offsetY = 20 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updatePosition = () => {
      rafRef.current = null;
      el.style.transform = `translate3d(${lastXRef.current + offsetX}px, ${lastYRef.current + offsetY}px, 0)`;
    };

    const onMouseMove = (event: MouseEvent) => {
      lastXRef.current = event.clientX;
      lastYRef.current = event.clientY;
      if (rafRef.current != null) return;
      rafRef.current = window.requestAnimationFrame(updatePosition);
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [offsetX, offsetY]);

  return (
    <div
      ref={containerRef}
      className="fixed pointer-events-none z-50 will-change-transform"
      style={{ top: 0, left: 0, transform: 'translate3d(-9999px, -9999px, 0)' }}
    >
      <TargetInspector participant={participant} />
    </div>
  );
};

export default FloatingTargetInspector;

