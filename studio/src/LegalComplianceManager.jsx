import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, FilePlus2, FileText, RefreshCw, Save, ShieldAlert, Users } from 'lucide-react'
import { supabase } from './shared.js'

const USER_TYPES = [
  ['employee','Colaborador'],
  ['prehire','Preingreso aprobado'],
  ['candidate','Candidato'],
]

export default function LegalComplianceManager({ profile, setMessage = () => {} }) {
  const [documents,setDocuments]=useState([])
  const [users,setUsers]=useState([])
  const [requests,setRequests]=useState([])
  const [incidents,setIncidents]=useState([])
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [newVersion,setNewVersion]=useState({code:'',version:'',content:'',material:true})
  const [incident,setIncident]=useState({severity:'medium',category:'',description:''})
  const isSuperAdmin=String(profile?.role||'')==='super_admin'

  const rpc=useCallback(async(name,args={})=>{
    const {data,error}=await supabase.rpc(name,args)
    if(error) throw error
    return data||[]
  },[])

  const refresh=useCallback(async()=>{
    setLoading(true)
    try{
      const [docs,contexts,privacy,security]=await Promise.all([
        rpc('admin_list_legal_documents'),
        rpc('admin_list_legal_user_contexts'),
        rpc('admin_list_privacy_requests'),
        isSuperAdmin?rpc('admin_list_privacy_incidents'):Promise.resolve([]),
      ])
      setDocuments(docs);setUsers(contexts);setRequests(privacy);setIncidents(security)
    }catch(error){setMessage(error instanceof Error?error.message:'No fue posible cargar cumplimiento legal.')}
    finally{setLoading(false)}
  },[isSuperAdmin,rpc,setMessage])

  useEffect(()=>{void refresh()},[refresh])

  const documentGroups=useMemo(()=>{
    const map=new Map()
    for(const row of documents){
      const key=row.document_code
      if(!map.has(key)) map.set(key,{code:key,title:row.title,category:row.category,versions:[]})
      if(row.version_id) map.get(key).versions.push(row)
    }
    return [...map.values()]
  },[documents])

  const run=async(action,success)=>{
    if(busy)return
    setBusy(true)
    try{await action();setMessage(success);await refresh()}
    catch(error){setMessage(error instanceof Error?error.message:'No fue posible completar la operación.')}
    finally{setBusy(false)}
  }

  const createVersion=async(event)=>{
    event.preventDefault()
    await run(async()=>{
      await rpc('admin_create_legal_document_version',{
        p_document_code:newVersion.code,
        p_version:newVersion.version.trim(),
        p_content_markdown:newVersion.content.trim(),
        p_is_material:newVersion.material,
      })
      setNewVersion({code:newVersion.code,version:'',content:'',material:true})
    },'Borrador legal creado. Debe revisarse antes de publicarlo.')
  }

  const publish=async(versionId)=>{
    if(!window.confirm('Publicar esta versión la convertirá en vigente. Si es material, los usuarios afectados deberán aceptarla. ¿Continuar?'))return
    await run(()=>rpc('admin_publish_legal_document_version',{p_version_id:versionId}),'Versión legal publicada correctamente.')
  }

  const updateUserType=async(userId,userType)=>{
    await run(()=>rpc('admin_set_legal_user_type',{p_user_id:userId,p_user_type:userType}),'Contexto jurídico actualizado.')
  }

  const resolveRequest=async(item,status)=>{
    const needsResolution=['resolved','rejected'].includes(status)
    const resolution=needsResolution?window.prompt('Registra la respuesta o fundamento de cierre (mínimo 10 caracteres):',''):''
    if(needsResolution&&(!resolution||resolution.trim().length<10))return
    await run(()=>rpc('admin_resolve_privacy_request',{
      p_request_id:item.request_id,
      p_status:status,
      p_resolution:resolution||'',
    }),'Solicitud de privacidad actualizada.')
  }

  const createIncident=async(event)=>{
    event.preventDefault()
    if(!isSuperAdmin)return
    await run(async()=>{
      await rpc('admin_create_privacy_incident',{
        p_severity:incident.severity,
        p_category:incident.category.trim(),
        p_description:incident.description.trim(),
      })
      setIncident({severity:'medium',category:'',description:''})
    },'Incidente de privacidad registrado para seguimiento.')
  }

  if(loading)return <section className="legal-admin-loading"><RefreshCw className="spin" size={24}/><strong>Cargando cumplimiento legal…</strong></section>

  return <div className="legal-admin">
    <section className="panel-card legal-admin-intro">
      <div><span className="eyebrow">Cumplimiento y privacidad</span><h2>Centro legal de AULA EI</h2><p>Versiona políticas, controla el contexto jurídico de usuarios y atiende derechos del titular. Las publicaciones exigen sesión administrativa MFA AAL2.</p></div>
      <button className="secondary-button" onClick={refresh} disabled={busy}><RefreshCw size={16} className={busy?'spin':''}/>Actualizar</button>
    </section>

    <section className="legal-admin-grid">
      <article className="panel-card">
        <div className="section-title-row"><div><span className="eyebrow">Documentos</span><h3>Versiones legales</h3><p>Una versión publicada queda como evidencia histórica y no se edita.</p></div><FileText size={24}/></div>
        <div className="legal-admin-docs">
          {documentGroups.map(doc=><div className="legal-admin-doc" key={doc.code}>
            <div><strong>{doc.title}</strong><small>{doc.code} · {doc.category}</small></div>
            <div className="legal-version-list">{doc.versions.map(v=><div key={v.version_id}>
              <span>v{v.version}</span><span className={'legal-status '+v.status}>{v.status}</span><code>{String(v.content_sha256||'').slice(0,10)}…</code>
              {['draft','approved'].includes(v.status)&&<button className="primary-button compact" disabled={busy} onClick={()=>publish(v.version_id)}><CheckCircle2 size={14}/>Publicar</button>}
            </div>)}</div>
          </div>)}
        </div>
      </article>

      <article className="panel-card">
        <div className="section-title-row"><div><span className="eyebrow">Nueva versión</span><h3>Crear borrador</h3><p>El contenido se hash-ea en PostgreSQL; publicar una versión material fuerza reaceptación.</p></div><FilePlus2 size={24}/></div>
        <form className="legal-admin-form" onSubmit={createVersion}>
          <label>Documento<select required value={newVersion.code} onChange={e=>setNewVersion(v=>({...v,code:e.target.value}))}><option value="">Seleccionar…</option>{documentGroups.map(d=><option key={d.code} value={d.code}>{d.code} — {d.title}</option>)}</select></label>
          <label>Versión<input required maxLength={32} value={newVersion.version} onChange={e=>setNewVersion(v=>({...v,version:e.target.value}))} placeholder="2.1"/></label>
          <label>Contenido<textarea required minLength={80} maxLength={50000} value={newVersion.content} onChange={e=>setNewVersion(v=>({...v,content:e.target.value}))} placeholder="Contenido completo de la nueva versión…"/></label>
          <label className="check-label"><input type="checkbox" checked={newVersion.material} onChange={e=>setNewVersion(v=>({...v,material:e.target.checked}))}/>Cambio material: requiere nueva aceptación.</label>
          <button className="primary-button" disabled={busy}><Save size={16}/>Guardar borrador</button>
        </form>
      </article>
    </section>

    <section className="panel-card">
      <div className="section-title-row"><div><span className="eyebrow">Audiencia</span><h3>Contexto jurídico de usuarios</h3><p>La ausencia de clasificación explícita se interpreta como colaborador. Usa candidato/preingreso solo cuando corresponda.</p></div><Users size={24}/></div>
      <div className="legal-context-list">{users.map(user=><div key={user.user_id}>
        <div><strong>{user.full_name||user.email||'Usuario'}</strong><small>{user.email} · {user.role}</small></div>
        <select value={user.user_type||'employee'} disabled={busy} onChange={e=>updateUserType(user.user_id,e.target.value)}>
          {USER_TYPES.map(([value,label])=><option key={value} value={value}>{label}</option>)}
        </select>
      </div>)}</div>
    </section>

    <section className="panel-card">
      <div className="section-title-row"><div><span className="eyebrow">Derechos del titular</span><h3>Solicitudes de privacidad</h3><p>La fecha objetivo es un control interno; la procedencia y respuesta final requieren análisis humano.</p></div><ShieldAlert size={24}/></div>
      <div className="legal-request-list">{requests.length===0?<div className="empty-compact">No hay solicitudes.</div>:requests.map(item=><article key={item.request_id}>
        <div><strong>{item.requester_name||item.requester_email||'Titular'}</strong><span>{item.request_type} · {item.status}</span><small>{item.description}</small></div>
        <div className="row-actions">
          {item.status==='received'&&<button className="secondary-button compact" disabled={busy} onClick={()=>resolveRequest(item,'in_review')}>En revisión</button>}
          {!['resolved','rejected'].includes(item.status)&&<button className="primary-button compact" disabled={busy} onClick={()=>resolveRequest(item,'resolved')}>Resolver</button>}
        </div>
      </article>)}</div>
    </section>

    {isSuperAdmin&&<section className="panel-card legal-incidents">
      <div className="section-title-row"><div><span className="eyebrow">Acceso restringido · Super Admin</span><h3>Incidentes de privacidad</h3><p>El registro no envía reportes regulatorios automáticamente. La evaluación y notificación corresponden a responsables humanos.</p></div><AlertTriangle size={24}/></div>
      <form className="legal-incident-form" onSubmit={createIncident}>
        <select value={incident.severity} onChange={e=>setIncident(v=>({...v,severity:e.target.value}))}><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option><option value="critical">Crítica</option></select>
        <input required minLength={3} value={incident.category} onChange={e=>setIncident(v=>({...v,category:e.target.value}))} placeholder="Categoría"/>
        <textarea required minLength={10} value={incident.description} onChange={e=>setIncident(v=>({...v,description:e.target.value}))} placeholder="Descripción del incidente"/>
        <button className="danger-button" disabled={busy}><AlertTriangle size={16}/>Registrar incidente</button>
      </form>
      <div className="legal-incident-list">{incidents.map(i=><div key={i.incident_id}><strong>{i.category}</strong><span>{i.severity} · {i.status}</span><small>{i.description}</small></div>)}</div>
    </section>}
  </div>
}
