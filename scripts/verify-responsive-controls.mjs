import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const read = (file) => readFile(path.join(root, file), 'utf8')

async function walk(dir) {
  const out = []
  for (const entry of await readdir(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name).replaceAll('\\', '/')
    if (entry.isDirectory()) out.push(...await walk(rel))
    else if (/\.jsx$/.test(entry.name)) out.push(rel)
  }
  return out
}

const main = await read('src/main.jsx')
const desktop = await read('src/responsive-controls.css')
const mobile = await read('src/mobile-app.css')
const gallery = await read('player/src/styles/gallery.css')
const certificate = await read('certificate/src/styles.css')

if (!main.includes("import './responsive-controls.css'")) {
  throw new Error('Responsive Controls v10 debe cargarse siempre desde src/main.jsx.')
}

for (const required of [
  'Aula EI · Responsive Controls System v10',
  '--control-hit-desktop:42px',
  '--control-hit-compact:44px',
  '--control-hit-icon:40px',
  '@media(min-width:1101px) and (max-width:1279px)',
  '@media(min-width:901px) and (max-width:1100px)',
  '.catalog-card-footer',
  '.selection-toolbar',
  '.pagination-bar',
  '.course-authoring-actions',
  '.modal-actions',
  '.certificate-detail-actions',
  '.result-actions',
  '.phase-actions',
  '.block-authoring-actions',
]) {
  if (!desktop.includes(required)) throw new Error('Sistema de controles desktop/compact incompleto: falta ' + required)
}

for (const required of [
  'Aula EI · Responsive Controls Mobile v10',
  '--control-hit-mobile-v10:48px',
  '--control-hit-compact-v10:46px',
  '--control-hit-icon-v10:48px',
  '@media(min-width:761px) and (max-width:900px)',
  '@media(min-width:541px) and (max-width:760px)',
  '@media(min-width:381px) and (max-width:540px)',
  '@media(min-width:341px) and (max-width:380px)',
  '@media(max-width:340px)',
  '.home-hero-actions',
  '.catalog-original-actions',
  '.catalog-card-footer',
  '.catalog-filter-row',
  '.studio-navigation-button',
  '.header-actions,.toolbar-buttons,.import-actions',
  '.users-directory-meta .toolbar-buttons',
  '.mobile-user-actions',
  '.mobile-certificate-actions',
  '.certificate-view-switch',
  '.selection-toolbar',
  '.pagination-bar',
  '.bulk-buttons',
  '.course-authoring-actions',
  '.phase-actions',
  '.block-authoring-actions',
  '.exam-toolbar',
  '.publish-action-buttons',
  '.learner-stage-nav',
  '.practice-gate-footer',
  '.practice-gate-error-actions',
  '.result-actions',
  '.exam-submit-bar button',
  '.modal-actions',
]) {
  if (!mobile.includes(required)) throw new Error('Sistema de controles mobile v10 incompleto: falta ' + required)
}

if (!gallery.includes('width:44px!important') || !gallery.includes('min-height:44px!important')) {
  throw new Error('La galería debe conservar hit targets de 44px en controles flotantes móviles.')
}

for (const required of [
  'Certificate responsive controls v10',
  '.export-button',
  'min-height:48px',
  '.toolbar-icon-button',
  'width:48px',
  '@media(max-width:340px)',
]) {
  if (!certificate.includes(required)) throw new Error('Controles responsive del certificado incompletos: falta ' + required)
}

const sourceRoots = ['src', 'player/src', 'studio/src', 'certificate/src']
const jsxFiles = []
for (const sourceRoot of sourceRoots) jsxFiles.push(...await walk(sourceRoot))

let buttonCount = 0
let filesWithButtons = 0
for (const file of jsxFiles) {
  const content = await read(file)
  const count = (content.match(/<button\b/g) || []).length
  buttonCount += count
  if (count) filesWithButtons += 1
}

if (buttonCount < 180) {
  throw new Error('La auditoría de controles encontró solo ' + buttonCount + ' botones; revisar el escaneo antes de certificar.')
}

console.log(
  'Responsive Controls v10 validado: ' +
  buttonCount + ' botones JSX en ' + filesWithButtons +
  ' archivos; breakpoints 320-340, 341-380, 381-540, 541-760, 761-900, 901-1100, 1101-1279 y >=1280.'
)
