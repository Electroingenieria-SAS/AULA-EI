import fs from 'node:fs'
import path from 'node:path'

const dist = path.resolve('dist')
const repository = process.env.GITHUB_REPOSITORY || 'Electroingenieria-SAS/AULA-EI'
const repoName = repository.split('/').pop() || 'AULA-EI'
const base = '/' + repoName

const textExtensions = new Set(['.html', '.js', '.css', '.json', '.webmanifest'])
const staticPrefixes = [
  'bootstrap.js',
  'brand/',
  'player/',
  'certificate/',
  'assets/',
  'favicon',
  'manifest',
]

function patchText(source) {
  let output = source

  for (const quote of ['"', "'", '`']) {
    output = output.split(quote + '/#').join(quote + base + '/#')
    for (const prefix of staticPrefixes) {
      output = output.split(quote + '/' + prefix).join(quote + base + '/' + prefix)
    }
  }

  output = output.replace(
    /url\((['"]?)\/(brand\/|player\/|certificate\/|assets\/|favicon)/g,
    (_match, quote, prefix) => 'url(' + quote + base + '/' + prefix,
  )

  return output
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      walk(full)
      continue
    }

    if (!textExtensions.has(path.extname(entry.name).toLowerCase())) continue

    const source = fs.readFileSync(full, 'utf8')
    const patched = patchText(source)
    if (patched !== source) fs.writeFileSync(full, patched)
  }
}

if (!fs.existsSync(dist)) {
  throw new Error('No existe dist/. Ejecuta npm run build antes de preparar GitHub Pages.')
}

walk(dist)
fs.writeFileSync(path.join(dist, '.nojekyll'), '')

const indexPath = path.join(dist, 'index.html')
if (fs.existsSync(indexPath)) {
  fs.copyFileSync(indexPath, path.join(dist, '404.html'))
}

console.log('GitHub Pages preview preparado en ' + base + '/')
