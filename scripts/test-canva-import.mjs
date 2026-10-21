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
assert.ok(coach.includes('Conectar Canva') && coach.includes('sin pedirte el PDF manualmente'), 'Canva export requires an authorized account rather than a public iframe')

assert.ok(coach.includes('active: false'), 'Suggested questions must start inactive')
assert.ok(coach.includes('.update({ active: true })'), 'Questions must activate after saving options')
assert.ok(coach.includes('setForm') === false, 'The assistant must not bypass the manual editor')
assert.ok(pdfClient.includes("analyze-course-pdf"), 'Reuse the protected backend')
assert.ok(pdfClient.includes('consent: true'), 'Explicit consent must be required')
const builderCss = readFileSync('studio/src/styles/courses.css','utf8')
const canvaBackend=readFileSync('supabase/functions/analyze-course-pdf/index.ts','utf8')
const canvaConnect=readFileSync('supabase/functions/aula-canva-connect/index.ts','utf8')
const oauthMigration=readFileSync('supabase/migrations/20261021210000_canva_oauth_connections.sql','utf8')
assert.ok(coach.includes("canvaUrl: validCanvaUrl"), 'The link must reach the AI invocation, not only its viewer')
assert.ok(coach.includes("'Analizar enlace de Canva'"), 'The link-only action must be enabled')
assert.ok(coach.includes("(!file && !validCanvaUrl)"), 'Require either a validated link or PDF')
assert.ok(pdfClient.includes('canva_url: normalizedCanva'), 'Send the URL to a protected backend when no PDF is attached')
assert.ok(canvaBackend.includes('exportCanvaPdf(identity.user.id,link,securityClient)'), 'Analyze PDF exported from connected Canva account')
assert.ok(canvaBackend.includes('design:content:read') || canvaConnect.includes('design:content:read'), 'Official Canva read scope required')
assert.ok(canvaConnect.includes('code_challenge_method:"S256"'), 'Must use OAuth with PKCE')
assert.ok(canvaConnect.includes('crypto.subtle.encrypt'), 'Canva tokens must be encrypted before storage')
assert.ok(oauthMigration.includes('enable row level security'), 'Token storage must have RLS')
assert.ok(oauthMigration.includes('revoke all'), 'No client-side access to tokens')
assert.ok(builderCss.includes('.course-authoring-header{position:static;top:auto;'), 'The course header must scroll naturally')
console.log('Canva source-link analysis wiring, protected OAuth and non-sticky header: OK')
