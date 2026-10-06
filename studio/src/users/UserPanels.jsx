import React, { useState } from 'react'
import {
  Check, ChevronRight, Copy, KeyRound, Loader2, ShieldCheck, UserPlus, X,
} from 'lucide-react'
import { ROLE_LABELS } from '../shared.js'
import { ROLE_OPTIONS, formatDate, initials } from './user-utils.js'

export function MetricButton({ label, value, icon: Icon, active, onClick }) {
  return <button className={'user-metric-card ' + (active ? 'active' : '')} onClick={onClick}>
    <span><Icon size={18} /></span><div><strong>{value}</strong><small>{label}</small></div>
  </button>
}

export function RoleBadge({ role }) {
  return <span className={'user-role-badge role-' + role}><ShieldCheck size={13} />{ROLE_LABELS[role] || role}</span>
}

export function CreateUserModal({ form, setForm, allowedRoles, busy, generatedPassword, onSubmit, onClose }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="user-create-modal">
      <header><div><span className="eyebrow">Nuevo usuario</span><h2>Crear acceso a Aula EI</h2><p>La cuenta quedará obligada a cambiar la contraseña temporal en su primer ingreso.</p></div><button className="icon-button" onClick={onClose} disabled={busy}><X size={18} /></button></header>
      {!generatedPassword ? <form className="user-create-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label className="wide">Nombre completo<input autoFocus value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} required /></label>
          <label className="wide">Correo electrónico<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
          <label className="wide">Contraseña temporal<input type="text" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Déjala vacía para generarla automáticamente" /><small className="helper-text"><KeyRound size={12} /> Debe cumplir la política de seguridad del servidor si la escribes manualmente.</small></label>
          <label className="wide">Rol inicial<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>{allowedRoles.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select></label>
        </div>
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose} disabled={busy}>Cancelar</button><button className="primary-button" disabled={busy}>{busy ? <Loader2 className="spin" size={17} /> : <UserPlus size={17} />} {busy ? 'Creando…' : 'Crear usuario'}</button></div>
      </form> : <div className="created-user-success">
        <span className="success-icon"><Check size={24} /></span>
        <h3>Usuario creado correctamente</h3>
        <p>Comparte esta contraseña temporal por un canal seguro. El sistema solicitará cambiarla en el primer ingreso.</p>
        <div className="temporary-password-card"><strong>{generatedPassword}</strong><button className="secondary-button compact" onClick={() => navigator.clipboard?.writeText(generatedPassword)}><Copy size={15} /> Copiar</button></div>
        <button className="primary-button" onClick={onClose}>Cerrar</button>
      </div>}
    </section>
  </div>
}

export function ResetPasswordModal({ person, password, onClose }) {
  const [copied, setCopied] = useState(false)

  const copyPassword = async () => {
    try {
      await navigator.clipboard?.writeText(password)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="user-create-modal">
      <header>
        <div>
          <span className="eyebrow">Acceso restablecido</span>
          <h2>Contraseña temporal de {person.name}</h2>
          <p>Esta contraseña se muestra para que puedas entregársela por un canal seguro. Aula EI obligará al usuario a crear una contraseña personal al iniciar sesión.</p>
        </div>
        <button className="icon-button" onClick={onClose}><X size={18} /></button>
      </header>
      <div className="created-user-success">
        <span className="success-icon"><KeyRound size={24} /></span>
        <h3>Restablecimiento completado</h3>
        <p>No guardes esta contraseña en notas públicas, correos compartidos ni capturas. La operación quedó registrada en auditoría sin almacenar el valor de la contraseña.</p>
        <div className="temporary-password-card">
          <strong>{password}</strong>
          <button className="secondary-button compact" onClick={copyPassword}>{copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copiada' : 'Copiar'}</button>
        </div>
        <button className="primary-button" onClick={onClose}>Cerrar</button>
      </div>
    </section>
  </div>
}

export function UserDetailDrawer({ person, profile, canManage, canChangeRole, working, onClose, onToggle, onReset, onRole }) {
  return <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <aside className="user-detail-drawer">
      <header><div><span className="eyebrow">Detalle del usuario</span><h2>{person.name}</h2></div><button className="icon-button" onClick={onClose}><X size={18} /></button></header>

      <div className="detail-profile-card">
        <span className="detail-avatar">{initials(person.name)}</span>
        <div><strong>{person.name}</strong><span>{person.email}</span><div><RoleBadge role={person.role} /><span className={'user-status-pill ' + (person.is_active === false ? 'inactive' : 'active')}>{person.is_active === false ? 'Inactivo' : 'Activo'}</span></div></div>
      </div>

      <div className="detail-stats-grid">
        <article><strong>{person.stats.total}</strong><span>Matrículas</span></article>
        <article><strong>{person.stats.active}</strong><span>Activas</span></article>
        <article><strong>{person.stats.completed}</strong><span>Completadas</span></article>
      </div>

      <section className="detail-section">
        <h3>Cuenta</h3>
        <dl><div><dt>Creada</dt><dd>{formatDate(person.created_at)}</dd></div><div><dt>Estado</dt><dd>{person.is_active === false ? 'Inactivo' : 'Activo'}</dd></div><div><dt>Rol</dt><dd>{ROLE_LABELS[person.role] || person.role}</dd></div></dl>
      </section>

      {person.stats.recent.length > 0 && <section className="detail-section">
        <h3>Formación reciente</h3>
        <div className="detail-training-list">{person.stats.recent.slice(0, 6).map((item) => <article key={item.id}><div><strong>{item.course?.title || 'Capacitación'}</strong><small>{item.status === 'completed' ? 'Completada' : item.status === 'in_progress' ? 'En progreso' : item.status === 'expired' ? 'Vencida' : item.status === 'cancelled' ? 'Cancelada' : 'Asignada'}</small></div><ChevronRight size={15} /></article>)}</div>
      </section>}

      {(canChangeRole || canManage) && <section className="detail-section detail-actions-section">
        <h3>Administración</h3>
        {canChangeRole && person.id !== profile.id && <label>Rol<select value={person.role} onChange={(event) => onRole(event.target.value)}>{ROLE_OPTIONS.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select></label>}
        {canManage && person.is_active !== false && <button className="secondary-button" disabled={working} onClick={onReset}><KeyRound size={16} /> Restablecer contraseña</button>}
        {canManage && <button className={person.is_active === false ? 'primary-button' : 'danger-button'} disabled={working} onClick={onToggle}>{working && <Loader2 className="spin" size={16} />}{person.is_active === false ? 'Reactivar usuario' : 'Desactivar usuario'}</button>}
      </section>}
    </aside>
  </div>
}
