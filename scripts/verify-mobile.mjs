import { readFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const read = (file) => readFile(path.join(root,file),'utf8')

const app = await read('src/App.jsx')
const main = await read('src/main.jsx')
const runtime = await read('src/MobileViewportSync.jsx')
const mobile = await read('src/mobile.css')
const shell = await read('player/src/LearnerShell.jsx')
const course = await read('player/src/CoursePlayer.jsx')
const users = await read('studio/src/UsersManager.jsx')
const assignments = await read('studio/src/AssignmentsCenter.jsx')
const certificates = await read('studio/src/CertificatesManager.jsx')
const index = await read('index.html')
const experience = await read('src/ExperienceLayer.jsx')

for (const required of [
  "import MobileViewportSync from './MobileViewportSync.jsx'",
  '<MobileViewportSync />',
]) {
  if (!app.includes(required)) throw new Error('Runtime móvil incompleto: falta ' + required)
}

if (!main.includes("import './mobile.css'")) {
  throw new Error('El sistema móvil debe cargarse como capa canónica final.')
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

if (!shell.includes('mobileHaptic')) {
  throw new Error('La navegación móvil perdió feedback táctil.')
}
if (!course.includes('mobile-outline-button') || !course.includes('learner-stage-nav')) {
  throw new Error('El reproductor perdió controles específicos de móvil.')
}
if (!users.includes('MOBILE_USER_COLUMN_LABELS') || !users.includes('data-label={MOBILE_USER_COLUMN_LABELS')) {
  throw new Error('Usuarios no puede degradar su tabla a tarjetas móviles.')
}
if (!assignments.includes('MOBILE_ASSIGNMENT_COLUMN_LABELS') || !assignments.includes('data-label={MOBILE_ASSIGNMENT_COLUMN_LABELS')) {
  throw new Error('Asignaciones no puede degradar su tabla a tarjetas móviles.')
}
for (const required of ['Share2','navigator.share','mobile-native-share','data-label="Persona"']) {
  if (!certificates.includes(required)) throw new Error('Certificados móvil incompleto: falta ' + required)
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
  '.users-data-wrap,',
  '.certificates-data-wrap,',
  '.compliance-two-column{',
  'opacity:1!important',
  'visibility:visible!important',
]) {
  if (!mobile.includes(required)) {
    throw new Error('Las listas móviles deben ser deterministas y visibles: falta ' + required)
  }
}

if (!index.includes('viewport-fit=cover')) {
  throw new Error('iOS safe-area requiere viewport-fit=cover.')
}

console.log('Mobile First v2.1 validado: datos siempre visibles, cargos/rankings/usuarios estables y notificaciones ancladas a la campana.')
