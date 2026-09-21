import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: '/certificate/',
  plugins: [react()],
  build: {
    outDir: fileURLToPath(new URL('../dist/certificate', import.meta.url)),
    emptyOutDir: false,
    sourcemap: false,
  },
})
