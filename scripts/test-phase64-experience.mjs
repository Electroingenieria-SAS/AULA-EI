import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { firstPlayableGroup } from '../player/src/games/game-data.js'

const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8')
const [page, game, coach, styles, model, packageFile] = await Promise.all([
  read('player/src/GamesPage.jsx'),
  read('player/src/games/LearningGame.jsx'),
  read('player/src/IntelligencePage.jsx'),
  read('player/src/styles/games.css'),
  read('player/src/intelligence/intelligence-model.js'),
  read('package.json'),
])

const groups = [
  { type: 'memory', rounds: [] },
  { type: 'sequence', rounds: [{ id: 'seq' }] },
  { type: 'decision', rounds: [{ id: 'case' }] },
]
assert.equal(firstPlayableGroup(groups, 'memory')?.type, 'sequence', 'Fall back to available game on course load')
assert.equal(firstPlayableGroup(groups, 'decision')?.type, 'decision', 'Respect existing playable choice')
assert.equal(firstPlayableGroup(groups, 'unknown')?.type, 'sequence')
assert.equal(firstPlayableGroup([{ type:'memory', rounds:[] }]), null, 'Empty course cannot invent rounds')
assert.equal(firstPlayableGroup(null), null)

assert.match(page, /const \[completedRound, setCompletedRound\] = useState/)
assert.match(page, /useEffect\(\(\) => \{\s*const preferred = firstPlayableGroup\(available, gameType\)/)
assert.match(page, /setGameType\(preferred\.type\)/)
assert.match(page, /games-round-complete/)
assert.match(page, /Siguiente ronda/)
assert.match(page, /Repetir actividad/)
assert.match(page, /setRetryCourse\(\(value\) => value \+ 1\)/)
assert.match(page, /get_my_course_route_access/)
assert.match(page, /recordPractice\(sessionUser\?\.id, selectedCourseId/)
assert.match(styles, /@media\(max-width:650px\)/)
assert.match(styles, /\.games-round-complete/)
assert.match(game, /disabled=\{finished\.current \|\| i === 0\}/)
assert.match(game, /disabled=\{choice === null \|\| finished\.current\}/)
assert.match(game, /role="status" aria-live="polite"/)
assert.match(coach, /role="tablist"/)
assert.match(coach, /role="tab"/)
assert.match(coach, /role="tabpanel"/)
assert.match(model, /practiceStorageKey\(userId\)/)
assert.doesNotMatch(page + coach + game, /\.from\('exam_attempts'\)|\.from\('question_options'\)|\.upsert\(|\.delete\(/)
const pkg=JSON.parse(packageFile)
assert.match(pkg.scripts.build, /npm run test:phase64-experience/)
console.log('Fase 6.4: selección jugable, continuidad, reintento, feedback, semántica y límites de datos OK.')
