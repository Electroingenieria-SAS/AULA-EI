import { supabase } from '../supabase.js'

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
