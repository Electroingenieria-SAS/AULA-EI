import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bell, BellRing, BookOpen, CheckCheck, Clock3, WifiOff, X } from 'lucide-react'
import { navigateLearner } from './navigation.js'
import { supabase } from './supabase.js'

const POLL_INTERVAL = 180000

function connectionMessage(error) {
  const raw = String(error?.message || error || '').toLowerCase()
  if (!navigator.onLine || raw.includes('failed to fetch') || raw.includes('network')) {
    return 'Conexión inestable. Conservamos tus avisos y volveremos a sincronizar cuando regrese la red.'
  }
  return 'No pudimos actualizar los avisos en este momento. Puedes seguir usando Aula EI.'
}

export default function NotificationCenter({ profile = null }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [networkIssue, setNetworkIssue] = useState('')
  const rootRef = useRef(null)
  const requestRef = useRef(false)

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!profile?.id || requestRef.current) return
    if (!navigator.onLine) {
      setNetworkIssue('Sin conexión. Tus avisos se actualizarán automáticamente cuando vuelva la red.')
      if (!silent) setLoading(false)
      return
    }

    requestRef.current = true
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
      setNetworkIssue('')
    } catch (error) {
      setNetworkIssue(connectionMessage(error))
    } finally {
      requestRef.current = false
      if (!silent) setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => {
    if (!profile?.id) return
    void load()

    const refresh = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) void load({ silent: true })
    }
    const offline = () => setNetworkIssue('Sin conexión. Tus avisos se actualizarán automáticamente cuando vuelva la red.')
    const visibility = () => {
      if (document.visibilityState === 'visible') refresh()
    }

    const interval = window.setInterval(refresh, POLL_INTERVAL)
    window.addEventListener('focus', refresh)
    window.addEventListener('online', refresh)
    window.addEventListener('offline', offline)
    document.addEventListener('visibilitychange', visibility)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('online', refresh)
      window.removeEventListener('offline', offline)
      document.removeEventListener('visibilitychange', visibility)
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
    try {
      const { error } = await supabase.from('training_notifications').update({ read_at: readAt }).eq('id', item.id)
      if (error) throw error
      setNetworkIssue('')
    } catch (error) {
      setItems((current) => current.map((row) => row.id === item.id ? { ...row, read_at: item.read_at || null } : row))
      setNetworkIssue(connectionMessage(error))
    }
  }

  const markAllRead = async () => {
    if (!unread) return
    const previous = items
    const readAt = new Date().toISOString()
    setItems((current) => current.map((row) => ({ ...row, read_at: row.read_at || readAt })))
    try {
      const { error } = await supabase
        .from('training_notifications')
        .update({ read_at: readAt })
        .eq('user_id', profile.id)
        .is('read_at', null)
      if (error) throw error
      setNetworkIssue('')
    } catch (error) {
      setItems(previous)
      setNetworkIssue(connectionMessage(error))
    }
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
      {unread ? <BellRing size={20} /> : <Bell size={20} />}
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
          {unread > 0 && <button type="button" title="Marcar todas como leídas" onClick={markAllRead}><CheckCheck size={18} /></button>}
          <button type="button" title="Cerrar" onClick={() => setOpen(false)}><X size={19} /></button>
        </div>
      </header>

      {networkIssue && <div className="training-notification-network" role="status">
        <WifiOff size={17} />
        <span>{networkIssue}</span>
        <button type="button" onClick={() => load()}>Reintentar</button>
      </div>}

      <div className="training-notification-list">
        {loading && <div className="training-notification-empty"><i /><strong>Actualizando avisos…</strong></div>}
        {!loading && items.map((item) => <button
          key={item.id}
          className={'training-notification-item ' + (!item.read_at ? 'unread' : '')}
          onClick={() => openItem(item)}
        >
          <span className="training-notification-icon">{item.course_id ? <BookOpen size={18} /> : <Bell size={18} />}</span>
          <span className="training-notification-copy">
            <strong>{item.title}</strong>
            <small>{item.message}</small>
            <em><Clock3 size={12} /> {relativeTime(item.created_at)}</em>
          </span>
          {!item.read_at && <i className="training-notification-dot" />}
        </button>)}
        {!loading && !items.length && <div className="training-notification-empty"><Bell size={26} /><strong>Todo al día</strong><span>Los vencimientos, recertificaciones y novedades aparecerán aquí.</span></div>}
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
  if (hours < 24) return 'Hace ' + hours + ' h'
  const days = Math.floor(hours / 24)
  if (days < 7) return 'Hace ' + days + (days === 1 ? ' día' : ' días')
  return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' }).format(new Date(value))
}
