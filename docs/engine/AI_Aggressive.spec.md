# Specification: Aggressive & Rampaging AI (Engine V2)

**Goal**: Define a deterministic decision-making process for Aggressive and Rampaging enemy types, ensuring 100% parity with the "Five Parsecs From Home" rulebook.

---

## 1. Aggressive AI Logic
An Aggressive enemy follows this prioritized decision tree for its 2 action points:

### A. Target Identification
1. Uses `findBestTarget` to identify the "Primary Target".
2. If no target is visible, identify the "Nearest Opponent" (even if not in LoS).

### B. Action Selection (State Machine)
1. **Heavy Weapon Check**: If the actor has a Heavy weapon AND has LoS to any target -> **Stay Still & Shoot** (Aimed if possible).
2. **Close Range / No LoS (Charge Mode)**: If distance to target <= 12" OR no targets are visible:
   - **Move**: Full speed towards nearest opponent.
   - **Brawl**: Attempt to enter Brawl IF `Actor.Combat >= Target.Combat`.
3. **Mid Range (Tactical Advance)**: If distance > 12" AND LoS exists:
   - **Move**: Half speed towards target, prioritizing cells with **Cover**.
   - **Shoot**: Use remaining action to Fire.

---

## 2. Rampaging AI Logic
Simpler and more violent than Aggressive.

### A. Target Identification
1. Always targets the **Closest Opponent** (regardless of TN).

### B. Action Selection
1. **Heavy Weapon Check**: If LoS exists -> **Stay Still & Fire**.
2. **Universal Charge**:
   - **Move**: Full speed towards closest target.
   - **Brawl**: ALWAYS attempt to enter Brawl (ignores Combat skill comparison).

---

## 3. Pure Engine Implementation Details
- **Function**: `generateAIPlan(state, actorId, deps): BattleAction[]`
- **Purity**: No side effects. Uses `hasLineOfSight` and `findBestTarget`.
- **Movement**: Uses a pure A* or Dijkstra implementation to find the path towards the target coordinate.

## 4. Verification Scenarios
- **Scenario 1 (Aggressive)**: Enemy with a rifle at 15" moves half-speed to cover and shoots.
- **Scenario 2 (Aggressive)**: Enemy at 10" runs full speed to engage in Brawl (if Combat is superior).
- **Scenario 3 (Rampaging)**: Enemy runs into Brawl regardless of risk.
