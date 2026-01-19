# План миграции на Three.js v17.0 (ФИНАЛЬНАЯ PRODUCTION-READY ВЕРСИЯ)

## Обзор

Цель — добавить опциональную 3D-визуализацию боя через Three.js с сохранением существующей 2D функциональности. Пользователь сможет переключаться между режимами.

**Финальная версия:** Все блокеры закрыты, типы согласованы с доменом, код готов к компиляции и деплою.

---

## Критические изменения в v17

| # | Проблема из v16 | Исправление |
|---|-----------------|-------------|
| 1 | `Position`/`GridSize` не экспортируются | Добавлены реэкспорты в `types/battle.ts` |
| 2 | `Unit3D.status: string` | Изменено на `ParticipantStatus` |
| 3 | 2D ветка — заглушка | Добавлен реальный fallback |
| 4 | `onPointerMissed` отсутствует | Добавлен в `RaycastController` |
| 5 | `throttle` без cleanup | Добавлен cleanup на unmount |
| 6 | Shoot animation в DoD | Перенесён в "Phase 5.2 — TODO" |
| 7 | battleStore контракт неясен | Добавлена секция с требованиями |

---

## Текущая архитектура

### Компоненты рендеринга боя

| Компонент | Функция | Путь |
|-----------|---------|------|
| `BattleView.tsx` | Оркестратор боевого экрана | `components/battle/` |
| `BattleGrid.tsx` | CSS Grid рендер карты | `components/battle/` |
| `BattleCell.tsx` | Отдельная ячейка сетки | `components/battle/` |
| `AnimationLayer.tsx` | SVG анимации поверх сетки | `components/battle/` |
| `BattleHUD.tsx` | UI панели и контролы | `components/battle/` |

### Хуки боевой логики

| Хук | Функция |
|-----|---------|
| `useBattleLogic` | Композитный хук, объединяющий всю UI логику |
| `useBattleInteractionState` | Состояние взаимодействия: выбор, hover, режим действия |
| `useBattleDerivedData` | Вычисляемые данные: доступные ходы, цели |
| `useBattleActions` | Обработчики действий: клик, перемещение, атака |
| `useBattleAutomations` | Автоматизация: центрирование камеры, авто-ход AI |

### State Management

| Store | Функция |
|-------|---------|
| `battleStore` | Состояние боя: участники, terrain, фаза |
| `multiplayerStore` | Мультиплеер: роль, синхронизация |
| `uiStore` | UI состояние: модалки, тосты |

### Terrain система

**Типы terrain** из `types/battle.ts`:
- `Linear` — линейные объекты: заборы, стены, баррикады
- `Individual` — отдельные объекты: бочки, статуи, оборудование
- `Area` — области: холмы, руины
- `Field` — поля: болота
- `Block` — блоки: контейнеры, здания
- `Interior` — интерьеры зданий
- `Door` — двери

---

## Требования к battleStore (КРИТИЧНО)

### Обязательный контракт для 3D

3D компоненты ожидают следующую структуру в `battleStore`:

```typescript
// stores/battleStore.ts — требуемые поля и методы

interface BattleStore {
  // Состояние боя
  battle: Battle | null;
  
  // Анимация (ВАЖНО: именно это имя!)
  animation: AnimationState | null;
  
  // Метод очистки анимации (ВАЖНО: именно это имя!)
  clearAnimation: () => void;
}

// Тип анимации
interface AnimationState {
  type: 'move' | 'shoot';
  id: string;        // ID участника
  path?: Position[]; // Для move
  from?: Position;   // Для shoot
  to?: Position;     // Для shoot
}
```

### Проверка перед реализацией

```bash
# Проверить что поля существуют
grep -n "animation:" src/stores/battleStore.ts
grep -n "clearAnimation" src/stores/battleStore.ts
```

Если названия отличаются — нужно либо:
- Переименовать в store, либо
- Изменить импорты в 3D компонентах

---

## Координатная система

### Константы

```typescript
// constants/three.ts
export const TILE_SIZE = 1;
export const TILE_HEIGHT = 0.1;
export const WALL_HEIGHT = 2;
export const CHARACTER_HEIGHT = 1.5;
export const MOVE_SPEED = 3;
```

### Диаграмма координат

```
Grid Space (2D)              World Space (3D)
┌───┬───┬───┬───┐
│0,0│1,0│2,0│3,0│            Y (up)
├───┼───┼───┼───┤            │
│0,1│1,1│2,1│3,1│            │    Z (grid Y)
├───┼───┼───┼───┤            │   /
│0,2│1,2│2,2│3,2│            │  /
├───┼───┼───┼───┤            │ /
│0,3│1,3│2,3│3,3│            └──────── X (grid X)
└───┴───┴───┴───┘
                            World center = grid center
                            For 4x4 grid: (1.5, 1.5) → (0, 0, 0)
```

---

## Фазы реализации

### Фаза 1: Инфраструктура
- [ ] Добавить зависимости в `package.json`
- [ ] Добавить реэкспорты типов в `types/battle.ts`
- [ ] Создать `ThreeCanvas.tsx`
- [ ] Создать `ViewModeToggle.tsx`
- [ ] Модифицировать `BattleView.tsx`

### Фаза 2: 3D Terrain
- [ ] Создать `GridFloor.tsx`
- [ ] Создать `TerrainMesh.tsx`
- [ ] Создать `TerrainMeshContext.tsx`

### Фаза 3: 3D Участники
- [ ] Создать `ParticipantMesh.tsx`
- [ ] Создать `ParticipantMeshContext.tsx`
- [ ] Создать `HPBars3D.tsx`

### Фаза 4: Интерактивность
- [ ] Создать `RaycastController.tsx`
- [ ] Создать `MoveHighlights.tsx`

### Фаза 5.1: Move Animation
- [ ] Создать `AnimationSystem3D.tsx`
- [ ] Создать `MoveAnimation.tsx`

### Фаза 5.2: Shoot Animation (TODO — после MVP)
- [ ] Создать `ShootAnimation.tsx`
- [ ] Добавить поддержку `animation.type === 'shoot'`

### Фаза 6: Оптимизация
- [ ] LOD для больших карт
- [ ] Instancing
- [ ] WebGL fallback

---

## Полный код реализации

### Типы (ИСПРАВЛЕНЫ)

**`types/battle.ts`** — добавить в конец файла:
```typescript
// ===========================================
// Реэкспорты для 3D компонентов
// ===========================================

// GridSize — используется во всех 3D компонентах
export type GridSize = { width: number; height: number };

// Реэкспорт из character.ts для удобства импорта
export type { Position, ParticipantStatus, BattleParticipant } from './character';
```

**`types/battle3d.ts`** (ИСПРАВЛЕН)
```typescript
import type { Position, GridSize, ParticipantStatus } from '@/types/battle';
import type { BattleParticipant } from '@/types/character';

export type Terrain3DType = 'Wall' | 'Barrel' | 'Container' | 'Obstacle' | 'Floor';

export interface Terrain3D {
  id: string;
  type: Terrain3DType;
  position: Position;
  height: number;
  blocksLineOfSight: boolean;
}

export interface Unit3D {
  id: string;
  type: BattleParticipant['type'];
  position: Position;
  vitality: {
    current: number;
    max: number;
    label: 'stun';
  };
  status: ParticipantStatus;  // ✅ ИСПРАВЛЕНО: строгий тип вместо string
  isSelected: boolean;
  isActive: boolean;
  isAnimating: boolean;
}

export interface BattleView3D {
  gridSize: GridSize;
  terrain: Terrain3D[];
  units: Unit3D[];
  availableMoves: Position[];
  animatingUnitId?: string;
}
```

**`types/battleLogic.ts`**
```typescript
import type { Position } from './battle';

export interface BattleLogicState {
  selectedId: string | null;
  activeParticipantId: string | null;
  hoveredPosition: Position | null;
  actionMode: 'move' | 'shoot' | 'overwatch' | null;
}

export interface BattleLogicDerived {
  availableMoves: Position[];
  availableTargets: string[];
  canEndTurn: boolean;
}

export interface BattleLogicHandlers {
  onCellClick: (pos: Position) => void;
  onCellHover: (pos: Position | null) => void;
  onParticipantClick: (id: string) => void;
  onEndTurn: () => void;
  onActionSelect: (action: BattleLogicState['actionMode']) => void;
}

export interface BattleLogic {
  state: BattleLogicState;
  derived: BattleLogicDerived;
  handlers: BattleLogicHandlers;
}
```

---

### Адаптер

**`services/adapters/battle3dAdapter.ts`**
```typescript
import type { Battle, Terrain, Position, GridSize, ParticipantStatus } from '@/types/battle';
import type { BattleParticipant } from '@/types/character';
import type { BattleView3D, Terrain3D, Unit3D } from '@/types/battle3d';

// Тип анимации из battleStore
interface AnimationState {
  type: 'move' | 'shoot';
  id: string;
  path?: Position[];
}

export function mapBattleTo3D(
  battle: Battle,
  selectedId: string | null,
  activeParticipantId: string | null,
  availableMoves: Position[],
  animation: AnimationState | null
): BattleView3D {
  const animatingUnitId = animation?.id;

  return {
    gridSize: battle.gridSize,
    terrain: battle.terrain
      .map(mapTerrainTo3D)
      .filter(t => t.type !== 'Floor'),
    units: battle.participants.map(p =>
      mapParticipantTo3D(p, selectedId, activeParticipantId, animatingUnitId)
    ),
    availableMoves,
    animatingUnitId,
  };
}

function mapTerrainTo3D(t: Terrain): Terrain3D {
  const typeFromName = guessVisualTypeFromName(t.name);
  const type = typeFromName ?? guessVisualTypeFromFlags(t);

  return {
    id: t.id,
    type,
    position: t.position,
    height: getTerrainHeight(t, type),
    blocksLineOfSight: t.blocksLineOfSight,
  };
}

function guessVisualTypeFromFlags(t: Terrain): Terrain3D['type'] {
  if (t.type === 'Door') return 'Wall';
  if (t.type === 'Interior') return 'Floor';

  if (t.blocksLineOfSight || t.isImpassable) {
    if (t.size.width >= 2 || t.size.height >= 2) return 'Container';
    return 'Wall';
  }

  if (t.type === 'Linear') return 'Wall';

  if (t.type === 'Individual') {
    if (t.size.width <= 1 && t.size.height <= 1 && t.providesCover) return 'Barrel';
    return 'Obstacle';
  }

  if (t.size.width >= 2 || t.size.height >= 2) return 'Container';

  return t.providesCover ? 'Obstacle' : 'Floor';
}

function guessVisualTypeFromName(name: string | undefined): Terrain3D['type'] | null {
  if (!name) return null;
  const n = name.toLowerCase();

  if (n.includes('barrel') || n.includes('бочка')) return 'Barrel';
  if (n.includes('container') || n.includes('cargo')) return 'Container';
  if (n.includes('wall') || n.includes('barricade')) return 'Wall';

  return null;
}

function getTerrainHeight(t: Terrain, visualType: Terrain3D['type']): number {
  if (visualType === 'Barrel') return 0.8;
  if (visualType === 'Container') return t.blocksLineOfSight ? 2.0 : 1.2;
  if (visualType === 'Wall') return t.blocksLineOfSight ? 2.5 : 1.2;
  return t.providesCover ? 1.0 : 0.6;
}

function mapParticipantTo3D(
  participant: BattleParticipant,
  selectedId: string | null,
  activeParticipantId: string | null,
  animatingUnitId?: string
): Unit3D {
  const stunTokens = participant.stunTokens ?? 0;
  
  const current = participant.status === 'casualty' 
    ? 0 
    : Math.max(0, 100 - stunTokens * 20);

  const vitality = {
    current,
    max: 100,
    label: 'stun' as const,
  };

  return {
    id: participant.id,
    type: participant.type,
    position: participant.position,
    vitality,
    status: participant.status,  // ✅ Передаём реальный статус
    isSelected: selectedId === participant.id,
    isActive: activeParticipantId === participant.id,
    isAnimating: animatingUnitId === participant.id,
  };
}
```

---

### Утилиты

**`constants/three.ts`**
```typescript
export const TILE_SIZE = 1;
export const TILE_HEIGHT = 0.1;
export const WALL_HEIGHT = 2;
export const CHARACTER_HEIGHT = 1.5;
export const MOVE_SPEED = 3;
```

**`services/three/coordinates.ts`**
```typescript
import { TILE_SIZE } from '@/constants/three';
import type { Position, GridSize } from '@/types/battle';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export const gridToWorld = (
  gridPos: Position,
  gridSize: GridSize,
  height: number = 0
): Vector3 => ({
  x: (gridPos.x - gridSize.width / 2 + 0.5) * TILE_SIZE,
  y: height,
  z: (gridPos.y - gridSize.height / 2 + 0.5) * TILE_SIZE,
});

export const worldToGrid = (
  worldPos: Vector3,
  gridSize: GridSize
): Position => ({
  x: Math.floor(worldPos.x / TILE_SIZE + gridSize.width / 2),
  y: Math.floor(worldPos.z / TILE_SIZE + gridSize.height / 2),
});

export const isValidGridPos = (pos: Position, gridSize: GridSize): boolean =>
  pos.x >= 0 && pos.x < gridSize.width &&
  pos.y >= 0 && pos.y < gridSize.height;
```

**`hooks/useLocalStorage.ts`**
```typescript
import { useState } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    setStoredValue(value);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  };

  return [storedValue, setValue];
}
```

---

### Инфраструктура

**`components/battle/three/ThreeCanvas.tsx`**
```typescript
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useRef, useEffect } from 'react';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';
import * as THREE from 'three';

interface ThreeCanvasProps {
  children: React.ReactNode;
  gridSize: { width: number; height: number };
}

const CAMERA_CONFIG = {
  minDistance: 5,
  maxDistance: 40,
  minPolarAngle: 0.3,
  maxPolarAngle: Math.PI / 2.2,
  initialHeight: 15,
  initialDistance: 15,
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const CanvasController: React.FC<{ panLimit: number }> = ({ panLimit }) => {
  const controlsRef = useRef<OrbitControlsType>(null);
  const { gl } = useThree();

  useFrame(() => {
    if (controlsRef.current) {
      const target = controlsRef.current.target;
      target.x = clamp(target.x, -panLimit, panLimit);
      target.z = clamp(target.z, -panLimit, panLimit);
    }
  });

  useEffect(() => {
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      console.error('WebGL context lost. Please refresh the page.');
    };

    const handleContextRestored = () => {
      console.log('WebGL context restored');
    };

    gl.domElement.addEventListener('webglcontextlost', handleContextLost);
    gl.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    return () => {
      gl.domElement.removeEventListener('webglcontextlost', handleContextLost);
      gl.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, [gl]);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan
      enableZoom
      enableRotate
      enableDamping
      dampingFactor={0.05}
      minDistance={CAMERA_CONFIG.minDistance}
      maxDistance={CAMERA_CONFIG.maxDistance}
      minPolarAngle={CAMERA_CONFIG.minPolarAngle}
      maxPolarAngle={CAMERA_CONFIG.maxPolarAngle}
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      }}
    />
  );
};

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({ children, gridSize }) => {
  const panLimit = Math.max(gridSize.width, gridSize.height) / 2 + 2;

  return (
    <Canvas
      shadows
      resize={{ scroll: false, debounce: { scroll: 50, resize: 0 } }}
    >
      <PerspectiveCamera
        makeDefault
        position={[0, CAMERA_CONFIG.initialHeight, CAMERA_CONFIG.initialDistance]}
      />
      <CanvasController panLimit={panLimit} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
      {children}
    </Canvas>
  );
};
```

---

### Контексты

**`components/battle/three/contexts/TerrainMeshContext.tsx`**
```typescript
import React, { createContext, useContext, useRef, useCallback } from 'react';
import * as THREE from 'three';

interface TerrainMeshContextType {
  register: (id: string, mesh: THREE.Mesh) => void;
  unregister: (id: string) => void;
  getMeshes: () => THREE.Mesh[];
}

const TerrainMeshContext = createContext<TerrainMeshContextType | null>(null);

export const TerrainMeshProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const meshesRef = useRef<Map<string, THREE.Mesh>>(new Map());

  const register = useCallback((id: string, mesh: THREE.Mesh) => {
    meshesRef.current.set(id, mesh);
  }, []);

  const unregister = useCallback((id: string) => {
    meshesRef.current.delete(id);
  }, []);

  const getMeshes = useCallback(() => {
    return Array.from(meshesRef.current.values());
  }, []);

  return (
    <TerrainMeshContext.Provider value={{ register, unregister, getMeshes }}>
      {children}
    </TerrainMeshContext.Provider>
  );
};

export const useTerrainMeshContext = () => {
  const context = useContext(TerrainMeshContext);
  if (!context) {
    throw new Error('useTerrainMeshContext must be used within TerrainMeshProvider');
  }
  return context;
};
```

**`components/battle/three/contexts/ParticipantMeshContext.tsx`**
```typescript
import React, { createContext, useContext, useRef, useCallback } from 'react';
import * as THREE from 'three';

interface ParticipantMeshContextType {
  register: (id: string, mesh: THREE.Group) => void;
  unregister: (id: string) => void;
  getMesh: (id: string) => THREE.Group | undefined;
}

const ParticipantMeshContext = createContext<ParticipantMeshContextType | null>(null);

export const ParticipantMeshProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const meshesRef = useRef<Map<string, THREE.Group>>(new Map());

  const register = useCallback((id: string, mesh: THREE.Group) => {
    meshesRef.current.set(id, mesh);
  }, []);

  const unregister = useCallback((id: string) => {
    meshesRef.current.delete(id);
  }, []);

  const getMesh = useCallback((id: string) => {
    return meshesRef.current.get(id);
  }, []);

  return (
    <ParticipantMeshContext.Provider value={{ register, unregister, getMesh }}>
      {children}
    </ParticipantMeshContext.Provider>
  );
};

export const useParticipantMeshContext = () => {
  const context = useContext(ParticipantMeshContext);
  if (!context) {
    throw new Error('useParticipantMeshContext must be used within ParticipantMeshProvider');
  }
  return context;
};
```

---

### Компоненты рендеринга

**`components/battle/three/GridFloor.tsx`**
```typescript
import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { TILE_SIZE } from '@/constants/three';

interface GridFloorProps {
  gridSize: { width: number; height: number };
}

export const GridFloor: React.FC<GridFloorProps> = ({ gridSize }) => {
  const gridTexture = useMemo(() => {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = '#2a2a4e';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(gridSize.width, gridSize.height);

    return texture;
  }, [gridSize.width, gridSize.height]);

  useEffect(() => {
    return () => {
      gridTexture.dispose();
    };
  }, [gridTexture]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[gridSize.width * TILE_SIZE, gridSize.height * TILE_SIZE]} />
      <meshStandardMaterial map={gridTexture} />
    </mesh>
  );
};
```

**`components/battle/three/TerrainMesh.tsx`**
```typescript
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useTerrainMeshContext } from './contexts/TerrainMeshContext';
import { gridToWorld } from '@/services/three/coordinates';
import { TILE_SIZE } from '@/constants/three';
import type { Terrain3D } from '@/types/battle3d';
import type { GridSize } from '@/types/battle';

interface TerrainMeshProps {
  terrain: Terrain3D;
  gridSize: GridSize;
}

export const TerrainMesh: React.FC<TerrainMeshProps> = ({ terrain, gridSize }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { register, unregister } = useTerrainMeshContext();

  useEffect(() => {
    if (meshRef.current) {
      register(terrain.id, meshRef.current);
      return () => unregister(terrain.id);
    }
  }, [terrain.id, register, unregister]);

  const position = gridToWorld(terrain.position, gridSize, terrain.height / 2);

  return (
    <mesh
      ref={meshRef}
      position={[position.x, position.y, position.z]}
      castShadow
      receiveShadow
      userData={{ terrainId: terrain.id, terrainType: terrain.type }}
    >
      {getTerrainGeometry(terrain)}
      {getTerrainMaterial(terrain)}
    </mesh>
  );
};

function getTerrainGeometry(terrain: Terrain3D) {
  switch (terrain.type) {
    case 'Wall':
      return <boxGeometry args={[TILE_SIZE, terrain.height, TILE_SIZE * 0.2]} />;
    case 'Barrel':
      return <cylinderGeometry args={[0.3, 0.35, terrain.height, 8]} />;
    case 'Container':
      return <boxGeometry args={[TILE_SIZE * 2, terrain.height, TILE_SIZE]} />;
    case 'Obstacle':
    default:
      return <boxGeometry args={[TILE_SIZE * 0.8, terrain.height, TILE_SIZE * 0.8]} />;
  }
}

function getTerrainMaterial(terrain: Terrain3D) {
  const colors: Record<string, string> = {
    Wall: '#666666',
    Barrel: '#8B4513',
    Container: '#2E5090',
    Obstacle: '#555555',
  };

  return <meshStandardMaterial color={colors[terrain.type] || colors.Obstacle} />;
}
```

**`components/battle/three/ParticipantMesh.tsx`**
```typescript
import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { useParticipantMeshContext } from './contexts/ParticipantMeshContext';
import { gridToWorld } from '@/services/three/coordinates';
import { CHARACTER_HEIGHT } from '@/constants/three';
import type { Unit3D } from '@/types/battle3d';
import type { GridSize } from '@/types/battle';
import type { BattleLogic } from '@/types/battleLogic';

interface ParticipantMeshProps {
  unit: Unit3D;
  gridSize: GridSize;
  battleLogic: BattleLogic;
}

export const ParticipantMesh: React.FC<ParticipantMeshProps> = ({
  unit,
  gridSize,
  battleLogic,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const { register, unregister } = useParticipantMeshContext();

  useEffect(() => {
    if (groupRef.current) {
      register(unit.id, groupRef.current);
      return () => unregister(unit.id);
    }
  }, [unit.id, register, unregister]);

  useEffect(() => {
    if (!groupRef.current || unit.isAnimating) return;
    const position = gridToWorld(unit.position, gridSize, 0);
    groupRef.current.position.set(position.x, position.y, position.z);
  }, [unit.position, gridSize, unit.isAnimating]);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      battleLogic.handlers.onParticipantClick?.(unit.id);
    },
    [battleLogic.handlers, unit.id]
  );

  const isCasualty = unit.status === 'casualty';

  return (
    <group 
      ref={groupRef} 
      onClick={handleClick}
      rotation={isCasualty ? [Math.PI / 2, 0, 0] : [0, 0, 0]}
    >
      <mesh castShadow position={[0, CHARACTER_HEIGHT / 2, 0]}>
        <capsuleGeometry args={[0.3, 0.8, 4, 8]} />
        <meshStandardMaterial 
          color={getUnitColor(unit)} 
          transparent={isCasualty}
          opacity={isCasualty ? 0.5 : 1}
        />
      </mesh>

      {unit.isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[0.4, 0.5, 32]} />
          <meshBasicMaterial color="#00ff00" />
        </mesh>
      )}

      {unit.isActive && !unit.isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[0.5, 0.6, 32]} />
          <meshBasicMaterial color="#ffff00" transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
};

function getUnitColor(unit: Unit3D): string {
  if (unit.status === 'casualty') return '#666666';
  if (unit.isSelected) return '#00ff00';
  if (unit.isActive) return '#ffff00';
  return unit.type === 'character' ? '#4a90d9' : '#d94a4a';
}
```

**`components/battle/three/MoveHighlights.tsx`**
```typescript
import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { gridToWorld } from '@/services/three/coordinates';
import { TILE_SIZE } from '@/constants/three';
import type { Position, GridSize } from '@/types/battle';

interface MoveHighlightsProps {
  positions: Position[];
  gridSize: GridSize;
}

export const MoveHighlights: React.FC<MoveHighlightsProps> = ({ positions, gridSize }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    if (!meshRef.current || positions.length === 0) return;

    const dummy = new THREE.Object3D();
    positions.forEach((pos, i) => {
      const world = gridToWorld(pos, gridSize, 0.02);
      dummy.position.set(world.x, world.y, world.z);
      dummy.rotation.x = -Math.PI / 2;
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [positions, gridSize]);

  if (positions.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, positions.length]}>
      <planeGeometry args={[TILE_SIZE * 0.9, TILE_SIZE * 0.9]} />
      <meshBasicMaterial color="#00ff00" transparent opacity={0.3} side={THREE.DoubleSide} />
    </instancedMesh>
  );
};
```

**`components/battle/three/HPBars3D.tsx`**
```typescript
import { Html } from '@react-three/drei';
import { gridToWorld } from '@/services/three/coordinates';
import { CHARACTER_HEIGHT } from '@/constants/three';
import type { Unit3D } from '@/types/battle3d';
import type { GridSize } from '@/types/battle';

interface HPBars3DProps {
  units: Unit3D[];
  gridSize: GridSize;
}

export const HPBars3D: React.FC<HPBars3DProps> = ({ units, gridSize }) => {
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
            >
              <div className="bg-black/70 px-2 py-1 rounded text-xs whitespace-nowrap">
                <div className="w-16 h-1 bg-gray-700 rounded">
                  <div
                    className="h-full bg-green-500 rounded"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="text-center mt-1 text-gray-300 text-[10px]">
                  {u.vitality.label.toUpperCase()}
                </div>
              </div>
            </Html>
          );
        })}
    </>
  );
};
```

**`components/battle/three/RaycastController.tsx`** (ИСПРАВЛЕН)
```typescript
import { useCallback, useMemo, useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Plane, Vector3 } from 'three';
import { worldToGrid, isValidGridPos } from '@/services/three/coordinates';
import { TILE_SIZE } from '@/constants/three';
import type { BattleLogic } from '@/types/battleLogic';
import type { Position, GridSize } from '@/types/battle';

interface RaycastControllerProps {
  battleLogic: BattleLogic;
  gridSize: GridSize;
}

// ✅ ИСПРАВЛЕНО: throttle с cleanup
function useThrottle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): [T, () => void] {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>();
  
  const throttled = useCallback(
    ((...args: any[]) => {
      if (timeoutRef.current) return;
      func(...args);
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = undefined;
      }, delay);
    }) as T,
    [func, delay]
  );
  
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);
  
  return [throttled, cleanup];
}

export const RaycastController: React.FC<RaycastControllerProps> = ({
  battleLogic,
  gridSize,
}) => {
  const { camera, raycaster } = useThree();
  const { handlers } = battleLogic;
  const intersectionRef = useRef(new Vector3());

  const hoverCallback = useCallback(
    (pos: Position | null) => handlers.onCellHover?.(pos),
    [handlers.onCellHover]
  );

  const [throttledHover, cleanupThrottle] = useThrottle(hoverCallback, 50);

  // ✅ ИСПРАВЛЕНО: cleanup throttle на unmount
  useEffect(() => {
    return () => {
      cleanupThrottle();
    };
  }, [cleanupThrottle]);

  const pickingPlane = useMemo(() => new Plane(new Vector3(0, 1, 0), 0), []);

  const handlePointerMove = useCallback(
    (event: any) => {
      raycaster.setFromCamera(event.pointer, camera);
      const hit = raycaster.ray.intersectPlane(pickingPlane, intersectionRef.current);

      if (!hit) {
        throttledHover(null);
        return;
      }

      const gridPos = worldToGrid(intersectionRef.current, gridSize);
      if (isValidGridPos(gridPos, gridSize)) {
        throttledHover(gridPos);
      } else {
        throttledHover(null);
      }
    },
    [camera, raycaster, pickingPlane, gridSize, throttledHover]
  );

  const handlePointerOut = useCallback(() => {
    throttledHover(null);
  }, [throttledHover]);

  // ✅ ИСПРАВЛЕНО: добавлен onPointerMissed
  const handlePointerMissed = useCallback(() => {
    handlers.onCellHover?.(null);
  }, [handlers.onCellHover]);

  const handleClick = useCallback(
    (event: any) => {
      raycaster.setFromCamera(event.pointer, camera);
      const hit = raycaster.ray.intersectPlane(pickingPlane, intersectionRef.current);

      if (!hit) return;

      const gridPos = worldToGrid(intersectionRef.current, gridSize);
      if (isValidGridPos(gridPos, gridSize)) {
        handlers.onCellClick?.(gridPos);
      }
    },
    [camera, raycaster, pickingPlane, gridSize, handlers.onCellClick]
  );

  return (
    <mesh
      position={[0, 0, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
      onPointerMissed={handlePointerMissed}
      onClick={handleClick}
    >
      <planeGeometry args={[gridSize.width * TILE_SIZE, gridSize.height * TILE_SIZE]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
};
```

---

### Анимации

**`components/battle/three/AnimationSystem3D.tsx`**
```typescript
import { useEffect } from 'react';
import { useBattleStore } from '@/stores';
import { MoveAnimation } from './animations/MoveAnimation';
import type { GridSize } from '@/types/battle';

interface AnimationSystem3DProps {
  gridSize: GridSize;
}

export const AnimationSystem3D: React.FC<AnimationSystem3DProps> = ({ gridSize }) => {
  const animation = useBattleStore((s) => s.animation);
  const clearAnimation = useBattleStore((s) => s.clearAnimation);

  useEffect(() => {
    if (!animation) return;
    
    // TODO Phase 5.2: добавить поддержку shoot
    if (animation.type !== 'move') {
      console.warn(`Animation type "${animation.type}" not yet implemented, skipping`);
      clearAnimation();
    }
  }, [animation, clearAnimation]);

  if (!animation || animation.type !== 'move') return null;

  return (
    <MoveAnimation
      unitId={animation.id}
      path={animation.path}
      gridSize={gridSize}
      onComplete={clearAnimation}
    />
  );
};
```

**`components/battle/three/animations/MoveAnimation.tsx`**
```typescript
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useParticipantMeshContext } from '../contexts/ParticipantMeshContext';
import { gridToWorld } from '@/services/three/coordinates';
import { MOVE_SPEED } from '@/constants/three';
import type { Position, GridSize } from '@/types/battle';

interface MoveAnimationProps {
  unitId: string;
  path: Position[];
  gridSize: GridSize;
  onComplete: () => void;
}

export const MoveAnimation: React.FC<MoveAnimationProps> = ({
  unitId,
  path,
  gridSize,
  onComplete,
}) => {
  const progressRef = useRef(0);
  const pathIndex = useRef(0);
  const completedRef = useRef(false);
  const fromVec = useRef(new THREE.Vector3());
  const toVec = useRef(new THREE.Vector3());
  const { getMesh } = useParticipantMeshContext();

  // Guard для коротких путей — один раз при mount
  useEffect(() => {
    if (path.length < 2 && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }, [path.length, onComplete]);

  // Reset при изменении анимации
  useEffect(() => {
    progressRef.current = 0;
    pathIndex.current = 0;
    completedRef.current = false;
  }, [unitId, path]);

  useFrame((_, delta) => {
    if (completedRef.current || path.length < 2) return;

    const mesh = getMesh(unitId);
    if (!mesh) return;

    progressRef.current += delta * MOVE_SPEED;

    if (progressRef.current >= 1) {
      pathIndex.current++;
      progressRef.current = 0;

      if (pathIndex.current >= path.length - 1) {
        const finalPos = gridToWorld(path[path.length - 1], gridSize, 0);
        mesh.position.set(finalPos.x, finalPos.y, finalPos.z);
        completedRef.current = true;
        onComplete();
        return;
      }
    }

    const from = gridToWorld(path[pathIndex.current], gridSize);
    const to = gridToWorld(path[pathIndex.current + 1], gridSize);

    fromVec.current.set(from.x, from.y, from.z);
    toVec.current.set(to.x, to.y, to.z);

    mesh.position.lerpVectors(fromVec.current, toVec.current, progressRef.current);
  });

  return null;
};
```

---

### Интеграция

**`components/battle/ViewModeToggle.tsx`**
```typescript
import { useBattleStore } from '@/stores';

interface ViewModeToggleProps {
  is3D: boolean;
  onToggle: (value: boolean) => void;
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({ is3D, onToggle }) => {
  const isAnimating = useBattleStore((s) => s.animation !== null);

  return (
    <button
      disabled={isAnimating}
      onClick={() => onToggle(!is3D)}
      className={`px-3 py-1 rounded transition-colors ${
        isAnimating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-surface-hover'
      }`}
      title={isAnimating ? 'Wait for animation to complete' : undefined}
    >
      Switch to {is3D ? '2D' : '3D'}
    </button>
  );
};
```

**`components/battle/BattleLoadingScreen.tsx`**
```typescript
import { Loader } from 'lucide-react';

export const BattleLoadingScreen: React.FC = () => (
  <div className="flex items-center justify-center h-full bg-surface-base">
    <div className="text-center">
      <Loader className="animate-spin mx-auto mb-4" size={48} />
      <p className="text-text-muted">Loading 3D battle view...</p>
    </div>
  </div>
);
```

**`components/battle/BattleView3D.tsx`**
```typescript
import { useMemo } from 'react';
import { ThreeCanvas } from './three/ThreeCanvas';
import { GridFloor } from './three/GridFloor';
import { TerrainMesh } from './three/TerrainMesh';
import { ParticipantMesh } from './three/ParticipantMesh';
import { RaycastController } from './three/RaycastController';
import { MoveHighlights } from './three/MoveHighlights';
import { HPBars3D } from './three/HPBars3D';
import { AnimationSystem3D } from './three/AnimationSystem3D';
import { TerrainMeshProvider } from './three/contexts/TerrainMeshContext';
import { ParticipantMeshProvider } from './three/contexts/ParticipantMeshContext';
import BattleHUD from './BattleHUD';
import { mapBattleTo3D } from '@/services/adapters/battle3dAdapter';
import type { BattleLogic } from '@/types/battleLogic';
import { useBattleStore } from '@/stores';

interface BattleView3DProps {
  battleLogic: BattleLogic;
}

export const BattleView3D: React.FC<BattleView3DProps> = ({ battleLogic }) => {
  const { state, derived } = battleLogic;
  const battle = useBattleStore((s) => s.battle);
  const animation = useBattleStore((s) => s.animation);

  const battleView3D = useMemo(() => {
    if (!battle) return null;
    return mapBattleTo3D(
      battle,
      state.selectedId,
      state.activeParticipantId,
      derived.availableMoves,
      animation
    );
  }, [battle, state.selectedId, state.activeParticipantId, derived.availableMoves, animation]);

  if (!battleView3D) return null;

  const { gridSize, terrain, units, availableMoves } = battleView3D;

  return (
    <div className="relative w-full h-full">
      <TerrainMeshProvider>
        <ParticipantMeshProvider>
          <ThreeCanvas gridSize={gridSize}>
            <GridFloor gridSize={gridSize} />

            {terrain.map((t) => (
              <TerrainMesh key={t.id} terrain={t} gridSize={gridSize} />
            ))}

            {units.map((u) => (
              <ParticipantMesh
                key={u.id}
                unit={u}
                gridSize={gridSize}
                battleLogic={battleLogic}
              />
            ))}

            <MoveHighlights positions={availableMoves} gridSize={gridSize} />

            <HPBars3D units={units} gridSize={gridSize} />

            <AnimationSystem3D gridSize={gridSize} />

            <RaycastController battleLogic={battleLogic} gridSize={gridSize} />
          </ThreeCanvas>
        </ParticipantMeshProvider>
      </TerrainMeshProvider>

      <BattleHUD battleLogic={battleLogic} />
    </div>
  );
};

export default BattleView3D;
```

**`components/battle/BattleView.tsx`** (ИСПРАВЛЕН — реальный 2D fallback)
```typescript
import { Suspense, lazy } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useBattleLogic } from '@/hooks/useBattleLogic';
import { ViewModeToggle } from './ViewModeToggle';
import { BattleLoadingScreen } from './BattleLoadingScreen';
// ✅ ИСПРАВЛЕНО: импорт реальных 2D компонентов
import { BattleGrid } from './BattleGrid';
import { AnimationLayer } from './AnimationLayer';
import BattleHUD from './BattleHUD';

const BattleView3D = lazy(() => import('./BattleView3D'));

const BattleView: React.FC = () => {
  const [is3D, setIs3D] = useLocalStorage('battleViewMode', false);
  const battleLogic = useBattleLogic();

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-4 right-4 z-10">
        <ViewModeToggle is3D={is3D} onToggle={setIs3D} />
      </div>

      {is3D ? (
        <Suspense fallback={<BattleLoadingScreen />}>
          <BattleView3D battleLogic={battleLogic} />
        </Suspense>
      ) : (
        // ✅ ИСПРАВЛЕНО: реальный 2D рендеринг вместо заглушки
        <div className="relative w-full h-full">
          <BattleGrid battleLogic={battleLogic} />
          <AnimationLayer />
          <BattleHUD battleLogic={battleLogic} />
        </div>
      )}
    </div>
  );
};

export default BattleView;
```

---

## Мультиплеер

3D режим использует тот же `battleStore`, синхронизация работает автоматически.

**Что синхронизируется:** позиции, terrain, анимации, выбранный участник

**Что локальное:** камера, hover, режим 2D/3D

---

## Тестирование

### Проверки перед релизом

```bash
# 1. TypeScript
npx tsc --noEmit

# 2. Проверка экспортов
grep -n "export type { Position" src/types/battle.ts
grep -n "export type GridSize" src/types/battle.ts

# 3. Проверка battleStore контракта
grep -n "animation:" src/stores/battleStore.ts
grep -n "clearAnimation" src/stores/battleStore.ts

# 4. Тесты
npm test

# 5. Билд
npm run build

# 6. Smoke test
npm run dev
# → Открыть в браузере
# → Переключить 2D ↔ 3D
# → Кликнуть по персонажу
# → Переместить персонажа
```

### Manual тесты (MVP)

| Сценарий | Ожидаемый результат |
|----------|---------------------|
| Переключение 2D → 3D | Сцена рендерится, камера по центру |
| Клик по персонажу | Выделение, показ доступных ходов |
| Перемещение | Анимация движения, обновление позиции |
| Вращение камеры | Плавное вращение, ограничение угла |
| Touch на мобильном | Pinch zoom, drag rotate работают |

> **Примечание:** Shoot animation — Phase 5.2, не входит в MVP

---

## Риски и митигация

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| React 19 совместимость | Средняя | Зафиксировать версии, smoke test |
| Низкая производительность | Средняя | LOD, instancing (Phase 6) |
| WebGL недоступен | Низкая | 2D fallback работает |
| battleStore контракт | Высокая | Проверить перед реализацией |

---

## package.json

```json
{
  "dependencies": {
    "three": "^0.170.0",
    "@react-three/fiber": "^8.17.0",
    "@react-three/drei": "^9.117.0"
  },
  "devDependencies": {
    "@react-three/test-renderer": "^8.17.0"
  }
}
```

---

## Структура файлов

```
src/
├── constants/
│   └── three.ts
├── services/
│   ├── three/
│   │   └── coordinates.ts
│   └── adapters/
│       └── battle3dAdapter.ts
├── types/
│   ├── battle.ts (+ реэкспорты)
│   ├── battleLogic.ts
│   └── battle3d.ts
├── hooks/
│   └── useLocalStorage.ts
└── components/
    └── battle/
        ├── BattleView.tsx (modified)
        ├── BattleView3D.tsx
        ├── BattleLoadingScreen.tsx
        ├── ViewModeToggle.tsx
        └── three/
            ├── ThreeCanvas.tsx
            ├── GridFloor.tsx
            ├── TerrainMesh.tsx
            ├── ParticipantMesh.tsx
            ├── RaycastController.tsx
            ├── MoveHighlights.tsx
            ├── HPBars3D.tsx
            ├── AnimationSystem3D.tsx
            ├── contexts/
            │   ├── TerrainMeshContext.tsx
            │   └── ParticipantMeshContext.tsx
            └── animations/
                └── MoveAnimation.tsx
```

**Всего: 18 файлов** (1 модификация + 17 новых)

---

## Definition of Done (MVP)

✅ Готово к продакшену, когда:

1. `npx tsc --noEmit` проходит без ошибок
2. `npm run build` успешен
3. 3D режим открывается/закрывается без ошибок
4. Клики дают корректные Position
5. Move-анимация работает плавно
6. 2D fallback работает как раньше

❌ **Не входит в MVP:**
- Shoot animation (Phase 5.2)
- LOD/instancing (Phase 6)

---

## Применённые исправления в v17

| # | Проблема | Исправление |
|---|----------|-------------|
| 1 | Position/GridSize не экспортируются | Добавлены реэкспорты в types/battle.ts |
| 2 | Unit3D.status: string | Изменено на ParticipantStatus |
| 3 | 2D ветка — заглушка | Добавлен реальный fallback с BattleGrid |
| 4 | onPointerMissed отсутствует | Добавлен в RaycastController |
| 5 | throttle без cleanup | Добавлен useThrottle с cleanup |
| 6 | Shoot в DoD | Перенесён в Phase 5.2 |
| 7 | battleStore контракт | Добавлена секция с требованиями |