interface ViteTypeOptions {
  strictImportMetaEnv: unknown;
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_DEFAULT_MODEL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
