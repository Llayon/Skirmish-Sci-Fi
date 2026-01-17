# Our Development Process: A 10-Step Guide to Quality

This document outlines the systematic, step-by-step process we are adopting to improve the quality, stability, and predictability of our development workflow. The primary goal is to minimize bugs, prevent regressions (like accidentally deleting working code), and ensure that every change enhances the application.

Each step builds upon the last, creating a multi-layered system of checks and balances.

---

### Step 1: Work in Isolated Branches (Feature Branches)

-   **What:** All development work, no matter how small, begins by creating a new branch from `main`. Branches are named descriptively (e.g., `feat/add-red-zone-missions`, `fix/stalker-teleport-range`).
-   **Why:** This is the most fundamental safety measure. It isolates new, potentially unstable work from the stable, production-ready `main` branch. If an idea or implementation doesn't work out, the branch can be discarded without any impact on the main codebase.

### Step 2: Use Atomic Commits

-   **What:** Each commit represents a single, small, logical change. Commit messages follow the [Conventional Commits](https://www.conventionalcommits.org/) standard (e.g., `feat:`, `fix:`, `refactor:`, `test:`, `doc:`).
-   **Why:** Atomic commits create a clear, easy-to-understand history of changes. If a bug is introduced, it's much easier to pinpoint the exact commit that caused it and revert it cleanly without losing other unrelated work.

### Step 3: Mandatory Pull Requests (PRs)

-   **What:** All code must be merged into the `main` branch via a Pull Request (PR). Direct pushes to `main` are prohibited.
-   **Why:** A PR serves as a formal checkpoint for a change. It is the central place for discussion, automated checks (Step 6), and peer review (Step 7), ensuring no code gets into `main` without scrutiny.

### Step 4: Write Unit Tests for New Functionality

-   **What:** When adding new, testable logic (especially in `services/` or `stores/`), a corresponding `*.test.ts` file must be created with tests that verify the new logic's correctness.
-   **Why:** This ensures that new features work as expected from the moment they are created. These tests act as a "safety net," protecting the feature from being accidentally broken by future changes in other parts of the application.

### Step 5: Write "Characterizing Tests" Before Refactoring

-   **What:** Before refactoring any existing code that is not covered by tests, we first write tests that "characterize" or "lock in" its current, correct behavior.
-   **Why:** This is the key to safe refactoring. These tests act as a guarantee that the refactoring process did not alter the functionality or accidentally remove a piece of logic. If all characterizing tests pass after a refactor, we can be confident that the code still does the same thing, just better.

### Step 6: Simulate Continuous Integration (CI) - Run All Tests

-   **What:** We adopt a strict rule: no PR can be merged if any test in the entire project is failing.
-   **Why:** This is our automated quality gatekeeper. It ensures that a change in one area doesn't have unintended side effects that break a seemingly unrelated feature elsewhere in the application.

### Step 7: Mandatory Code Review

-   **What:** Every PR must be reviewed and approved by at least one other developer before it can be merged.
-   **Why:** A second pair of eyes is invaluable for catching logical errors, spotting potential bugs, identifying accidental deletions, and ensuring the code adheres to our quality standards. It's a crucial human check that complements automated tests.

### Step 8: Separate Refactoring from Feature Implementation

-   **What:** We do not mix refactoring (improving existing code) and implementing new features in the same PR. These are done in two separate, sequential PRs. First, a PR to refactor; once merged, a second PR to add the feature.
-   **Why:** This dramatically simplifies the code review process. A PR that *only* refactors is easy to approve because its tests prove the behavior hasn't changed. A PR that *only* adds a new feature to clean code is easy to understand and validate.

### Step 9: Improve Local Discipline (IDE Tooling)

-   **What:** Actively use built-in IDE tools, such as the diff viewer, to review all changes *before* staging and committing them.
-   **Why:** This is a personal "pre-flight check" that helps catch typos, accidental deletions, or commented-out code before it even becomes part of the project's history.

### Step 10: Retrospect and Iterate

-   **What:** Periodically, we will review our workflow to see what's working and what isn't.
-   **Why:** No process is perfect. We must be agile and willing to adapt, removing steps that are too cumbersome and adding new ones if we identify a gap in our quality controls. This ensures our process serves us, not the other way around.