interface ImportMetaEnv {
  readonly VITE_API_KEY: string
  readonly VITE_ADMIN_PASSWORD?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}