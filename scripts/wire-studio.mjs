import { readFile, readdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const dist = path.join(root, 'dist')
const assetsDir = path.join(dist, 'assets')
const studioDir = path.join(dist, 'studio')
const studioAssetsDir = path.join(studioDir, 'assets')
const certificateDir = path.join(dist, 'certificate')
const certificateAssetsDir = path.join(certificateDir, 'assets')

const legacyJsFiles = (await readdir(assetsDir)).filter((name) => /^index-.*\.js$/.test(name))
if (legacyJsFiles.length !== 1) throw new Error(`WIRE1: expected one hardened legacy bundle, found ${legacyJsFiles.length}`)

const studioFiles = await readdir(studioAssetsDir)
const studioJsFiles = studioFiles.filter((name) => /^index-.*\.js$/.test(name))
const studioCssFiles = studioFiles.filter((name) => /^index-.*\.css$/.test(name))
if (studioJsFiles.length !== 1) throw new Error(`WIRE2: expected one Studio bundle, found ${studioJsFiles.length}`)
if (studioCssFiles.length !== 1) throw new Error(`WIRE3: expected one Studio stylesheet, found ${studioCssFiles.length}`)

const certificateFiles = await readdir(certificateAssetsDir)
const certificateJsFiles = certificateFiles.filter((name) => /^index-.*\.js$/.test(name))
const certificateCssFiles = certificateFiles.filter((name) => /^index-.*\.css$/.test(name))
if (certificateJsFiles.length !== 1) throw new Error(`WIRE4: expected one certificate bundle, found ${certificateJsFiles.length}`)
if (certificateCssFiles.length !== 1) throw new Error(`WIRE5: expected one certificate stylesheet, found ${certificateCssFiles.length}`)

const legacyBundle = `./assets/${legacyJsFiles[0]}`
const studioBundle = `/studio/assets/${studioJsFiles[0]}`
const studioStyles = `/studio/assets/${studioCssFiles[0]}`
const certificateBundle = `/certificate/assets/${certificateJsFiles[0]}`
const certificateStyles = `/certificate/assets/${certificateCssFiles[0]}`

const bootstrap = `const studioRoute=/^#\\/studio(?:\\/|$)/;
const certificateRoute=/^#\\/certificate\\/[^/?#]+/;
const currentMode=()=>certificateRoute.test(window.location.hash)?'certificate':studioRoute.test(window.location.hash)?'studio':'legacy';
const bootMode=currentMode();
const enforceBundleBoundary=()=>{if(currentMode()!==bootMode)window.location.reload()};
const addStyles=(href)=>{const css=document.createElement('link');css.rel='stylesheet';css.href=href;document.head.appendChild(css)};

for(const method of ['pushState','replaceState']){
  const original=history[method];
  history[method]=function(...args){
    const result=original.apply(this,args);
    queueMicrotask(enforceBundleBoundary);
    return result;
  };
}
window.addEventListener('hashchange',enforceBundleBoundary);
window.addEventListener('popstate',enforceBundleBoundary);

if(bootMode==='certificate'){
  addStyles('${certificateStyles}');
  import('${certificateBundle}');
}else if(bootMode==='studio'){
  addStyles('${studioStyles}');
  import('${studioBundle}');
}else{
  import('${legacyBundle}');
}
`

await writeFile(path.join(dist, 'bootstrap.js'), bootstrap, 'utf8')

// Studio y certificado son módulos internos de Aula EI. Se publican únicamente
// sus assets compilados; la única entrada visible sigue siendo index.html + hash routes.
await unlink(path.join(studioDir, 'index.html'))
await unlink(path.join(certificateDir, 'index.html'))

for (const file of ['index.html', '404.html']) {
  const p = path.join(dist, file)
  let html = await readFile(p, 'utf8')
  html = html.replace(/<script type="module" crossorigin src="\.\/assets\/index-[^"]+\.js"><\/script>/, '<script type="module" src="/bootstrap.js"></script>')
  if (!html.includes('/bootstrap.js')) throw new Error(`WIRE6: failed to wire ${file}`)
  await writeFile(p, html, 'utf8')
}
