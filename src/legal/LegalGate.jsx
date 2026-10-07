import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, FileText, LogOut, RefreshCw, ShieldCheck } from 'lucide-react'
import LegalDocument from './LegalDocument.jsx'
import { acceptLegalDocument, loadLegalRequirements, pendingLegalRequirements } from './legal-api.js'
import { supabase } from '../supabase.js'
import { appUrl, assetUrl } from '../paths.js'

export default function LegalGate({ profile, sessionUser, children }) {
  const [requirements, setRequirements] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRequirements(await loadLegalRequirements())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No fue posible validar los documentos legales.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setAccepted(false)
    void load()
  }, [load, sessionUser?.id, profile?.id])

  const pending = useMemo(() => pendingLegalRequirements(requirements), [requirements])
  const current = pending[0] || null

  useEffect(() => {
    setAccepted(false)
  }, [current?.versionId])

  const submitAcceptance = async () => {
    if (!current || !accepted || busy) return
    setBusy(true)
    setError('')
    try {
      await acceptLegalDocument(current.versionId)
      await load()
    } catch (acceptError) {
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
    return <main className="legal-gate legal-gate-state" aria-busy="true">
      <img src={assetUrl('brand/logo-aula-ei.png')} alt="Aula EI" />
      <ShieldCheck size={34} />
      <h1>Validando documentos de privacidad…</h1>
      <p>Comprobamos únicamente las versiones que aplican a tu cuenta.</p>
    </main>
  }

  if (error && !current) {
    return <main className="legal-gate legal-gate-state">
      <img src={assetUrl('brand/logo-aula-ei.png')} alt="Aula EI" />
      <ShieldCheck size={34} />
      <h1>No pudimos validar tus documentos legales</h1>
      <p>{error}</p>
      <div className="legal-gate-actions">
        <button onClick={load}><RefreshCw size={17} /> Reintentar</button>
        <button className="secondary" onClick={signOut}><LogOut size={17} /> Cerrar sesión</button>
      </div>
    </main>
  }

  if (!current) return children

  return <main className="legal-gate">
    <section className="legal-gate-shell">
      <aside className="legal-gate-summary">
        <img src={assetUrl('brand/logo-aula-ei.png')} alt="Aula EI" />
        <span className="legal-gate-kicker"><ShieldCheck size={16} /> Privacidad y cumplimiento</span>
        <h2>Antes de continuar</h2>
        <p>Debes leer y aceptar los documentos vigentes que aplican a tu cuenta. La aceptación quedará registrada con usuario, versión, fecha y huella SHA-256.</p>
        <div className="legal-gate-progress" aria-label={pending.length + ' documentos pendientes'}>
          <FileText size={18} />
          <strong>{pending.length}</strong>
          <span>{pending.length === 1 ? 'documento pendiente' : 'documentos pendientes'}</span>
        </div>
        <button className="legal-signout" onClick={signOut}><LogOut size={16} /> Cerrar sesión</button>
      </aside>

      <section className="legal-gate-content">
        <LegalDocument requirement={current} />

        <label className="legal-accept-check">
          <input
            type="checkbox"
            checked={accepted}
            disabled={busy}
            onChange={(event) => setAccepted(event.target.checked)}
          />
          <span>
            <strong>He leído y comprendo este documento.</strong>
            Manifiesto expresamente mi aceptación de la versión indicada para las finalidades informadas.
          </span>
        </label>

        {error && <div className="legal-error" role="alert">{error}</div>}

        <button
          className="legal-accept-button"
          disabled={!accepted || busy}
          onClick={submitAcceptance}
        >
          <CheckCircle2 size={18} />
          {busy ? 'Registrando aceptación…' : 'Aceptar y continuar'}
        </button>
      </section>
    </section>
  </main>
}
