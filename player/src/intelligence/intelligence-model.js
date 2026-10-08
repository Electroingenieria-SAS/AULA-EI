import { collectCompletedCourseContent } from '../games/course-game-generator.js'

const words = (value) => String(value || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('es').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)
  .filter((part) => part.length >= 4 && !STOP.has(part))
const STOP = new Set(['para','sobre','esta','este','estos','estas','cual','como','cuando','donde','explica','explicar',
  'curso','tema','capacitacion','aprendido','dime','puedes','quiero','necesito','informacion','tiene','hacer','debo','entre'])

export function knowledgeCards(course, completed) {
  const seen = new Set()
  return collectCompletedCourseContent(course, completed).flatMap((phase) =>
    phase.blocks.filter((block) => ['text','image','video','presentation','audio','file','link'].includes(block.type))
      .map((block) => ({
        id: String(block.id),
        title: String(block.title || '').trim().slice(0,115),
        phase: String(phase.title || '').trim().slice(0,90),
        description: String(block.description || '').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,500),
      })).filter((item) => {
        if (!item.title || item.description.length < 20 || seen.has(item.title.toLowerCase())) return false
        seen.add(item.title.toLowerCase())
        return true
      }))
}

/** This is deterministic retrieval, not a generative AI answer. */
export function answerFromCourse(query, cards) {
  const tokens = [...new Set(words(query))].slice(0,12)
  if (!tokens.length) return null
  const scored = cards.map((card) => {
    const title = words(card.title)
    const body = words(card.description)
    const matches = tokens.filter((term) => title.includes(term) || body.includes(term))
    return { ...card, score: tokens.reduce((n,term) => n + (title.includes(term) ? 4 : body.includes(term) ? 1 : 0),0),
      matchCount: matches.length }
  }).filter((item) => item.score >= 4 && item.matchCount >= 1)
    .sort((a,b) => b.score-a.score || b.matchCount-a.matchCount)
  if (!scored.length) return null
  const best = scored[0]
  return { title: best.title, description: best.description, phase: best.phase, blockId: best.id,
    note: 'Fragmento literal del material completado; comprueba el contenido original antes de aplicarlo.' }
}

export function practiceStorageKey(userId) {
  return 'aula-ei-practice-v1:' + String(userId || '')
}

export function readPractice(userId, storage = globalThis?.localStorage) {
  if (!userId || !storage) return { courses: {} }
  try {
    const value = JSON.parse(storage.getItem(practiceStorageKey(userId)) || '{}')
    return { courses: value && typeof value.courses === 'object' && !Array.isArray(value.courses) ? value.courses : {} }
  } catch { return { courses: {} } }
}

/** Only minimal aggregated practice counters are stored, not questions or official exam results. */
export function recordPractice(userId, courseId, roundId, correct, mistakes = 0, storage = globalThis?.localStorage) {
  if (!userId || !courseId || !roundId || !storage) return readPractice(userId, storage)
  const prev = readPractice(userId, storage)
  const course = prev.courses[String(courseId)] || {}
  const rounds = { ...(course.rounds || {}) }
  const old = rounds[String(roundId)] || {}
  rounds[String(roundId)] = {
    attempts: Math.min(999, (Number(old.attempts) || 0) + 1),
    solved: Math.min(999, (Number(old.solved) || 0) + (correct ? 1 : 0)),
    mistakes: Math.min(999, (Number(old.mistakes) || 0) + Math.max(0,Number(mistakes) || 0)),
    lastSeen: Date.now(),
  }
  const limited = Object.entries(rounds).sort((a,b) => b[1].lastSeen-a[1].lastSeen).slice(0,90)
  const courses = { ...prev.courses, [String(courseId)]: { rounds: Object.fromEntries(limited) } }
  const limitedCourses = Object.fromEntries(Object.entries(courses).slice(-40))
  const next = { courses: limitedCourses }
  try { storage.setItem(practiceStorageKey(userId),JSON.stringify(next)) } catch {}
  return next
}

export function rankedReviewRounds(groups, coursePractice = {}) {
  const saved = coursePractice?.rounds || {}
  return (groups || []).flatMap((group) => (group.rounds || []).map((round) => ({
    ...round, gameType: group.type,
    practice: saved[round.id] || null,
  }))).sort((a,b) => {
    const aMistakes = Number(a.practice?.mistakes || 0)
    const bMistakes = Number(b.practice?.mistakes || 0)
    if (aMistakes !== bMistakes) return bMistakes-aMistakes
    const aSeen = Number(a.practice?.attempts || 0),bSeen=Number(b.practice?.attempts || 0)
    return aSeen-bSeen || String(a.title).localeCompare(String(b.title),'es')
  })
}

export function deriveBadges(development, practice = {}) {
  const courses = Object.values(practice.courses || {})
  const rounds = courses.flatMap((course) => Object.values(course?.rounds || {}))
  const solved = rounds.reduce((sum,item) => sum + (Number(item.solved) || 0),0)
  const attempts = rounds.reduce((sum,item) => sum + (Number(item.attempts) || 0),0)
  const completed = Number(development?.completedCount || 0)
  return [
    { id:'first-training',title:'Primer paso',description:'Completar una capacitación asignada',achieved:completed>=1,progress:Math.min(completed,1),goal:1 },
    { id:'steady-learning',title:'Constancia',description:'Completar tres capacitaciones',achieved:completed>=3,progress:Math.min(completed,3),goal:3 },
    { id:'first-review',title:'Mente activa',description:'Resolver una ronda de repaso interactivo',achieved:solved>=1,progress:Math.min(solved,1),goal:1 },
    { id:'review-champion',title:'Explorador del conocimiento',description:'Resolver cinco rondas de práctica',achieved:solved>=5,progress:Math.min(solved,5),goal:5 },
    { id:'practice-effort',title:'Perseverancia',description:'Participar en diez rondas de repaso',achieved:attempts>=10,progress:Math.min(attempts,10),goal:10 },
  ]
}

/** Recommends only courses already available to this user; no invented skill-course mapping. */
export function recommendedLearning(development) {
  const candidates = []
  const seen = new Set()
  const add = (id,title,reason,kind,score) => {
    if (!id || seen.has(String(id))) return
    seen.add(String(id))
    candidates.push({ courseId:String(id), title:title || 'Capacitación asignada',reason,kind,score })
  }
  for (const path of development?.paths || []) {
    const next = path.next
    if (next?.unlocked && !next.completed)
      add(next.course_id,next.title,'Siguiente paso disponible en la ruta «' + path.name + '».','route',90)
  }
  for (const item of development?.assignments || []) {
    if (item.complete) continue
    const reason = item.overdue ? 'Fecha límite superada: requiere atención.' :
      item.dueSoon ? 'Se acerca la fecha límite de esta capacitación.' :
      item.status === 'in_progress' ? 'Ya comenzaste esta capacitación.' : 'Capacitación asignada a tu cuenta.'
    add(item.course.id,item.course.title,reason,item.overdue ? 'overdue' : item.dueSoon ? 'due' : 'assigned',
      item.overdue ? 100 : item.dueSoon ? 95 : item.status === 'in_progress' ? 65 : 30)
  }
  return candidates.sort((a,b) => b.score-a.score).slice(0,6)
}
