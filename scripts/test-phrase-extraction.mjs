import assert from 'node:assert/strict'
import { generateLocalQuestions } from '../studio/src/course-editor/local-question-generator.js'
import { extractPhraseFacts } from '../studio/src/course-editor/local-question-phrases.js'
import { prepareCanvaQuestions } from '../studio/src/course-editor/canva-import-model.js'
import { readFileSync } from 'node:fs'

const slides=[
 {page:1,text:'Elementos de protección personal\n• Casco\n• Guantes de nitrilo\n• Botas de seguridad'},
 {page:2,text:'Tipos de riesgo: físico, químico y biológico'},
 {page:3,text:'Requisitos de publicación\n1. Duplicar el diseño\n2. Cambiar los datos en la copia\n3. Conservar la plantilla original'},
 {page:4,text:'Almacenamiento de residuos: recipientes resistentes, señalización y separación de materiales'},
 {page:5,text:'Conductas prohibidas\n- No utilizar cables deteriorados\n- Evitar manipular equipos energizados'},
 {page:6,text:'Procedimiento de emergencia: activar alarma, dirigirse al punto de encuentro y reportar novedades'},
]
const raw=extractPhraseFacts(slides)
assert.ok(raw.length>=8,'Debe analizar listas y oraciones breves línea por línea')
assert.ok(raw.some(f=>f.answer==='Casco' && f.theme==='Elementos de protección personal'))
assert.ok(raw.some(f=>f.kind==='Enumeración' && f.prompt.includes('Tipos de riesgo')))
assert.ok(raw.some(f=>f.answer.includes('Duplicar el diseño') && f.prompt.includes('Requisitos de publicación')))
assert.ok(raw.some(f=>f.prompt.includes('Conductas prohibidas')))
for(const q of raw){
 assert.ok(q.sourceExcerpt.toLocaleLowerCase('es').includes(q.answer.toLocaleLowerCase('es')))
 assert.equal(q.page>=1,true)
}
const questions=generateLocalQuestions(slides,{maxQuestions:30})
assert.ok(questions.length>=5, 'Debe proponer preguntas incluso sin suficientes distractores')
assert.ok(questions.every(q=>q.options.length===4 && q.options[q.correctIndex].trim()))
assert.ok(questions.every(q=>q.selected===false))
assert.ok(questions.some(q=>q.options.some(x=>!x.trim())),'Las alternativas faltantes deben quedar vacías, no inventadas')
assert.ok(questions.some(q=>q.prompt.includes('Tipos de riesgo')))
assert.ok(questions.some(q=>q.prompt.includes('Elementos de protección personal')))
const normalized=prepareCanvaQuestions(questions)
assert.equal(normalized.length,questions.length,'Los borradores incompletos no se deben descartar')
assert.ok(normalized.some(q=>q.missingOptions))
assert.ok(normalized.every(q=>q.options.length===4))
const isolated=generateLocalQuestions([{page:1,text:'Prevención\n• Casco'}])
assert.equal(isolated.length,1,'Una sola frase útil debe producir un borrador editable')
assert.equal(isolated[0].options.filter(Boolean).length,1)
assert.deepEqual(generateLocalQuestions([{page:1,text:'24'}]),[])
const editor=readFileSync('studio/src/course-editor/AiExamAssistant.jsx','utf8')
const importer=readFileSync('studio/src/course-editor/CanvaImportWizard.jsx','utf8')
assert.ok(editor.includes('incompleteCount'))
// Validate exact comparison exists in the validator, without depending on a component ref.
assert.ok(editor.includes('new Set(q.options.map(normalize))') || editor.includes('new Set(q.options.map('))
assert.ok(importer.includes('Requiere completar alternativas'))
console.log('Phrase-by-phrase PDF analysis and editable partial questions: OK')
