import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  EXAM_SUBMIT_TIMEOUT_MS, examDraftKey, filterExamDraft,
  readExamDraft, saveExamDraft, clearExamDraft,
  resumeExam, submitExamWithRecovery,
} from '../player/src/course-player/exam-recovery.js'

const dbMigration = readFileSync(new URL('../supabase/migrations/20261104162600_fix_creator_self_exam_certification_20261104.sql', import.meta.url), 'utf8')
const player = readFileSync(new URL('../player/src/CoursePlayer.jsx', import.meta.url), 'utf8')

assert.match(dbMigration, /NEW.status='completed'/)
assert.match(dbMigration, /NEW.user_id=auth.uid\(\)/)
assert.match(dbMigration, /cert.exam_attempt_id/)
assert.match(dbMigration, /attempt.passed=true/)
assert.match(dbMigration, /attempt.score>=course.passing_score/)
assert.match(dbMigration, /attempt.user_id=cert.user_id/)
assert.match(dbMigration, /attempt.course_id=cert.course_id/)
assert.match(dbMigration, /OLD.status='completed'/)
assert.match(dbMigration, /NEW.assigned_by IS DISTINCT FROM OLD.assigned_by/)
assert.match(dbMigration, /REVOKE ALL ON FUNCTION public.guard_creator_training_enrollment_update\(\) FROM anon, authenticated;/)
assert.ok(EXAM_SUBMIT_TIMEOUT_MS >= 20000 && EXAM_SUBMIT_TIMEOUT_MS <= 45000)
assert.match(player, /examSubmittingRef.current/, 'Double-submission lock is synchronous')
assert.match(player, /setAnswers=\{persistExamAnswers\}/, 'Each selected answer is saved')
assert.match(player, /submitExamWithRecovery\(supabase, sessionUser.id, courseId, examAnswers\)/)
assert.match(player, /resumeExam\(supabase, sessionUser.id, courseId\)/)
assert.match(player, /clearExamDraft\(sessionUser.id, courseId\)/)

const data = new Map()
const storage = {
  getItem: key => data.get(key) ?? null,
  setItem: (key, value) => data.set(key, value),
  removeItem: key => data.delete(key),
}
globalThis.localStorage=storage
const questions = [
  { id: 'q1', options: [{ id: 'a' }, { id: 'b' }] },
  { id: 'q2', options: [{ id: 'c' }, { id: 'd' }] },
]
const user='learner-one', course='sst'
const answers={q1:'a',q2:'d'}
assert.equal(readExamDraft(user,course,questions,storage).q1, undefined)
saveExamDraft(user,course,answers,storage)
assert.deepEqual(readExamDraft(user,course,questions,storage), answers)
assert.deepEqual(filterExamDraft(questions,{q1:'unexpected',q2:'d',q3:'c'}),{q2:'d'})
assert.equal(data.has(examDraftKey(user,course)), true)
assert.deepEqual(readExamDraft('different-user',course,questions,storage), {})
assert.deepEqual(readExamDraft(user,'different-course',questions,storage), {})
clearExamDraft(user,course,storage)
assert.deepEqual(readExamDraft(user,course,questions,storage), {})
saveExamDraft(user,course,answers,storage)

function fakeClient({ certificate=null,attempt=null,questionsData=questions,rpcResult,networkError=false }={}){
  const calls=[]
  const client={
    calls,
    from(table){
      calls.push('read:'+table)
      const builder={
        select(){return this},eq(){return this},order(){return this},limit(){return this},
        maybeSingle(){return Promise.resolve({data:table==='certificates'?certificate:attempt,error:null})},
      }
      return builder
    },
    rpc(name){
      calls.push('rpc:'+name)
      if(networkError)return Promise.reject(new Error('network dropped'))
      if(name==='get_exam_questions')return Promise.resolve({data:questionsData,error:null})
      return Promise.resolve({data:rpcResult,error:null})
    },
  }
  return client
}
const cert={certificate_code:'CERT-OK',score:90,exam_attempt_id:'a1'}
const existing=fakeClient({certificate:cert})
const session=await resumeExam(existing,user,course)
assert.equal(session.result?.certificate_code,'CERT-OK')
assert.equal(existing.calls.includes('rpc:get_exam_questions'),false,'Existing certificates suppress duplicate exams')
assert.deepEqual(readExamDraft(user,course,questions,storage),{},'Already-certified course clears old drafts')

saveExamDraft(user,course,answers,storage)
const open=fakeClient()
const resumed=await resumeExam(open,user,course)
assert.deepEqual(resumed.answers,answers,'Interrupted exam restores both answer selections')
assert.equal(resumed.questions.length,2)

const passed={attempt_id:'a1',passed:true,score:90,certificate_code:'CERT-OK'}
assert.deepEqual(await submitExamWithRecovery(fakeClient({rpcResult:passed}),user,course,answers),passed)
const lost=fakeClient({networkError:true,certificate:cert})
assert.equal((await submitExamWithRecovery(lost,user,course,answers)).certificate_code,'CERT-OK',
  'Lost HTTP response should recover an already-issued certificate')
const failed=fakeClient({networkError:true,attempt:{id:'a2',score:50,passed:false,answers,submitted_at:new Date().toISOString()}})
assert.equal((await submitExamWithRecovery(failed,user,course,answers)).passed,false,
  'Confirmed failed attempt is recovered rather than repeated')
await assert.rejects(
  submitExamWithRecovery(fakeClient({networkError:true}),user,course,answers),
  /network dropped/,
  'Unconfirmed exams must remain unsubmitted and never receive a fake certificate',
)
console.log('Creator certification guard, exam answer recovery and lost-response retry: OK')
