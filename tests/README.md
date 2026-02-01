# Skirmish Tests

This directory contains the test infrastructure for the Skirmish Engine V2 migration.

## Structure

- `helpers/`: Utility functions for tests (e.g., `battleSignature`, RNG mocks).
- `scenarios/`: Golden tests (semantic snapshots) that verify the game logic stability.

## Running Tests

To run all tests:
```bash
npm test
```

To run only golden tests:
```bash
npm test golden
```
