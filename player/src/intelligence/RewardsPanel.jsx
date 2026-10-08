import React from 'react'
import { Award, CheckCircle2, LockKeyhole, Sparkles, Trophy } from 'lucide-react'
import { deriveBadges } from './intelligence-model.js'

export default function RewardsPanel({ development, practice }) {
  const badges = deriveBadges(development,practice)
  const unlocked = badges.filter((badge) => badge.achieved).length
  return <section className="intelligence-panel" aria-labelledby="rewards-title">
    <header className="intelligence-panel-heading"><span><Trophy size={23}/></span>
      <div><small>03 · MOTIVACIÓN Y CONSTANCIA</small><h2 id="rewards-title">Misiones e insignias</h2>
        <p>Reconocimientos formativos calculados a partir de capacitaciones oficiales cumplidas y prácticas de este navegador.</p></div>
    </header>
    <div className="intelligence-rewards-body">
      <div className="intelligence-rewards-banner"><Award size={27}/><div><strong>{unlocked} de {badges.length} insignias desbloqueadas</strong><span>Aprender con constancia también merece un reconocimiento.</span></div></div>
      <div className="intelligence-badges">
        {badges.map((badge) => <article key={badge.id} className={badge.achieved ? 'achieved' : ''}>
          <span>{badge.achieved ? <Sparkles size={23}/> : <LockKeyhole size={22}/>}</span>
          <div><strong>{badge.title}</strong><p>{badge.description}</p>
            <div className="intelligence-badge-track" role="progressbar" aria-label={'Progreso de ' + badge.title}
              aria-valuemin={0} aria-valuemax={badge.goal} aria-valuenow={badge.progress}>
              <i style={{width:100*badge.progress/badge.goal + '%'}}/>
            </div>
            <small>{badge.achieved ? <><CheckCircle2 size={13}/> Desbloqueada</> : badge.progress + ' / ' + badge.goal}</small>
          </div>
        </article>)}
      </div>
      <p className="intelligence-disclaimer">Estas insignias no son certificados ni constancias laborales. Los avances de juegos se guardan localmente y pueden perderse al borrar datos del navegador.</p>
    </div>
  </section>
}
