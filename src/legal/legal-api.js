import { supabase } from '../supabase.js'

const LEGAL_RECEIPT_PREFIX = 'aula-ei-legal-receipt:v1:'

export function normalizeLegalRequirement(row = {}) {
  return {
    documentId: row.document_id || null,
    versionId: row.document_version_id || null,
    code: String(row.document_code || ''),
    title: String(row.title || ''),
    category: String(row.category || ''),
    version: String(row.version || ''),
    content: String(row.content_markdown || ''),
    sha256: String(row.content_sha256 || ''),
    isMaterial: Boolean(row.is_material),
    effectiveAt: row.effective_at || null,
    accepted: Boolean(row.accepted),
    acceptedAt: row.accepted_at || null,
    needsAcceptance: Boolean(row.needs_acceptance),
    userType: String(row.user_type || 'employee'),
  }
}

export function pendingLegalRequirements(rows = []) {
  return rows.map(normalizeLegalRequirement).filter((item) => item.needsAcceptance)
}

export async function loadLegalRequirements() {
  const { data, error } = await supabase.rpc('get_my_legal_requirements')
  if (error) throw error
  return (data || []).map(normalizeLegalRequirement)
}

export async function loadLegalAcceptances() {
  const { data, error } = await supabase.rpc('get_my_legal_acceptances')
  if (error) throw error
  return data || []
}

export async function acceptLegalDocument(versionId) {
  if (!versionId) throw new Error('No se pudo identificar la versión legal a aceptar.')
  const release = String(import.meta.env.VITE_RELEASE_SHA || 'local').slice(0, 128)
  const { data, error } = await supabase.rpc('accept_legal_document', {
    p_document_version_id: versionId,
    p_application_version: release,
  })
  if (error) throw error
  return Array.isArray(data) ? data[0] || null : data || null
}

export async function acceptLegalDocuments(requirements = []) {
  const accepted = []
  for (const requirement of requirements) {
    const receipt = await acceptLegalDocument(requirement.versionId)
    accepted.push({ requirement, receipt })
  }
  return accepted
}

export function saveLocalLegalReceipt(userId, accepted = []) {
  if (!userId || typeof window === 'undefined' || !window.localStorage) return
  const documents = accepted.map(({ requirement, receipt }) => ({
    documentCode: requirement.code,
    documentVersion: requirement.version,
    versionId: requirement.versionId,
    sha256: requirement.sha256,
    acceptedAt: receipt?.accepted_at || new Date().toISOString(),
  }))
  const payload = {
    userId,
    recordedAt: new Date().toISOString(),
    documents,
  }
  try {
    window.localStorage.setItem(LEGAL_RECEIPT_PREFIX + userId, JSON.stringify(payload))
  } catch {
    // El recibo local es solo una copia de conveniencia. Supabase es la evidencia autoritativa.
  }
}

export function loadLocalLegalReceipt(userId) {
  if (!userId || typeof window === 'undefined' || !window.localStorage) return null
  try {
    const raw = window.localStorage.getItem(LEGAL_RECEIPT_PREFIX + userId)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export async function createPrivacyRequest(type, description) {
  const { data, error } = await supabase.rpc('create_my_privacy_request', {
    p_request_type: type,
    p_description: description,
  })
  if (error) throw error
  return Array.isArray(data) ? data[0] || null : data || null
}

export async function loadPrivacyRequests() {
  const { data, error } = await supabase.rpc('get_my_privacy_requests')
  if (error) throw error
  return data || []
}
