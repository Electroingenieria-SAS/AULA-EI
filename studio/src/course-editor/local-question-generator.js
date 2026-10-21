// Preguntas contextuales construidas localmente a partir de relaciones
// explícitas del PDF. Sin LLM, servicios externos ni contenido inventado.
// Los distractores también proceden de los textos de estudio y requieren revisión.
const tidy = (value) => String(value || '').normalize('NFKC')
  .replace(/[\u200b-\u200f]/g, '').replace(/\s+/g, ' ').trim()
const keyFor = (value) => tidy(value).toLocaleLowerCase('es')
  .replace(/[^a-záéíóúüñ\d]+/g, ' ').trim()
const trimEnd = (s) => tidy(s).replace(/[.!?:;,\s]+$/g, '').trim()
const goodText = (s, min=12, max=190) =>
  Boolean(s && s.length >= min && s.length <= max &&
    /[a-záéíóúñ]{4}/i.test(s) &&
    !/^(https?:|www\.|\d{1,3}[.) -]|p[aá]gina\s+\d)/i.test(s))

function sentences(text) {
  const raw = String(text || '').replace(/\r/g,'\n')
  const lines = raw.split(/\n+/).map(tidy).filter(Boolean)
  const assembled = []
  let pending = ''
  for (const line of lines) {
    if (!pending) { pending = line; continue }
    // Short fragments often come from PDF line wraps; preserve complete clauses.
    if (pending.length < 32 && !/[.!?;:]$/.test(pending)) pending += ' ' + line
    else { assembled.push(pending); pending = line }
  }
  if (pending) assembled.push(pending)
  return assembled.flatMap(line => line.split(/(?<=[.!?;])\s+(?=[A-ZÁÉÍÓÚÜÑ¿¡])/))
    .map(s=>trimEnd(s.replace(/^[•*\-–\d.)\s]+/,'').replace(/^\s*[—–]\s*/,'')))
    .filter(s=>goodText(s,25,340))
}

function factFrom(sentence, page) {
  const s = trimEnd(sentence)
  let match
  const put = (kind, theme, answer, prompt, group='practice', difficulty='Comprensión') => {
    theme = trimEnd(theme)
    answer = trimEnd(answer)
    if (!goodText(theme,4,110) || !goodText(answer,10,190)) return null
    if (keyFor(theme) === keyFor(answer) || keyFor(answer).includes(keyFor(theme))) return null
    return { page, kind, theme, answer, prompt, group, difficulty,
      sourceExcerpt: sentence }
  }
  // Condition and contextual decision: exact action in response to given situation.
  match = s.match(/^(?:si|cuando|en caso de|ante)\s+(.{8,115}?),\s*(?:se debe|deben|debe|es necesario|hay que|se recomienda|corresponde)\s+(.{10,190})$/i)
  if (match) return put('Situación',match[1],match[2],
    `Si ${match[1].replace(/^(se|ocurre)\b/i,'$1')}, ¿qué actuación establece el material?`,
    'practice','Aplicación')
  match = s.match(/^antes de\s+(.{8,110}?),?\s*(?:se debe|deben|debe|es necesario|hay que|corresponde)\s+(.{10,190})$/i)
  if (match) return put('Secuencia',match[1],match[2],
    `¿Qué debe hacerse antes de ${match[1]}?`, 'practice','Aplicación')
  match = s.match(/^(?:se debe|deben|debe|es necesario|hay que)\s+(.{10,190}?)\s+antes de\s+(.{8,110})$/i)
  if (match) return put('Secuencia',match[2],match[1],
    `Antes de ${match[2]}, ¿qué acción corresponde realizar?`, 'practice','Aplicación')
  // Instruction with explicit intended result.
  match = s.match(/^(?:se debe|deben|debe|es necesario|hay que|utiliza|usa|verifica|revisa|guarda|registra|comparte|entrega|duplica|copia|confirma|identifica|exporta|selecciona)\s+(.{12,180}?)\s+para\s+(.{8,110})$/i)
  if (match) return put('Aplicación',match[2],match[1],
    `¿Qué acción ayuda a ${match[2]} según el procedimiento?`, 'practice','Aplicación')
  match = s.match(/^para\s+(.{8,110}?),\s*(?:se debe|deben|debe|es necesario|hay que|se recomienda|es indispensable)\s+(.{10,190})$/i)
  if (match) return put('Aplicación',match[1],match[2],
    `¿Qué medida indica el material para ${match[1]}?`, 'practice','Aplicación')
  // Causality, risk and prevention; never infer the causes ourselves.
  match = s.match(/^(.{8,130}?)\s+(?:porque|debido a que|ya que|puesto que)\s+(.{12,190})$/i)
  if (match) return put('Causa',match[1],match[2],
    `¿Por qué ${match[1].toLocaleLowerCase('es')}?`, 'causes','Análisis')
  match = s.match(/^(.{8,125}?)\s+(?:puede ocasionar|puede provocar|puede causar|puede generar|genera|provoca|ocasiona)\s+(.{12,170})$/i)
  if (match) return put('Consecuencia',match[1],match[2],
    `¿Qué consecuencia se relaciona con ${match[1].toLocaleLowerCase('es')}?`, 'effects','Análisis')
  match = s.match(/^(.{8,130}?)\s+(?:ayuda a evitar|permite prevenir|contribuye a evitar|reduce el riesgo de|previene|evita)\s+(.{10,170})$/i)
  if (match) return put('Prevención',match[1],match[2],
    `¿Qué riesgo o problema busca prevenir ${match[1].toLocaleLowerCase('es')}?`, 'effects','Aplicación')
  // Functions, objectives and instructional reasoning.
  match = s.match(/^(.{6,120}?)\s+(?:sirve para|permite|tiene como objetivo|tiene como finalidad|tiene como propósito|busca|contribuye a|ayuda a|facilita|se utiliza para)\s+(.{12,190})$/i)
  if (match) return put('Función',match[1],match[2],
    `¿Cuál es la finalidad de ${match[1].toLocaleLowerCase('es')}?`, 'practice','Comprensión')
  // Definition (after the more specific patterns above).
  match = s.match(/^(.{5,100}?)\s+(?:se define como|se refiere a|consiste en|es|son)\s+(.{15,190})$/i)
  if (match) return put('Concepto',match[1],match[2],
    `¿Qué significa «${match[1]}» en el contexto de la capacitación?`, 'concepts','Comprensión')
  // Explicit requirement linked to a named subject.
  match = s.match(/^(.{6,110}?)\s+(?:debe|deben|tiene que|tienen que|requiere|requieren)\s+(.{13,190})$/i)
  if (match) return put('Procedimiento',match[1],match[2],
    `¿Qué exige el procedimiento respecto a ${match[1].toLocaleLowerCase('es')}?`, 'practice','Aplicación')
  return null
}

function factsFromPages(pages) {
  const all=[]
  const seen=new Set()
  for (const page of (Array.isArray(pages) ? pages : [])) {
    if(!Number.isInteger(page?.page) || page.page<1)continue
    for(const sentence of sentences(page.text)) {
      const fact=factFrom(sentence,page.page)
      if(!fact)continue
      const id=keyFor(fact.theme)+'|'+keyFor(fact.answer)
      if(seen.has(id))continue
      seen.add(id)
      all.push(fact)
    }
  }
  return all
}

function alternatives(correct, facts) {
  const pool=facts.filter(f=>f.group===correct.group && f!==correct)
    .filter(f=>keyFor(f.answer)!==keyFor(correct.answer))
    .filter(f=>!keyFor(f.answer).includes(keyFor(correct.answer)) &&
      !keyFor(correct.answer).includes(keyFor(f.answer)))
    // Other topics, first; then same page topics if needed.
    .sort((a,b)=>Number(a.page===correct.page)-Number(b.page===correct.page))
  const picked=[]
  const used=new Set([keyFor(correct.answer)])
  for(const f of pool){
    const key=keyFor(f.answer)
    if(used.has(key))continue
    if(picked.some(p=>key.includes(keyFor(p)) || keyFor(p).includes(key)))continue
    used.add(key)
    picked.push(f.answer)
    if(picked.length>=3)break
  }
  return picked
}

export function generateLocalQuestions(pages, {maxQuestions=20}={}) {
  const facts=factsFromPages(pages)
  const usable=facts.map(f=>({...f,distractors:alternatives(f,facts)}))
    .filter(f=>f.distractors.length===3)
  // Prioritise practical/causal relationships over definitions, then rotate pages.
  const ranked=usable.sort((a,b)=>{
    const weight={Situación:0,Secuencia:1,Aplicación:2,Prevención:3,Causa:4,Consecuencia:5,Procedimiento:6,Función:7,Concepto:8}
    return (weight[a.kind]??9)-(weight[b.kind]??9) || a.page-b.page
  })
  const output=[], pageCount=new Map(), usedPrompt=new Set()
  for(const f of ranked) {
    if(output.length>=maxQuestions)break
    if((pageCount.get(f.page)||0)>=3 || usedPrompt.has(keyFor(f.prompt)))continue
    const correctIndex=output.length%4
    const options=[...f.distractors]
    options.splice(correctIndex,0,f.answer)
    output.push({
      page:f.page,prompt:f.prompt,options,correctIndex,
      sourceExcerpt:f.sourceExcerpt,kind:f.kind,difficulty:f.difficulty,selected:false,
    })
    usedPrompt.add(keyFor(f.prompt))
    pageCount.set(f.page,(pageCount.get(f.page)||0)+1)
  }
  return output
}

export function extractStudyNotes(pages) {
  return (Array.isArray(pages) ? pages : [])
    .filter(p=>tidy(p.text).length>=24)
    .slice(0,40).map(p=>({
      page:p.page,
      title:tidy((p.text||'').split(/\n/).find(line=>tidy(line).length>8) || `Diapositiva ${p.page}`).slice(0,140),
      explanation:tidy(p.text).slice(0,3000),
      takeaway:'Transcripción extraída del PDF, sin interpretación automática. Revisar contra la presentación original.',
    }))
}
