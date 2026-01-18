# 07. Testing

[← Назад](./README.md)

---

## Инструменты

| Инструмент | Назначение |
|------------|------------|
| **Vitest** | Unit/Integration тесты |
| **React Testing Library** | Компоненты |
| **MSW** | Mock API |

---

## Структура тестов

```
*.test.ts / *.test.tsx  # Рядом с файлами
```

---

## Покрытие

| Модуль | Файлы с тестами |
|--------|-----------------|
| `services/rules/` | shooting, damage, brawling, visibility, mission |
| `stores/` | battleStore, campaignProgressStore, campaignStore |
| `components/` | ActionControls, BattleGrid, MultiplayerLobby |
| `services/` | aiLogic, gridUtils, traitSystem |

---

## Примеры тестов

### Rule Test

```typescript
// services/rules/shooting.test.ts
describe('resolveShooting', () => {
  it('should hit on roll >= 5', () => {
    vi.spyOn(rolls, 'rollD6').mockReturnValue(5);
    const result = resolveShooting(attacker, target, weapon, battle, false);
    expect(result).toContainEqual(
      expect.objectContaining({ key: 'log.info.hit' })
    );
  });
});
```

### Store Test

```typescript
// stores/battleStore.test.ts
describe('battleStore', () => {
  it('should initialize battle', () => {
    const { actions } = useBattleStore.getState();
    actions.initBattle(config);
    expect(useBattleStore.getState().battle).not.toBeNull();
  });
});
```

---

## Запуск

```bash
# Все тесты
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

---

[← Multiplayer](./06_Multiplayer.md) | [Назад к оглавлению →](./README.md)
