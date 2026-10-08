import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (value) => readFile(path.join(root, value), 'utf8')
const [app, auth, splash, card, shell, routes, privacy, splashCss, cardCss, privacyCss, vite] = await Promise.all([
  read('src/App.jsx'), read('src/auth/AuthScreens.jsx'),
  read('src/branding/PostLoginSplash.jsx'), read('player/src/DeveloperCreditsPage.jsx'),
  read('player/src/LearnerShell.jsx'), read('player/src/LearnerApp.jsx'),
  read('player/src/PrivacyCenter.jsx'),read('src/branding/developer-branding.css'),
  read('player/src/styles/developer-credits.css'),read('player/src/styles/privacy.css'),read('vite.config.js')
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
assert.match(auth, /aula-ei-brand-welcome-v1/, 'Splash flag can only begin after explicit sign-in')
assert.match(auth, /if \(loginError\) throw loginError[\s\S]*?sessionStorage\.setItem\('aula-ei-brand-welcome-v1'/)
assert.match(app, /sessionStorage\.removeItem\('aula-ei-brand-welcome-v1'\)/, 'Splash flag must be consumed once')
assert.match(app, /<LegalGate[\s\S]*<AdminMfaGate[\s\S]*<PostLoginSplash/, 'Splash must remain behind legal and MFA gates')
assert.match(app, /showWelcome && !route\.isCertificate/, 'Never alter certificate viewing flow')
assert.match(splash, /setTimeout\(\(\) => finish\.current\(\), 1250\)/)
assert.match(splash, /juan-perez-primary-blue\.webp/)
assert.match(splashCss, /prefers-reduced-motion:reduce/)
assert.match(card, /juan-perez-secondary-blue\.webp/)
assert.match(card, /aria-expanded=\{expanded\}/)
assert.match(card, /id="dev-credit-details" hidden=\{!expanded\}/)
assert.match(cardCss, /dev-credit-card-details\[hidden\]/)
assert.match(cardCss, /@media\(max-width:600px\)/)
assert.match(shell, /navigateLearner\('\/credits'\)/)
assert.match(routes, /loadDeveloperCredits/)
assert.match(routes, /route\.type === 'credits'/)
assert.match(routes, /DeveloperCreditsPage/)
assert.match(privacy, /Ver tarjeta interactiva de créditos/)
assert.match(privacyCss, /privacy-developer-entry/)
assert.doesNotMatch(app, /localStorage\.setItem\('aula-ei-brand-welcome-v1'/, 'Avoid persistent auth branding gate')
for (const source of [splash,card]) {
  assert.doesNotMatch(source, /\.rpc\(|\.from\(|\.insert\(|\.update\(/, 'Branding cannot modify application data')
}
console.log('Branding integration: validated exact WebP assets, single-use authentication flow, legal/MFA gates, keyboard access and mobile layout.')
