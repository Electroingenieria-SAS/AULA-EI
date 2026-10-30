// First-party, dependency-free guided slide model shared by LMS and editor.
export function guidedSlideContent(index,total,source='canva_pdf') {
  return {
    provider:'canva_guided_pdf',
    source,
    slide_number:index+1,
    slide_total:total,
    // Legacy import marker; the player limits questions per course.
    quiz_between_slides:true,
  }
}
export function isGuidedSlide(block){
  return block?.type==='image'
    && block?.content?.provider==='canva_guided_pdf'
    && block?.content?.quiz_between_slides===true
}
export function hasGuidedSlides(phases){
  return Array.isArray(phases)
    && phases.some(phase=>(phase.blocks||[]).some(isGuidedSlide))
}

export const MAX_PRACTICE_QUESTIONS = 2
const signatureFor = blocks => (blocks || []).map(block => block.id).join('|')
const randomIndex = (length,random) => Math.min(length-1,Math.floor(Math.max(0,Math.min(0.999999999,Number(random()) || 0))*length))

// Choose two different checkpoints across both halves of the unfinished course.
export function createPracticePlan(blocks,completed = new Set(),history = [],random = Math.random) {
  const finished = completed instanceof Set ? completed : new Set(completed || [])
  const courseIds = new Set((blocks || []).map(block => block.id))
  const past = (history || []).filter(item => courseIds.has(item?.block_id) && item?.data?.practice_question_id)
  const asked = [...new Set(past.map(item => item.block_id))].slice(0,MAX_PRACTICE_QUESTIONS)
  const questionIds = [...new Set(past.map(item => item.data.practice_question_id))]
  const remaining = (blocks || []).filter(block => block?.id && block.status !== 'draft' && !finished.has(block.id)).map(block => block.id)
  const available = Math.min(MAX_PRACTICE_QUESTIONS-asked.length,remaining.length)
  const halfway = Math.ceil(remaining.length/2)
  const groups = available === 2 ? [remaining.slice(0,halfway),remaining.slice(halfway)] : available === 1 ? [remaining] : []
  return {signature:signatureFor(blocks),checkpoints:groups.map(group => group[randomIndex(group.length,random)]),asked,questionIds}
}

// Preserve the random positions on refresh and reconcile with server progress.
export function restorePracticePlan(saved,blocks,completed = new Set(),history = [],random = Math.random) {
  const fresh = createPracticePlan(blocks,completed,history,random)
  if (!saved || saved.signature !== fresh.signature || !Array.isArray(saved.checkpoints) || !Array.isArray(saved.asked)) return fresh
  const valid = new Set((blocks || []).map(block => block.id))
  const finished = completed instanceof Set ? completed : new Set(completed || [])
  const asked = [...new Set([...fresh.asked,...saved.asked.filter(id => valid.has(id))])].slice(0,MAX_PRACTICE_QUESTIONS)
  const checkpoints = [...new Set(saved.checkpoints.filter(id => valid.has(id) && (!finished.has(id) || asked.includes(id))))].slice(0,MAX_PRACTICE_QUESTIONS)
  const questionIds = [...new Set([...fresh.questionIds,...(Array.isArray(saved.questionIds) ? saved.questionIds : [])])]
  return {signature:fresh.signature,checkpoints,asked,questionIds}
}

export function shouldAskTransitionQuestion(block,alreadyCompleted,plan,forward = true) {
  return Boolean(forward && block?.id && block.status !== 'draft' && !alreadyCompleted
    && plan && plan.asked.length < MAX_PRACTICE_QUESTIONS
    && plan.checkpoints.includes(block.id) && !plan.asked.includes(block.id))
}

export function recordPracticeCheckpoint(plan,blockId,questionId = null) {
  if (!plan || !blockId || plan.asked.includes(blockId)) return plan
  return {...plan,asked:[...plan.asked,blockId].slice(0,MAX_PRACTICE_QUESTIONS),
    questionIds:questionId ? [...new Set([...plan.questionIds,questionId])] : plan.questionIds}
}
