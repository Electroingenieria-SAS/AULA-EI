import React from 'react'
import { parseLegalMarkdown, stripLegalMarkdown } from './legal-markdown.js'

export function getLegalBlocks(requirement) {
  return parseLegalMarkdown(requirement?.content || '')
    .filter((block, index) => !(index === 0 && block.type === 'heading' && block.level === 1))
    .filter((block) => !(block.type === 'paragraph' && /^\*\*Versión:\*\*/i.test(block.text)))
}

export default function LegalDocument({ requirement, idBase = 'legal-document', readingMode = false }) {
  if (!requirement) return null
  const titleId = idBase + '-title'
  const TitleTag = readingMode ? 'h1' : 'h3'
  const blocks = getLegalBlocks(requirement)

  return <article className={readingMode ? 'legal-document is-reader' : 'legal-document'} aria-labelledby={titleId}>
    <header className="legal-document-header">
      <div className="legal-document-meta">
        <span className="legal-document-kicker">Documento institucional</span>
        <span>{requirement.code}</span>
        <span>Versión {requirement.version}</span>
      </div>
      <TitleTag id={titleId}>{requirement.title}</TitleTag>
      <p>
        Vigente desde {formatDate(requirement.effectiveAt)}
        {requirement.isMaterial ? ' · Requiere aceptación expresa.' : ' · Actualización informativa.'}
      </p>
    </header>

    <div className="legal-document-copy" tabIndex={readingMode ? undefined : 0}>
      <div className="legal-document-intro">
        <strong>{readingMode ? 'Documento íntegro' : 'Lectura institucional'}</strong>
        <span>{readingMode ? 'Contenido oficial de la versión indicada, presentado para lectura y consulta.' : 'Revisa este contenido antes de confirmar la aceptación.'}</span>
      </div>
      <div className="legal-document-body">
        {blocks.length
          ? blocks.map((block, index) => <LegalBlock key={index} block={block} sectionId={readingMode ? idBase + '-section-' + index : undefined} readingMode={readingMode} />)
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

function LegalBlock({ block, sectionId, readingMode }) {
  if (block.type === 'heading') {
    const Tag = readingMode ? (block.level <= 2 ? 'h2' : 'h3') : (block.level <= 2 ? 'h4' : 'h5')
    return <Tag id={sectionId} className="legal-document-section-title">{renderInline(block.text)}</Tag>
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
