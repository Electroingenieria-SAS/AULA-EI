import React, { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, BookOpen, ClipboardList, GraduationCap, Loader2, LogOut, RefreshCw, ShieldCheck, Sparkles, Users, X } from 'lucide-react'
import AssignmentsCenter from './AssignmentsCenter.jsx'
import CoursesManager from './CoursesManager.jsx'
import UsersManager from './UsersManager.jsx'
import CertificatesManager from './CertificatesManager.jsx'
import { ADMIN_ROLES, ROLE_LABELS, STAFF_ROLES, fetchAllPages, getError, supabase } from './shared.js'

export default function App() {
  const [booting,setBooting]=useState(true), [profile,setProfile]=useState(null), [tab,setTab]=useState('courses')
  const [message,setMessage]=useState(''), [loading,setLoading]=useState(false), [courses,setCourses]=useState([]), [profiles,setProfiles]=useState([]), [enrollments,setEnrollments]=useState([])
  const canAdmin=ADMIN_ROLES.has(profile?.role)

  const loadCore=useCallback(async(currentProfile=profile)=>{
    if(!currentProfile)return; setLoading(true)
    try{
      const courseRequest=supabase.from('courses').select('*').order('updated_at',{ascending:false})
      if(ADMIN_ROLES.has(currentProfile.role)){
        const [courseResult,profileRows,enrollmentRows]=await Promise.all([
          courseRequest,
          fetchAllPages((from,to)=>supabase.from('profiles').select('id,email,full_name,avatar_url,role,is_active,created_at,updated_at').order('full_name').range(from,to)),
          fetchAllPages((from,to)=>supabase.from('enrollments').select('id,course_id,user_id,due_at,status,created_at,updated_at,user:profiles!enrollments_user_id_fkey(id,full_name,email,role,is_active),course:courses(id,title,status)').order('created_at',{ascending:false}).range(from,to)),
        ])
        if(courseResult.error)throw courseResult.error; setCourses(courseResult.data??[]); setProfiles(profileRows); setEnrollments(enrollmentRows)
      }else{ const result=await courseRequest; if(result.error)throw result.error; setCourses(result.data??[]) }
    }catch(error){setMessage(getError(error,'No fue posible actualizar el panel.'))}finally{setLoading(false)}
  },[profile])

  useEffect(()=>{let active=true;(async()=>{
    try{
      const {data,error}=await supabase.auth.getSession(); if(error)throw error
      const session=data.session; if(!session?.user){window.location.replace('/#/login');return}
      if(session.user.app_metadata?.aula_ei_must_change_password===true||session.user.user_metadata?.must_change_password===true){window.location.replace('/#/');return}
      const {data:result,error:profileError}=await supabase.functions.invoke('get-my-profile',{body:{}})
      if(profileError)throw new Error(result?.error||profileError.message); if(!result?.ok||!result.profile)throw new Error(result?.error||'Esta cuenta no está habilitada para Aula EI.')
      if(!STAFF_ROLES.has(result.profile.role)){window.location.replace('/#/');return}
      if(!active)return; setProfile(result.profile); await loadCore(result.profile)
    }catch(error){if(active)setMessage(getError(error,'No fue posible validar tu acceso a Gestión Aula EI.'))}finally{if(active)setBooting(false)}
  })();return()=>{active=false}},[])
  useEffect(()=>{if(!message)return;const t=setTimeout(()=>setMessage(''),7000);return()=>clearTimeout(t)},[message])
  const signOut=async()=>{await supabase.auth.signOut();window.location.replace('/#/login')}
  if(booting)return <Startup text="Validando acceso administrativo…"/>
  if(!profile)return <Startup error={message||'No fue posible cargar tu perfil.'} text="Acceso no disponible"/>
  const tabs=[['courses','Capacitaciones',BookOpen],...(canAdmin?[[ 'assignments','Asignaciones',ClipboardList],['users','Usuarios y roles',Users],['certificates','Ranking y certificados',GraduationCap]]:[])]
  return <div className="studio-app">
    <header className="studio-header"><button className="brand-button" onClick={()=>window.location.assign('/#/')}><img src="/brand/logo-aula-ei.png" alt="Aula EI"/><span><strong>Gestión Aula EI</strong><small>Administración de formación</small></span></button><div className="header-actions"><span className="role-chip"><ShieldCheck size={15}/> {ROLE_LABELS[profile.role]||profile.role}</span><button className="icon-button" title="Actualizar" onClick={()=>loadCore()} disabled={loading}><RefreshCw size={18} className={loading?'spin':''}/></button><button className="secondary-button compact" onClick={()=>window.location.assign('/#/')}><ArrowLeft size={16}/> Aula</button><button className="secondary-button compact" onClick={signOut}><LogOut size={16}/> Salir</button></div></header>
    <main className="studio-main"><section className="studio-hero"><div><span className="eyebrow">Constructor y administración</span><h1>Gestiona la formación sin fricción.</h1><p>Capacitaciones, matrículas, personas y certificados sobre la misma base segura de Aula EI.</p></div><div className="hero-stat"><strong>{courses.length}</strong><span>Capacitaciones</span></div></section>
      <nav className="studio-tabs">{tabs.map(([id,label,Icon])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><Icon size={18}/><span>{label}</span></button>)}</nav>
      {message&&<div className="message-banner"><Sparkles size={17}/><span>{message}</span><button onClick={()=>setMessage('')}><X size={16}/></button></div>}
      {tab==='courses'&&<CoursesManager courses={courses} refresh={()=>loadCore()} setMessage={setMessage}/>}
      {tab==='assignments'&&canAdmin&&<AssignmentsCenter courses={courses} profiles={profiles} enrollments={enrollments} refresh={()=>loadCore()} setMessage={setMessage}/>}
      {tab==='users'&&canAdmin&&<UsersManager profile={profile} profiles={profiles} refresh={()=>loadCore()} setMessage={setMessage}/>}
      {tab==='certificates'&&canAdmin&&<CertificatesManager setMessage={setMessage}/>}
    </main>
  </div>
}
function Startup({text,error}){return <main className="startup-page"><section className="startup-card"><img src="/brand/logo-aula-ei.png" alt="Aula EI"/>{!error&&<Loader2 className="spin" size={28}/>}<h1>{text}</h1>{error&&<p className="danger-text">{error}</p>}{error&&<button className="primary-button" onClick={()=>window.location.assign('/#/')}>Volver a Aula EI</button>}</section></main>}
