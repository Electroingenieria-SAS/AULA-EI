// First-party, dependency-free guided slide model shared by LMS and editor.
export function guidedSlideContent(index,total,source='canva_pdf') {
  return {
    provider:'canva_guided_pdf',
    source,
    slide_number:index+1,
    slide_total:total,
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
export function shouldAskTransitionQuestion(block,alreadyCompleted){
  return !alreadyCompleted || isGuidedSlide(block)
}


// Questions embedded in a guided PDF slide are only formative practice.
// Official exam questions and grading remain on the server.
export function isValidSlidePracticeQuestion(question) {
  if (!question || typeof question.prompt !== 'string' || question.prompt.trim().length < 8) return false
  if (!Array.isArray(question.options) || question.options.length !== 4) return false
  if (!Number.isInteger(question.correctIndex) || question.correctIndex < 0 || question.correctIndex > 3) return false
  const options = question.options.map(item => typeof item === 'string' ? item.trim() : '')
  return options.every(Boolean) && new Set(options.map(v => v.toLocaleLowerCase('es'))).size === 4
}

export function guidedLocalPracticeQuestion(block, seed = '') {
  if (!isGuidedSlide(block)) return null
  const questions = (Array.isArray(block.content.practice_questions) ? block.content.practice_questions : [])
    .filter(isValidSlidePracticeQuestion)
  if (!questions.length) return null
  const offset = [...String(seed)].reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 0) % questions.length
  const selected = questions[offset]
  return {
    id: 'guided-practice:' + String(block.id || '') + ':' + offset,
    origin: 'guided_pdf',
    prompt: selected.prompt,
    options: selected.options.map((label, index) => ({ id: 'guided-answer:' + index, label })),
    correctOptionId: 'guided-answer:' + selected.correctIndex,
  }
}
