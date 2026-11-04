import { withPracticeTimeout, PRACTICE_READ_TIMEOUT_MS } from '../../../src/practice-gate-resilience.js'

// Drafts contain option IDs only, never correct-answer flags or exam content.
// They are scoped to the signed-in user and course and expire after seven days.
export const EXAM_SUBMIT_TIMEOUT_MS = 30000
const DRAFT_AGE_MS = 7 * 24 * 60 * 60 * 1000
export const examDraftKey = (userId, courseId) => 'aula-ei:exam-draft:v1:' + userId + ':' + courseId

export function filterExamDraft(questions, answers) {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return {}
  return Object.fromEntries((questions || []).flatMap(question => {
    const selected = answers[question.id]
    return (question.options || []).some(option => option.id === selected) ? [[question.id, selected]] : []
  }))
}

export function readExamDraft(userId, courseId, questions, storage = globalThis.localStorage) {
  if (!userId || !courseId) return {}
  try {
    const record = JSON.parse(storage?.getItem(examDraftKey(userId, courseId)) || 'null')
    if (!record || record.version !== 1 || !Number.isFinite(record.savedAt)
      || Date.now() - record.savedAt > DRAFT_AGE_MS || record.savedAt > Date.now() + 60000) return {}
    return filterExamDraft(questions, record.answers)
  } catch { return {} }
}

export function saveExamDraft(userId, courseId, answers, storage = globalThis.localStorage) {
  if (!userId || !courseId) return
  try {
    storage?.setItem(examDraftKey(userId, courseId), JSON.stringify({
      version: 1, savedAt: Date.now(), answers,
    }))
  } catch {}
}

export function clearExamDraft(userId, courseId, storage = globalThis.localStorage) {
  if (!userId || !courseId) return
  try { storage?.removeItem(examDraftKey(userId, courseId)) } catch {}
}

export async function getStoredExamResult(supabase, userId, courseId) {
  if (!userId || !courseId) return null
  const { data, error } = await withPracticeTimeout(
    supabase.from('certificates')
      .select('exam_attempt_id,certificate_code,score')
      .eq('user_id', userId).eq('course_id', courseId).maybeSingle(),
    PRACTICE_READ_TIMEOUT_MS,
  )
  if (error) throw error
  return data?.certificate_code ? {
    attempt_id: data.exam_attempt_id,
    score: data.score,
    passed: true,
    certificate_code: data.certificate_code,
  } : null
}

export async function resumeExam(supabase, userId, courseId) {
  const result = await getStoredExamResult(supabase, userId, courseId)
  if (result) {
    clearExamDraft(userId, courseId)
    return { result, questions: null, answers: {} }
  }
  const { data, error } = await withPracticeTimeout(
    supabase.rpc('get_exam_questions', { p_course_id: courseId }), PRACTICE_READ_TIMEOUT_MS,
  )
  if (error) throw error
  if (!Array.isArray(data) || !data.length) throw new Error('No se recibieron preguntas válidas del examen.')
  return { result: null, questions: data, answers: readExamDraft(userId, courseId, data) }
}

function sameAnswers(saved, submitted) {
  if (!saved || !submitted || typeof saved !== 'object' || typeof submitted !== 'object') return false
  const keys = Object.keys(submitted)
  return keys.length > 0 && keys.length === Object.keys(saved).length
    && keys.every(key => saved[key] === submitted[key])
}

// Retry a dropped response by checking the database first. This avoids
// losing a correctly persisted exam or producing a duplicate attempt.
export async function submitExamWithRecovery(supabase, userId, courseId, answers) {
  const startedAt = Date.now()
  try {
    const { data, error } = await withPracticeTimeout(
      supabase.rpc('submit_exam', { p_course_id: courseId, p_answers: answers }),
      EXAM_SUBMIT_TIMEOUT_MS,
      'El envío del examen tardó demasiado. Revisaremos si alcanzó a guardarse.',
    )
    if (error) throw error
    if (!data || typeof data.passed !== 'boolean' || !data.attempt_id)
      throw new Error('El servidor no confirmó la recepción del examen.')
    if (data.passed && !data.certificate_code)
      throw new Error('El examen fue aprobado, pero no se confirmó el certificado.')
    return data
  } catch (submissionError) {
    try {
      const certificate = await getStoredExamResult(supabase, userId, courseId)
      if (certificate) return certificate
      const { data: saved, error } = await withPracticeTimeout(
        supabase.from('exam_attempts')
          .select('id,score,passed,answers,submitted_at')
          .eq('user_id', userId).eq('course_id', courseId)
          .order('submitted_at', { ascending: false }).limit(1).maybeSingle(),
        PRACTICE_READ_TIMEOUT_MS,
      )
      if (!error && saved && saved.passed === false && Number.isFinite(Date.parse(saved.submitted_at))
        && Date.parse(saved.submitted_at) >= startedAt - 10000 && sameAnswers(saved.answers, answers)) {
        return { attempt_id: saved.id, score: saved.score, passed: false, certificate_code: null }
      }
    } catch {
      // Keep the draft, the user can retry when connectivity returns.
    }
    throw submissionError
  }
}
