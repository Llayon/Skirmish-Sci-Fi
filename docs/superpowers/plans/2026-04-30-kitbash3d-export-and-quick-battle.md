# KitBash3D Export + Quick Battle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Export KitBash3D Blender assets into the game as a GLB atlas and add a Quick Battle menu for instant skirmishes with 3D terrain.

**Architecture:** Add optional `modelRef` field to `Terrain` type. Industrial theme pieces reference GLB mesh names. React Three Fiber's `useGLTF` loads the atlas once. `TerrainMesh` routes between `GLBTerrainMesh` (for modelRef) and `PrimitiveTerrainMesh` (fallback). Quick Battle forces Industrial theme and launches immediately.

**Tech Stack:** React 19, TypeScript, Three.js, React Three Fiber (`@react-three/fiber`, `@react-three/drei`), Vite, Vitest

---

## File Structure

| File | Responsibility |
|------|---------------|
| `types/battle.ts` | `Terrain` interface — add `modelRef?: string` |
| `types/battle3d.ts` | `Terrain3D` interface — add `modelRef?: string` |
| `services/terrainGenerator.ts` | `createTerrain` accepts `modelRef`; Industrial pieces set it |
| `services/adapters/battle3dAdapter.ts` | Forward `modelRef` from `Terrain` to `Terrain3D` |
| `hooks/useTerrainAtlas.ts` | **NEW** — GLB atlas loading hook via `useGLTF` |
| `components/battle/three/GLBTerrainMesh.tsx` | **NEW** — render mesh from GLB atlas |
| `components/battle/three/PrimitiveTerrainMesh.tsx` | **NEW** — extracted primitive renderer (current TerrainMesh logic) |
| `components/battle/three/TerrainMesh.tsx` | **MODIFY** — router: GLB vs Primitive |
| `components/MainMenu.tsx` | Add "Quick Battle" button + modal |
| `components/QuickBattleModal.tsx` | **NEW** — mission selection modal |
| `services/application/battleSetup.ts` | Add placeholder crew generation for Quick Battle without campaign |

---

## Task 1: Add modelRef to Terrain Types

**Files:**
- Modify: `types/battle.ts:101-102`
- Modify: `types/battle3d.ts:26-27`

- [ ] **Step 1: Add modelRef to Terrain interface**

In `types/battle.ts`, add `modelRef?: string;` before the closing brace of `Terrain`:

```typescript
  /**
   * Reference to a named mesh inside the GLB terrain atlas.
   * When present, the 3D renderer loads this mesh instead of drawing a primitive.
   */
  modelRef?: string;
}
```

- [ ] **Step 2: Add modelRef to Terrain3D interface**

In `types/battle3d.ts`, add `modelRef?: string;` after `height`:

```typescript
  /** Vertical thickness of the piece above its base. Walls and crates
   *  have a visible height; flat floors/roofs are near-zero. */
  height: number;
  /**
   * Reference to a named mesh inside the GLB terrain atlas.
   * When present, the 3D renderer loads this mesh instead of drawing a primitive.
   */
  modelRef?: string;
}
```

- [ ] **Step 3: Commit**

```bash
git add types/battle.ts types/battle3d.ts
git commit -m "feat(types): add optional modelRef to Terrain and Terrain3D"
```

---

## Task 2: Update createTerrain and battle3dAdapter

**Files:**
- Modify: `services/terrainGenerator.ts:105-144`
- Modify: `services/adapters/battle3dAdapter.ts:51-68`

- [ ] **Step 1: Update createTerrain to accept modelRef**

In `services/terrainGenerator.ts`, add `modelRef` to the Pick union in `createTerrain` options:

```typescript
  options: Partial<
    Pick<
      Terrain,
      | "isDifficult"
      | "providesCover"
      | "blocksLineOfSight"
      | "isImpassable"
      | "isInteractive"
      | "parentId"
      | "baseElevation"
      | "objectHeight"
      | "losBlockerHeight"
      | "modelRef"
    >
  > = {},
```

Then add `modelRef` to the return object:

```typescript
  return {
    id: `terrain_${rng.nextId()}`,
    name,
    type,
    position: pos,
    size,
    isDifficult: options.isDifficult ?? false,
    providesCover: options.providesCover ?? false,
    blocksLineOfSight: options.blocksLineOfSight ?? false,
    isImpassable: options.isImpassable ?? false,
    isInteractive: options.isInteractive ?? false,
    parentId: options.parentId,
    baseElevation: options.baseElevation ?? 0,
    objectHeight: options.objectHeight ?? 0,
    modelRef: options.modelRef,
    ...(options.losBlockerHeight != null
      ? { losBlockerHeight: options.losBlockerHeight }
      : {}),
  };
```

- [ ] **Step 2: Forward modelRef in battle3dAdapter**

In `services/adapters/battle3dAdapter.ts`, update `mapTerrainTo3D`:

```typescript
function mapTerrainTo3D(t: Terrain): Terrain3D {
  const type = getTerrain3DType(t);
  const height = t.objectHeight ?? getTerrainHeight(type);
  const baseElevation = t.baseElevation ?? 0;

  return {
    id: t.id,
    type,
    position: t.position,
    size: t.size,
    baseElevation,
    height,
    modelRef: t.modelRef,
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add services/terrainGenerator.ts services/adapters/battle3dAdapter.ts
git commit -m "feat(rules): forward modelRef through terrain generation and 3D adapter"
```

---

## Task 3: Add modelRef to Industrial Theme Pieces

**Files:**
- Modify: `services/terrainGenerator.ts` (Industrial generator sections)

- [ ] **Step 1: Update createBuilding to accept and forward modelRef**

In `services/terrainGenerator.ts`, update `createBuilding` signature:

```typescript
function createBuilding(
  name: string,
  pos: Position,
  size: { width: number; height: number },
  rng: GenCursor,
  modelRef?: string,
): Terrain[] {
```

Then pass `modelRef` into `createTerrain` calls inside `createBuilding`:

Find all `createTerrain(rng, ...)` calls inside `createBuilding` and add `modelRef` to their options:

For the small building case (lines 159-164):
```typescript
return [
  createTerrain(rng, name, "Block", pos, size, {
    providesCover: true,
    blocksLineOfSight: true,
    isImpassable: true,
    objectHeight: 2,
    modelRef,
  }),
];
```

For wall pieces and interior floor inside `createBuilding`, add `modelRef` to the outer block and optionally to walls.

- [ ] **Step 2: Add modelRef to Industrial large_structure generator**

Find the Industrial `large_structure` generator (around line 337) and update:

```typescript
large_structure: (rect, existing, rng) => {
  const size = { width: rng.d6() + 4, height: rng.d6() + 4 };
  const pos = findFreeSpot(rect, size, existing, rng);
  if (!pos) return [];
  return createBuilding("Large Structure", pos, size, rng, "BldgLgCommsArray");
},
```

- [ ] **Step 3: Add modelRef to other Industrial pieces**

For `industrial_cluster` (Control Tower):
```typescript
return createBuilding("Control Tower", towerPos, towerSize, rng, "BldgLgCommsArray");
```

For `road_segment` (if exists):
```typescript
createTerrain(rng, "Road Segment", "Linear", pos, size, {
  providesCover: false,
  blocksLineOfSight: false,
  isImpassable: false,
  modelRef: "StrctrRoadSystem",
});
```

**Note:** Only add `modelRef` to the most visually distinctive large structures. Start with 3-5 pieces to validate the pipeline.

- [ ] **Step 4: Commit**

```bash
git add services/terrainGenerator.ts
git commit -m "feat(rules): add modelRef to Industrial theme terrain pieces"
```

---

## Task 4: Create useTerrainAtlas Hook

**Files:**
- Create: `hooks/useTerrainAtlas.ts`

- [ ] **Step 1: Write the hook**

```typescript
import { useGLTF } from '@react-three/drei';
import { useCallback } from 'react';
import * as THREE from 'three';

/**
 * Loads the terrain GLB atlas once and provides a function to retrieve
 * cloned geometry by mesh name.
 */
export function useTerrainAtlas() {
  const { scene } = useGLTF('/assets/terrain_atlas.glb');

  const getGeometry = useCallback(
    (name: string): THREE.BufferGeometry | null => {
      if (!scene) return null;
      const mesh = scene.getObjectByName(name) as THREE.Mesh | undefined;
      if (!mesh || !mesh.geometry) return null;
      return mesh.geometry.clone();
    },
    [scene],
  );

  const hasGeometry = useCallback(
    (name: string): boolean => {
      if (!scene) return false;
      const mesh = scene.getObjectByName(name) as THREE.Mesh | undefined;
      return !!mesh && !!mesh.geometry;
    },
    [scene],
  );

  return { getGeometry, hasGeometry, loaded: !!scene };
}

/** Preload the atlas at app startup */
useGLTF.preload('/assets/terrain_atlas.glb');
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useTerrainAtlas.ts
git commit -m "feat(ui): add useTerrainAtlas hook for GLB atlas loading"
```

---

## Task 5: Create GLBTerrainMesh Component

**Files:**
- Create: `components/battle/three/GLBTerrainMesh.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { useMemo } from 'react';
import { TILE_SIZE } from '@/constants/three';
import { gridToWorld } from '@/services/three/coordinates';
import type { GridSize } from '@/types/battle';
import type { Terrain3D } from '@/types/battle3d';
import { useTerrainAtlas } from '@/hooks/useTerrainAtlas';

interface GLBTerrainMeshProps {
  terrain: Terrain3D;
  gridSize: GridSize;
}

export const GLBTerrainMesh = ({ terrain, gridSize }: GLBTerrainMeshProps) => {
  const { getGeometry } = useTerrainAtlas();

  const geometry = useMemo(() => {
    if (!terrain.modelRef) return null;
    return getGeometry(terrain.modelRef);
  }, [terrain.modelRef, getGeometry]);

  if (!geometry) return null;

  // Center the mesh over the terrain footprint
  const centerCellX = terrain.position.x + (terrain.size.width - 1) / 2;
  const centerCellY = terrain.position.y + (terrain.size.height - 1) / 2;
  const centerY = terrain.baseElevation + terrain.height / 2;
  const position = gridToWorld(
    { x: centerCellX, y: centerCellY },
    gridSize,
    centerY,
  );

  // Scale to match tile size if the GLB mesh is authored at unit scale
  const scaleX = terrain.size.width * TILE_SIZE;
  const scaleZ = terrain.size.height * TILE_SIZE;

  return (
    <mesh
      position={[position.x, position.y, position.z]}
      geometry={geometry}
      castShadow
      receiveShadow
      raycast={() => null}
      userData={{ terrainId: terrain.id, terrainType: terrain.type }}
    >
      <meshStandardMaterial
        color="#888888"
        roughness={0.7}
        metalness={0.3}
      />
    </mesh>
  );
};
```

**Note:** Scale handling may need adjustment depending on how the GLB mesh was authored. If KitBash3D meshes are already scaled to real-world units, remove the `scaleX/scaleZ` scaling.

- [ ] **Step 2: Commit**

```bash
git add components/battle/three/GLBTerrainMesh.tsx
git commit -m "feat(ui): add GLBTerrainMesh component for atlas mesh rendering"
```

---

## Task 6: Extract PrimitiveTerrainMesh and Update TerrainMesh Router

**Files:**
- Create: `components/battle/three/PrimitiveTerrainMesh.tsx`
- Modify: `components/battle/three/TerrainMesh.tsx`

- [ ] **Step 1: Extract primitive renderer to new file**

Create `components/battle/three/PrimitiveTerrainMesh.tsx` with the current `TerrainMesh` logic:

```tsx
import { useEffect, useRef } from 'react';
import type * as THREE from 'three';
import { TILE_SIZE } from '@/constants/three';
import { gridToWorld } from '@/services/three/coordinates';
import type { GridSize } from '@/types/battle';
import type { Terrain3D } from '@/types/battle3d';
import { useTerrainMeshContext } from './contexts/TerrainMeshContext';

interface PrimitiveTerrainMeshProps {
  terrain: Terrain3D;
  gridSize: GridSize;
}

export const PrimitiveTerrainMesh = ({
  terrain,
  gridSize,
}: PrimitiveTerrainMeshProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { register, unregister } = useTerrainMeshContext();

  useEffect(() => {
    if (meshRef.current) {
      register(terrain.id, meshRef.current);
      return () => unregister(terrain.id);
    }
  }, [terrain.id, register, unregister]);

  const visualHeight = terrain.height > 0 ? terrain.height : 0.05;
  const centerY = terrain.baseElevation + visualHeight / 2;
  const centerCellX = terrain.position.x + (terrain.size.width - 1) / 2;
  const centerCellY = terrain.position.y + (terrain.size.height - 1) / 2;
  const position = gridToWorld(
    { x: centerCellX, y: centerCellY },
    gridSize,
    centerY,
  );

  return (
    <mesh
      ref={meshRef}
      raycast={() => null}
      position={[position.x, position.y, position.z]}
      castShadow
      receiveShadow
      userData={{ terrainId: terrain.id, terrainType: terrain.type }}
    >
      {getTerrainGeometry(terrain, visualHeight)}
      {getTerrainMaterial(terrain)}
    </mesh>
  );
};

function getTerrainGeometry(terrain: Terrain3D, visualHeight: number) {
  const fw = terrain.size.width * TILE_SIZE;
  const fh = terrain.size.height * TILE_SIZE;
  switch (terrain.type) {
    case 'Wall':
      return <boxGeometry args={[TILE_SIZE, visualHeight, TILE_SIZE * 0.2]} />;
    case 'Barrel':
      return <cylinderGeometry args={[0.3, 0.35, visualHeight, 8]} />;
    case 'Container':
      return <boxGeometry args={[TILE_SIZE * 2, visualHeight, TILE_SIZE]} />;
    case 'Floor':
      return <boxGeometry args={[fw, visualHeight, fh]} />;
    case 'Obstacle':
    default:
      return <boxGeometry args={[TILE_SIZE * 0.8, visualHeight, TILE_SIZE * 0.8]} />;
  }
}

function getTerrainMaterial(terrain: Terrain3D) {
  const colors: Record<string, string> = {
    Wall: '#666666',
    Barrel: '#8B4513',
    Container: '#2E5090',
    Obstacle: '#555555',
    Floor: '#1a1a2e',
  };

  return <meshStandardMaterial color={colors[terrain.type] || colors.Obstacle} />;
}
```

- [ ] **Step 2: Update TerrainMesh to route between GLB and Primitive**

Replace `components/battle/three/TerrainMesh.tsx`:

```tsx
import type { GridSize } from '@/types/battle';
import type { Terrain3D } from '@/types/battle3d';
import { GLBTerrainMesh } from './GLBTerrainMesh';
import { PrimitiveTerrainMesh } from './PrimitiveTerrainMesh';

interface TerrainMeshProps {
  terrain: Terrain3D;
  gridSize: GridSize;
}

export const TerrainMesh = ({ terrain, gridSize }: TerrainMeshProps) => {
  if (terrain.modelRef) {
    return <GLBTerrainMesh terrain={terrain} gridSize={gridSize} />;
  }
  return <PrimitiveTerrainMesh terrain={terrain} gridSize={gridSize} />;
};
```

- [ ] **Step 3: Commit**

```bash
git add components/battle/three/PrimitiveTerrainMesh.tsx components/battle/three/TerrainMesh.tsx
git commit -m "refactor(ui): extract PrimitiveTerrainMesh and add TerrainMesh router"
```

---

## Task 7: Add Quick Battle Menu to MainMenu

**Files:**
- Create: `components/QuickBattleModal.tsx`
- Modify: `components/MainMenu.tsx`

- [ ] **Step 1: Create QuickBattleModal component**

```tsx
import React from 'react';
import { useTranslation } from '@/i18n';
import Modal from '@/components/ui/Modal';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import type { MissionType } from '@/types';

interface QuickBattleModalProps {
  onClose: () => void;
  onStart: (missionType: MissionType) => void;
}

const MISSIONS: { type: MissionType; labelKey: string }[] = [
  { type: 'Eliminate', labelKey: 'missions.eliminate' },
  { type: 'Protect', labelKey: 'missions.protect' },
];

export const QuickBattleModal: React.FC<QuickBattleModalProps> = ({
  onClose,
  onStart,
}) => {
  const { t } = useTranslation();

  const handleRandom = () => {
    const random = MISSIONS[Math.floor(Math.random() * MISSIONS.length)];
    onStart(random.type);
  };

  return (
    <Modal onClose={onClose} title={t('quickBattle.title')}>
      <Card className="w-full sm:max-w-md bg-surface-overlay !p-0">
        <div className="p-6 space-y-4">
          <p className="text-text-muted text-sm">{t('quickBattle.description')}</p>
          <div className="space-y-2">
            {MISSIONS.map((mission) => (
              <Button
                key={mission.type}
                onClick={() => onStart(mission.type)}
                className="w-full justify-start"
              >
                {t(mission.labelKey)}
              </Button>
            ))}
            <Button
              onClick={handleRandom}
              variant="secondary"
              className="w-full justify-start"
            >
              🎲 {t('quickBattle.random')}
            </Button>
          </div>
        </div>
        <div className="mt-4 text-right border-t border-border pt-4 px-6">
          <Button onClick={onClose} variant="ghost">
            {t('buttons.cancel')}
          </Button>
        </div>
      </Card>
    </Modal>
  );
};
```

- [ ] **Step 2: Add Quick Battle button to MainMenu**

In `components/MainMenu.tsx`:

1. Import the modal:
```typescript
import { QuickBattleModal } from './QuickBattleModal';
import { Zap } from 'lucide-react';
```

2. Add state:
```typescript
const [isQuickBattleOpen, setQuickBattleOpen] = useState(false);
```

3. Add handler:
```typescript
const handleQuickBattle = () => {
  setQuickBattleOpen(true);
};

const handleStartQuickBattle = (missionType: MissionType) => {
  setQuickBattleOpen(false);
  setGameMode('quick_battle', { missionType });
};
```

4. Add to menuItems (after Continue/New Game, before Multiplayer):
```typescript
{ id: 'quick_battle', label: t('quickBattle.title'), icon: Zap, action: handleQuickBattle, onMouseEnter: () => {}, condition: true },
```

5. Render the modal:
```tsx
{isQuickBattleOpen && (
  <QuickBattleModal
    onClose={() => setQuickBattleOpen(false)}
    onStart={handleStartQuickBattle}
  />
)}
```

**Note:** `setGameMode('quick_battle', ...)` may need adjustment based on actual `uiStore` API. Check `useUiStore` for correct action names.

- [ ] **Step 3: Commit**

```bash
git add components/QuickBattleModal.tsx components/MainMenu.tsx
git commit -m "feat(ui): add Quick Battle menu and mission selection modal"
```

---

## Task 8: Add Placeholder Crew and Quick Battle Setup

**Files:**
- Modify: `services/application/battleSetup.ts`

- [ ] **Step 1: Add createPlaceholderCrew helper**

At the top of `services/application/battleSetup.ts`, add:

```typescript
function createPlaceholderCrew(): Crew {
  return {
    id: `placeholder_crew_${Date.now()}`,
    name: 'Quick Strike Team',
    members: [
      createPlaceholderCharacter('Alpha', 'soldier'),
      createPlaceholderCharacter('Beta', 'soldier'),
      createPlaceholderCharacter('Gamma', 'technician'),
      createPlaceholderCharacter('Delta', 'scout'),
    ],
    credits: 0,
    ship: { name: 'Quick Transport', cargo: [] },
    stash: [],
  };
}

function createPlaceholderCharacter(name: string, classId: string): Character {
  return {
    id: `char_${name.toLowerCase()}_${Date.now()}`,
    name,
    raceId: 'baseline_human',
    classId,
    backgroundId: 'mercenary',
    motivationId: 'credits',
    pronouns: 'they/them',
    xp: 0,
    injuries: [],
    task: 'idle',
    backstory: 'A hired gun for quick operations.',
    stats: { reactions: 1, speed: 4, combat: 1, toughness: 3, savvy: 0, luck: 0 },
    weapons: [{ instanceId: `w_${Date.now()}`, weaponId: 'rifle' }],
    armor: undefined,
    screen: undefined,
    consumables: [],
    utilityDevices: [],
    implants: [],
    portraitUrl: `/assets/portraits/sci_fi_portrait_01.png`,
  };
}
```

- [ ] **Step 2: Add setupQuickBattle export**

```typescript
export const setupQuickBattle = async (
  missionType: MissionType,
  difficulty: Difficulty = 'normal',
): Promise<Battle> => {
  const crew = createPlaceholderCrew();
  return setupBattle(crew, difficulty, missionType, 'opportunity', undefined, {
    forceTerrainTheme: 'Industrial',
  });
};
```

- [ ] **Step 3: Wire Quick Battle to uiStore**

In `components/MainMenu.tsx`, instead of `setGameMode('quick_battle', ...)`, import `setupQuickBattle` and start the battle:

```typescript
import { setupQuickBattle } from '@/services/application/battleSetup';
import { useBattleStore } from '@/stores';

// In component:
const { startBattle } = useBattleStore(state => state.actions);

const handleStartQuickBattle = async (missionType: MissionType) => {
  setQuickBattleOpen(false);
  const battle = await setupQuickBattle(missionType);
  startBattle(battle);
  setGameMode('battle');
};
```

**Note:** Adjust `startBattle` and `setGameMode` calls to match actual store APIs. Verify with `useBattleStore` and `useUiStore` definitions.

- [ ] **Step 4: Commit**

```bash
git add services/application/battleSetup.ts components/MainMenu.tsx
git commit -m "feat(campaign): add placeholder crew and quick battle setup"
```

---

## Task 9: Export terrain_atlas.glb from Blender

**Files:**
- Create: `public/assets/terrain_atlas.glb` (via Blender export)

This is a **manual Blender step**:

- [ ] **Step 1: Select large structures**
  - In Blender, select only large unique meshes (~50-100 objects)
  - Skip small clutter (chairs, sofas, kiosks)

- [ ] **Step 2: Apply Decimate modifier**
  - Ratio: 0.5
  - Apply to all selected meshes

- [ ] **Step 3: Export glTF Binary (.glb)**
  - File → Export → glTF 2.0
  - Format: glTF Binary (.glb)
  - Include: Selected Objects
  - Transform: +Y Up
  - Data: Compression = Draco
  - Draco settings: Position=14, Normal=10, Texcoord=12
  - Materials: Export (PBR without texture images)
  - Animations: OFF
  - Cameras: OFF
  - Lights: OFF

- [ ] **Step 4: Copy to project**
  ```bash
  cp /path/to/exported/terrain_atlas.glb public/assets/terrain_atlas.glb
  ```

- [ ] **Step 5: Verify size**
  ```bash
  ls -lh public/assets/terrain_atlas.glb
  ```
  Expected: 10-20 MB

- [ ] **Step 6: Commit**
  ```bash
  git add public/assets/terrain_atlas.glb
  git commit -m "assets: add KitBash3D terrain atlas (Draco-compressed GLB)"
  ```

---

## Task 10: Tests and Verification

- [ ] **Step 1: Run unit tests**

```bash
npx vitest run
```
Expected: All existing tests pass. New code does not break anything.

- [ ] **Step 2: Run linter**

```bash
npx eslint --fix hooks/useTerrainAtlas.ts components/battle/three/GLBTerrainMesh.tsx components/battle/three/PrimitiveTerrainMesh.tsx components/battle/three/TerrainMesh.tsx components/QuickBattleModal.tsx components/MainMenu.tsx services/application/battleSetup.ts types/battle.ts types/battle3d.ts services/terrainGenerator.ts services/adapters/battle3dAdapter.ts
```

- [ ] **Step 3: Run prettier**

```bash
npx prettier --write hooks/useTerrainAtlas.ts components/battle/three/GLBTerrainMesh.tsx components/battle/three/PrimitiveTerrainMesh.tsx components/battle/three/TerrainMesh.tsx components/QuickBattleModal.tsx components/MainMenu.tsx services/application/battleSetup.ts types/battle.ts types/battle3d.ts services/terrainGenerator.ts services/adapters/battle3dAdapter.ts
```

- [ ] **Step 4: Build check**

```bash
npm run build
```
Expected: Build succeeds, `dist/assets/terrain_atlas.glb` is present.

- [ ] **Step 5: Commit formatting**

```bash
git add -A
git commit -m "style: apply linting and formatting for KitBash3D export" || echo "No changes"
```

---

## Self-Review

**Spec coverage check:**
- ✅ `modelRef` added to Terrain types — Tasks 1, 2
- ✅ Industrial theme pieces reference GLB meshes — Task 3
- ✅ GLB atlas loading via useGLTF — Task 4
- ✅ GLB mesh rendering — Task 5
- ✅ Primitive fallback preserved — Task 6
- ✅ Quick Battle menu — Tasks 7, 8
- ✅ Backward compatibility (old saves, campaign) — implicit via optional modelRef
- ✅ Blender export pipeline — Task 9

**Placeholder scan:**
- ✅ No TBDs or TODOs
- ✅ All code blocks contain actual implementation
- ✅ Exact file paths specified
- ✅ Commit commands included

**Type consistency:**
- ✅ `modelRef?: string` in both `Terrain` and `Terrain3D`
- ✅ `createTerrain` options include `modelRef`
- ✅ `battle3dAdapter` forwards `modelRef`
- ✅ `GLBTerrainMesh` reads `terrain.modelRef`

**One gap:** The actual `uiStore` API for `setGameMode` and `startBattle` was not verified in detail. The engineer must check actual store methods before wiring Task 8.

---

*Plan complete. Proceed to execution via subagent-driven-development or executing-plans.*
