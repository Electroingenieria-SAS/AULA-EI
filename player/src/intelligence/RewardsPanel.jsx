import React, { useState } from 'react'
import { Award, CheckCircle2, Compass, Flame, LockKeyhole, Medal, RotateCcw, Sparkles, Target, Trophy } from 'lucide-react'
import { deriveBadges } from './intelligence-model.js'

export default function RewardsPanel({ development, practice, onClearHistory }) {
  const [notice, setNotice] = useState('')
  const badges = deriveBadges(development,practice)
  const unlocked = badges.filter((badge) => badge.achieved).length
  const badgeIcons = { 'first-training': Medal, 'steady-learning': Flame, 'first-review': Target, 'review-champion': Trophy, 'practice-effort': Compass }
  return <section className="intelligence-panel" aria-labelledby="rewards-title">
    <header className="intelligence-panel-heading"><span><Trophy size={23}/></span>
      <div><small>03 · MOTIVACIÓN Y CONSTANCIA</small><h2 id="rewards-title">Misiones e insignias</h2>
        <p>Reconocimientos formativos calculados a partir de capacitaciones oficiales cumplidas y prácticas de este navegador.</p></div>
    </header>
    <div className="intelligence-rewards-body">
      <div className="intelligence-rewards-banner"><span className="intelligence-rewards-crest"><Award size={30}/></span>
        <div><small>MI COLECCIÓN DE LOGROS</small><strong>{unlocked} de {badges.length} insignias desbloqueadas</strong>
          <span>Aprender con constancia también merece un reconocimiento.</span></div>
        <b className="intelligence-rewards-count">{Math.round(unlocked / badges.length * 100)}%</b>
      </div>
      <div className="intelligence-badges">
        {badges.map((badge) => {
          const BadgeIcon = badgeIcons[badge.id] || Sparkles
          return <article key={badge.id} className={'intelligence-badge-card ' + (badge.achieved ? 'achieved' : 'pending')}>
          <span className="intelligence-badge-emblem"><BadgeIcon size={25}/></span>
          <div><strong>{badge.title}</strong><p>{badge.description}</p>
            <div className="intelligence-badge-track" role="progressbar" aria-label={'Progreso de ' + badge.title}
              aria-valuemin={0} aria-valuemax={badge.goal} aria-valuenow={badge.progress}>
              <i style={{width:100*badge.progress/badge.goal + '%'}}/>
            </div>
            <small className="intelligence-badge-state">{badge.achieved ? <><CheckCircle2 size={13}/> Desbloqueada</> : <><LockKeyhole size={13}/> {badge.progress} / {badge.goal}</>}</small>
          </div>
        </article>
        })}
      </div>
      <p className="intelligence-disclaimer">Estas insignias no son certificados ni constancias laborales. Los avances de juegos se guardan localmente y pueden perderse al borrar datos del navegador.</p>
      <div className="intelligence-privacy-controls">
        <span>Los contadores de práctica pertenecen a este dispositivo. Las capacitaciones oficiales y los certificados no se borran.</span>
        <button type="button" onClick={() => {
          if (!window.confirm('¿Borrar tus resultados de juegos guardados en este navegador? No se modificarán capacitaciones, notas ni certificados.')) return
          const cleared = onClearHistory?.()
          setNotice(cleared ? 'Historial de práctica eliminado de este navegador.' : 'No se pudo borrar el historial local. Comprueba los permisos del navegador.')
        }}><RotateCcw size={16}/> Borrar mis prácticas locales</button>
      </div>
      {notice && <p className="intelligence-privacy-notice" role="status">{notice}</p>}
    </div>
  </section>
}
