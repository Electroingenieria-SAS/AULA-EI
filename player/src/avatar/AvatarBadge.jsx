import React, { useState } from 'react'
import './avatar.css'
import { profileAvatarImage } from '../../../src/avatar/avatar-utils.js'

export default function AvatarBadge({ avatarUrl, fallback = 'EI', className = '', size = 'small' }) {
  const src = profileAvatarImage(avatarUrl)
  const [broken, setBroken] = useState(null)
  const safeFallback = String(fallback || 'EI').slice(0, 2).toUpperCase()
  return <span className={'ei-avatar-badge ei-avatar-badge--' + size + ' ' + className}>
    {src && broken !== src
      ? <img src={src} alt="" loading="lazy" decoding="async" onError={() => setBroken(src)}/>
      : <span aria-hidden="true">{safeFallback}</span>}
  </span>
}
