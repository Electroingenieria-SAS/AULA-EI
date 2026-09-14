import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JavaScriptObfuscator from 'javascript-obfuscator';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const dist = path.join(root, 'dist');

function replaceExactly(source, before, after, code) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${code}: expected exactly one match, got ${count}`);
  return source.replace(before, after);
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const name of ['index.html', '404.html', 'favicon.svg', 'assets', 'brand']) {
  await cp(path.join(root, name), path.join(dist, name), { recursive: true });
}

const assetsDir = path.join(dist, 'assets');
const jsFiles = (await readdir(assetsDir)).filter((name) => /^index-.*\.js$/.test(name));
if (jsFiles.length !== 1) throw new Error(`E1: expected one application bundle, found ${jsFiles.length}`);

const originalName = jsFiles[0];
const originalPath = path.join(assetsDir, originalName);
let bundle = await readFile(originalPath, 'utf8');

const oldProfileLoader = 'g=async(v,S)=>{const x=S??a?.user??null,w=v??x?.id;if(!w){o(null);return}const{data:C,error:A}=await Dr(re.from("profiles").select("*").eq("id",w).maybeSingle(),Cc,"Supabase tardó demasiado cargando el perfil del usuario.");if(A)throw A;if(C){const M=C;o({...M,role:ry(M.role)});return}if(x){const M=Rc(x);o(M),m("Tu sesión inició, pero el perfil no estaba sincronizado. Se cargó un perfil temporal de colaborador.");return}o(null)}';
const newProfileLoader = 'g=async(v,S)=>{const x=S??a?.user??null,w=v??x?.id;if(!w){o(null);return}const{data:C,error:A}=await Dr(re.functions.invoke("get-my-profile",{body:{}}),Cc,"Supabase tardó demasiado cargando el perfil del usuario.");if(A)throw A;if(C?.ok&&C.profile){const M=C.profile;o({...M,role:ry(M.role)});return}if(C?.inactive){await re.auth.signOut().catch(()=>{}),o(null),m(C.error||"La cuenta no está activa en Aula EI.");return}if(x){const M=Rc(x);o(M),m(C?.error||"Tu sesión inició, pero el perfil no pudo validarse. Se cargó un perfil temporal.");return}o(null)}';
bundle = replaceExactly(bundle, oldProfileLoader, newProfileLoader, 'E2');

const oldAuthListener = 're.auth.onAuthStateChange(async(w,C)=>{r(C),m(null),C?.user?await g(C.user.id,C.user).catch(A=>{console.warn("Aula EI: error al actualizar perfil.",A),o(Rc(C.user)),m(jl(A,"No fue posible actualizar el perfil. Se usó perfil temporal."))}):o(null),f(!1)})';
const newAuthListener = 're.auth.onAuthStateChange((w,C)=>{r(C),m(null),C?.user?setTimeout(()=>{v&&g(C.user.id,C.user).catch(A=>{console.warn("Aula EI: error al actualizar perfil.",A),o(Rc(C.user)),m(jl(A,"No fue posible actualizar el perfil. Se usó perfil temporal."))})},0):o(null),f(!1)})';
bundle = replaceExactly(bundle, oldAuthListener, newAuthListener, 'E3');

const oldFallbackRole = 'role:ry(n.user_metadata?.managed_role)';
const newFallbackRole = 'role:ry(n.app_metadata?.aula_ei_role)';
bundle = replaceExactly(bundle, oldFallbackRole, newFallbackRole, 'E4');

if (bundle.includes('re.from("profiles").select("*").eq("id",w).maybeSingle()')) {
  throw new Error('E5: direct current-profile REST lookup still present');
}
if (bundle.includes('onAuthStateChange(async(w,C)=>') || !bundle.includes('onAuthStateChange((w,C)=>')) {
  throw new Error('E6: auth listener patch failed');
}
if (bundle.includes(oldFallbackRole)) throw new Error('E7: fallback role patch failed');

bundle = JavaScriptObfuscator.obfuscate(bundle, {
  compact: true,
  target: 'browser',
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  renameProperties: false,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.82,
  stringArrayCallsTransform: true,
  stringArrayCallsTransformThreshold: 0.7,
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 4,
  stringArrayWrappersType: 'function',
  splitStrings: true,
  splitStringsChunkLength: 8,
  numbersToExpressions: true,
  simplify: true,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  selfDefending: false,
  debugProtection: false,
  disableConsoleOutput: false,
  unicodeEscapeSequence: false,
  sourceMap: false,
  seed: 731902,
}).getObfuscatedCode();

if (!bundle || bundle.length < 100000) throw new Error('E8: generated bundle is unexpectedly small');

const nextName = `index-${createHash('sha256').update(bundle).digest('hex').slice(0, 12)}.js`;
const nextPath = path.join(assetsDir, nextName);
await writeFile(nextPath, bundle, 'utf8');
if (nextName !== originalName) await rm(originalPath, { force: true });

for (const name of ['index.html', '404.html']) {
  const htmlPath = path.join(dist, name);
  let html = await readFile(htmlPath, 'utf8');
  if (!html.includes(originalName)) throw new Error(`E9: ${name} does not reference ${originalName}`);
  html = html.split(originalName).join(nextName);
  await writeFile(htmlPath, html, 'utf8');
}
