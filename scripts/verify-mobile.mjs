import { readFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const read = (file) => readFile(path.join(root,file),'utf8')

const app = await read('src/App.jsx')
const main = await read('src/main.jsx')
const runtime = await read('src/MobileViewportSync.jsx')
const mobile = await read('src/mobile.css')
const mobileApp = await read('src/mobile-app.css')
const responsiveFoundation = await read('src/responsive-foundation.css')
const shell = await read('player/src/LearnerShell.jsx')
const coursePlayer = await read('player/src/CoursePlayer.jsx')
const shellStyles = await read('player/src/styles/shell.css')
const gallery = await read('player/src/course-player/ImageGallery.jsx')
const galleryMedia = await read('player/src/course-player/GalleryMediaContent.jsx')
const galleryStyles = await read('player/src/styles/gallery.css')
const immersiveStyles = await read('player/src/styles/immersive.css')
const course = [
  await read('player/src/CoursePlayer.jsx'),
  await read('player/src/course-player/CourseContentViews.jsx'),
  await read('player/src/course-player/CoursePlayerViews.jsx'),
  gallery,
].join('\n')
const users = await read('studio/src/UsersManager.jsx')
const assignments = await read('studio/src/AssignmentsCenter.jsx')
const certificates = await read('studio/src/CertificatesManager.jsx')
const compliance = [
  await read('studio/src/ComplianceCenter.jsx'),
  await read('studio/src/compliance/CompliancePanels.jsx'),
].join('\n')
const index = await read('index.html')
const experience = await read('src/ExperienceLayer.jsx')
const playerStyles = [
  await read('player/src/styles/core.css'),
  await read('player/src/styles/course.css'),
  await read('player/src/styles/catalog.css'),
  await read('player/src/styles/shell.css'),
  await read('player/src/styles/modules.css'),
  await read('player/src/styles/notifications.css'),
  galleryStyles,
  immersiveStyles,
].join('\n')

for (const required of [
  "import MobileViewportSync from './MobileViewportSync.jsx'",
  '<MobileViewportSync />',
]) {
  if (!app.includes(required)) throw new Error('Runtime móvil incompleto: falta ' + required)
}

for (const required of [
  "window.matchMedia('(max-width: 900px)')",
  'function loadMobileStyles()',
  "await import('./mobile.css')",
  "await import('./mobile-app.css')",
  'if (mobileStyleQuery.matches) await loadMobileStyles()',
]) {
  if (!main.includes(required)) throw new Error('Carga móvil bajo demanda incompleta: falta ' + required)
}
if (main.indexOf("await import('./mobile-app.css')") < main.indexOf("await import('./mobile.css')")) {
  throw new Error('mobile-app.css debe cargarse después de mobile.css para resolver conflictos de composición.')
}
if (main.includes("import './mobile.css'") || main.includes("import './mobile-app.css'")) {
  throw new Error('Las capas móviles no deben formar parte del CSS inicial de escritorio.')
}
if (!main.includes("import './responsive-foundation.css'")) {
  throw new Error('La base responsive debe cargarse siempre, también en escritorio.')
}
for (const required of [
  'Aula EI · Responsive Foundation v9',
  '.mobile-data-view{display:none!important}',
  '.desktop-data-view{display:block!important}',
  '.learner-mobile-appbar{display:contents}',
  '@media(min-width:1101px)',
  '@media(max-width:1100px)',
  '.learner-global-sidebar{',
  'display:none!important',
  '.learner-app-shell>.learner-mobile-appbar',
  '.learner-mobile-global-nav',
  '.data-table-wrap,',
  '@media(max-width:900px)',
  '.mobile-data-view{display:block!important}',
  '.desktop-data-view{display:none!important}',
]) {
  if (!responsiveFoundation.includes(required)) {
    throw new Error('Responsive Foundation v9 incompleta: falta ' + required)
  }
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

// One shared course header: no duplicate topbars or floating bell at any breakpoint.
for (const marker of [
  'learner-course-shell',
  'learner-course-back',
  'learner-course-heading',
  '<NotificationCenter profile={profile} />',
  "navigateLearner('/catalog')",
]) {
  if (!shell.includes(marker)) throw new Error('La cabecera de capacitación debe incluir navegación y notificaciones sin duplicarse: ' + marker)
}
if (coursePlayer.includes('<LearnerTopbar') || coursePlayer.includes("import LearnerTopbar")) {
  throw new Error('El curso no debe montar una segunda topbar debajo de las notificaciones.')
}
for (const marker of [
  '.learner-course-shell>.learner-mobile-appbar',
  'grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)',
  '.learner-course-back',
  '.learner-course-heading',
]) {
  if (!shellStyles.includes(marker)) throw new Error('Falta distribución de cabecera de escritorio: ' + marker)
}
for (const marker of [
  '.learner-app-shell:not(.learner-course-shell)>.learner-mobile-appbar .training-notification-center',
  '.learner-course-shell>.learner-mobile-appbar',
  'grid-template-columns:minmax(0,1fr) minmax(0,1fr) 48px!important',
]) {
  if (!responsiveFoundation.includes(marker)) throw new Error('Cabecera tablet/desktop no aislada: ' + marker)
}
for (const marker of [
  '.learner-course-shell>.learner-mobile-appbar',
  'grid-template-columns:44px minmax(0,1fr) 48px!important',
  '.learner-course-back span{display:none}',
]) {
  if (!mobileApp.includes(marker)) throw new Error('Cabecera móvil sobrepuesta: ' + marker)
}

if (!shell.includes('mobileHaptic')) {
  throw new Error('La navegación móvil perdió feedback táctil.')
}
if (!course.includes('course-route-trigger') || !course.includes('course-flow-nav')) {
  throw new Error('El reproductor perdió la navegación compacta compartida entre PC y móvil.')
}
for (const required of [
  'createPortal(viewer, document.body)',
  'onPointerDown',
  'onPointerMove',
  'setPointerCapture',
  'pointerDistance',
  'pointerCenter',
  'zoomAt(2.5',
  'Math.abs(dx) >= 62',
  'aula-media-viewer-open',
  'mediaType = \'image\'',
  'toggleBrowserFullscreen',
  'document.documentElement',
  'requestFullscreen',
  'immersive-video-frame',
  'immersive-presentation-frame',
]) {
  if (!(gallery + galleryMedia).includes(required)) throw new Error('Course Immersive Viewer incompleto: falta ' + required)
}
for (const required of [
  'immersive-media-preview',
  'immersive-image-preview-canvas',
  'openImmersive({ fullscreen: true })',
  'useCourseAsset(currentBlock)',
  'practiceNode={practiceGateOpen',
  'course-route-drawer',
  'course-insights',
]) {
  if (!course.includes(required)) throw new Error('Arquitectura inmersiva del CoursePlayer incompleta: falta ' + required)
}
for (const forbidden of ['visualFocus', 'imageExpanded=', 'setImageExpanded=']) {
  if (course.includes(forbidden)) throw new Error('CoursePlayer conserva estado visual heredado innecesario: ' + forbidden)
}
for (const required of [
  'Course Image Gallery v7',
  '.gallery-viewer-v7.image-lightbox',
  'z-index:5000!important',
  '.gallery-stage.lightbox-canvas.touch-zoom-canvas',
  'touch-action:none!important',
  '--gallery-scale',
  '.gallery-course-nav .gallery-nav-button',
  '.gallery-nav-previous',
  '.gallery-nav-next',
  'body.aula-media-viewer-open',
]) {
  if (!galleryStyles.includes(required)) throw new Error('Base visual de galería incompleta: falta ' + required)
}
for (const required of [
  'Course Immersive Desktop v8',
  '.immersive-media-preview',
  '.immersive-video-frame',
  '.immersive-presentation-frame',
  ':fullscreen .gallery-viewer-v7',
]) {
  if (!immersiveStyles.includes(required)) throw new Error('Visual inmersivo de escritorio incompleto: falta ' + required)
}
if (!galleryStyles.includes('transform:\n    translate3d(var(--gallery-x,0px),var(--gallery-y,0px),0)\n    scale(var(--gallery-scale,1))!important')) {
  throw new Error('La galería debe imponer translate + scale sobre las reglas móviles heredadas.')
}
if (!course.includes('practiceNode={practiceGateOpen') || !galleryStyles.includes('.gallery-question-stage')) {
  throw new Error('La pregunta rápida debe integrarse como paso dentro del mismo visor.')
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

for (const required of [
  'Aula EI · Mobile Fluidity v4',
  '@media(max-width:340px)',
  '@media(max-width:380px)',
  '@media(max-width:540px)',
  '@media(min-width:541px) and (max-width:900px)',
  '@media(max-width:900px) and (orientation:landscape)',
  'content-visibility:auto',
]) {
  if (!mobileApp.includes(required)) throw new Error('Cobertura de tamaños móviles incompleta: falta ' + required)
}
for (const required of [
  'requestAnimationFrame(runSync)',
  'aula-mobile-narrow',
  'aula-mobile-tablet',
  'aula-mobile-landscape',
  'aula-ios-runtime',
  'aula-ios-safari',
  'aula-mobile-standalone',
  'navigator.maxTouchPoints > 1',
  "window.addEventListener('focusin'",
  "window.setTimeout(sync, 420)",
]) {
  if (!runtime.includes(required)) throw new Error('Runtime adaptable incompleto: falta ' + required)
}

for (const required of [
  'Aula EI · Mobile Professional v6',
  '.mobile-assignment-card{',
  '.mobile-assignment-card.is-selected{',
  '.course-authoring-header{',
  '.authoring-step-nav{',
  '.course-create-modal .modal-actions',
  '@media(max-width:900px) and (prefers-reduced-motion:reduce)',
  'will-change:auto!important',
]) {
  if (!mobileApp.includes(required)) throw new Error('Mobile Professional v6 incompleta: falta ' + required)
}

for (const required of [
  'assignment-mobile-list mobile-data-view',
  'MobileAssignmentCard',
  'mobile-assignment-check',
  'aria-pressed={row.getIsSelected()}',
]) {
  if (!assignments.includes(required)) throw new Error('Asignaciones móvil nativo incompleto: falta ' + required)
}

for (const required of [
  'Aula EI · iOS Experience v5',
  'body.aula-ios-runtime',
  'font-size:16px!important',
  '-webkit-touch-callout:none',
  'height:var(--mobile-vh,100dvh)!important',
  'aula-mobile-standalone',
  'aula-mobile-keyboard-open',
]) {
  if (!mobileApp.includes(required)) throw new Error('Capa iOS incompleta: falta ' + required)
}

if (!index.includes('apple-mobile-web-app-status-bar-style') || !index.includes('black-translucent')) {
  throw new Error('La PWA iOS debe usar status bar edge-to-edge.')
}

console.log('Responsive Professional v9 validada: base desktop siempre cargada, modo compacto 901-1100, móvil explícito y CoursePlayer inmersivo.')
