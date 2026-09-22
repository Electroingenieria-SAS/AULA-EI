import { gzipSync } from 'node:zlib'
import { readFile, stat, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const dist = path.join(root, 'dist')
const manifestPath = path.join(dist, '.vite', 'manifest.json')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))

const limits = {
  initialJsGzip: 220 * 1024,
  initialCssGzip: 40 * 1024,
  singleJsChunkGzip: 300 * 1024,
}

async function gzipSize(relativePath) {
  const file = path.join(dist, relativePath)
  const content = await readFile(file)
  return gzipSync(content, { level: 9 }).length
}

function collectInitialGraph(key, seen = new Set()) {
  if (!key || seen.has(key)) return seen
  seen.add(key)
  const entry = manifest[key]
  for (const imported of entry?.imports || []) collectInitialGraph(imported, seen)
  return seen
}

const entryKey = Object.keys(manifest).find((key) => manifest[key]?.isEntry && key.endsWith('src/main.jsx'))
  || Object.keys(manifest).find((key) => manifest[key]?.isEntry)

if (!entryKey) throw new Error('No se encontró el entry principal en el manifiesto de Vite.')

const initialKeys = [...collectInitialGraph(entryKey)]
let initialJsGzip = 0
let initialCssGzip = 0
const initialFiles = []

for (const key of initialKeys) {
  const item = manifest[key]
  if (!item) continue
  if (item.file?.endsWith('.js')) {
    const size = await gzipSize(item.file)
    initialJsGzip += size
    initialFiles.push({ file: item.file, type: 'js', gzip: size })
  }
  for (const css of item.css || []) {
    const size = await gzipSize(css)
    initialCssGzip += size
    initialFiles.push({ file: css, type: 'css', gzip: size })
  }
}

const assetDir = path.join(dist, 'assets')
const assetNames = await readdir(assetDir)
const jsChunks = []
for (const name of assetNames.filter((name) => name.endsWith('.js'))) {
  const size = await gzipSize('assets/' + name)
  jsChunks.push({ file: 'assets/' + name, gzip: size })
}

const largestJs = [...jsChunks].sort((a,b) => b.gzip - a.gzip)[0] || { file: '', gzip: 0 }
const report = {
  limits,
  initial: { jsGzip: initialJsGzip, cssGzip: initialCssGzip, files: initialFiles },
  largestJs,
  chunks: jsChunks.sort((a,b) => b.gzip - a.gzip),
}

await writeFile(path.join(dist, 'bundle-report.json'), JSON.stringify(report, null, 2))

const kb = (value) => (value / 1024).toFixed(1) + ' KB'
console.log('Bundle budget v4')
console.log('Initial JS gzip:', kb(initialJsGzip), '/', kb(limits.initialJsGzip))
console.log('Initial CSS gzip:', kb(initialCssGzip), '/', kb(limits.initialCssGzip))
console.log('Largest JS chunk:', largestJs.file, kb(largestJs.gzip), '/', kb(limits.singleJsChunkGzip))

if (initialJsGzip > limits.initialJsGzip) {
  throw new Error('El JavaScript inicial excede el presupuesto: ' + kb(initialJsGzip))
}
if (initialCssGzip > limits.initialCssGzip) {
  throw new Error('El CSS inicial excede el presupuesto: ' + kb(initialCssGzip))
}
if (largestJs.gzip > limits.singleJsChunkGzip) {
  throw new Error('Un chunk JavaScript excede el presupuesto: ' + largestJs.file + ' (' + kb(largestJs.gzip) + ')')
}
