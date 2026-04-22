# Specification: Beast & Guardian AI (Engine V2)

**Goal**: Implement specialized deterministic decision-making for Beast and Guardian enemy types according to "Five Parsecs From Home" rules.

---

## 1. Beast AI Logic
Beasts are predatory and use cover to stalk their prey until they can pounce.

### A. Targeting
1. Always identifies the **Nearest Opponent** (using `findBestTarget` with `priority: 'Distance'`).

### B. Action Selection Tree
1. **Charge Range Check**: Can the Beast enter a Brawl within **two full moves** (Double Move)?
   - **YES**: Full speed charge towards the target to enter Brawl.
   - **NO**: 
     - **Stalking Mode**: Move max distance towards the target while **mandatory remaining in Cover**.
     - **Break LoS**: If no cover is available on the path to the target, move to a position that **breaks Line of Sight** to the target to maneuver closer safely.
2. **Pack Instinct**: If multiple valid cells have the same score, prioritize cells within **2" of a friendly figure**.

---

## 2. Guardian AI Logic
Guardians are subordinates or drones tethered to a Lead figure.

### A. Attachment
1. A Guardian MUST have a `leadId` (stored in traits or a new field). If the Lead is a casualty, the Guardian reverts to **Defensive** or **Aggressive** (depending on lore, default: Aggressive).

### B. Decision Tree
1. **Cohesion**: Must end movement within **3" of the Lead**.
2. **Synchronized Strike**:
   - Attack the **same target** as the Lead if possible.
   - Use the **same method** (Fire or Brawl) as the Lead.
3. **Movement**: If the Lead moved, the Guardian moves at the same pace to maintain the 3" tether.

---

## 3. Pure Engine Implementation Details
- **Beast Weights**: 
  - `CoverScore`: +500 (Mandatory unless charging).
  - `LoS_BlockingScore`: +300 (Wants to be hidden if far).
- **Guardian Logic**:
  - Requires looking up the `Lead` participant's last actions or current position.

## 4. Verification Scenarios
- **Scenario 1 (Beast)**: A beast stays behind a wall because it can't reach the player in one "pounce" (2 moves).
- **Scenario 2 (Guardian)**: A drone stays exactly 2 cells behind its master and shoots at the same target.
