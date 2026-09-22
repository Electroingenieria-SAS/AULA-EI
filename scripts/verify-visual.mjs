import { readFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const read = (file) => readFile(path.join(root,file),'utf8')

const app = await read('src/App.jsx')
const auth = await read('src/auth.css')
const learnerShell = await read('player/src/LearnerShell.jsx')
const player = await read('player/src/styles.css')
const playerExperience = await read('player/src/experience.css')
const studioApp = await read('studio/src/App.jsx')
const studio = await read('studio/src/styles.css')
const certificate = await read('certificate/src/styles.css')

for (const required of [
  "--auth-photo",
  "assetUrl('brand/fondo.jpg')",
  "auth-backdrop",
  "auth-orb-one",
  "auth-feature-row",
]) {
  if (!app.includes(required)) throw new Error('Login reconstruido incompleto: falta ' + required)
}

for (const required of [
  "var(--auth-photo)",
  ".auth-backdrop",
  ".auth-copy h1",
  ".auth-panel-clean",
  "@keyframes authOrbOne",
]) {
  if (!auth.includes(required)) throw new Error('Sistema visual del Login incompleto: falta ' + required)
}

if (!learnerShell.includes("--aula-photo-image") || !learnerShell.includes("assetUrl('brand/fondo.jpg')")) {
  throw new Error('El shell autenticado debe recibir el fondo institucional desde React.')
}
if (!player.includes("var(--aula-photo-image)")) {
  throw new Error('El Player no está usando la imagen institucional inyectada por React.')
}
if (!player.includes(".learner-app-shell:before") || !player.includes(".learner-app-shell:after")) {
  throw new Error('Faltan las capas de fondo/ambiente del shell autenticado.')
}
if (player.includes("--aula-photo-background")) {
  throw new Error('Quedó un sistema de fondo legacy duplicado en Player.')
}
if (player.includes("integrated-tab-bar") || player.includes("studio-control-row")) {
  throw new Error('Player no debe volver a controlar la navegación de Studio.')
}
if (playerExperience.includes("integrated-tab-bar") || playerExperience.includes("studio-control-row")) {
  throw new Error('Premium Experience no debe volver a controlar la navegación de Studio.')
}
if (player.includes(":root{") || playerExperience.includes(":root{")) {
  throw new Error('Player/Premium no pueden volver a filtrar variables al documento completo.')
}

for (const required of [
  "studio-hero",
  "studio-navigation-shell",
  "studio-navigation-button",
  "studio-refresh-button",
]) {
  if (!studioApp.includes(required)) throw new Error('Markup de Gestión incompleto: falta ' + required)
}
if (studioApp.includes("integrated-tab-bar") || studioApp.includes("studio-control-row")) {
  throw new Error('Gestión volvió a usar la navegación legacy.')
}
for (const required of [
  ".studio-hero{",
  ".studio-navigation-shell{",
  ".studio-navigation-button{",
  ".studio-navigation-button.is-active{",
  "@keyframes studioHeroSweep",
  "@keyframes studioHeroOrb",
]) {
  if (!studio.includes(required)) throw new Error('Diseño fuente de Gestión incompleto: falta ' + required)
}

const forbiddenStudio = ['\nbody{','\nh1,h2,h3,h4{','\nh1,h2,h3,h4,p{','\nlabel{','\nsmall{']
for (const token of forbiddenStudio) {
  if (studio.includes(token)) throw new Error('Studio volvió a filtrar estilos globales: ' + token.trim())
}

if (certificate.startsWith(':root{') || certificate.includes('\nbody{background:')) {
  throw new Error('Certificados volvió a contaminar root/body global.')
}

console.log('Visual system reconstruido: fondo real por React, Login nuevo, shell fotográfico y navegación premium de Gestión.')
