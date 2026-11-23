import React, { useEffect, useRef } from 'react'
import { ArrowRight, Sparkles, X } from 'lucide-react'
import { avatarImageUrl, DEFAULT_AVATAR_ID, DEFAULT_BACKGROUND_ID, avatarBackgroundUrl } from '../../../src/avatar/avatar-utils.js'
import './avatar.css'

export default function AvatarWelcome({ onCreate, onLater }) {
  const dialog = useRef(null)
  const createButton = useRef(null)
  useEffect(() => {
    const previous = document.activeElement
    createButton.current?.focus()
    const onKey = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); onLater(); return }
      if (event.key !== 'Tab') return
      const buttons = Array.from(dialog.current?.querySelectorAll('button:not(:disabled)') || [])
      const first = buttons[0], last = buttons[buttons.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); previous?.focus?.() }
  }, [onLater])

  return <div className="ei-avatar-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onLater() }}>
    <section ref={dialog} className="ei-avatar-welcome" role="dialog" aria-modal="true" aria-labelledby="avatar-welcome-title" aria-describedby="avatar-welcome-copy">
      <button type="button" className="ei-avatar-close" aria-label="Cerrar bienvenida de avatar" onClick={onLater}><X size={19}/></button>
      <div className="ei-avatar-welcome-art" style={{ backgroundImage: 'linear-gradient(145deg,rgba(0,38,103,.05),rgba(2,52,141,.3)),url(' + avatarBackgroundUrl(DEFAULT_BACKGROUND_ID) + ')' }}>
        <span className="ei-avatar-spark"><Sparkles size={20}/></span>
        <img src={avatarImageUrl(DEFAULT_AVATAR_ID)} alt="Vista de ejemplo de los personajes de Aula EI" width="340" height="340" decoding="async"/>
        <span className="ei-avatar-welcome-sticker">Tu historia comienza aquí</span>
      </div>
      <div className="ei-avatar-welcome-copy">
        <span className="ei-avatar-eyebrow">AULA EI · TU IDENTIDAD</span>
        <h2 id="avatar-welcome-title">¡Crea tu avatar!</h2>
        <p id="avatar-welcome-copy">¡Dale vida a tu personaje! Personalízalo y haz que te acompañe durante tu experiencia de aprendizaje en Aula EI.</p>
        <p className="ei-avatar-hint">34 personajes · 8 ambientes · Una identidad única para tu aprendizaje</p>
        <button ref={createButton} type="button" className="ei-avatar-primary" onClick={onCreate}>Crear mi avatar <ArrowRight size={18}/></button>
        <button type="button" className="ei-avatar-subtle" onClick={onLater}>Ahora no</button>
      </div>
    </section>
  </div>
}
