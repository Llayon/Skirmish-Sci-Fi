/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENGINE_DEBUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
