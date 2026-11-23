import React, { useState } from 'react'
import { avatarImageUrl, DEFAULT_AVATAR_ID, profileAvatarImage } from '../../../src/avatar/avatar-utils.js'

// The character is rendered from an approved complete asset. Never rebuild it
// with separately generated clothes or infer any role/permission from the art.
export default function AvatarFigure({ avatarUrl, fallback = 'EI', className = '' }) {
  const [failedSources, setFailedSources] = useState([])
  const selected = profileAvatarImage(avatarUrl)
  const generic = avatarImageUrl(DEFAULT_AVATAR_ID)
  const source = [selected, generic].find((candidate) => candidate && !failedSources.includes(candidate))

  return <span className={`ei-companion-figure ${className}`} aria-hidden="true">
    {source ? <img
      className="ei-companion-figure__image"
      src={source}
      alt=""
      loading="eager"
      decoding="async"
      onError={() => setFailedSources((current) => current.includes(source) ? current : [...current, source])}
    /> : <span className="ei-companion-figure__fallback">{String(fallback || 'EI').slice(0, 2).toUpperCase()}</span>}
  </span>
}
