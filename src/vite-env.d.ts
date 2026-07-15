/// <reference types="vite/client" />

declare const __APP_VERSION__: string; // from vite define

interface ImportMetaEnv {
  readonly VITE_OPENROUTER_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}