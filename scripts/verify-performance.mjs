import { access, readFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const read = (file) => readFile(path.join(root, file), 'utf8')

const main = await read('src/main.jsx')
const visualOrder = [
  "import '../studio/src/styles/core.css'",
  "import '../studio/src/styles/users.css'",
  "import '../studio/src/styles/certificates.css'",
  "import '../studio/src/styles/courses.css'",
  "import '../studio/src/styles/compliance.css'",
  "import '../player/src/styles/core.css'",
  "import '../player/src/styles/course.css'",
  "import '../player/src/styles/catalog.css'",
  "import '../player/src/styles/shell.css'",
  "import '../player/src/styles/modules.css'",
  "import '../player/src/styles/notifications.css'",
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
  "from './auth/AuthScreens.jsx'",
  "from './async-utils.js'",
]) {
  if (!app.includes(required)) throw new Error('Code splitting/organización principal incompleta: ' + required)
}

const learner = await read('player/src/LearnerApp.jsx')
const navigation = await read('player/src/navigation.js')
const playerStyles = [
  await read('player/src/styles/core.css'),
  await read('player/src/styles/course.css'),
  await read('player/src/styles/catalog.css'),
  await read('player/src/styles/shell.css'),
  await read('player/src/styles/modules.css'),
  await read('player/src/styles/notifications.css'),
].join('\n')
const playerExperience = await read('player/src/experience.css')
const globalMotion = await read('src/global-experience.css')
const mobileApp = await read('src/mobile-app.css')
const viewportRuntime = await read('src/MobileViewportSync.jsx')
const interactionLayer = await read('src/ExperienceLayer.jsx')

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
  'void loadCoursePlayer()',
]) {
  if (!learner.includes(required)) throw new Error('Arquitectura de carga de rutas incompleta: ' + required)
}
if (navigation.includes('document.startViewTransition')) {
  throw new Error('La navegación principal no puede usar View Transitions de pantalla completa.')
}

const studio = await read('studio/src/App.jsx')
const studioModules = await read('studio/src/studio-modules.js')
const studioData = await read('studio/src/useStudioData.js')
if (studio.includes("import './styles.css'")) throw new Error('Studio no debe reinyectar CSS dinámicamente.')
for (const required of [
  "import('./CoursesManager.jsx')",
  "import('./AssignmentsCenter.jsx')",
  "import('./ComplianceCenter.jsx')",
  "import('./UsersManager.jsx')",
  "import('./CertificatesManager.jsx')",
  'preloadStudioTools',
]) {
  if (!studioModules.includes(required)) throw new Error('Registro lazy de Studio incompleto: ' + required)
}
if (!studioData.includes("['assignments', 'users', 'compliance'].includes(tab)")) {
  throw new Error('Studio debe diferir la carga de perfiles hasta que una pestaña los necesite.')
}
for (const forbidden of ['flushSync', 'document.startViewTransition']) {
  if (studio.includes(forbidden)) throw new Error('Studio contiene trabajo síncrono o transición costosa: ' + forbidden)
}

const certificate = await read('certificate/src/CertificateApp.jsx')
if (certificate.includes("import './styles.css'") || certificate.includes("import './experience.css'")) {
  throw new Error('Certificados no debe reinyectar CSS dinámicamente.')
}

const supabase = await read('src/supabase.js')
for (const required of ['createSignedUrls', 'signedUrlCache', 'pendingSignedUrls']) {
  if (!supabase.includes(required)) throw new Error('Batch/caché de Storage incompleto: ' + required)
}

await access(path.join(root, 'src/data-cache.js'))
const index = await read('index.html')
if (!index.includes('Content-Security-Policy')) throw new Error('GitHub Pages debe incluir CSP en el documento.')
await access(path.join(root, 'package-lock.json'))

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
for (const forbidden of [
  'premiumPageIn',
  'premiumAmbientFloat',
  'filter var(--ux-normal) ease',
]) {
  if (playerExperience.includes(forbidden)) {
    throw new Error('Player reintrodujo una animación/filtro costoso: ' + forbidden)
  }
}
for (const required of [
  'Aula EI · Compositor Performance v5',
  'backdrop-filter:none!important',
  'contain:layout paint style',
  '.studio-tab-content{',
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
for (const forbidden of [
  'aula-pointer-dot',
  'aula-pointer-ring',
  'aula-click-burst',
  'pointermove',
  'pointerover',
  'is-interactive',
  'MutationObserver',
  'IntersectionObserver',
]) {
  if (interactionLayer.includes(forbidden) || globalMotion.includes(forbidden)) {
    throw new Error('La capa de experiencia contiene trabajo decorativo continuo: ' + forbidden)
  }
}
if (!interactionLayer.includes('requestAnimationFrame')) {
  throw new Error('La capa visual debe agrupar su escaneo por frame.')
}

for (const required of ['requestAnimationFrame(runSync)', 'const last = {', 'aula-mobile-narrow', 'aula-mobile-tablet']) {
  if (!viewportRuntime.includes(required)) throw new Error('Viewport runtime no está amortiguando recalculos: ' + required)
}

console.log('Performance v6 validada: navegación ligera, precarga ociosa, compositor sin animaciones globales costosas y DOM sin observers decorativos.')
