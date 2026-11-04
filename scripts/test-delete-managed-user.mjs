import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const edge = readFileSync(new URL('../supabase/functions/delete-managed-user/index.ts', import.meta.url), 'utf8')
const users = readFileSync(new URL('../studio/src/UsersManager.jsx', import.meta.url), 'utf8')
const panels = readFileSync(new URL('../studio/src/users/UserPanels.jsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../studio/src/styles/users.css', import.meta.url), 'utf8')
const db = readFileSync(new URL('../supabase/migrations/20261104172500_justified_nonadmin_deletion_relations.sql', import.meta.url), 'utf8')

// Authorization continues to be enforced server-side, never through UI alone.
assert.match(edge, /\["admin","super_admin"\]\.includes\(callerRole\)/)
assert.match(edge, /trustedCallerRole !== callerRole/)
assert.match(edge, /validateLiveAdminSession\(admin, caller\.id, token\)/, 'MFA AAL2 and a real session are mandatory')
assert.match(edge, /consumeRateLimit\(admin, "manage_user_access"/)
assert.match(edge, /targetId === caller\.id/)
assert.match(edge, /rank\[callerRole\] <= rank\[targetRole\]/)
assert.match(edge, /\["admin","super_admin"\]\.includes\(targetRole\)/, 'No Admin or Super Admin deletion, regardless of caller')
assert.match(edge, /\["admin","super_admin"\]\.includes\(authTargetRole\)/, 'Auth metadata cannot bypass role protection')
assert.match(edge, /authTargetRole !== targetRole/, 'Profile/Auth mismatches fail closed')

// History can exist, but a verified impact summary and mandatory reason remain.
assert.match(edge, /const history = await relatedHistory\(admin, targetId\)/)
assert.match(edge, /if \(error \|\| count === null\) throw/, 'Do not delete after a partial history check')
assert.match(edge, /can_delete:true, blockers:history/, 'Records are a warning, not a deletion blocker')
assert.doesNotMatch(edge, /PROTECTED_HISTORY/, 'History no longer unconditionally prevents deletion')
assert.match(edge, /const justification = String\(body\.justification \|\| ""\)\.trim\(\)/)
assert.match(edge, /justification\.length < 15 \|\| justification\.length > 1000/)
assert.match(edge, /confirmationEmail !== targetEmail \|\| body\.confirmation_text !== "ELIMINAR"/)
assert.match(edge, /related_records:history/, 'Record impact snapshot is audited')
assert.match(edge, /actor_id:caller\.id, action:"delete_managed_user_requested"/)
assert.match(edge, /auditRequestError\) return reply/, 'Audit failure prevents deleting the user')
assert.ok(edge.indexOf('await admin.auth.admin.deleteUser(targetId)') > edge.indexOf('const { error: auditRequestError }'),
  'Auth deletion is performed only after a successful reason audit')
assert.match(edge, /verified_profile_absent:verified/, 'Verify DB cascade after Auth deletion')
assert.match(edge, /delete_managed_user_failed/)
assert.match(edge, /delete_managed_user"/)
assert.match(edge, /action = body\.action === undefined \? "toggle_access"/, 'Existing activation route remains unchanged')

// Database explicitly handles deletion without erasing shared resources or audit.
for (const [table, foreignKey] of [
  ['legal_acceptances', 'user_id'],
  ['privacy_requests', 'requester_user_id'],
]) {
  assert.ok(db.includes('ALTER TABLE public.' + table), table + ' must permit deleting dependent data')
  assert.match(db, new RegExp('FOREIGN KEY \\(' + foreignKey + '\\) REFERENCES auth\\.users\\(id\\) ON DELETE CASCADE'))
}
for (const item of ['audit_logs_actor_id_fkey', 'courses_created_by_fkey', 'enrollments_assigned_by_fkey',
  'privacy_incidents_created_by_fkey', 'legal_documents_created_by_fkey', 'privacy_requests_resolved_by_fkey']) {
  assert.ok(db.includes('DROP CONSTRAINT ' + item), 'Retention-safe attribution: ' + item)
}
assert.match(db, /ALTER TABLE public\.courses ALTER COLUMN created_by DROP NOT NULL/)
assert.match(db, /ALTER TABLE public\.privacy_incidents ALTER COLUMN created_by DROP NOT NULL/)
assert.match(db, /certificates_exam_attempt_id_fkey/, 'Nested exam/certificate cascades remain valid')

// UI presents the irreversible consequence plus a required reason.
assert.match(users, /const canDelete = \(person\) => canManage\(person\) && !\['admin', 'super_admin'\]\.includes\(person\.role\)/)
assert.match(users, /canDelete\(person\) && <button[^\n]*user-delete-icon/)
assert.match(users, /canDelete\(person\) && <button[^\n]*user-delete-action/)
assert.match(users, /if \(!person \|\| !canDelete\(person\)/)
assert.match(users, /async function confirmDelete\(justification\)/)
assert.match(users, /confirmation_text: 'ELIMINAR', justification/)
assert.match(users, /data\.deleted !== true/, 'Never report success without backend confirmation')
assert.match(panels, /export function DeleteUserModal/)
assert.match(panels, /confirmationText === 'ELIMINAR'/)
assert.match(panels, /justification\.trim\(\)\.length >= 15/)
assert.match(panels, /minLength=\{15\}/)
assert.match(panels, /maxLength=\{1000\}/)
assert.match(panels, /onConfirm\(justification\.trim\(\)\)/)
assert.match(panels, /canDelete && <button[^\n]*user-delete-action/)
assert.match(panels, /disabled=\{!confirmed \|\| busy\}/)
assert.match(panels, /Se eliminarán sus matrículas/, 'Warn about lost training and legal data')
assert.match(styles, /\.user-delete-modal\{max-height:/, 'Small screens can scroll the modal')
assert.doesNotMatch(users, /auth\.admin\.deleteUser/, 'Never expose service role in the browser')
console.log('Justified non-admin deletion: role restrictions, audit, cascade and UI checks OK')
