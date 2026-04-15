/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MOCK_AUTH_HASH: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
