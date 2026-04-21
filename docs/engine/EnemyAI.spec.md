# Specification: Deterministic Enemy AI (Engine V2)

**Status:** Draft / Pending Approval
**Goal:** Define a 100% deterministic decision-making process for enemy participants that strictly follows the 7 AI behaviors from the Five Parsecs rulebook.

---

## 1. Core Principles
1. **Purity**: AI must use `RngState` for all random choices (e.g., picking between equal targets).
2. **Immutability**: Returns `BattleAction[]` based on `EngineBattleState`.
3. **Grid-Awareness**: Distances are calculated in "units" (usually 1" = 1 cell). 12" = 12 cells.

## 2. Targeting Logic (Universal)
Before taking any action, an enemy identifies potential targets:
1. **Easiest to Hit**: Target with the lowest Target Number (TN).
2. **Closest**: If TNs are equal, pick the closest target.
3. **Deterministic Random**: If still tied, use `deps.rng.d100` to pick.

---

## 3. Behavioral Profiles

### Cautious
- **Movement**: Advance ONLY to stay at max range. NEVER voluntarily move within 12" of an opponent.
- **Cover**: Priority #1. If not in cover, move to the nearest cover that grants LoS.
- **Combat**: 
  - In Sight & Range: **Stay Still + Aimed Shot**.
  - No LoS: Advance behind terrain to establish LoS.
  - **Brawl**: NEVER (unless forced).

### Aggressive
- **Combat Priority**: Prefer Brawl if within 12" or no LoS to shoot.
- **Movement**: 
  - If target visible: Advance at least half speed towards them (preferring cover).
  - If within 12" or no LoS: Advance **Full Speed** to enter Brawl.
- **Brawl Constraint**: Only enter Brawl if `Enemy.Combat >= Target.Combat`.
- **Heavy Weapons**: If LoS exists, **Stay Still + Shoot**.

### Tactical
- **Movement**: Advance at half speed, retaining cover. Cross open ground at full speed.
- **Positioning**: Try to stay within 12" of opponents and within 3" of a friendly figure.
- **Combat**:
  - Within one move AND `Enemy.Combat > Target.Combat` -> **Brawl**.
  - Otherwise -> **Shoot**.
  - If clear shot AND in cover -> **Stay Still + Aim**.

### Rampaging
- **Movement**: Full speed towards closest opponent. 
- **Combat**: Always attempt to **Brawl**.
- **Heavy Weapons**: If LoS exists, **Stay Still + Shoot**.

### Defensive
- **Movement**: Advance to weapon range, but **stay in initial half of the table**. 
- **Cover**: Always remain in cover/terrain.
- **Combat**: 
  - In position -> **Stay Still + Aim**.
  - **Brawl**: Only if opponent enters their terrain feature AND `Enemy.Combat >= Target.Combat`.
  - **Reinforce**: If friendlies in adjacent terrain are engaged, move to help.

### Beast
- **Movement**: Always move max distance towards nearest opponent while remaining in Cover.
- **Stealth**: Only break Cover if a Brawl can be entered within **two moves**. Otherwise, move to break LoS and maneuver closer.
- **Pack Logic**: Try to stay within 2" of friendlies and attack the same target.

### Guardian
- **Attachment**: Attached to a specific "Lead Figure".
- **Movement**: Must stay within 3" of the Lead. Move at the same pace.
- **Combat**: Attack the same target using the same method (Shoot/Brawl) as the Lead.

---

## 4. Implementation Strategy: The "Target Cell" Algorithm
For movement, the AI evaluates all reachable cells $C$:
$$Score(C) = Weight_{Dist} \cdot Dist(C, Target) + Weight_{Cover} \cdot IsCover(C) + Weight_{Friend} \cdot FriendlyProximity(C)$$

- **Cautious**: $Weight_{Cover}$ is high, $Weight_{Dist}$ is negative if $<12"$.
- **Aggressive**: $Weight_{Dist}$ is very high (towards target).
- **Beast**: $Weight_{Cover}$ is mandatory unless $Dist \le 2 \cdot Move$.

---

## 5. Implementation Roadmap
1. [ ] **Grid Rules**: Implement `getCellsInDistance(pos, dist)`, `isCellInCover(state, cell)`.
2. [ ] **LoS Rules**: Pure `hasLineOfSight(state, posA, posB)` function.
3. [ ] **AI Decision Engine**: `generateAIPlan(state, participantId, deps)`.
4. [ ] **Parity Tests**:
   - `cautious_stays_at_range.test.ts`
   - `aggressive_charges_brawl.test.ts`
   - `tactical_flanks.test.ts`

