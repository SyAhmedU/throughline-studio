import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Throughline Studio — Vite + React 19. The `/api` dir holds Vercel serverless
// functions (the shared AI backend seam); in dev they're not run by Vite, so the
// app degrades gracefully when an endpoint is absent (see lib/api.ts).
export default defineConfig({
  plugins: [react()],
  server: { port: 5180, open: true },
  build: { outDir: 'dist', sourcemap: false },
})
