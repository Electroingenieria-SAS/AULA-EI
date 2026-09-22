import { readFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const read = (file) => readFile(path.join(root,file),'utf8')

const app = await read('src/App.jsx')
const main = await read('src/main.jsx')
const runtime = await read('src/MobileViewportSync.jsx')
const mobile = await read('src/mobile.css')
const mobileApp = await read('src/mobile-app.css')
const shell = await read('player/src/LearnerShell.jsx')
const course = await read('player/src/CoursePlayer.jsx')
const users = await read('studio/src/UsersManager.jsx')
const assignments = await read('studio/src/AssignmentsCenter.jsx')
const certificates = await read('studio/src/CertificatesManager.jsx')
const compliance = await read('studio/src/ComplianceCenter.jsx')
const index = await read('index.html')
const experience = await read('src/ExperienceLayer.jsx')
const playerStyles = await read('player/src/styles.css')

for (const required of [
  "import MobileViewportSync from './MobileViewportSync.jsx'",
  '<MobileViewportSync />',
]) {
  if (!app.includes(required)) throw new Error('Runtime móvil incompleto: falta ' + required)
}

if (!main.includes("import './mobile.css'") || !main.includes("import './mobile-app.css'")) {
  throw new Error('El sistema móvil debe cargar mobile.css y la capa Mobile App Experience al final.')
}
if (main.indexOf("import './mobile-app.css'") < main.indexOf("import './mobile.css'")) {
  throw new Error('mobile-app.css debe cargarse después de mobile.css para resolver conflictos de composición.')
}

for (const required of [
  'window.visualViewport',
  '--mobile-vh',
  '--mobile-keyboard-height',
  'aula-mobile-runtime',
  'aula-mobile-keyboard-open',
  'navigator.vibrate',
]) {
  if (!runtime.includes(required)) throw new Error('Sincronización móvil incompleta: falta ' + required)
}

for (const required of [
  '@media(max-width:900px)',
  '.learner-mobile-global-nav',
  'body.aula-mobile-keyboard-open .learner-mobile-global-nav',
  '.training-notification-panel',
  'top:calc(100% + 8px)!important',
  'transform-origin:top right',
  '@keyframes mobileNotificationFromBell',
  '.learner-outline.mobile-open',
  '.practice-gate-modal',
  '.learner-stage-nav',
  '.studio-navigation-shell',
  '.users-data-table td[data-label]',
  '.assignment-center .data-table td[data-label]',
  '.certificates-data-table td[data-label]',
  '.course-create-modal',
  '.user-detail-drawer',
  '.certificate-detail-drawer',
  '@media(max-width:900px) and (orientation:landscape)',
]) {
  if (!mobile.includes(required)) throw new Error('Cobertura mobile-first incompleta: falta ' + required)
}

for (const required of [
  '.learner-mobile-appbar{',
  '.learner-mobile-brand{',
  '.learner-mobile-appbar .training-notification-center',
  '.learner-mobile-global-nav{',
  '.mobile-user-card{',
  '.mobile-certificate-card{',
  '.mobile-position-overview{',
  '.lightbox-canvas.touch-zoom-canvas',
  '@media(max-width:900px)',
]) {
  if (!mobileApp.includes(required)) throw new Error('Mobile App Experience v3 incompleta: falta ' + required)
}

for (const required of [
  'learner-mobile-appbar',
  'learner-mobile-brand',
  'mobileTitle',
]) {
  if (!shell.includes(required)) throw new Error('Shell móvil dedicado incompleto: falta ' + required)
}

if (!shell.includes('mobileHaptic')) {
  throw new Error('La navegación móvil perdió feedback táctil.')
}
if (!course.includes('mobile-outline-button') || !course.includes('learner-stage-nav')) {
  throw new Error('El reproductor perdió controles específicos de móvil.')
}
for (const required of ['touchDistance','onTouchStart','onTouchMove','touch-zoom-canvas','onDoubleClick']) {
  if (!course.includes(required)) throw new Error('El visor táctil de capacitaciones está incompleto: falta ' + required)
}
if (!assignments.includes('MOBILE_ASSIGNMENT_COLUMN_LABELS') || !assignments.includes('data-label={MOBILE_ASSIGNMENT_COLUMN_LABELS')) {
  throw new Error('Asignaciones no puede degradar su tabla a tarjetas móviles.')
}
for (const required of ['Share2','navigator.share','mobile-native-share','mobile-certificate-list','mobile-certificate-card']) {
  if (!certificates.includes(required)) throw new Error('Certificados móvil incompleto: falta ' + required)
}

for (const required of ['mobile-user-list','mobile-user-card','mobile-user-training']) {
  if (!users.includes(required)) throw new Error('Usuarios móvil incompleto: falta ' + required)
}

for (const required of ['mobile-position-overview','mobile-position-card-list']) {
  if (!compliance.includes(required)) throw new Error('Cargos móvil incompleto: falta ' + required)
}

for (const forbidden of [
  "'.data-table-wrap'",
  "'.users-directory'",
  "'.certificates-workspace'",
  "'.compliance-two-column'",
]) {
  if (experience.includes(forbidden)) {
    throw new Error('Los directorios/listas operativas no pueden depender de scroll reveal: ' + forbidden)
  }
}

for (const required of [
  '.mobile-data-view{display:none}',
  '.desktop-data-view{display:block}',
  '.mobile-user-list,',
  '.mobile-certificate-list{',
  '.mobile-position-overview{',
  '.mobile-position-card-list{',
]) {
  if (!mobile.includes(required)) {
    throw new Error('Las vistas móviles explícitas están incompletas: falta ' + required)
  }
}

if (playerStyles.includes('.learner-app-shell>.training-notification-center .training-notification-panel{position:fixed')) {
  throw new Error('Notificaciones móvil volvió a competir con mobile.css usando position:fixed.')
}

if (!index.includes('viewport-fit=cover')) {
  throw new Error('iOS safe-area requiere viewport-fit=cover.')
}

console.log('Mobile App Experience v3 validada: shell táctil dedicado, cards operativas, notificaciones resilientes y zoom móvil.')
