// Answer choices derived locally from the same PDF. No remote API or LLM.
// Other-topic choices may be plausible but must be reviewed by the trainer.

const norm = (s) => String(s || '').normalize('NFKC').replace(/\s+/g,' ').trim()
const code = (s) => norm(s).toLocaleLowerCase('es').replace(/[^a-záéíóúüñ0-9]+/g,' ').trim()
const strip = (s) => norm(s).replace(/[.,;:]+$/,'').trim()
const unique = (items) => items.filter((s,i,a)=>a.findIndex(x=>code(x)===code(s))===i)

function formatList(items) {
  if(items.length===1)return items[0]
  if(items.length===2)return items.join(' y ')
  return items.slice(0,-1).join(', ')+' y '+items.at(-1)
}

function segments(answer) {
  const value=strip(answer)
  // Explicit slide enumerations, never split an entire procedural clause
  // unless commas or semicolons separate at least three distinct short elements.
  const parts=value.split(/\s*[,;]\s*|\s+\by\b\s+/i).map(strip).filter(Boolean)
  return parts.length>=3 && parts.every(x=>x.length>=3 && x.length<=68)
    ? unique(parts) : []
}

// A list whose correct answer is the entire set can have three provably
// incomplete alternatives by withholding one different item per option.
// "Todos" in the question makes those subsets unequivocally wrong.
function incompleteListChoices(items) {
  if(items.length<3)return []
  const picked=[]
  for(const omit of [items.length-1,0,Math.floor(items.length/2),1]){
    if(picked.length===3)break
    const subset=items.filter((_,i)=>i!==omit)
    const alt='Solo '+formatList(subset)
    if(!picked.some(x=>code(x)===code(alt)))picked.push(alt)
  }
  return picked
}

export function mergeSlideEnumerations(facts) {
  const clusters=new Map()
  for(const fact of facts) {
    if(fact.kind!=='Elemento' || !fact.theme || code(fact.theme)==='la capacitación')continue
    const key=fact.page+'|'+code(fact.theme)
    if(!clusters.has(key))clusters.set(key,[])
    clusters.get(key).push(fact)
  }
  const aggregates=[]
  const absorbed=new Set()
  for(const group of clusters.values()) {
    const different=group.filter((item,i)=>group.findIndex(x=>code(x.answer)===code(item.answer))===i)
    if(different.length<3)continue
    const items=different.slice(0,8).map(item=>strip(item.answer))
    const answer=formatList(items)
    if(answer.length>250)continue
    const first=group[0]
    aggregates.push({
      page:first.page,kind:'Enumeración',theme:first.theme,answer,
      group:'lists',difficulty:'Comprensión',listItems:items,
      sourceExcerpt:group.map(item=>item.sourceExcerpt).join('\n').slice(0,500),
      prompt:`¿Qué opción reúne TODOS los elementos indicados en «${first.theme}»?`,
      selected:false,
    })
    different.forEach(item=>absorbed.add(item))
  }
  return {
    facts:[...facts.filter(item=>!absorbed.has(item)),...aggregates],
    listCount:aggregates.length,
  }
}

function collectAlternatives(fact,facts) {
  const base=code(fact.answer)
  const other=facts.filter(item=>item!==fact
    && code(item.theme)!==code(fact.theme)
    && code(item.answer)!==base
    && !code(item.answer).includes(base)
    && !base.includes(code(item.answer))
    && !code(fact.sourceExcerpt).includes(code(item.answer))
    && norm(item.answer).length<=250
    && norm(item.answer).length>=3)
  // Prefer answers from the same pedagogical category (e.g. procedures).
  // Never choose alternatives attached to the same topic; several of them
  // could also be valid answers to the same question.
  const ranked=other.map(item=>{
    const size=Math.abs(norm(fact.answer).length-norm(item.answer).length)
    const score=(item.group===fact.group?100:0)
      +(item.kind===fact.kind?20:0)
      +(item.page===fact.page?-10:0)
      -Math.min(70,size)*0.35
    return {item,score}
  }).sort((a,b)=>b.score-a.score || a.item.page-b.item.page)
  const out=[]
  for(const {item} of ranked) {
    const answer=strip(item.answer)
    const key=code(answer)
    if(out.some(x=>code(x)===key || code(x).includes(key) || key.includes(code(x))))continue
    out.push(answer)
    if(out.length===3)break
  }
  return out
}

export function generateAbcdOptions(fact,facts,correctIndex=0) {
  let items=Array.isArray(fact.listItems)?fact.listItems:segments(fact.answer)
  let prompt=fact.prompt
  let answer=strip(fact.answer)
  let choices=[]
  let strategy='source'
  const complete=items.length>=3 && (fact.kind==='Enumeración' || Array.isArray(fact.listItems))
  if(complete){
    // Rephrase so all subsets are incorrect, not merely incomplete but true.
    prompt=`¿Cuál opción reúne TODOS los elementos mencionados en «${fact.theme}»?`
    answer=formatList(items)
    choices=incompleteListChoices(items)
    strategy='complete-list'
  }
  if(choices.length<3){
    const borrowed=collectAlternatives(fact,facts)
    choices=unique([...choices,...borrowed]).filter(v=>code(v)!==code(answer)).slice(0,3)
    if(choices.length>=3 && strategy!=='complete-list')strategy='other-topics'
  }
  // If the PDF supplies too little material, leave the impossible alternatives
  // blank rather than inventing answers and incorrectly claiming they are facts.
  while(choices.length<3)choices.push('')
  const options=[...choices]
  options.splice(correctIndex,0,answer)
  return {prompt,options,correctIndex,missingOptions:options.some(v=>!v.trim()),
    optionStrategy:strategy,reviewRequired:true}
}
