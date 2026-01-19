import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { TILE_SIZE } from '@/constants/three';
import { useBattleStore } from '@/stores';
import { gridToWorld } from '@/services/three/coordinates';
import type { GridSize } from '@/types/battle';

interface CameraCommands3DProps {
  gridSize: GridSize;
}

export const CameraCommands3D = ({ gridSize }: CameraCommands3DProps) => {
  const command = useBattleStore((s) => s.camera3dCommand);
  const { clearCameraCommand } = useBattleStore((s) => s.actions);
  const followActive3D = useBattleStore((s) => s.followActive3D);
  const activeParticipantId = useBattleStore((s) => s.battle?.activeParticipantId ?? null);
  const participants = useBattleStore((s) => s.battle?.participants ?? []);

  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | undefined;
  const camera = useThree((s) => s.camera);

  const defaultOffset = useMemo(() => {
    const maxDim = Math.max(gridSize.width, gridSize.height) * TILE_SIZE;
    const y = Math.max(6, maxDim * 1.2);
    return { x: 0, y, z: y };
  }, [gridSize.height, gridSize.width]);

  useEffect(() => {
    if (!command) return;

    try {
      if (command.type === 'reset') {
        if (controls) {
          controls.target.set(0, 0, 0);
          controls.update();
        }
        camera.position.set(defaultOffset.x, defaultOffset.y, defaultOffset.z);
      }

      if (command.type === 'focus') {
        const target = gridToWorld(command.target, gridSize, 0);
        if (controls) {
          controls.target.set(target.x, target.y, target.z);
          controls.update();
        }
        camera.position.set(target.x + defaultOffset.x, target.y + defaultOffset.y, target.z + defaultOffset.z);
      }
    } finally {
      clearCameraCommand();
    }
  }, [camera, clearCameraCommand, command, controls, defaultOffset.x, defaultOffset.y, defaultOffset.z, gridSize]);

  useEffect(() => {
    if (!followActive3D) return;
    if (!activeParticipantId) return;
    const active = participants.find((p) => p.id === activeParticipantId);
    if (!active) return;

    const target = gridToWorld(active.position, gridSize, 0);
    if (controls) {
      controls.target.set(target.x, target.y, target.z);
      controls.update();
    }
    camera.position.set(target.x + defaultOffset.x, target.y + defaultOffset.y, target.z + defaultOffset.z);
  }, [activeParticipantId, camera, controls, defaultOffset.x, defaultOffset.y, defaultOffset.z, followActive3D, gridSize, participants]);

  return null;
};
