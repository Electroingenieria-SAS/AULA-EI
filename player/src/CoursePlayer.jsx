import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, Award, BadgeCheck, BookOpen, Check, CheckCircle2,
  ChevronDown, ChevronRight, Circle, CircleAlert, Clock3, Download, ExternalLink,
  File, FileAudio, FileText, Gamepad2, GraduationCap, Image as ImageIcon, Images,
  Link2, Loader2, LockKeyhole, Maximize2, Medal, Menu, Minimize2, MonitorPlay,
  PartyPopper, PlayCircle, Presentation, RotateCcw, Search, ShieldCheck, Sparkles,
  Shuffle, BrainCircuit, Trophy, Video, X, ZoomIn, ZoomOut,
} from 'lucide-react'
import { signedAsset, supabase } from './supabase.js'

const ACHIEVEMENTS = [
  { key: 'first', title: 'Primer paso', description: 'Completaste tu primer contenido.', icon: Sparkles, unlock: ({ completedCount }) => completedCount >= 1 },
  { key: 'quarter', title: 'En marcha', description: 'Llegaste al 25% de la ruta obligatoria.', icon: Medal, unlock: ({ progress }) => progress >= 25 },
  { key: 'half', title: 'Mitad del camino', description: 'Superaste el 50% de la capacitación.', icon: Award, unlock: ({ progress }) => progress >= 50 },
  { key: 'final', title: 'Recta final', description: 'Alcanzaste el 75% del recorrido.', icon: Trophy, unlock: ({ progress }) => progress >= 75 },
  { key: 'mastery', title: 'Contenido dominado', description: 'Completaste todos los contenidos obligatorios.', icon: BadgeCheck, unlock: ({ progress }) => progress >= 100 },
]

export default function CoursePlayer() {
  const stageRef = useRef(null)
  const [sessionUser, setSessionUser] = useState(null)
  const [course, setCourse] = useState(null)
  const [enrollment, setEnrollment] = useState(null)
  const [completed, setCompleted] = useState(new Set())
  const [currentBlockId, setCurrentBlockId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [outlineOpen, setOutlineOpen] = useState(false)
  const [examQuestions, setExamQuestions] = useState(null)
  const [examAnswers, setExamAnswers] = useState({})
  const [examResult, setExamResult] = useState(null)
  const [examLoading, setExamLoading] = useState(false)
  const [achievementToast, setAchievementToast] = useState(null)
  const [practiceQuestion, setPracticeQuestion] = useState(null)
  const [practiceAnswer, setPracticeAnswer] = useState(null)
  const [practiceVerdict, setPracticeVerdict] = useState(null)
  const [practiceChecking, setPracticeChecking] = useState(false)
  const [practiceLoading, setPracticeLoading] = useState(false)
  const [practiceGateOpen, setPracticeGateOpen] = useState(false)
  const [practiceNextBlockId, setPracticeNextBlockId] = useState(null)
  const [practiceAdvanceBusy, setPracticeAdvanceBusy] = useState(false)

  const courseId = useMemo(() => {
    const match = window.location.hash.match(/^#\/course\/([^/?#]+)/)
    return match?.[1] ? decodeURIComponent(match[1]) : ''
  }, [])

  const load = async () => {
    setLoading(true)
    setMessage('')
    try {
      const { data: sessionResult, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      const user = sessionResult.session?.user
      if (!user) {
        window.location.replace('/#/login')
        return
      }
      if (!courseId) throw new Error('No se recibió la capacitación que quieres abrir.')

      setSessionUser(user)

      const [courseResult, progressResult, enrollmentResult] = await Promise.all([
        supabase
          .from('courses')
          .select('*,phases:course_phases(*,blocks:content_blocks(*))')
          .eq('id', courseId)
          .single(),
        supabase
          .from('block_progress')
          .select('block_id,status,progress_percent,completed_at,data')
          .eq('user_id', user.id),
        supabase
          .from('enrollments')
          .select('id,status,due_at,created_at,updated_at')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .maybeSingle(),
      ])

      if (courseResult.error || !courseResult.data) {
        throw new Error(courseResult.error?.message || 'No se encontró la capacitación o no está disponible para tu usuario.')
      }
      if (progressResult.error) throw progressResult.error

      const normalized = normalizeCourse(courseResult.data)
      const finished = new Set((progressResult.data || []).filter((item) => item.status === 'completed').map((item) => item.block_id))
      const allBlocks = flattenBlocks(normalized)
      const firstIncomplete = allBlocks.find((block) => !finished.has(block.id))
      const initial = firstIncomplete || allBlocks[allBlocks.length - 1] || null

      setCourse(normalized)
      setCompleted(finished)
      setCurrentBlockId((current) => current && allBlocks.some((block) => block.id === current) ? current : initial?.id || null)
      setEnrollment(enrollmentResult.error ? null : enrollmentResult.data || null)

    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible abrir la capacitación.')
      setCourse(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [courseId])

  const allBlocks = useMemo(() => course ? flattenBlocks(course) : [], [course])
  const requiredBlocks = useMemo(() => allBlocks.filter((block) => block.required && block.status !== 'draft'), [allBlocks])
  const currentIndex = allBlocks.findIndex((block) => block.id === currentBlockId)
  const currentBlock = currentIndex >= 0 ? allBlocks[currentIndex] : null
  const currentPhase = course?.phases.find((phase) => (phase.blocks || []).some((block) => block.id === currentBlockId)) || null
  const requiredCompleted = requiredBlocks.filter((block) => completed.has(block.id)).length
  const courseCompletedCount = allBlocks.filter((block) => completed.has(block.id)).length
  const progress = requiredBlocks.length ? Math.round((requiredCompleted / requiredBlocks.length) * 100) : 100
  const examUnlocked = requiredBlocks.every((block) => completed.has(block.id))

  const achievementContext = useMemo(() => ({ progress, completedCount: courseCompletedCount }), [progress, courseCompletedCount])
  const unlockedAchievements = useMemo(() => ACHIEVEMENTS.filter((item) => item.unlock(achievementContext)), [achievementContext])

  const isLockedAtIndex = () => false

  const phaseStats = (phase) => {
    const blocks = (phase.blocks || []).filter((block) => block.status !== 'draft')
    const required = blocks.filter((block) => block.required)
    const done = blocks.filter((block) => completed.has(block.id))
    const requiredDone = required.filter((block) => completed.has(block.id))
    const percent = required.length ? Math.round((requiredDone.length / required.length) * 100) : (blocks.length && done.length === blocks.length ? 100 : 0)
    return { blocks, required, done, percent, complete: required.length ? requiredDone.length === required.length : blocks.length > 0 && done.length === blocks.length }
  }

  const loadPracticeQuestion = async (seed = crypto.randomUUID()) => {
    if (!courseId || !sessionUser?.id) return
    setPracticeLoading(true)
    setPracticeQuestion(null)
    setPracticeAnswer(null)
    setPracticeVerdict(null)
    try {
      const { data, error } = await supabase.rpc('get_course_practice_question', {
        p_course_id: courseId,
        p_seed: String(seed),
      })

      if (error) {
        // Compatibility fallback. Staff can preview the exam at any point;
        // learners can only use this path once their final exam is unlocked.
        const fallback = await supabase.rpc('get_exam_questions', { p_course_id: courseId })
        if (!fallback.error && Array.isArray(fallback.data) && fallback.data.length) {
          const index = seededIndex(String(seed), fallback.data.length)
          setPracticeQuestion(fallback.data[index])
          setPracticeAnswer(null)
          setPracticeVerdict(null)
        }
        return
      }

      setPracticeQuestion(data || null)
      setPracticeAnswer(null)
      setPracticeVerdict(null)
    } finally {
      setPracticeLoading(false)
    }
  }

  const checkPracticeAnswer = async (optionId) => {
    if (!practiceQuestion?.id || practiceChecking || practiceAdvanceBusy) return

    setPracticeAnswer(optionId)
    setPracticeVerdict(null)
    setPracticeChecking(true)

    try {
      const { data, error } = await supabase.rpc('check_course_practice_answer', {
        p_course_id: courseId,
        p_question_id: practiceQuestion.id,
        p_option_id: optionId,
      })

      if (!error && typeof data?.correct === 'boolean') {
        setPracticeVerdict(data.correct)
        return
      }

      const fallback = await supabase
        .from('question_options')
        .select('is_correct')
        .eq('id', optionId)
        .eq('question_id', practiceQuestion.id)
        .maybeSingle()

      if (!fallback.error && typeof fallback.data?.is_correct === 'boolean') {
        setPracticeVerdict(Boolean(fallback.data.is_correct))
        return
      }

      setPracticeVerdict('unavailable')
    } catch {
      setPracticeVerdict('unavailable')
    } finally {
      setPracticeChecking(false)
    }
  }

  const selectBlock = (blockId) => {
    const index = allBlocks.findIndex((block) => block.id === blockId)
    if (index < 0) return
    setExamQuestions(null)
    setExamResult(null)
    setCurrentBlockId(blockId)
    setOutlineOpen(false)
    window.requestAnimationFrame(() => stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const completeBlock = async (blockId, data = {}) => {
    if (!sessionUser?.id || completed.has(blockId)) return true
    const beforeProgress = progress
    const beforeCount = allBlocks.filter((block) => completed.has(block.id)).length
    const { error } = await supabase.rpc('complete_block', {
      p_block_id: blockId,
      p_data: data,
    })

    if (error) {
      setMessage(error.message)
      return false
    }

    const next = new Set([...completed, blockId])
    setCompleted(next)

    const afterRequiredDone = requiredBlocks.filter((block) => next.has(block.id)).length
    const afterProgress = requiredBlocks.length ? Math.round((afterRequiredDone / requiredBlocks.length) * 100) : 100
    const contextBefore = { progress: beforeProgress, completedCount: beforeCount }
    const contextAfter = { progress: afterProgress, completedCount: allBlocks.filter((block) => next.has(block.id)).length }
    const newlyUnlocked = ACHIEVEMENTS.filter((item) => !item.unlock(contextBefore) && item.unlock(contextAfter))
    const blockPhase = course?.phases.find((phase) => (phase.blocks || []).some((block) => block.id === blockId))
    if (blockPhase) {
      const requiredInPhase = (blockPhase.blocks || []).filter((block) => block.required && block.status !== 'draft')
      const phaseNowComplete = requiredInPhase.length > 0 && requiredInPhase.every((block) => next.has(block.id))
      if (phaseNowComplete && !newlyUnlocked.length) {
        newlyUnlocked.push({ key: 'phase-' + blockPhase.id, title: 'Fase completada', description: blockPhase.title, icon: CheckCircle2 })
      }
    }

    if (newlyUnlocked.length) {
      setAchievementToast(newlyUnlocked[newlyUnlocked.length - 1])
      window.setTimeout(() => setAchievementToast(null), 4200)
    }
    return true
  }

  const goNext = async () => {
    if (currentIndex < 0 || practiceLoading || practiceAdvanceBusy) return
    const next = allBlocks[currentIndex + 1] || null

    setPracticeNextBlockId(next?.id || null)
    setPracticeGateOpen(true)
    await loadPracticeQuestion(crypto.randomUUID())
  }

  const continueAfterPractice = async () => {
    if (!practiceAnswer || !currentBlockId || practiceAdvanceBusy || practiceChecking) return

    setPracticeAdvanceBusy(true)
    setPracticeVerdict(null)

    // The quick question is a transition checkpoint, not an exam attempt.
    // Any selected option allows progression; the answer is stored only as
    // context for the completed content and never graded here.
    await completeBlock(currentBlockId, {
      transition_practice: true,
      practice_question_id: practiceQuestion?.id || null,
      practice_option_id: practiceAnswer,
      practice_correct: typeof practiceVerdict === 'boolean' ? practiceVerdict : null,
    })

    const target = practiceNextBlockId
    setPracticeGateOpen(false)
    setPracticeQuestion(null)
    setPracticeAnswer(null)
    setPracticeVerdict(null)
    setPracticeChecking(false)
    setPracticeNextBlockId(null)
    setPracticeAdvanceBusy(false)

    if (target) selectBlock(target)
    else window.requestAnimationFrame(() => stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const continueWithoutPractice = async () => {
    if (!currentBlockId || practiceAdvanceBusy) return

    setPracticeAdvanceBusy(true)
    await completeBlock(currentBlockId, {
      transition_practice: true,
      practice_unavailable: true,
    })

    const target = practiceNextBlockId
    setPracticeGateOpen(false)
    setPracticeQuestion(null)
    setPracticeAnswer(null)
    setPracticeVerdict(null)
    setPracticeChecking(false)
    setPracticeNextBlockId(null)
    setPracticeAdvanceBusy(false)

    if (target) selectBlock(target)
    else window.requestAnimationFrame(() => stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const goPrevious = () => {
    if (currentIndex <= 0) return
    selectBlock(allBlocks[currentIndex - 1].id)
  }

  const startExam = async () => {
    if (!examUnlocked) {
      setMessage('Completa primero todos los contenidos obligatorios.')
      return
    }
    setExamLoading(true)
    setMessage('')
    setExamResult(null)
    setExamAnswers({})
    try {
      const { data, error } = await supabase.rpc('get_exam_questions', { p_course_id: courseId })
      if (error) throw error
      setExamQuestions(data || [])
      window.requestAnimationFrame(() => stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible abrir el examen.')
    } finally {
      setExamLoading(false)
    }
  }

  const submitExam = async () => {
    if (!examQuestions?.length) return
    setExamLoading(true)
    setMessage('')
    try {
      const { data, error } = await supabase.rpc('submit_exam', { p_course_id: courseId, p_answers: examAnswers })
      if (error) throw error
      setExamResult(data)
      setExamQuestions(null)
      if (data?.passed) {
        setAchievementToast({ key: 'certified', title: '¡Capacitación aprobada!', description: 'Tu certificado ya está disponible.', icon: Trophy })
        window.setTimeout(() => setAchievementToast(null), 5200)
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible enviar el examen.')
    } finally {
      setExamLoading(false)
    }
  }

  if (loading) return <StateView title="Preparando tu capacitación…" text="Cargando contenidos, progreso y recursos." icon={Loader2} spin />
  if (!course) return <StateView title="No fue posible abrir la capacitación" text={message || 'No encontramos información disponible.'} icon={CircleAlert} error />

  return <main className="learner-course-app">
    <header className="learner-topbar">
      <button className="learner-brand" onClick={() => navigate('/#/catalog')}>
        <img src="/brand/logo-aula-ei.png" alt="Aula EI" />
        <span><strong>Aula EI</strong><small>Experiencia de aprendizaje</small></span>
      </button>

      <div className="learner-topbar-progress">
        <div><span>Progreso obligatorio</span><strong>{progress}%</strong></div>
        <div className="topbar-progress-track"><span style={{ width: progress + '%' }} /></div>
      </div>

      <div className="learner-topbar-actions">
        <button className="mobile-outline-button" onClick={() => setOutlineOpen(true)}><Menu size={18} /> Ruta</button>
        <button className="secondary-action" onClick={() => navigate('/#/catalog')}><ArrowLeft size={17} /> Mis capacitaciones</button>
      </div>
    </header>

    <section className="learner-course-hero">
      <div className="hero-motion-field" aria-hidden="true">
        {Array.from({ length: 9 }).map((_, index) => <i key={index} style={{ '--i': index }} />)}
        <span className="hero-motion-orbit orbit-a" />
        <span className="hero-motion-orbit orbit-b" />
        <span className="hero-motion-spark spark-a" />
        <span className="hero-motion-spark spark-b" />
      </div>

      <div className="learner-hero-content">
        <div className="learner-hero-copy">
          <div className="hero-chip-row">
            <span className="hero-learning-chip"><BookOpen size={14} /> Capacitación Aula EI</span>
            {enrollment?.due_at && <span className="hero-learning-chip soft"><Clock3 size={14} /> Hasta {dateLabel(enrollment.due_at)}</span>}
          </div>

          <h1>{course.title}</h1>
          <p>{course.description || 'Continúa tu ruta de aprendizaje y completa cada actividad a tu ritmo.'}</p>

          <div className="hero-progress-inline" aria-label={`Progreso de la capacitación: ${progress}%`}>
            <div><span style={{ width: progress + '%' }} /></div>
            <strong>{progress}% completado</strong>
            <small>{requiredCompleted} de {requiredBlocks.length} contenidos obligatorios</small>
          </div>

          <div className="learner-hero-actions">
            {currentBlock && <button className="hero-primary-button" onClick={() => stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><PlayCircle size={18} /> {progress ? 'Continuar donde quedé' : 'Comenzar capacitación'}</button>}
            <span>{examUnlocked ? 'Examen final desbloqueado' : 'Tu progreso se guarda automáticamente al avanzar'}</span>
          </div>
        </div>
      </div>
    </section>

    {message && <div className="learner-inline-message"><CircleAlert size={17} /><span>{message}</span><button onClick={() => setMessage('')}><X size={15} /></button></div>}

    <div className="learner-course-layout">
      <CourseOutline
        course={course}
        allBlocks={allBlocks}
        currentBlockId={currentBlockId}
        completed={completed}
        examUnlocked={examUnlocked}
        examLoading={examLoading}
        phaseStats={phaseStats}
        isLockedAtIndex={isLockedAtIndex}
        selectBlock={selectBlock}
        startExam={startExam}
        open={outlineOpen}
        close={() => setOutlineOpen(false)}
      />

      <section className="learner-stage-column" ref={stageRef}>
        <div className="stage-context-bar">
          <div>
            <span>{currentPhase ? currentPhase.title : examQuestions || examResult ? 'Evaluación final' : 'Capacitación'}</span>
            {currentBlock && <strong>{currentIndex + 1} de {allBlocks.length}</strong>}
          </div>
          {currentBlock && <div className="stage-context-progress"><span style={{ width: allBlocks.length ? ((currentIndex + 1) / allBlocks.length) * 100 + '%' : '0%' }} /></div>}
        </div>

        <div className="learner-stage-card" key={examQuestions ? 'exam' : examResult ? 'result' : currentBlockId || 'empty'}>
          {examQuestions ? (
            <ExamExperience
              questions={examQuestions}
              answers={examAnswers}
              setAnswers={setExamAnswers}
              passingScore={course.passing_score || 80}
              submit={submitExam}
              loading={examLoading}
            />
          ) : examResult ? (
            <ExamResult result={examResult} course={course} retry={startExam} />
          ) : currentBlock ? (
            <ContentExperience
              block={currentBlock}
              completed={completed.has(currentBlock.id)}
              previousTitle={allBlocks[currentIndex - 1]?.title || 'Inicio'}
              nextTitle={allBlocks[currentIndex + 1]?.title || 'Examen final'}
              canPrevious={currentIndex > 0}
              canNext={true}
              previous={goPrevious}
              next={goNext}
            />
          ) : (
            <div className="learner-empty-stage"><BookOpen size={38} /><h2>Esta capacitación aún no tiene contenido visible.</h2><p>Cuando el equipo publique contenidos aparecerán aquí.</p></div>
          )}
        </div>

        {!examQuestions && !examResult && currentBlock && (
          <div className="learner-stage-nav">
            <button className="stage-nav-button previous" disabled={currentIndex <= 0} onClick={goPrevious}><ArrowLeft size={18} /><span><small>Anterior</small><strong>{allBlocks[currentIndex - 1]?.title || 'Inicio'}</strong></span></button>
            <div className="stage-nav-center">
              {completed.has(currentBlock.id)
                ? <span className="stage-completed-indicator"><CheckCircle2 size={16} /> Este paso ya cuenta en tu progreso</span>
                : <span className="stage-pending-indicator"><BrainCircuit size={14} /> Siguiente abrirá una pregunta rápida</span>}
            </div>
            <button className="stage-nav-button next" disabled={practiceLoading || practiceAdvanceBusy} onClick={goNext}><span><small>{currentIndex >= allBlocks.length - 1 ? 'Finalizar contenido' : 'Siguiente'}</small><strong>{allBlocks[currentIndex + 1]?.title || 'Examen final'}</strong></span><ArrowRight size={18} /></button>
          </div>
        )}

        {!examQuestions && !examResult && examUnlocked && currentIndex === allBlocks.length - 1 && (
          <button className="exam-callout" onClick={startExam} disabled={examLoading}>
            <span><GraduationCap size={24} /></span>
            <div><strong>¡Ruta de contenidos completada!</strong><small>Ya puedes presentar el examen final. Debes obtener mínimo {course.passing_score || 80}%.</small></div>
            <ArrowRight size={20} />
          </button>
        )}
      </section>

      <aside className="learner-progress-panel">
        <section className="learner-side-card">
          <div className="side-card-title"><Trophy size={18} /><div><strong>Tus logros</strong><small>{unlockedAchievements.length} de {ACHIEVEMENTS.length} desbloqueados</small></div></div>
          <div className="achievement-mini-grid">
            {ACHIEVEMENTS.map((achievement) => {
              const unlocked = achievement.unlock(achievementContext)
              const Icon = achievement.icon
              return <article key={achievement.key} className={unlocked ? 'unlocked' : 'locked'} title={achievement.description}>
                <span>{unlocked ? <Icon size={18} /> : <LockKeyhole size={16} />}</span>
                <div><strong>{achievement.title}</strong><small>{unlocked ? achievement.description : 'Sigue avanzando para desbloquearlo.'}</small></div>
              </article>
            })}
          </div>
        </section>

        <section className="learner-side-card phase-progress-card">
          <div className="side-card-title"><ShieldCheck size={18} /><div><strong>Progreso por fase</strong><small>Tu recorrido de aprendizaje</small></div></div>
          <div className="phase-mini-progress">
            {course.phases.map((phase, index) => {
              const stats = phaseStats(phase)
              return <button key={phase.id} onClick={() => {
                const first = stats.blocks.find((block) => {
                  const blockIndex = allBlocks.findIndex((item) => item.id === block.id)
                  return blockIndex >= 0 && !isLockedAtIndex(blockIndex)
                })
                if (first) selectBlock(first.id)
              }}>
                <span className={stats.complete ? 'done' : ''}>{stats.complete ? <Check size={12} /> : index + 1}</span>
                <div><strong>{phase.title}</strong><div><i style={{ width: stats.percent + '%' }} /></div><small>{stats.percent}%</small></div>
              </button>
            })}
          </div>
        </section>

        <section className="learner-side-card motivation-card">
          <Sparkles size={20} />
          <div><strong>{progress >= 100 ? 'Excelente trabajo.' : progress >= 50 ? 'Vas muy bien.' : progress > 0 ? 'Buen comienzo.' : 'Tu ruta comienza aquí.'}</strong><span>{progress >= 100 ? 'Ya completaste el contenido obligatorio. Presenta el examen cuando estés listo.' : progress >= 50 ? 'Ya recorriste más de la mitad de la capacitación.' : progress > 0 ? 'Cada contenido completado te acerca a la certificación.' : 'Avanza paso a paso. Aula EI guardará tu progreso.'}</span></div>
        </section>
      </aside>
    </div>

    {practiceGateOpen && (
      <PracticeGateModal
        question={practiceQuestion}
        selected={practiceAnswer}
        verdict={practiceVerdict}
        checking={practiceChecking}
        selectAnswer={checkPracticeAnswer}
        loading={practiceLoading}
        advancing={practiceAdvanceBusy}
        targetTitle={allBlocks.find((block) => block.id === practiceNextBlockId)?.title || 'Examen final'}
        retry={() => loadPracticeQuestion(crypto.randomUUID())}
        continueForward={continueAfterPractice}
        continueWithoutQuestion={continueWithoutPractice}
      />
    )}

    {achievementToast && <AchievementToast achievement={achievementToast} onClose={() => setAchievementToast(null)} />}
  </main>
}

function CourseOutline({ course, allBlocks, currentBlockId, completed, examUnlocked, examLoading, phaseStats, isLockedAtIndex, selectBlock, startExam, open, close }) {
  return <>
    {open && <button className="outline-backdrop" aria-label="Cerrar ruta" onClick={close} />}
    <aside className={'learner-outline ' + (open ? 'mobile-open' : '')}>
      <div className="outline-header">
        <div><span>Tu ruta</span><strong>Contenido de la capacitación</strong></div>
        <button className="outline-close" onClick={close}><X size={18} /></button>
      </div>
      <div className="outline-scroll">
        {course.phases.map((phase, phaseIndex) => {
          const stats = phaseStats(phase)
          return <section className="outline-phase-card" key={phase.id}>
            <div className="outline-phase-heading">
              <span className={stats.complete ? 'complete' : ''}>{stats.complete ? <Check size={13} /> : phaseIndex + 1}</span>
              <div><strong>{phase.title}</strong><small>{stats.done.length}/{stats.blocks.length} contenidos · {stats.percent}%</small></div>
            </div>
            <div className="outline-block-list">
              {stats.blocks.map((block) => {
                const index = allBlocks.findIndex((item) => item.id === block.id)
                const locked = isLockedAtIndex(index)
                const done = completed.has(block.id)
                const Icon = typeIcon(block.type)
                return <button key={block.id} disabled={locked} className={(currentBlockId === block.id ? 'active ' : '') + (done ? 'done ' : '')} onClick={() => selectBlock(block.id)}>
                  <span>{done ? <CheckCircle2 size={16} /> : locked ? <LockKeyhole size={15} /> : <Icon size={15} />}</span>
                  <div><strong>{block.title}</strong><small>{typeLabel(block.type)} · Disponible</small></div>
                </button>
              })}
            </div>
          </section>
        })}

        <button className={'outline-exam-card ' + (examUnlocked ? 'unlocked' : '')} disabled={!examUnlocked || examLoading} onClick={startExam}>
          <span>{examLoading ? <Loader2 className="spin" size={19} /> : examUnlocked ? <GraduationCap size={20} /> : <LockKeyhole size={18} />}</span>
          <div><strong>Examen final</strong><small>{examUnlocked ? `Desbloqueado · aprobar con ${course.passing_score || 80}%` : 'Completa los contenidos obligatorios'}</small></div>
          {examUnlocked && <ChevronRight size={17} />}
        </button>
      </div>
    </aside>
  </>
}

function ContentExperience({ block, completed, previousTitle, nextTitle, canPrevious, canNext, previous, next }) {
  const [assetUrl, setAssetUrl] = useState(null)
  const [assetError, setAssetError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [selectedOption, setSelectedOption] = useState(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const content = block.content || {}
  const externalUrl = String(content.url || '').trim()

  useEffect(() => {
    let active = true
    setAssetUrl(null)
    setAssetError('')
    if (!block.asset_path) return () => { active = false }
    signedAsset(block.asset_path)
      .then((url) => { if (active) setAssetUrl(url) })
      .catch((error) => { if (active) setAssetError(error.message) })
    return () => { active = false }
  }, [block.id, block.asset_path])

  const displayUrl = externalUrl ? normalizeExternalUrl(externalUrl, block.type) : assetUrl
  const originalUrl = externalUrl || assetUrl
  const isExternalEmbed = Boolean(displayUrl && isEmbedProvider(displayUrl))

  const validate = () => {
    const correct = Number(content.correctIndex ?? -1)
    if (selectedOption === correct) setFeedback('¡Respuesta correcta! Puedes continuar cuando quieras.')
    else setFeedback('Respuesta marcada. Puedes seguir avanzando o revisar el contenido e intentarlo otra vez.')
  }

  const TypeIcon = typeIcon(block.type)

  return <article className="content-experience">
    <header className="content-experience-header">
      <div className="content-type-mark"><TypeIcon size={22} /></div>
      <div className="content-title-copy">
        <span>{typeLabel(block.type)} · {block.required ? 'Obligatorio' : 'Opcional'}</span>
        <h2>{block.title}</h2>
        {block.description && <p>{block.description}</p>}
      </div>
      {completed && <span className="content-completed-badge"><CheckCircle2 size={15} /> Completado</span>}
    </header>

    <div className="content-experience-body">
      {block.type === 'text' && <ReadingContent value={String(content.html ?? content.text ?? '')} />}

      {block.type === 'video' && displayUrl && (
        <div className="media-experience">
          {isExternalEmbed ? <iframe src={displayUrl} title={block.title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen /> : <video controls src={displayUrl} />}
          {isExternalEmbed && <div className="media-completion-note"><PlayCircle size={16} /><span>Cuando termines, usa “Siguiente” y responde la pregunta rápida para registrar tu avance.</span></div>}
        </div>
      )}

      {block.type === 'audio' && displayUrl && (
        <div className="audio-experience">
          <span><FileAudio size={30} /></span>
          <div><strong>{block.title}</strong><small>Escucha el audio a tu ritmo. El avance se registra al responder la pregunta de transición.</small><audio controls src={displayUrl} /></div>
        </div>
      )}

      {block.type === 'image' && displayUrl && (
        <div className="image-learning-experience">
          <button className="image-learning-canvas" onClick={() => setLightboxOpen(true)}>
            <img src={displayUrl} alt={block.title} />
            <span><Maximize2 size={17} /> Ampliar imagen</span>
          </button>
          <div className="image-learning-actions">
            <span><Images size={16} /> Haz clic sobre la imagen para verla a pantalla completa y hacer zoom.</span>
            {originalUrl && <a href={originalUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Abrir original</a>}
          </div>
          {lightboxOpen && <ImageLightbox
            src={displayUrl}
            alt={block.title}
            originalUrl={originalUrl}
            close={() => setLightboxOpen(false)}
            previousTitle={previousTitle}
            nextTitle={nextTitle}
            canPrevious={canPrevious}
            canNext={canNext}
            previous={previous}
            next={next}
          />}
        </div>
      )}

      {block.type === 'presentation' && displayUrl && (
        <div className="presentation-experience">
          <iframe src={displayUrl} title={block.title} allowFullScreen />
          {originalUrl && <a href={originalUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Abrir presentación en otra pestaña</a>}
        </div>
      )}

      {block.type === 'file' && displayUrl && (
        <div className="file-learning-card">
          <span><File size={28} /></span>
          <div><strong>{block.title}</strong><small>Revisa el recurso antes de continuar.</small></div>
          <a href={displayUrl} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Abrir archivo</a>
        </div>
      )}

      {block.type === 'link' && (
        <div className="file-learning-card link-card">
          <span><Link2 size={28} /></span>
          <div><strong>Recurso externo</strong><small>Se abrirá en una pestaña nueva para que no pierdas tu posición en Aula EI.</small></div>
          <a href={String(content.url || '#')} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Abrir recurso</a>
        </div>
      )}

      {block.type === 'game' && (
        <div className="activity-experience">
          <span><Gamepad2 size={34} /></span>
          <h3>{content.gameTitle || block.title || 'Actividad interactiva'}</h3>
          <p>{content.instructions || 'Completa la actividad y confirma cuando hayas terminado.'}</p>
          <div className="activity-progress-note"><BrainCircuit size={16} /> El avance de este contenido se registra al responder la pregunta rápida de “Siguiente”.</div>
        </div>
      )}

      {block.type === 'validation' && (
        <div className="validation-experience">
          <div className="validation-question-heading"><ShieldCheck size={24} /><div><span>Validación rápida</span><h3>{String(content.prompt || 'Pregunta de validación')}</h3></div></div>
          <div className="validation-answer-grid">
            {(Array.isArray(content.options) ? content.options : []).map((option, index) => <button key={index} className={selectedOption === index ? 'selected' : ''} onClick={() => setSelectedOption(index)}><span>{String.fromCharCode(65 + index)}</span><strong>{String(option)}</strong>{selectedOption === index && <Check size={16} />}</button>)}
          </div>
          <button className="validation-submit" disabled={selectedOption === null} onClick={validate}><ShieldCheck size={16} /> Revisar respuesta</button>
        </div>
      )}

      {!displayUrl && ['video','audio','image','presentation','file'].includes(block.type) && <div className="asset-unavailable"><CircleAlert size={24} /><strong>Recurso no disponible</strong><span>{assetError || 'No fue posible cargar el archivo asociado a este contenido.'}</span></div>}

      {feedback && <div className={'content-feedback ' + (feedback.startsWith('¡') ? 'success' : '')}>{feedback}</div>}
    </div>

  </article>
}

function ReadingContent({ value }) {
  const text = value.trim()
  if (!text) return <div className="reading-experience empty">Este contenido aún no tiene texto.</div>
  const looksHtml = /<\/?[a-z][\s\S]*>/i.test(text)
  if (looksHtml) return <div className="reading-experience" dangerouslySetInnerHTML={{ __html: text }} />
  return <div className="reading-experience">{text.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
}

function ImageLightbox({ src, alt, originalUrl, close, previousTitle, nextTitle, canPrevious, canNext, previous, next }) {
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') close()
      if (event.key === 'ArrowLeft' && canPrevious) previous()
      if (event.key === 'ArrowRight' && canNext) next()
      if ((event.key === '+' || event.key === '=') && !event.ctrlKey) setZoom((value) => Math.min(3, value + .2))
      if (event.key === '-' && !event.ctrlKey) setZoom((value) => Math.max(.6, value - .2))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canPrevious, canNext, previous, next, close])

  return <div className="image-lightbox" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
    <div className="lightbox-toolbar">
      <div><Images size={17} /><strong>{alt}</strong></div>
      <div>
        <button onClick={() => setZoom((value) => Math.max(.6, value - .2))} title="Alejar"><ZoomOut size={18} /></button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((value) => Math.min(3, value + .2))} title="Acercar"><ZoomIn size={18} /></button>
        <button onClick={() => setZoom(1)} title="Restablecer zoom"><RotateCcw size={17} /></button>
        {originalUrl && <a href={originalUrl} target="_blank" rel="noreferrer" title="Abrir original"><ExternalLink size={17} /></a>}
        <button onClick={close} title="Cerrar"><X size={19} /></button>
      </div>
    </div>

    <div className="lightbox-canvas">
      <img src={src} alt={alt} style={{ transform: `scale(${zoom})` }} />
    </div>

    <nav className="lightbox-course-nav" aria-label="Navegación de la capacitación">
      <button disabled={!canPrevious} onClick={previous}>
        <ArrowLeft size={19} />
        <span><small>Contenido anterior</small><strong>{previousTitle}</strong></span>
      </button>
      <div>
        <span>Vista ampliada</span>
        <small>También puedes usar ← y → para navegar.</small>
      </div>
      <button disabled={!canNext} onClick={next}>
        <span><small>Siguiente contenido</small><strong>{nextTitle}</strong></span>
        <ArrowRight size={19} />
      </button>
    </nav>
  </div>
}

function PracticeGateModal({ question, selected, verdict, checking, selectAnswer, loading, advancing, targetTitle, retry, continueForward, continueWithoutQuestion }) {
  const resolved = verdict === true || verdict === false
  const unavailable = verdict === 'unavailable'

  return <div className="practice-gate-backdrop" role="presentation">
    <section className="practice-gate-modal" role="dialog" aria-modal="true" aria-labelledby="practice-gate-title">
      <div className="practice-gate-accent" />

      <header className="practice-gate-header">
        <div className="practice-gate-icon"><BrainCircuit size={26} /></div>
        <div>
          <span>Antes de continuar</span>
          <h2 id="practice-gate-title">Pregunta rápida</h2>
          <p>Elige una opción. Te diremos si acertaste, pero nunca mostraremos cuál era la respuesta correcta.</p>
        </div>
      </header>

      {loading ? (
        <div className="practice-gate-loading">
          <Loader2 className="spin" size={28} />
          <strong>Preparando una pregunta aleatoria…</strong>
          <span>Estamos tomando una pregunta del banco de esta capacitación.</span>
        </div>
      ) : question ? (
        <>
          <div className="practice-gate-question">
            <span className="practice-gate-kicker"><Sparkles size={14} /> Reto de transición</span>
            <h3>{question.prompt}</h3>

            <div className="practice-gate-options">
              {(question.options || []).map((option, index) => {
                const isSelected = selected === option.id
                const statusClass = isSelected && verdict === true
                  ? 'selected correct'
                  : isSelected && verdict === false
                    ? 'selected incorrect'
                    : isSelected
                      ? 'selected'
                      : ''

                return <button
                  key={option.id}
                  className={statusClass}
                  onClick={() => selectAnswer(option.id)}
                  disabled={advancing || checking || resolved || unavailable}
                >
                  <span>{String.fromCharCode(65 + index)}</span>
                  <strong>{option.label}</strong>
                  {isSelected && checking && <Loader2 className="spin" size={18} />}
                  {isSelected && verdict === true && <CheckCircle2 size={18} />}
                  {isSelected && verdict === false && <X size={18} />}
                  {isSelected && unavailable && <CircleAlert size={18} />}
                </button>
              })}
            </div>

            {checking && <div className="practice-answer-feedback checking"><Loader2 className="spin" size={16} /><span>Comprobando tu respuesta…</span></div>}
            {verdict === true && <div className="practice-answer-feedback correct"><CheckCircle2 size={17} /><div><strong>¡Correcto!</strong><span>Muy bien. Puedes continuar con el siguiente contenido.</span></div></div>}
            {verdict === false && <div className="practice-answer-feedback incorrect"><X size={17} /><div><strong>Respuesta incorrecta</strong><span>No revelaremos la respuesta correcta. Puedes continuar y reforzarla durante la capacitación.</span></div></div>}
            {unavailable && <div className="practice-answer-feedback unavailable"><CircleAlert size={17} /><div><strong>Respuesta registrada</strong><span>No pudimos comprobarla en este momento, pero esto nunca bloqueará tu avance.</span></div></div>}
          </div>

          <footer className="practice-gate-footer">
            <div>
              <ShieldCheck size={16} />
              <span>Este reto es de práctica. No suma ni resta puntos del examen final.</span>
            </div>
            <button className="practice-gate-continue" disabled={!selected || checking || advancing || (!resolved && !unavailable)} onClick={continueForward}>
              {advancing ? <Loader2 className="spin" size={17} /> : <ArrowRight size={17} />}
              {advancing ? 'Guardando avance…' : resolved || unavailable ? 'Continuar' : 'Responder y continuar'}
            </button>
          </footer>

          <div className="practice-gate-target">Siguiente: <strong>{targetTitle}</strong></div>
        </>
      ) : (
        <div className="practice-gate-error">
          <CircleAlert size={28} />
          <strong>No pudimos cargar la pregunta rápida.</strong>
          <span>Inténtalo otra vez para continuar con la capacitación.</span>
          <div className="practice-gate-error-actions">
            <button onClick={retry} disabled={advancing}><RotateCcw size={16} /> Cargar otra pregunta</button>
            <button className="practice-gate-skip" onClick={continueWithoutQuestion} disabled={advancing}>
              {advancing ? <Loader2 className="spin" size={16} /> : <ArrowRight size={16} />}
              Continuar por ahora
            </button>
          </div>
        </div>
      )}
    </section>
  </div>
}
function ExamExperience({ questions, answers, setAnswers, passingScore, submit, loading }) {
  const answered = Object.keys(answers).length
  return <section className="exam-experience">
    <header className="exam-experience-hero">
      <span><GraduationCap size={28} /></span>
      <div><small>Evaluación certificable</small><h2>Examen final</h2><p>Responde todas las preguntas. Necesitas mínimo <strong>{passingScore}%</strong> para aprobar.</p></div>
      <div className="exam-answer-progress"><strong>{answered}/{questions.length}</strong><span>respondidas</span></div>
    </header>

    <div className="exam-question-stack">
      {questions.map((question, index) => <article key={question.id} className={'exam-learning-question ' + (answers[question.id] ? 'answered' : '')}>
        <div className="exam-question-number">{index + 1}</div>
        <div className="exam-question-content">
          <h3>{question.prompt}</h3>
          <div className="exam-learning-options">
            {(question.options || []).map((option, optionIndex) => <label key={option.id} className={answers[question.id] === option.id ? 'selected' : ''}>
              <input type="radio" name={question.id} checked={answers[question.id] === option.id} onChange={() => setAnswers({ ...answers, [question.id]: option.id })} />
              <span>{String.fromCharCode(65 + optionIndex)}</span>
              <strong>{option.label}</strong>
              {answers[question.id] === option.id && <CheckCircle2 size={18} />}
            </label>)}
          </div>
        </div>
      </article>)}
    </div>

    <footer className="exam-submit-bar">
      <div><strong>{answered === questions.length ? 'Todas las preguntas están respondidas.' : `Te faltan ${questions.length - answered} respuesta(s).`}</strong><span>Revisa tus respuestas antes de enviar el examen.</span></div>
      <button disabled={answered < questions.length || loading} onClick={submit}>{loading ? <Loader2 className="spin" size={17} /> : <GraduationCap size={17} />} Enviar examen</button>
    </footer>
  </section>
}

function ExamResult({ result, course, retry }) {
  const passed = Boolean(result?.passed)
  const code = result?.certificate_code
  const openCertificate = () => {
    if (!code) return
    const anchor = document.createElement('a')
    anchor.href = new URL('/#/certificate/' + encodeURIComponent(code), window.location.origin).href
    anchor.target = '_blank'
    anchor.rel = 'noopener noreferrer'
    anchor.click()
  }
  return <section className={'exam-result-experience ' + (passed ? 'passed' : 'failed')}>
    <div className="result-celebration-icon">{passed ? <Trophy size={46} /> : <CircleAlert size={42} />}</div>
    <span className="result-eyebrow">{passed ? 'Logro desbloqueado' : 'Sigue aprendiendo'}</span>
    <h2>{passed ? '¡Capacitación aprobada!' : 'Aún no alcanzas la nota mínima'}</h2>
    <div className="result-score"><strong>{result?.score ?? 0}%</strong><span>Tu resultado</span></div>
    <p>{passed ? 'Completaste la ruta y aprobaste el examen final. Tu certificado oficial ya está disponible.' : `Necesitas mínimo ${course.passing_score || 80}%. Puedes repasar los contenidos y volver a intentarlo.`}</p>
    <div className="result-actions">
      {passed && code ? <button className="result-primary" onClick={openCertificate}><Award size={17} /> Abrir certificado</button> : <button className="result-primary" onClick={retry}><RotateCcw size={17} /> Volver a intentar</button>}
      <button className="result-secondary" onClick={() => navigate('/#/catalog')}><ArrowLeft size={17} /> Mis capacitaciones</button>
    </div>
    {passed && <CelebrationBurst />}
  </section>
}

function AchievementToast({ achievement, onClose }) {
  const Icon = achievement.icon || Trophy
  return <aside className="achievement-toast">
    <div className="achievement-toast-icon"><Icon size={24} /></div>
    <div><span>Logro desbloqueado</span><strong>{achievement.title}</strong><p>{achievement.description}</p></div>
    <button onClick={onClose}><X size={16} /></button>
    <CelebrationBurst mini />
  </aside>
}

function CelebrationBurst({ mini = false }) {
  return <div className={'celebration-burst ' + (mini ? 'mini' : '')}>{Array.from({ length: 16 }).map((_, index) => <i key={index} style={{ '--i': index }} />)}</div>
}

function StateView({ title, text, icon: Icon, spin, error }) {
  return <main className="learner-state-view"><section><img src="/brand/logo-aula-ei.png" alt="Aula EI" /><Icon size={34} className={spin ? 'spin' : error ? 'error' : ''} /><h1>{title}</h1><p>{text}</p>{error && <button onClick={() => navigate('/#/catalog')}>Volver a mis capacitaciones</button>}</section></main>
}

function normalizeCourse(course) {
  return {
    ...course,
    phases: [...(course.phases || [])]
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((phase) => ({
        ...phase,
        blocks: [...(phase.blocks || [])]
          .filter((block) => block.status !== 'draft')
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
      })),
  }
}

function flattenBlocks(course) {
  return (course?.phases || []).flatMap((phase) => phase.blocks || [])
}

function typeLabel(type) {
  return {
    text: 'Lectura',
    video: 'Video',
    presentation: 'Presentación',
    image: 'Imagen / infografía',
    audio: 'Audio',
    file: 'Archivo',
    link: 'Recurso externo',
    game: 'Actividad',
    validation: 'Validación',
  }[type] || 'Contenido'
}

function typeIcon(type) {
  return {
    text: FileText,
    video: Video,
    presentation: Presentation,
    image: ImageIcon,
    audio: FileAudio,
    file: File,
    link: Link2,
    game: Gamepad2,
    validation: ShieldCheck,
  }[type] || BookOpen
}

function googleDriveId(url) {
  const direct = url.match(/drive\.google\.com\/file\/d\/([^/?#]+)/)
  if (direct?.[1]) return direct[1]
  try { return new URL(url).searchParams.get('id') || '' } catch { return '' }
}

function oneDriveEmbed(url) {
  try {
    const parsed = new URL(url)
    const resid = parsed.searchParams.get('resid')
    const authkey = parsed.searchParams.get('authkey')
    if (parsed.hostname.includes('onedrive.live.com') && resid) {
      const embed = new URL('https://onedrive.live.com/embed')
      embed.searchParams.set('resid', resid)
      if (authkey) embed.searchParams.set('authkey', authkey)
      return embed.toString()
    }
  } catch {}
  return url
}

function youtubeEmbed(url) {
  try {
    const parsed = new URL(url)
    if (parsed.hostname.includes('youtu.be')) {
      const id = parsed.pathname.replace(/^\//, '')
      return id ? 'https://www.youtube.com/embed/' + id : url
    }
    if (parsed.hostname.includes('youtube.com')) {
      const id = parsed.searchParams.get('v') || parsed.pathname.match(/\/embed\/([^/?#]+)/)?.[1]
      return id ? 'https://www.youtube.com/embed/' + id : url
    }
  } catch {}
  return url
}

function normalizeExternalUrl(url, type) {
  const raw = url.trim()
  if (!raw) return ''
  const driveId = googleDriveId(raw)
  if (driveId) return type === 'image' ? `https://drive.google.com/thumbnail?id=${driveId}&sz=w2400` : `https://drive.google.com/file/d/${driveId}/preview`
  if (/youtube\.com|youtu\.be/i.test(raw)) return youtubeEmbed(raw)
  if (/onedrive\.live\.com|1drv\.ms/i.test(raw)) return oneDriveEmbed(raw)
  return raw
}

function isEmbedProvider(url) {
  return /drive\.google\.com|onedrive\.live\.com|1drv\.ms|youtube\.com\/embed/i.test(url)
}

function seededIndex(seed, length) {
  if (!length) return 0
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) hash = ((hash << 5) - hash + seed.charCodeAt(index)) | 0
  return Math.abs(hash) % length
}

function dateLabel(value) {
  if (!value) return 'Sin vencimiento'
  try { return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) } catch { return String(value) }
}

function navigate(url) {
  window.location.assign(url)
}
