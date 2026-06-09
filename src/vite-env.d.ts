/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL — defaults to the shared suite project when unset */
  readonly VITE_SUPABASE_URL?: string
  /** Supabase anon/publishable key (public; RLS protects data) */
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
