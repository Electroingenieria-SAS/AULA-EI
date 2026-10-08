import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { analyticsView, analyticsCsv, complianceCsv, csvCell, prioritizedFindings } from '../studio/src/compliance/analytics-model.js'

const summary = { courses: [
  { course_id:'c1', course_title:'Calidad y Control', assigned:12, completed:3, completion_percent:25, exam_attempts:8, pass_percent:50, average_score:66 },
  { course_id:'c2', course_title:'Seguridad EI', assigned:9, completed:9, completion_percent:100, exam_attempts:6, pass_percent:100, average_score:91 },
  { course_id:'c3', course_title:'Capacitación pequeña', assigned:2, completed:0, completion_percent:0, exam_attempts:1, pass_percent:0, average_score:0 },
]}
const questions = [
  { question_id:'q1', course_id:'c1', course_title:'Calidad y Control', prompt:'Pregunta difícil', answers_count:10, error_percent:90 },
  { question_id:'q2', course_id:'c1', course_title:'Calidad y Control', prompt:'Poca muestra', answers_count:2, error_percent:100 },
  { question_id:'q3', course_id:'c2', course_title:'Seguridad EI', prompt:'Pregunta resuelta', answers_count:20, error_percent:10 },
]
const blocks = [
  { block_id:'b1', course_id:'c1', course_title:'Calidad y Control', phase_title:'Evaluación', block_title:'Video práctico', started_count:8, completed_count:1, completion_percent:12.5 },
  { block_id:'b2', course_id:'c2', course_title:'Seguridad EI', phase_title:'Inicio', block_title:'Texto', started_count:9, completed_count:9, completion_percent:100 },
]
const all = analyticsView(summary, questions, blocks)
assert.equal(all.courses.length, 3)
assert.equal(all.questions.length, 2, 'Exclude unreliable questions below sample threshold')
assert.equal(all.blocks.length, 2)
assert.deepEqual(all.findings.map((row) => row.key), ['completion:c1','question:q1','block:b1','approval:c1'])
assert.equal(all.findings.filter((f) => f.priority === 'high').length, 3)
const filtered = analyticsView(summary, questions, blocks, { courseId:'c1', search:'calidad', minimumSample:5 })
assert.equal(filtered.courses.length, 1)
assert.equal(filtered.questions.length, 1)
assert.equal(filtered.blocks.length, 1)
assert.equal(filtered.findings.length, 4)
assert.equal(analyticsView(summary, questions, blocks, {courseId:'c2'}).findings.length, 0)
assert.equal(analyticsView(summary, questions, blocks, {courseId:'no-such-course'}).findings.length, 0)
assert.equal(analyticsView(summary, questions, blocks, {search:'pequeña'}).findings.length, 0,
  'Do not flag tiny samples with arbitrary thresholds')
assert.equal(prioritizedFindings([], [], [], 5).length, 0)
assert.equal(csvCell('=cmd'), '"\'=cmd"')
assert.equal(csvCell('+SUM(1;2)'), '"\'+SUM(1;2)"')
assert.equal(csvCell('@evil'), '"\'@evil"')
assert.equal(csvCell('Normal\nline'), '"Normal line"')
assert.equal(csvCell('Texto "citado"'), '"Texto ""citado"""')
const report = analyticsCsv(filtered, new Date('2026-10-08T14:00:00.000Z'))
assert.ok(report.startsWith('\uFEFF'))
assert.ok(report.includes('Calidad y Control'))
assert.ok(!report.includes('Seguridad EI'))
assert.ok(!report.includes('user_email'), 'Aggregate report cannot export user details')
const personal = complianceCsv([{ full_name:'=2+2',email:'alguien@example.com',position_name:'Calidad',course_title:'Primer curso',compliance_state:'overdue' }])
assert.ok(personal.includes("'=2+2"), 'Protect sensitive exports against spreadsheet formula injection')
assert.ok(personal.includes('Confidencial'))

const read = async (path) => readFile(new URL('../' + path, import.meta.url), 'utf8')
const [advanced, workbench,center,panels,style,entry,packageFile] = await Promise.all([
  read('studio/src/ComplianceAdvanced.jsx'),
  read('studio/src/compliance/AnalyticsWorkbench.jsx'),
  read('studio/src/ComplianceCenter.jsx'),
  read('studio/src/compliance/CompliancePanels.jsx'),
  read('studio/src/styles/analytics-workbench.css'),
  read('src/main.jsx'),
  read('package.json'),
])
assert.match(advanced, /export \{ default as ComplianceAnalytics \} from/)
assert.match(workbench, /admin_training_analytics/)
assert.match(workbench, /admin_question_analytics/)
assert.match(workbench, /admin_content_block_analytics/)
assert.match(workbench, /minimumSample/)
assert.match(workbench, /Exportar informe CSV/)
assert.match(workbench, /Sin alertas prioritarias para estos filtros/)
assert.match(workbench, /Sin asignaciones/)
assert.match(workbench, /Sin intentos/)
assert.match(workbench, /Number\(row\.completion_percent\) < 100/,
  'Los bloques completos no deben figurar como contenidos problemáticos.')
assert.match(workbench, /Los bloques analizados alcanzan el 100 % de cierre/,
  'Los resultados sin fricción deben mostrar un estado positivo.')
assert.match(workbench, /function PercentCell/,
  'Los porcentajes deben representarse con barras y valores accesibles.')
assert.match(workbench, /analytics-evidence-track/,
  'Los listados de evidencia deben tener indicadores de magnitud.')
assert.match(workbench, /analytics-table-scroll.*role="region"/,
  'La tabla desplazable debe tener región accesible.')
assert.match(style, /analytics-evidence-list/)
assert.match(style, /analytics-percent-track/)
assert.match(style, /position:sticky;top:0/, 'La tabla debe conservar el encabezado durante el desplazamiento.')
assert.match(style, /@media\(max-width:1000px\)/)
assert.match(style, /@media\(max-width:800px\)/)
assert.match(center, /complianceStatus === 'all' \|\| row.compliance_state === complianceStatus/)
assert.match(panels, /window.confirm\('Este archivo contiene datos personales/)
assert.match(panels, /complianceCsv\(rows\)/)
assert.match(panels, /rows.length/)
assert.match(style, /@media\(max-width:520px\)/)
assert.match(style, /:focus-visible/)
assert.doesNotMatch(entry, /analytics-workbench.css/, 'Analytics style cannot inflate the initial bundle')
for (const forbidden of [/\.from\('exam_attempts'\)/,/\.from\('profiles'\)/,/\.update\(/,/\.upsert\(/,/\.insert\(/]) {
  assert.doesNotMatch(workbench, forbidden, 'Analytics must be read-only and sourced from admin RPC')
}
assert.ok(JSON.parse(packageFile).scripts['test:actionable-analytics'])
console.log('Phase 4: scoped analytics, reliable sample thresholds, dashboard and confidential exports verified.')
