import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { buildCoachCoursePlan, scheduleReviewRounds, summarizeReview } from '../player/src/intelligence/adaptive-coach-model.js'
import { rankedReviewRounds, recordPractice, readPractice, clearPractice } from '../player/src/intelligence/intelligence-model.js'

const now=new Date('2026-10-09T17:00:00Z'),day=86400000,t=now.getTime()
const rounds=[
 {id:'new',title:'Sin practicar',practice:null},
 {id:'failed',title:'Necesita repaso',practice:{attempts:2,lastMistakes:3,streak:0,lastSeen:t-1000}},
 {id:'mastered',title:'Reciente',practice:{attempts:4,lastMistakes:0,streak:4,lastSeen:t-day}},
 {id:'due',title:'Repaso espaciado',practice:{attempts:1,lastMistakes:0,streak:1,lastSeen:t-3*day}},
]
const schedule=scheduleReviewRounds(rounds,now)
assert.deepEqual(schedule.map(row=>row.id),['failed','new','due','mastered'])
assert.equal(schedule[0].review.priority,103)
assert.equal(schedule[0].review.reason.includes('3 errores'),true)
assert.equal(schedule[1].review.due,true)
assert.equal(schedule[2].review.due,true)
assert.equal(schedule[3].review.intervalDays,7)
assert.equal(schedule[3].review.due,false)
assert.equal(schedule[3].review.mastered,true)
assert.equal(schedule[3].review.nextReviewAt,t+6*day)
assert.deepEqual(summarizeReview(schedule),{total:4,due:3,mastered:1,next:t-2*day,masteredPercent:25})
assert.equal(summarizeReview([]).masteredPercent,null)
assert.deepEqual(scheduleReviewRounds([],now),[])
assert.equal(scheduleReviewRounds([{id:'bad',practice:{attempts:-5,lastMistakes:-3,streak:-4}}],now)[0].review.attempts,0)

const development={
 paths:[{required:true,courses:[{course_id:'locked',unlocked:false,completed:false}]}],
 assignments:[
  {course:{id:'c1',title:'Curso obligatorio'},complete:false,overdue:true},
  {course:{id:'c2',title:'Curso complementario'},complete:false,dueSoon:true},
  {course:{id:'locked',title:'Curso bloqueado'},complete:false,overdue:true},
 ],
}
const catalog=[
 {course:{id:'c1',title:'Curso obligatorio'},status:'in_progress'},
 {course:{id:'c2',title:'Curso complementario'},status:'assigned'},
 {course:{id:'locked',title:'Curso bloqueado'},status:'assigned'},
 {course:{id:'c1',title:'Duplicado'},status:'in_progress'},
]
const localPractice={courses:{
 c1:{rounds:{r1:{attempts:3,lastMistakes:3,streak:0},r2:{attempts:1,lastMistakes:0,streak:2}}},
 removed:{rounds:{r1:{attempts:10,lastMistakes:9,streak:0}}},
 locked:{rounds:{r1:{attempts:2,lastMistakes:7,streak:0}}},
}}
const courses=buildCoachCoursePlan(catalog,development,localPractice)
assert.ok(courses.some(row=>row.courseId==='c1'))
assert.ok(!courses.some(row=>row.courseId==='locked'),'A route lock takes precedence over an assignment.')
assert.equal(courses.filter(row=>row.courseId==='c1').length,1,'Repeated catalog entries must be deduplicated.')
assert.equal(courses[0].courseId,'c1','Overdue comes first')
assert.equal(courses[0].errors,1)
assert.equal(courses[0].masteredRounds,1)
assert.equal(courses.find(row=>row.courseId==='c2').kind,'due')
assert.ok(!courses.some(row=>row.courseId==='unknown'))
assert.ok(!courses.some(row=>row.courseId==='removed'), 'Revoked courses in local storage must not be recommended.')
assert.equal(buildCoachCoursePlan([],development,localPractice).length,0,'Local data cannot introduce a course without enrollment.')
assert.equal(buildCoachCoursePlan(catalog,development,{courses:{}}).some(x=>x.errors>0),false)

const saved=new Map(),storage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value),removeItem:key=>saved.delete(key)}
const userA='test-a',userB='test-b'
recordPractice(userA,'c1','r1',true,3,storage)
recordPractice(userB,'c1','r1',true,0,storage)
assert.equal(readPractice(userA,storage).courses.c1.rounds.r1.lastMistakes,3)
assert.equal(readPractice(userB,storage).courses.c1.rounds.r1.lastMistakes,0)
assert.equal(clearPractice(userA,storage),true)
assert.deepEqual(readPractice(userA,storage),{courses:{}})
assert.equal(readPractice(userB,storage).courses.c1.rounds.r1.attempts,1)

const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8')
const [page,panel,adaptive,style,model,main,sw,pkg]=await Promise.all([
 read('player/src/IntelligencePage.jsx'),read('player/src/intelligence/ReviewPlanPanel.jsx'),
 read('player/src/intelligence/AdaptivePanel.jsx'),read('player/src/styles/adaptive-coach.css'),
 read('player/src/intelligence/adaptive-coach-model.js'),read('src/main.jsx'),
 read('public/sw.js'),read('package.json')
])
assert.match(page,/ReviewPlanPanel/)
assert.match(page,/id:'plan'/)
assert.match(page,/courseReady = Boolean\(course && String\(course.id\)===String\(selected\)/)
assert.match(page,/get_my_course_route_access/)
assert.match(page,/gate\.data\?\.allowed !== true/)
assert.match(page,/practiceStorageKey\(userId\)/)
assert.match(panel,/buildCoachCoursePlan\(enrollments,development,practice\)/)
assert.match(panel,/onPractice\(item.courseId\)/)
assert.match(panel,/sourceLabel/)
assert.match(adaptive,/scheduleReviewRounds\(rankedReviewRounds\(groups, practice\)\)/)
assert.match(adaptive,/setCompletedThisRound\(true\)/)
assert.match(adaptive,/onResult\?\.\(current.id,result\)/)
assert.match(style,/@media\(max-width:590px\)/)
assert.match(style,/:focus-visible/)
assert.match(sw,/aula-ei-pwa-v10/)
assert.match(main,/sw\.js\?v=10/)
assert.match(JSON.parse(pkg).scripts.build,/npm run test:phase93-coach/)
for(const source of [page,panel,adaptive,model]) {
  assert.doesNotMatch(source,/\.from\('exam_attempts'\)|\.from\('question_options'\)|\.insert\(|\.update\(|\.upsert\(|\.delete\(/)
}
assert.doesNotMatch(panel,/supabase\.rpc\(/)
assert.doesNotMatch(model,/supabase|fetch\(|localStorage/)
console.log('Phase 9.3 PASS: private/local attempts, spaced reviews, official route locks, no extra RPC and no grade mutations.')
