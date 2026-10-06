export default function StudioLoading({ text, inline = false }) {
  return <section className={'studio-inline-state studio-inline-loading' + (inline ? ' is-inline' : '')} aria-busy="true">
    <div className="experience-loading-mark" aria-hidden="true"><i /><i /><i /></div>
    <strong>{text}</strong>
    <span>Estamos cargando únicamente los recursos de esta pantalla.</span>
    <div className="studio-loading-skeleton" aria-hidden="true"><i className="wide" /><i /><i /><i /></div>
  </section>
}
