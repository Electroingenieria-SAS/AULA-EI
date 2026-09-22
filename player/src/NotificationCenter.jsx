import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bell, BellRing, BookOpen, CheckCheck, Clock3, X } from 'lucide-react'
import { navigateLearner } from './navigation.js'
import { supabase } from './supabase.js'

export default function NotificationCenter({ profile = null }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const rootRef = useRef(null)

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!profile?.id) return
    if (!silent) setLoading(true)
    try {
      const { data, error } = await supabase
        .from('training_notifications')
        .select('id,notification_type,title,message,course_id,path_id,due_at,read_at,metadata,created_at')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(40)
      if (error) throw error
      setItems(data || [])
    } catch {
      setItems([])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => {
    if (!profile?.id) return
    load()
    const interval = window.setInterval(() => load({ silent: true }), 60000)
    const refresh = () => load({ silent: true })
    window.addEventListener('focus', refresh)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refresh)
    }
  }, [profile?.id, load])

  useEffect(() => {
    if (!open) return
    const close = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const escape = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  const unread = useMemo(() => items.filter((item) => !item.read_at).length, [items])

  const markRead = async (item) => {
    if (!item?.id || item.read_at) return
    const readAt = new Date().toISOString()
    setItems((current) => current.map((row) => row.id === item.id ? { ...row, read_at: readAt } : row))
    await supabase.from('training_notifications').update({ read_at: readAt }).eq('id', item.id)
  }

  const markAllRead = async () => {
    if (!unread) return
    const readAt = new Date().toISOString()
    setItems((current) => current.map((row) => ({ ...row, read_at: row.read_at || readAt })))
    await supabase
      .from('training_notifications')
      .update({ read_at: readAt })
      .eq('user_id', profile.id)
      .is('read_at', null)
  }

  const openItem = async (item) => {
    await markRead(item)
    setOpen(false)
    if (item.course_id) navigateLearner('/course/' + encodeURIComponent(item.course_id))
  }

  if (!profile?.id) return null

  return <div className={'training-notification-center ' + (open ? 'is-open' : '')} ref={rootRef}>
    <button
      className="training-notification-trigger"
      aria-label={unread ? unread + ' notificaciones sin leer' : 'Notificaciones'}
      aria-expanded={open}
      onClick={() => setOpen((value) => !value)}
    >
      {unread ? <BellRing size={19} /> : <Bell size={19} />}
      <span>Notificaciones</span>
      {unread > 0 && <b>{unread > 99 ? '99+' : unread}</b>}
    </button>

    {open && <section className="training-notification-panel" aria-label="Centro de notificaciones">
      <header>
        <div>
          <span>Centro de actividad</span>
          <strong>Notificaciones</strong>
        </div>
        <div>
          {unread > 0 && <button title="Marcar todas como leídas" onClick={markAllRead}><CheckCheck size={17} /></button>}
          <button title="Cerrar" onClick={() => setOpen(false)}><X size={17} /></button>
        </div>
      </header>

      <div className="training-notification-list">
        {loading && <div className="training-notification-empty"><i /><strong>Actualizando avisos…</strong></div>}
        {!loading && items.map((item) => <button
          key={item.id}
          className={'training-notification-item ' + (!item.read_at ? 'unread' : '')}
          onClick={() => openItem(item)}
        >
          <span className="training-notification-icon">{item.course_id ? <BookOpen size={17} /> : <Bell size={17} />}</span>
          <span className="training-notification-copy">
            <strong>{item.title}</strong>
            <small>{item.message}</small>
            <em><Clock3 size={12} /> {relativeTime(item.created_at)}</em>
          </span>
          {!item.read_at && <i className="training-notification-dot" />}
        </button>)}
        {!loading && !items.length && <div className="training-notification-empty"><Bell size={24} /><strong>Todo al día</strong><span>Los vencimientos, recertificaciones y novedades aparecerán aquí.</span></div>}
      </div>
    </section>}
  </div>
}

function relativeTime(value) {
  if (!value) return 'Ahora'
  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) return 'Ahora'
  const diff = Math.max(0, Date.now() - time)
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Ahora'
  if (minutes < 60) return 'Hace ' + minutes + ' min'
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return 'Hace ' + hours + (hours === 1 ? ' h' : ' h')
  const days = Math.floor(hours / 24)
  if (days < 7) return 'Hace ' + days + (days === 1 ? ' día' : ' días')
  return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' }).format(new Date(value))
}
