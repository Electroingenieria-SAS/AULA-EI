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

const player = await readFile(path.join(root,'player/src/CoursePlayer.jsx'),'utf8')
if (!player.includes('sanitizeHtml(text)')) {
  throw new Error('CoursePlayer debe sanitizar el HTML administrado antes de renderizarlo.')
}
if (player.includes(".from('question_options')")) {
  throw new Error('CoursePlayer no puede consultar question_options directamente desde el navegador.')
}

console.log('Arquitectura Aula EI validada: build fuente único, sesión única y cliente Supabase único.')
