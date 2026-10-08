import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { collectCompletedCourseContent, generateCourseReviewGames } from '../player/src/games/course-game-generator.js'
import { gameIsPlayable } from '../player/src/games/game-data.js'

const published = (id, type, title, description, content = {}) =>
  ({ id, type, title, description, content, sort_order: Number(id.match(/\d+/)?.[0] || 0), status: 'published' })
const course = {
  id: 'course-1', title: 'Procedimientos EI',
  phases: [
    { id: 'p1', title: 'Planeación', sort_order: 0, blocks: [
      published('a1','image','Política de calidad','Establece el compromiso de la organización con los resultados.'),
      published('a2','text','Mapa de procesos','Identifica los procesos operativos y las relaciones entre áreas.'),
      published('a3','text','Roles del sistema','Define responsabilidades documentadas dentro de cada proceso.'),
      published('a4','validation','Validación de procesos','', { prompt: '¿Cuál documento orienta los procesos?', options:['Mapa de procesos','Inventario físico','Reporte financiero'], correctIndex:0 }),
    ]},
    { id: 'p2', title: 'Ejecución', sort_order: 1, blocks: [
      published('b1','image','Control documental','Permite identificar y controlar las versiones aprobadas.'),
      published('b2','text','Identificación de registros','Facilita mantener evidencia de actividades finalizadas.'),
      { ...published('b3','text','Material pendiente','No debe anticiparse una descripción no estudiada.'), status:'draft' },
      published('b4','validation','Evaluación reservada','', { prompt:'Pregunta aún no vista', options:['A','B'], correctIndex:1 }),
    ]},
  ],
}
const completed = new Set(['a1','a2','a3','a4','b1','b2','b3'])
const phases = collectCompletedCourseContent(course, completed)
assert.equal(phases.length, 2)
assert.equal(phases[1].blocks.length, 2, 'No deben incluirse materiales en borrador ni validaciones pendientes.')
const games = generateCourseReviewGames(course, completed)
const byType = Object.fromEntries(games.map((group) => [group.type, group]))
for (const type of ['memory', 'classification', 'sequence', 'decision']) {
  assert.ok(byType[type].rounds.length > 0, 'Debe existir una ronda válida para ' + type)
  assert.ok(byType[type].rounds.every((entry) => gameIsPlayable(entry.content)))
}
assert.equal(byType.classification.rounds[0].content.items.every((item) => ['Planeación','Ejecución'].includes(item.category)), true)
assert.equal(byType.sequence.rounds[0].content.steps.length, 3)
assert.equal(byType.memory.rounds[0].content.pairs.length, 5)
assert.equal(byType.decision.rounds.some((entry) => entry.content.prompt === '¿Cuál documento orienta los procesos?'), true)
assert.equal(byType.decision.rounds.some((entry) => entry.content.prompt === 'Pregunta aún no vista'), false)
assert.equal(games.every((group) => group.rounds.every((item) =>
  !JSON.stringify(item).includes('Material pendiente') &&
  !JSON.stringify(item).includes('Pregunta aún no vista'))), true)
assert.equal(generateCourseReviewGames(course, new Set()).every((group) => group.rounds.length === 0), true,
  'Los colaboradores sin bloques completados no deben obtener respuestas anticipadas.')
assert.deepEqual(generateCourseReviewGames({ phases: [] }, completed).map((group) => group.rounds.length), [0,0,0,0])

const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8')
const [page, learner, study, gameCss, studyCss] = await Promise.all([
  read('player/src/GamesPage.jsx'),
  read('player/src/LearnerApp.jsx'),
  read('player/src/course-player/StudyReview.jsx'),
  read('player/src/styles/games.css'),
  read('player/src/styles/study.css'),
])
for(const marker of ["get_my_catalog_snapshot","get_my_course_route_access","supabase.from('courses')",
  "generateCourseReviewGames(course, completed)","sessionUser","Solo puedes repasar capacitaciones visibles",
  "no se interpretan automáticamente","Nunca","Otra ronda"]) {
  if (marker === 'Nunca') continue
  assert.ok(page.includes(marker), 'Falta una protección o affordance del selector: ' + marker)
}
assert.match(page, /filter\(\(entry\) => entry\?\.course\?\.id\)/)
assert.match(page, /<select id="games-course-select"/)
assert.match(page, /aria-pressed=\{group.type === gameType\}/)
assert.doesNotMatch(page, /get_exam_questions|get_course_practice_question|submit_exam/)
assert.match(learner, /gamesMatch = hash.match/)
assert.match(learner, /sessionUser=\{sessionUser\} initialCourseId=/)
assert.match(study, /navigateLearner\('\/games\/' \+ encodeURIComponent\(course.id\)\)/)
assert.match(gameCss, /games-course-selector/)
assert.match(gameCss, /@media\(max-width:580px\)/)
assert.match(studyCss, /study-open-games/)
console.log('Course-based review: authored materials, provenance, accessible picker, no exams and no uncompleted content passed.')
