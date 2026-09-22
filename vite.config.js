import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { cp, copyFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

const base = process.env.VITE_BASE_PATH || '/'

function copyStaticAssets() {
  return {
    name: 'aula-ei-static-assets',
    apply: 'build',
    async closeBundle() {
      await mkdir('dist/brand', { recursive: true })
      await cp('brand', 'dist/brand', { recursive: true, force: true })
      await copyFile('favicon.svg', 'dist/favicon.svg')
    },
  }
}

export default defineConfig({
  base,
  plugins: [react(), copyStaticAssets()],
  build: {
    outDir: path.resolve('dist'),
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2020',
  },
})
