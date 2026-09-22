import { readFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const read = (file) => readFile(path.join(root,file),'utf8')

const globalMotion = await read('src/global-experience.css')
const experience = await read('src/ExperienceLayer.jsx')
const playerExperience = await read('player/src/experience.css')
const navigation = await read('player/src/navigation.js')
const studio = await read('studio/src/App.jsx')

for (const required of [
  '--motion-fast',
  '--motion-ease-out',
  '.premium-reveal{',
  '.studio-tab-stage{',
  '@keyframes motionModalIn',
  '@keyframes motionDrawerIn',
  '@keyframes motionToastIn',
  '::view-transition-old(aula-route)',
  '@media(prefers-reduced-motion:reduce)',
]) {
  if (!globalMotion.includes(required)) {
    throw new Error('Motion system incompleto: falta ' + required)
  }
}

for (const required of [
  '.panel-card',
  '.course-library-card',
  '.pending-certificate-card',
  '.compliance-metrics article',
  '.data-table-wrap',
  '.studio-navigation-shell',
]) {
  if (!experience.includes(required)) {
    throw new Error('Cobertura de reveal incompleta: falta ' + required)
  }
}

if (playerExperience.includes('.premium-reveal{')) {
  throw new Error('El reveal volvió a duplicarse fuera del sistema global.')
}

for (const required of [
  'document.startViewTransition',
  'window.history.pushState',
  'window.history.replaceState',
  "new HashChangeEvent('hashchange'",
]) {
  if (!navigation.includes(required)) {
    throw new Error('Navegación fluida incompleta: falta ' + required)
  }
}

for (const required of [
  "import { flushSync } from 'react-dom'",
  'const changeTab = useCallback',
  'document.startViewTransition(commit)',
  'onClick={() => changeTab(id)}',
]) {
  if (!studio.includes(required)) {
    throw new Error('Transición fluida de Studio incompleta: falta ' + required)
  }
}

console.log('Motion system validado: paneles, rutas, Studio, modales, tablas, feedback y accesibilidad coherentes.')
