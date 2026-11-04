import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  PRACTICE_READ_TIMEOUT_MS, PRACTICE_WRITE_TIMEOUT_MS,
  practiceRequestSeed, withPracticeTimeout, isUsablePracticeQuestion,
} from '../src/practice-gate-resilience.js'
import { createPracticePlan, restorePracticePlan, shouldAskTransitionQuestion } from '../src/guided-slides.js'

// Cross-browser seed creation: Safari/older contexts without crypto.randomUUID.
assert.equal(practiceRequestSeed({ randomUUID: () => 'uuid-from-browser' }), 'uuid-from-browser')
assert.equal(practiceRequestSeed({ getRandomValues: bytes => bytes.fill(1) }), '01'.repeat(16))
assert.match(practiceRequestSeed(null), /^[a-z0-9]+-[a-z0-9]+$/)
assert.ok(PRACTICE_WRITE_TIMEOUT_MS > PRACTICE_READ_TIMEOUT_MS)

// A hung network request must terminate its waiting UI, including rejections.
assert.equal(await withPracticeTimeout(Promise.resolve('ok'), 100), 'ok')
await assert.rejects(withPracticeTimeout(new Promise(() => {}), 20), /tardó demasiado/)
await assert.rejects(withPracticeTimeout(Promise.reject(new Error('offline')), 100), /offline/)

// Corrupt/empty RPC payloads cannot produce a modal with zero usable answers.
const valid = { id: 'q1', prompt: '¿Qué se debe hacer?', options: [
  { id: 'a', label: 'Primera opción' }, { id: 'b', label: 'Segunda opción' },
] }
assert.equal(isUsablePracticeQuestion(valid), true)
for (const bad of [null, {}, { ...valid, options: [] }, { ...valid, prompt: '' }, { ...valid, options: [{ id: 'a' }] }]) {
  assert.equal(isUsablePracticeQuestion(bad), false)
}

// Backend progress, not just localStorage, must count skipped checkpoints.
const slides = ['one', 'two', 'three', 'four'].map(id => ({ id, status: 'published' }))
const history = [
  { block_id: 'one', data: { transition_practice: true, practice_unavailable: true } },
  { block_id: 'two', data: { transition_practice: true, practice_question_id: 'q2' } },
]
const plan = createPracticePlan(slides, new Set(['one', 'two']), history, () => 0)
assert.deepEqual(plan.asked, ['one', 'two'])
assert.deepEqual(plan.questionIds, ['q2'])
assert.equal(plan.checkpoints.length, 0)
const restored = restorePracticePlan(null, slides, new Set(['one', 'two']), history)
assert.equal(shouldAskTransitionQuestion(slides[2], false, restored), false)

// UI contract: recovery stays reachable through load, answer, save and immersive view.
const player = await readFile(new URL('../player/src/CoursePlayer.jsx', import.meta.url), 'utf8')
const modal = await readFile(new URL('../player/src/course-player/CoursePlayerViews.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('../player/src/styles/course.css', import.meta.url), 'utf8')
assert.doesNotMatch(player, /crypto\.randomUUID\(/, 'No unguarded randomUUID on page transition or retry')
assert.match(player, /PRACTICE_READ_TIMEOUT_MS/, 'Question and check RPC calls have a deadline')
assert.match(player, /PRACTICE_WRITE_TIMEOUT_MS/, 'Progress saves have a deadline')
assert.match(player, /practiceAdvanceBusyRef\.current/, 'Double click cannot duplicate saves')
assert.match(player, /setPracticeSaveError\(/, 'Save errors must remain visible inside modal')
assert.match(modal, /practice-gate-loading[\s\S]*?Continuar sin esperar/, 'Pending lookup can be skipped')
assert.match(modal, /practice-gate-footer-actions[\s\S]*?Continuar sin esta pregunta/, 'A stuck answer can be skipped')
assert.match(modal, /saveError &&/, 'Save failure offers a visible retry path')
assert.match(css, /practice-gate-footer-actions/, 'Recovery actions remain usable on mobile')
console.log('Practice popup timeout, recovery, browser seeds and two-question persistence: OK')
