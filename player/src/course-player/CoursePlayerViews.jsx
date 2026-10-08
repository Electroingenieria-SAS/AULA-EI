import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowLeft, ArrowRight, Award, BookOpen, BrainCircuit, CheckCircle2,
  CircleAlert, GraduationCap, Loader2, RotateCcw,
  ShieldCheck, Sparkles, Trophy, X,
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


export function PracticeGateContent({ question, selected, verdict, checking, selectAnswer, loading, advancing, targetTitle, retry, continueForward, continueWithoutQuestion, embedded = false }) {
  const resolved = verdict === true || verdict === false
  const unavailable = verdict === 'unavailable'

  return <section className="practice-gate-modal" role={embedded ? 'group' : 'dialog'} aria-modal={embedded ? undefined : true} aria-labelledby="practice-gate-title">
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
}

export function PracticeGateModal(props) {
  return createPortal(
    <div className="practice-gate-backdrop" role="presentation"><PracticeGateContent {...props} /></div>,
    document.body,
  )
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
