import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.107.0";

type AppRole =
  | "colaborador"
  | "creador_contenido"
  | "revisor"
  | "admin"
  | "super_admin";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function generateTemporaryPassword() {
  return `${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}Aa1$`;
}

function passwordError(password: string) {
  if (password.length < 10 || password.length > 128) {
    return "La contraseña debe tener entre 10 y 128 caracteres.";
  }
  if (/\s/.test(password)) return "La contraseña no debe contener espacios.";
  if (!/[a-z]/.test(password)) return "La contraseña debe incluir una minúscula.";
  if (!/[A-Z]/.test(password)) return "La contraseña debe incluir una mayúscula.";
  if (!/[0-9]/.test(password)) return "La contraseña debe incluir un número.";
  if (!/[^A-Za-z0-9]/.test(password)) return "La contraseña debe incluir un símbolo.";
  return null;
}

function normalizeRole(rawRole: string): AppRole | null {
  const role = String(rawRole || "colaborador").trim().toLowerCase();
  const roleMap: Record<string, AppRole> = {
    visitor: "colaborador",
    visitante: "colaborador",
    worker: "colaborador",
    trabajador: "colaborador",
    learner: "colaborador",
    estudiante: "colaborador",
    usuario: "colaborador",
    colaborador: "colaborador",
    content_creator: "creador_contenido",
    creador: "creador_contenido",
    creador_contenido: "creador_contenido",
    "creador de contenido": "creador_contenido",
    "creador-contenido": "creador_contenido",
    reviewer: "revisor",
    revisor: "revisor",
    admin: "admin",
    administrador: "admin",
    super_admin: "super_admin",
    superadmin: "super_admin",
    "super admin": "super_admin",
    "super-administrador": "super_admin",
    "super administrador": "super_admin",
  };
  return roleMap[role] || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Método no permitido. Usa POST." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ ok: false, error: "Faltan variables seguras del servidor." }, 500);
    }

    const token = (req.headers.get("Authorization") || "")
      .replace(/^Bearer\s+/i, "")
      .trim();
    if (!token) return jsonResponse({ ok: false, error: "Sesión requerida." }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: authUserData, error: authUserError } = await adminClient.auth.getUser(token);
    if (authUserError || !authUserData?.user) {
      return jsonResponse({ ok: false, error: "No se pudo validar la sesión actual." }, 401);
    }

    const callerId = authUserData.user.id;
    const { data: callerProfile, error: callerProfileError } = await adminClient
      .from("profiles")
      .select("id,email,full_name,role,is_active")
      .eq("id", callerId)
      .single();

    if (callerProfileError || !callerProfile || callerProfile.is_active !== true) {
      return jsonResponse({ ok: false, error: "La cuenta administradora no está activa en Aula EI." }, 403);
    }

    const callerRole = normalizeRole(String(callerProfile.role || ""));
    if (!callerRole || !["admin", "super_admin"].includes(callerRole)) {
      return jsonResponse({ ok: false, error: "Solo Admin o Super Admin pueden crear usuarios." }, 403);
    }

    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const fullName = String(body.full_name || body.fullName || "").trim();
    const passwordFromBody = String(body.password || "").trim();
    const role = normalizeRole(String(body.role || "colaborador"));

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ ok: false, error: "Correo inválido." }, 400);
    }
    if (fullName.length < 3 || fullName.length > 160) {
      return jsonResponse({ ok: false, error: "El nombre completo debe tener entre 3 y 160 caracteres." }, 400);
    }
    if (!role) {
      return jsonResponse({ ok: false, error: "Rol inválido para Aula EI." }, 400);
    }
    if (callerRole === "admin" && ["admin", "super_admin"].includes(role)) {
      return jsonResponse({ ok: false, error: "Un Admin no puede crear usuarios Admin ni Super Admin." }, 403);
    }
    if (callerRole !== "super_admin" && role === "super_admin") {
      return jsonResponse({ ok: false, error: "Solo un Super Admin puede crear otro Super Admin." }, 403);
    }

    const finalPassword = passwordFromBody || generateTemporaryPassword();
    const invalidPassword = passwordError(finalPassword);
    if (invalidPassword) return jsonResponse({ ok: false, error: invalidPassword }, 400);

    const { data: createdUserData, error: createUserError } = await adminClient.auth.admin.createUser({
      email,
      password: finalPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        created_by: callerId,
        managed_role: role,
        must_change_password: true,
      },
      app_metadata: {
        aula_ei_role: role,
        aula_ei_active: true,
        aula_ei_must_change_password: true,
      },
    });

    if (createUserError || !createdUserData?.user) {
      return jsonResponse({
        ok: false,
        error: createUserError?.message || "No fue posible crear el usuario en Authentication.",
      }, 400);
    }

    const newUserId = createdUserData.user.id;
    const { error: profileError } = await adminClient.from("profiles").upsert({
      id: newUserId,
      email,
      full_name: fullName,
      role,
      is_active: true,
      deactivated_at: null,
      deactivated_by: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

    if (profileError) {
      const { error: rollbackError } = await adminClient.auth.admin.deleteUser(newUserId, false);
      return jsonResponse({
        ok: false,
        error: "Falló la creación del perfil: " + profileError.message +
          (rollbackError
            ? " Además, no fue posible revertir Authentication: " + rollbackError.message
            : " La cuenta de Authentication fue revertida."),
      }, 500);
    }

    await adminClient.from("audit_logs").insert({
      actor_id: callerId,
      action: "create_managed_user",
      entity_type: "profile",
      entity_id: newUserId,
      metadata: {
        email,
        full_name: fullName,
        role,
        password_change_required: true,
        created_by_email: callerProfile.email,
      },
    });

    return jsonResponse({
      ok: true,
      message: "Usuario creado correctamente. Deberá cambiar la contraseña en el primer acceso.",
      temporary_password: finalPassword,
      user: { id: newUserId, email, full_name: fullName, role },
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: error instanceof Error ? error.message : "Error inesperado creando usuario.",
    }, 500);
  }
});
