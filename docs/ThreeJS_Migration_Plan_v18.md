# План миграции на Three.js v18.0 (ФИНАЛЬНАЯ PRODUCTION-READY ВЕРСИЯ)

## Обзор

Цель — добавить опциональную 3D-визуализацию боя через Three.js с сохранением существующей 2D функциональности. Пользователь сможет переключаться между режимами.

**Финальная версия:** Все блокеры закрыты, типы согласованы с реальным доменом и battleStore.

---

## Цель и рамки MVP

**Цель:** добавить опциональный 3D-рендер боя (визуализация + ввод кликов) без изменения доменных правил боя.

**MVP 3D включает:**
- 3D поле, terrain, юниты
- выбор/hover/клики по клеткам и юнитам
- подсветка reachable cells
- move-анимация, синхронизированная со store

**Не входит в MVP:**
- shoot animation (у вас уже есть shoot в 2D `AnimationLayer`, 3D можно добавить позже)
- LOD/instancing (после MVP)

---

## Текущая архитектура (для привязки интеграции)

### Компоненты боевого экрана

| Компонент | Роль | Факт по коду |
|---|---|---|
| `components/battle/BattleView.tsx` | Оркестратор экрана, переключение режимов | 2D ветка использует default exports `BattleGrid`, `AnimationLayer`, `BattleHUD`; `AnimationLayer` требует `gridRef` |
| `components/battle/BattleGrid.tsx` | Основной 2D рендер + логика кликов/hover “как должно быть” | Принимает `battleLogic: BattleLogic` и использует store для selection/hover |
| `components/battle/AnimationLayer.tsx` | SVG оверлей анимаций 2D (move/shoot) | Берёт `animation` и `animatingParticipantId` из store; требуется `gridRef` |
| `components/battle/BattleHUD.tsx` | HUD/панели поверх сцены | Работает поверх 2D/3D одинаково |

### Хук боевой логики

Фактический контракт `useBattleLogic`:
- `uiState`
- `derivedData` (в т.ч. `reachableCells`)
- `handlers` (в т.ч. `handleGridClick(pos)`, `setHoveredPos(pos|null)`, `cancelAction()`)

### Что живёт в battleStore

`battleStore` содержит:
- `selectedParticipantId`, `hoveredParticipantId`
- `animation`, `animatingParticipantId`
- `actions.setSelectedParticipantId`, `actions.setHoveredParticipantId`, `actions.setAnimation`, `actions.setAnimatingParticipantId`

---

## Координатная система (Grid → World)

Grid origin: top-left (0,0). World origin: центр карты (0,0,0). Grid X → World X, Grid Y → World Z, World Y — высота.

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

## Предварительные требования

### Зависимости

Добавить в `package.json`:
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

`@types/three` не нужен: типы идут вместе с `three`.

---

## Ключевое отличие: “UI bridge” между 3D и реальной логикой

Низкоуровневые 3D компоненты не должны знать про `BattleLogic`, потому что реальный `useBattleLogic` не предоставляет `handlers.onCellClick/onCellHover/onParticipantClick` (как в ранних версиях плана). В реальном коде:
- клики по клеткам идут через `battleLogic.handlers.handleGridClick(pos)`
- hover клетки через `battleLogic.handlers.setHoveredPos(pos|null)`
- selection/hover участника живут в `battleStore.actions.setSelectedParticipantId/setHoveredParticipantId`
- отмена режима действия через `battleLogic.handlers.cancelAction()`

Значит архитектурно:
- “dumb” 3D компоненты принимают callbacks (`onCellClick/onCellHover/onUnitClick`) и `gridSize`
- `BattleView3D` выступает “bridge”, реализуя parity поведения с `BattleGrid`

Для стабильного ввода все объекты сцены, кроме `ParticipantMesh` и `RaycastController`, исключаются из raycast (`raycast={() => null}`), а HTML-оверлеи не перехватывают события (`pointerEvents: 'none'`).

---

## Критические изменения в v18

| # | Проблема из v17 | Исправление |
|---|-----------------|-------------|
| 1 | `clearAnimation` не существует в store | Добавлен как alias |
| 2 | Использовался `animation.id` | Заменён на `animatingParticipantId` |
| 3 | 2D fallback с named imports | Исправлен на default imports + gridRef |
| 4 | Свой AnimationState в адаптере | Используется доменный из types/battle |

---

## Изменения в battleStore (ОБЯЗАТЕЛЬНО ПЕРЕД РЕАЛИЗАЦИЕЙ)

### Что добавить в `stores/battleStore.ts`

**1. В интерфейс `BattleState.actions`:**
```typescript
interface BattleState {
  // ... существующие поля ...
  
  actions: {
    // ... существующие методы ...
    
    setAnimation: (animation: AnimationState) => void;
    setAnimatingParticipantId: (id: string | null) => void;
    
    // ✅ ДОБАВИТЬ: alias для удобства 3D компонентов
    clearAnimation: () => void;
  };
}
```

**2. В реализацию `actions`:**
```typescript
actions: {
  // ... существующие методы ...
  
  // ✅ ДОБАВИТЬ реализацию
  clearAnimation: () =>
    set((state) => {
      state.animation = null;
      state.animatingParticipantId = null;
    }),
}
```

### Проверка после добавления

```bash
grep -n "clearAnimation" stores/battleStore.ts
# Должно найти определение в interface и реализацию
```

---

## Требования к battleStore (ФИНАЛЬНЫЙ КОНТРАКТ)

3D компоненты ожидают следующую структуру:

```typescript
// stores/battleStore.ts — требуемые поля для 3D

interface BattleStoreFor3D {
  battle: Battle | null;
  
  // Доменный тип анимации (включает null)
  animation: AnimationState;
  
  // ID участника, который сейчас анимируется
  // Используется и в 2D AnimationLayer, и в 3D
  animatingParticipantId: string | null;
  
  actions: {
    setAnimation: (a: AnimationState) => void;
    setAnimatingParticipantId: (id: string | null) => void;
    clearAnimation: () => void;  // ✅ Новый alias
  };
}
```

**Важно:** `animatingParticipantId` — это источник истины для определения "кто анимируется", а не `animation.id`.

В этом проекте `clearAnimation` должен вызываться как `actions.clearAnimation()`, потому что методы хранятся внутри `battleStore.actions`.

---

## Полный код реализации

### Типы

**`types/battle.ts`** — добавить реэкспорты:
```typescript
// ===========================================
// Реэкспорты для 3D компонентов
// ===========================================

export type GridSize = { width: number; height: number };

export type { Position, ParticipantStatus, BattleParticipant } from './character';
```

**`types/battle3d.ts`**
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
  status: ParticipantStatus;
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

### BattleLogic (фактический контракт)

В проекте уже есть тип `BattleLogic` как `ReturnType<typeof useBattleLogic>`:
```typescript
// hooks/useBattleLogic.ts
export type BattleLogic = ReturnType<typeof useBattleLogic>;
```

В 3D важно использовать реальные обработчики:
- `battleLogic.handlers.handleGridClick(pos)`
- `battleLogic.handlers.setHoveredPos(pos|null)`
- `battleLogic.handlers.cancelAction()`

А выбор/hover участника менять через `battleStore.actions.setSelectedParticipantId/setHoveredParticipantId`.

---

### Адаптер (ИСПРАВЛЕН — store-driven через animatingParticipantId, доменные Battle/Terrain/Position)

**`services/adapters/battle3dAdapter.ts`**
```typescript
import type { Battle, Terrain, Position } from '@/types/battle';
import type { BattleParticipant } from '@/types/character';
import type { BattleView3D, Terrain3D, Unit3D } from '@/types/battle3d';

export function mapBattleTo3D(
  battle: Battle,
  selectedParticipantId: string | null,
  activeParticipantId: string | null,
  availableMoves: Position[],
  animatingParticipantId: string | null  // ✅ Используем animatingParticipantId
): BattleView3D {
  return {
    gridSize: battle.gridSize,
    terrain: battle.terrain
      .map(mapTerrainTo3D)
      .filter(t => t.type !== 'Floor'),
    units: battle.participants.map(p =>
      mapParticipantTo3D(p, selectedParticipantId, activeParticipantId, animatingParticipantId)
    ),
    availableMoves,
    animatingUnitId: animatingParticipantId ?? undefined,
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
  selectedParticipantId: string | null,
  activeParticipantId: string | null,
  animatingParticipantId: string | null  // ✅ Используем animatingParticipantId
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
    status: participant.status,
    isSelected: selectedParticipantId === participant.id,
    isActive: activeParticipantId === participant.id,
    isAnimating: animatingParticipantId === participant.id,  // ✅ Используем animatingParticipantId
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
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow raycast={() => null}>
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
      raycast={() => null}
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
import type { Position } from '@/types/battle';
import { useParticipantMeshContext } from './contexts/ParticipantMeshContext';
import { gridToWorld } from '@/services/three/coordinates';
import { CHARACTER_HEIGHT } from '@/constants/three';
import type { Unit3D } from '@/types/battle3d';
import type { GridSize } from '@/types/battle';

interface ParticipantMeshProps {
  unit: Unit3D;
  gridSize: GridSize;
  onClick: (id: string, pos: Position) => void;
  onHover: (pos: Position | null) => void;
}

export const ParticipantMesh: React.FC<ParticipantMeshProps> = ({
  unit,
  gridSize,
  onClick,
  onHover,
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
      onClick(unit.id, unit.position);
    },
    [onClick, unit.id, unit.position]
  );

  const isCasualty = unit.status === 'casualty';

  return (
    <group 
      ref={groupRef} 
      onClick={handleClick}
      onPointerEnter={() => onHover(unit.position)}
      onPointerLeave={() => onHover(null)}
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
    <instancedMesh ref={meshRef} args={[null!, null!, positions.length]} raycast={() => null}>
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
              style={{ pointerEvents: 'none' }}
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

**`components/battle/three/RaycastController.tsx`**
```typescript
import { useCallback, useMemo, useRef, useEffect } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { Plane, Vector3 } from 'three';
import { worldToGrid, isValidGridPos } from '@/services/three/coordinates';
import { TILE_SIZE } from '@/constants/three';
import type { Position, GridSize } from '@/types/battle';

interface RaycastControllerProps {
  gridSize: GridSize;
  onCellHover: (pos: Position | null) => void;
  onCellClick: (pos: Position) => void;
}

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
  gridSize,
  onCellHover,
  onCellClick,
}) => {
  const { camera, raycaster } = useThree();
  const intersectionRef = useRef(new Vector3());

  const onCellHoverRef = useRef(onCellHover);
  useEffect(() => {
    onCellHoverRef.current = onCellHover;
  }, [onCellHover]);

  const hoverCallback = useCallback(
    (pos: Position | null) => onCellHoverRef.current(pos),
    []
  );

  const [throttledHover, cleanupThrottle] = useThrottle(hoverCallback, 50);

  useEffect(() => {
    return () => {
      cleanupThrottle();
    };
  }, [cleanupThrottle]);

  const pickingPlane = useMemo(() => new Plane(new Vector3(0, 1, 0), 0), []);

  const handlePointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      raycaster.setFromCamera(event.pointer, camera);
      const hit = raycaster.ray.intersectPlane(pickingPlane, intersectionRef.current);

      if (!hit) {
        cleanupThrottle();
        onCellHoverRef.current(null);
        return;
      }

      const gridPos = worldToGrid(intersectionRef.current, gridSize);
      if (isValidGridPos(gridPos, gridSize)) {
        throttledHover(gridPos);
      } else {
        cleanupThrottle();
        onCellHoverRef.current(null);
      }
    },
    [camera, cleanupThrottle, pickingPlane, gridSize, raycaster, throttledHover]
  );

  const handlePointerOut = useCallback(() => {
    cleanupThrottle();
    onCellHoverRef.current(null);
  }, [cleanupThrottle]);

  const handleClick = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      raycaster.setFromCamera(event.pointer, camera);
      const hit = raycaster.ray.intersectPlane(pickingPlane, intersectionRef.current);

      if (!hit) return;

      const gridPos = worldToGrid(intersectionRef.current, gridSize);
      if (isValidGridPos(gridPos, gridSize)) {
        onCellClick(gridPos);
      }
    },
    [camera, raycaster, pickingPlane, gridSize, onCellClick]
  );

  return (
    <mesh
      position={[0, 0, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <planeGeometry args={[gridSize.width * TILE_SIZE, gridSize.height * TILE_SIZE]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
};
```

---

### Анимации (ИСПРАВЛЕНЫ — используют animatingParticipantId и clearAnimation)

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
  const animatingParticipantId = useBattleStore((s) => s.animatingParticipantId);
  // ✅ Используем новый alias clearAnimation
  const clearAnimation = useBattleStore((s) => s.actions.clearAnimation);

  useEffect(() => {
    if (!animation) return;
    
    // TODO Phase 5.2: добавить поддержку shoot
    if (animation.type !== 'move') {
      console.warn(`Animation type "${animation.type}" not yet implemented, skipping`);
      clearAnimation();
    }
  }, [animation, clearAnimation]);

  // ✅ Используем animatingParticipantId как источник истины
  if (!animation || animation.type !== 'move' || !animatingParticipantId) return null;

  return (
    <MoveAnimation
      unitId={animatingParticipantId}  // ✅ Используем animatingParticipantId
      path={animation.path}
      gridSize={gridSize}
      onComplete={clearAnimation}  // ✅ Используем clearAnimation alias
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

  useEffect(() => {
    if (path.length < 2 && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }, [path.length, onComplete]);

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

**`components/battle/BattleView3D.tsx`** (ИСПРАВЛЕН — использует animatingParticipantId)
```typescript
import { useCallback, useMemo } from 'react';
import { ThreeCanvas } from './three/ThreeCanvas';
import type { Position } from '@/types/battle';
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
import type { BattleLogic } from '@/hooks/useBattleLogic';
import { useBattleStore } from '@/stores';

interface BattleView3DProps {
  battleLogic: BattleLogic;
}

export const BattleView3D: React.FC<BattleView3DProps> = ({ battleLogic }) => {
  const battle = useBattleStore((s) => s.battle);
  const selectedParticipantId = useBattleStore((s) => s.selectedParticipantId);
  const activeParticipantId = useBattleStore((s) => s.battle?.activeParticipantId ?? null);
  const animatingParticipantId = useBattleStore((s) => s.animatingParticipantId);
  const { setSelectedParticipantId, setHoveredParticipantId } = useBattleStore((s) => s.actions);

  const participantsByPosition = useMemo(() => {
    const map = new Map<string, string>();
    if (!battle) return map;
    battle.participants.forEach((p) => {
      map.set(`${p.position.x},${p.position.y}`, p.id);
    });
    return map;
  }, [battle]);

  const availableMoves = useMemo(() => {
    const reachableCells = battleLogic.derivedData.reachableCells;
    if (!reachableCells) return [];

    const result: Position[] = [];
    for (const key of reachableCells.keys()) {
      const [xStr, yStr] = key.split(',');
      result.push({ x: Number(xStr), y: Number(yStr) });
    }
    return result;
  }, [battleLogic.derivedData.reachableCells]);

  const onCellHover = useCallback(
    (pos: Position | null) => {
      battleLogic.handlers.setHoveredPos(pos);
      if (!pos) {
        setHoveredParticipantId(null);
        return;
      }
      const participantId = participantsByPosition.get(`${pos.x},${pos.y}`) ?? null;
      setHoveredParticipantId(participantId);
    },
    [battleLogic.handlers, participantsByPosition, setHoveredParticipantId]
  );

  const onCellClick = useCallback(
    (pos: Position) => {
      const participantId = participantsByPosition.get(`${pos.x},${pos.y}`) ?? null;

      if (battleLogic.uiState.mode !== 'idle') {
        battleLogic.handlers.handleGridClick(pos);
        return;
      }

      if (participantId) {
        setSelectedParticipantId(participantId);
        battleLogic.handlers.cancelAction();
      }
    },
    [battleLogic.handlers, battleLogic.uiState.mode, participantsByPosition, setSelectedParticipantId]
  );

  const onUnitClick = useCallback(
    (id: string, pos: Position) => {
      if (battleLogic.uiState.mode !== 'idle') {
        battleLogic.handlers.handleGridClick(pos);
        return;
      }
      setSelectedParticipantId(id);
      battleLogic.handlers.cancelAction();
    },
    [battleLogic.handlers, battleLogic.uiState.mode, setSelectedParticipantId]
  );

  const battleView3D = useMemo(() => {
    if (!battle) return null;
    return mapBattleTo3D(
      battle,
      selectedParticipantId,
      activeParticipantId,
      availableMoves,
      animatingParticipantId  // ✅ Передаём animatingParticipantId
    );
  }, [battle, selectedParticipantId, activeParticipantId, availableMoves, animatingParticipantId]);

  if (!battleView3D) return null;

  const { gridSize, terrain, units } = battleView3D;

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
                onClick={onUnitClick}
                onHover={onCellHover}
              />
            ))}

            <MoveHighlights positions={availableMoves} gridSize={gridSize} />

            <HPBars3D units={units} gridSize={gridSize} />

            <AnimationSystem3D gridSize={gridSize} />

            <RaycastController
              gridSize={gridSize}
              onCellHover={onCellHover}
              onCellClick={onCellClick}
            />
          </ThreeCanvas>
        </ParticipantMeshProvider>
      </TerrainMeshProvider>

      <BattleHUD battleLogic={battleLogic} />
    </div>
  );
};

export default BattleView3D;
```

**`components/battle/BattleView.tsx`** (ИСПРАВЛЕН — default imports + gridRef)

Важно для 2D fallback: `gridRef.current.parentElement` должен быть scroll container, потому что `AnimationLayer` вешает `scroll` listener на `gridRef.current.parentElement`.
```typescript
import { Suspense, lazy, useRef } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useBattleLogic } from '@/hooks/useBattleLogic';
import { ViewModeToggle } from './ViewModeToggle';
import { BattleLoadingScreen } from './BattleLoadingScreen';
// ✅ ИСПРАВЛЕНО: default imports
import BattleGrid from './BattleGrid';
import AnimationLayer from './AnimationLayer';
import BattleHUD from './BattleHUD';

const BattleView3D = lazy(() => import('./BattleView3D'));

const BattleView: React.FC = () => {
  const [is3D, setIs3D] = useLocalStorage('battleViewMode', false);
  const battleLogic = useBattleLogic();
  // ✅ ИСПРАВЛЕНО: ref для AnimationLayer
  const gridRef = useRef<HTMLDivElement>(null);

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
        // ✅ ИСПРАВЛЕНО: реальный 2D рендеринг с gridRef
        <div className="relative w-full h-full overflow-auto">
          <div ref={gridRef} className="relative">
            <BattleGrid battleLogic={battleLogic} />
          </div>
          <AnimationLayer gridRef={gridRef} />
          <BattleHUD battleLogic={battleLogic} />
        </div>
      )}
    </div>
  );
};

export default BattleView;
```

---

## Проверки перед реализацией

```bash
# 1. Проверить что clearAnimation добавлен в store
grep -n "clearAnimation" stores/battleStore.ts

# 2. Проверить реэкспорты типов
grep -n "export type { Position" types/battle.ts
grep -n "export type GridSize" types/battle.ts
grep -n "export.*Position" types/character.ts
grep -n "export.*ParticipantStatus" types/character.ts

# 3. Проверить что анимации используют animatingParticipantId
grep -n "animatingParticipantId" stores/battleStore.ts
grep -n "animatingParticipantId" components/battle/AnimationLayer.tsx

# 3.1 Ввод не должен блокироваться мешами сцены (raycast discipline)
grep -n "raycast={() => null}" components/battle/three/GridFloor.tsx
grep -n "raycast={() => null}" components/battle/three/TerrainMesh.tsx
grep -n "raycast={() => null}" components/battle/three/MoveHighlights.tsx

# 3.2 Html overlay не должен перехватывать клики
grep -n "pointerEvents" components/battle/three/HPBars3D.tsx

# 3.3 Клик по юниту в action-mode должен вызывать handleGridClick(pos)
grep -n "onClick(unit.id, unit.position)" components/battle/three/ParticipantMesh.tsx
grep -n "handleGridClick(pos)" components/battle/BattleView3D.tsx

# 4. TypeScript check
npx tsc --noEmit

# 5. Тесты
npm test

# 6. Билд
npm run build

# 7. Smoke test
npm run dev
```

---

## Риски и митигация (MVP)

| Риск | Вероятность | Митигация |
|---|---:|---|
| Несовпадение контрактов useBattleLogic/3D компонентов | Высокая | Использовать “UI bridge” в `BattleView3D`, а не прокидывать `BattleLogic` в низкоуровневые компоненты |
| battleStore не содержит alias `clearAnimation` | Средняя | Добавить `actions.clearAnimation()` как thin wrapper над reset `animation/animatingParticipantId` |
| Производительность на больших картах | Средняя | MVP без LOD/instancing, измерить и добавить позже |
| WebGL недоступен | Низкая | Оставить 2D как fallback; опционально добавить UI-сообщение |

---

## Manual тесты (MVP)

| Сценарий | Ожидаемый результат |
|---|---|
| Переключение 2D ↔ 3D | 3D сцена рендерится, назад в 2D возвращается без регрессий |
| Hover клетки в 3D | Hover state и подсветки совпадают по поведению с `BattleGrid` |
| Hover над юнитом в 3D | hoveredPos/hoveredParticipantId обновляются корректно (как в 2D) |
| Клик по юниту в 3D | Selection меняется как в 2D, action mode сбрасывается корректно |
| Move → анимация → завершение | `animatingParticipantId` выставляется, затем `actions.clearAnimation()` сбрасывает оба поля |
| Быстрое переключение 2D↔3D 10 раз | Консоль без ошибок, ввод не ломается, UI остаётся отзывчивым |

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
constants/
├── three.ts
services/
├── three/
│   └── coordinates.ts
└── adapters/
    └── battle3dAdapter.ts
types/
├── battle.ts (+ реэкспорты)
└── battle3d.ts
hooks/
└── useLocalStorage.ts
components/
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

---

## Definition of Done (MVP)

✅ Готово к продакшену, когда:

1. `actions.clearAnimation()` добавлен и используется в 3D
2. 3D клики работают через тот же `useBattleLogic`, что и 2D (`handleGridClick/setHoveredPos/cancelAction`)
3. `animatingParticipantId` — единственный источник истины “кто анимируется”
4. `npx tsc --noEmit`, `npm test`, `npm run build` проходят
5. 2D режим не сломан (default `BattleGrid` + default `AnimationLayer(gridRef)`)

---

## Применённые исправления в v18

| # | Проблема | Исправление |
|---|----------|-------------|
| 1 | `clearAnimation` не существует | Добавлен в battleStore как alias |
| 2 | Использовался `animation.id` | Заменён на `animatingParticipantId` |
| 3 | Named imports для 2D | Заменены на default imports |
| 4 | AnimationLayer без gridRef | Добавлен gridRef |
| 5 | Свой AnimationState в адаптере | Удалён, используется доменный |
| 6 | Adapter принимал animation | Изменён на animatingParticipantId |
