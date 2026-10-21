import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { normalizeCanvaEmbedUrl, findCourseCanvaPresentation } from '../src/canva-embed.js'
import { prepareCanvaQuestions, prepareCanvaPages } from '../studio/src/course-editor/canva-import-model.js'

assert.equal(normalizeCanvaEmbedUrl('https://www.canva.com/design/DAGabc1234/t0ken333/edit?utm_source=x'), 'https://www.canva.com/design/DAGabc1234/t0ken333/view?embed')
assert.equal(normalizeCanvaEmbedUrl('<iframe src="https://www.canva.com/design/DAGabc1234/t0ken333/view?embed" width="100%"></iframe>'), 'https://www.canva.com/design/DAGabc1234/t0ken333/view?embed')
assert.equal(normalizeCanvaEmbedUrl('https://www.canva.com/design/DAGabc1234/view?embed'), 'https://www.canva.com/design/DAGabc1234/view?embed')
for (const input of ['https://canva.com.evil.net/design/DAGabc1234/view', 'javascript:alert(1)', 'https://evil.com/', 'https://www.canva.com/templates/foo', 'http://www.canva.com/design/DAGabc1234']) {
  assert.equal(normalizeCanvaEmbedUrl(input), '')
}
const questions = prepareCanvaQuestions([{page:1,prompt:'¿Qué representa el control?',options:['A','B','C','D'],correctIndex:2},{page:0,prompt:'vacío',options:['a','b'],correctIndex:5}])
assert.equal(questions.length, 1)
assert.equal(questions[0].selected, false)
const pages = prepareCanvaPages([{page:2,title:'Tema',explanation:'Texto explicativo',takeaway:'Clave'}])
assert.equal(pages[0].page, 2)
assert.equal(pages[0].title,'Tema')
const editor = readFileSync('studio/src/course-editor/ExamBuilder.jsx', 'utf8')
const coach = readFileSync('studio/src/course-editor/AiExamAssistant.jsx', 'utf8')
const builder = readFileSync('studio/src/course-editor/CourseBuilder.jsx', 'utf8')
const pdfClient = readFileSync('studio/src/course-editor/analyze-pdf-client.js', 'utf8')
assert.ok(editor.includes('Sugerir con IA'), 'The author must be able to open AI suggestions from the exam')
assert.ok(editor.includes('<AiExamAssistant'), 'AI suggestions must appear on an existing course')
assert.ok(builder.includes('courseTitle={config.title}'), 'The real course title must reach the assistant')
assert.equal(findCourseCanvaPresentation([]), '')
assert.equal(findCourseCanvaPresentation([
  { blocks: [{ type:'presentation', content:{ url:'https://canva.com.evil.example/design/DAGabc1234/view' } }] },
  { blocks: [{ type:'presentation', content:{url:'https://www.canva.com/design/DAGabc1234/t0ken333/edit?foo=bar'}}] },
]), 'https://www.canva.com/design/DAGabc1234/t0ken333/view?embed')
assert.equal(findCourseCanvaPresentation([{ blocks:[{ type:'text', content: {url:'https://www.canva.com/design/DAGabc1234/view'}}]}]), '')
assert.ok(builder.includes('canvaUrl={findCourseCanvaPresentation(phases)}'), 'Import saved Canva deck into exam suggestions')
assert.ok(editor.includes('initialCanvaUrl={canvaUrl}'), 'Pass a safe initial Canva URL to assistant')
assert.ok(coach.includes('normalizeCanvaEmbedUrl(canvaUrl)'), 'The assistant must validate the pasted Canva URL')
assert.ok(coach.includes('src={validCanvaUrl}'), 'Preview must only embed normalized Canva links')
assert.ok(coach.includes('no da acceso al texto'), 'Explain why the public link cannot yield questions by itself')

assert.ok(coach.includes('active: false'), 'Suggested questions must start inactive')
assert.ok(coach.includes('.update({ active: true })'), 'Questions must activate after saving options')
assert.ok(coach.includes('setForm') === false, 'The assistant must not bypass the manual editor')
assert.ok(pdfClient.includes("analyze-course-pdf"), 'Reuse the protected backend')
assert.ok(pdfClient.includes('consent: true'), 'Explicit consent must be required')
console.log('Canva embedding, importing and post-creation exam suggestions: OK')
