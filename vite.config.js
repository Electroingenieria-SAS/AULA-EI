import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { cp, copyFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const base = process.env.VITE_BASE_PATH || '/'
const releaseId = process.env.VITE_RELEASE_SHA || process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || new Date().toISOString()

function copyStaticAssets() {
  return {
    name: 'aula-ei-static-assets',
    apply: 'build',
    async closeBundle() {
      await mkdir('dist/brand', { recursive: true })
      await cp('brand', 'dist/brand', { recursive: true, force: true })
      await copyFile('favicon.svg', 'dist/favicon.svg')
      await writeFile('dist/version.json', JSON.stringify({ release: releaseId, schema: 1, built_at: new Date().toISOString() }))
    },
  }
}

export default defineConfig({
  base,
  plugins: [react(), copyStaticAssets()],
  define: { __AULA_EI_RELEASE__: JSON.stringify(releaseId) },
  build: {
    outDir: path.resolve('dist'),
    emptyOutDir: true,
    sourcemap: false,
    manifest: true,
    target: 'es2020',
  },
})
