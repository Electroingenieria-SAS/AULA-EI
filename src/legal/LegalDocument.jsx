import React from 'react'

export default function LegalDocument({ requirement, idBase = 'legal-document' }) {
  if (!requirement) return null
  const titleId = idBase + '-title'

  return <article className="legal-document" aria-labelledby={titleId}>
    <header className="legal-document-header">
      <span>{requirement.code} · Versión {requirement.version}</span>
      <h3 id={titleId}>{requirement.title}</h3>
      <p>
        Vigente desde {formatDate(requirement.effectiveAt)}
        {requirement.isMaterial ? ' · Cambio material sujeto a aceptación.' : ' · Actualización no material.'}
      </p>
    </header>
    <div className="legal-document-copy" tabIndex={0}>
      {requirement.content || 'El contenido de este documento no está disponible. Contacta al administrador.'}
    </div>
    <footer className="legal-document-integrity">
      <strong>Integridad del documento</strong>
      <span>SHA-256: {requirement.sha256 || 'No disponible'}</span>
    </footer>
  </article>
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
