import React, { useEffect, useMemo, useState } from 'react'
import {
  Award, Bell, BookOpen, CalendarClock, CheckCircle2, ChevronRight, Clock3,
  Flame, GraduationCap, Medal, Route, ShieldCheck, Sparkles, Target, Trophy,
  UserRound, Waypoints, Zap,
} from 'lucide-react'
import { PREVIEW_MISSIONS, PREVIEW_PATHS, dueBucket, levelFromXp } from '../../learning360/preview.js'
import { navigateLearner, openLearnerCourse } from './navigation.js'
import { supabase } from './supabase.js'

function missingFeature(error) {
  const code = String(error?.code || '')
  const text = String(error?.message || error || '').toLowerCase()
  return ['42P01', '42883', 'PGRST202'].includes(code)
    || text.includes('does not exist')
    || text.includes('could not find the function')
    || text.includes('schema cache')
}

export default function LearningJourneyPage({ profile, sessionUser }) {
  const [loading, setLoading] = useState(true)
  const [persistent, setPersistent] = useState(null)
  const [data, setData] = useState(null)
  const [message, setMessage] = useState('')
  const [installPrompt, setInstallPrompt] = useState(null)

  useEffect(() => {
    const handler = (event) => {
      event.preventDefault()
      setInstallPrompt(event)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      setMessage('')
      try {
        if (!sessionUser?.id) return

        const activity = await supabase.rpc('touch_learning_activity')
        if (activity.error && !missingFeature(activity.error)) throw activity.error

        const result = await supabase.rpc('get_my_learning_360')
        if (!result.error && result.data) {
          if (!alive) return
          setPersistent(true)
          setData(result.data)
          return
        }
        if (result.error && !missingFeature(result.error)) throw result.error

        const [enrollmentsResult, certificatesResult] = await Promise.all([
          supabase
            .from('enrollments')
            .select('id,status,due_at,created_at,course:courses(id,title,description,status,passing_score)')
            .eq('user_id', sessionUser.id)
            .order('created_at', { ascending: false }),
          supabase.rpc('get_my_certificates'),
        ])

        if (enrollmentsResult.error) throw enrollmentsResult.error
        if (!alive) return
        setPersistent(false)
        setData(buildPreviewJourney({
          profile,
          enrollments: enrollmentsResult.data || [],
          certificates: certificatesResult.error ? [] : (certificatesResult.data || []),
        }))
      } catch (error) {
        if (alive) setMessage(error instanceof Error ? error.message : 'No fue posible cargar tu ruta.')
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => { alive = false }
  }, [sessionUser?.id, profile?.full_name])

  const route = useMemo(() => {
    const paths = data?.paths || []
    return paths.find((item) => item.status !== 'completed') || paths[0] || null
  }, [data])

  const gamification = data?.gamification || { xp: 0, level: 1, current_streak: 0, longest_streak: 0, badges: [] }
  const nextLevelXp = Math.max(250, (Number(gamification.level || 1)) * 250)
  const xpFloor = Math.max(0, (Number(gamification.level || 1) - 1) * 250)
  const xpProgress = Math.min(100, Math.max(0, ((Number(gamification.xp || 0) - xpFloor) / Math.max(1, nextLevelXp - xpFloor)) * 100))
  const unread = (data?.notifications || []).filter((item) => !item.read_at).length

  const markRead = async (item) => {
    if (!persistent || item.read_at) return
    const now = new Date().toISOString()
    setData((current) => ({
      ...current,
      notifications: current.notifications.map((notification) => notification.id === item.id ? { ...notification, read_at: now } : notification),
    }))
    await supabase.from('learning_notifications').update({ read_at: now }).eq('id', item.id)
  }

  const installApp = async () => {
    if (!installPrompt) {
      setMessage('La instalación aparecerá cuando el navegador detecte Aula EI como aplicación instalable.')
      return
    }
    await installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  if (loading) return <JourneyLoading />

  return <main className="journey-page">
    <section className="journey-hero">
      <div className="journey-hero-motion" aria-hidden="true"><i /><i /><i /><i /></div>
      <div>
        <span className="journey-pill"><Sparkles size={15} /> Tu desarrollo en Aula EI</span>
        <h1>Mi Ruta 360</h1>
        <p>Visualiza lo que debes aprender, tus competencias, vencimientos, logros y próximos pasos desde un solo lugar.</p>
        <div className="journey-hero-actions">
          {route?.steps?.find((step) => step.course_id && !['completed'].includes(step.course_status)) &&
            <button className="journey-yellow" onClick={() => openLearnerCourse(route.steps.find((step) => step.course_id && !['completed'].includes(step.course_status)).course_id)}>
              <BookOpen size={17} /> Continuar mi ruta
            </button>}
          <button className="journey-glass" onClick={() => navigateLearner('/catalog')}><GraduationCap size={17} /> Mis capacitaciones</button>
          <button className="journey-glass" onClick={installApp}><Zap size={17} /> Instalar Aula EI</button>
        </div>
      </div>
      <div className="journey-level-card">
        <span>Nivel</span><strong>{gamification.level || 1}</strong><small>{gamification.xp || 0} XP acumulados</small>
        <div><i style={{ width: xpProgress + '%' }} /></div>
      </div>
    </section>

    {message && <div className="journey-message"><Sparkles size={16} /><span>{message}</span><button onClick={() => setMessage('')}>×</button></div>}

    <div className={'journey-mode ' + (persistent ? 'ready' : 'preview')}>
      <ShieldCheck size={16} />
      <span>{persistent ? 'Ruta sincronizada con Formación 360.' : 'Primera vista provisional: tu ruta definitiva aparecerá cuando se aplique el nuevo motor y se confirme tu cargo.'}</span>
    </div>

    <section className="journey-metrics">
      <article><Waypoints size={21} /><div><span>Cargo</span><strong>{data?.profile?.position?.name || 'Por confirmar'}</strong></div></article>
      <article><Route size={21} /><div><span>Ruta activa</span><strong>{route?.path?.name || 'Ruta base'}</strong></div></article>
      <article><Target size={21} /><div><span>Brechas</span><strong>{(data?.competencies || []).filter((item) => Number(item.gap || 0) > 0).length}</strong></div></article>
      <article><Bell size={21} /><div><span>Notificaciones</span><strong>{unread}</strong></div></article>
      <article><Flame size={21} /><div><span>Racha actual</span><strong>{gamification.current_streak || 0} días</strong></div></article>
    </section>

    <section className="journey-grid">
      <article className="journey-panel journey-route-panel">
        <header><div><span>RUTA DE APRENDIZAJE</span><h2>{route?.path?.name || 'Ruta base corporativa'}</h2><p>{route?.path?.description || 'Tu secuencia de aprendizaje aparecerá aquí.'}</p></div><Route size={24} /></header>
        <div className="journey-timeline">
          {(route?.steps || []).map((step, index) => {
            const status = stepStatus(step, index, route.steps)
            return <button key={step.id || index} className={'journey-step ' + status} disabled={!step.course_id} onClick={() => step.course_id && openLearnerCourse(step.course_id)}>
              <span className="journey-step-number">{status === 'completed' ? <CheckCircle2 size={16} /> : index + 1}</span>
              <div><strong>{step.title}</strong><small>{step.course_title || (step.linked === false ? 'Pendiente de vincular por Gestión' : step.step_type)}</small></div>
              <em>{statusLabel(status)}</em>
              {step.course_id && <ChevronRight size={16} />}
            </button>
          })}
          {!route?.steps?.length && <Empty icon={Route} title="Ruta pendiente" text="Cuando se te asigne una ruta aparecerán sus pasos en orden." />}
        </div>
      </article>

      <article className="journey-panel">
        <header><div><span>COMPETENCIAS</span><h2>Mi matriz</h2><p>Compara el nivel requerido con la evidencia vigente.</p></div><Target size={24} /></header>
        <div className="journey-competencies">
          {(data?.competencies || []).map((item) => <div key={item.id}>
            <div><strong>{item.name}</strong><small>{item.category}</small></div>
            <div className="journey-level-row"><span>Actual</span><LevelDots value={item.attained_level || 0} /><b>{item.attained_level || 0}</b></div>
            <div className="journey-level-row"><span>Requerido</span><LevelDots value={item.required_level || 0} /><b>{item.required_level || 0}</b></div>
            <em className={Number(item.gap || 0) > 0 ? 'gap' : 'ok'}>{Number(item.gap || 0) > 0 ? 'Brecha ' + item.gap : 'Cumplida'}</em>
          </div>)}
          {!data?.competencies?.length && <Empty icon={Target} title="Competencias por confirmar" text="Se activarán al asignar tu cargo definitivo." compact />}
        </div>
      </article>
    </section>

    <section className="journey-grid">
      <article className="journey-panel">
        <header><div><span>NOTIFICACIONES</span><h2>Centro de novedades</h2><p>Aula EI te buscará cuando haya algo importante.</p></div><Bell size={24} /></header>
        <div className="journey-notifications">
          {(data?.notifications || []).slice(0, 10).map((item) => <button key={item.id} className={item.read_at ? 'read' : ''} onClick={() => { markRead(item); if (item.action_url) navigateLearner(item.action_url.replace('/#', '')) }}>
            <span className={'journey-notification-icon ' + (item.severity || 'info')}>{item.category === 'recertification' ? <RefreshIcon /> : <Bell size={16} />}</span>
            <div><strong>{item.title}</strong><small>{item.body}</small><em>{dateTime(item.created_at)}</em></div>
            {!item.read_at && <i />}
          </button>)}
          {!data?.notifications?.length && <Empty icon={Bell} title="Sin novedades pendientes" text="Recordatorios, asignaciones y logros aparecerán aquí." compact />}
        </div>
      </article>

      <article className="journey-panel">
        <header><div><span>CALENDARIO</span><h2>Próximas fechas</h2><p>Sesiones, evaluaciones, vencimientos y recertificaciones.</p></div><CalendarClock size={24} /></header>
        <div className="journey-calendar">
          {(data?.calendar || []).slice(0, 10).map((item) => <div key={item.id}><span><b>{new Date(item.starts_at).getDate()}</b><small>{new Date(item.starts_at).toLocaleDateString('es-CO', { month: 'short' })}</small></span><div><strong>{item.title}</strong><small>{dateTime(item.starts_at)}{item.location ? ' · ' + item.location : ''}</small></div></div>)}
          {!data?.calendar?.length && <Empty icon={CalendarClock} title="Sin eventos próximos" text="Tu calendario se llenará con vencimientos y sesiones programadas." compact />}
        </div>
      </article>
    </section>

    <section className="journey-grid">
      <article className="journey-panel">
        <header><div><span>GAMIFICACIÓN</span><h2>Logros e insignias</h2><p>Reconocemos constancia, certificaciones y desempeño.</p></div><Trophy size={24} /></header>
        <div className="journey-badges">
          {(gamification.badges || []).map((badge) => <div key={badge.code || badge.name}><Medal size={22} /><strong>{badge.name}</strong><small>{badge.description}</small></div>)}
          {!(gamification.badges || []).length && <div className="journey-badge-placeholder"><Award size={23} /><strong>Tu vitrina empieza aquí</strong><small>Las primeras insignias llegarán con tus avances.</small></div>}
        </div>
      </article>

      <article className="journey-panel">
        <header><div><span>MISIONES</span><h2>Retos activos</h2><p>Objetivos pequeños para mantener ritmo y constancia.</p></div><Flame size={24} /></header>
        <div className="journey-missions">
          {PREVIEW_MISSIONS.map((mission) => <div key={mission.id}><span><Flame size={16} /></span><div><strong>{mission.title}</strong><small>{mission.description}</small></div><b>+{mission.xp_reward} XP</b></div>)}
        </div>
      </article>
    </section>
  </main>
}

function buildPreviewJourney({ profile, enrollments, certificates }) {
  const active = enrollments.filter((item) => !['cancelled'].includes(item.status))
  const completedCount = active.filter((item) => item.status === 'completed').length
  const xp = completedCount * 120 + certificates.length * 100
  const basePath = PREVIEW_PATHS[0]
  const steps = active.length
    ? active.map((item, index) => ({
        id: item.id,
        sort_order: index + 1,
        step_type: 'course',
        title: item.course?.title || 'Capacitación',
        course_id: item.course?.id,
        course_title: item.course?.title,
        course_status: item.status,
        due_at: item.due_at,
        linked: true,
      }))
    : basePath.steps

  const notifications = active
    .filter((item) => item.due_at && dueBucket(item.due_at))
    .map((item) => ({
      id: 'preview-notification-' + item.id,
      category: 'deadline',
      title: dueBucket(item.due_at) === 'overdue' ? 'Capacitación vencida' : 'Fecha límite próxima',
      body: (item.course?.title || 'Capacitación') + ' · ' + new Date(item.due_at).toLocaleDateString('es-CO'),
      severity: dueBucket(item.due_at) === 'overdue' ? 'critical' : 'warning',
      read_at: null,
      created_at: new Date().toISOString(),
      action_url: item.course?.id ? '/#/course/' + item.course.id : '/#/catalog',
    }))

  const calendar = active
    .filter((item) => item.due_at)
    .map((item) => ({
      id: 'preview-calendar-' + item.id,
      title: 'Vence · ' + (item.course?.title || 'Capacitación'),
      event_type: 'deadline',
      starts_at: item.due_at,
      location: null,
    }))
    .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))

  return {
    profile: {
      full_name: profile?.full_name,
      email: profile?.email,
      role: profile?.role,
      position: null,
    },
    paths: [{
      assignment_id: 'preview-assignment',
      status: active.every((item) => item.status === 'completed') && active.length ? 'completed' : 'in_progress',
      due_at: active.map((item) => item.due_at).filter(Boolean).sort()[0] || null,
      path: { id: basePath.id, code: basePath.code, name: active.length ? 'Mi ruta actual' : basePath.name, description: active.length ? 'Tus capacitaciones asignadas actualmente.' : basePath.description },
      steps,
    }],
    competencies: [],
    notifications,
    calendar,
    gamification: {
      xp,
      level: levelFromXp(xp),
      current_streak: 1,
      longest_streak: 1,
      badges: certificates.slice(0, 3).map((item, index) => ({
        code: 'preview-cert-' + index,
        name: index === 0 ? 'Primera certificación' : 'Certificación obtenida',
        description: item.course_title || 'Capacitación aprobada',
      })),
    },
  }
}

function stepStatus(step, index, steps) {
  if (step.course_status === 'completed') return 'completed'

  const previousCourses = steps.slice(0, index).filter((item) => item.course_id)
  const prerequisitesComplete = previousCourses.every((item) => item.course_status === 'completed')

  if (step.course_id) {
    if (!prerequisitesComplete && step.required !== false) return 'locked'
    return step.course_status === 'in_progress' ? 'progress' : 'available'
  }

  if (step.step_type === 'assessment' || step.step_type === 'certification') {
    return prerequisitesComplete && previousCourses.length ? 'available' : 'locked'
  }

  return 'pending'
}

function statusLabel(status) {
  return {
    completed: 'Completado',
    progress: 'En progreso',
    available: 'Disponible',
    locked: 'Bloqueado',
    pending: 'Pendiente',
  }[status] || status
}

function LevelDots({ value = 0 }) {
  return <span className="journey-level-dots">{Array.from({ length: 5 }).map((_, index) => <i key={index} className={index < Number(value || 0) ? 'filled' : ''} />)}</span>
}

function dateTime(value) {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  } catch {
    return String(value)
  }
}

function RefreshIcon() {
  return <Clock3 size={16} />
}

function Empty({ icon: Icon, title, text, compact = false }) {
  return <div className={'journey-empty ' + (compact ? 'compact' : '')}><Icon size={25} /><strong>{title}</strong><span>{text}</span></div>
}

function JourneyLoading() {
  return <section className="journey-loading" aria-busy="true">
    <div className="experience-loading-mark"><i /><i /><i /></div>
    <strong>Construyendo tu Ruta 360…</strong>
    <span>Estamos reuniendo capacitaciones, competencias y próximas fechas.</span>
    <div className="journey-loading-grid"><i className="wide" /><i /><i /><i /></div>
  </section>
}
