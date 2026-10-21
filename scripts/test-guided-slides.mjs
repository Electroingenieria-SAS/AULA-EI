import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  guidedSlideContent,isGuidedSlide,hasGuidedSlides,shouldAskTransitionQuestion,
} from '../src/guided-slides.js'

const slides=Array.from({length:5},(_,i)=>({
  type:'image',content:guidedSlideContent(i,5),id:'slide-'+i,
}))
for(let index=0;index<slides.length;index++){
  assert.equal(slides[index].content.slide_number,index+1)
  assert.equal(slides[index].content.slide_total,5)
  assert.equal(isGuidedSlide(slides[index]),true)
  assert.equal(shouldAskTransitionQuestion(slides[index],true),true,
    'A previously completed slide still opens a question when advancing')
  assert.equal(shouldAskTransitionQuestion(slides[index],false),true)
}
const standard={type:'presentation',content:{url:'https://www.canva.com/design/123/view?embed'}}
assert.equal(isGuidedSlide(standard),false)
assert.equal(shouldAskTransitionQuestion(standard,true),false)
assert.equal(shouldAskTransitionQuestion(standard,false),true)
assert.equal(hasGuidedSlides([{blocks:[standard]}]),false)
assert.equal(hasGuidedSlides([{blocks:[standard,...slides]}]),true)

const uploader=readFileSync('studio/src/course-editor/guided-slide-utils.js','utf8')
const importer=readFileSync('studio/src/course-editor/GuidedSlideImporter.jsx','utf8')
const newCourse=readFileSync('studio/src/course-editor/CanvaImportWizard.jsx','utf8')
const builder=readFileSync('studio/src/course-editor/CourseBuilder.jsx','utf8')
const player=readFileSync('player/src/CoursePlayer.jsx','utf8')
assert.ok(uploader.includes("pdfjs-dist/build/pdf.mjs"))
assert.ok(uploader.includes("image/webp") && uploader.includes('uploadCourseAsset'))
assert.ok(uploader.includes("'course-assets'"))
assert.ok(uploader.includes("completion_rule:{mode:'manual'}"))
assert.ok(uploader.includes('MAX_TOTAL_BYTES'),'Limit storage and egress for free plan')
assert.ok(importer.includes('Preguntas activas disponibles'))
assert.ok(importer.includes('Activar preguntas entre diapositivas'))
assert.ok(builder.includes('<GuidedSlideImporter'))
assert.ok(newCourse.includes('renderGuidedSlideBlobs')&&newCourse.includes('saveGuidedSlides'))
assert.ok(player.includes('shouldAskTransitionQuestion(currentBlock,completed.has(currentBlockId))'))
assert.ok(player.includes('get_course_practice_question')&&player.includes('check_course_practice_answer'))
assert.ok(player.includes('<PracticeGateModal')&&player.includes('practiceNode='))
console.log('Guided Canva PDF slides and pop-up quiz at every forward transition: OK')
