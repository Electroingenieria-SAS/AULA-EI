import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (file) => readFile(new URL('../' + file, import.meta.url), 'utf8')
const pkg = JSON.parse(await read('package.json'))
const lock = JSON.parse(await read('package-lock.json'))
const entry = await read('src/main.jsx')
const studio = await read('studio/src/App.jsx')
const migration = await read('supabase/migrations/20261123215638_consolidate_aula_enrollments_permissive_rls_20261123.sql')

// Dependabot advisory GHSA-8g5g-mxqh-grgj is patched in Vite 6.4.5.
assert.equal(pkg.dependencies?.vite, '^6.4.5', 'Require the patched Vite 6.4.5 release')
assert.equal(lock.packages?.['']?.dependencies?.vite, '^6.4.5')
assert.equal(lock.packages?.['node_modules/vite']?.version, '6.4.5')
assert.equal(lock.packages?.['node_modules/vite']?.resolved, 'https://registry.npmjs.org/vite/-/vite-6.4.5.tgz')
assert.equal(lock.packages?.['node_modules/vite']?.integrity,
  'sha512-4enwjFfi4IwtEh0w+jPzpLVOFQiPHmmzPxcHXQOyEur47o6u0jE573DmGpjA+7irXoMLYRZD5ZaFUEneS3abPg==')

// The course authoring stylesheet is 33 KB uncompressed. It belongs to Studio,
// not the initial public login and learner browsing entry point.
assert.doesNotMatch(entry, /import ['"]\.\.\/studio\/src\/styles\/courses\.css['"]/)
assert.match(studio, /import ['"]\.\/styles\/courses\.css['"]/)

// Keep existing administrator and creator paths via OR, not AND. Enrollments
// still have the independent existing administrator-only DELETE policy.
const p = migration.toLowerCase()
for (const signature of [
  'alter policy enrollments_select_policy',
  'alter policy enrollments_admin_insert',
  'alter policy enrollments_admin_update',
  'drop policy creator_enrollments_read',
  'drop policy creator_enrollments_assign',
  'drop policy creator_enrollments_edit',
  'creator_assignment_allowed(course_id)',
  'creator_assignment_target_allowed(course_id,user_id)',
  '(select public.can_manage_assignments())',
  '(select auth.uid())',
  'status = \'assigned\'::text',
]) assert.ok(p.includes(signature), 'Missing authorization-preserving expression: ' + signature)
assert.match(migration, /raise exception 'enrollments RLS policy precondition failed/)
assert.doesNotMatch(migration, /drop policy enrollments_admin_delete/)
assert.doesNotMatch(migration, /drop table|truncate table|delete from public\.enrollments/i)

console.log('Aula EI hardening: Vite patched and pinned, Studio CSS deferred, exact RLS OR semantics preserved.')
