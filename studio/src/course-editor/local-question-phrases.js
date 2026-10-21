// Local rule-based extraction of training statements, short phrases and lists.
// No AI endpoint, network request, fabricated training fact or invented distractor.

const normal = (value) => String(value ?? '').normalize('NFKC')
  .replace(/[\u200b-\u200f]/g, '').replace(/\s+/g, ' ').trim()
const strip = (value) => normal(value).replace(/[\s.,;:!?]+$/g, '').trim()
const signature = (value) => normal(value).toLocaleLowerCase('es')
  .replace(/[^a-záéíóúüñ0-9]+/g, ' ').trim()
const meaningful = (value, min = 4) => strip(value).length >= min
  && /[a-záéíóúñ]{3}/i.test(strip(value))
const boilerplate = (value) => /^(?:https?:|www\.|p[aá]g(?:ina)?\.?\s*\d+|\d{1,3}\s*\/\s*\d{1,3}|©|todos los derechos reservados)/i.test(value)

const BULLET = /^\s*(?:[•●▪◦‣✓✔☑]\s*|[-–—*]\s+|\d{1,2}[.)]\s+|[a-z][.)]\s+)/i
const preamble = /^\s*(?:t[ií]tulo|contenido|temario|introducci[oó]n|objetivos|resumen)\s*:?\s*$/i
const actionVerb = /\b(?:debe|deben|permite|puede|sirve|consiste|significa|es|son|requiere|tiene|incluye|comprende|genera|produce|evita|previene|identifica|corresponde|ayuda|se debe|se recomienda)\b/i

function splitIntoStatements(raw) {
  return String(raw || '').replace(/\r/g, '\n')
    .split(/\n+/).flatMap(rawLine => rawLine
      .split(/(?<=[.!?;])\s+(?=[A-ZÁÉÍÓÚÜÑ¿¡])/))
    .map(line => line.trim()).filter(Boolean).slice(0, 220)
}
function cleanBullet(raw) {
  const bullet = BULLET.test(raw)
  return {bullet,text:strip(raw.replace(BULLET, '').replace(/^[–—]\s*/, ''))}
}
function make(page, kind, title, answer, sourceExcerpt, prompt, group='procedures', difficulty='Comprensión') {
  const subject=strip(title), evidence=normal(sourceExcerpt), response=strip(answer)
  if (!meaningful(subject) || !meaningful(response) || boilerplate(response)
    || response.length > 220 || subject.length > 115 || !evidence
    || !prompt || prompt.length > 370) return null
  // All answers must appear in the source, including punctuation-normalized cases.
  if (!signature(evidence).includes(signature(response))) return null
  return {page,kind,theme:subject,answer:response,sourceExcerpt:evidence,
    prompt,difficulty,group,selected:false}
}
function isHeading(text, isFirst) {
  if (!meaningful(text,5) || text.length>76 || boilerplate(text)) return false
  if (/[.!?,;:]$/.test(text)) return false
  if (actionVerb.test(text) && !isFirst) return false
  const words=text.split(/\s+/)
  return words.length<=8 && (isFirst || words.length<=6)
}
function fromPair(page, head, text, evidence) {
  const name=strip(head), meaning=strip(text)
  if(!meaningful(name,4) || !meaningful(meaning,7)) return null
  const isList=/[,;]|\s+y\s+/i.test(meaning)
  const kind=isList?'Enumeración':'Concepto'
  const prompt=isList
    ? `¿Qué elementos o acciones se mencionan en «${name}»?`
    : `¿Qué se establece sobre «${name}» en la capacitación?`
  return make(page,kind,name,meaning,evidence,prompt,
    isList?'items':'concepts','Comprensión')
}
function fromInstruction(page, item, heading) {
  const line=strip(item), context=strip(heading)
  if(!meaningful(line,12)) return null
  const anchor=context || 'la capacitación'
  let match
  // Short instructions should still produce a content-specific question.
  match=line.match(/^(?:antes de|previo a)\s+(.{6,100}?),?\s*(?:se debe|deben|debe|hay que|es necesario|realizar|verificar)\s+(.{8,170})$/i)
  if(match)return make(page,'Secuencia',match[1],match[2],item,
    `Antes de ${strip(match[1])}, ¿qué acción corresponde realizar?`,'procedures','Aplicación')
  match=line.match(/^(?:no|nunca|prohibido|evitar)\s+(.{8,180})$/i)
  if(match)return make(page,'Prevención',anchor,match[1],item,
    `¿Qué conducta debe evitarse en relación con «${anchor}»?`,'procedures','Aplicación')
  match=line.match(/^(?:utilizar|usar|mantener|verificar|revisar|registrar|reportar|aplicar|proteger|identificar|conservar|guardar|confirmar|comunicar|clasificar|depositar|asegurar|implementar|realizar|emplear|llevar|activar|desactivar|notificar|completar)\s+.{7,175}$/i)
  if(match)return make(page,'Medida práctica',anchor,line,item,
    `¿Qué medida concreta se indica dentro de «${anchor}»?`,'procedures','Aplicación')
  if(context && meaningful(line,4) && line.length<=150)
    return make(page,'Elemento',context,line,item,
      `¿Qué elemento o indicación se incluye en «${context}»?`,'items','Comprensión')
  return null
}

export function extractPhraseFacts(pages) {
  const output=[], seen=new Set()
  for(const page of (Array.isArray(pages)?pages:[])) {
    if(!Number.isInteger(page?.page) || page.page<1)continue
    const rawLines=splitIntoStatements(page.text)
    let heading='', first=true
    const insert=(fact)=>{
      if(!fact)return
      const key=[fact.page,signature(fact.prompt),signature(fact.answer)].join('|')
      if(seen.has(key))return
      seen.add(key);output.push(fact)
    }
    for(const raw of rawLines){
      const {bullet,text}=cleanBullet(raw)
      if(!meaningful(text) || boilerplate(text) || preamble.test(text))continue
      if (!bullet && text.length<=225) {
        const pair=text.match(/^(.{4,95}?)\s*(?::\s+|\s+[—–]\s+)(.{7,195})$/)
        if(pair){insert(fromPair(page.page,pair[1],pair[2],text));heading=strip(pair[1]);first=false;continue}
      }
      if(!bullet && isHeading(text,first)){heading=text;first=false;continue}
      const scope=heading || (rawLines[0] && strip(rawLines[0])!==text ? strip(rawLines[0]) : '')
      // Do not use headings as instructions and do not create a question
      // from mere isolated words without contextual meaning.
      if(bullet || !actionVerb.test(text))insert(fromInstruction(page.page,text,scope))
      first=false
    }
  }
  return output
}
