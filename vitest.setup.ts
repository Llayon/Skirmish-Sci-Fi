

import '@testing-library/jest-dom/vitest';

// Polyfill for ResizeObserver to prevent errors in JSDOM environment
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = ResizeObserver;
}

// Mock localStorage and sessionStorage
const storageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    key: (index: number) => Object.keys(store)[index] || null,
    get length() {
      return Object.keys(store).length;
    },
  };
};

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', { value: storageMock() });
  Object.defineProperty(window, 'sessionStorage', { value: storageMock() });
}
