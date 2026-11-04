import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { releaseChanged } from '../src/release-monitor.js'

const root = process.cwd()
const read = (file) => readFile(path.join(root, file), 'utf8')

for (const file of [
  'public/manifest.webmanifest',
  'public/sw.js',
  'public/icons/pwa-192.png',
  'public/icons/pwa-512.png',
]) {
  await access(path.join(root, file))
}

const index = await read('index.html')
const main = await read('src/main.jsx')
const manifest = JSON.parse(await read('public/manifest.webmanifest'))
const worker = await read('public/sw.js')
const monitor = await read('src/release-monitor.js')
const viteConfig = await read('vite.config.js')

for (const required of [
  'rel="manifest"',
  'apple-mobile-web-app-capable',
  'apple-mobile-web-app-title',
  'apple-touch-icon',
  'mobile-web-app-capable',
]) {
  if (!index.includes(required)) throw new Error('PWA HTML incompleta: falta ' + required)
}

for (const required of [
  'navigator.serviceWorker.register',
  'import.meta.env.BASE_URL',
  "updateViaCache: 'none'",
  "controllerchange",
  "sw.js?v=",
  "installReleaseMonitor",
  "aula-ei-worker-updated",
]) {
  if (!main.includes(required)) throw new Error('Registro PWA incompleto: falta ' + required)
}

if (manifest.display !== 'standalone') throw new Error('La PWA debe abrir en modo standalone.')
if (manifest.start_url !== './#/') throw new Error('start_url debe respetar el router hash de Aula EI.')
if (manifest.scope !== './') throw new Error('scope debe ser relativo para Vercel y GitHub Pages.')
if (manifest.prefer_related_applications !== false) throw new Error('prefer_related_applications debe ser false.')

const sizes = new Set((manifest.icons || []).map((icon) => icon.sizes))
if (!sizes.has('192x192') || !sizes.has('512x512')) {
  throw new Error('La PWA necesita iconos 192x192 y 512x512.')
}
if (!(manifest.icons || []).some((icon) => String(icon.purpose || '').includes('maskable'))) {
  throw new Error('La PWA necesita un icono maskable para Android.')
}

for (const forbidden of [
  'ipoidimevokogptydbvt.supabase.co',
  "url.origin !== self.location.origin) return true",
]) {
  if (worker.includes(forbidden)) throw new Error('El service worker no debe cachear backend autenticado: ' + forbidden)
}

for (const required of [
  "url.origin !== self.location.origin) return false",
  "request.mode === 'navigate'",
  "CACHE_VERSION = 'aula-ei-pwa-v11-'",
  "url.pathname.endsWith('/version.json')",
  'isFreshCode',
  'networkFirst(request)',
  "fetch(request, { cache: 'no-store' })",
  'staleWhileRevalidate',
  'networkFirstNavigation',
  'caches.delete',
]) {
  if (!worker.includes(required)) throw new Error('Estrategia PWA incompleta: falta ' + required)
}

for (const required of [
  'version.json',
  'releaseChanged',
  "cache: 'no-store'",
  'visibilitychange',
  "window.addEventListener('focus'",
]) {
  if (!monitor.includes(required) && !viteConfig.includes(required))
    throw new Error('Monitor de versión incompleto: ' + required)
}
if (!viteConfig.includes("__AULA_EI_RELEASE__") || !viteConfig.includes("dist/version.json"))
  throw new Error('El build debe publicar el release ID y su versión JSON.')
if (!releaseChanged('old-release', 'new-release'))
  throw new Error('Una actualización real debe activar el aviso.')
if (releaseChanged('same-release', 'same-release') || releaseChanged('same-release', ''))
  throw new Error('No se debe avisar sin una nueva versión comprobada.')
console.log('PWA v11 validada: version.json, aviso de actualización, caché por release y JS/CSS network-first.')
