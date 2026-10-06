import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const sourceRoots = ['src','player/src','studio/src','certificate/src']
const forbiddenFiles = [
  'b.mjs',
  'scripts/wire-app.mjs',
  'scripts/prepare-github-pages.mjs',
  'player/vite.config.js',
  'player/src/main.jsx',
  'certificate/vite.config.js',
  'certificate/src/main.jsx',
  'studio/src/styles.css',
  'player/src/styles.css',
]

async function exists(relativePath) {
  try {
    await stat(path.join(root, relativePath))
    return true
  } catch {
    return false
  }
}

async function walk(dir) {
  const absolute = path.join(root, dir)
  const result = []
  for (const entry of await readdir(absolute, { withFileTypes: true })) {
    const relative = path.join(dir, entry.name).replaceAll('\\','/')
    if (entry.isDirectory()) result.push(...await walk(relative))
    else if (/\.(js|jsx)$/.test(entry.name)) result.push(relative)
  }
  return result
}

for (const file of forbiddenFiles) {
  if (await exists(file)) throw new Error('Arquitectura inválida: archivo heredado presente: ' + file)
}

const packageJson = JSON.parse(await readFile(path.join(root,'package.json'),'utf8'))
if (packageJson.dependencies?.['javascript-obfuscator']) {
  throw new Error('Arquitectura inválida: javascript-obfuscator ya no debe formar parte del build.')
}

const files = []
for (const sourceRoot of sourceRoots) files.push(...await walk(sourceRoot))


const fileBudgets = {
  'src/App.jsx': 9000,
  'src/auth/AuthScreens.jsx': 18000,
  'studio/src/App.jsx': 9000,
  'studio/src/CoursesManager.jsx': 16000,
  'studio/src/course-editor/CourseBuilder.jsx': 22000,
  'studio/src/course-editor/CourseBuilderPanels.jsx': 26000,
  'studio/src/course-editor/ExamBuilder.jsx': 15000,
  'player/src/CoursePlayer.jsx': 30000,
  'player/src/course-player/CourseContentViews.jsx': 17000,
  'player/src/course-player/CoursePlayerViews.jsx': 18000,
  'studio/src/ComplianceCenter.jsx': 22000,
  'studio/src/compliance/CompliancePanels.jsx': 26000,
  'studio/src/UsersManager.jsx': 30000,
  'studio/src/users/UserPanels.jsx': 18000,
  'studio/src/styles/core.css': 30000,
  'studio/src/styles/users.css': 12000,
  'studio/src/styles/certificates.css': 14000,
  'studio/src/styles/courses.css': 36000,
  'studio/src/styles/compliance.css': 28000,
  'player/src/styles/core.css': 40000,
  'player/src/styles/course.css': 27000,
  'player/src/styles/catalog.css': 35000,
  'player/src/styles/shell.css': 26000,
  'player/src/styles/modules.css': 17000,
  'player/src/styles/notifications.css': 8000,
}

for (const [file, maxBytes] of Object.entries(fileBudgets)) {
  const info = await stat(path.join(root, file))
  if (info.size > maxBytes) {
    throw new Error(`Arquitectura inválida: ${file} supera el presupuesto de ${maxBytes} bytes (${info.size}). Debe separarse por responsabilidad.`)
  }
}

for (const requiredFile of [
  'src/auth/AuthScreens.jsx',
  'src/async-utils.js',
  'studio/src/studio-modules.js',
  'studio/src/useStudioData.js',
  'studio/src/StudioLoading.jsx',
  'studio/src/course-editor/CourseBuilder.jsx',
  'studio/src/course-editor/CourseBuilderPanels.jsx',
  'studio/src/course-editor/ExamBuilder.jsx',
  'studio/src/course-editor/course-utils.js',
  'studio/src/users/UserPanels.jsx',
  'studio/src/users/user-utils.js',
  'studio/src/compliance/CompliancePanels.jsx',
  'player/src/course-player/CourseContentViews.jsx',
  'player/src/course-player/CoursePlayerViews.jsx',
  'studio/src/styles/core.css',
  'studio/src/styles/users.css',
  'studio/src/styles/certificates.css',
  'studio/src/styles/courses.css',
  'studio/src/styles/compliance.css',
  'player/src/styles/core.css',
  'player/src/styles/course.css',
  'player/src/styles/catalog.css',
  'player/src/styles/shell.css',
  'player/src/styles/modules.css',
  'player/src/styles/notifications.css',
]) {
  if (!await exists(requiredFile)) {
    throw new Error('Arquitectura modular incompleta: falta ' + requiredFile)
  }
}

let createClientLocations = []
let getSessionLocations = []
let authListenerLocations = []

for (const file of files) {
  const content = await readFile(path.join(root,file),'utf8')
  if (content.includes('createClient(')) createClientLocations.push(file)
  if (content.includes('getSession(')) getSessionLocations.push(file)
  if (content.includes('onAuthStateChange(')) authListenerLocations.push(file)
}

if (createClientLocations.length !== 1 || createClientLocations[0] !== 'src/supabase.js') {
  throw new Error('Debe existir un único cliente Supabase en src/supabase.js. Encontrado: ' + createClientLocations.join(', '))
}

if (getSessionLocations.some((file) => file !== 'src/App.jsx')) {
  throw new Error('La sesión debe leerse únicamente en src/App.jsx. Encontrado: ' + getSessionLocations.join(', '))
}

if (authListenerLocations.some((file) => file !== 'src/App.jsx')) {
  throw new Error('El listener Auth debe existir únicamente en src/App.jsx. Encontrado: ' + authListenerLocations.join(', '))
}

const complianceCenter = await readFile(path.join(root,'studio/src/ComplianceCenter.jsx'),'utf8')
if (complianceCenter.includes('sectionIcon(') && !complianceCenter.includes('function sectionIcon(')) {
  throw new Error('ComplianceCenter usa sectionIcon sin definir su renderer local.')
}

const player = await readFile(path.join(root,'player/src/CoursePlayer.jsx'),'utf8')
const playerViews = await readFile(path.join(root,'player/src/course-player/CoursePlayerViews.jsx'),'utf8')
if (!playerViews.includes('sanitizeHtml(text)')) {
  throw new Error('Las vistas de CoursePlayer deben sanitizar el HTML administrado antes de renderizarlo.')
}
if (player.includes(".from('question_options')")) {
  throw new Error('CoursePlayer no puede consultar question_options directamente desde el navegador.')
}

console.log('Arquitectura Aula EI v6 validada: shells acotados, responsabilidades separadas, sesión única y cliente Supabase único.')
