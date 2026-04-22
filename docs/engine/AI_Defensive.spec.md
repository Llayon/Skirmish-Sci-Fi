# Specification: Defensive AI (Engine V2)

**Goal**: Implement a deterministic decision-making process for Defensive enemy types, focusing on holding territory and utilizing cover.

---

## 1. Decision Logic
Defensive enemies prioritize holding their ground and firing from strong positions.

### A. Territorial Constraint
1. **Initial Half**: The AI identifies the "Initial Half" of the table based on its starting position at the beginning of the battle.
2. **Boundary**: It will advance to weapon range but will **NEVER voluntarily cross the center line** of the table.

### B. Action Selection Tree
1. **In Position & Sight**: If the actor is in cover AND has LoS to a target within weapon range:
   - **Stay Still & Aimed Shot**.
2. **Advance to Range**: If no targets in range:
   - **Move**: Towards the target but **staying in cover** and **staying within their half** of the table.
3. **Reactive Brawl**:
   - If an opponent enters the **same terrain feature** as the actor:
     - **Brawl** IF `Enemy.Combat >= Target.Combat`.
4. **Reinforcement**:
   - If a nearby terrain feature occupied by friendlies is entered by player forces:
     - **Move** to reinforce that position.

---

## 2. Implementation Strategy
- **Weights**:
  - `CoverScore`: +200.
  - `WrongHalfPenalty`: -1000 (Forces the AI to stay in its half).
  - `AimedShotBonus`: Priority to "Stay Still" actions.

## 3. Verification Scenarios
- **Scenario 1**: Defensive enemy stops at the center line even if the player is just 1 cell across it.
- **Scenario 2**: Defensive enemy moves to help a nearby ally whose cover was breached.
