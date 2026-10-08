import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { buildDevelopmentSnapshot, matchCertificate } from '../player/src/development/development-data.js'

const now = new Date('2026-10-08T12:00:00.000Z')
const snapshot = {
  training_profile: {
    position: { id: 'job-1', name: 'Operario de calidad', department: 'Calidad' },
    supervisor: { name: 'Líder de calidad' },
    competencies: [
      { id: 'c1', name: 'Inspección', required_level: 4, achieved_level: 2, gap: 2 },
      { id: 'c2', name: 'Seguridad industrial', required_level: 2, achieved_level: 2, gap: 0 },
      { id: 'c3', name: 'Comunicación', required_level: 5, achieved_level: 0, gap: 5 },
    ],
    paths: [{ id: 'p1', name: 'Ruta básica', required: true, progress_percent: 50,
      courses: [
        { course_id: 'course2', title: 'Segundo módulo', sort_order: 2, required: true, completed: false, unlocked: true },
        { course_id: 'course1', title: 'Primer módulo', sort_order: 1, required: true, completed: true, unlocked: true },
        { course_id: 'course3', title: 'Tercer módulo', sort_order: 3, required: false, completed: false, unlocked: false },
      ],
    }],
  },
  enrollments: [
    { id: 'e1', course: { id: 'course1', title: 'Calidad 1' }, status: 'completed', due_at: '2026-10-01T12:00:00.000Z' },
    { id: 'e2', course: { id: 'course2', title: 'Calidad 2' }, status: 'assigned', due_at: '2026-10-07T12:00:00.000Z' },
    { id: 'e3', course: { id: 'course3', title: 'Calidad 3' }, status: 'assigned', due_at: '2026-10-12T12:00:00.000Z' },
    { id: 'e4', course: { id: 'course4', title: 'Calidad 4' }, status: 'assigned', due_at: '2026-10-22T12:00:00.000Z' },
    { id: 'e5', course: { id: 'course5', title: 'Calidad 5' }, status: 'assigned', due_at: null },
    { id: 'e6', course: null, status: 'assigned' },
  ],
  certificates: [
    { certificate_code: 'EI-1', course_id: 'course1', course_title: 'Calidad 1', issued_at: '2026-09-20T14:00:00.000Z' },
    { certificate_code: 'EI-OLD', course_id: 'old', course_title: 'Calidad anterior', issued_at: '2026-08-20T14:00:00.000Z' },
  ],
}
const actual = buildDevelopmentSnapshot(snapshot, now)
assert.equal(actual.position.name, 'Operario de calidad')
assert.equal(actual.totalAssigned, 5)
assert.equal(actual.completedCount, 1)
assert.equal(actual.pendingCount, 4)
assert.equal(actual.overdueCount, 1)
assert.equal(actual.dueSoonCount, 1)
assert.equal(actual.next.course.id, 'course2')
assert.deepEqual(actual.upcoming.map((e) => e.course.id), ['course2','course3','course4'])
assert.equal(actual.competenciesAchieved, 1)
assert.deepEqual(actual.competencies.map((c) => c.id), ['c3','c1','c2'])
assert.equal(actual.competencies[0].percent, 0)
assert.equal(actual.paths[0].progress, 50)
assert.equal(actual.paths[0].completeCount, 1)
assert.equal(actual.paths[0].requiredCount, 2)
assert.equal(actual.paths[0].next.course_id, 'course2')
assert.deepEqual(actual.paths[0].courses.map((c) => c.status), ['complete','available','locked'])
assert.equal(actual.certificates.length, 2)
assert.equal(matchCertificate({course:{id:'course6',title:'Calidad 1'}},snapshot.certificates),null,
  'No se puede adjudicar un certificado de otra capacitación por coincidencia de título.')
assert.equal(buildDevelopmentSnapshot({}, now).totalAssigned, 0)
assert.equal(buildDevelopmentSnapshot({}, now).competencies.length, 0)
assert.equal(buildDevelopmentSnapshot({}, now).paths.length, 0)
assert.equal(buildDevelopmentSnapshot({}, now).certificates.length, 0)

const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8')
const [page,sections,route,shell,home,css,main] = await Promise.all([
  read('player/src/DevelopmentPage.jsx'),
  read('player/src/development/DevelopmentSections.jsx'),
  read('player/src/LearnerApp.jsx'),
  read('player/src/LearnerShell.jsx'),
  read('player/src/HomePage.jsx'),
  read('player/src/styles/development.css'),
  read('src/main.jsx'),
])
assert.match(page, /get_my_home_snapshot/)
assert.match(page, /home:snapshot:/)
assert.match(page, /buildDevelopmentSnapshot/)
assert.match(page, /<DevelopmentCompetencies/)
assert.match(page, /<DevelopmentCertificates/)
assert.match(page, /<DevelopmentPaths/)
assert.match(page, /<DevelopmentDates/)
assert.match(page, /if \(error && !snapshot\)/)
assert.match(sections, /Nivel requerido alcanzado/)
assert.match(sections, /Completa los pasos anteriores/)
assert.match(sections, /No equivalen a un nuevo título/)
assert.match(sections, /Una fecha de expedición no indica/)
assert.match(route, /loadDevelopmentPage/)
assert.match(route, /route\.type === 'development'/)
assert.match(shell, /label="Mi desarrollo"/)
assert.match(home, /home-development-entry/)
assert.match(css, /@media\(max-width:480px\)/)
assert.match(css, /:focus-visible/)
assert.match(main, /styles\/development\.css/)
for(const source of [page,sections]) {
  assert.doesNotMatch(source, /from\('exam_attempts'\)|from\('profiles'\)|\.insert\(|\.upsert\(|\.update\(|\.delete\(|submit_exam/,
    'La Fase 3 debe mantener el seguimiento como lectura y usar contratos autenticados existentes.')
}
console.log('Phase 3: verified competency gaps, paths, priorities, credentials, authenticated navigation and responsive styles.')
