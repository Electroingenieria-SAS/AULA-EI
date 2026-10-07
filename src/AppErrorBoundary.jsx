import React from 'react'

function saveRuntimeError(error, errorInfo, id) {
  try {
    const payload = {
      id,
      at: new Date().toISOString(),
      name: error?.name || 'Error',
      message: String(error?.message || 'Error inesperado').slice(0, 500),
      componentStack: String(errorInfo?.componentStack || '').slice(0, 2000),
    }
    sessionStorage.setItem('aula-ei-last-runtime-error', JSON.stringify(payload))
  } catch {}
}

export default class AppErrorBoundary extends React.Component {
  state = { failed: false, errorId: '' }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error, errorInfo) {
    const errorId = 'AE-' + Date.now().toString(36).toUpperCase()
    this.setState({ errorId })
    saveRuntimeError(error, errorInfo, errorId)
    console.error('Aula EI runtime error', errorId, error)
  }

  render() {
    if (!this.state.failed) return this.props.children

    return <main className="startup-clean" role="alert">
      <section>
        <span className="eyebrow">Recuperación segura</span>
        <h1>Aula EI encontró un error inesperado</h1>
        <p>Tu sesión no se eliminará automáticamente. Recarga la aplicación para intentar recuperar el módulo.</p>
        {this.state.errorId && <p><strong>Referencia:</strong> {this.state.errorId}</p>}
        <div className="auth-recovery-actions">
          <button className="auth-primary" type="button" onClick={() => window.location.reload()}>Recargar Aula EI</button>
          <button className="auth-link-button" type="button" onClick={() => window.location.replace(import.meta.env.BASE_URL + '#/')}>Volver al inicio</button>
        </div>
      </section>
    </main>
  }
}
