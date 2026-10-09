import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8')

const [main,sw,html,learner,plan,shell,notices,model,studio,panels,smoke,pwa,pkg] =
 await Promise.all([
  read('src/main.jsx'), read('public/sw.js'), read('index.html'),
  read('player/src/LearnerApp.jsx'), read('player/src/TrainingPlanPage.jsx'),
  read('player/src/LearnerShell.jsx'), read('player/src/NotificationCenter.jsx'),
  read('player/src/notifications/notification-priority.js'), read('studio/src/App.jsx'),
  read('studio/src/compliance/CompliancePanels.jsx'), read('scripts/smoke-browser.sh'),
  read('scripts/verify-pwa.mjs'), read('package.json'),
 ])
assert.match(html,/name="aula-ei-release" content="phase-9\.2-2026-10-09"/)
assert.match(main,/sw\.js\?v=9/)
assert.match(main,/aula-ei-pwa-refresh-v9/)
assert.match(sw,/CACHE_VERSION = 'aula-ei-pwa-v9'/)
assert.match(pwa,/aula-ei-pwa-v9/)
assert.match(sw,/networkFirstNavigation/)
assert.match(sw,/isFreshCode/)
assert.match(learner,/const loadTrainingPlanPage = \(\) => import\('\.\/TrainingPlanPage\.jsx'\)/)
assert.match(learner,/route\.type === 'plan'/)
assert.match(shell,/label="Mi plan"/)
assert.match(plan,/get_my_home_snapshot/)
assert.match(notices,/organizeTrainingNotifications\(items, view\)/)
assert.match(model,/notificationDestination/)
assert.match(studio,/tab === 'compliance' && canAdmin && <ComplianceCenter/)
assert.match(panels,/<ComplianceFollowup rows=\{rows\}/)
assert.match(smoke,/for attempt in 1 2 3; do/)
assert.match(smoke,/if \[ "\$passed" -ne 1 \]; then/)
for(const marker of ['auth-form-clean','dev-auth-signature','name="aula-ei-release"'])
 assert.ok(smoke.includes(marker), 'Browser smoke must still assert '+marker)
assert.match(smoke,/Aula EI encontró un error inesperado/)
assert.match(smoke,/VIEWPORTS=\(/)
assert.doesNotMatch(notices,/setInterval\([^)]*30000/,'Do not introduce more frequent polling.')
assert.doesNotMatch(plan,/\.insert\(|\.upsert\(|\.update\(|\.delete\(/)
const tasks=JSON.parse(pkg).scripts.build
for(const gate of ['test:phase71-plan','test:phase72-notifications','test:phase73-followup','test:phase74-release','check:pwa','check:mobile','check:controls','check:bundle'])
 assert.ok(tasks.includes('npm run '+gate),'Release gate missing: '+gate)
console.log('Fase 7.4: cross-module controls, lazy routes, PWA v9 and smoke with strict DOM assertions OK.')
