import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.107.0";

type AppRole = "colaborador" | "creador_contenido" | "revisor" | "admin" | "super_admin";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const ROLE_RANK: Record<AppRole, number> = {
  colaborador: 10,
  creador_contenido: 20,
  revisor: 30,
  admin: 40,
  super_admin: 50,
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

function normalizeRole(rawRole: unknown): AppRole | null {
  const role = String(rawRole || "").trim().toLowerCase();
  const map: Record<string, AppRole> = {
    visitor: "colaborador", visitante: "colaborador", worker: "colaborador", trabajador: "colaborador",
    learner: "colaborador", estudiante: "colaborador", usuario: "colaborador", colaborador: "colaborador",
    content_creator: "creador_contenido", creador: "creador_contenido", creador_contenido: "creador_contenido",
    "creador de contenido": "creador_contenido", "creador-contenido": "creador_contenido",
    reviewer: "revisor", revisor: "revisor", admin: "admin", administrador: "admin",
    super_admin: "super_admin", superadmin: "super_admin", "super admin": "super_admin",
    "super-administrador": "super_admin", "super administrador": "super_admin",
  };
  return map[role] || null;
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

function generateTemporaryPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  const random = Array.from(bytes).map((value) => value.toString(16).padStart(2, "0")).join("");
  return random.slice(0, 20) + "Aa1$";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers });
  if (req.method !== "POST") return reply({ ok: false, code: "METHOD_NOT_ALLOWED", error: "Método no permitido." }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return reply({ ok: false, code: "SERVER_CONFIG", error: "Configuración segura del servidor incompleta." }, 500);

    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return reply({ ok: false, code: "SESSION_REQUIRED", error: "Tu sesión no está disponible. Cierra sesión e ingresa nuevamente." }, 401);

    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    const caller = authData?.user;
    if (authError || !caller) return reply({ ok: false, code: "SESSION_INVALID", error: "Tu sesión venció o no pudo validarse." }, 401);

    const { data: callerProfile, error: callerProfileError } = await admin
      .from("profiles")
      .select("id,email,full_name,role,is_active")
      .eq("id", caller.id)
      .single();

    if (callerProfileError || !callerProfile || callerProfile.is_active !== true) {
      return reply({ ok: false, code: "ADMIN_INACTIVE", error: "Tu cuenta administradora no está activa en Aula EI." }, 403);
    }

    const callerRole = normalizeRole(callerProfile.role);
    const trustedCallerRole = normalizeRole(caller.app_metadata?.aula_ei_role);
    if (
      caller.app_metadata?.aula_ei_active !== true ||
      !callerRole ||
      trustedCallerRole !== callerRole ||
      !["admin", "super_admin"].includes(callerRole)
    ) {
      return reply({ ok: false, code: "FORBIDDEN", error: "Tu sesión no tiene permisos administrativos confiables en Aula EI." }, 403);
    }

    if (!await validateLiveAdminSession(admin, caller.id, token)) {
      return reply({ ok: false, code: "MFA_REQUIRED", error: "Tu sesión administrativa no está activa o no tiene MFA verificado. Vuelve a autenticarte." }, 403);
    }

    if (!await consumeRateLimit(admin, "reset_managed_user_password", caller.id, 8, 900)) {
      await admin.from("audit_logs").insert({
        actor_id: caller.id,
        action: "rate_limit_block",
        entity_type: "security",
        entity_id: caller.id,
        metadata: { scope: "reset_managed_user_password" },
      });
      return reply({ ok: false, code: "RATE_LIMITED", error: "Demasiados restablecimientos de contraseña. Intenta nuevamente más tarde." }, 429);
    }

    const body = await req.json();
    const targetId = String(body.user_id || "").trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetId)) {
      return reply({ ok: false, code: "INVALID_USER", error: "El usuario seleccionado no es válido." }, 400);
    }
    if (targetId === caller.id) {
      return reply({ ok: false, code: "SELF_RESET_FORBIDDEN", error: "No puedes restablecer tu propia contraseña desde este módulo." }, 403);
    }

    const { data: targetProfile, error: targetProfileError } = await admin
      .from("profiles")
      .select("id,email,full_name,role,is_active")
      .eq("id", targetId)
      .single();

    if (targetProfileError || !targetProfile) {
      return reply({ ok: false, code: "USER_NOT_FOUND", error: "No encontramos ese usuario en Aula EI." }, 404);
    }
    if (targetProfile.is_active !== true) {
      return reply({ ok: false, code: "USER_INACTIVE", error: "Reactiva primero la cuenta antes de restablecer su contraseña." }, 409);
    }

    const targetRole = normalizeRole(targetProfile.role);
    if (!targetRole || ROLE_RANK[callerRole] <= ROLE_RANK[targetRole]) {
      return reply({ ok: false, code: "ROLE_FORBIDDEN", error: "Solo puedes restablecer contraseñas de usuarios con un nivel inferior al tuyo." }, 403);
    }

    const { data: targetAuthData, error: targetAuthError } = await admin.auth.admin.getUserById(targetId);
    const targetUser = targetAuthData?.user;
    if (targetAuthError || !targetUser) {
      return reply({ ok: false, code: "AUTH_USER_NOT_FOUND", error: "La cuenta no está disponible en Authentication." }, 404);
    }

    const trustedTargetRole = normalizeRole(targetUser.app_metadata?.aula_ei_role);
    if (targetUser.app_metadata?.aula_ei_active !== true || trustedTargetRole !== targetRole) {
      return reply({ ok: false, code: "TARGET_MEMBERSHIP_INVALID", error: "La cuenta tiene una membresía o rol desincronizado. Corrige esa inconsistencia antes de restablecer la contraseña." }, 409);
    }

    const temporaryPassword = generateTemporaryPassword();
    let breachCheck = "clean";
    try {
      const breached = await pwnedPasswordCount(temporaryPassword);
      if (breached > 0) {
        return reply({ ok: false, code: "PWNED_PASSWORD", error: "La contraseña temporal generada coincidió con una credencial filtrada. Repite la operación." }, 503);
      }
    } catch {
      breachCheck = "unavailable";
      if (["admin", "super_admin"].includes(targetRole)) {
        return reply({ ok: false, code: "PASSWORD_REPUTATION_UNAVAILABLE", error: "No pudimos verificar la reputación de la contraseña administrativa. Intenta nuevamente." }, 503);
      }
    }

    const resetAt = new Date().toISOString();
    const { error: updateError } = await admin.auth.admin.updateUserById(targetId, {
      password: temporaryPassword,
      app_metadata: {
        ...targetUser.app_metadata,
        aula_ei_active: true,
        aula_ei_role: targetRole,
        aula_ei_must_change_password: true,
        aula_ei_password_reset_at: resetAt,
      },
      user_metadata: {
        ...targetUser.user_metadata,
        must_change_password: true,
      },
    });

    if (updateError) {
      return reply({ ok: false, code: "AUTH_UPDATE_FAILED", error: updateError.message }, 400);
    }

    await admin.from("audit_logs").insert({
      actor_id: caller.id,
      action: "reset_managed_user_password",
      entity_type: "profile",
      entity_id: targetId,
      metadata: {
        target_email: targetProfile.email,
        target_role: targetRole,
        forced_change: true,
        reset_at: resetAt,
        password_reputation: breachCheck,
        mfa_level: "aal2",
      },
    });

    return reply({
      ok: true,
      message: "Contraseña temporal generada. El usuario deberá cambiarla al iniciar sesión.",
      temporary_password: temporaryPassword,
      user: {
        id: targetId,
        email: targetProfile.email,
        full_name: targetProfile.full_name,
        role: targetRole,
      },
    });
  } catch (error) {
    return reply({
      ok: false,
      code: "UNEXPECTED_ERROR",
      error: error instanceof Error ? error.message : "Error inesperado restableciendo la contraseña.",
    }, 500);
  }
});
