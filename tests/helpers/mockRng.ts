
import { vi } from 'vitest';
import * as rollUtils from '@/services/utils/rolls';

export class MockRng {
  private d6Queue: number[] = [];
  private d10Queue: number[] = [];
  private d100Queue: number[] = [];
  private mocked = false;

  setup() {
    if (this.mocked) return this;

    vi.spyOn(rollUtils, 'rollD6').mockImplementation(() => {
      if (this.d6Queue.length === 0) {
        throw new Error('MockRng: D6 queue exhausted. Did you forget to queue enough rolls?');
      }
      return this.d6Queue.shift()!;
    });

    vi.spyOn(rollUtils, 'rollD10').mockImplementation(() => {
      if (this.d10Queue.length === 0) {
        throw new Error('MockRng: D10 queue exhausted');
      }
      return this.d10Queue.shift()!;
    });

    vi.spyOn(rollUtils, 'rollD100').mockImplementation(() => {
      if (this.d100Queue.length === 0) {
        throw new Error('MockRng: D100 queue exhausted');
      }
      return this.d100Queue.shift()!;
    });

    this.mocked = true;
    return this;
  }

  queueD6(...values: number[]) {
    this.d6Queue.push(...values);
    return this;
  }

  queueD10(...values: number[]) {
    this.d10Queue.push(...values);
    return this;
  }

  queueD100(...values: number[]) {
    this.d100Queue.push(...values);
    return this;
  }

  // Helper methods to consume queues cleanly without exposing internals
  d6(): number {
    if (this.d6Queue.length === 0) {
      throw new Error('MockRng: D6 queue exhausted. Did you forget to queue enough rolls?');
    }
    return this.d6Queue.shift()!;
  }

  d10(): number {
    if (this.d10Queue.length === 0) {
      throw new Error('MockRng: D10 queue exhausted');
    }
    return this.d10Queue.shift()!;
  }

  d100(): number {
    if (this.d100Queue.length === 0) {
      throw new Error('MockRng: D100 queue exhausted');
    }
    return this.d100Queue.shift()!;
  }

  /** Checks that all rolls have been consumed */
  assertEmpty() {
    const unused: string[] = [];
    if (this.d6Queue.length > 0) unused.push(`D6: [${this.d6Queue.join(', ')}]`);
    if (this.d10Queue.length > 0) unused.push(`D10: [${this.d10Queue.join(', ')}]`);
    if (this.d100Queue.length > 0) unused.push(`D100: [${this.d100Queue.join(', ')}]`);
    
    if (unused.length > 0) {
      throw new Error(`MockRng: Unused rolls - ${unused.join(', ')}`);
    }
  }

  clear() {
    this.d6Queue = [];
    this.d10Queue = [];
    this.d100Queue = [];
    return this;
  }

  // Alias for clear to support different naming conventions
  reset() {
    return this.clear();
  }

  restore() {
    this.clear();
    this.mocked = false;
    vi.restoreAllMocks();
  }
  // Static helper to act as a singleton if needed for older tests
  static reset() {
    mockRng.reset();
  }

  static queueD6(...values: number[]) {
    mockRng.queueD6(...values);
  }

  static rollD6() {
    // If using the singleton directly without setup(), we might need to manually shift
    // But usually tests call setup().
    // If this is used as a mock implementation:
    if (mockRng.d6Queue.length === 0) {
        throw new Error('MockRng (static): D6 queue exhausted.');
    }
    return mockRng.d6Queue.shift()!;
  }
}

export const mockRng = new MockRng();
