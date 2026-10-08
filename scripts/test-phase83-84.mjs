import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { validateSandboxTarget } from './recovery-target-guard.mjs'
const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8')

for (const raw of [
  'postgresql://tester@example.supabase.co/aula_ei_restore_lab',
  'postgresql://tester@127.0.0.1/postgres',
  'postgresql://tester@127.0.0.1/aula_ei_production',
  'mysql://tester@127.0.0.1/aula_ei_restore_lab',
  'postgresql://tester@127.0.0.1/aula_ei_restore_lab?host=production.example.com',
  '',
]) assert.throws(() => validateSandboxTarget(raw))
assert.deepEqual(validateSandboxTarget('postgresql://test@127.0.0.1:5432/aula_ei_restore_lab'),
  { host:'127.0.0.1', database:'aula_ei_restore_lab' })
assert.equal(validateSandboxTarget('postgres://test@localhost/aula_ei_restore_october').database,
  'aula_ei_restore_october')

const [runbook,learner,studio,pkg,worker,html,authApp,budget] = await Promise.all([
  read('docs/runbooks/PHASE8_AULA_EI_RECOVERY_2026-10-08.md'),
  read('player/src/LearnerApp.jsx'),read('studio/src/studio-modules.js'),
  read('package.json'),read('public/sw.js'),read('index.html'),
  read('src/App.jsx'),read('scripts/check-bundle-budget.mjs'),
])
for(const required of ['course-assets','PostgreSQL','aula_ei_restore_', 'NO ejecutada',
 'Supabase', 'RTO', 'RPO', 'no', 'MFA'])
  assert.ok(runbook.includes(required), 'Recovery runbook missing '+required)
assert.match(learner,/connection\?\.saveData/)
assert.match(learner,/connection\?\.effectiveType/)
const warm=learner.match(/const warm = \(\) => \{[\s\S]*?\n    \}\n\n    if \('requestIdleCallback'/)?.[0]
assert.ok(warm,'Preloading boundary not found')
assert.ok(warm.includes('loadCatalogPage()'))
assert.ok(warm.includes('loadDevelopmentPage()'))
assert.ok(warm.includes('loadTrainingPlanPage()'))
for(const forbidden of ['loadStudioApp()','loadGamesPage()','loadCoursePlayer()',
'loadIntelligencePage()','loadCoursePreview()','loadDeveloperCredits()'])
  assert.ok(!warm.includes(forbidden),'Idle must not preload '+forbidden)
assert.match(learner,/route\.type === 'studio'\) void loadStudioApp\(\)/)
assert.match(learner,/route\.type === 'games'\) void loadGamesPage\(\)/)
assert.match(studio,/preloadStudioTools/)
assert.match(authApp,/profileUserId !== session\.user\.id/)
assert.match(budget,/initialCssGzip: 64 \* 1024/)
assert.match(html,/phase-8\.4-2026-10-08/)
assert.match(worker,/CACHE_VERSION = 'aula-ei-pwa-v7'/)
for(const task of ['test:phase81-82','test:phase83-84','check:bundle',
  'check:performance','check:mobile','check:controls','check:security'])
    assert.ok(JSON.parse(pkg).scripts.build.includes('npm run '+task),'Missing gate: '+task)
console.log('Fase 8.3–8.4: sandbox-only recovery, targeted idle prefetch and release contracts OK.')
