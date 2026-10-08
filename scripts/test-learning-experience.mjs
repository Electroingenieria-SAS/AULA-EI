import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { learningPriorities } from '../player/src/learning-priorities.js'

const now = new Date('2026-10-08T12:00:00.000Z')
const sample = [
  { course: { id: 'early', title: 'Seguridad' }, due_at: '2026-10-09T12:00:00.000Z', status: 'assigned' },
  { course: { id: 'finished', title: 'Calidad' }, due_at: '2026-10-10T12:00:00.000Z', status: 'completed' },
  { course: { id: 'late', title: 'Procesos' }, due_at: '2026-10-07T12:00:00.000Z', status: 'in_progress' },
  { course: { id: 'undated', title: 'Cultura' }, status: 'assigned' },
]
const actual = learningPriorities(sample, [], now)
assert.equal(actual.pending, 3, 'Los cursos completados no pueden figurar como pendientes.')
assert.equal(actual.dueSoon, 2, 'Deben contarse los plazos vencidos y los próximos siete días.')
assert.equal(actual.next.course.id, 'late', 'Un plazo vencido debe tener prioridad.')
assert.match(actual.nextLabel, /plazo vencido/)
const certificate = learningPriorities(sample, [{ course_id: 'late' }], now)
assert.equal(certificate.next.course.id, 'early', 'El certificado elimina la urgencia anterior.')
assert.equal(certificate.pending, 2)
assert.equal(learningPriorities(sample, [{ course_id: 'late' },{ course_id: 'early' },{ course_id: 'undated' }], now).pending, 0)
assert.equal(learningPriorities([], [], now).next, null)

const read = async (path) => readFile(new URL('../' + path, import.meta.url), 'utf8')
const [preview, routes, builder, home, styles, entry] = await Promise.all([
  read('player/src/CoursePreview.jsx'),
  read('player/src/LearnerApp.jsx'),
  read('studio/src/course-editor/CourseBuilder.jsx'),
  read('player/src/HomePage.jsx'),
  read('player/src/styles/learning.css'),
  read('src/main.jsx'),
])
for (const required of [
  "['admin', 'super_admin'].includes",
  "supabase.from('courses')",
  '<ContentExperience',
  '<ImageGallery',
  'role="status"',
  'No se registran avances',
]) {
  assert.ok(preview.includes(required), 'Falta un elemento crítico en el modo de simulación: ' + required)
}
for(const forbidden of ["submit_exam","block_progress","upsert(","insert(","delete(","update(","completeBlock","get_exam_questions","get_course_practice_question"]) {
  assert.ok(!preview.includes(forbidden), 'La simulación NO puede persistir progreso o evaluaciones: ' + forbidden)
}
assert.match(routes, /loadCoursePreview/)
assert.match(routes, /route\.type === 'preview'/)
assert.match(routes, /\['admin','super_admin'\]\.includes/, 'La ruta debe comprobar el rol autenticado.')
assert.match(builder, /appUrl\('\/course-preview\//)
assert.doesNotMatch(builder, /appUrl\('\/course\/' \+ course\.id\)/, 'El botón preview anterior invocaba al reproductor real.')
assert.match(home, /learningPriorities\(enrollments, certificates\)/)
assert.doesNotMatch(home, /<strong>6\+<\/strong>|<strong>80%<\/strong>/)
assert.match(styles, /@media\(max-width:760px\)/)
assert.match(styles, /\.course-preview-outline/)
assert.match(entry, /styles\/learning\.css/)

console.log('Learning UX phase 1: home priority, strict read-only preview, responsive layout passed.')
