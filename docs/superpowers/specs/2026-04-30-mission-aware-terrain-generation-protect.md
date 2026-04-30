# Design: Mission-Aware Terrain Generation (Protect)

**Date:** 2026-04-30  
**Status:** Approved  
**Scope:** VIP Escort mission layout

---

## 1. Mission Objective

**Protect (VIP Escort):** Сопроводить VIP от стартовой позиции (enemy_edge) до зоны эвакуации (player_edge).

## 2. Tactical Layout

```
[Эвакуация] ←—— Маршрут с укрытиями ——→ [Старт VIP]
     ↑                                       ↑
  player_edge                           enemy_edge
```

## 3. Zone Overrides

| Zone | Generic | Protect Override |
|------|---------|------------------|
| `player_edge` | 0-6 cover | **15-25 cover** | Зона эвакуации, игрок обороняет |
| `enemy_edge` | 0-6 cover | (no change) | Старт VIP |
| `central_arena` | 25-50 cover | **30-50 cover** | Промежуточные укрытия |
| `north_flank` | 15-30 cover | **10-20 cover** | Альтернативный маршрут |
| `south_flank` | 15-30 cover | **10-20 cover** | Альтернативный маршрут |

## 4. Anchor Behavior

- **evacuation_point** на `player_edge` — помеченная платформа/транспорт
- **extraction_zone** на `enemy_edge` — точка старта VIP
- Central anchor: любой тип (random) для промежуточной точки

## 5. Route Design

Укрытия размещены **вдоль маршрута** enemy_edge → player_edge:
- Ритм: укрытие → открытое → укрытие
- Главный путь через центр
- Фланги — альтернативные, но более открытые маршруты

## 6. Configuration

```typescript
const MISSION_OVERRIDES: Record<string, ZoneOverrides> = {
  Protect: {
    player_edge: { minCoverCells: 15, maxCoverCells: 25 },
    central_arena: { minCoverCells: 30, maxCoverCells: 50 },
    north_flank: { minCoverCells: 10, maxCoverCells: 20 },
    south_flank: { minCoverCells: 10, maxCoverCells: 20 },
  },
};
```

## 7. Implementation

Same pattern as Eliminate:
1. Add `Protect` entry to `MISSION_OVERRIDES`
2. Add evacuation_point anchor logic in `placeTacticalAnchors`
3. Add tests for Protect layout
4. Add parity snapshot

---

**Approved for implementation.**
