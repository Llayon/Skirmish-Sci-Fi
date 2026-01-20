import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockRolls } from './mockRolls';
import { rollD6, rollD100 } from '@/services/utils/rolls';

describe('mockRolls helper', () => {
  beforeEach(() => {
    mockRolls.resetQueues();
  });

  it('should mock rollD6 and return queued values', () => {
    mockRolls.setD6Queue([1, 6, 3]);
    expect(rollD6()).toBe(1);
    expect(rollD6()).toBe(6);
    expect(rollD6()).toBe(3);
  });

  it('should throw error when d6 queue is exhausted', () => {
    mockRolls.setD6Queue([1]);
    expect(rollD6()).toBe(1);
    expect(() => rollD6()).toThrowError("Roll queue exhausted: rollD6");
  });

  it('should throw error when d6 value is out of range', () => {
    mockRolls.setD6Queue([7]);
    expect(() => rollD6()).toThrowError("Invalid D6 roll value in queue: 7");

    mockRolls.setD6Queue([0]);
    expect(() => rollD6()).toThrowError("Invalid D6 roll value in queue: 0");
  });

  it('should mock rollD100 and return queued values', () => {
    mockRolls.setD100Queue([1, 100, 50]);
    expect(rollD100()).toBe(1);
    expect(rollD100()).toBe(100);
    expect(rollD100()).toBe(50);
  });

  it('should throw error when d100 queue is exhausted', () => {
    mockRolls.setD100Queue([99]);
    expect(rollD100()).toBe(99);
    expect(() => rollD100()).toThrowError("Roll queue exhausted: rollD100");
  });

  it('should throw error when d100 value is out of range', () => {
    mockRolls.setD100Queue([101]);
    expect(() => rollD100()).toThrowError("Invalid D100 roll value in queue: 101");

    mockRolls.setD100Queue([0]);
    expect(() => rollD100()).toThrowError("Invalid D100 roll value in queue: 0");
  });

  it('should allow resetting queues', () => {
    mockRolls.setD6Queue([1, 2]);
    mockRolls.resetQueues();
    expect(() => rollD6()).toThrowError("Roll queue exhausted: rollD6");
  });
});
