import React, { useEffect, useMemo, useState } from 'react'
import { BookOpen, Briefcase, Gamepad2, GraduationCap, Layers3, Medal, PlayCircle, ShieldCheck, Sparkles, Target, Trophy } from 'lucide-react'
import { navigateLearner, openLearnerCourse } from './navigation.js'
import { signedAsset, supabase } from './supabase.js'

export default function HomePage({ profile, sessionUser }) {
  const [enrollments, setEnrollments] = useState([])
  const [certificates, setCertificates] = useState([])
  const [hiddenCount, setHiddenCount] = useState(0)
  const [trainingProfile, setTrainingProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const userId = sessionUser?.id
        if (!userId) return

        const [enrollmentResult, certificateResult, trainingProfileResult] = await Promise.all([
          supabase
            .from('enrollments')
            .select('id,status,due_at,created_at,course:courses(id,title,description,passing_score,status,cover_path)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false }),
          supabase.rpc('get_my_certificates'),
          supabase.rpc('get_my_training_profile'),
        ])

        if (!alive) return
        const raw = enrollmentResult.data || []
        const visible = raw.filter((item) => item?.course?.id)
        setEnrollments(visible)
        setHiddenCount(raw.length - visible.length)
        setCertificates(certificateResult.error ? [] : (certificateResult.data || []))
        setTrainingProfile(trainingProfileResult.error ? null : (trainingProfileResult.data || null))
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => { alive = false }
  }, [sessionUser?.id])

  const firstName = useMemo(() => String(profile?.full_name || 'Colaborador').trim().split(/\s+/)[0] || 'Colaborador', [profile?.full_name])

  return <main className="learner-home-page">
    <section className="home-original-hero">
      <div className="home-hero-motion" aria-hidden="true"><i /><i /><i /><i /></div>
      <div>
        <span className="home-hero-pill"><Sparkles size={15} /> Plataforma conectada</span>
        <h1>Aprende, participa y certifícate.</h1>
        <p>{firstName}, completa videos, presentaciones, recursos didácticos y juegos antes de presentar el examen final.</p>
        <div className="home-hero-actions">
          <button className="home-yellow-button" onClick={() => navigateLearner('/catalog')}>Ver mis capacitaciones</button>
          {['creador_contenido','revisor','admin','super_admin'].includes(String(profile?.role || '')) &&
            <button className="home-glass-button" onClick={() => navigateLearner('/studio')}><ShieldCheck size={18} /> Gestión Aula EI</button>}
        </div>
      </div>
      <div className="home-hero-metric"><strong>{certificates.length}</strong><span>Certificados obtenidos</span></div>
    </section>

    {hiddenCount > 0 && <div className="home-warning">Hay {hiddenCount} asignación(es) que todavía no están visibles porque la capacitación no está publicada o no tiene permisos activos.</div>}

    <section className={'home-metric-grid ' + (loading ? 'is-loading' : '')}>
      <article><BookOpen /><div><span>Asignadas visibles</span><strong>{loading ? '—' : enrollments.length}</strong></div></article>
      <article><GraduationCap /><div><span>Certificadas</span><strong>{loading ? '—' : certificates.length}</strong></div></article>
      <article><Gamepad2 /><div><span>Juegos disponibles</span><strong>6+</strong></div></article>
      <article><Medal /><div><span>Nota mínima</span><strong>80%</strong></div></article>
    </section>

    {trainingProfile?.position && <section className="home-training-route-card">
      <div className="home-training-route-head">
        <span className="home-training-route-icon"><Briefcase size={22} /></span>
        <div>
          <span>MI RUTA FORMATIVA</span>
          <h2>{trainingProfile.position.name}</h2>
          <p>{trainingProfile.position.department || 'Ruta de formación asociada a tu cargo actual.'}</p>
        </div>
      </div>
      <div className="home-training-route-content">
        <div>
          <strong><Target size={16} /> Competencias esperadas</strong>
          <div className="home-training-chip-list">
            {(trainingProfile.competencies || []).slice(0,6).map((item) => <span key={item.id}>{item.name}<b>N{item.required_level}</b></span>)}
            {!trainingProfile.competencies?.length && <small>Aún no hay competencias configuradas para este cargo.</small>}
          </div>
        </div>
        <div>
          <strong><Layers3 size={16} /> Rutas asignadas</strong>
          <div className="home-training-path-list">
            {(trainingProfile.paths || []).map((item) => <span key={item.id}><Layers3 size={14} /> {item.name}</span>)}
            {!trainingProfile.paths?.length && <small>Aún no hay rutas vinculadas a este cargo.</small>}
          </div>
        </div>
      </div>
    </section>}

    <section className="home-section-heading">
      <div><span>CONTINUAR APRENDIZAJE</span><h2>Capacitaciones asignadas</h2><p>Abre cualquier capacitación desde aquí sin perder la navegación principal.</p></div>
      <button onClick={() => navigateLearner('/catalog')}>Ver todas</button>
    </section>

    {loading ? <div className="home-course-grid">{Array.from({ length: 3 }).map((_,i)=><div className="home-course-skeleton" key={i} />)}</div> :
      enrollments.length ? <div className="home-course-grid">{enrollments.slice(0,6).map((item)=><HomeCourseCard key={item.id} item={item} />)}</div> :
      <div className="home-empty"><BookOpen size={30}/><h3>Aún no tienes capacitaciones visibles</h3><p>Cuando te asignen una capacitación publicada aparecerá aquí.</p></div>}

    <section className="home-section-heading section-spacing-top">
      <div><span>CERTIFICACIÓN</span><h2>Mis certificados</h2><p>Consulta los certificados que ya has obtenido.</p></div>
    </section>

    {loading ? <div className="home-certificate-loading" aria-hidden="true">{Array.from({ length: 2 }).map((_, index) => <i key={index} />)}</div> :
      certificates.length ? <div className="home-certificate-list">
        {certificates.map((item)=><article key={item.certificate_code}>
          <div><b>{item.course_title || 'Capacitación Aula EI'}</b><span>Código: {item.certificate_code}</span><small>{new Date(item.issued_at).toLocaleDateString('es-CO')} · {item.score}%</small></div>
          <button onClick={() => window.open('/#/certificate/' + encodeURIComponent(item.certificate_code), '_blank', 'noopener,noreferrer')}><Trophy size={16}/> Abrir certificado</button>
        </article>)}
      </div> : <div className="home-empty compact"><Trophy size={28}/><h3>Aún no tienes certificados</h3><p>Aprueba una capacitación con la nota mínima para generarlo automáticamente.</p></div>}
  </main>
}

function HomeCourseCard({ item }) {
  const [cover, setCover] = useState(null)
  const [coverReady, setCoverReady] = useState(false)
  useEffect(() => {
    let alive = true
    setCover(null)
    setCoverReady(false)
    if (!item.course.cover_path) return () => { alive = false }
    signedAsset(item.course.cover_path).then((url)=>alive&&setCover(url)).catch(()=>alive&&setCover(null))
    return () => { alive = false }
  }, [item.course.cover_path])

  return <button className="home-course-card" onClick={() => openLearnerCourse(item.course.id)}>
    <div className={'home-course-cover ' + (coverReady ? 'is-ready' : '')}>
      {item.course.cover_path && !coverReady && <div className="home-cover-loading"><BookOpen size={34}/><i /></div>}
      {(!item.course.cover_path || (coverReady && !cover)) && <div className="home-cover-fallback"><BookOpen size={38}/></div>}
      {cover && <img src={cover} alt={item.course.title} loading="lazy" onLoad={() => setCoverReady(true)} onError={() => { setCover(null); setCoverReady(true) }} />}
      <span>{item.course.status}</span>
    </div>
    <div className="home-course-body">
      <h3>{item.course.title}</h3>
      <p>{item.course.description || 'Capacitación Aula EI.'}</p>
      <footer><span>Examen: {item.course.passing_score || 80}%</span><span>{item.due_at ? new Date(item.due_at).toLocaleDateString('es-CO') : 'Sin vencimiento'}</span></footer>
    </div>
    <span className="home-course-cta"><PlayCircle size={16}/> Abrir</span>
  </button>
}
