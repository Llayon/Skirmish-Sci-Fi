# 08. Battlefield Specification

[← Назад к оглавлению](./README.md)

---

## Grid-система

| Параметр | Значение |
|----------|----------|
| **Координаты** | Integer (x, y) |
| **Размер карты** | Configurable, типично 12×12 до 20×20 |
| **Единица** | 1 клетка = 1" (дюйм) настольной игры |
| **Дистанция** | Chebyshev (диагональ = 1) |

```typescript
interface Position {
  x: number;
  y: number;
}

interface GridSize {
  width: number;
  height: number;
}
```

---

## Типы Terrain

| Тип | Описание | Пример |
|-----|----------|--------|
| `Linear` | Линейный барьер | Walls, Fences |
| `Individual` | Одиночный объект | Barrel, Container |
| `Area` | Зона с особыми правилами | Swamp, Forest |
| `Block` | Блокирующий объект | Building |
| `Interior` | Внутреннее пространство | Building Interior |
| `Field` | Поле с эффектом | Smoke, Fire |
| `Door` | Проход через Block | Door |

```typescript
interface Terrain {
  id: string;
  name: string;
  type: TerrainType;
  position: Position;
  size: { width: number; height: number };
  isDifficult: boolean;      // Удвоенная стоимость движения
  providesCover: boolean;    // -1 к попаданию
  blocksLineOfSight: boolean;
  isImpassable: boolean;
  isInteractive?: boolean;   // Двери
  parentId?: string;         // Для Interior
}
```

---

## Line of Sight (LoS)

**Алгоритм:** Bresenham's line

```
Проверки:
1. Дистанция <= maxVisibility (если есть)
2. Оба участника не внутри Area (или на краю)
3. Линия не пересекает blocksLineOfSight terrain
4. Линия не пересекает других участников
```

### Особые правила

| Условие | Правило |
|---------|---------|
| **Area (лес, болото)** | LoS блокируется на 3+ клетки внутри |
| **Interior** | Видно только с края |
| **Door** | Не блокирует если adjacent |
| **Gloom** | maxVisibility = 12, но стрелявшие видны |

---

## Cover (Укрытие)

**Эффект:** -1 к броску попадания

```
Cover есть если:
1. Цель стоит НА terrain с providesCover
2. ИЛИ линия до цели пересекает providesCover terrain
3. ИЛИ Camo Cloak + расстояние > 4 + рядом cover
```

### Cover-дающий terrain

| Terrain | Cover | LoS Block |
|---------|-------|-----------|
| Container | ✅ | ❌ |
| Barricade | ✅ | ❌ |
| Ruined Wall | ✅ | Частично |
| Building (edge) | ✅ | ✅ |
| Barrel | ✅ | ❌ |

---

## Terrain Themes (4)

| Theme | Notable Features | Regular Features |
|-------|------------------|------------------|
| **Industrial** | Large Structure, Control Tower | Containers, Equipment, Barrels |
| **Wilderness** | Hill, Forest, Swamp | Rocks, Plants, Rubble |
| **AlienRuin** | Ruined Building, Strange Statue | Rubble, Walls, Crystals |
| **CrashSite** | Wreckage, Crater | Debris, Fire, Smoke |

---

## Движение

| Terrain | Cost |
|---------|------|
| Normal | 1 |
| Difficult | 2 |
| Impassable | ∞ |

**Pathfinding:** A* с учётом difficult terrain

---

[← Вероятности](./06_Probability.md) | [Далее: Technical →](./07_Technical.md)
