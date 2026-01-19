import React, { useLayoutEffect, useState } from 'react';
import { useBattleStore } from '../../stores';
import { User, Bot } from 'lucide-react';

/**
 * Props for the AnimationLayer component.
 * @property {React.RefObject<HTMLDivElement>} gridRef - A ref to the scrollable grid container element.
 */
interface AnimationLayerProps {
  gridRef: React.RefObject<HTMLDivElement>;
}

/**
 * An SVG overlay component for rendering battle animations like movement paths and laser shots.
 * It positions itself over the battle grid and calculates animation coordinates based on grid cell size.
 * @param {AnimationLayerProps} props - The component props.
 * @returns {React.ReactElement | null} The rendered SVG layer or null if no animation is active.
 */
const AnimationLayer: React.FC<AnimationLayerProps> = ({ gridRef }) => {
  const animation = useBattleStore((state) => state.animation);
  const animatingParticipantId = useBattleStore((state) => state.animatingParticipantId);
  const gridSize = useBattleStore(state => state.battle?.gridSize);
  const participants = useBattleStore(state => state.battle?.participants);
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);
  const [gridContentRect, setGridContentRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    const gridContainer = gridRef.current;
    if (!gridContainer) return;

    // Find the actual grid content element which has the CSS grid layout
    const gridContentElement = gridContainer.querySelector('[data-testid="battle-grid-content"]') as HTMLDivElement;
    if (!gridContentElement) return;

    const updateRects = () => {
      if (!gridRef.current) return;
      setContainerRect(gridRef.current.getBoundingClientRect());
      setGridContentRect(gridContentElement.getBoundingClientRect());
    };

    // Use ResizeObserver to automatically update rects when the grid content's size changes.
    // This is robust against timing issues where the grid might render with 0 width initially.
    const observer = new ResizeObserver(updateRects);
    observer.observe(gridContentElement);

    // Initial call to set the dimensions right away
    updateRects();

    const scrollContainer = gridContainer.parentElement;

    // Also update on scroll and window resize for positioning changes
    window.addEventListener('resize', updateRects);
    scrollContainer?.addEventListener('scroll', updateRects);

    return () => {
      // Cleanup all listeners
      observer.disconnect();
      window.removeEventListener('resize', updateRects);
      scrollContainer?.removeEventListener('scroll', updateRects);
    };
  }, [gridRef]);

  if (!animation || !containerRect || !gridContentRect || gridContentRect.width === 0 || !gridSize || !participants) {
    return null;
  }

  const offsetX = gridContentRect.left - containerRect.left;
  const offsetY = gridContentRect.top - containerRect.top;

  const cellWidth = gridContentRect.width / gridSize.width;
  const cellHeight = gridContentRect.height / gridSize.height;

  const getPixelPos = (pos: { x: number; y: number }) => ({
    cx: offsetX + (pos.x + 0.5) * cellWidth,
    cy: offsetY + (pos.y + 0.5) * cellHeight,
  });

  const participant = participants.find(p => p.id === animatingParticipantId);

  return (
    <svg
      className='absolute top-0 left-0 w-full h-full pointer-events-none z-20'
      width={containerRect.width}
      height={containerRect.height}
    >
      {animation.type === 'move' && participant && animation.path.length > 1 &&
        (() => {
          const startPoint = getPixelPos(animation.path[0]);
          const relativePath = `M 0 0 L ${animation.path
            .slice(1)
            .map(p => {
              const point = getPixelPos(p);
              return `${point.cx - startPoint.cx} ${point.cy - startPoint.cy}`;
            })
            .join(' L ')}`;

          return (
            <g key={animation.id}>
              <path
                d={`M${animation.path.map(p => `${getPixelPos(p).cx} ${getPixelPos(p).cy}`).join(' L')}`}
                fill='none'
                stroke='hsl(var(--color-primary) / 0.5)'
                strokeWidth='3'
                strokeDasharray='5 5'
              />
              <g transform={`translate(${startPoint.cx}, ${startPoint.cy})`}>
                <animateMotion
                  dur='1s'
                  path={relativePath}
                  fill='freeze'
                />
                <circle cx='0' cy='0' r={cellWidth * 0.375} fill={participant.type === 'enemy' ? 'hsl(var(--color-danger))' : 'hsl(var(--color-primary))'} />
                <foreignObject x={-cellWidth / 4} y={-cellWidth / 4} width={cellWidth / 2} height={cellWidth / 2} className='text-text-inverted'>
                  {participant.type === 'enemy' ? <Bot size='100%' /> : <User size='100%' />}
                </foreignObject>
              </g>
            </g>
          );
        })()
      }
      {animation.type === 'shoot' && (
        <line
          key={animation.id}
          x1={getPixelPos(animation.from).cx}
          y1={getPixelPos(animation.from).cy}
          x2={getPixelPos(animation.to).cx}
          y2={getPixelPos(animation.to).cy}
          stroke='hsl(var(--color-warning))'
          strokeWidth='3'
          className='laser'
          strokeLinecap='round'
        />
      )}
    </svg>
  );
};

export default AnimationLayer;
