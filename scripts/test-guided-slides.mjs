import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { guidedSlideContent,isGuidedSlide,hasGuidedSlides,shouldAskTransitionQuestion } from '../src/guided-slides.js'

const slides=Array.from({length:5},(_,i)=>({type:'image',content:guidedSlideContent(i,5,'zip'),id:'slide-'+i}))
for(let i=0;i<slides.length;i++){
  assert.equal(slides[i].content.slide_number,i+1)
  assert.equal(slides[i].content.slide_total,5)
  assert.equal(slides[i].content.source,'zip')
  assert.equal(isGuidedSlide(slides[i]),true)
  assert.equal(shouldAskTransitionQuestion(slides[i],true),true,'Advancing a completed slide still prompts a question.')
  assert.equal(shouldAskTransitionQuestion(slides[i],false),true)
}
const standard={type:'presentation',content:{url:'https://www.canva.com/design/123/view?embed'}}
assert.equal(isGuidedSlide(standard),false)
assert.equal(shouldAskTransitionQuestion(standard,true),false)
assert.equal(shouldAskTransitionQuestion(standard,false),true)
assert.equal(hasGuidedSlides([{blocks:[standard]}]),false)
assert.equal(hasGuidedSlides([{blocks:[standard,...slides]}]),true)

const uploader=readFileSync('studio/src/course-editor/guided-slide-utils.js','utf8')
const media=readFileSync('studio/src/course-editor/guided-image-pack.js','utf8')
const importer=readFileSync('studio/src/course-editor/GuidedSlideImporter.jsx','utf8')
const newCourse=readFileSync('studio/src/course-editor/CanvaImportWizard.jsx','utf8')
const builder=readFileSync('studio/src/course-editor/CourseBuilder.jsx','utf8')
const player=readFileSync('player/src/CoursePlayer.jsx','utf8')
assert.ok(uploader.includes("pdfjs-dist/build/pdf.mjs"))
assert.ok(uploader.includes("image/webp") && uploader.includes('uploadCourseAsset'))
assert.ok(uploader.includes("completion_rule:{mode:'manual'}"))
assert.ok(uploader.includes('MAX_TOTAL_BYTES'),'Keep storage size limits')
assert.ok(media.includes("DecompressionStream('deflate-raw')"),'ZIP images must be decoded locally.')
assert.ok(media.includes("createImageBitmap("),'Image files must be rendered into normalized slide blobs.')
assert.ok(media.includes("localeCompare("),'Images must be sorted in numeric file-name order.')
assert.ok(media.includes('MAX_UNCOMPRESSED_BYTES'),'Guard against unsafe ZIP expansion.')
assert.ok(importer.includes('Preguntas activas de la capacitación'))
assert.ok(importer.includes('Crear presentación interactiva'))
assert.ok(importer.includes('renderGuidedMedia('))
assert.ok(builder.includes('<GuidedSlideImporter'))
assert.ok(newCourse.includes('renderGuidedMedia(') && newCourse.includes('saveGuidedSlides('))
assert.ok(player.includes('shouldAskTransitionQuestion(currentBlock,completed.has(currentBlockId))'))
assert.ok(player.includes('get_course_practice_question')&&player.includes('check_course_practice_answer'))
assert.ok(player.includes('<PracticeGateModal')&&player.includes('practiceNode='))
for(const c of [uploader,media,importer,newCourse]){
  assert.doesNotMatch(c,/generateLocalQuestions|generateAbcdOptions|practice_questions:/,'No AI or question generation in slide import.')
}
assert.doesNotMatch(player,/guidedLocalPracticeQuestion|practiceQuestion.origin === 'guided_pdf'/,'Only course bank questions are used.')
console.log('Guided PDF, image and ZIP packages + existing-bank popup transitions: OK')
