# Contributor's Guide

Welcome! We're excited to have you contribute to the Five Parsecs Campaign Manager. This document provides guidelines to ensure a smooth and consistent development process for everyone involved.

## 🏛️ Code Philosophy

Our goal is to build a high-quality, maintainable, and scalable application. To achieve this, we adhere to the following principles:

-   **Readability:** Code is read more often than it is written. Write clear, self-documenting code with meaningful names.
-   **Simplicity:** Prefer simple, straightforward solutions over complex ones. Avoid premature optimization.
-   **Consistency:** Adhere to the established code style and conventions outlined in this guide.
-   **SOLID Principles:** Strive to follow SOLID principles (Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion) to create a decoupled and robust architecture.

---

## 💅 Code Style & Linting

To maintain a consistent code style, this project is configured with **Prettier** for code formatting and **ESLint** for code analysis.

-   **Formatting:** Please format your code before committing. It's recommended to configure your editor to format on save.
-   **Linting:** ESLint helps catch common errors and enforce best practices. Address any linting errors before creating a pull request.
-   **Quotes:** Use single quotes (`'`) for all strings and imports.

---

## 📛 Naming Conventions

-   **Files:**
    -   React Components: `PascalCase.tsx` (e.g., `CharacterCard.tsx`)
    -   Hooks, Services, Stores, Utilities: `camelCase.ts` (e.g., `useBattleLogic.ts`, `campaignService.ts`)
    -   Type Definitions: `camelCase.ts` (e.g., `battle.ts` inside `/types`)
-   **Components & Types:** Use `PascalCase` for React components, interfaces, and type aliases (e.g., `BattleView`, `interface CharacterCardProps`).
-   **Variables & Functions:** Use `camelCase` for variables, functions, and object properties (e.g., `const newCrew`, `function resolveBattle()`).

---

## 🧠 State Management (Zustand)

We use [Zustand](https://github.com/pmndrs/zustand) for global state management due to its simplicity and performance.

-   **Store Structure:** Global stores are located in the `/stores` directory, separated by domain (e.g., `crewStore.ts`, `battleStore.ts`).
-   **Creating Stores:** Always use the `immer` middleware to allow for safe and easy state mutations.

    ```typescript
    import { create } from 'zustand';
    import { immer } from 'zustand/middleware/immer';

    interface BearState {
      bears: number;
      actions: {
        increasePopulation: () => void;
      }
    }

    const useBearStore = create<BearState>()(
      immer((set) => ({
        bears: 0,
        actions: {
          increasePopulation: () => set((state) => { state.bears += 1; }),
        }
      }))
    );
    ```

-   **Actions:** All state-mutating functions should be grouped within an `actions` object inside the store. This makes it clear which functions cause state changes.

---

## 🧩 Component Creation

-   **Smart vs. Dumb Components:**
    -   **Smart Components (Containers):** These components are aware of the application's state. They connect to Zustand stores, fetch data, and handle complex logic. They are typically found in higher-level files like `CampaignDashboard.tsx` or `BattleView.tsx`.
    -   **Dumb Components (Presentational):** These components receive data via props and are primarily concerned with rendering UI. They are highly reusable.
-   **UI Kit:** Generic, reusable "dumb" components (like `Button`, `Card`, `Modal`) are located in `/components/ui`. Always check here first before creating a new UI element.
-   **Feature Components:** Components specific to a major feature are grouped in subdirectories like `/components/battle` and `/components/campaign`.

---

## 🌍 Internationalization (i18n)

The application supports multiple languages using a custom i18n solution.

-   **Translation Files:** All text strings are stored in JSON files under `/locales/{language_code}/{namespace}.json` (e.g., `locales/en/common.json`).
-   **Adding New Strings:**
    1.  Add the new key and its English translation to the appropriate namespace file in `/locales/en/`.
    2.  Add the key and its translation to the corresponding files for all other supported languages (e.g., `/locales/ru/`).
-   **Usage in Components:** Use the `useTranslation` hook to get the `t` function.

    ```tsx
    import { useTranslation } from '@/i18n';

    const MyComponent = () => {
      const { t } = useTranslation();
      return <Button>{t('buttons.saveGame')}</Button>;
    };
    ```

---

## 🧪 Testing

We use **Vitest** for running tests and **React Testing Library** for rendering and interacting with components.

-   **Location:** Test files should be co-located with the component or service they are testing, using the `.test.ts` or `.test.tsx` extension (e.g., `Button.test.tsx`).
-   **Writing Tests:** Focus on testing the component's behavior from a user's perspective. Avoid testing implementation details.

---

## 📜 Commit Rules (Conventional Commits)

To maintain a clean and descriptive Git history, we follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

Each commit message should follow this format:

```
<type>[optional scope]: <description>

[optional body]

[optional footer]
```

**Common Types:**

-   `feat`: A new feature.
-   `fix`: A bug fix.
-   `docs`: Documentation only changes.
-   `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc).
-   `refactor`: A code change that neither fixes a bug nor adds a feature.
-   `perf`: A code change that improves performance.
-   `test`: Adding missing tests or correcting existing tests.
-   `chore`: Changes to the build process or auxiliary tools and libraries.

**Example:**

```
feat(campaign): add job board for mission selection
```
```
fix(battle): correct line-of-sight calculation through cover
```
```
docs(readme): add architecture diagrams
```
