/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LOG_LEVEL?: "off" | "error" | "info" | "debug";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
