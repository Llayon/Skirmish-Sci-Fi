# 04. Services

[← Назад](./README.md)

---

## Структура

```
services/
├── rules/              # Game rules
│   ├── shooting.ts     # Ranged combat
│   ├── damage.ts       # Damage resolution
│   ├── brawling.ts     # Melee combat
│   ├── visibility.ts   # LoS and cover
│   └── mission.ts      # Mission objectives
├── domain/
│   └── battleDomain.ts # Battle utilities
├── utils/
│   ├── rolls.ts        # Dice utilities
│   └── gridUtils.ts    # Grid calculations
├── traits/             # Trait handlers
├── aiLogic.ts          # Enemy AI
└── characterService.ts # Character generation
```

---

## Rules

### shooting.ts

```typescript
// Основные функции
function resolveShooting(
  attacker: BattleParticipant,
  target: BattleParticipant,
  weapon: Weapon,
  battle: Battle,
  isAimed: boolean
): LogEntry[]

function getValidShootTargets(
  attacker: BattleParticipant,
  weaponId: string,
  battle: Battle
): BattleParticipant[]
```

**Алгоритм resolveShooting:**
1. Проверить LoS
2. Рассчитать модификаторы (cover, aimed, traits)
3. Бросок попадания: `1d6 + Combat + mods >= 5`
4. При попадании — `applyHitAndSaves()`
5. Вернуть LogEntry[]

### damage.ts

```typescript
function applyHitAndSaves(
  battle: Battle,
  attacker: BattleParticipant,
  target: BattleParticipant,
  weapon: Weapon,
  isRanged: boolean
): LogEntry[]
```

**Алгоритм:**
1. **Luck Check** — `1d6 >= 4`, тратит Luck
2. **Trait Hooks** — `onHit` handlers
3. **Saving Throw** — `1d6 >= armor save`
4. **Damage Roll** — `1d6 + damage vs toughness`
5. **Apply Outcome** — casualty или stun

### brawling.ts

```typescript
function resolveBrawl(
  attacker: BattleParticipant,
  defender: BattleParticipant,
  attackerWeapon: Weapon | undefined,
  battle: Battle
): LogEntry[]
```

---

## AI Logic

**Файл:** `services/aiLogic.ts`

```typescript
function determineAIAction(
  enemy: Enemy,
  battle: Battle
): AIActionPlan

type AIActionPlan =
  | { type: 'move'; targetPos: Position; path: Position[] }
  | { type: 'shoot'; targetId: string; weaponId: string }
  | { type: 'brawl'; targetId: string }
  | { type: 'hold'; reason?: string };
```

**Приоритеты по AI типу:**

| AI Type | Приоритет |
|---------|-----------|
| Aggressive | Атака > Движение к врагу |
| Tactical | Укрытие > Атака с бонусом |
| Cautious | Дистанция > Атака |
| Rampaging | Brawl > Движение |
| Beast | Ближайший враг |

---

## Trait System

```typescript
// services/traitSystem.ts
function fireHook<T extends TraitContext>(
  hookName: keyof TraitHandlers,
  context: T,
  traits: string[]
): void

// Example handler
const piercingHandler: TraitPlugin = {
  id: 'piercing',
  priority: 10,
  hooks: {
    onSavingThrow: (ctx: SavingThrowContext) => {
      ctx.save.isBypassed = true;
      ctx.log.push({ key: 'log.trait.piercing' });
    }
  }
};
```

---

## Grid Utils

```typescript
// services/gridUtils.ts
function findPath(
  start: Position,
  end: Position,
  battle: Battle
): Position[]

function getAdjacentPositions(
  pos: Position,
  gridSize: GridSize
): Position[]

function calculateDistance(
  a: Position,
  b: Position
): number
```

---

[← State Management](./03_StateManagement.md) | [Далее: Components →](./05_Components.md)
