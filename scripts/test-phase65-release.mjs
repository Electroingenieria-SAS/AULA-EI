import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const read = (file) => readFile(new URL('../' + file, import.meta.url), 'utf8')
const [html,main,worker,foundation,mobile,games,coach,gameStyles,coachStyles,learner] = await Promise.all([
  read('index.html'),read('src/main.jsx'),read('public/sw.js'),
  read('src/responsive-foundation.css'),read('src/mobile-app.css'),
  read('player/src/GamesPage.jsx'),read('player/src/IntelligencePage.jsx'),
  read('player/src/styles/games.css'),read('player/src/styles/intelligence.css'),
  read('player/src/LearnerApp.jsx'),
])
assert.match(html,/name="aula-ei-release" content="phase-[0-9]+(?:\\.[0-9]+)?-[0-9]{4}-[0-9]{2}-[0-9]{2}"/)
assert.ok(main.includes("sw.js?v=5"))
assert.ok(main.includes("aula-ei-pwa-refresh-v6"))
assert.ok(worker.includes("CACHE_VERSION = 'aula-ei-pwa-v6'"))
assert.ok(worker.includes('networkFirstNavigation'))
assert.ok(worker.includes('isFreshCode'))
assert.ok(worker.includes("fetch(request, { cache: 'no-store' })"))
assert.ok(main.includes("import './responsive-foundation.css'"))
assert.ok(!main.includes("import './mobile-app.css'"))
assert.ok(foundation.includes('position:relative!important;top:auto!important;right:auto!important'))
assert.ok(!foundation.includes('position:fixed!important;\n    right:20px'))
assert.ok(games.includes('games-stage-context'))
assert.ok(games.includes('games-round-complete'))
assert.ok(gameStyles.includes('.games-stage-context'))
assert.ok(gameStyles.includes('.games-round-complete'))
assert.ok(gameStyles.includes('@media(max-width:380px)'))
assert.ok(coach.includes('intelligence-hero-meta'))
assert.ok(coach.includes('role="tabpanel"'))
assert.ok(coachStyles.includes('.intelligence-hero-meta'))
assert.ok(coachStyles.includes('@media(max-width:480px)'))
assert.ok(learner.includes("route.type === 'coach'"))
assert.ok(learner.includes("route.type === 'games'"))
assert.ok(mobile.includes('@media(max-width:900px)'))
console.log('Fase 6.5: build-identifiable, cache v6, desktop/mobile and learning routes verified.')
