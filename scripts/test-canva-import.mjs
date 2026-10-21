import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { normalizeCanvaEmbedUrl } from '../src/canva-embed.js'
import { generateLocalQuestions, extractStudyNotes } from '../studio/src/course-editor/local-question-generator.js'

assert.equal(
  normalizeCanvaEmbedUrl('https://www.canva.com/design/DAGabc1234/t0ken333/edit'),
  'https://www.canva.com/design/DAGabc1234/t0ken333/view?embed',
)
assert.equal(normalizeCanvaEmbedUrl('https://fake.canva.com.evil.org/design/DAGabc1234/view'), '')

const pages = [
  { page:1, text:'La inspección visual permite identificar anomalías en las máquinas antes de operarlas.' },
  { page:2, text:'Los residuos peligrosos deben depositarse en recipientes resistentes y debidamente señalizados.' },
  { page:3, text:'El personal debe informar los incidentes al responsable antes de iniciar las acciones correctivas.' },
  { page:4, text:'El aseo y el orden de las instalaciones ayudan a evitar tropiezos y otros accidentes laborales.' },
  { page:5, text:'La revisión final sirve para registrar los resultados obtenidos y comprobar el cierre de cada actividad.' },
]
const questions=generateLocalQuestions(pages)
assert.ok(questions.length>=4, 'Debe sugerir preguntas a partir de un PDF con texto suficiente.')
for(const question of questions) {
  assert.equal(question.options.length,4)
  assert.ok(question.page>=1 && question.page<=5)
  assert.equal(question.selected,false)
  assert.equal(question.sourceExcerpt,question.options[question.correctIndex], 'Respuesta correcta debe ser texto literal del PDF.')
  assert.ok(pages.find(p=>p.page===question.page)?.text.includes(question.sourceExcerpt))
  assert.equal(new Set(question.options).size,4)
}
assert.deepEqual(generateLocalQuestions([{page:1,text:'Texto corto'}]),[], 'No inventar preguntas cuando falta información')
const notes=extractStudyNotes(pages)
assert.equal(notes.length,5)
assert.ok(notes[0].explanation.includes('inspección visual'))

const exam=readFileSync('studio/src/course-editor/AiExamAssistant.jsx','utf8')
const local=readFileSync('studio/src/course-editor/local-pdf-analysis.js','utf8')
const importWizard=readFileSync('studio/src/course-editor/CanvaImportWizard.jsx','utf8')
const builder=readFileSync('studio/src/course-editor/ExamBuilder.jsx','utf8')
assert.ok(exam.includes('Sugerencias') || exam.includes('sugeridas'))
assert.ok(builder.includes('Sugerir desde PDF'))
assert.ok(exam.includes("await import('./local-pdf-analysis.js')"))
assert.ok(importWizard.includes("await import('./local-pdf-analysis.js')"))
assert.ok(local.includes("pdfjs-dist/build/pdf.mjs"))
assert.ok(local.includes('getTextContent()'))
assert.ok(!exam.includes('OPENAI_API_KEY') && !exam.includes('aula-canva-connect'))
assert.ok(!importWizard.includes('analyze-course-pdf'))
assert.ok(exam.includes('active: false') && exam.includes('.update({ active: true })'))
assert.ok(!exam.includes('canvaUrl') && !exam.includes('window.location.assign'))
console.log('PDF.js local, preguntas verificables y edición manual: OK')
