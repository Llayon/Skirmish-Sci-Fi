import { Html } from '@react-three/drei';
import { CHARACTER_HEIGHT } from '@/constants/three';
import { gridToWorld } from '@/services/three/coordinates';
import type { GridSize } from '@/types/battle';
import type { Unit3D } from '@/types/battle3d';

interface HPBars3DProps {
  units: Unit3D[];
  gridSize: GridSize;
}

export const HPBars3D = ({ units, gridSize }: HPBars3DProps) => {
  return (
    <>
      {units
        .filter((u) => !u.isAnimating && u.status !== 'casualty')
        .map((u) => {
          const worldPos = gridToWorld(u.position, gridSize, CHARACTER_HEIGHT + 0.5);
          const percentage = (u.vitality.current / u.vitality.max) * 100;

          return (
            <Html
              key={u.id}
              position={[worldPos.x, worldPos.y, worldPos.z]}
              center
              distanceFactor={10}
              style={{ pointerEvents: 'none' }}
            >
              <div className="bg-black/70 px-2 py-1 rounded text-xs whitespace-nowrap">
                <div className="w-16 h-1 bg-gray-700 rounded">
                  <div className="h-full bg-green-500 rounded" style={{ width: `${percentage}%` }} />
                </div>
                <div className="text-center mt-1 text-gray-300 text-[10px]">{u.vitality.label.toUpperCase()}</div>
              </div>
            </Html>
          );
        })}
    </>
  );
};
