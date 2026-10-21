import assert from 'node:assert/strict'
import { normalizeCanvaEmbedUrl } from '../src/canva-embed.js'
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
console.log('Canva embedding + import model: OK')
