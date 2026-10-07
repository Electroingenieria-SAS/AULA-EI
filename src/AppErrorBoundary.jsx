import React from 'react'
import { getRuntimeDiagnostics, recordRuntimeDiagnostic } from './runtime-diagnostics.js'

function saveRuntimeError(error, errorInfo, id) {
  try {
    const payload = {
      id,
      at: new Date().toISOString(),
      name: error?.name || 'Error',
    }
    sessionStorage.setItem('aula-ei-last-runtime-error', JSON.stringify(payload))
  } catch {}
}

export default class AppErrorBoundary extends React.Component {
  state = { failed: false, errorId: '', copied: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error, errorInfo) {
    const errorId = 'AE-' + Date.now().toString(36).toUpperCase()
    this.setState({ errorId })
    saveRuntimeError(error, errorInfo, errorId)
    recordRuntimeDiagnostic('react-error-boundary', {
      name: error?.name || 'Error',
      message: error?.message || 'Error inesperado',
      source: errorId,
    })
    console.error('Aula EI runtime error', errorId, error)
  }

  copyDiagnostics = async () => {
    try {
      const diagnostics = JSON.stringify(getRuntimeDiagnostics(), null, 2)
      await navigator.clipboard.writeText(diagnostics)
      this.setState({ copied: true })
    } catch {}
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
          <button className="auth-link-button" type="button" onClick={this.copyDiagnostics}>{this.state.copied ? 'Diagnóstico copiado' : 'Copiar diagnóstico'}</button>
        </div>
      </section>
    </main>
  }
}
