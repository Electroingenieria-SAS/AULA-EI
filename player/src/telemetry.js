let disabled = false
let started = false

function missingFeature(error) {
  const code = String(error?.code || '')
  const text = String(error?.message || error || '').toLowerCase()
  return ['42P01', '42883', 'PGRST202'].includes(code)
    || text.includes('does not exist')
    || text.includes('could not find the function')
    || text.includes('schema cache')
}

export function startAulaTelemetry(supabase) {
  if (started || typeof window === 'undefined') return () => {}
  started = true

  const send = async (eventType, message = '', durationMs = null, metadata = {}) => {
    if (disabled) return
    try {
      const { error } = await supabase.rpc('record_aula_telemetry', {
        p_event_type: eventType,
        p_route: window.location.hash || '#/',
        p_message: String(message || '').slice(0, 1800),
        p_duration_ms: durationMs,
        p_metadata: metadata,
      })
      if (error && missingFeature(error)) disabled = true
    } catch {
      // Observability must never break the learner experience.
    }
  }

  const onError = (event) => {
    send('error', event.message || 'Error de JavaScript', null, {
      source: event.filename || null,
      line: event.lineno || null,
      column: event.colno || null,
    })
  }

  const onRejection = (event) => {
    const reason = event.reason instanceof Error ? event.reason.message : String(event.reason || 'Promise rechazada')
    send('unhandledrejection', reason)
  }

  const onHash = () => send('route_change', window.location.hash || '#/')

  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)
  window.addEventListener('hashchange', onHash)

  window.setTimeout(() => {
    try {
      const navigation = performance.getEntriesByType('navigation')?.[0]
      if (navigation) {
        send('performance', 'Carga inicial', Math.round(navigation.duration), {
          dom_interactive_ms: Math.round(navigation.domInteractive || 0),
          dom_complete_ms: Math.round(navigation.domComplete || 0),
          transfer_size: navigation.transferSize || 0,
        })
      }
    } catch {
      // No-op.
    }
  }, 1200)

  return () => {
    window.removeEventListener('error', onError)
    window.removeEventListener('unhandledrejection', onRejection)
    window.removeEventListener('hashchange', onHash)
  }
}
