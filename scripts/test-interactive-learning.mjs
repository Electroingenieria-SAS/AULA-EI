import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { GAME_TYPES, DEMO_GAMES, buildGameContent, gameLines, gameIsPlayable } from '../player/src/games/game-data.js'

assert.deepEqual(GAME_TYPES.map((game) => game.value), ['memory','classification','sequence','decision'])
for (const demo of DEMO_GAMES) {
  assert.ok(gameIsPlayable(demo), demo.title + ' debe ser jugable.')
  const restored = buildGameContent({
    gameType: demo.gameType,
    instructions: demo.instructions,
    lines: gameLines(demo),
    prompt: demo.prompt || '',
  })
  assert.ok(gameIsPlayable(restored), 'El editor debe conservar toda la configuración interactiva.')
}
assert.throws(() => buildGameContent({ gameType: 'memory', lines: 'solo un elemento' }), /2 y 12|símbolo/)
assert.throws(() => buildGameContent({ gameType: 'classification', lines: 'Registro | A\nProcedimiento | A' }), /dos categorías/)
assert.throws(() => buildGameContent({ gameType: 'decision', prompt: 'Decide', lines: '*Uno\n*Dos' }), /exactamente una/)
assert.throws(() => buildGameContent({ gameType: 'sequence', lines: 'Primero\nPrimero' }), /repetirse/)
assert.equal(gameIsPlayable({ gameType: 'multiple_choice', instructions: 'Antiguo' }), false)
assert.equal(buildGameContent({ gameType:'decision', lines: 'Incorrecta\n*Correcta', prompt:'Pregunta' }).correctIndex, 1)

const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8')
const [builder, fields, player, contentViews, page, game, review, cssGames, cssStudy, main] = await Promise.all([
  read('studio/src/course-editor/CourseBuilderPanels.jsx'),
  read('studio/src/course-editor/GameBlockFields.jsx'),
  read('player/src/CoursePlayer.jsx'),
  read('player/src/course-player/CourseContentViews.jsx'),
  read('player/src/GamesPage.jsx'),
  read('player/src/games/LearningGame.jsx'),
  read('player/src/course-player/StudyReview.jsx'),
  read('player/src/styles/games.css'),
  read('player/src/styles/study.css'),
  read('src/main.jsx'),
])
assert.match(builder, /buildGameContent\(/)
assert.match(builder, /<GameBlockFields/)
assert.match(fields, /GAME_TYPES\.map/)
assert.match(contentViews, /<LearningGame key=\{block\.id\}/)
assert.match(page, /<LearningGame content=\{current\}/)
assert.match(page, /En desarrollo/, 'No anunciar como jugables los módulos futuros.')
for (const marker of ['MemoryRound','ClassificationRound','SequenceRound','DecisionRound','role="status"','Reiniciar']) {
  assert.ok(game.includes(marker), 'Motor interactivo sin función requerida: ' + marker)
}
for (const marker of ['window.localStorage','localStorage.removeItem','maxLength={3000}','completed.has(block.id)','No cambia']) {
  assert.ok(review.includes(marker), 'El espacio de repaso no cumple su contrato: ' + marker)
}
assert.match(player, /<StudyReview course=\{course\}/)
assert.doesNotMatch(review, /\.rpc\(|supabase|submit_exam|block_progress|certificates/, 'El repaso no puede modificar registros oficiales.')
assert.doesNotMatch(game, /\.rpc\(|supabase|submit_exam|block_progress/, 'El minijuego es práctica sin escritura de notas.')
for (const sheet of [cssGames,cssStudy]) {
  assert.match(sheet, /@media\(max-width:/)
  assert.match(sheet, /:focus-visible/)
}
assert.match(main, /styles\/games\.css/)
assert.match(main, /styles\/study\.css/)
console.log('Phase 2 interactive games, editor roundtrip, browser-local review and accessibility contracts passed.')
