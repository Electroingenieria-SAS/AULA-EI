import { readFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const read = (file) => readFile(path.join(root,file),'utf8')

const app = await read('src/App.jsx')
const authShell = await read('src/AuthVisualShell.jsx')
const mfa = await read('src/AdminMfaGate.jsx')
const auth = await read('src/auth.css')
const learnerApp = await read('player/src/LearnerApp.jsx')
const learnerShell = await read('player/src/LearnerShell.jsx')
const player = await read('player/src/styles.css')
const playerExperience = await read('player/src/experience.css')
const studioApp = await read('studio/src/App.jsx')
const studio = await read('studio/src/styles.css')
const certificate = await read('certificate/src/styles.css')
const index = await read('index.html')
const globalExperience = await read('src/global-experience.css')

for (const required of [
  "AuthVisualShell",
  "AuthPanelBrand",
  "loadLearnerApp",
  "void loadLearnerApp()",
]) {
  if (!app.includes(required)) throw new Error('Flujo de autenticación estable incompleto: falta ' + required)
}

for (const required of [
  "--auth-photo",
  "assetUrl('brand/fondo.jpg')",
  "auth-backdrop",
  "auth-orb-one",
  "auth-feature-row",
]) {
  if (!authShell.includes(required)) throw new Error('Shell visual compartido incompleto: falta ' + required)
}

if (mfa.includes('mfa-page') || mfa.includes('mfa-card')) {
  throw new Error('MFA volvió a usar una pantalla visual separada del Login.')
}
for (const required of [
  "AuthVisualShell",
  "AuthPanelBrand",
  "auth-mfa-panel",
  "mfa-panel-copy",
]) {
  if (!mfa.includes(required)) throw new Error('MFA compartido incompleto: falta ' + required)
}

for (const required of [
  "var(--auth-photo)",
  ".auth-backdrop",
  ".auth-panel-clean",
  ".auth-loading-panel",
  ".auth-mfa-panel",
  ".mfa-form input",
  "@keyframes authOrbOne",
]) {
  if (!auth.includes(required)) throw new Error('Sistema visual de autenticación incompleto: falta ' + required)
}
if (auth.includes('.mfa-page{') || auth.includes('.mfa-card{')) {
  throw new Error('Quedó CSS legacy de la pantalla MFA separada.')
}

if (!learnerShell.includes("--aula-photo-image") || !learnerShell.includes("assetUrl('brand/fondo.jpg')")) {
  throw new Error('El shell autenticado debe recibir el fondo institucional desde React.')
}
if (!learnerShell.includes("--mobile-nav-items") || !learnerShell.includes("active={activeRoute === 'studio'}")) {
  throw new Error('La navegación móvil no tiene estado/cantidad explícitos.')
}

if (!player.includes("var(--aula-photo-image)")) {
  throw new Error('El Player no está usando la imagen institucional inyectada por React.')
}
if (!player.includes(".learner-app-shell:before") || !player.includes(".learner-app-shell:after")) {
  throw new Error('Faltan las capas de fondo/ambiente del shell autenticado.')
}
if (!player.includes("--aula-sidebar-width:278px")) {
  throw new Error('El shell de escritorio debe definir un único ancho de sidebar.')
}
if (!player.includes(".learner-global-sidebar{\n  position:fixed")) {
  throw new Error('La barra lateral de escritorio debe permanecer fija al viewport.')
}
if (player.includes(".learner-global-sidebar{\n  position:sticky")) {
  throw new Error('La barra lateral no puede volver a position:sticky.')
}
if (!player.includes("margin-left:var(--aula-sidebar-width)") || !player.includes("width:calc(100% - var(--aula-sidebar-width))")) {
  throw new Error('El contenido principal debe respetar exactamente el ancho de la sidebar fija.')
}
if (!playerExperience.includes("left:var(--aula-sidebar-width,278px)")) {
  throw new Error('La barra de progreso superior debe alinearse con la sidebar fija.')
}
if (!player.includes(".learner-mobile-global-nav{display:none}")) {
  throw new Error('La navegación móvil debe permanecer oculta por defecto.')
}
if (!player.includes("grid-template-columns:repeat(var(--mobile-nav-items,4),minmax(0,1fr))")) {
  throw new Error('La navegación móvil canónica no está definida.')
}
if (!player.includes("border:0!important") || !player.includes("-webkit-appearance:none")) {
  throw new Error('Los botones móviles pueden volver a mostrarse con estilos nativos del navegador.')
}
if (!player.includes(".learner-route-loading{") || !player.includes(".learner-route-loading-grid{")) {
  throw new Error('Falta el estado de carga estable de rutas.')
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
if (!playerExperience.includes("content-visibility:visible")) {
  throw new Error('En móvil las tarjetas deben evitar pop-in por content-visibility.')
}

if (!learnerApp.includes("import HomePage from './HomePage.jsx'")) {
  throw new Error('Inicio debe cargarse de forma inmediata para evitar una vista vacía tras autenticación.')
}
for (const required of ["requestIdleCallback","loadCatalogPage","loadGamesPage","loadStudioApp"]) {
  if (!learnerApp.includes(required)) throw new Error('Precarga secundaria incompleta: falta ' + required)
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

if (!index.includes('viewport-fit=cover')) throw new Error('Falta soporte de safe area móvil.')
if (!index.includes('%BASE_URL%brand/fondo.jpg') || !index.includes('rel="preload" as="image"')) {
  throw new Error('El fondo institucional debe precargarse desde el HTML.')
}
if (!globalExperience.includes('@media(max-width:900px),(hover:none),(pointer:coarse)')) {
  throw new Error('El cursor de escritorio debe desactivarse en móvil.')
}

console.log('Visual stability validada: Login/MFA compartidos, fondo precargado, mobile nav canónica, safe areas y cargas sin saltos.')
