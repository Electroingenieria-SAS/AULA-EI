import React from 'react'

export default function StudioFrame() {
  const src = new URL('studio/index.html?embedded=1', window.location.href).href

  return <main className="learner-studio-frame-page">
    <iframe
      className="learner-studio-frame"
      src={src}
      title="Gestión Aula EI"
      allow="clipboard-read; clipboard-write"
    />
  </main>
}
