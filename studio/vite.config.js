import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: '/studio/',
  plugins: [react()],
  build: {
    outDir: fileURLToPath(new URL('../dist/studio', import.meta.url)),
    emptyOutDir: false,
    sourcemap: false,
  },
})
