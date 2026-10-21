import assert from 'node:assert/strict'
import { generateLocalQuestions } from '../studio/src/course-editor/local-question-generator.js'
import { prepareCanvaQuestions } from '../studio/src/course-editor/canva-import-model.js'

const inline=[{page:1,text:'Tipos de riesgo: físico, químico y biológico'}]
const group=generateLocalQuestions(inline)
assert.equal(group.length,1,'One three-element list should provide an A-D question')
const g=group[0]
assert.equal(g.options.length,4)
assert.ok(!g.missingOptions,'List subsets are provably incomplete distractors')
assert.ok(g.prompt.includes('TODOS'))
assert.equal(g.options[g.correctIndex],'físico, químico y biológico')
assert.equal(g.options.filter(Boolean).length,4)
assert.equal(new Set(g.options.map(s=>s.toLowerCase())).size,4)
assert.ok(g.options.filter((_,i)=>i!==g.correctIndex).every(x=>x.startsWith('Solo ')))
assert.equal(g.optionStrategy,'complete-list')

const bullets=[{page:2,text:'Elementos de protección personal\n• Casco\n• Guantes de nitrilo\n• Botas de seguridad'}]
const questions=generateLocalQuestions(bullets)
assert.ok(questions.some(q=>q.prompt.includes('TODOS') && q.prompt.includes('Elementos de protección personal')))
const b=questions.find(q=>q.prompt.includes('TODOS'))
assert.equal(b.options.filter(Boolean).length,4)
assert.ok(b.options[b.correctIndex].includes('Casco') && b.options[b.correctIndex].includes('Botas'))

const learning=[
{page:1,text:'La inspección visual permite identificar anomalías en las máquinas antes de operarlas.'},
{page:2,text:'El mantenimiento preventivo busca reducir fallas inesperadas y mejorar la disponibilidad.'},
{page:3,text:'Los trabajadores deben reportar condiciones inseguras antes de iniciar la jornada.'},
{page:4,text:'La lista de verificación tiene como objetivo comprobar las condiciones de seguridad.'},
{page:5,text:'La señalización de emergencia facilita reconocer las rutas de evacuación.'},
]
const proposed=generateLocalQuestions(learning)
assert.ok(proposed.length>=4)
assert.ok(proposed.filter(q=>q.options.every(Boolean)).length>=3,'Other explicit facts should supply distractors')
for(const q of proposed.filter(q=>q.options.every(Boolean))){
 assert.equal(new Set(q.options.map(s=>s.toLowerCase())).size,4)
 assert.ok(q.correctIndex>=0 && q.correctIndex<=3)
 assert.ok(q.sourceExcerpt.includes(q.options[q.correctIndex]))
 assert.equal(q.reviewRequired,true)
}
const first=prepareCanvaQuestions(proposed)
assert.equal(first.length,proposed.length)
assert.ok(first.every(q=>q.options.length===4 && Number.isInteger(q.correctIndex)))
assert.ok(first.every(q=>q.reviewRequired))

const sparse=generateLocalQuestions([{page:1,text:'La inspección visual permite identificar anomalías en máquinas.'}])
assert.equal(sparse.length,1)
assert.equal(sparse[0].options.filter(Boolean).length,1,
  'On insufficient material, remain honest and retain editable partial options')
console.log('Auto-generated A-D choices, list distractors, selected correct answer and safe sparse fallback: OK')
