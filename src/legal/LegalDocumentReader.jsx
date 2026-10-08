import React from 'react'
import { ArrowLeft, BookOpen, Download, FileCheck2, ShieldCheck } from 'lucide-react'
import LegalDocument, { getLegalBlocks } from './LegalDocument.jsx'
import { appUrl, assetUrl } from '../paths.js'

/** Dedicated authenticated view. Never replaces the canonical legal text or acceptance RPC. */
export default function LegalDocumentReader({ requirement }) {
  const outline = getLegalBlocks(requirement).map((block, index) => ({ ...block, index }))
    .filter((block) => block.type === 'heading')
  return <main className="legal-reader-page">
    <nav className="legal-reader-toolbar" aria-label="Acciones del documento">
      <a href={appUrl('/')} className="legal-reader-back"><ArrowLeft size={18} /> Volver a Aula EI</a>
      <span className="legal-reader-toolbar-label"><ShieldCheck size={17} /> Documento institucional · Solo lectura</span>
      <button type="button" onClick={() => window.print()}><Download size={17} /> Guardar PDF / imprimir</button>
    </nav>

    <div className="legal-reader-layout">
      <aside className="legal-reader-index" aria-label="Índice del documento">
        <span className="legal-reader-index-kicker"><BookOpen size={16} /> Contenido</span>
        <strong>En este documento</strong>
        {outline.length ? <ol>{outline.map((entry) => <li key={entry.index}>
          <a href={'#reader-section-' + entry.index}>{entry.text.replace(/\*\*/g, '')}</a>
        </li>)}</ol> : <p>Consulta el contenido íntegro en el documento.</p>}
        <div className="legal-reader-version"><FileCheck2 size={16} /> {requirement.code} · Versión {requirement.version}</div>
      </aside>

      <div className="legal-reader-paper">
        <header className="legal-reader-letterhead">
          <img src={assetUrl('brand/logo-aula-ei.png')} alt="Aula EI · Academia Interna" />
          <div><span>Electroingeniería S.A.S.</span><strong>Academia interna · Gestión documental</strong></div>
        </header>
        <LegalDocument requirement={requirement} idBase="reader" readingMode />
        <footer className="legal-reader-colophon">
          <span>Documento publicado en Aula EI. La versión vigente y su huella de integridad se muestran en el encabezado y al final del documento.</span>
          <strong>AULA EI · ELECTROINGENIERÍA</strong>
        </footer>
      </div>
    </div>
  </main>
}
