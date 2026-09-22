import { access, readFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const read = (file) => readFile(path.join(root,file),'utf8')

const main = await read('src/main.jsx')
for (const forbidden of ['studio/src/styles.css','player/src/styles.css','certificate/src/styles.css']) {
  if (main.includes(forbidden)) throw new Error('CSS pesado volvió al entry inicial: ' + forbidden)
}

const app = await read('src/App.jsx')
for (const required of [
  "lazy(() => import('../certificate/src/CertificateApp.jsx'))",
  "lazy(() => import('../player/src/LearnerApp.jsx'))",
]) {
  if (!app.includes(required)) throw new Error('Code splitting principal incompleto: ' + required)
}

const learner = await read('player/src/LearnerApp.jsx')
for (const required of [
  "lazy(() => import('../../studio/src/App.jsx'))",
  "lazy(() => import('./CoursePlayer.jsx'))",
  "lazy(() => import('./CatalogPage.jsx'))",
]) {
  if (!learner.includes(required)) throw new Error('Ruta pesada cargada de forma eager: ' + required)
}

const studio = await read('studio/src/App.jsx')
for (const required of [
  "lazy(() => import('./CoursesManager.jsx'))",
  "lazy(() => import('./AssignmentsCenter.jsx'))",
  "lazy(() => import('./ComplianceCenter.jsx'))",
]) {
  if (!studio.includes(required)) throw new Error('Studio debe cargar herramientas bajo demanda: ' + required)
}
if (!studio.includes("['assignments', 'users', 'compliance'].includes(tab)")) {
  throw new Error('Studio debe diferir la carga de perfiles hasta que una pestaña los necesite.')
}

const supabase = await read('src/supabase.js')
for (const required of ['createSignedUrls','signedUrlCache','pendingSignedUrls']) {
  if (!supabase.includes(required)) throw new Error('Batch/caché de Storage incompleto: ' + required)
}

await access(path.join(root,'src/data-cache.js'))
const index = await read('index.html')
if (!index.includes('Content-Security-Policy')) throw new Error('GitHub Pages debe incluir CSP en el documento.')

await access(path.join(root,'package-lock.json'))

console.log('Performance v4 validada: lazy loading, carga de datos bajo demanda, caché, Storage batch, CSP y lockfile.')
