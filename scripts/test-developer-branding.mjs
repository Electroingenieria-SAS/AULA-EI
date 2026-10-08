import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (value) => readFile(path.join(root, value), 'utf8')
const [app, auth, splash, card, shell, routes, privacy, splashCss, cardCss, privacyCss, vite, visualShell, signatureCss] = await Promise.all([
  read('src/App.jsx'), read('src/auth/AuthScreens.jsx'),
  read('src/branding/EntrySplash.jsx'), read('player/src/DeveloperCreditsPage.jsx'),
  read('player/src/LearnerShell.jsx'), read('player/src/LearnerApp.jsx'),
  read('player/src/PrivacyCenter.jsx'),read('src/branding/developer-branding.css'),
  read('player/src/styles/developer-credits.css'),read('player/src/styles/privacy-developer-entry.css'),read('vite.config.js'),read('src/AuthVisualShell.jsx'),read('src/branding/developer-signature.css')
])
for(const [file,min] of [
  ['brand/developer/juan-perez-primary-blue.webp',5000],
  ['brand/developer/juan-perez-secondary-blue.webp',5000],
]) {
  const info = await stat(path.join(root,file))
  assert.ok(info.size >= min && info.size < 30000, file + ' must be an actual optimized image')
  const bytes = await readFile(path.join(root,file))
  assert.equal(bytes.toString('ascii',0,4), 'RIFF', 'WebP RIFF header required')
  assert.equal(bytes.toString('ascii',8,12),'WEBP','Valid WebP image required')
}
assert.match(vite, /cp\('brand', 'dist\/brand'/, 'Production must include the new developer assets')
assert.doesNotMatch(auth, /aula-ei-brand-welcome-v1/, 'The old post-login flag was unreliable.')
assert.doesNotMatch(app, /sessionStorage.*welcome|showWelcome|PostLoginSplash/, 'No post-login splash must remain.')
assert.match(app, /const \[introComplete, setIntroComplete\] = useState\(false\)/, 'A new visitor must see an intro.')
assert.match(app, /if \(!session\?\.user\) return !introComplete && !route\.isCertificate/,
  'The intro must precede login, not appear after authentication.')
assert.match(app, /<EntrySplash onComplete=\{\(\) => setIntroComplete\(true\)\}/)
assert.match(app, /if \(recoveryMode\)/, 'Password recovery must not be interrupted.')
assert.match(app, /<LegalGate[\s\S]*<AdminMfaGate/, 'Legal/MFA gates must remain unchanged.')
assert.match(splash, /matchMedia/, 'Reduced motion must be honored.')
assert.match(splash, /setTimeout\(\(\) => finish\.current\(\), reducedMotion \? 250 : 1450\)/)
assert.match(splash, /juan-perez-primary-blue\.webp/)
assert.doesNotMatch(splash, /Acceso autorizado/, 'Prelogin cannot claim the user is authenticated.')
assert.match(splashCss, /prefers-reduced-motion:reduce/)
assert.match(card, /juan-perez-secondary-blue\.webp/)
assert.match(card, /aria-expanded=\{expanded\}/)
assert.match(card, /id="dev-credit-details" hidden=\{!expanded\}/)
assert.match(cardCss, /dev-credit-card-details\[hidden\]/)
assert.match(cardCss, /@media\(max-width:600px\)/)
assert.match(shell, /navigateLearner\('\/credits'\)/)
assert.match(shell, /dev-sidebar-signature/)
assert.match(shell, /dev-signature-mobile/)
assert.match(shell, /dev-signature-course/)
assert.match(shell, /juan-perez-secondary-blue\.webp/)
assert.match(visualShell, /dev-auth-signature/, 'Login must show the discreet author credit.')
assert.match(signatureCss, /dev-sidebar-signature/)
assert.match(signatureCss, /@media\(max-width:900px\)/)
assert.match(signatureCss, /@media\(max-width:380px\)/)
assert.match(signatureCss, /focus-visible/)
assert.match(routes, /loadDeveloperCredits/)
assert.match(routes, /route\.type === 'credits'/)
assert.match(routes, /DeveloperCreditsPage/)
assert.match(privacy, /Ver tarjeta interactiva de créditos/)
assert.match(privacyCss, /privacy-developer-entry/)
assert.doesNotMatch(app, /sessionStorage\.setItem\(/, 'Public intro never needs persistent state')
for (const source of [splash,card]) {
  assert.doesNotMatch(source, /\.rpc\(|\.from\(|\.insert\(|\.update\(/, 'Branding cannot modify application data')
}
console.log('Branding integration: pre-login intro, permanent author marks, verified WebP, preserved legal/MFA and responsive accessibility passed.')
