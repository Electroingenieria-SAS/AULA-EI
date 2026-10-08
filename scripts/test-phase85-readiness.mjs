import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { certificationCheck, readCertificationEvidence } from './phase85-certification-status.mjs'
const read = (name) => readFile(new URL('../'+name, import.meta.url),'utf8')
const [sql,app,mfa,security,learner,runbook,report,pkg,completed,createUser,resetUser] = await Promise.all([
 read('supabase/audits/phase85_readonly_security.sql'),
 read('src/App.jsx'), read('src/AdminMfaGate.jsx'),
 read('scripts/verify-security.mjs'), read('player/src/LearnerApp.jsx'),
 read('docs/runbooks/PHASE8_AULA_EI_RECOVERY_2026-10-08.md'),
 read('docs/quality/PHASE85_SECURITY_ACCEPTANCE_2026-10-08.md'),
 read('package.json'),
 read('supabase/functions/complete-password-change/index.ts'),
 read('supabase/functions/create-managed-user/index.ts'),
 read('supabase/functions/reset-managed-user-password/index.ts'),
])
const commands = sql.replace(/--[^\n]*/g,'').trim().split(';').map(v=>v.trim()).filter(Boolean)
assert.equal(commands.length,4,'Audit should contain four read-only statements')
for(const statement of commands) {
 assert.match(statement,/^(?:with|select)\b/i,'Only read-only select statements are allowed')
 assert.doesNotMatch(statement,/\b(?:insert|update|delete|create|alter|drop|grant|revoke|truncate|copy|do|call|execute)\s+(?:on|table|function|into|user|policy|role|from|procedure|extension|or)\b/i)
}
assert.match(sql,/has_function_privilege\('anon'/)
assert.match(sql,/has_table_privilege\('authenticated'/)
assert.match(sql,/aclexplode/)
assert.match(sql,/pg_policy/)
assert.match(sql,/search_path/)
assert.match(app,/profileUserId !== session\.user\.id/)
assert.match(app,/<AdminMfaGate/)
assert.match(app,/<LegalGate/)
assert.match(mfa,/getAuthenticatorAssuranceLevel/)
assert.match(mfa,/currentLevel !== 'aal2'/)
for(const source of [completed,createUser,resetUser]) {
 assert.match(source,/pwnedPasswordCount/)
 assert.match(source,/PWNED_PASSWORD/)
 assert.match(source,/length < 12/)
}
assert.match(createUser,/validateLiveAdminSession/)
assert.match(resetUser,/validateLiveAdminSession/)
assert.match(security,/sb_secret_/)
assert.match(learner,/route\.type === 'plan'/)
assert.match(runbook,/restauración aislada/i)
assert.match(report,/33/)
assert.match(report,/contraseñas filtradas/i)
const evidence=await readCertificationEvidence()
const status=certificationCheck(evidence)
assert.equal(status.valid,false,'Must not certify unverified environments')
assert.equal(status.status,'PENDIENTE')
assert.equal(evidence.certification_status,'PENDIENTE')
assert.equal(status.total,10,'All requested end-to-end/recovery/security gates must be tracked')
assert.equal(status.incomplete.length,10)
const invented = JSON.parse(JSON.stringify(evidence))
invented.certification_status='CERTIFICADO'
assert.equal(certificationCheck(invented).valid,false,'Changing headline cannot bypass evidence')
invented.controls['formal-acceptance'].status='APROBADO'
assert.equal(certificationCheck(invented).valid,false,'Approval without evidence cannot certify')
assert.match(JSON.parse(pkg).scripts.build,/npm run test:phase85-readiness/)
assert.match(JSON.parse(pkg).scripts['check:phase85-certification'],/phase85-certification-status/)
console.log('Fase 8.5: auditoría SQL de solo lectura, guardas de Auth, MFA, HIBP Edge y certificación no falsa: OK.')
