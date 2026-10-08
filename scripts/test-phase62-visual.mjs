import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const read = (file) => readFile(new URL('../'+file,import.meta.url),'utf8')
const [games,game,gameStyles,shell,mobile,notice,coach,coachStyles,tutor,rewards,routes,adaptive,main] = await Promise.all([
  read('player/src/GamesPage.jsx'),read('player/src/games/LearningGame.jsx'),
  read('player/src/styles/games.css'),read('player/src/LearnerShell.jsx'),
  read('src/mobile-app.css'),read('player/src/styles/notifications.css'),
  read('player/src/IntelligencePage.jsx'),read('player/src/styles/intelligence.css'),
  read('player/src/intelligence/TutorPanel.jsx'),read('player/src/intelligence/RewardsPanel.jsx'),
  read('player/src/intelligence/RoutesPanel.jsx'),read('player/src/intelligence/AdaptivePanel.jsx'),
  read('src/main.jsx'),
])
assert.match(games,/className="games-coach-cta"/)
assert.match(games,/games-coach-cta-icon/)
assert.match(games,/Abrir entrenador/)
assert.doesNotMatch(games,/games-phase6-entry/, 'The former isolated CTA should not remain.')
assert.match(gameStyles,/\.games-coach-cta\{/)
assert.match(gameStyles,/@media\(max-width:720px\)/)
assert.match(gameStyles,/\.games-lab-picker button\.active:before/)
assert.match(gameStyles,/\.game-match-grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
assert.match(gameStyles,/@media\(max-width:650px\)/)
assert.match(gameStyles,/\.game-result-track/)
assert.match(gameStyles,/\.game-match-column button:hover:not\(:disabled\)/)
assert.match(gameStyles,/focus-visible/)
assert.match(gameStyles,/prefers-reduced-motion:reduce/)
assert.match(game,/learning-game-instructions/)
assert.match(game,/className="game-result-track" role="progressbar"/)
assert.match(game,/aria-valuenow=\{count\}/)
assert.match(game,/import '\.\.\/styles\/games\.css'/)
assert.doesNotMatch(main,/styles\/games\.css/, 'The game CSS must be fetched lazily.')
assert.match(mobile,/@media\(min-width:901px\)\{/)
assert.match(mobile,/learner-app-shell:not\(\.learner-course-shell\)>\.learner-mobile-appbar\{/)
assert.match(mobile,/display:flex;[\s\S]*?margin-left:var\(--aula-sidebar-width\)/)
assert.match(mobile,/\.training-notification-center\{[\s\S]*?position:relative;top:auto;right:auto;left:auto/)
assert.doesNotMatch(mobile,/\.learner-mobile-appbar \.training-notification-center\{\s*position:fixed/,
  'The desktop notification trigger must never float above dashboard KPIs.')
assert.match(shell,/learner-desktop-header-label/)
assert.match(mobile,/\.learner-desktop-header-label\{display:none\}/)
assert.match(notice,/in-flow desktop header/)
assert.match(coachStyles,/\.intelligence-tabs button\.is-active:after/)
assert.match(coachStyles,/\.intelligence-rewards-crest/)
assert.match(coachStyles,/\.intelligence-round-progress/)
assert.match(coachStyles,/\.intelligence-route-tag\.is-overdue/)
assert.match(coachStyles,/@media\(max-width:480px\)/)
assert.match(coachStyles,/:focus-visible/)
assert.match(coachStyles,/prefers-reduced-motion:reduce/)
assert.match(tutor,/intelligence-suggestions-heading/)
assert.match(rewards,/badgeIcons/)
assert.match(rewards,/intelligence-rewards-count/)
assert.match(routes,/intelligence-route-tag is-/)
assert.match(adaptive,/intelligence-round-progress/)
for (const c of [games,coach,tutor,rewards,routes,adaptive,game]) {
  assert.doesNotMatch(c,/\.from\('question_options'\)|from\('exam_attempts'\)|\.upsert\(|\.delete\(/,
    'Visual changes cannot alter official assessment data.')
}
console.log('Fase 6.2: fixed notification flow, game and coach hierarchy, responsive, focus, animation and lazy CSS contracts OK.')
