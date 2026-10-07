import React, { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock3, FileCheck2, RefreshCw, Send, ShieldCheck } from 'lucide-react'
import {
  createPrivacyRequest,
  loadLegalAcceptances,
  loadLegalRequirements,
  loadPrivacyRequests,
} from '../../src/legal/legal-api.js'

const REQUEST_TYPES = [
  ['consulta','Consulta sobre mis datos'],
  ['correccion','Corrección de información'],
  ['actualizacion','Actualización de información'],
  ['supresion','Solicitud de supresión'],
  ['revocatoria','Revocatoria cuando proceda'],
  ['reclamo','Reclamo de protección de datos'],
]

export default function PrivacyCenter() {
  const [acceptances,setAcceptances]=useState([])
  const [requirements,setRequirements]=useState([])
  const [requests,setRequests]=useState([])
  const [type,setType]=useState('consulta')
  const [description,setDescription]=useState('')
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')

  const refresh=async()=>{
    setLoading(true)
    setMessage('')
    try{
      const [accepted,current,submitted]=await Promise.all([
        loadLegalAcceptances(),
        loadLegalRequirements(),
        loadPrivacyRequests(),
      ])
      setAcceptances(accepted)
      setRequirements(current)
      setRequests(submitted)
    }catch(error){
      setMessage(error instanceof Error?error.message:'No fue posible cargar tu información de privacidad.')
    }finally{setLoading(false)}
  }

  useEffect(()=>{void refresh()},[])

  const submit=async(event)=>{
    event.preventDefault()
    const clean=description.trim()
    if(clean.length<10){
      setMessage('Describe tu solicitud con al menos 10 caracteres.')
      return
    }
    setBusy(true)
    setMessage('')
    try{
      await createPrivacyRequest(type,clean)
      setDescription('')
      setMessage('Solicitud registrada correctamente. Puedes consultar su estado en esta misma sección.')
      await refresh()
    }catch(error){
      setMessage(error instanceof Error?error.message:'No fue posible registrar la solicitud.')
    }finally{setBusy(false)}
  }

  const pending=useMemo(()=>requirements.filter((item)=>item.needsAcceptance),[requirements])

  return <section className="privacy-center">
    <header className="privacy-hero">
      <div>
        <span><ShieldCheck size={16}/> Privacidad y legal</span>
        <h1>Tu información, documentos y derechos</h1>
        <p>Consulta qué versiones aceptaste y presenta solicitudes relacionadas con tus datos personales.</p>
      </div>
      <button onClick={refresh} disabled={loading}><RefreshCw size={17} className={loading?'spin':''}/>{loading?'Actualizando…':'Actualizar'}</button>
    </header>

    {message&&<div className="privacy-message" role="status">{message}</div>}

    <div className="privacy-grid">
      <section className="privacy-card">
        <div className="privacy-card-title"><FileCheck2 size={20}/><div><h2>Documentos vigentes</h2><p>Versiones que actualmente aplican a tu cuenta.</p></div></div>
        {loading?<p>Cargando…</p>:requirements.length===0?<p>No hay documentos vigentes asociados.</p>:
          <div className="privacy-list">{requirements.map((item)=><article key={item.versionId}>
            <div><strong>{item.title}</strong><span>{item.code} · v{item.version}</span></div>
            <span className={item.accepted?'privacy-status ok':'privacy-status pending'}>
              {item.accepted?<><CheckCircle2 size={14}/> Aceptado</>:<><Clock3 size={14}/> Pendiente</>}
            </span>
          </article>)}</div>}
        {pending.length>0&&<small>Hay {pending.length} documento(s) pendiente(s). El gate de acceso te solicitará aceptarlos antes de usar el LMS.</small>}
      </section>

      <section className="privacy-card">
        <div className="privacy-card-title"><FileCheck2 size={20}/><div><h2>Evidencia de aceptación</h2><p>Historial personal de documentos aceptados.</p></div></div>
        {loading?<p>Cargando…</p>:acceptances.length===0?<p>Aún no tienes aceptaciones registradas.</p>:
          <div className="privacy-list privacy-acceptance-list">{acceptances.map((item)=><article key={item.acceptance_id}>
            <div><strong>{item.title}</strong><span>{item.document_code} · v{item.document_version}</span><small>{formatDate(item.accepted_at)}</small></div>
            <code title={item.document_sha256}>{shortHash(item.document_sha256)}</code>
          </article>)}</div>}
      </section>
    </div>

    <div className="privacy-grid lower">
      <section className="privacy-card">
        <div className="privacy-card-title"><Send size={20}/><div><h2>Ejercer mis derechos</h2><p>Radica una solicitud para revisión del responsable interno.</p></div></div>
        <form className="privacy-form" onSubmit={submit}>
          <label>Tipo de solicitud<select value={type} onChange={(event)=>setType(event.target.value)}>
            {REQUEST_TYPES.map(([value,label])=><option key={value} value={value}>{label}</option>)}
          </select></label>
          <label>Descripción<textarea value={description} onChange={(event)=>setDescription(event.target.value)} maxLength={4000} placeholder="Describe claramente qué información deseas consultar, corregir, actualizar o solicitar…" required/></label>
          <small>{description.trim().length}/4000 caracteres · mínimo 10.</small>
          <button disabled={busy||description.trim().length<10}><Send size={17}/>{busy?'Registrando…':'Radicar solicitud'}</button>
        </form>
        <p className="privacy-channel">También puedes escribir a <strong>protecciondedatos@ei.com.co</strong>.</p>
      </section>

      <section className="privacy-card">
        <div className="privacy-card-title"><Clock3 size={20}/><div><h2>Mis solicitudes</h2><p>Seguimiento de radicados creados desde AULA EI.</p></div></div>
        {loading?<p>Cargando…</p>:requests.length===0?<p>No tienes solicitudes registradas.</p>:
          <div className="privacy-list">{requests.map((item)=><article key={item.request_id}>
            <div><strong>{requestLabel(item.request_type)}</strong><span>Recibida: {formatDate(item.received_at)}</span><small>Fecha objetivo interna: {formatDate(item.due_at)}</small></div>
            <span className={'privacy-status '+(item.status==='resolved'?'ok':'pending')}>{statusLabel(item.status)}</span>
          </article>)}</div>}
      </section>
    </div>
  </section>
}

function shortHash(value){const text=String(value||'');return text?text.slice(0,12)+'…':'Sin hash'}
function formatDate(value){if(!value)return '—';const date=new Date(value);if(Number.isNaN(date.getTime()))return String(value);return new Intl.DateTimeFormat('es-CO',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Bogota'}).format(date)}
function requestLabel(value){return REQUEST_TYPES.find(([key])=>key===value)?.[1]||value}
function statusLabel(value){return {received:'Recibida',in_review:'En revisión',extended:'Prorrogada',resolved:'Resuelta',rejected:'Cerrada'}[value]||value}
