# Technical Audit: AI & Rules Engine (V2 - Stage 1-6)

**Date**: 2026-04-22
**Status**: COMPLETED
**Scope**: Line of Sight, Targeting, Pathfinding, AI Profiles (7 types), AoE Weapons.

---

## 1. Executive Summary
The Engine V2 has successfully transitioned from an imperative, side-effect-heavy model to a **pure, deterministic state machine**. All core primitives for AI decision-making are implemented as pure functions, strictly decoupled from the UI and global stores.

## 2. Architecture Compliance
| Criterion | Status | Evidence |
| :--- | :--- | :--- |
| **Purity** | ✅ Perfect | No restricted imports (`react`, `zustand`, `Math`) found in `services/engine`. |
| **Determinism** | ✅ Perfect | Seeded RNG used everywhere; `localeCompare` used for tie-breaking in A* and Targeting. |
| **Type Safety** | ✅ High | `any` removed from production code; strict interfaces for `BattleParticipant` and `ShootingWeapon`. |
| **Verification** | ✅ High | 38 green tests covering parity and unit logic. |

---

## 3. Component Deep Dive

### 3.1 Visibility (LoS)
- **Implemented**: Supercover algorithm (Amanatides-Woo).
- **Strengths**: Multi-cell aware, supports dynamic terrain (Doors).
- **Recommendation**: Optimize `terrain.find` in the loop if grid size exceeds 20x20. Use a pre-calculated 2D occlusion map.

### 3.2 Targeting
- **Implemented**: Priority-based (TN > Dist > ID > RNG).
- **Strengths**: Supports different modes (`TN` for shooters, `Distance` for beasts).
- **Recommendation**: Add "Weapon Selection" logic before targeting (AI currently only uses the first weapon).

### 3.3 Pathfinding
- **Implemented**: Deterministic A*.
- **Strengths**: Tie-breaking via `posKey` comparison ensures parity across clients.
- **Recommendation**: Implement Dijkstra-based "Navigation Heatmaps" to avoid re-calculating the same paths for different enemies.

### 3.4 AI Profiles
- **Implemented**: 7 rulebook profiles (Aggressive, Rampaging, Cautious, Tactical, Defensive, Beast, Guardian).
- **Strengths**: Weighted scoring (`evaluateMovementOptions`) allows for nuanced behavior.
- **Recommendation**: Refactor `Defensive AI` to store `initialHalf` in participant state to handle pushbacks correctly.

---

## 4. Future Improvements (Roadmap)
1. **Navigation Mesh**: Move from per-cell scan to a pre-baked walkability/cover map for each turn.
2. **AoE Grenade Scatter**: Implement scatter rules (missing in current THROW_GRENADE).
3. **Terrain Feature Awareness**: Group cells into "Features" (Buildings, Woods) for more accurate Defensive AI behavior.
4. **Behavioral Traits**: Integrate character traits (e.g., "Fearless", "Slow") directly into AI scoring weights.

---

## 5. Definition of Done for Stage 7 (Integration)
- [ ] Implement `aiDispatcher.ts` to route behaviors.
- [ ] Add `PROCESS_AI_TURN` action in `reduceBattle.ts`.
- [ ] Ensure AI-generated actions are recorded in the `actionLog` for replay/multiplayer.
