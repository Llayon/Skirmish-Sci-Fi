import { vi } from 'vitest';

// Use vi.hoisted to ensure the state is accessible within the hoisted mock factory
const queues = vi.hoisted(() => ({
  d6: [] as number[],
  d100: [] as number[],
}));

export const mockRolls = {
  setD6Queue: (values: number[]) => {
    queues.d6.length = 0;
    queues.d6.push(...values);
  },
  setD100Queue: (values: number[]) => {
    queues.d100.length = 0;
    queues.d100.push(...values);
  },
  resetQueues: () => {
    queues.d6.length = 0;
    queues.d100.length = 0;
  }
};

vi.mock('@/services/utils/rolls', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/utils/rolls')>();
  return {
    ...actual,
    rollD6: () => {
      if (queues.d6.length === 0) {
        throw new Error("Roll queue exhausted: rollD6");
      }
      const val = queues.d6.shift()!;
      if (val < 1 || val > 6) {
        throw new Error(`Invalid D6 roll value in queue: ${val}`);
      }
      return val;
    },
    rollD100: () => {
      if (queues.d100.length === 0) {
        throw new Error("Roll queue exhausted: rollD100");
      }
      const val = queues.d100.shift()!;
      if (val < 1 || val > 100) {
         throw new Error(`Invalid D100 roll value in queue: ${val}`);
      }
      return val;
    }
  };
});
