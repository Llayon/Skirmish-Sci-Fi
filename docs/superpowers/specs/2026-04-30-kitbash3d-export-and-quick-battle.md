# Design: KitBash3D Export + Quick Battle Menu

**Date:** 2026-04-30
**Status:** Draft → Approved
**Scope:** Export Blender KitBash3D assets into the game + add Quick Battle menu

---

## 1. Problem Statement

We have 711 KitBash3D objects in Blender (`KB3D_MissionToMinerva-Native`) but the game renders terrain as primitive boxes/cylinders. We want:
1. Export large structures from Blender as 3D models into the game
2. Keep file size small for web delivery
3. Add a "Quick Battle" menu for instant skirmishes
4. Maintain 100% backward compatibility with existing saves and campaign battles

---

## 2. Blender Export Pipeline

### 2.1 Object Selection

Export **only large structures** (~50–100 unique meshes):
- Buildings (Comms Array, Community Center, etc.)
- Roads and platforms
- Towers and antennas
- Large decorative structures

**Skip** small clutter (chairs, sofas, kiosks, hologram maps) — keep as primitives or omit.

### 2.2 Cleanup & Optimization

1. **Remove duplicates:** `Object → Delete → By Type → Mesh` with uniqueness check
2. **Decimate:** Apply Decimate modifier, ratio 0.5 on all meshes
3. **Group by type:**
   - `Building_*` — buildings
   - `Road_*` — roads/platforms
   - `Structure_*` — towers, antennas
   - `Detail_*` — large decorative pieces

### 2.3 Export Settings

**Format:** glTF 2.0 Binary (`.glb`)
**File:** `assets/terrain_atlas.glb`

Settings:
- ✅ `Compression: Draco` (position=14, normal=10, texcoord=12)
- ✅ `Materials: Export` (PBR baseColor, roughness, metallic — **no texture maps**)
- ✅ `Data: Geometry + Materials` (no animations, no cameras, no lights)
- ✅ `Y-up`

**Expected size:** ~10–15 MB after Draco

### 2.4 Material Strategy

- Export PBR material parameters from Blender (baseColor, roughness, metallic)
- **Do NOT export texture images** — keeps file size minimal
- Result: colored, glossy objects without surface details (rust, graffiti, panels)
- Procedural fallback: if material missing, use `MeshStandardMaterial` with theme-appropriate color

---

## 3. Data Flow

### 3.1 Terrain Type Extension

Add **optional** field to `Terrain` type:

```typescript
interface Terrain {
  // ... existing fields ...
  modelRef?: string; // Name of mesh in GLB atlas, e.g. "BldgLgCommsArray"
}
```

**Backward compatibility rule:** `modelRef` is optional. Terrain without it renders as primitives.

### 3.2 Where modelRef is Set

Only `Industrial` theme pieces get `modelRef` in `TERRAIN_PIECE_DEFINITIONS`:

```typescript
const INDUSTRIAL_PIECES = [
  {
    name: 'Comms Array',
    type: 'Building',
    modelRef: 'BldgLgCommsArray',
    size: { width: 6, height: 6 },
    // ...
  },
  // ...
];
```

Other themes (`Wilderness`, `AlienRuin`, `CrashSite`) have **no** `modelRef` — they continue using primitives.

### 3.3 Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  Campaign / Old Battles        │  Quick Battle (NEW)            │
├─────────────────────────────────────────────────────────────────┤
│  Theme from world/tables       │  forceTheme: "Industrial"      │
│  (Wilderness/AlienRuin/        │  ↓                             │
│   CrashSite/Industrial)        │  TERRAIN_PIECE_DEFINITIONS     │
│  ↓                             │  with modelRef                 │
│  No modelRef (except random    │  ↓                             │
│   Industrial from world)       │  Terrain[] with modelRef       │
│  ↓                             │  ↓                             │
│  PrimitiveTerrainMesh          │  GLBTerrainMesh                │
│  (boxes/cylinders — current)   │  (from terrain_atlas.glb)      │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 Fallback Chain

```
terrain.modelRef exists?
  → Yes: GLB atlas loaded?
    → Yes: GLBTerrainMesh
    → No: PrimitiveTerrainMesh (fallback)
  → No: PrimitiveTerrainMesh
```

---

## 4. Components & Rendering

### 4.1 useTerrainAtlas Hook

```typescript
// hooks/useTerrainAtlas.ts
export function useTerrainAtlas() {
  const { scene } = useGLTF('/assets/terrain_atlas.glb');
  
  const getMesh = useCallback((name: string) => {
    const mesh = scene.getObjectByName(name) as THREE.Mesh | undefined;
    if (!mesh) return null;
    return mesh.geometry.clone();
  }, [scene]);

  return { getMesh, loaded: !!scene };
}

// Preload at app startup
useGLTF.preload('/assets/terrain_atlas.glb');
```

### 4.2 GLBTerrainMesh Component

```tsx
// components/battle/three/GLBTerrainMesh.tsx
export const GLBTerrainMesh = ({ terrain, gridSize }: Props) => {
  const { getMesh } = useTerrainAtlas();
  const geometry = getMesh(terrain.modelRef!);
  
  if (!geometry) return <PrimitiveTerrainMesh terrain={terrain} gridSize={gridSize} />;

  const position = gridToWorld(terrain.position, gridSize, terrain.baseElevation);
  
  return (
    <mesh
      position={[position.x, position.y, position.z]}
      geometry={geometry}
      castShadow
      receiveShadow
      raycast={() => null}
    >
      <meshStandardMaterial
        color={terrain.color || '#888888'}
        roughness={0.7}
        metalness={0.3}
      />
    </mesh>
  );
};
```

### 4.3 TerrainMesh Router

Update `TerrainMesh.tsx` to route between GLB and primitives:

```tsx
export const TerrainMesh = ({ terrain, gridSize }: Props) => {
  if (terrain.modelRef) {
    return <GLBTerrainMesh terrain={terrain} gridSize={gridSize} />;
  }
  return <PrimitiveTerrainMesh terrain={terrain} gridSize={gridSize} />;
};
```

### 4.4 PrimitiveTerrainMesh

Current `TerrainMesh.tsx` logic — **unchanged**. Renders:
- `Wall` → box
- `Barrel` → cylinder
- `Container` → wide box
- `Floor` → flat slab
- `Obstacle` → small box

### 4.5 Instancing (Future Optimization)

For repeated objects (e.g., multiple road segments), group by `modelRef` and use `THREE.InstancedMesh`:

```typescript
// Future: InstancedTerrainRenderer
const instances = groupBy(terrainPieces, 'modelRef');
// Render each group as one InstancedMesh
```

**Out of scope for v1** — implement if performance becomes an issue.

---

## 5. Quick Battle Menu

### 5.1 UI Location

Add to `MainMenu.tsx`:
- Button: "⚡ Quick Battle" (between "Continue" and "New Campaign")

### 5.2 Modal: Mission Selection

Simple modal with 3 buttons:
- `Eliminate` — destroy target enemy
- `Protect` — escort VIP to evacuation point
- `🎲 Random` — random mission

### 5.3 Battle Setup

On "Start":

```typescript
const battle = await setupBattle(
  crew,              // Current crew (or placeholder if no campaign)
  "normal",          // Fixed difficulty
  selectedMission,   // Eliminate | Protect | Random
  "opportunity",     // Fixed battle type
  undefined,         // No campaign
  {
    forceTerrainTheme: "Industrial", // Force Industrial for GLB assets
  }
);
```

### 5.4 No Campaign Handling

If player has no active crew (fresh start):
- Generate a **placeholder crew** (4 basic characters)
- Use default portraits
- Allow Quick Battle without campaign progression

---

## 6. Loading & Performance

### 6.1 Preloading

```typescript
// App.tsx or main entry
useGLTF.preload('/assets/terrain_atlas.glb');
```

GLB loads once at app startup, cached by React Three Fiber.

### 6.2 Size Budget

| Asset | Size | Notes |
|-------|------|-------|
| `terrain_atlas.glb` | ~10–15 MB | Draco-compressed, no textures |
| Total game bundle | +~10–15 MB | Acceptable for desktop, lazy-load for mobile |

### 6.3 Culling

- `frustumCulled={true}` on all meshes (default in R3F)
- `raycast={() => null}` on terrain meshes (already implemented)
- No additional LOD needed (tactical camera is close)

---

## 7. Backward Compatibility

| Scenario | Behavior |
|----------|----------|
| Old save loaded | `Terrain[]` has no `modelRef` → primitives |
| Campaign battle (non-Industrial) | No `modelRef` in terrain → primitives |
| Campaign battle (Industrial) | `modelRef` present, GLB loaded → 3D models |
| Quick Battle | `forceTerrainTheme: "Industrial"` → `modelRef` → 3D models |
| GLB fails to load | Fallback to primitives for all `modelRef` |
| `modelRef` not found in atlas | Fallback to primitives |

---

## 8. Success Criteria

- [ ] `terrain_atlas.glb` exported from Blender, < 20 MB
- [ ] Quick Battle button in Main Menu
- [ ] Quick Battle generates Industrial map with 3D models
- [ ] Campaign battles unaffected (primitives for non-Industrial)
- [ ] Old saves load correctly (primitives)
- [ ] All existing tests pass
- [ ] No `any` types in new code
- [ ] ESLint + Prettier clean

---

## 9. Out of Scope

- Exporting small decorative objects (chairs, sofas)
- Texture maps / photorealistic materials
- Multiple GLB atlases (one per theme)
- LOD system (high/low meshes)
- InstancedMesh optimization (future)
- Mobile-specific optimizations
- Multiplayer Quick Battle

---

## 10. Files to Modify

| File | Change |
|------|--------|
| `types/battle.ts` | Add `modelRef?: string` to `Terrain` |
| `services/terrainGenerator.ts` | Add `modelRef` to Industrial `TERRAIN_PIECE_DEFINITIONS` |
| `components/MainMenu.tsx` | Add "Quick Battle" button |
| `components/battle/three/TerrainMesh.tsx` | Add router: GLB vs Primitive |
| `components/battle/three/GLBTerrainMesh.tsx` | **NEW** — render GLB mesh |
| `hooks/useTerrainAtlas.ts` | **NEW** — GLB loading hook |
| `services/application/battleSetup.ts` | Add placeholder crew for Quick Battle without campaign |
| `vite.config.ts` | Ensure `assets/` copied to `dist/` |
| `public/assets/terrain_atlas.glb` | **NEW** — exported from Blender |

---

*Design approved. Proceed to implementation planning.*
