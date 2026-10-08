import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, FileText, LogOut, RefreshCw, ShieldCheck } from 'lucide-react'
import LegalDocumentReader from './LegalDocumentReader.jsx'
import LegalRequirementCard from './LegalRequirementCard.jsx'
import {
  acceptLegalDocuments,
  loadLegalRequirements,
  pendingLegalRequirements,
  saveLocalLegalReceipt,
} from './legal-api.js'
import { supabase } from '../supabase.js'
import { appUrl, assetUrl } from '../paths.js'

export default function LegalGate({ profile, sessionUser, children }) {
  const [requirements, setRequirements] = useState([])
  const [checked, setChecked] = useState({})
  const [reviewed, setReviewed] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const rows = await loadLegalRequirements()
      setRequirements(rows)
      return rows
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No fue posible validar los documentos legales.')
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setChecked({})
    setReviewed({})
    void load()
  }, [load, sessionUser?.id, profile?.id])

  const pending = useMemo(() => pendingLegalRequirements(requirements), [requirements])
  const readerMatch = window.location.hash.match(/^#\/legal\/read\/([^/?#]+)/)
  const readerId = readerMatch ? decodeURIComponent(readerMatch[1]) : null
  const readerDocument = readerId ? requirements.find((item) => String(item.versionId) === readerId) : null
  const confirmedCount = pending.filter((item) => checked[item.versionId] === true).length
  const allChecked = pending.length > 0 && pending.every((item) => checked[item.versionId] === true)

  useEffect(() => {
    if (pending.length > 0 && !readerId) {
      document.documentElement.classList.add('legal-consent-open')
      document.body.classList.add('legal-consent-open')
    } else {
      document.documentElement.classList.remove('legal-consent-open')
      document.body.classList.remove('legal-consent-open')
    }
    return () => {
      document.documentElement.classList.remove('legal-consent-open')
      document.body.classList.remove('legal-consent-open')
    }
  }, [pending.length, readerId])

  const toggle = (versionId, value) => {
    setChecked((current) => ({ ...current, [versionId]: value }))
  }

  const submitAcceptance = async () => {
    if (!allChecked || busy) return
    setBusy(true)
    setError('')
    try {
      const accepted = await acceptLegalDocuments(pending)
      saveLocalLegalReceipt(sessionUser?.id, accepted)
      const refreshed = await load()
      if (pendingLegalRequirements(refreshed).length > 0) {
        throw new Error('La aceptación se registró parcialmente. Revisa los documentos que siguen pendientes.')
      }
      setChecked({})
      setReviewed({})
    } catch (acceptError) {
      await load().catch(() => {})
      setError(acceptError instanceof Error ? acceptError.message : 'No fue posible registrar tu aceptación.')
    } finally {
      setBusy(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut().catch(() => {})
    window.location.replace(appUrl('/login'))
  }

  if (loading) {
    return <div className="legal-consent-overlay legal-consent-state" role="dialog" aria-modal="true" aria-label="Validando documentos legales">
      <img src={assetUrl('brand/logo-aula-ei.png')} alt="Aula EI" />
      <ShieldCheck size={38} />
      <h1>Validando documentos de privacidad…</h1>
      <p>Comprobamos las versiones legales que aplican a tu cuenta.</p>
    </div>
  }

  if (error && pending.length === 0) {
    return <div className="legal-consent-overlay legal-consent-state" role="dialog" aria-modal="true" aria-label="Error de validación legal">
      <img src={assetUrl('brand/logo-aula-ei.png')} alt="Aula EI" />
      <ShieldCheck size={38} />
      <h1>No pudimos validar tus documentos legales</h1>
      <p>{error}</p>
      <div className="legal-gate-actions">
        <button onClick={load}><RefreshCw size={17} /> Reintentar</button>
        <button className="secondary" onClick={signOut}><LogOut size={17} /> Cerrar sesión</button>
      </div>
    </div>
  }

  if (readerId) {
    return readerDocument
      ? <LegalDocumentReader requirement={readerDocument} />
      : <div className="legal-consent-overlay legal-consent-state" role="alert">
          <ShieldCheck size={34} />
          <h1>Documento no disponible</h1>
          <p>Esta versión no está vigente para tu cuenta o no se encuentra disponible.</p>
          <a className="legal-reader-back" href={appUrl('/')}>Regresar a Aula EI</a>
        </div>
  }

  if (pending.length === 0) return children

  return <div className="legal-consent-overlay" role="dialog" aria-modal="true" aria-labelledby="legal-consent-title">
    <section className="legal-consent-modal">
      <header className="legal-consent-header">
        <div className="legal-consent-brand">
          <img src={assetUrl('brand/logo-aula-ei.png')} alt="Aula EI" />
          <div>
            <span><ShieldCheck size={15} /> Bienvenido a Aula EI</span>
            <h1 id="legal-consent-title">Tus documentos vigentes</h1>
            <p>Antes de ingresar, consulta las versiones que corresponden a tu cuenta. Puedes desplegar cada ficha y abrir el documento completo en otra pestaña.</p>
          </div>
        </div>
        <button type="button" className="legal-signout" onClick={signOut}><LogOut size={16} /> Cerrar sesión</button>
      </header>

      <section className="legal-consent-layout" aria-label="Documentos para revisar">
        <div className="legal-consent-overview">
          <div>
            <span className="legal-consent-eyebrow">Lectura y aceptación</span>
            <h2>Una revisión sencilla, documento por documento</h2>
            <p>Abre «Leer documento completo» para revisar la versión oficial. Después confirma cada documento y continúa a tu capacitación.</p>
          </div>
          <div className="legal-gate-progress" aria-label={confirmedCount + ' de ' + pending.length + ' documentos confirmados'}>
            <FileText size={20} />
            <strong>{confirmedCount} / {pending.length}</strong>
            <span>confirmados</span>
          </div>
        </div>
        <div className="legal-consent-documents">
          {pending.map((item, index) => <LegalRequirementCard
            key={item.versionId}
            requirement={item}
            index={index}
            checked={checked[item.versionId] === true}
            reviewed={reviewed[item.versionId] === true}
            busy={busy}
            markReviewed={(versionId) => setReviewed((current) => ({ ...current, [versionId]: true }))}
            toggle={toggle}
          />)}
        </div>
        <p className="legal-receipt-note">
          <ShieldCheck size={17} />
          Tu aceptación se registra de forma individual en Supabase con la versión, fecha y huella SHA-256. La lectura en una nueva pestaña no se registra como una aceptación.
        </p>
      </section>

      <footer className="legal-consent-footer">
        <div>
          <strong>{confirmedCount} de {pending.length} documentos confirmados</strong>
          <span>Solo podrás continuar cuando hayas confirmado las versiones pendientes.</span>
        </div>
        {error && <div className="legal-error" role="alert">{error}</div>}
        <button className="legal-accept-button" disabled={!allChecked || busy} onClick={submitAcceptance}>
          <CheckCircle2 size={18} />
          {busy ? 'Guardando tus confirmaciones…' : 'Confirmar y entrar a Aula EI'}
        </button>
      </footer>
    </section>
  </div>
}
