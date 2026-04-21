# Specification: Deterministic Enemy Targeting (Engine V2)

**Goal**: Implement a pure, deterministic function to identify the "best" target for an enemy participant, strictly following the Five Parsecs rulebook hierarchy.

---

## 1. Targeting Hierarchy
When an enemy needs to choose a target (for shooting or movement), it must evaluate all potential candidates (player characters) and pick one based on this priority:

1. **Easiest to Hit**: The candidate with the **Lowest Target Number (TN)** for a shooting attack.
   - *Logic*: AI is pragmatic and prefers high-probability outcomes.
2. **Closest**: If TNs are tied, pick the candidate at the **Minimum Distance** (Chebyshev distance).
3. **Deterministic Random**: If both TN and Distance are tied, use a **Seeded Roll** (`deps.rng.d100`) to break the tie.

## 2. Requirements
- **Visibility Check**: Only candidates in Line of Sight (using `hasLineOfSight`) are considered for shooting.
- **Weapon Awareness**: If picking for shooting, the candidate must be within the weapon's `range`.
- **Determinism**: No `Array.sort()` without stable tie-breaking, no `Math.random()`.
- **Purity**: Function signature must depend only on `EngineBattleState` and `EngineDeps`.

## 3. API Definition
```typescript
/**
 * Identifies the optimal target for an enemy based on rulebook priorities.
 * @param state - Current engine battle state.
 * @param actorId - ID of the enemy performing the check.
 * @param candidates - List of potential target participants (usually all player characters).
 * @param deps - Engine dependencies (RNG).
 * @returns { targetId: string | null, rng: RngState }
 */
export function findBestTarget(
    state: EngineBattleState,
    actorId: string,
    candidates: BattleParticipant[],
    deps: EngineDeps
): { targetId: string | null; nextRng: RngState };
```

## 4. Edge Cases
- **No Visible Targets**: Return `null`. AI will likely switch to "Move to nearest" logic.
- **Identical Targets**: Two recruits at the same distance, both in the open. RNG MUST decide to ensure multiplayer parity.
- **Stunned Targets**: Rule check needed — do enemies prioritize stunned targets? (Default: No, follow TN/Dist priority).
