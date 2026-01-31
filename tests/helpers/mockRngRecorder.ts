import { MockRng } from './mockRng';
import { RngScriptItem } from '@/services/engine/rng/rng';

export class MockRngScriptRecorder {
  private mockRng: MockRng;
  private script: RngScriptItem[] = [];

  constructor(mockRng: MockRng) {
    this.mockRng = mockRng;
  }

  queueD6(...values: number[]) {
    this.mockRng.queueD6(...values);
    values.forEach(v => this.script.push({ die: 'd6', value: v }));
    return this;
  }

  queueD100(...values: number[]) {
    this.mockRng.queueD100(...values);
    values.forEach(v => this.script.push({ die: 'd100', value: v }));
    return this;
  }

  d6() {
    return this.mockRng.d6();
  }
  
  assertEmpty() {
    this.mockRng.assertEmpty();
  }

  getScript(): RngScriptItem[] {
    return [...this.script];
  }
}

export function createMockRngScriptRecorder(mockRng: MockRng) {
  return new MockRngScriptRecorder(mockRng);
}
