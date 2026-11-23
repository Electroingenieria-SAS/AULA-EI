import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ImageOff, Palette, RefreshCw, Save, ShieldCheck, Sparkles } from 'lucide-react'
import { navigateLearner } from '../navigation.js'
import {
  avatarBackgroundUrl, avatarImageUrl, decodeAvatarSelection,
  DEFAULT_AVATAR_ID, DEFAULT_BACKGROUND_ID, loadAvatarCatalog,
} from '../../../src/avatar/avatar-utils.js'
import { saveMyAvatar } from '../../../src/avatar/avatar-service.js'
import './avatar.css'

const GROUPS = [
  ['logistico', 'Logístico'], ['contratista', 'Contratista'], ['analista', 'Analista'],
  ['lider', 'Líder'], ['jefe', 'Jefe'],
]
const LABELS = { masculino: 'Masculino', femenino: 'Femenino' }
const humanize = (value) => String(value || '').replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase())
const initial = { id: DEFAULT_AVATAR_ID, backgroundId: DEFAULT_BACKGROUND_ID }

function CharacterImage({ id, label, className = '', eager = false }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [id])
  return failed
    ? <div className="ei-avatar-image-error" role="img" aria-label={'Vista previa no disponible: ' + label}><ImageOff size={25}/><span>Imagen no disponible</span></div>
    : <img className={className} src={avatarImageUrl(id)} alt={label} width={512} height={512}
        loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)}/>
}

export default function AvatarStudio({ profile, onSaved }) {
  const saved = decodeAvatarSelection(profile?.avatar_url)
  const [catalog, setCatalog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [selectedId, setSelectedId] = useState(saved?.id || initial.id)
  const [backgroundId, setBackgroundId] = useState(saved?.backgroundId || initial.backgroundId)
  const [group, setGroup] = useState(null)
  const [gender, setGender] = useState(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    loadAvatarCatalog().then((data) => {
      if (mounted) { setCatalog(data); setLoadError(''); setLoading(false) }
    }).catch((cause) => {
      if (mounted) { setLoading(false); setLoadError(cause?.message || 'No se pudo cargar el catálogo.') }
    })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    const target = decodeAvatarSelection(profile?.avatar_url)
    if (target) { setSelectedId(target.id); setBackgroundId(target.backgroundId) }
  }, [profile?.avatar_url])

  const selected = catalog?.avatares.find((item) => item.id === selectedId) || null
  const activeGroup = group || selected?.cargo || 'analista'
  const availableGenders = useMemo(() => [...new Set((catalog?.avatares || [])
    .filter((item) => item.cargo === activeGroup).map((item) => item.genero))], [catalog, activeGroup])
  const activeGender = availableGenders.includes(gender) ? gender :
    availableGenders.includes(selected?.genero) ? selected.genero : availableGenders[0]
  const variants = useMemo(() => (catalog?.avatares || []).filter((item) => item.cargo === activeGroup && item.genero === activeGender), [catalog, activeGroup, activeGender])
  const visibleSelected = variants.find((item) => item.id === selectedId) || variants[0] || null
  const finalId = visibleSelected?.id
  const hasChanges = Boolean(finalId && (saved?.id !== finalId || saved?.backgroundId !== backgroundId))
  const selectedIndex = variants.findIndex((item) => item.id === finalId)

  useEffect(() => {
    if (!finalId || variants.length < 2) return
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    if (connection?.saveData || /(?:^|-)2g/.test(String(connection?.effectiveType || ''))) return
    const neighborIds = [variants[(selectedIndex + 1) % variants.length]?.id, variants[(selectedIndex + variants.length - 1) % variants.length]?.id]
    const preload = () => neighborIds.forEach((id) => { if (id) { const img = new Image(); img.src = avatarImageUrl(id) } })
    if ('requestIdleCallback' in window) {
      const handle = window.requestIdleCallback(preload, { timeout: 1400 })
      return () => window.cancelIdleCallback?.(handle)
    }
    const handle = window.setTimeout(preload, 500)
    return () => window.clearTimeout(handle)
  }, [finalId, selectedIndex, variants])

  function chooseGroup(next) {
    const nextPerson = catalog.avatares.find((item) => item.cargo === next)
    if (!nextPerson) return
    setGroup(next); setGender(nextPerson.genero); setSelectedId(nextPerson.id); setSuccess(false); setError('')
  }
  function chooseGender(next) {
    const nextPerson = catalog.avatares.find((item) => item.cargo === activeGroup && item.genero === next)
    if (!nextPerson) return
    setGender(next); setSelectedId(nextPerson.id); setSuccess(false); setError('')
  }
  function chooseVariant(id) { setSelectedId(id); setSuccess(false); setError('') }
  async function save() {
    if (!finalId || !hasChanges || saving) return
    setSaving(true); setError(''); setSuccess(false)
    try {
      const value = await saveMyAvatar(finalId, backgroundId)
      onSaved(value)
      setSuccess(true)
    } catch (cause) {
      setError(cause?.message || 'No se pudo guardar el personaje. Inténtalo nuevamente.')
    } finally { setSaving(false) }
  }

  if (loading) return <section className="ei-avatar-loading" aria-busy="true" role="status"><RefreshCw className="ei-avatar-spin" size={27}/> Preparando tu estudio de personajes…</section>
  if (loadError) return <section className="ei-avatar-loading" role="alert"><ImageOff size={29}/><h2>No pudimos cargar el editor.</h2><p>{loadError}</p><button type="button" onClick={() => { setLoading(true); loadAvatarCatalog().then((data) => { setCatalog(data); setLoadError(''); setLoading(false) }).catch((e) => { setLoadError(e.message);setLoading(false) }) }}>Reintentar</button></section>

  return <main className="ei-avatar-studio">
    <header className="ei-avatar-studio-header">
      <button type="button" className="ei-avatar-back" onClick={() => navigateLearner('/')}><ArrowLeft size={18}/> Volver al inicio</button>
      <div className="ei-avatar-heading">
        <span className="ei-avatar-eyebrow">AULA EI · TU IDENTIDAD VISUAL</span>
        <h1>Mi personaje <Sparkles aria-hidden="true" size={29}/></h1>
        <p>Elige entre los diseños institucionales y crea un personaje que te acompañe en tu aprendizaje.</p>
      </div>
    </header>
    <div className="ei-avatar-studio-grid">
      <section className="ei-avatar-preview-panel" aria-label="Vista previa del personaje seleccionado">
        <div className="ei-avatar-preview-heading"><span>VISTA PREVIA EN VIVO</span><span className="ei-avatar-preview-counter">{catalog.avatares.length} personajes</span></div>
        <div className="ei-avatar-stage" style={{backgroundImage: 'linear-gradient(145deg,rgba(0,34,86,.10),rgba(0,48,119,.15)),url(' + avatarBackgroundUrl(backgroundId) + ')'}}>
          {visibleSelected && <CharacterImage id={finalId} label={'Personaje: ' + visibleSelected.nombre} className="ei-avatar-hero-art" eager />}
          <span className="ei-avatar-stage-brand">ELECTROINGENIERÍA <strong>· AULA EI</strong></span>
        </div>
        <div className="ei-avatar-preview-bottom">
          <div><span className="ei-avatar-eyebrow">TU ELECCIÓN</span><h2>{visibleSelected?.nombre || 'Mi personaje'}</h2>
            <p>{visibleSelected?.cargo_nombre} · {visibleSelected?.genero_nombre}</p></div>
          <span className="ei-avatar-preview-id">{finalId}</span>
        </div>
        {visibleSelected && <div className="ei-avatar-traits" aria-label="Características disponibles">
          <span>Piel: {humanize(visibleSelected.tono_piel)}</span>
          <span>Cabello: {humanize(visibleSelected.peinado)}</span>
          <span>Gesto: {humanize(visibleSelected.gesto)}</span>
        </div>}
        <div className="ei-avatar-preview-footer"><ShieldCheck size={16}/><span>Tu personaje es únicamente visual. No cambia tu cargo real ni tus permisos.</span></div>
      </section>
      <section className="ei-avatar-configuration" aria-label="Opciones de personalización">
        <div className="ei-avatar-step-heading"><span>01</span><div><h2>Elige tu estilo</h2><p>Selecciona el tipo de personaje que más te guste.</p></div></div>
        <div className="ei-avatar-group-list" role="group" aria-label="Cargo visual del personaje">
          {GROUPS.map(([id,label]) => <button type="button" key={id} className={activeGroup === id ? 'selected' : ''} aria-pressed={activeGroup === id} onClick={() => chooseGroup(id)}>{label}</button>)}
        </div>
        <div className="ei-avatar-genders" role="group" aria-label="Presentación de personaje">
          {availableGenders.map((id) => <button type="button" key={id} className={activeGender === id ? 'selected' : ''} aria-pressed={activeGender === id} onClick={() => chooseGender(id)}>{LABELS[id]}</button>)}
        </div>
        <div className="ei-avatar-step-heading"><span>02</span><div><h2>Personaliza su apariencia</h2><p>Escoge una variante completa: gestos, peinado y vestuario ya incluidos en el diseño.</p></div></div>
        <p className="ei-avatar-available" role="status">{variants.length} {variants.length === 1 ? 'variante disponible' : 'variantes disponibles'} para esta presentación.</p>
        <div className="ei-avatar-variants" role="group" aria-label="Variantes de apariencia">
          {variants.map((person,index) => <button type="button" className={'ei-avatar-variant ' + (person.id === finalId ? 'selected' : '')}
            key={person.id} aria-pressed={person.id === finalId} onClick={() => chooseVariant(person.id)} aria-label={person.nombre + ': ' + humanize(person.peinado) + ', ' + humanize(person.gesto)}>
            <CharacterImage id={person.id} label=""/>
            <span>Variante {String(index + 1).padStart(2, '0')}</span><strong>{person.nombre}</strong>
            {person.id === finalId && <Check aria-hidden="true" size={19} className="ei-avatar-check"/>}
          </button>)}
        </div>
        <div className="ei-avatar-step-heading"><span>03</span><div><h2>Elige tu ambiente</h2><p>Un fondo institucional que complemente tu personaje.</p></div></div>
        <div className="ei-avatar-backgrounds" role="group" aria-label="Fondos institucionales">
          {catalog.fondos.map((bg) => <button type="button" key={bg.id} className={backgroundId === bg.id ? 'selected' : ''} aria-pressed={backgroundId === bg.id}
            onClick={() => { setBackgroundId(bg.id); setSuccess(false) }} aria-label={bg.nombre}>
            <img src={avatarBackgroundUrl(bg.id)} alt="" loading="lazy" decoding="async" width={90} height={66}/>
            <span>{bg.nombre}</span>{backgroundId === bg.id && <Check aria-hidden="true" size={16}/>}</button>)}
        </div>
        <div className="ei-avatar-save-row">
          <div className="ei-avatar-save-state" aria-live="polite">{success ? <><CheckCircle2 size={18}/> Tu personaje está guardado y disponible en todos tus dispositivos.</> : saved && !hasChanges ? <><CheckCircle2 size={18}/> Estás usando este personaje.</> : <><Palette size={18}/> Tu elección se guardará en tu perfil.</>}</div>
          <button type="button" className="ei-avatar-primary" onClick={save} disabled={saving || !hasChanges}>
            {saving ? 'Guardando…' : 'Guardar mi avatar'} {saving ? <RefreshCw className="ei-avatar-spin" size={18}/> : <Save size={18}/>}
          </button>
          {error && <p className="ei-avatar-error" role="alert">{error}</p>}
        </div>
      </section>
    </div>
  </main>
}
