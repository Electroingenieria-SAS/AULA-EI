import React from 'react'
import { BookOpen, Check, CheckCircle2, ChevronDown, ExternalLink, FileText } from 'lucide-react'
import { appUrl } from '../paths.js'
import { parseLegalMarkdown, stripLegalMarkdown } from './legal-markdown.js'

function excerptOf(content) {
  const blocks = parseLegalMarkdown(content)
  const paragraph = blocks.find((entry) => entry.type === 'paragraph' && entry.text.length > 35)
  const source = stripLegalMarkdown(paragraph?.text || '')
  return source.length > 240 ? source.slice(0, 239).trimEnd() + '…' : source
}

/** Native disclosure, one signed version, one independent acknowledgement. */
export default function LegalRequirementCard({ requirement, index, checked, reviewed, busy, markReviewed, toggle }) {
  const url = appUrl('/legal/read/' + encodeURIComponent(requirement.versionId))
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
          {checked ? <><CheckCircle2 size={14} /> Confirmado</> : reviewed ? 'Listo para aceptar' : 'Por revisar'}
        </span>
        <ChevronDown className="legal-policy-chevron" size={19} />
      </summary>
      <div className="legal-policy-detail">
        <p className="legal-policy-excerpt">{excerpt || 'El texto completo está disponible en la versión oficial del documento.'}</p>
        <p className="legal-policy-note">Este es un extracto orientativo, no sustituye el documento íntegro ni modifica su contenido.</p>
        <a className="legal-policy-read" href={url} target="_blank" rel="noopener noreferrer" onClick={() => markReviewed(requirement.versionId)}>
          <BookOpen size={18} /> Leer documento completo <ExternalLink size={15} />
        </a>
        <small className="legal-policy-instruction">Se abrirá en otra pestaña, con índice y opción de guardar en PDF.</small>
      </div>
    </details>
    <label className={reviewed ? 'legal-policy-acknowledge' : 'legal-policy-acknowledge is-locked'}>
      <input type="checkbox" checked={checked} disabled={busy || !reviewed} onChange={(event) => toggle(requirement.versionId, event.target.checked)} />
      <span>{reviewed ? 'He revisado el documento completo y acepto esta versión.' : 'Abre «Leer documento completo» para habilitar tu confirmación.'}</span>
    </label>
  </article>
}
