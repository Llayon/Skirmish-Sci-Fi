export interface EngineV2MpDebugEnv {
  DEV: boolean;
  VITE_ENGINE_V2_MP_DEBUG?: string;
  VITE_ENGINE_DEBUG?: string;
}

export const isEngineV2MpDebugEnabled = (env: EngineV2MpDebugEnv = import.meta.env): boolean => {
  if (env.DEV) return true;
  if (env.VITE_ENGINE_V2_MP_DEBUG === 'true') return true;
  // Fallback to general engine debug flag
  if (env.VITE_ENGINE_DEBUG === 'true' && env.VITE_ENGINE_V2_MP_DEBUG !== 'false') return true;
  
  return false;
};
