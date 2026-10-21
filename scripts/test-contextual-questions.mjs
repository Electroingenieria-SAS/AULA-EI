import assert from 'node:assert/strict'
import { generateLocalQuestions } from '../studio/src/course-editor/local-question-generator.js'

// Independently verifiable topic-specific statements. No guessing outside pages.
const passages=[
  'La inspección visual permite identificar anomalías en las máquinas antes de ponerlas en funcionamiento.',
  'El registro de incidentes sirve para documentar los sucesos y mantener la trazabilidad de las investigaciones.',
  'La lista de verificación tiene como objetivo comprobar las condiciones mínimas de seguridad del área.',
  'La señalización de emergencia facilita reconocer las rutas de evacuación disponibles en el edificio.',
  'El mantenimiento preventivo busca reducir fallas inesperadas y mejorar la disponibilidad de los equipos.',
  'Los residuos peligrosos deben almacenarse en recipientes resistentes y debidamente señalizados.',
  'El supervisor debe registrar los hallazgos detectados durante la inspección y comunicarlos al equipo.',
  'Los colaboradores deben reportar las condiciones inseguras antes de comenzar la jornada de trabajo.',
  'Las herramientas eléctricas requieren una revisión visual antes de iniciar las labores de reparación.',
  'Si se detecta una fuga de combustible, se debe suspender la operación y avisar al responsable del área.',
  'Cuando se identifica una anomalía en el equipo, se debe registrar la novedad antes de reanudar su uso.',
  'En caso de observar un cable deteriorado, se debe aislar el equipo y solicitar una evaluación técnica.',
  'Ante un movimiento sísmico importante, se debe proteger la cabeza y seguir las instrucciones de evacuación.',
  'La manipulación incorrecta de cargas puede causar lesiones musculares y accidentes por pérdida de equilibrio.',
  'La acumulación de residuos puede provocar obstrucciones en las rutas destinadas para emergencias.',
  'La falta de señalización genera dificultades de orientación durante las evacuaciones preventivas.',
  'El manejo inadecuado de sustancias químicas ocasiona exposición a materiales peligrosos durante la jornada.',
  'La seguridad industrial se define como el conjunto de medidas orientadas a prevenir accidentes laborales.',
  'La trazabilidad se refiere a la capacidad de reconstruir las etapas de un proceso con sus respectivos registros.',
  'El riesgo laboral es la posibilidad de que una condición produzca un daño durante la realización del trabajo.',
  'La acción correctiva consiste en eliminar la causa de una no conformidad detectada para evitar su repetición.',
]
const pages=passages.map((text,i)=>({page:i+1,text}))
const questions=generateLocalQuestions(pages,{maxQuestions:30})
assert.ok(questions.length>=12,'Generate a useful topical exam from an instructive PDF')
const kinds = new Set(questions.map(q=>q.kind))
for(const kind of ['Función','Procedimiento','Situación','Consecuencia','Concepto']) {
  assert.ok(kinds.has(kind),`Expected question kind: ${kind}. Got: ${[...kinds]}`)
}
for(const q of questions){
  assert.ok(!/cu[aá]l(?:es)? (?:de estas )?afirmaci[oó]n(?:es)? aparece/i.test(q.prompt))
  assert.ok(!/seg[uú]n la diapositiva.*aparece en el material/i.test(q.prompt))
  assert.ok(q.prompt.includes('¿') && q.prompt.endsWith('?'))
  assert.equal(q.options.length,4)
  assert.equal(new Set(q.options.map(x=>x.toLocaleLowerCase('es'))).size,4)
  assert.equal(q.selected,false)
  assert.ok(passages[q.page-1].startsWith(q.sourceExcerpt),'Evidence must come verbatim from the cited PDF slide')
  assert.ok(q.sourceExcerpt.includes(q.options[q.correctIndex]),'Correct answer must be sourced to the cited slide')
  assert.ok(q.kind && q.difficulty)
  const outside=q.options.filter((_,i)=>i!==q.correctIndex)
  assert.ok(outside.every(x=>passages.some(sentence=>sentence.includes(x))),'Distractors must also appear in source material')
}
const incident=questions.find(q=>q.prompt.includes('fuga de combustible'))
assert.ok(incident && incident.options[incident.correctIndex].includes('suspender la operación'),'Conditional scenario must retain its actual procedure')
const inspection=questions.find(q=>q.prompt.includes('inspección visual'))
assert.ok(inspection && inspection.options[inspection.correctIndex].includes('identificar anomalías'))
assert.deepEqual(generateLocalQuestions([{page:1,text:'Una imagen sin texto útil'}]),[])
const oneFact=generateLocalQuestions([{page:1,text:'La inspección visual permite identificar anomalías en las máquinas antes de operarlas.'}])
assert.equal(oneFact.length,1,'Keep answerable sentence as editable draft even without other alternatives')
assert.equal(oneFact[0].options.filter(Boolean).length,1,'Do not fabricate plausible distractors from a single sentence')
assert.ok(generateLocalQuestions(pages,{maxQuestions:4}).length<=4)
console.log('Contextual grounded PDF questions: OK ('+questions.length+' questions, kinds '+[...kinds].join(', ')+')')
