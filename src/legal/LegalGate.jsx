import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, CheckCircle2, FileText, LogOut, RefreshCw, ShieldCheck } from 'lucide-react'
import LegalDocument from './LegalDocument.jsx'
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
    void load()
  }, [load, sessionUser?.id, profile?.id])

  const pending = useMemo(() => pendingLegalRequirements(requirements), [requirements])
  const allChecked = pending.length > 0 && pending.every((item) => checked[item.versionId] === true)

  useEffect(() => {
    if (pending.length > 0) {
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
  }, [pending.length])

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

  if (pending.length === 0) return children

  return <div className="legal-consent-overlay" role="dialog" aria-modal="true" aria-labelledby="legal-consent-title">
    <section className="legal-consent-modal">
      <header className="legal-consent-header">
        <div className="legal-consent-brand">
          <img src={assetUrl('brand/logo-aula-ei.png')} alt="Aula EI" />
          <div>
            <span><ShieldCheck size={15} /> Privacidad y cumplimiento</span>
            <h1 id="legal-consent-title">Aceptación obligatoria antes de ingresar</h1>
            <p>Debes revisar y aceptar todos los documentos vigentes. No podrás usar AULA EI hasta finalizar este registro.</p>
          </div>
        </div>
        <button className="legal-signout" onClick={signOut}><LogOut size={16} /> Cerrar sesión</button>
      </header>

      <div className="legal-consent-layout">
        <aside className="legal-consent-sidebar">
          <div className="legal-gate-progress" aria-label={pending.length + ' documentos pendientes'}>
            <FileText size={18} />
            <strong>{pending.length}</strong>
            <span>{pending.length === 1 ? 'documento obligatorio' : 'documentos obligatorios'}</span>
          </div>
          <ol>
            {pending.map((item, index) => <li key={item.versionId} className={checked[item.versionId] ? 'is-checked' : ''}>
              <span className="legal-step-index">{checked[item.versionId] ? <Check size={15} /> : index + 1}</span>
              <div><strong>{item.title}</strong><small>{item.code} · v{item.version}</small></div>
            </li>)}
          </ol>
          <p className="legal-receipt-note">
            La aceptación se guarda en tu usuario en Supabase con versión, fecha y SHA-256. Este navegador conserva además un recibo local de referencia.
          </p>
        </aside>

        <section className="legal-consent-documents">
          {pending.map((item, index) => <section className="legal-consent-document-card" key={item.versionId}>
            <LegalDocument requirement={item} idBase={'legal-document-' + index} />
            <label className="legal-accept-check">
              <input
                type="checkbox"
                checked={checked[item.versionId] === true}
                disabled={busy}
                onChange={(event) => toggle(item.versionId, event.target.checked)}
              />
              <span>
                <strong>He leído, comprendo y acepto {item.title}.</strong>
                Acepto expresamente la versión {item.version} identificada arriba y las finalidades allí informadas.
              </span>
            </label>
          </section>)}
        </section>
      </div>

      <footer className="legal-consent-footer">
        <div>
          <strong>{Object.values(checked).filter(Boolean).length} de {pending.length} confirmados</strong>
          <span>Debes marcar cada documento para habilitar el ingreso.</span>
        </div>
        {error && <div className="legal-error" role="alert">{error}</div>}
        <button className="legal-accept-button" disabled={!allChecked || busy} onClick={submitAcceptance}>
          <CheckCircle2 size={18} />
          {busy ? 'Registrando aceptación…' : `Aceptar ${pending.length} documentos y entrar`}
        </button>
      </footer>
    </section>
  </div>
}
