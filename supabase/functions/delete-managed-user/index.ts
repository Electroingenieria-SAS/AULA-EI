import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.107.0";

type AppRole = "colaborador" | "creador_contenido" | "revisor" | "admin" | "super_admin";
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
function decodeJwtClaims(token: string): Record<string, unknown> {
  try {
    const part = token.split(".")[1] || "";
    const normalized = part.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
    return JSON.parse(atob(normalized));
  } catch {
    return {};
  }
}
async function pwnedPasswordCount(password: string) {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(password));
  const hash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch("https://api.pwnedpasswords.com/range/" + prefix, {
      headers: { "Add-Padding": "true", "User-Agent": "Aula-EI-Password-Security" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("HIBP_UNAVAILABLE");
    const body = await response.text();
    const row = body.split("\n").find((line) => line.toUpperCase().startsWith(suffix + ":"));
    return row ? Number(row.split(":")[1]?.trim() || "1") : 0;
  } finally {
    clearTimeout(timer);
  }
}
async function validateLiveAdminSession(admin: ReturnType<typeof createClient>, callerId: string, token: string) {
  const claims = decodeJwtClaims(token);
  const sessionId = String(claims.session_id || "").trim();
  if (claims.aal !== "aal2" || !sessionId) return false;
  const { data, error } = await admin.rpc("validate_aula_admin_session", {
    p_user_id: callerId,
    p_session_id: sessionId,
  });
  if (error) throw error;
  return data === true;
}

async function consumeRateLimit(admin: ReturnType<typeof createClient>, scope: string, actorId: string, limit: number, windowSeconds: number) {
  const { data, error } = await admin.rpc("consume_aula_security_rate_limit", {
    p_scope: scope,
    p_actor: actorId,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) throw error;
  return data === true;
}

function normalizeRole(raw: unknown): AppRole | null {
  const v = String(raw || "").trim().toLowerCase();
  const m: Record<string, AppRole> = {
    colaborador:"colaborador",learner:"colaborador",estudiante:"colaborador",usuario:"colaborador",
    creador_contenido:"creador_contenido",content_creator:"creador_contenido",creador:"creador_contenido",
    revisor:"revisor",reviewer:"revisor",admin:"admin",administrador:"admin",
    super_admin:"super_admin",superadmin:"super_admin","super admin":"super_admin",
  };
  return m[v] || null;
}
const rank: Record<AppRole, number> = { colaborador:10, creador_contenido:20, revisor:30, admin:40, super_admin:50 };


/**
 * Historical training and legal records are institutional evidence.
 * Only accounts with no dependent records may be permanently deleted.
 * The service-role client is server-side only; a caller cannot alter this list.
 */
const protectedReferences = [
  ["enrollments", "user_id", "matrículas"],
  ["enrollments", "assigned_by", "matrículas asignadas"],
  ["block_progress", "user_id", "avances de capacitación"],
  ["exam_attempts", "user_id", "evaluaciones"],
  ["certificates", "user_id", "certificados"],
  ["certificate_signatures", "participant_signed_by", "firmas de certificados"],
  ["certificate_signatures", "admin_signed_by", "firmas administrativas"],
  ["compliance_evidence", "user_id", "evidencias de cumplimiento"],
  ["legal_acceptances", "user_id", "aceptaciones legales"],
  ["legal_user_contexts", "user_id", "contextos legales"],
  ["legal_user_contexts", "updated_by", "contextos legales administrados"],
  ["privacy_requests", "requester_user_id", "solicitudes de privacidad"],
  ["privacy_requests", "resolved_by", "solicitudes de privacidad resueltas"],
  ["privacy_incidents", "created_by", "incidentes de privacidad"],
  ["audit_logs", "actor_id", "acciones de auditoría"],
  ["courses", "created_by", "capacitaciones creadas"],
  ["legal_documents", "created_by", "documentos legales creados"],
  ["legal_document_versions", "created_by", "versiones legales creadas"],
  ["legal_document_versions", "approved_by", "versiones legales aprobadas"],
  ["profile_position_history", "user_id", "historial de cargos"],
  ["profile_position_history", "assigned_by", "cargos asignados"],
  ["training_notifications", "user_id", "notificaciones formativas"],
  ["profiles", "supervisor_id", "personal a cargo"],
] as const;

async function protectedHistory(admin: ReturnType<typeof createClient>, userId: string) {
  // Deny deletion when any check fails. A partial check is not authorization.
  const results = await Promise.all(protectedReferences.map(async ([table, column, label]) => {
    const { count, error } = await admin.from(table).select(column, { count: "exact", head: true }).eq(column, userId);
    if (error || count === null) throw new Error("No se pudo verificar el historial de " + table + ". No se eliminó ninguna cuenta.");
    return { label, count: count || 0 };
  }));
  return results.filter(item => item.count > 0);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply({ ok:false, error:"Método no permitido." }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY");
    if (!url || !key) return reply({ ok:false, error:"Configuración segura incompleta." }, 500);
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return reply({ ok:false, error:"Sesión requerida." }, 401);
    const admin = createClient(url, key, { auth:{ autoRefreshToken:false, persistSession:false } });
    const { data: callerAuth, error: callerAuthError } = await admin.auth.getUser(token);
    const caller = callerAuth?.user;
    if (callerAuthError || !caller) return reply({ ok:false, error:"Sesión inválida." }, 401);

    const { data: callerProfile } = await admin.from("profiles").select("id,role,is_active").eq("id",caller.id).single();
    if (!callerProfile || callerProfile.is_active !== true) return reply({ ok:false, error:"Cuenta administradora no activa." }, 403);
    const callerRole = normalizeRole(callerProfile.role);
    const trustedCallerRole = normalizeRole(caller.app_metadata?.aula_ei_role);
    if (caller.app_metadata?.aula_ei_active !== true || !callerRole || trustedCallerRole !== callerRole) {
      return reply({ ok:false, error:"La membresía o el rol del administrador no están sincronizados en Aula EI." }, 403);
    }
    if (!["admin","super_admin"].includes(callerRole)) return reply({ ok:false, error:"Solo Admin o Super Admin pueden administrar accesos." }, 403);
    if (!await validateLiveAdminSession(admin, caller.id, token)) return reply({ ok:false, code:"MFA_REQUIRED", error:"Tu sesión administrativa no está activa o no tiene MFA verificado. Vuelve a autenticarte." }, 403);

    if (!await consumeRateLimit(admin, "manage_user_access", caller.id, 20, 600)) {
      await admin.from("audit_logs").insert({ actor_id:caller.id, action:"rate_limit_block", entity_type:"security", entity_id:caller.id, metadata:{ scope:"manage_user_access" } });
      return reply({ ok:false, code:"RATE_LIMITED", error:"Demasiadas operaciones administrativas. Intenta nuevamente más tarde." }, 429);
    }

    const body = await req.json();
    const targetId = String(body.user_id || "").trim();
    const action = body.action === undefined ? "toggle_access" : body.action;
    if (!["toggle_access", "preview_delete", "delete"].includes(action)) {
      return reply({ ok:false, error:"Operación administrativa no reconocida." }, 400);
    }
    const desiredActive = body.active === true;
    if (!targetId) return reply({ ok:false, error:"Falta user_id." }, 400);
    if (targetId === caller.id) return reply({ ok:false, error:"No puedes eliminar ni desactivar tu propia cuenta." }, 400);

    const { data: targetProfile, error: targetProfileError } = await admin.from("profiles").select("id,email,full_name,role,is_active").eq("id",targetId).single();
    if (targetProfileError || !targetProfile) return reply({ ok:false, error:"Usuario no encontrado." }, 404);
    const targetRole = normalizeRole(targetProfile.role);
    if (!targetRole) return reply({ ok:false, error:"El usuario objetivo tiene un rol inválido." }, 409);
    if (rank[callerRole] <= rank[targetRole]) return reply({ ok:false, error:"Solo puedes administrar usuarios con un nivel inferior al tuyo." }, 403);

    const { data: targetAuthData, error: targetAuthError } = await admin.auth.admin.getUserById(targetId);
    const targetAuth = targetAuthData?.user;
    if (targetAuthError || !targetAuth) return reply({ ok:false, error:"Cuenta Auth no encontrada." }, 404);

    if (action === "preview_delete" || action === "delete") {
      const blockers = await protectedHistory(admin, targetId);
      if (action === "preview_delete") {
        return reply({
          ok: true,
          can_delete: blockers.length === 0,
          blockers,
          message: blockers.length
            ? "Este usuario tiene registros institucionales. Desactiva la cuenta para conservarlos."
            : "Esta cuenta puede eliminarse definitivamente. La operación no se puede deshacer.",
        });
      }
      if (blockers.length > 0) {
        return reply({
          ok:false, code:"PROTECTED_HISTORY", blockers,
          error:"No se puede eliminar esta cuenta porque tiene registros institucionales. Desactívala para conservar el historial.",
        }, 409);
      }
      const confirmationEmail = String(body.confirmation_email || "").trim().toLowerCase();
      const targetEmail = String(targetProfile.email || "").trim().toLowerCase();
      if (!targetEmail || confirmationEmail !== targetEmail || body.confirmation_text !== "ELIMINAR") {
        return reply({ ok:false, error:"Confirma el correo exacto y la palabra ELIMINAR." }, 400);
      }

      // Audit before an irreversible action. A failed audit blocks deletion.
      const { error: auditRequestError } = await admin.from("audit_logs").insert({
        actor_id:caller.id, action:"delete_managed_user_requested",
        entity_type:"profile", entity_id:targetId,
        metadata:{ target_role:targetRole, target_email:targetEmail, mfa_level:"aal2", checked_history:true },
      });
      if (auditRequestError) return reply({ ok:false, error:"No se pudo registrar la operación en auditoría." }, 500);

      const { error: deleteError } = await admin.auth.admin.deleteUser(targetId);
      if (deleteError) return reply({
        ok:false, error:"Supabase impidió la eliminación para proteger referencias existentes: " + deleteError.message,
      }, 409);

      const { error: auditCompleteError } = await admin.from("audit_logs").insert({
        actor_id:caller.id, action:"delete_managed_user",
        entity_type:"profile", entity_id:targetId,
        metadata:{ target_role:targetRole, target_email:targetEmail, mfa_level:"aal2", deleted_from_auth:true },
      });
      if (auditCompleteError) {
        return reply({ ok:true, deleted:true, audit_warning:true,
          message:"Cuenta eliminada, pero no se confirmó el registro final de auditoría. Notifica al equipo de sistemas." });
      }
      return reply({ ok:true, deleted:true, message:"Cuenta eliminada definitivamente de Aula EI." });
    }

    const { error: authUpdateError } = await admin.auth.admin.updateUserById(targetId, {
      ban_duration: desiredActive ? "none" : "876000h",
      app_metadata: { ...targetAuth.app_metadata, aula_ei_role:targetRole, aula_ei_active:desiredActive },
    });
    if (authUpdateError) return reply({ ok:false, error:authUpdateError.message }, 400);

    const now = new Date().toISOString();
    const { error: profileUpdateError } = await admin.from("profiles").update({
      is_active:desiredActive,
      deactivated_at:desiredActive ? null : now,
      deactivated_by:desiredActive ? null : caller.id,
      updated_at:now,
    }).eq("id",targetId);
    if (profileUpdateError) {
      await admin.auth.admin.updateUserById(targetId, {
        ban_duration: desiredActive ? "876000h" : "none",
        app_metadata:{ ...targetAuth.app_metadata },
      });
      return reply({ ok:false, error:"No fue posible actualizar el perfil: " + profileUpdateError.message }, 500);
    }

    await admin.from("audit_logs").insert({
      actor_id:caller.id,
      action:desiredActive ? "reactivate_managed_user" : "deactivate_managed_user",
      entity_type:"profile",
      entity_id:targetId,
      metadata:{ target_email:targetProfile.email, target_role:targetRole, previous_active:targetProfile.is_active, new_active:desiredActive, mfa_level:"aal2" },
    });
    return reply({ ok:true, active:desiredActive, preserved_history:true, message:desiredActive ? "Usuario reactivado. Se conservó todo su historial." : "Usuario desactivado. Se conservaron matrículas, progreso y certificados." });
  } catch (error) {
    return reply({ ok:false, error:error instanceof Error ? error.message : "Error inesperado." }, 500);
  }
});