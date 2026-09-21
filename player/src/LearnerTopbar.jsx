import React from 'react'
import { BookOpen } from 'lucide-react'
import { navigateLearner } from './navigation.js'

export default function LearnerTopbar({ center, actions, mobileAction }) {
  return <header className="learner-topbar learner-shared-topbar">
    <button className="learner-brand" onClick={() => navigateLearner('/catalog')}>
      <img src="/brand/logo-aula-ei.png" alt="Aula EI" />
      <span><strong>Aula EI</strong><small>Experiencia de aprendizaje</small></span>
    </button>

    <div className="learner-topbar-center">
      {center || <div className="learner-topbar-page"><BookOpen size={16} /><div><span>Ruta personal</span><strong>Mis capacitaciones</strong></div></div>}
    </div>

    <div className="learner-topbar-actions">
      {mobileAction}
      {actions}
    </div>
  </header>
}
