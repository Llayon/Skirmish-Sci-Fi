import { describe, it, expect } from 'vitest';
import { stableStringify } from './stableStringify';
import { calculateStateHash, hashString } from './stateHash';

describe('stableStringify', () => {
  it('should handle primitives', () => {
    expect(stableStringify(1)).toBe('1');
    expect(stableStringify(true)).toBe('true');
    expect(stableStringify('hello')).toBe('"hello"');
    expect(stableStringify(null)).toBe('null');
    expect(stableStringify(undefined)).toBe('undefined');
  });

  it('should sort object keys', () => {
    const obj1 = { a: 1, b: 2, c: 3 };
    const obj2 = { c: 3, a: 1, b: 2 };

    expect(stableStringify(obj1)).toBe('{"a":1,"b":2,"c":3}');
    expect(stableStringify(obj2)).toBe('{"a":1,"b":2,"c":3}');
    expect(stableStringify(obj1)).toBe(stableStringify(obj2));
  });

  it('should preserve array order', () => {
    const arr = [3, 1, 2];
    expect(stableStringify(arr)).toBe('[3,1,2]');

    const arr2 = [1, 2, 3];
    expect(stableStringify(arr)).not.toBe(stableStringify(arr2));
  });

  it('should handle nested structures', () => {
    const obj1 = {
      items: [3, { z: 9, y: 8 }, 1],
      meta: { id: 1, tags: ['a', 'b'] }
    };
    const obj2 = {
      meta: { tags: ['a', 'b'], id: 1 },
      items: [3, { y: 8, z: 9 }, 1]
    };

    expect(stableStringify(obj1)).toBe(stableStringify(obj2));
  });

  it('should handle arrays with undefined', () => {
    const arr = [1, undefined, 2];
    expect(stableStringify(arr)).toBe('[1,null,2]');
  });

  it('should ignore undefined in objects', () => {
    const obj = { a: 1, b: undefined };
    expect(stableStringify(obj)).toBe('{"a":1}');
  });
});

describe('calculateStateHash', () => {
  it('should return same hash for same semantic state', () => {
    const state1 = { b: 2, a: 1 };
    const state2 = { a: 1, b: 2 };

    expect(calculateStateHash(state1)).toBe(calculateStateHash(state2));
  });

  it('should return different hash for different state', () => {
    const state1 = { a: 1 };
    const state2 = { a: 2 };

    expect(calculateStateHash(state1)).not.toBe(calculateStateHash(state2));
  });
});

describe('hashString', () => {
  it('should return consistent hash for string', () => {
    const input = 'test string';
    expect(hashString(input)).toBe(hashString(input));
  });

  it('should return different hash for different strings', () => {
    expect(hashString('abc')).not.toBe(hashString('abd'));
  });
});
