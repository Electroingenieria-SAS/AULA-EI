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
// A practice checkpoint belongs to the navigation event, never to progress state.
// Replaying a completed, edited or previously visited resource still asks.
export function shouldAskTransitionQuestion(block,_alreadyCompleted){
  return Boolean(block && block.status !== 'draft')
}
