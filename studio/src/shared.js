import { signedAsset as cachedSignedAsset, supabase } from './supabase.js'

export const ROLE_LABELS = {
  colaborador: 'Colaborador',
  creador_contenido: 'Creador de contenido',
  revisor: 'Revisor',
  admin: 'Administrador',
  super_admin: 'Super Admin',
}
export const ROLE_RANK = { colaborador: 10, creador_contenido: 20, revisor: 30, admin: 40, super_admin: 50 }
export const ADMIN_ROLES = new Set(['admin', 'super_admin'])
export const STAFF_ROLES = new Set(['creador_contenido', 'revisor', 'admin', 'super_admin'])
export const ASSIGNMENT_STATUS = {
  none: ['Sin asignar', 'neutral'], assigned: ['Asignada', 'blue'], in_progress: ['En progreso', 'yellow'],
  completed: ['Completada', 'green'], expired: ['Vencida', 'red'], cancelled: ['Cancelada', 'red'],
}
export const cx = (...parts) => parts.filter(Boolean).join(' ')
export function dateLabel(value) {
  if (!value) return 'Sin vencimiento'
  try { return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) } catch { return String(value) }
}
export function slugify(value) { return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }
export function getError(error, fallback = 'No fue posible completar la operación.') { return error instanceof Error ? error.message : typeof error === 'string' ? error : fallback }
export function chunks(items, size = 250) { const result=[]; for(let i=0;i<items.length;i+=size) result.push(items.slice(i,i+size)); return result }
export async function fetchAllPages(buildQuery, pageSize = 1000) { const result=[]; for(let from=0;;from+=pageSize){ const {data,error}=await buildQuery(from,from+pageSize-1); if(error) throw error; const page=data??[]; result.push(...page); if(page.length<pageSize) break } return result }
export function cleanFileName(value) { return value.toLowerCase().replace(/[^a-z0-9._-]+/g, '-') }
export async function uploadCourseAsset(courseId,file){ const path=`${courseId}/${crypto.randomUUID()}-${cleanFileName(file.name)}`; const {error}=await supabase.storage.from('course-assets').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||undefined}); if(error) throw error; return path }
export async function signedAsset(path,ttl=3600){ return cachedSignedAsset(path,ttl) }=await supabase.storage.from('course-assets').createSignedUrl(path,ttl); if(error) throw error; return data.signedUrl }
export { supabase }
