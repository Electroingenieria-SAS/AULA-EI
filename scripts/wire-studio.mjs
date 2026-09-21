import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const dist = path.join(root, 'dist')
const assetsDir = path.join(dist, 'assets')
const jsFiles = (await readdir(assetsDir)).filter((name) => /^index-.*\.js$/.test(name))
if (jsFiles.length !== 1) throw new Error(`WIRE1: expected one hardened legacy bundle, found ${jsFiles.length}`)
const legacyBundle = `./assets/${jsFiles[0]}`

const bootstrap = `const studioRoute = /^#\\/studio(?:\\/|$)/;\nfunction goStudio(){if(studioRoute.test(window.location.hash)){window.location.replace('/studio/');return true}return false}\nif(!goStudio()){window.addEventListener('hashchange',goStudio);import('${legacyBundle}')}\n`
await writeFile(path.join(dist, 'bootstrap.js'), bootstrap, 'utf8')

for (const file of ['index.html', '404.html']) {
  const p = path.join(dist, file)
  let html = await readFile(p, 'utf8')
  html = html.replace(/<script type="module" crossorigin src="\.\/assets\/index-[^"]+\.js"><\/script>/, '<script type="module" src="/bootstrap.js"></script>')
  if (!html.includes('/bootstrap.js')) throw new Error(`WIRE2: failed to wire ${file}`)
  await writeFile(p, html, 'utf8')
}
