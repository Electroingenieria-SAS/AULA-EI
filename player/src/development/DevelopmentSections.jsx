import React from 'react'
import { ArrowRight, BadgeCheck, BookOpen, CalendarClock, CheckCircle2, ChevronRight, LockKeyhole, Target, Trophy } from 'lucide-react'
import { appUrl, navigateLearner, openLearnerCourse } from '../navigation.js'

const formatDate = (value) => {
  const date = new Date(value || '')
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Sin fecha registrada'
}

export function DevelopmentCompetencies({ items }) {
  return <section className="development-panel" aria-labelledby="development-skills">
    <header className="development-panel-head">
      <span className="development-panel-icon"><Target size={22}/></span>
      <div><small>PERFIL DE COMPETENCIAS</small><h2 id="development-skills">Mis capacidades por fortalecer</h2>
        <p>Compara el nivel reconocido en Aula EI con el nivel requerido para tu cargo.</p></div>
    </header>
    {items.length ? <div className="development-skills">
      {items.map((item) => <article className="development-skill" key={item.id}>
        <div className="development-skill-top"><strong>{item.name}</strong>
          <span className={item.gap === 0 ? 'is-reached' : ''}>
            {item.gap === 0 ? <><CheckCircle2 size={14}/> Nivel requerido alcanzado</> : 'Faltan ' + item.gap + ' nivel(es)'}
          </span>
        </div>
        <div className="development-skill-track" role="progressbar" aria-label={'Nivel de ' + item.name}
          aria-valuemin={0} aria-valuemax={item.required || 1} aria-valuenow={Math.min(item.achieved,item.required || 1)}>
          <span style={{ width: item.percent + '%' }}/>
        </div>
        <div className="development-skill-labels">
          <span>{item.category || 'Competencia del cargo'}</span>
          <b>{item.achieved} / {item.required} nivel requerido</b>
        </div>
      </article>)}
    </div> : <div className="development-empty"><Target size={25}/>
      <p>No hay competencias asociadas a tu cargo. El área de formación puede configurarlas desde Gestión Aula EI.</p>
    </div>}
    <p className="development-explanation">Los niveles los calcula el motor formativo institucional. No equivalen a un nuevo título ni a un certificado profesional externo.</p>
  </section>
}

export function DevelopmentPaths({ paths }) {
  return <section className="development-panel" aria-labelledby="development-paths">
    <header className="development-panel-head">
      <span className="development-panel-icon"><BookOpen size={22}/></span>
      <div><small>ITINERARIO FORMATIVO</small><h2 id="development-paths">Mis rutas de crecimiento</h2>
        <p>Consulta qué has completado, qué puedes estudiar y cuáles pasos siguen bloqueados.</p></div>
    </header>
    {paths.length ? <div className="development-path-list">
      {paths.map((path) => <article className="development-path" key={path.id}>
        <div className="development-path-head">
          <div><strong>{path.name}</strong><small>{path.required ? 'Ruta requerida para tu cargo' : 'Ruta complementaria'}</small></div>
          <span>{Math.round(path.progress)}%</span>
        </div>
        <div className="development-path-progress" role="progressbar" aria-label={'Avance de ' + path.name}
          aria-valuemin={0} aria-valuemax={100} aria-valuenow={path.progress}><i style={{ width: path.progress + '%' }}/></div>
        <p className="development-path-description">{path.completeCount} de {path.requiredCount} cursos obligatorios cumplidos.</p>
        <ol className="development-path-steps">
          {path.courses.map((course) => <li className={'development-path-step is-' + course.status} key={course.course_id}>
            <span className="development-step-icon">
              {course.status === 'complete' ? <CheckCircle2 size={18}/> :
                course.status === 'locked' ? <LockKeyhole size={18}/> : <BookOpen size={18}/>}
            </span>
            <div><strong>{course.title || 'Capacitación de la ruta'}</strong><small>
              {course.status === 'complete' ? 'Cumplida' : course.status === 'locked' ? 'Completa los pasos anteriores' : 'Disponible para continuar'}
              {!course.required && ' · Complementaria'}
            </small></div>
            {course.status === 'available' && <button type="button" onClick={() => openLearnerCourse(course.course_id)}>
              Abrir <ChevronRight size={16}/>
            </button>}
          </li>)}
        </ol>
        {path.next && <button type="button" className="development-path-primary" onClick={() => openLearnerCourse(path.next.course_id)}>
          Continuar ruta <ArrowRight size={17}/>
        </button>}
      </article>)}
    </div> : <div className="development-empty"><BookOpen size={24}/>
      <p>Todavía no hay rutas de formación vinculadas a tu cargo.</p>
    </div>}
  </section>
}

export function DevelopmentDates({ items }) {
  return <section className="development-panel" aria-labelledby="development-dates">
    <header className="development-panel-head">
      <span className="development-panel-icon"><CalendarClock size={22}/></span>
      <div><small>SEGUIMIENTO</small><h2 id="development-dates">Próximos compromisos</h2>
        <p>Fechas límite registradas en tus capacitaciones pendientes, ordenadas por urgencia.</p></div>
    </header>
    {items.length ? <div className="development-deadline-list">
      {items.map((item) => <article key={item.id || item.course.id} className={'development-deadline' + (item.overdue ? ' is-overdue' : item.dueSoon ? ' is-soon' : '')}>
        <span className="development-deadline-date"><CalendarClock size={16}/>{formatDate(item.due_at)}</span>
        <div><strong>{item.course.title}</strong><small>
          {item.overdue ? 'Fecha límite superada' : item.dueSoon ? 'Vence en los próximos 7 días' : 'Pendiente con fecha programada'}
        </small></div>
        {!item.routeLocked ? <button type="button" onClick={() => openLearnerCourse(item.course.id)}>
          Continuar <ArrowRight size={15}/></button> :
          <span className="development-deadline-locked"><LockKeyhole size={15}/> Requisito pendiente</span>}
      </article>)}
    </div> : <div className="development-empty"><CheckCircle2 size={25}/>
      <p>No tienes capacitaciones pendientes con una fecha límite registrada. Las capacitaciones sin fecha siguen disponibles en Mis capacitaciones.</p>
    </div>}
    <button type="button" className="development-text-link" onClick={() => navigateLearner('/catalog')}>Ver todas mis capacitaciones <ArrowRight size={16}/></button>
  </section>
}

export function DevelopmentCertificates({ items }) {
  return <section className="development-panel" aria-labelledby="development-certificates">
    <header className="development-panel-head">
      <span className="development-panel-icon"><Trophy size={22}/></span>
      <div><small>LOGROS DOCUMENTADOS</small><h2 id="development-certificates">Certificados obtenidos</h2>
        <p>Constancias emitidas por Aula EI. Una fecha de expedición no indica por sí sola una fecha de vencimiento.</p></div>
    </header>
    {items.length ? <div className="development-certificates">
      {items.map((item) => <article key={item.certificate_code}>
        <span><BadgeCheck size={20}/></span>
        <div><strong>{item.course_title || 'Capacitación Aula EI'}</strong>
          <small>Expedido: {formatDate(item.issued_at)} · Código {item.certificate_code}</small>
        </div>
        <button type="button" onClick={() => window.open(appUrl('/certificate/' + encodeURIComponent(item.certificate_code)), '_blank', 'noopener,noreferrer')}>
          Ver certificado <ArrowRight size={16}/>
        </button>
      </article>)}
    </div> : <div className="development-empty"><Trophy size={25}/>
      <p>Todavía no tienes certificados expedidos. Cuando apruebes una capacitación que los emita, aparecerán aquí.</p>
    </div>}
  </section>
}
