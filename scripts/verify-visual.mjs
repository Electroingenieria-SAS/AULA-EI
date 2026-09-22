import { readFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const read = (file) => readFile(path.join(root,file),'utf8')

const studio = await read('studio/src/styles.css')
const player = await read('player/src/styles.css')
const playerExperience = await read('player/src/experience.css')
const certificate = await read('certificate/src/styles.css')
const auth = await read('src/auth.css')

const forbiddenStudio = [
  '\nbody{',
  '\nh1,h2,h3,h4{',
  '\nh1,h2,h3,h4,p{',
  '\nlabel{',
  '\nsmall{',
]
for (const token of forbiddenStudio) {
  if (studio.includes(token)) throw new Error('Studio volvió a filtrar estilos globales: ' + token.trim())
}
if (!studio.includes('.integrated-studio .admin-hero{')) throw new Error('Falta el hero visual azul de Gestión.')
if (!studio.includes('animation:studioHeroOrb')) throw new Error('Falta la animación ambiental de Gestión.')

if (certificate.startsWith(':root{') || certificate.includes('\nbody{background:')) {
  throw new Error('Certificados volvió a contaminar root/body global.')
}

if (player.startsWith(':root{') || player.includes('\nbody{background:')) {
  throw new Error('Player debe mantener sus variables y fondo dentro de .learner-app-shell.')
}
if (!player.includes('background:var(--aula-photo-background);')) {
  throw new Error('El fondo fotográfico de Aula EI no está activo en el shell.')
}
if (player.includes('.learner-app-shell,\n.learner-shell-main')) {
  throw new Error('learner-app-shell no puede volver a ser forzado a background transparent.')
}

if (playerExperience.startsWith(':root{') || playerExperience.includes('\nbody{\n  color:var(--premium-text)')) {
  throw new Error('Premium Experience volvió a filtrar tokens al documento completo.')
}

if (!auth.includes('.auth-hero-clean h1') || !auth.includes('color:#fff;text-shadow:')) {
  throw new Error('El título del Login debe conservar contraste blanco explícito.')
}
if (!auth.includes("url('../brand/fondo.jpg')")) {
  throw new Error('El Login perdió el fondo fotográfico institucional.')
}
if (!auth.includes('animation:authAmbient')) {
  throw new Error('El Login perdió su ambiente animado.')
}

console.log('Visual system validado: módulos aislados, fondo institucional, hero azul, contraste y animaciones protegidos.')
