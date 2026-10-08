import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
const root = process.cwd()
const read = (name) => readFile(path.join(root,name),'utf8')

const [app,auth,mfa,gate,release,pages,dr,codeql,dep,smoke,report,vercel,entry,splash] = await Promise.all([
  read('src/App.jsx'),read('src/auth/AuthScreens.jsx'),read('src/AdminMfaGate.jsx'),
  read('src/legal/LegalGate.jsx'),read('package.json'),read('.github/workflows/deploy-pages.yml'),
  read('.github/workflows/database-dr-baseline.yml'),read('.github/workflows/codeql.yml'),
  read('.github/workflows/dependency-review.yml'),read('scripts/smoke-browser.sh'),
  read('docs/quality/PHASE5_PRODUCTION_AUDIT_2026-10-08.md'),read('vercel.json'),
  read('src/branding/EntrySplash.jsx'),read('src/branding/developer-branding.css'),
])
const config = JSON.parse(vercel)
const packageFile = JSON.parse(release)
assert.equal(config.git?.deploymentEnabled,false,'Git-initiated Vercel deploys must remain disabled')
const headers = config.headers?.find((rule) => rule.source === '/(.*)')?.headers || []
for (const key of ['Strict-Transport-Security','Content-Security-Policy','X-Content-Type-Options',
  'Referrer-Policy','Permissions-Policy','X-Frame-Options']) {
  assert.ok(headers.some((header) => header.key === key),'Missing HTTP security header '+key)
}
const csp = headers.find((header) => header.key === 'Content-Security-Policy')?.value || ''
assert.match(csp,/object-src 'none'/)
assert.match(csp,/frame-ancestors 'self'/)
assert.doesNotMatch(csp,/script-src [^;]*'unsafe-eval'/)
assert.match(app, /<LegalGate[\s\S]*<AdminMfaGate/, 'The data/UI access must remain behind legal and MFA gates')
assert.match(app,/if \(!session\?\.user\) return !introComplete && !route\.isCertificate/,
  'Pre-login intro must not delay authenticated routes or certificates')
assert.match(entry,/prefers-reduced-motion/)
assert.match(splash,/prefers-reduced-motion:reduce/)
assert.match(mfa,/getAuthenticatorAssuranceLevel/)
assert.match(mfa,/currentLevel !== 'aal2'/)
assert.match(auth,/withTimeout\(/)
assert.match(auth,/validatePasswordPolicy/)
assert.match(gate,/accept_legal_document|acceptDocuments|accept/)
assert.match(pages,/pull_request:/)
assert.match(pages,/Verify production push came from merged PR/)
assert.match(pages,/npm run build/)
assert.match(pages,/bash scripts\/smoke-browser\.sh/)
assert.match(pages,/Verify live Pages deployment/)
assert.match(codeql,/pull_request:/)
assert.match(codeql,/schedule:/)
assert.match(dep,/npm audit --omit=dev --audit-level=high/)
assert.match(dr,/SUPABASE_DB_URL/)
assert.match(dr,/Require database backup secret/)
assert.match(dr,/supabase db dump/)
assert.match(dr,/sha256sum -c/)
assert.match(dr,/no application data; no Storage objects/,
  'DR must acknowledge it is not a data recovery test')
assert.match(smoke,/320,700/)
assert.match(smoke,/1440,900/)
assert.match(smoke,/dev-auth-signature/,
  'Public smoke must verify the new credits are visible before login')
for(const f of ['brand/developer/juan-perez-primary-blue.webp','brand/developer/juan-perez-secondary-blue.webp']) {
  const image = await stat(path.join(root,f))
  assert.ok(image.size > 5000 && image.size < 30000,'Missing optimized developer WebP image: '+f)
}
for(const requirement of [
  'NO CERTIFICADO TODAVÍA','F5-01','F5-02','F5-03','F5-04','F5-05',
  'restauración','responsable','AAL2','32 archivos','42 entradas',
]) assert.ok(report.includes(requirement),'Audit record missing evidence/limitation: '+requirement)
const gates = packageFile.scripts?.build || ''
for (const step of ['test:developer-branding','test:course-review-generation','test:personal-development',
  'test:actionable-analytics','test:release-readiness','check:security','check:database','check:legal',
  'check:mobile','check:controls','check:bundle']) {
  assert.ok(gates.includes('npm run '+step),'Release build must enforce '+step)
}
console.log('Fase 5: release gates, public login, Auth/MFA/legal, DR scope, CSP and certification evidence verified.')
