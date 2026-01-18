# Five Parsecs Campaign Manager — Technical Design Document

> **Версия:** 1.0  
> **Дата:** 2026-01-18  

## 📚 Структура TDD

| Файл | Описание |
|------|----------|
| [01_Architecture.md](./01_Architecture.md) | Архитектура, слои, зависимости |
| [02_DataModels.md](./02_DataModels.md) | Модели данных, типы |
| [03_StateManagement.md](./03_StateManagement.md) | Zustand stores, состояния |
| [04_Services.md](./04_Services.md) | Бизнес-логика, сервисы |
| [05_Components.md](./05_Components.md) | UI компоненты |
| [06_Multiplayer.md](./06_Multiplayer.md) | WebRTC, синхронизация |
| [07_Testing.md](./07_Testing.md) | Тестирование |

---

## Технологический стек

| Слой | Технология | Версия |
|------|------------|--------|
| **UI** | React | 18.x |
| **Язык** | TypeScript | 5.x |
| **State** | Zustand + Immer | 4.x |
| **Styling** | Tailwind CSS | 3.x |
| **Build** | Vite | 5.x |
| **Multiplayer** | PeerJS | 1.x |
| **Tests** | Vitest | 1.x |

---

## Быстрые ссылки

- [Диаграмма архитектуры](./01_Architecture.md#диаграмма)
- [Типы персонажей](./02_DataModels.md#character)
- [Battle Store](./03_StateManagement.md#battlestore)
- [Combat Rules](./04_Services.md#rules)
