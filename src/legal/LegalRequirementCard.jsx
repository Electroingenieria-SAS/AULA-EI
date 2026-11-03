import React, { useState } from 'react'
import { BookOpen, Check, CheckCircle2, ChevronDown, ExternalLink, FileText } from 'lucide-react'
import { appUrl } from '../paths.js'
import LegalDocument from './LegalDocument.jsx'
import { parseLegalMarkdown, stripLegalMarkdown } from './legal-markdown.js'

function excerptOf(content) {
  const blocks = parseLegalMarkdown(content)
  const paragraph = blocks.find((entry) => entry.type === 'paragraph' && entry.text.length > 35)
  const source = stripLegalMarkdown(paragraph?.text || '')
  return source.length > 240 ? source.slice(0, 239).trimEnd() + '…' : source
}

/** Every legal version is available for reading in place and requires its own explicit, unchecked acknowledgement. */
export default function LegalRequirementCard({ requirement, index, checked, busy, toggle, preview = false }) {
  const [showFullText, setShowFullText] = useState(false)
  const url = appUrl('/legal/read/' + encodeURIComponent(requirement.versionId))
  const hasContent = Boolean(requirement.content?.trim())
  const excerpt = excerptOf(requirement.content)

  return <article className={checked ? 'legal-policy-card is-checked' : 'legal-policy-card'}>
    <details className="legal-policy-disclosure">
      <summary>
        <span className="legal-policy-number">{checked ? <Check size={17} /> : String(index + 1).padStart(2, '0')}</span>
        <span className="legal-policy-title">
          <strong>{requirement.title}</strong>
          <small><FileText size={13} /> {requirement.code} · Versión {requirement.version}</small>
        </span>
        <span className={checked ? 'legal-policy-state complete' : 'legal-policy-state'}>
          {checked ? <><CheckCircle2 size={14} /> Confirmado</> : 'Pendiente de confirmar'}
        </span>
        <ChevronDown className="legal-policy-chevron" size={19} />
      </summary>
      <div className="legal-policy-detail">
        <p className="legal-policy-excerpt">{excerpt || 'El texto completo de esta versión no está disponible.'}</p>
        <p className="legal-policy-note">Puedes consultar el texto íntegro desde esta pantalla, sin salir de Aula EI ni abrir otra pestaña.</p>
        {hasContent && <div className="legal-policy-reads">
          <button
            type="button"
            className="legal-policy-read legal-policy-inline-toggle"
            aria-expanded={showFullText}
            onClick={() => setShowFullText((current) => !current)}
          >
            <BookOpen size={18} /> {showFullText ? 'Ocultar documento completo' : 'Leer documento completo aquí'}
          </button>
          <a className="legal-policy-external" href={url} target="_blank" rel="noopener noreferrer">
            Abrir en otra pestaña (opcional) <ExternalLink size={15} />
          </a>
        </div>}
        {showFullText && hasContent && <div className="legal-policy-inline-document" role="region" aria-label={'Texto completo: ' + requirement.title}>
          <LegalDocument requirement={requirement} idBase={'legal-gate-' + index} />
        </div>}
      </div>
    </details>
    <label className="legal-policy-acknowledge">
      <input
        type="checkbox"
        checked={checked}
        disabled={busy || !hasContent}
        onChange={(event) => toggle(requirement.versionId, event.target.checked)}
      />
      <span>{!hasContent
        ? 'No se puede aceptar esta versión porque su contenido no está disponible. Contacta al administrador.'
        : preview
          ? 'Simulo haber leído y aceptado esta versión (no se guarda).'
          : 'He leído y acepto este documento (versión ' + requirement.version + ').'}</span>
    </label>
  </article>
}
