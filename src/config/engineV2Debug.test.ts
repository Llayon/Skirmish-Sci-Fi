import { describe, it, expect } from 'vitest';
import { isEngineV2MpDebugEnabled, type EngineV2MpDebugEnv } from './engineV2Debug';

describe('isEngineV2MpDebugEnabled', () => {
  it('returns true in DEV mode', () => {
    const env: EngineV2MpDebugEnv = { DEV: true };
    expect(isEngineV2MpDebugEnabled(env)).toBe(true);
  });

  it('returns true in PROD when VITE_ENGINE_V2_MP_DEBUG is "true"', () => {
    const env: EngineV2MpDebugEnv = { 
      DEV: false, 
      VITE_ENGINE_V2_MP_DEBUG: 'true',
      VITE_ENGINE_DEBUG: 'false'
    };
    expect(isEngineV2MpDebugEnabled(env)).toBe(true);
  });

  it('returns true in PROD when VITE_ENGINE_DEBUG is "true" (fallback)', () => {
    const env: EngineV2MpDebugEnv = { 
      DEV: false, 
      VITE_ENGINE_V2_MP_DEBUG: 'false',
      VITE_ENGINE_DEBUG: 'true'
    };
    expect(isEngineV2MpDebugEnabled(env)).toBe(true);
  });

  it('returns true in PROD when both are "true"', () => {
    const env: EngineV2MpDebugEnv = { 
      DEV: false, 
      VITE_ENGINE_V2_MP_DEBUG: 'true',
      VITE_ENGINE_DEBUG: 'true'
    };
    expect(isEngineV2MpDebugEnabled(env)).toBe(true);
  });

  it('returns false in PROD when both are false/undefined', () => {
    const envFalse: EngineV2MpDebugEnv = { 
      DEV: false, 
      VITE_ENGINE_V2_MP_DEBUG: 'false',
      VITE_ENGINE_DEBUG: 'false'
    };
    expect(isEngineV2MpDebugEnabled(envFalse)).toBe(false);
    
    const envUndefined: EngineV2MpDebugEnv = { DEV: false };
    expect(isEngineV2MpDebugEnabled(envUndefined)).toBe(false);
  });
});
