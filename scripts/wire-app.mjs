import { readFile, readdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const dist = path.join(root, 'dist')
const assetsDir = path.join(dist, 'assets')
const certificateDir = path.join(dist, 'certificate')
const certificateAssetsDir = path.join(certificateDir, 'assets')
const playerDir = path.join(dist, 'player')
const playerAssetsDir = path.join(playerDir, 'assets')

const legacyJsFiles = (await readdir(assetsDir)).filter((name) => /^index-.*\.js$/.test(name))
if (legacyJsFiles.length !== 1) throw new Error(`WIRE1: expected one legacy bundle, found ${legacyJsFiles.length}`)

const certificateFiles = await readdir(certificateAssetsDir)
const certificateJsFiles = certificateFiles.filter((name) => /^index-.*\.js$/.test(name))
const certificateCssFiles = certificateFiles.filter((name) => /^index-.*\.css$/.test(name))
if (certificateJsFiles.length !== 1) throw new Error(`WIRE2: expected one certificate bundle, found ${certificateJsFiles.length}`)
if (certificateCssFiles.length !== 1) throw new Error(`WIRE3: expected one certificate stylesheet, found ${certificateCssFiles.length}`)

const playerFiles = await readdir(playerAssetsDir)
const playerJsFiles = playerFiles.filter((name) => /^index-.*\.js$/.test(name))
const playerCssFiles = playerFiles.filter((name) => /^index-.*\.css$/.test(name))
if (playerJsFiles.length !== 1) throw new Error(`WIRE4: expected one Aula EI app bundle, found ${playerJsFiles.length}`)
if (playerCssFiles.length !== 1) throw new Error(`WIRE5: expected one Aula EI app stylesheet, found ${playerCssFiles.length}`)

const legacyBundle = `./assets/${legacyJsFiles[0]}`
const certificateBundle = `/certificate/assets/${certificateJsFiles[0]}`
const certificateStyles = `/certificate/assets/${certificateCssFiles[0]}`
const appBundle = `/player/assets/${playerJsFiles[0]}`
const appStyles = `/player/assets/${playerCssFiles[0]}`

const bootstrap = `const certificateRoute=/^#\\/certificate\\/[^/?#]+/;
const appRoute=/^#\\/(?:$|catalog(?:\\/|$)|course\\/[^/?#]+|games(?:\\/|$)|studio(?:\\/|$))/;
const currentMode=()=>certificateRoute.test(window.location.hash)?'certificate':appRoute.test(window.location.hash)?'app':'legacy';
const bootMode=currentMode();
const enforceBoundary=()=>{if(currentMode()!==bootMode)window.location.reload()};
const addStyles=(href)=>{const css=document.createElement('link');css.rel='stylesheet';css.href=href;document.head.appendChild(css)};

for(const method of ['pushState','replaceState']){
  const original=history[method];
  history[method]=function(...args){
    const result=original.apply(this,args);
    queueMicrotask(enforceBoundary);
    return result;
  };
}

window.addEventListener('hashchange',enforceBoundary);
window.addEventListener('popstate',enforceBoundary);

if(bootMode==='certificate'){
  addStyles('${certificateStyles}');
  import('${certificateBundle}');
}else if(bootMode==='app'){
  addStyles('${appStyles}');
  import('${appBundle}');
}else{
  import('${legacyBundle}');
}
`

await writeFile(path.join(dist, 'bootstrap.js'), bootstrap, 'utf8')

await unlink(path.join(certificateDir, 'index.html'))
await unlink(path.join(playerDir, 'index.html'))

for (const file of ['index.html', '404.html']) {
  const p = path.join(dist, file)
  let html = await readFile(p, 'utf8')
  html = html.replace(/<script type="module" crossorigin src="\.\/assets\/index-[^"]+\.js"><\/script>/, '<script type="module" src="/bootstrap.js"></script>')
  if (!html.includes('/bootstrap.js')) throw new Error(`WIRE6: failed to wire ${file}`)
  await writeFile(p, html, 'utf8')
}
