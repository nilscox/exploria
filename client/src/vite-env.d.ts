/// <reference types="vite-plugin-svgr/client" />

interface ViteTypeOptions {
  strictImportMetaEnv: unknown;
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_DEFAULT_MODEL: string;
  readonly VITE_ANALYTICS_URL?: string;
  readonly VITE_ANALYTICS_SITE_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
