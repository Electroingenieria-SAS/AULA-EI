const WEIGHTS = { overdue: 5, expired: 5, expiring: 3, not_assigned: 2, in_progress: 1, assigned: 1 }

/**
 * Admin-only UI projection of rows already authorized by
 * admin_training_compliance_rows. No cross-user client RPC or extra query.
 */
export function prioritizedComplianceFollowups(rows, limit = 8) {
  const people = new Map()
  for (const row of Array.isArray(rows) ? rows : []) {
    const weight = WEIGHTS[String(row?.compliance_state || '')] || 0
    const identity = String(row?.user_id || row?.email || '').trim()
    if (!weight || !identity) continue
    const current = people.get(identity) || {
      id: identity, name: String(row.full_name || row.email || 'Colaborador'),
      email: String(row.email || ''), position: String(row.position_name || 'Cargo sin registrar'),
      critical: 0, soon: 0, pending: 0, score: 0, cases: [],
    }
    const state = String(row.compliance_state)
    if (state === 'overdue' || state === 'expired') current.critical += 1
    else if (state === 'expiring') current.soon += 1
    else current.pending += 1
    current.score += weight
    current.cases.push({ course: String(row.course_title || 'Capacitación'),
      path: String(row.path_name || ''), state })
    people.set(identity, current)
  }
  return [...people.values()].sort((a, b) => b.critical - a.critical ||
    b.soon - a.soon || b.score - a.score || a.name.localeCompare(b.name, 'es'))
    .slice(0, Math.max(0, Math.min(20, Number(limit) || 0)))
}
