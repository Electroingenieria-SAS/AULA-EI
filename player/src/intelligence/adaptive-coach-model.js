import { recommendedLearning } from './intelligence-model.js'

const finite = (value) => Number.isFinite(Number(value)) ? Number(value) : 0
const nonnegative = (value) => Math.max(0, finite(value))
const days = 86400000
const label = value => String(value || '').trim()

/**
 * Read-only study guidance from browser-local practice counters. It cannot
 * change grades, exam attempts, enrollment status or LMS certificates.
 */
export function scheduleReviewRounds(rounds = [], now = new Date()) {
  const timestamp = now instanceof Date ? now.getTime() : new Date(now).getTime()
  const current = Number.isFinite(timestamp) ? timestamp : Date.now()
  return (Array.isArray(rounds) ? rounds : []).map((round) => {
    const attempts = nonnegative(round.practice?.attempts)
    const errors = nonnegative(round.practice?.lastMistakes)
    const streak = nonnegative(round.practice?.streak)
    const lastSeen = nonnegative(round.practice?.lastSeen)
    // Spaced repetition is an estimate, never a certification or knowledge test.
    const intervalDays = streak >= 5 ? 14 : streak >= 3 ? 7 : streak >= 2 ? 3 : 1
    const nextReviewAt = lastSeen > 0 ? lastSeen + intervalDays * days : null
    const isNew = attempts === 0
    const struggling = !isNew && errors > 0
    const due = isNew || struggling || !nextReviewAt || nextReviewAt <= current
    const mastered = !struggling && streak >= 2
    const reason = struggling
      ? 'Se registraron ' + errors + ' errores en tu último repaso.'
      : isNew ? 'Todavía no has practicado esta ronda.'
        : due ? 'Pasó el intervalo recomendado desde tu última práctica.'
          : 'Puedes retomarla después para consolidar lo aprendido.'
    const priority = struggling ? 100 + Math.min(errors, 10)
      : isNew ? 85 : due ? 75 : 0
    return { ...round, review: {
      attempts,errors,streak,due,mastered,reason,priority,
      intervalDays,nextReviewAt,source:'practice-local',
    } }
  }).sort((a,b) => b.review.priority - a.review.priority ||
    a.review.streak - b.review.streak ||
    label(a.title).localeCompare(label(b.title),'es') ||
    label(a.id).localeCompare(label(b.id),'es'))
}

export function summarizeReview(rounds = []) {
  const items = Array.isArray(rounds) ? rounds : []
  const due = items.filter(round=>round.review?.due).length
  const mastered = items.filter(round=>round.review?.mastered).length
  const next = items.map(round=>round.review?.nextReviewAt)
    .filter(value=>Number.isFinite(value) && value>0)
    .sort((a,b)=>a-b)[0] || null
  return { total:items.length, due, mastered, next,
    masteredPercent:items.length?Math.round(mastered/items.length*100):null }
}

/**
 * Limits recommendations to current authorized catalog enrollments. A past
 * localStorage entry cannot unlock or reintroduce a revoked course.
 */
export function buildCoachCoursePlan(enrollments = [], development = {}, practice = {}) {
  const paths=Array.isArray(development?.paths)?development.paths:[]
  const locked = new Set(paths.filter(path=>path?.required).flatMap(path=>
    (Array.isArray(path?.courses)?path.courses:[])
      .filter(course=>!course?.unlocked && !course?.completed)
      .map(course=>label(course.course_id))))
  const priorities = new Map(recommendedLearning(development).map(row=>[label(row.courseId),row]))
  const options = Array.isArray(enrollments)?enrollments:[]
  const found = new Map()
  for(const enrollment of options) {
    const course = enrollment?.course
    const id=label(course?.id)
    if(!id || locked.has(id) || found.has(id)) continue
    const counters = Object.values(practice?.courses?.[id]?.rounds || {})
    const rounds = counters.filter(row=>row && typeof row==='object')
    const errors = rounds.filter(row=>nonnegative(row.lastMistakes)>0).length
    const mastered = rounds.filter(row=>nonnegative(row.streak)>=2 && !nonnegative(row.lastMistakes)).length
    const previous = priorities.get(id)
    const completed = enrollment.status==='completed'
    const reason = previous?.reason || (errors
      ? 'Hay rondas de práctica local donde todavía registras dificultades.'
      : completed ? 'Puedes consolidar una capacitación ya terminada.'
        : 'Capacitación disponible en tu catálogo personal.')
    const source = errors ? 'practice-local' : previous ? 'institutional-route' : 'catalog'
    const score = Math.max(previous?.score || 0, errors ? 80 + Math.min(errors,10) : rounds.length && mastered===rounds.length ? 12 : 24)
    found.set(id,{ courseId:id,title:label(course.title)||'Capacitación asignada',
      reason,source,kind:previous?.kind || (errors?'review':'available'),
      score,errors,reviewedRounds:rounds.length,masteredRounds:mastered })
  }
  return [...found.values()].sort((a,b)=>b.score-a.score ||
    a.title.localeCompare(b.title,'es')).slice(0,8)
}
