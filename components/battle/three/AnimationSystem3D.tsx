import { useEffect } from 'react';
import { useBattleStore } from '@/stores';
import { MoveAnimation } from './animations/MoveAnimation';
import type { GridSize } from '@/types/battle';

interface AnimationSystem3DProps {
  gridSize: GridSize;
}

export const AnimationSystem3D = ({ gridSize }: AnimationSystem3DProps) => {
  const animation = useBattleStore((s) => s.animation);
  const animatingParticipantId = useBattleStore((s) => s.animatingParticipantId);
  const { clearAnimation } = useBattleStore((s) => s.actions);

  useEffect(() => {
    if (!animation || !animatingParticipantId) return;
    if (animation.type !== 'move') {
      clearAnimation();
    }
  }, [animatingParticipantId, animation, clearAnimation]);

  if (!animation || !animatingParticipantId) return null;
  if (animation.type !== 'move') return null;
  if (!animation.path || animation.path.length < 2) return null;

  return <MoveAnimation unitId={animatingParticipantId} path={animation.path} gridSize={gridSize} durationMs={1000} />;
};
