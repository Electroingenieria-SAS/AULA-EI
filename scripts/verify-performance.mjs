import { access, readFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const read = (file) => readFile(path.join(root,file),'utf8')

const main = await read('src/main.jsx')
const visualOrder = [
  "import '../studio/src/styles.css'",
  "import '../player/src/styles.css'",
  "import '../player/src/experience.css'",
  "import '../certificate/src/styles.css'",
  "import '../certificate/src/experience.css'",
  "import './auth.css'",
  "import './global-experience.css'",
]
let lastVisualIndex = -1
for (const required of visualOrder) {
  const currentIndex = main.indexOf(required)
  if (currentIndex < 0) throw new Error('Falta una capa del sistema visual estable: ' + required)
  if (currentIndex <= lastVisualIndex) throw new Error('El orden de cascada visual cambió y puede producir regresiones: ' + required)
  lastVisualIndex = currentIndex
}

const app = await read('src/App.jsx')
for (const required of [
  "const loadCertificateApp = () => import('../certificate/src/CertificateApp.jsx')",
  "const loadLearnerApp = () => import('../player/src/LearnerApp.jsx')",
  "const CertificateApp = lazy(loadCertificateApp)",
  "const LearnerApp = lazy(loadLearnerApp)",
]) {
  if (!app.includes(required)) throw new Error('Code splitting/prefetch principal incompleto: ' + required)
}

const learner = await read('player/src/LearnerApp.jsx')
const playerStyles = await read('player/src/styles.css')
const globalMotion = await read('src/global-experience.css')
const mobileApp = await read('src/mobile-app.css')
const viewportRuntime = await read('src/MobileViewportSync.jsx')
if (learner.includes("import './styles.css'") || learner.includes("import './experience.css'")) {
  throw new Error('Player no debe reinyectar CSS dinámicamente; altera la cascada visual.')
}
for (const required of [
  "const loadStudioApp = () => import('../../studio/src/App.jsx')",
  "const loadCoursePlayer = () => import('./CoursePlayer.jsx')",
  "const loadCatalogPage = () => import('./CatalogPage.jsx')",
  "const loadGamesPage = () => import('./GamesPage.jsx')",
  "const StudioApp = lazy(loadStudioApp)",
  "const CoursePlayer = lazy(loadCoursePlayer)",
  "const CatalogPage = lazy(loadCatalogPage)",
  "const GamesPage = lazy(loadGamesPage)",
  "import HomePage from './HomePage.jsx'",
]) {
  if (!learner.includes(required)) throw new Error('Arquitectura de carga de rutas incompleta: ' + required)
}

const studio = await read('studio/src/App.jsx')
if (studio.includes("import './styles.css'")) throw new Error('Studio no debe reinyectar CSS dinámicamente.')
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

const certificate = await read('certificate/src/CertificateApp.jsx')
if (certificate.includes("import './styles.css'") || certificate.includes("import './experience.css'")) {
  throw new Error('Certificados no debe reinyectar CSS dinámicamente.')
}

const supabase = await read('src/supabase.js')
for (const required of ['createSignedUrls','signedUrlCache','pendingSignedUrls']) {
  if (!supabase.includes(required)) throw new Error('Batch/caché de Storage incompleto: ' + required)
}

await access(path.join(root,'src/data-cache.js'))
const index = await read('index.html')
if (!index.includes('Content-Security-Policy')) throw new Error('GitHub Pages debe incluir CSP en el documento.')

await access(path.join(root,'package-lock.json'))

const home = await read('player/src/HomePage.jsx')
const catalog = await read('player/src/CatalogPage.jsx')
if (!home.includes("rpc('get_my_home_snapshot')")) throw new Error('Inicio debe usar un único snapshot RPC.')
if (!catalog.includes("rpc('get_my_catalog_snapshot')")) throw new Error('Catálogo debe usar un único snapshot RPC.')

const workflow = await read('.github/workflows/deploy-pages.yml')
if (!workflow.includes('npm ci --no-audit --no-fund')) throw new Error('GitHub Actions debe usar npm ci.')
if (!workflow.includes('npm audit --omit=dev --audit-level=high')) throw new Error('Falta auditoría de dependencias de producción.')

if (playerStyles.includes('no-repeat fixed') || playerStyles.includes('filter:saturate(.92) contrast(1.02)')) {
  throw new Error('El fondo global volvió a forzar repaints costosos.')
}
for (const required of [
  'Aula EI · Compositor Performance v5',
  'will-change:transform,opacity',
  'backdrop-filter:none!important',
]) {
  if (!globalMotion.includes(required)) throw new Error('Compositor performance incompleto: ' + required)
}
for (const required of [
  'Aula EI · Mobile Fluidity v4',
  'content-visibility:auto',
  '@media(max-width:340px)',
  '@media(min-width:541px) and (max-width:900px)',
]) {
  if (!mobileApp.includes(required)) throw new Error('Optimización móvil incompleta: ' + required)
}
for (const required of ['requestAnimationFrame(runSync)', 'const last = {', 'aula-mobile-narrow', 'aula-mobile-tablet']) {
  if (!viewportRuntime.includes(required)) throw new Error('Viewport runtime no está amortiguando recalculos: ' + required)
}

console.log('Performance v5 validada: animaciones en compositor, fondos sin repaint costoso, viewport amortiguado y mobile 320-900px.')
