import { readFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const read = (file) => readFile(path.join(root, file), 'utf8')

const globalMotion = await read('src/global-experience.css')
const experience = await read('src/ExperienceLayer.jsx')
const navigation = await read('player/src/navigation.js')
const studio = await read('studio/src/App.jsx')
const studioModules = await read('studio/src/studio-modules.js')

for (const required of [
  '--motion-fast',
  '--motion-ease-out',
  '.premium-reveal{',
  '.studio-tab-content{',
  '@keyframes motionStageIn',
  '@keyframes motionModalIn',
  '@keyframes motionDrawerIn',
  '@keyframes motionToastIn',
  '@media(prefers-reduced-motion:reduce)',
]) {
  if (!globalMotion.includes(required)) {
    throw new Error('Motion system incompleto: falta ' + required)
  }
}

for (const forbidden of [
  '::view-transition-old(',
  '::view-transition-new(',
  'view-transition-name:',
]) {
  if (globalMotion.includes(forbidden)) {
    throw new Error('No se permiten capturas View Transition de pantalla completa: ' + forbidden)
  }
}

for (const required of [
  '.panel-card',
  '.course-library-card',
  '.pending-certificate-card',
  '.compliance-metrics article',
  '.studio-navigation-shell',
  "window.addEventListener('hashchange', scan)",
  'requestAnimationFrame',
]) {
  if (!experience.includes(required)) {
    throw new Error('Capa visual ligera incompleta: falta ' + required)
  }
}

for (const forbidden of [
  'MutationObserver',
  'IntersectionObserver',
  'pendingRoots',
]) {
  if (experience.includes(forbidden)) {
    throw new Error('La capa decorativa no puede observar continuamente el DOM: ' + forbidden)
  }
}

for (const required of [
  'window.history.pushState',
  'window.history.replaceState',
  "new HashChangeEvent('hashchange'",
  'commitNavigation()',
]) {
  if (!navigation.includes(required)) {
    throw new Error('Navegación ligera incompleta: falta ' + required)
  }
}
if (navigation.includes('document.startViewTransition')) {
  throw new Error('La navegación no debe capturar la pantalla completa con View Transitions.')
}

for (const required of [
  "startTransition(() => setTab(nextTab))",
  'preloadStudioTools(canAdmin)',
  'onClick={() => changeTab(id)}',
  'className="studio-tab-content"',
]) {
  if (!studio.includes(required)) {
    throw new Error('Transición concurrente de Studio incompleta: falta ' + required)
  }
}
for (const forbidden of ['flushSync', 'document.startViewTransition']) {
  if (studio.includes(forbidden)) {
    throw new Error('Studio contiene una transición bloqueante: ' + forbidden)
  }
}

for (const required of [
  'preloadStudioTools',
  'loadAssignmentsCenter',
  'loadUsersManager',
  'loadCertificatesManager',
  'loadComplianceCenter',
]) {
  if (!studioModules.includes(required)) {
    throw new Error('Precarga de herramientas Studio incompleta: falta ' + required)
  }
}

console.log('Motion v6 validado: navegación sin capturas completas, transiciones concurrentes y capa decorativa sin observadores globales.')
