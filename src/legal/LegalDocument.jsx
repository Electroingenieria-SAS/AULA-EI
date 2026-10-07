import React from 'react'
import { parseLegalMarkdown, stripLegalMarkdown } from './legal-markdown.js'

export default function LegalDocument({ requirement, idBase = 'legal-document' }) {
  if (!requirement) return null
  const titleId = idBase + '-title'
  const blocks = parseLegalMarkdown(requirement.content)
    .filter((block, index) => !(index === 0 && block.type === 'heading' && block.level === 1))
    .filter((block) => !(block.type === 'paragraph' && /^\*\*Versión:\*\*/i.test(block.text)))

  return <article className="legal-document" aria-labelledby={titleId}>
    <header className="legal-document-header">
      <div className="legal-document-meta">
        <span className="legal-document-kicker">Documento institucional</span>
        <span>{requirement.code}</span>
        <span>Versión {requirement.version}</span>
      </div>
      <h3 id={titleId}>{requirement.title}</h3>
      <p>
        Vigente desde {formatDate(requirement.effectiveAt)}
        {requirement.isMaterial ? ' · Requiere aceptación expresa.' : ' · Actualización informativa.'}
      </p>
    </header>

    <div className="legal-document-copy" tabIndex={0}>
      <div className="legal-document-intro">
        <strong>Lectura obligatoria</strong>
        <span>Revisa el contenido completo antes de marcar la aceptación correspondiente.</span>
      </div>
      <div className="legal-document-body">
        {blocks.length
          ? blocks.map((block, index) => <LegalBlock key={index} block={block} />)
          : <p>El contenido de este documento no está disponible. Contacta al administrador.</p>}
      </div>
    </div>

    <footer className="legal-document-integrity">
      <div>
        <strong>Control de integridad</strong>
        <span>La huella permite demostrar exactamente qué versión fue presentada y aceptada.</span>
      </div>
      <code>SHA-256 · {requirement.sha256 || 'No disponible'}</code>
    </footer>
  </article>
}

function LegalBlock({ block }) {
  if (block.type === 'heading') {
    const Tag = block.level <= 2 ? 'h4' : 'h5'
    return <Tag className="legal-document-section-title">{renderInline(block.text)}</Tag>
  }

  if (block.type === 'ordered-list' || block.type === 'unordered-list') {
    const Tag = block.type === 'ordered-list' ? 'ol' : 'ul'
    return <Tag className={'legal-document-list ' + (block.type === 'ordered-list' ? 'ordered' : 'unordered')}>
      {block.items.map((item, index) => <li key={index}><span>{renderInline(item)}</span></li>)}
    </Tag>
  }

  return <p>{renderInline(block.text)}</p>
}

function renderInline(value) {
  const text = String(value || '')
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean)

  return parts.map((part, index) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/)
    if (bold) return <strong key={index}>{stripLegalMarkdown(bold[1])}</strong>
    return <React.Fragment key={index}>{stripLegalMarkdown(part)}</React.Fragment>
  })
}

function formatDate(value) {
  if (!value) return 'fecha no disponible'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(date)
}
