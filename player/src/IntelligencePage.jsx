import React, { useEffect, useMemo, useState } from 'react'
import { Award, BookOpenCheck, BrainCircuit, Compass, GraduationCap, MessageCircle, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react'
import { cachedQuery } from '../../src/data-cache.js'
import { supabase } from './supabase.js'
import { generateCourseReviewGames } from './games/course-game-generator.js'
import { buildDevelopmentSnapshot } from './development/development-data.js'
import { clearPractice, knowledgeCards, practiceStorageKey, readPractice, recordPractice } from './intelligence/intelligence-model.js'
import TutorPanel from './intelligence/TutorPanel.jsx'
import AdaptivePanel from './intelligence/AdaptivePanel.jsx'
import RewardsPanel from './intelligence/RewardsPanel.jsx'
import RoutesPanel from './intelligence/RoutesPanel.jsx'
import './styles/intelligence.css'

const OPTIONS = [
  { id:'tutor',title:'Tutor',detail:'Consulta tus contenidos',icon:MessageCircle },
  { id:'adaptive',title:'Repaso adaptativo',detail:'Refuerza lo que cuesta',icon:BrainCircuit },
  { id:'rewards',title:'Insignias',detail:'Reconoce tu constancia',icon:Award },
  { id:'paths',title:'Rutas inteligentes',detail:'Encuentra tu siguiente paso',icon:Compass },
]

export default function IntelligencePage({ profile, sessionUser }) {
  const [tab,setTab] = useState('tutor')
  const [home,setHome] = useState(null)
  const [catalog,setCatalog] = useState(null)
  const [selected,setSelected] = useState('')
  const [course,setCourse] = useState(null)
  const [loading,setLoading] = useState(true)
  const [loadingCourse,setLoadingCourse] = useState(false)
  const [revision,setRevision] = useState(0)
  const [error,setError] = useState('')
  const [courseError,setCourseError] = useState('')
  const [practice,setPractice] = useState(() => readPractice(sessionUser?.id))
  const userId = sessionUser?.id || ''
  const enrollmentOptions = useMemo(() => (Array.isArray(catalog?.enrollments) ? catalog.enrollments : [])
    .filter((item) => item?.course?.id)
    .sort((a,b) => String(a.course.title || '').localeCompare(String(b.course.title || ''),'es')), [catalog])
  const validSelection = enrollmentOptions.some((item) => String(item.course.id) === String(selected))
  const completed = useMemo(() => new Set((Array.isArray(catalog?.progress) ? catalog.progress : [])
    .filter((entry) => entry.status === 'completed').map((entry) => entry.block_id)), [catalog])
  const development = useMemo(() => buildDevelopmentSnapshot(home || {}), [home])
  const cards = useMemo(() => course ? knowledgeCards(course,completed) : [], [course,completed])
  const groups = useMemo(() => course ? generateCourseReviewGames(course,completed) : [], [course,completed])
  const coursePractice = practice?.courses?.[selected] || {}
  useEffect(() => { setPractice(readPractice(userId)) }, [userId])
  useEffect(() => {
    const sync = (event) => {
      if (event.key === practiceStorageKey(userId) || event.key === null)
        setPractice(readPractice(userId))
    }
    window.addEventListener('storage',sync)
    return () => window.removeEventListener('storage',sync)
  }, [userId])

  useEffect(() => {
    let active=true
    if (!userId) { setLoading(false);setError('Inicia sesión para utilizar Mi entrenador.');return ()=>{active=false} }
    setLoading(true);setError('')
    ;(async()=>{
      try {
        const [h,c] = await Promise.all([
          cachedQuery('home:snapshot:'+userId, async()=>{const x=await supabase.rpc('get_my_home_snapshot');if(x.error)throw x.error;return x.data||{}},{ttl:45000,force:revision>0}),
          cachedQuery('catalog:snapshot:'+userId,async()=>{const x=await supabase.rpc('get_my_catalog_snapshot');if(x.error)throw x.error;return x.data||{}},{ttl:30000,force:revision>0}),
        ])
        if(active){setHome(h);setCatalog(c)}
      }catch(cause){if(active)setError(cause?.message||'No pudimos recuperar tus capacitaciones.')}
      finally{if(active)setLoading(false)}
    })()
    return ()=>{active=false}
  },[userId,revision])

  useEffect(() => {
    if (loading || !catalog) return
    if (!selected || !enrollmentOptions.some((entry)=>String(entry.course.id)===String(selected))) {
      setSelected(enrollmentOptions[0]?.course?.id || '')
    }
  },[loading,catalog,enrollmentOptions,selected])

  useEffect(() => {
    let active=true
    setCourse(null);setCourseError('')
    if (!selected || !validSelection || loading) {setLoadingCourse(false);return ()=>{active=false}}
    setLoadingCourse(true)
    ;(async()=>{
      try {
        const gate=await supabase.rpc('get_my_course_route_access',{p_course_id:selected})
        if (gate.error) throw gate.error
        if (gate.data?.allowed !== true) throw new Error(gate.data?.reason || 'Tu ruta no autoriza consultar esta capacitación.')
        const x=await supabase.from('courses')
          .select('id,title,status,phases:course_phases(id,title,sort_order,blocks:content_blocks(id,title,type,description,status,sort_order,content))')
          .eq('id',selected).single()
        if(x.error)throw x.error
        if(active)setCourse(x.data)
      }catch(cause){if(active)setCourseError(cause?.message||'No pudimos obtener los contenidos estudiados.')}
      finally{if(active)setLoadingCourse(false)}
    })()
    return ()=>{active=false}
  },[selected,validSelection,loading])

  const onPracticeResult = (roundId,result) => {
    setPractice(recordPractice(userId,selected,roundId,result.success,result.mistakes))
  }
  const clearHistory = () => {
    const cleared = clearPractice(userId)
    if (cleared) setPractice(readPractice(userId))
    return cleared
  }
  const firstName=String(profile?.full_name||'Colaborador').trim().split(/\s+/)[0]
  const courseReady = Boolean(course && !loadingCourse && !courseError)

  return <main className="intelligence-page">
    <section className="intelligence-hero">
      <div><span className="intelligence-kicker"><Sparkles size={16}/> AULA EI · EXPERIENCIA INTELIGENTE</span>
        <h1>Tu aprendizaje, a tu ritmo.</h1>
        <p>{firstName}, explora tus temas, practica tus retos, desbloquea insignias y descubre el siguiente paso de tu ruta formativa.</p>
        <span className="intelligence-trust"><ShieldCheck size={17}/> Contenidos autorizados · Sin IA externa · Sin afectar tus notas</span>
      </div>
      <div className="intelligence-hero-art" aria-hidden="true"><BrainCircuit size={78}/><span>EI</span></div>
    </section>
    <nav className="intelligence-tabs" aria-label="Elegir función del entrenador">
      {OPTIONS.map(({id,title,detail,icon:Icon})=><button key={id} type="button"
        className={tab===id?'is-active':''} aria-current={tab===id?'page':undefined}
        onClick={()=>setTab(id)}><Icon size={22}/><span><strong>{title}</strong><small>{detail}</small></span></button>)}
    </nav>
    <div className="intelligence-toolbar">
      <span><ShieldCheck size={15}/> Tus materiales siguen sujetos a los permisos de la ruta institucional.</span>
      <button type="button" disabled={loading} onClick={() => setRevision((value) => value + 1)}>
        <RefreshCw size={16}/> {loading ? 'Actualizando…' : 'Actualizar mi progreso'}
      </button>
    </div>
    {loading ? <section className="intelligence-status" role="status"><RefreshCw size={21}/> Preparando tu experiencia personalizada…</section> :
      error ? <section className="intelligence-status" role="alert">{error}</section> : <>
      {['tutor','adaptive'].includes(tab) && <section className="intelligence-selector">
        <label htmlFor="intelligence-course"><GraduationCap size={17}/> Capacitación para estudiar
          <select id="intelligence-course" value={validSelection ? selected : ''} onChange={event=>setSelected(event.target.value)}>
            <option value="">Elige una capacitación…</option>
            {enrollmentOptions.map(item=><option key={item.course.id} value={item.course.id}>{item.course.title}</option>)}
          </select>
        </label>
        <span><BookOpenCheck size={16}/> {courseReady ? cards.length+' temas disponibles para consulta' : loadingCourse ? 'Preparando materiales…' : 'Solo cursos asignados'}</span>
      </section>}
      {['tutor','adaptive'].includes(tab) && loadingCourse && <div className="intelligence-status" role="status">Verificando tu ruta y contenidos completados…</div>}
      {['tutor','adaptive'].includes(tab) && courseError && <div className="intelligence-status" role="alert">{courseError}</div>}
      {tab==='tutor' && !loadingCourse && !courseError && <TutorPanel key={selected} cards={courseReady?cards:[]} courseTitle={course?.title}/>}
      {tab==='adaptive' && !loadingCourse && !courseError && <AdaptivePanel
        key={selected} groups={courseReady?groups:[]} courseId={selected} practice={coursePractice} onResult={onPracticeResult}/>}
      {tab==='rewards' && <RewardsPanel development={development} practice={practice} onClearHistory={clearHistory}/>}
      {tab==='paths' && <RoutesPanel development={development}/>}
    </>}
    <p className="intelligence-footer-note">El tutor usa búsqueda de información publicada y completada, no genera afirmaciones nuevas. Las insignias y prácticas son motivacionales; las calificaciones y los certificados solo los emite el LMS institucional.</p>
  </main>
}
