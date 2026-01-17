

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
