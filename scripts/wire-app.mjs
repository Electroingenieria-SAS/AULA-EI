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
const appRoute=/^#\\/(?:$|catalog(?:\\/|$)|journey(?:\\/|$)|course\\/[^/?#]+|games(?:\\/|$)|studio(?:\\/|$))/;
const currentMode=()=>certificateRoute.test(window.location.hash)?'certificate':appRoute.test(window.location.hash)?'app':'legacy';
const bootMode=currentMode();
const enforceBoundary=()=>{if(currentMode()!==bootMode)window.location.reload()};
const addStyles=(href)=>{const css=document.createElement('link');css.rel='stylesheet';css.href=href;document.head.appendChild(css)};

const installGlobalMotion=()=>{
  if(window.__AULA_GLOBAL_MOTION__)return;
  window.__AULA_GLOBAL_MOTION__=true;

  const style=document.createElement('style');
  style.textContent=[
    '#aula-pointer-dot,#aula-pointer-ring{position:fixed;left:0;top:0;pointer-events:none;z-index:2147483000;opacity:0;will-change:transform,width,height,opacity;border-color;background}',
    '#aula-pointer-dot{width:5px;height:5px;border-radius:50%;background:#003b8e;box-shadow:0 0 0 1px rgba(255,255,255,.75),0 2px 8px rgba(0,59,142,.25);transition:opacity .18s ease,background .18s ease,box-shadow .18s ease}',
    '#aula-pointer-ring{width:28px;height:28px;border-radius:50%;border:1.5px solid rgba(0,59,142,.38);background:rgba(255,255,255,.06);backdrop-filter:blur(1px);transition:opacity .18s ease,width .20s cubic-bezier(.2,.72,.22,1),height .20s cubic-bezier(.2,.72,.22,1),border-color .20s ease,background .20s ease,box-shadow .20s ease}',
    'body.aula-pointer-visible #aula-pointer-dot,body.aula-pointer-visible #aula-pointer-ring{opacity:1}',
    'body.aula-interactive-hover #aula-pointer-ring{width:42px;height:42px;border-color:rgba(255,210,0,.72);background:rgba(255,210,0,.08);box-shadow:0 0 0 6px rgba(0,59,142,.045)}',
    'body.aula-interactive-hover #aula-pointer-dot{background:#ffd200;box-shadow:0 0 0 1px rgba(0,59,142,.55),0 3px 10px rgba(255,210,0,.25)}',
    'body.aula-pointer-down #aula-pointer-ring{width:22px;height:22px;background:rgba(0,59,142,.11);border-color:rgba(0,59,142,.62)}',
    '.aula-click-burst{position:fixed;left:0;top:0;width:18px;height:18px;pointer-events:none;z-index:2147482999;border:2px solid rgba(0,59,142,.62);border-radius:50%;transform:translate(-50%,-50%) scale(.18);animation:aulaClickBurst .54s cubic-bezier(.16,1,.3,1) both}',
    '.aula-click-burst:before,.aula-click-burst:after{content:"";position:absolute;left:50%;top:50%;width:5px;height:5px;border-radius:50%;background:#ffd200;box-shadow:12px 0 0 #1d6dd2,-12px 0 0 #ffd200,0 12px 0 #1d6dd2,0 -12px 0 #ffd200;transform:translate(-50%,-50%) scale(.2);animation:aulaClickDots .54s cubic-bezier(.16,1,.3,1) both}',
    '.aula-click-burst:after{transform:translate(-50%,-50%) rotate(45deg) scale(.2);opacity:.72}',
    '@keyframes aulaClickBurst{0%{opacity:0;transform:translate(-50%,-50%) scale(.18)}18%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) scale(2.25)}}',
    '@keyframes aulaClickDots{0%{opacity:0;transform:translate(-50%,-50%) scale(.2)}24%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) scale(1.2)}}',
    '@media(prefers-reduced-motion:reduce){#aula-pointer-dot,#aula-pointer-ring,.aula-click-burst{display:none!important}}',
    '@media(hover:none),(pointer:coarse){#aula-pointer-dot,#aula-pointer-ring{display:none!important}}'
  ].join('');
  document.head.appendChild(style);

  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine=window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const interactiveSelector='button,a,[role="button"],input,select,textarea,label,.home-course-card,.catalog-course-card,.games-grid article,.course-library-card,.pending-certificate-card,.user-identity-button,.certificate-person-button,.image-learning-canvas';

  const start=()=>{
    if(!document.body||reduce)return;

    if(fine){
      const dot=document.createElement('i');
      const ring=document.createElement('i');
      dot.id='aula-pointer-dot';
      ring.id='aula-pointer-ring';
      dot.setAttribute('aria-hidden','true');
      ring.setAttribute('aria-hidden','true');
      document.body.append(dot,ring);

      let tx=-80,ty=-80,rx=-80,ry=-80,dotX=-80,dotY=-80,raf=0;
      const draw=()=>{
        rx+=(tx-rx)*.18;ry+=(ty-ry)*.18;
        dotX+=(tx-dotX)*.46;dotY+=(ty-dotY)*.46;
        ring.style.transform='translate3d('+rx+'px,'+ry+'px,0) translate(-50%,-50%)';
        dot.style.transform='translate3d('+dotX+'px,'+dotY+'px,0) translate(-50%,-50%)';
        const remaining=Math.abs(tx-rx)+Math.abs(ty-ry)+Math.abs(tx-dotX)+Math.abs(ty-dotY);
        if(remaining>.35)raf=requestAnimationFrame(draw);
        else raf=0;
      };
      const scheduleDraw=()=>{if(!raf)raf=requestAnimationFrame(draw)};

      window.addEventListener('pointermove',(event)=>{
        if(event.pointerType==='touch')return;
        tx=event.clientX;ty=event.clientY;
        document.body.classList.add('aula-pointer-visible');
        scheduleDraw();
      },{passive:true});

      window.addEventListener('pointerout',(event)=>{
        if(!event.relatedTarget)document.body.classList.remove('aula-pointer-visible');
      },{passive:true});
      document.addEventListener('visibilitychange',()=>{
        if(document.hidden)document.body.classList.remove('aula-pointer-visible','aula-interactive-hover','aula-pointer-down');
      },{passive:true});

      document.addEventListener('pointerover',(event)=>{
        document.body.classList.toggle('aula-interactive-hover',!!event.target.closest?.(interactiveSelector));
      },{passive:true});
    }

    document.addEventListener('pointerdown',(event)=>{
      const interactive=event.target.closest?.(interactiveSelector);
      if(!interactive)return;
      document.body.classList.add('aula-pointer-down');
      const burst=document.createElement('i');
      burst.className='aula-click-burst';
      burst.setAttribute('aria-hidden','true');
      burst.style.left=event.clientX+'px';
      burst.style.top=event.clientY+'px';
      document.body.appendChild(burst);
      setTimeout(()=>burst.remove(),620);
    },{passive:true});

    window.addEventListener('pointerup',()=>document.body.classList.remove('aula-pointer-down'),{passive:true});
    window.addEventListener('pointercancel',()=>document.body.classList.remove('aula-pointer-down'),{passive:true});
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
};

const installRevealMotion=()=>{
  if(bootMode!=='app'||window.__AULA_REVEAL_MOTION__)return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  window.__AULA_REVEAL_MOTION__=true;

  const selectors=[
    '.home-section-heading',
    '.catalog-workspace-header',
    '.games-section-heading',
    '.courses-overview',
    '.courses-library',
    '.assignment-intro',
    '.assignment-stats',
    '.panel-card',
    '.users-overview',
    '.users-directory',
    '.certificates-overview',
    '.certificates-workspace',
    '.authoring-section',
    '.publish-actions-card'
  ].join(',');

  const start=()=>{
    if(!document.body)return;

    const observer=new IntersectionObserver((entries)=>{
      for(const entry of entries){
        if(!entry.isIntersecting)continue;
        entry.target.classList.add('premium-reveal-in');
        observer.unobserve(entry.target);
      }
    },{threshold:.08,rootMargin:'0px 0px -6% 0px'});

    let order=0;
    const scan=(root=document)=>{
      const nodes=[];
      if(root.matches?.(selectors))nodes.push(root);
      if(root.querySelectorAll)nodes.push(...root.querySelectorAll(selectors));
      for(const node of nodes){
        if(node.dataset.premiumReveal==='1')continue;
        node.dataset.premiumReveal='1';
        node.dataset.revealOrder=String((order%4)+1);
        order+=1;
        node.classList.add('premium-reveal');
        observer.observe(node);
      }
    };

    scan();
    const mutations=new MutationObserver((records)=>{
      for(const record of records){
        for(const node of record.addedNodes){
          if(node.nodeType===1)scan(node);
        }
      }
    });
    mutations.observe(document.body,{childList:true,subtree:true});
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
};

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
installGlobalMotion();
installRevealMotion();

if('serviceWorker' in navigator && location.protocol==='https:'){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{}),{once:true});
}

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

const manifest = {
  name: 'Aula EI · Academia Interna',
  short_name: 'Aula EI',
  description: 'Plataforma corporativa de formación, cumplimiento y certificación de Electroingeniería.',
  start_url: './#/',
  scope: './',
  display: 'standalone',
  background_color: '#f4f7fb',
  theme_color: '#003b8e',
  orientation: 'any',
  categories: ['education','business','productivity'],
  icons: [
    { src: './brand/logo-aula-ei.png', sizes: 'any', type: 'image/png', purpose: 'any' }
  ],
  shortcuts: [
    { name: 'Mi Ruta 360', short_name: 'Mi ruta', url: './#/journey' },
    { name: 'Mis capacitaciones', short_name: 'Cursos', url: './#/catalog' },
    { name: 'Juegos EI', short_name: 'Juegos', url: './#/games' }
  ]
}

const serviceWorker = `const CACHE='aula-ei-shell-v1';
const scopeUrl=new URL(self.registration.scope);
const shell=[
  new URL('./',scopeUrl).href,
  new URL('./bootstrap.js',scopeUrl).href,
  new URL('./manifest.webmanifest',scopeUrl).href,
  new URL('./brand/logo-aula-ei.png',scopeUrl).href,
  new URL('./brand/fondo.jpg',scopeUrl).href
];

self.addEventListener('install',(event)=>{
  event.waitUntil(caches.open(CACHE).then((cache)=>cache.addAll(shell)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',(event)=>{
  event.waitUntil(
    caches.keys()
      .then((keys)=>Promise.all(keys.filter((key)=>key!==CACHE).map((key)=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',(event)=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(request.mode==='navigate'){
    event.respondWith(
      fetch(request)
        .then((response)=>{
          const copy=response.clone();
          caches.open(CACHE).then((cache)=>cache.put(new URL('./',scopeUrl).href,copy)).catch(()=>{});
          return response;
        })
        .catch(()=>caches.match(new URL('./',scopeUrl).href))
    );
    return;
  }

  const destination=request.destination;
  if(['script','style','image','font','manifest'].includes(destination)||url.pathname.includes('/brand/')||url.pathname.includes('/player/')||url.pathname.includes('/certificate/')){
    event.respondWith(
      caches.match(request).then((cached)=>{
        const network=fetch(request).then((response)=>{
          if(response&&response.ok){
            caches.open(CACHE).then((cache)=>cache.put(request,response.clone())).catch(()=>{});
          }
          return response;
        }).catch(()=>cached);
        return cached||network;
      })
    );
  }
});
`

await writeFile(path.join(dist, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2), 'utf8')
await writeFile(path.join(dist, 'sw.js'), serviceWorker, 'utf8')


await unlink(path.join(certificateDir, 'index.html'))
await unlink(path.join(playerDir, 'index.html'))

for (const file of ['index.html', '404.html']) {
  const p = path.join(dist, file)
  let html = await readFile(p, 'utf8')
  html = html.replace(/<script type="module" crossorigin src="\.\/assets\/index-[^"]+\.js"><\/script>/, '<script type="module" src="/bootstrap.js"></script>')
  if (!html.includes('manifest.webmanifest')) {
    html = html.replace('</head>', '<link rel="manifest" href="./manifest.webmanifest"><meta name="theme-color" content="#003b8e"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="default"></head>')
  }
  if (!html.includes('/bootstrap.js')) throw new Error(`WIRE6: failed to wire ${file}`)
  await writeFile(p, html, 'utf8')
}
