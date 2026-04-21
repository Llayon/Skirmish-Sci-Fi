# Specification: Cautious & Tactical AI (Engine V2)

**Goal**: Implement intelligent, deterministic decision-making for Cautious and Tactical enemy types, focusing on cover-seeking and distance management.

---

## 1. Cautious AI Logic
Cautious enemies prioritize survival over aggression.

### A. Target Identification
1. Uses `findBestTarget` with `priority: 'TN'`.
2. Identifies the "Safety Threat": The nearest visible opponent.

### B. Action Selection Tree
1. **In Cover Check**: Is the actor currently in a cell that provides cover against the Primary Target?
   - **YES**: **Stay Still & Aimed Shot** (at max range possible).
   - **NO**: 
     - **Move**: Find the nearest reachable cell that **provides cover** AND grants LoS to a target.
     - **Constraint**: NEVER voluntarily move within 12" of an opponent. If already within 12", move **away** to regain distance if possible.
2. **No LoS**: If no target is visible, move behind terrain towards a position where LoS might be established next turn, but prioritize staying hidden.

---

## 2. Tactical AI Logic
The most balanced AI type.

### A. Movement (Half-Speed)
1. Tactical AI usually moves at **half-speed** (retaining cover) unless crossing open ground (then full speed).

### B. Decision Tree
1. **Flanking Check**: If within one move of an opponent AND `Enemy.Combat > Target.Combat` -> **Brawl**.
2. **Shooting Mode**:
   - If clear LoS and in Cover -> **Stay Still & Aimed Shot**.
   - Otherwise -> **Move (Half Speed)** to a better flanking position with LoS, then **Shoot**.
3. **Cohesion**: Attempt to stay within 3" of at least one friendly figure.

---

## 3. Pure Engine Mechanics: Cover Evaluation
To implement these, we need a new pure rule: `isCellInCover(state, cell, attackerPos)`.
- A cell provides cover if there is `providesCover: true` terrain adjacent to the cell or intersecting the ray from the attacker.

## 4. Movement: The "Scoring" Algorithm
For Cautious/Tactical AI, we evaluate reachable cells using weights:
- `CoverScore`: +100 if cell grants cover.
- `DistanceScore`: +50 if distance to nearest enemy is > 12".
- `LineOfSightScore`: +200 if cell has LoS to a target.

## 5. Verification Scenarios
- **Scenario 1 (Cautious)**: Enemy in the open moves to the nearest crates and shoots, rather than charging.
- **Scenario 2 (Tactical)**: Enemy moves sideways to get around a wall for a clear shot while staying near a teammate.
