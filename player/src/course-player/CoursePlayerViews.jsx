import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowLeft, ArrowRight, Award, BookOpen, BrainCircuit, CheckCircle2,
  CircleAlert, ExternalLink, GraduationCap, Images, Loader2, RotateCcw,
  ShieldCheck, Sparkles, Trophy, X, ZoomIn, ZoomOut,
} from 'lucide-react'
import LearnerTopbar from '../LearnerTopbar.jsx'
import { appUrl, navigateLearner } from '../navigation.js'
import { sanitizeHtml } from '../../../src/security.js'

export function ReadingContent({ value }) {
  const text = value.trim()
  if (!text) return <div className="reading-experience empty">Este contenido aún no tiene texto.</div>
  const looksHtml = /<\/?[a-z][\s\S]*>/i.test(text)
  if (looksHtml) return <div className="reading-experience" dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }} />
  return <div className="reading-experience">{text.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
}

export function ImageLightbox({ src, alt, originalUrl, close, previousTitle, nextTitle, canPrevious, canNext, previous, next }) {
  const stageRef = useRef(null)
  const imageRef = useRef(null)
  const pointersRef = useRef(new Map())
  const viewRef = useRef({ scale: 1, x: 0, y: 0 })
  const gestureRef = useRef({
    mode: 'idle',
    startedAt: 0,
    startPoint: null,
    startCenter: null,
    startDistance: 0,
    startScale: 1,
    startX: 0,
    startY: 0,
    moved: false,
    lastTapAt: 0,
    lastTapPoint: null,
  })
  const [view, setView] = useState(viewRef.current)
  const [showHint, setShowHint] = useState(true)

  const clampScale = (value) => Math.min(6, Math.max(1, Number(value) || 1))

  const clampView = (candidate) => {
    const stage = stageRef.current
    const image = imageRef.current
    const scale = clampScale(candidate.scale)

    if (!stage || !image || scale <= 1.001) return { scale: 1, x: 0, y: 0 }

    const imageWidth = image.offsetWidth || stage.clientWidth
    const imageHeight = image.offsetHeight || stage.clientHeight
    const maxX = Math.max(0, (imageWidth * scale - stage.clientWidth) / 2)
    const maxY = Math.max(0, (imageHeight * scale - stage.clientHeight) / 2)

    return {
      scale,
      x: Math.max(-maxX, Math.min(maxX, Number(candidate.x) || 0)),
      y: Math.max(-maxY, Math.min(maxY, Number(candidate.y) || 0)),
    }
  }

  const applyView = (candidate) => {
    const nextView = clampView(candidate)
    viewRef.current = nextView
    setView(nextView)
  }

  const resetView = () => applyView({ scale: 1, x: 0, y: 0 })

  const zoomAt = (requestedScale, clientX = null, clientY = null) => {
    const current = viewRef.current
    const scale = clampScale(requestedScale)
    if (scale <= 1.001) return resetView()

    let x = current.x
    let y = current.y
    const stage = stageRef.current

    if (stage && Number.isFinite(clientX) && Number.isFinite(clientY)) {
      const rect = stage.getBoundingClientRect()
      const anchorX = clientX - (rect.left + rect.width / 2)
      const anchorY = clientY - (rect.top + rect.height / 2)
      const ratio = scale / current.scale
      x = anchorX - (anchorX - current.x) * ratio
      y = anchorY - (anchorY - current.y) * ratio
    } else if (current.scale > 0) {
      const ratio = scale / current.scale
      x = current.x * ratio
      y = current.y * ratio
    }

    applyView({ scale, x, y })
  }

  const pointerCenter = (values) => ({
    x: (values[0].x + values[1].x) / 2,
    y: (values[0].y + values[1].y) / 2,
  })

  const pointerDistance = (values) => Math.hypot(
    values[0].x - values[1].x,
    values[0].y - values[1].y,
  )

  const rememberGestureStart = (mode, point = null) => {
    const current = viewRef.current
    gestureRef.current = {
      ...gestureRef.current,
      mode,
      startedAt: Date.now(),
      startPoint: point,
      startCenter: null,
      startDistance: 0,
      startScale: current.scale,
      startX: current.x,
      startY: current.y,
      moved: false,
    }
  }

  const startPinch = () => {
    const values = [...pointersRef.current.values()].slice(0, 2)
    if (values.length < 2) return
    const current = viewRef.current
    gestureRef.current = {
      ...gestureRef.current,
      mode: 'pinch',
      startedAt: Date.now(),
      startPoint: null,
      startCenter: pointerCenter(values),
      startDistance: Math.max(1, pointerDistance(values)),
      startScale: current.scale,
      startX: current.x,
      startY: current.y,
      moved: true,
    }
  }

  useEffect(() => {
    document.body.classList.add('aula-image-viewer-open')
    const timer = window.setTimeout(() => setShowHint(false), 3200)

    const onKey = (event) => {
      if (event.key === 'Escape') close()
      if (event.key === 'ArrowLeft' && canPrevious) previous()
      if (event.key === 'ArrowRight' && canNext) next()
      if ((event.key === '+' || event.key === '=') && !event.ctrlKey) zoomAt(viewRef.current.scale + .5)
      if (event.key === '-' && !event.ctrlKey) zoomAt(viewRef.current.scale - .5)
      if (event.key === '0' && !event.ctrlKey) resetView()
    }

    const reclamp = () => applyView(viewRef.current)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', reclamp, { passive: true })
    window.visualViewport?.addEventListener('resize', reclamp, { passive: true })

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', reclamp)
      window.visualViewport?.removeEventListener('resize', reclamp)
      document.body.classList.remove('aula-image-viewer-open')
    }
  }, [src, canPrevious, canNext, previous, next, close])

  useEffect(() => {
    pointersRef.current.clear()
    viewRef.current = { scale: 1, x: 0, y: 0 }
    setView({ scale: 1, x: 0, y: 0 })
    setShowHint(true)
  }, [src])

  const onPointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    setShowHint(false)
    event.currentTarget.setPointerCapture?.(event.pointerId)
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (pointersRef.current.size >= 2) {
      startPinch()
      event.preventDefault()
      return
    }

    rememberGestureStart(viewRef.current.scale > 1.001 ? 'pan' : 'swipe', {
      x: event.clientX,
      y: event.clientY,
    })
  }

  const onPointerMove = (event) => {
    if (!pointersRef.current.has(event.pointerId)) return
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (pointersRef.current.size >= 2) {
      if (gestureRef.current.mode !== 'pinch') startPinch()
      const gesture = gestureRef.current
      const values = [...pointersRef.current.values()].slice(0, 2)
      const center = pointerCenter(values)
      const distance = Math.max(1, pointerDistance(values))
      const scale = clampScale(gesture.startScale * (distance / gesture.startDistance))
      const stage = stageRef.current
      const rect = stage?.getBoundingClientRect()

      if (rect && gesture.startCenter) {
        const startAnchorX = gesture.startCenter.x - (rect.left + rect.width / 2)
        const startAnchorY = gesture.startCenter.y - (rect.top + rect.height / 2)
        const currentAnchorX = center.x - (rect.left + rect.width / 2)
        const currentAnchorY = center.y - (rect.top + rect.height / 2)
        const ratio = scale / gesture.startScale

        applyView({
          scale,
          x: currentAnchorX - (startAnchorX - gesture.startX) * ratio,
          y: currentAnchorY - (startAnchorY - gesture.startY) * ratio,
        })
      } else {
        applyView({ scale, x: gesture.startX, y: gesture.startY })
      }

      event.preventDefault()
      return
    }

    const gesture = gestureRef.current
    if (!gesture.startPoint) return

    const dx = event.clientX - gesture.startPoint.x
    const dy = event.clientY - gesture.startPoint.y
    if (Math.hypot(dx, dy) > 6) gesture.moved = true

    if (gesture.mode === 'pan' && viewRef.current.scale > 1.001) {
      applyView({
        scale: viewRef.current.scale,
        x: gesture.startX + dx,
        y: gesture.startY + dy,
      })
      event.preventDefault()
    }
  }

  const registerTap = (event) => {
    const gesture = gestureRef.current
    if (gesture.moved || Date.now() - gesture.startedAt > 320) return false

    const now = Date.now()
    const point = { x: event.clientX, y: event.clientY }
    const previousTap = gesture.lastTapPoint
    const nearPrevious = previousTap
      ? Math.hypot(point.x - previousTap.x, point.y - previousTap.y) < 36
      : false

    if (gesture.lastTapAt && now - gesture.lastTapAt < 320 && nearPrevious) {
      if (viewRef.current.scale > 1.15) resetView()
      else zoomAt(2.5, point.x, point.y)
      gesture.lastTapAt = 0
      gesture.lastTapPoint = null
      return true
    }

    gesture.lastTapAt = now
    gesture.lastTapPoint = point
    return false
  }

  const finishSinglePointerGesture = (event) => {
    const gesture = gestureRef.current
    if (!gesture.startPoint) return

    const dx = event.clientX - gesture.startPoint.x
    const dy = event.clientY - gesture.startPoint.y
    const isSwipe = viewRef.current.scale <= 1.001
      && Math.abs(dx) >= 62
      && Math.abs(dx) > Math.abs(dy) * 1.25

    if (isSwipe) {
      if (dx < 0 && canNext) next()
      if (dx > 0 && canPrevious) previous()
      gesture.lastTapAt = 0
      gesture.lastTapPoint = null
      return
    }

    registerTap(event)
  }

  const onPointerUp = (event) => {
    const wasSinglePointer = pointersRef.current.size === 1
    if (wasSinglePointer) finishSinglePointerGesture(event)

    pointersRef.current.delete(event.pointerId)
    event.currentTarget.releasePointerCapture?.(event.pointerId)

    if (pointersRef.current.size === 1 && viewRef.current.scale > 1.001) {
      const [remaining] = pointersRef.current.values()
      rememberGestureStart('pan', remaining)
      return
    }

    if (!pointersRef.current.size) {
      applyView(viewRef.current)
      gestureRef.current.mode = 'idle'
      gestureRef.current.startPoint = null
      gestureRef.current.startCenter = null
    }
  }

  const onPointerCancel = (event) => {
    pointersRef.current.delete(event.pointerId)
    if (!pointersRef.current.size) {
      applyView(viewRef.current)
      gestureRef.current.mode = 'idle'
      gestureRef.current.startPoint = null
      gestureRef.current.startCenter = null
    }
  }

  const viewer = <div
    className="image-lightbox gallery-viewer-v7"
    role="dialog"
    aria-modal="true"
    aria-label={'Imagen a pantalla completa: ' + alt}
  >
    <div className="lightbox-toolbar gallery-toolbar">
      <div className="gallery-toolbar-title"><Images size={17} /><strong>{alt}</strong></div>
      <div className="gallery-toolbar-actions">
        <button type="button" onClick={() => zoomAt(viewRef.current.scale - .5)} title="Alejar" aria-label="Alejar imagen"><ZoomOut size={18} /></button>
        <span className="gallery-zoom-badge">{Math.round(view.scale * 100)}%</span>
        <button type="button" onClick={() => zoomAt(viewRef.current.scale + .5)} title="Acercar" aria-label="Acercar imagen"><ZoomIn size={18} /></button>
        <button type="button" onClick={resetView} title="Restablecer zoom" aria-label="Restablecer imagen"><RotateCcw size={17} /></button>
        {originalUrl && <a href={originalUrl} target="_blank" rel="noreferrer" title="Abrir original" aria-label="Abrir imagen original"><ExternalLink size={17} /></a>}
        <button type="button" className="gallery-close-button" onClick={close} title="Cerrar" aria-label="Cerrar imagen"><X size={20} /></button>
      </div>
    </div>

    <div
      ref={stageRef}
      className={'lightbox-canvas touch-zoom-canvas gallery-stage ' + (view.scale > 1.001 ? 'is-zoomed' : 'is-fitted')}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onContextMenu={(event) => event.preventDefault()}
    >
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        draggable="false"
        decoding="async"
        onLoad={() => applyView(viewRef.current)}
        style={{
          transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
        }}
      />

      {showHint && <div className="gallery-gesture-hint" role="status">
        <strong>Pellizca para ampliar</strong>
        <span>Arrastra para recorrer · doble toque para zoom · desliza a los lados para avanzar.</span>
      </div>}
    </div>

    <nav className="lightbox-course-nav gallery-course-nav" aria-label="Navegación de la capacitación">
      <button
        type="button"
        className="gallery-nav-button gallery-nav-previous"
        disabled={!canPrevious}
        onClick={previous}
        aria-label={'Contenido anterior: ' + previousTitle}
      >
        <ArrowLeft size={24} />
        <span><small>Anterior</small><strong>{previousTitle}</strong></span>
      </button>
      <div className="gallery-navigation-status">
        <span>{view.scale > 1.001 ? 'Imagen ampliada' : 'Imagen ajustada'}</span>
        <small>{view.scale > 1.001 ? 'Arrastra para recorrerla' : 'Desliza a izquierda o derecha para cambiar de contenido'}</small>
      </div>
      <button
        type="button"
        className="gallery-nav-button gallery-nav-next"
        disabled={!canNext}
        onClick={next}
        aria-label={'Siguiente contenido: ' + nextTitle}
      >
        <span><small>Siguiente</small><strong>{nextTitle}</strong></span>
        <ArrowRight size={24} />
      </button>
    </nav>
  </div>

  return createPortal(viewer, document.body)
}

export function PracticeGateModal({ question, selected, verdict, checking, selectAnswer, loading, advancing, targetTitle, retry, continueForward, continueWithoutQuestion }) {
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
export function ExamExperience({ questions, answers, setAnswers, passingScore, submit, loading }) {
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

export function ExamResult({ result, course, retry }) {
  const passed = Boolean(result?.passed)
  const code = result?.certificate_code
  const openCertificate = () => {
    if (!code) return
    const anchor = document.createElement('a')
    anchor.href = new URL(appUrl('/certificate/' + encodeURIComponent(code)), window.location.origin).href
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
      <button className="result-secondary" onClick={() => navigateLearner('/catalog')}><ArrowLeft size={17} /> Mis capacitaciones</button>
    </div>
    {passed && <CelebrationBurst />}
  </section>
}

export function AchievementToast({ achievement, onClose }) {
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

export function CourseTransitionState({ loading = false, error = false, message = '' }) {
  return <main className="learner-course-app learner-course-transition-state">
    <LearnerTopbar
      center={<div className="learner-topbar-page"><BookOpen size={16} /><div><span>Capacitación</span><strong>{loading ? 'Preparando contenido…' : 'No disponible'}</strong></div></div>}
      actions={<button className="secondary-action" onClick={() => navigateLearner('/catalog')}><ArrowLeft size={17} /> Mis capacitaciones</button>}
    />

    {loading ? <section className="course-transition-skeleton">
      <div className="course-transition-intro">
        <span /><h1 /><p /><p />
        <div className="course-transition-progress" />
      </div>
      <div className="course-transition-grid">
        <aside>{Array.from({ length: 6 }).map((_, index) => <i key={index} />)}</aside>
        <article><b /><strong /><p /><p /><div /></article>
        <aside>{Array.from({ length: 4 }).map((_, index) => <i key={index} />)}</aside>
      </div>
    </section> : <section className="course-transition-error">
      <CircleAlert size={34} />
      <h1>No fue posible abrir la capacitación</h1>
      <p>{message}</p>
      <button onClick={() => navigateLearner('/catalog')}><ArrowLeft size={16} /> Volver a mis capacitaciones</button>
    </section>}
  </main>
}
