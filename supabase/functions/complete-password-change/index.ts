import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.107.0";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
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

function normalizeRole(value: unknown) {
  const v = String(value || "").trim().toLowerCase();
  return ({
    colaborador: "colaborador", learner: "colaborador", estudiante: "colaborador", usuario: "colaborador",
    creador_contenido: "creador_contenido", content_creator: "creador_contenido", creador: "creador_contenido",
    revisor: "revisor", reviewer: "revisor", admin: "admin", administrador: "admin",
    super_admin: "super_admin", superadmin: "super_admin", "super admin": "super_admin",
  } as Record<string,string>)[v] || null;
}
function validate(value: string, email: string) {
  if (value.length < 12 || value.length > 128) return "La contraseña debe tener entre 12 y 128 caracteres.";
  if (/\s/.test(value) || !/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/[0-9]/.test(value) || !/[^A-Za-z0-9]/.test(value)) {
    return "Usa mayúscula, minúscula, número y símbolo, sin espacios.";
  }
  const local = email.split("@")[0]?.toLowerCase() || "";
  if (local.length >= 4 && value.toLowerCase().includes(local)) return "La contraseña no debe contener tu usuario de correo.";
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply({ ok: false, error: "Método no permitido." }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY");
    if (!url || !key) return reply({ ok: false, error: "Configuración del servidor incompleta." }, 500);
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return reply({ ok: false, error: "Sesión requerida." }, 401);
    const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error } = await admin.auth.getUser(token);
    const user = data?.user;
    if (error || !user) return reply({ ok: false, error: "Sesión inválida o vencida." }, 401);

    const { data: profile } = await admin.from("profiles").select("id,email,role,is_active").eq("id", user.id).single();
    if (!profile || profile.is_active !== true) return reply({ ok: false, error: "Cuenta no activa en Aula EI." }, 403);
    const trustedRole = normalizeRole(user.app_metadata?.aula_ei_role);
    const profileRole = normalizeRole(profile.role);
    if (user.app_metadata?.aula_ei_active !== true || !trustedRole || trustedRole !== profileRole) {
      return reply({ ok: false, error: "Cuenta no habilitada o rol no sincronizado en Aula EI." }, 403);
    }

    if (!await consumeRateLimit(admin, "complete_password_change", user.id, 5, 900)) {
      await admin.from("audit_logs").insert({ actor_id:user.id, action:"rate_limit_block", entity_type:"security", entity_id:user.id, metadata:{ scope:"complete_password_change" } });
      return reply({ ok:false, code:"RATE_LIMITED", error:"Demasiados intentos de cambio de contraseña. Intenta nuevamente más tarde." }, 429);
    }

    const body = await req.json();
    const password = String(body.password || "");
    const reason = body.reason === "recovery" ? "recovery" : "required_change";
    const invalid = validate(password, String(profile.email || user.email || ""));
    if (invalid) return reply({ ok: false, error: invalid }, 400);

    let breachCheck = "clean";
    try {
      const breached = await pwnedPasswordCount(password);
      if (breached > 0) return reply({ ok:false, code:"PWNED_PASSWORD", error:"Esa contraseña aparece en filtraciones conocidas. Usa una contraseña diferente." }, 400);
    } catch {
      breachCheck = "unavailable";
      if (["admin","super_admin"].includes(profileRole)) {
        return reply({ ok:false, code:"PASSWORD_REPUTATION_UNAVAILABLE", error:"No pudimos verificar la reputación de tu contraseña administrativa. Intenta nuevamente." }, 503);
      }
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
      password,
      app_metadata: {
        ...user.app_metadata,
        aula_ei_active: true,
        aula_ei_must_change_password: false,
        aula_ei_password_changed_at: new Date().toISOString(),
      },
      user_metadata: { ...user.user_metadata, must_change_password: false },
    });
    if (updateError) return reply({ ok: false, error: updateError.message }, 400);

    await admin.from("audit_logs").insert({
      actor_id: user.id,
      action: reason === "recovery" ? "complete_password_recovery" : "complete_first_password_change",
      entity_type: "profile",
      entity_id: user.id,
      metadata: {
        completed_at: new Date().toISOString(),
        password_reputation: breachCheck,
        change_reason: reason,
      },
    });
    return reply({ ok: true, message: "Contraseña actualizada. Inicia sesión nuevamente.", force_relogin: true });
  } catch (error) {
    return reply({ ok: false, error: error instanceof Error ? error.message : "Error inesperado." }, 500);
  }
});