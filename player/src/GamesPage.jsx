import React, { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BookOpenCheck, BrainCircuit, CheckCircle2, ChevronRight, Layers3, ListOrdered, RefreshCw, Shapes, Sparkles, ShieldCheck } from 'lucide-react'
import LearningGame from './games/LearningGame.jsx'
import { generateCourseReviewGames } from './games/course-game-generator.js'
import { navigateLearner, openLearnerCourse } from './navigation.js'
import { supabase } from './supabase.js'
import { cachedQuery } from '../../src/data-cache.js'

const ICONS = { memory: BrainCircuit, classification: Shapes, sequence: ListOrdered, decision: Layers3 }

export default function GamesPage({ sessionUser, initialCourseId = '' }) {
  const [enrollments, setEnrollments] = useState([])
  const [completed, setCompleted] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [loadingCourse, setLoadingCourse] = useState(false)
  const [error, setError] = useState('')
  const [courseError, setCourseError] = useState('')
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId)
  const [course, setCourse] = useState(null)
  const [gameType, setGameType] = useState('memory')
  const [round, setRound] = useState(0)

  useEffect(() => {
    setSelectedCourseId(initialCourseId)
  }, [initialCourseId])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    if (!sessionUser?.id) {
      setLoading(false)
      setError('Inicia sesión para consultar tus capacitaciones asignadas.')
      return () => { active = false }
    }
    const load = async () => {
      try {
        const snapshot = await cachedQuery('catalog:snapshot:' + sessionUser.id, async () => {
          const result = await supabase.rpc('get_my_catalog_snapshot')
          if (result.error) throw result.error
          return result.data || {}
        }, { ttl: 30000 })
        if (!active) return
        const visible = (Array.isArray(snapshot.enrollments) ? snapshot.enrollments : [])
          .filter((entry) => entry?.course?.id)
          .sort((a, b) => String(a.course.title || '').localeCompare(String(b.course.title || ''), 'es'))
        setEnrollments(visible)
        setCompleted(new Set((Array.isArray(snapshot.progress) ? snapshot.progress : [])
          .filter((entry) => entry.status === 'completed').map((entry) => entry.block_id)))
      } catch (cause) {
        if (active) setError(cause?.message || 'No fue posible consultar tus capacitaciones.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [sessionUser?.id])

  const selected = enrollments.find((entry) => String(entry.course.id) === String(selectedCourseId))
  useEffect(() => {
    let active = true
    setCourse(null)
    setCourseError('')
    setRound(0)
    if (loading || error || !selectedCourseId) {
      setLoadingCourse(false)
      return () => { active = false }
    }
    if (!selected || !sessionUser?.id) {
      setCourseError('Solo puedes repasar capacitaciones visibles y asignadas a tu cuenta.')
      setLoadingCourse(false)
      return () => { active = false }
    }
    setLoadingCourse(true)
    ;(async () => {
      try {
        const access = await supabase.rpc('get_my_course_route_access', { p_course_id: selectedCourseId })
        if (access.data?.allowed === false) {
          throw new Error(access.data.reason || 'La capacitación está bloqueada en tu ruta formativa.')
        }
        // Never query question banks. Course data is further protected by RLS.
        const result = await supabase.from('courses')
          .select('id,title,status,phases:course_phases(id,title,sort_order,blocks:content_blocks(id,title,type,description,status,sort_order,content))')
          .eq('id', selectedCourseId)
          .single()
        if (result.error) throw result.error
        if (active) setCourse(result.data)
      } catch (cause) {
        if (active) setCourseError(cause?.message || 'No fue posible preparar el repaso de este curso.')
      } finally {
        if (active) setLoadingCourse(false)
      }
    })()
    return () => { active = false }
  }, [selectedCourseId, selected?.course?.id, sessionUser?.id, loading, error])

  const available = useMemo(() => course
    ? generateCourseReviewGames(course, completed)
    : [], [course, completed])
  const activeGroup = available.find((entry) => entry.type === gameType)
  const activeRound = activeGroup?.rounds?.[round % activeGroup.rounds.length] || null
  const totalRounds = available.reduce((count, entry) => count + entry.rounds.length, 0)
  const chooseCourse = (value) => {
    setSelectedCourseId(value)
    setRound(0)
    if (value) navigateLearner('/games/' + encodeURIComponent(value))
    else navigateLearner('/games')
  }
  const chooseType = (value) => {
    setGameType(value)
    setRound(0)
  }

  return <main className="learner-games-page">
    <section className="games-original-hero">
      <div>
        <span><Sparkles size={15}/> Entrena tu conocimiento</span>
        <h1>Juegos EI · Repaso</h1>
        <p>Elige una capacitación y juega con conceptos, fases y validaciones que ya estudiaste. Cada ronda se prepara automáticamente con tu material de aprendizaje.</p>
      </div>
      <div className="games-hero-metric"><strong>{loading ? '…' : enrollments.length}</strong><span>Capacitaciones para elegir</span></div>
    </section>

    <section className="games-course-selector" aria-label="Escoge la capacitación para repasar">
      <div className="games-selector-heading">
        <span>PASO 1 · TU CAPACITACIÓN</span>
        <h2>¿Qué quieres repasar hoy?</h2>
        <p>Solo aparecen las capacitaciones asignadas a tu cuenta. El contenido de repaso se toma de los bloques que ya completaste.</p>
      </div>
      <label htmlFor="games-course-select">Capacitación
        <select id="games-course-select" value={selectedCourseId}
          disabled={loading || !enrollments.length}
          onChange={(event) => chooseCourse(event.target.value)}>
          <option value="">Escoge una capacitación…</option>
          {enrollments.map((entry) => <option key={entry.course.id} value={entry.course.id}>{entry.course.title}</option>)}
        </select>
      </label>
    </section>

    {loading && <p className="games-selection-state" role="status">Buscando tus capacitaciones disponibles…</p>}
    {error && <div className="games-selection-state" role="alert">{error}</div>}
    {!loading && !error && !enrollments.length && <section className="games-selection-state">
      <BookOpenCheck size={30}/><h2>Aún no tienes capacitaciones asignadas</h2>
      <p>Cuando recibas una capacitación podrás elegirla aquí para repasar su contenido.</p>
      <button type="button" onClick={() => navigateLearner('/catalog')}>Ver mis capacitaciones <ArrowRight size={16}/></button>
    </section>}
    {loadingCourse && <p className="games-selection-state" role="status">Preparando los juegos con tu capacitación…</p>}
    {courseError && !loadingCourse && <div className="games-selection-state" role="alert">{courseError}</div>}

    {!loadingCourse && course && <section className="games-generated-content">
      <div className="games-generated-heading">
        <div><span><CheckCircle2 size={16}/> REPASO PERSONALIZADO</span>
          <h2>{course.title}</h2>
          <p>{totalRounds
            ? 'Actividades formadas a partir de contenido que ya estudiaste, sin alterar tu progreso ni la nota del examen.'
            : 'Aún no hay suficiente contenido completado para preparar estas dinámicas con respuestas verificables.'}</p>
        </div>
        <span className="games-round-count">{totalRounds} ronda(s) preparadas</span>
      </div>

      <div className="games-lab">
        <nav className="games-lab-picker" aria-label="Escoger dinámica de repaso">
          {available.map((group) => {
            const Icon = ICONS[group.type]
            return <button type="button" key={group.type} aria-pressed={group.type === gameType}
              className={group.type === gameType ? 'active' : ''}
              onClick={() => chooseType(group.type)}>
              <span><Icon size={21}/></span>
              <strong>{group.label}</strong>
              <small>{group.rounds.length ? group.rounds.length + ' ronda(s) generadas' : 'Sin material suficiente'}</small>
            </button>
          })}
        </nav>
        <div className="games-lab-stage">
          {activeRound ? <>
            <div className="games-source-row">
              <span><ShieldCheck size={15}/>{activeRound.sourceLabel}</span>
              {activeGroup.rounds.length > 1 && <button type="button" onClick={() => setRound((value) => value + 1)}>
                <RefreshCw size={16}/> Otra ronda <ChevronRight size={15}/>
              </button>}
            </div>
            <LearningGame key={String(selectedCourseId) + ':' + gameType + ':' + activeRound.id} content={activeRound.content} title={activeRound.title}/>
          </> : <div className="games-empty-type">
            <BookOpenCheck size={30}/><h3>Todavía no hay ejercicios de este tipo</h3>
            <p>Completa más temas del curso o selecciona otra dinámica. No generamos respuestas inventadas ni utilizamos preguntas reservadas del examen.</p>
            {available.some((entry) => entry.rounds.length > 0) && <button type="button"
              onClick={() => chooseType(available.find((entry) => entry.rounds.length > 0).type)}>
              Jugar una dinámica disponible <ArrowRight size={16}/>
            </button>}
            <button type="button" className="games-course-return" onClick={() => openLearnerCourse(selectedCourseId)}>
              Volver al contenido del curso
            </button>
          </div>}
        </div>
      </div>
      <p className="games-review-safety"><ShieldCheck size={17}/>
        Repaso sin calificación. Se utiliza material de bloques completados y contenido didáctico existente, nunca el banco del examen final. Los recursos que solo contienen imágenes o videos no se interpretan automáticamente.
      </p>
    </section>}
  </main>
}
