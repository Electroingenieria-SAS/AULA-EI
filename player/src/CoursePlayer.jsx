import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, Award, BadgeCheck, BookOpen, Check, CheckCircle2, CircleAlert, Clock3, GraduationCap, LockKeyhole, Medal, Menu, PlayCircle, ShieldCheck, Sparkles, BrainCircuit, Trophy, X,
} from 'lucide-react'
import LearnerTopbar from './LearnerTopbar.jsx'
import {
  AchievementToast,
  CourseTransitionState,
  ExamExperience,
  ExamResult,
  PracticeGateModal,
  PracticeGateContent,
} from './course-player/CoursePlayerViews.jsx'
import { ContentExperience, CourseOutline, useCourseAsset } from './course-player/CourseContentViews.jsx'
import ImageGallery from './course-player/ImageGallery.jsx'
import { exitBrowserFullscreen } from './course-player/immersive-navigation.js'
import { appUrl, navigateLearner } from './navigation.js'
import { invalidateCache } from '../../src/data-cache.js'
import { supabase } from './supabase.js'

const ACHIEVEMENTS = [
  { key: 'first', title: 'Primer paso', description: 'Completaste tu primer contenido.', icon: Sparkles, unlock: ({ completedCount }) => completedCount >= 1 },
  { key: 'quarter', title: 'En marcha', description: 'Llegaste al 25% de la ruta obligatoria.', icon: Medal, unlock: ({ progress }) => progress >= 25 },
  { key: 'half', title: 'Mitad del camino', description: 'Superaste el 50% de la capacitación.', icon: Award, unlock: ({ progress }) => progress >= 50 },
  { key: 'final', title: 'Recta final', description: 'Alcanzaste el 75% del recorrido.', icon: Trophy, unlock: ({ progress }) => progress >= 75 },
  { key: 'mastery', title: 'Contenido dominado', description: 'Completaste todos los contenidos obligatorios.', icon: BadgeCheck, unlock: ({ progress }) => progress >= 100 },
]

export default function CoursePlayer({ suppliedSessionUser = null }) {
  const stageRef = useRef(null)
  const [sessionUser, setSessionUser] = useState(suppliedSessionUser)
  const [course, setCourse] = useState(null)
  const [enrollment, setEnrollment] = useState(null)
  const [completed, setCompleted] = useState(new Set())
  const [currentBlockId, setCurrentBlockId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [outlineOpen, setOutlineOpen] = useState(false)
  const [immersiveOpen, setImmersiveOpen] = useState(false)
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
      const user = suppliedSessionUser
      if (!user) {
        navigateLearner('/login', { replace: true })
        return
      }
      if (!courseId) throw new Error('No se recibió la capacitación que quieres abrir.')

      setSessionUser(user)

      const { data: accessState, error: accessError } = await supabase.rpc('get_my_course_route_access', {
        p_course_id: courseId,
      })
      if (!accessError && accessState?.allowed === false) {
        throw new Error(accessState.reason || 'Esta capacitación todavía está bloqueada dentro de tu ruta de aprendizaje.')
      }

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

  useEffect(() => { load() }, [courseId, suppliedSessionUser?.id])

  const allBlocks = useMemo(() => course ? flattenBlocks(course) : [], [course])
  const requiredBlocks = useMemo(() => allBlocks.filter((block) => block.required && block.status !== 'draft'), [allBlocks])
  const currentIndex = allBlocks.findIndex((block) => block.id === currentBlockId)
  const currentBlock = currentIndex >= 0 ? allBlocks[currentIndex] : null
  const mediaAsset = useCourseAsset(currentBlock)
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
    if (!immersiveOpen) window.requestAnimationFrame(() => stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
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
    invalidateCache('home:')
    invalidateCache('catalog:')

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
    if (currentIndex < 0 || practiceLoading || practiceAdvanceBusy || practiceGateOpen) return
    const next = allBlocks[currentIndex + 1] || null
    if (completed.has(currentBlockId)) {
      if (next) selectBlock(next.id)
      else await startExam()
      return
    }
    setPracticeNextBlockId(next?.id || null)
    setPracticeGateOpen(true)
    try {
      await loadPracticeQuestion(crypto.randomUUID())
    } catch {
      setPracticeLoading(false)
      setPracticeQuestion(null)
    }
  }

  const continueAfterPractice = async () => {
    if (!practiceAnswer || !currentBlockId || practiceAdvanceBusy || practiceChecking) return

    setPracticeAdvanceBusy(true)
    setPracticeVerdict(null)

    // The quick question is a transition checkpoint, not an exam attempt.
    // Any selected option allows progression; the answer is stored only as
    // context for the completed content and never graded here.
    const saved = await completeBlock(currentBlockId, {
      transition_practice: true,
      practice_question_id: practiceQuestion?.id || null,
      practice_option_id: practiceAnswer,
      practice_correct: typeof practiceVerdict === 'boolean' ? practiceVerdict : null,
    })
    if (!saved) { setPracticeAdvanceBusy(false); return }

    const target = practiceNextBlockId
    setPracticeGateOpen(false)
    setPracticeQuestion(null)
    setPracticeAnswer(null)
    setPracticeVerdict(null)
    setPracticeChecking(false)
    setPracticeNextBlockId(null)
    setPracticeAdvanceBusy(false)

    if (target) selectBlock(target)
    else if (!immersiveOpen) window.requestAnimationFrame(() => stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const continueWithoutPractice = async () => {
    if (!currentBlockId || practiceAdvanceBusy) return

    setPracticeAdvanceBusy(true)
    const saved = await completeBlock(currentBlockId, {
      transition_practice: true,
      practice_unavailable: true,
    })
    if (!saved) { setPracticeAdvanceBusy(false); return }

    const target = practiceNextBlockId
    setPracticeGateOpen(false)
    setPracticeQuestion(null)
    setPracticeAnswer(null)
    setPracticeVerdict(null)
    setPracticeChecking(false)
    setPracticeNextBlockId(null)
    setPracticeAdvanceBusy(false)

    if (target) selectBlock(target)
    else if (!immersiveOpen) window.requestAnimationFrame(() => stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
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
    await exitBrowserFullscreen()
    setImmersiveOpen(false)
    setOutlineOpen(false)
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
      invalidateCache('home:')
      invalidateCache('catalog:')
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

  if (loading) return <CourseTransitionState loading />
  if (!course) return <CourseTransitionState error message={message || 'No encontramos información disponible.'} />

  const openImmersive = async ({ fullscreen = false } = {}) => {
    if (!currentBlock || !['image', 'video', 'presentation'].includes(currentBlock.type)) return
    // Keep the same viewer mounted for every block and its quick question.
    setImmersiveOpen(true)
    if (fullscreen && window.matchMedia('(min-width: 901px) and (pointer: fine)').matches) {
      try {
        const root = document.documentElement
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
          if (root.requestFullscreen) await root.requestFullscreen({ navigationUI: 'hide' })
          else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen()
        }
      } catch {}
    }
  }

  const questionProps = {
    question: practiceQuestion,
    selected: practiceAnswer,
    verdict: practiceVerdict,
    checking: practiceChecking,
    selectAnswer: checkPracticeAnswer,
    loading: practiceLoading,
    advancing: practiceAdvanceBusy,
    targetTitle: allBlocks.find((block) => block.id === practiceNextBlockId)?.title || 'Examen final',
    retry: () => loadPracticeQuestion(crypto.randomUUID()),
    continueForward: continueAfterPractice,
    continueWithoutQuestion: continueWithoutPractice,
  }

  return <main className="learner-course-app course-workspace-page">
    <LearnerTopbar
      center={<span className="course-topbar-caption">{course.title}</span>}
      actions={<button className="secondary-action" onClick={() => navigateLearner('/catalog')}><ArrowLeft size={17} /> Mis capacitaciones</button>}
    />

    <header className="course-intro">
      <div className="course-intro-copy">
        <span className="course-intro-label"><BookOpen size={15} /> Capacitación Aula EI {enrollment?.due_at ? ' · Hasta ' + dateLabel(enrollment.due_at) : ''}</span>
        <h1>{course.title}</h1>
        {course.description && <p>{course.description}</p>}
      </div>
      <div className="course-intro-progress" aria-label={`Progreso obligatorio ${progress}%`}>
        <span><strong>{progress}%</strong> completado</span>
        <div className="course-intro-track"><i style={{ width: progress + '%' }} /></div>
        <small>{requiredCompleted} de {requiredBlocks.length} contenidos obligatorios</small>
      </div>
    </header>

    {message && <div className="learner-inline-message"><CircleAlert size={17} /><span>{message}</span><button onClick={() => setMessage('')}><X size={15} /></button></div>}

    <div className="course-workspace">
      {outlineOpen && <CourseOutline
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
      />}

      <section className="course-main" ref={stageRef}>
        <div className="course-stage-toolbar">
          <div className="course-stage-location">
            <strong>{currentPhase?.title || (examQuestions || examResult ? 'Evaluación final' : 'Capacitación')}</strong>
            {currentBlock && <span>{currentIndex + 1} de {allBlocks.length}</span>}
          </div>
          {currentBlock && <div className="stage-context-progress"><span style={{ width: allBlocks.length ? ((currentIndex + 1) / allBlocks.length) * 100 + '%' : '0%' }} /></div>}
          <button type="button" className="course-route-trigger" onClick={() => setOutlineOpen(true)}><Menu size={17} /> Ver ruta</button>
        </div>

        <div className="course-stage-card" key={examQuestions ? 'exam' : examResult ? 'result' : currentBlockId || 'empty'}>
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
              asset={mediaAsset}
              openImmersive={openImmersive}
            />
          ) : (
            <div className="learner-empty-stage"><BookOpen size={38} /><h2>Esta capacitación aún no tiene contenido visible.</h2><p>Cuando el equipo publique contenidos aparecerán aquí.</p></div>
          )}
        </div>

        {!examQuestions && !examResult && currentBlock && (
          <nav className="course-flow-nav" aria-label="Navegación por contenidos">
            <button type="button" className="course-flow-button previous" disabled={currentIndex <= 0 || practiceGateOpen} onClick={goPrevious}><ArrowLeft size={17} /> Anterior</button>
            <span className="course-nav-progress">{currentIndex + 1} / {allBlocks.length}</span>
            <button type="button" className="course-flow-button next" disabled={practiceLoading || practiceAdvanceBusy || practiceGateOpen} onClick={goNext}>
              {currentIndex === allBlocks.length - 1 && completed.has(currentBlockId) ? 'Presentar examen' : 'Siguiente'} <ArrowRight size={17} />
            </button>
          </nav>
        )}

      </section>

      <details className="course-insights">
        <summary>
          <span><Trophy size={17} /> Tus logros <strong>{unlockedAchievements.length}/{ACHIEVEMENTS.length}</strong></span>
          <span><ShieldCheck size={17} /> Progreso por fase <strong>{course.phases.filter((phase) => phaseStats(phase).complete).length}/{course.phases.length}</strong></span>
          <span className="course-insights-hint">Ver detalles</span>
        </summary>
        <div className="course-insights-grid">
          <section>
            <h3>Logros de aprendizaje</h3>
            <ul>{ACHIEVEMENTS.map((achievement) => <li key={achievement.key}>
              {achievement.unlock(achievementContext) ? <CheckCircle2 size={16} /> : <LockKeyhole size={16} />}
              <span>{achievement.title}</span>
            </li>)}</ul>
          </section>
          <section>
            <h3>Fases de la capacitación</h3>
            <ul>{course.phases.map((phase) => {
              const stats = phaseStats(phase)
              return <li key={phase.id}>
                {stats.complete ? <CheckCircle2 size={16} /> : <BookOpen size={16} />}
                <span>{phase.title}</span><strong>{stats.percent}%</strong>
              </li>
            })}</ul>
          </section>
        </div>
      </details>

    </div>

    {practiceGateOpen && !immersiveOpen && <PracticeGateModal {...questionProps} />}
    {immersiveOpen && currentBlock && (
      <ImageGallery
        src={mediaAsset.displayUrl}
        alt={currentBlock.title}
        description={currentBlock.description || ''}
        originalUrl={mediaAsset.originalUrl}
        mediaType={currentBlock.type}
        isExternalEmbed={mediaAsset.isExternalEmbed}
        fallbackText={String(currentBlock.content?.html ?? currentBlock.content?.text ?? '')}
        close={() => setImmersiveOpen(false)}
        previousTitle={allBlocks[currentIndex - 1]?.title || 'Inicio'}
        nextTitle={allBlocks[currentIndex + 1]?.title || 'Examen final'}
        canPrevious={currentIndex > 0 && !practiceGateOpen}
        canNext={!practiceLoading && !practiceAdvanceBusy && !practiceGateOpen}
        previous={goPrevious}
        next={goNext}
        practiceStep={practiceGateOpen}
        practiceNode={practiceGateOpen ? <PracticeGateContent {...questionProps} embedded /> : null}
      />
    )}

    {achievementToast && <AchievementToast achievement={achievementToast} onClose={() => setAchievementToast(null)} />}
  </main>
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

