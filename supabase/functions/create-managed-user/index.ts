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
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

function generateTemporaryPassword() {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 12) + "Aa1$";
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
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        ok: false,
        error: "Método no permitido. Usa POST.",
      },
      405
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      Deno.env.get("SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        {
          ok: false,
          error:
            "Faltan variables de entorno. Verifica SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.",
        },
        500
      );
    }

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return jsonResponse(
        {
          ok: false,
          error: "Sesión requerida. Inicia sesión primero.",
        },
        401
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return jsonResponse(
        {
          ok: false,
          error: "La sesión no contiene un token válido.",
        },
        401
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: authUserData, error: authUserError } =
      await adminClient.auth.getUser(token);

    if (authUserError || !authUserData?.user) {
      return jsonResponse(
        {
          ok: false,
          error: "No se pudo validar la sesión del usuario actual.",
        },
        401
      );
    }

    const callerId = authUserData.user.id;

    const { data: callerProfile, error: callerProfileError } =
      await adminClient
        .from("profiles")
        .select("id, email, full_name, role")
        .eq("id", callerId)
        .single();

    if (callerProfileError || !callerProfile) {
      return jsonResponse(
        {
          ok: false,
          error:
            "No se encontró el perfil del usuario actual. Verifica la tabla profiles.",
        },
        403
      );
    }

    const callerRole = normalizeRole(String(callerProfile.role || ""));

    if (!callerRole || !["admin", "super_admin"].includes(callerRole)) {
      return jsonResponse(
        {
          ok: false,
          error:
            "Acceso denegado. Solo Admin o Super Admin pueden crear usuarios.",
        },
        403
      );
    }

    const body = await req.json();

    const email = String(body.email || "").trim().toLowerCase();
    const fullName = String(body.full_name || body.fullName || "").trim();
    const passwordFromBody = String(body.password || "").trim();
    const role = normalizeRole(String(body.role || "colaborador"));

    if (!email || !email.includes("@")) {
      return jsonResponse(
        {
          ok: false,
          error: "Correo inválido.",
        },
        400
      );
    }

    if (!fullName) {
      return jsonResponse(
        {
          ok: false,
          error: "El nombre completo es obligatorio.",
        },
        400
      );
    }

    if (!role) {
      return jsonResponse(
        {
          ok: false,
          error:
            "Rol inválido para Aula EI. Usa colaborador, creador_contenido, revisor, admin o super_admin.",
        },
        400
      );
    }

    if (
      callerRole === "admin" &&
      ["admin", "super_admin"].includes(role)
    ) {
      return jsonResponse(
        {
          ok: false,
          error: "Un Admin no puede crear usuarios Admin ni Super Admin.",
        },
        403
      );
    }

    if (callerRole !== "super_admin" && role === "super_admin") {
      return jsonResponse(
        {
          ok: false,
          error: "Solo un Super Admin puede crear otro Super Admin.",
        },
        403
      );
    }

    const finalPassword = passwordFromBody || generateTemporaryPassword();

    if (finalPassword.length < 8) {
      return jsonResponse(
        {
          ok: false,
          error: "La contraseña debe tener mínimo 8 caracteres.",
        },
        400
      );
    }

    const { data: createdUserData, error: createUserError } =
      await adminClient.auth.admin.createUser({
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
        },
      });

    if (createUserError || !createdUserData?.user) {
      return jsonResponse(
        {
          ok: false,
          error:
            createUserError?.message ||
            "No fue posible crear el usuario en Authentication.",
        },
        400
      );
    }

    const newUserId = createdUserData.user.id;

    const { error: profileError } = await adminClient.from("profiles").upsert(
      {
        id: newUserId,
        email,
        full_name: fullName,
        role,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "id",
      }
    );

    if (profileError) {
      const { error: rollbackError } =
        await adminClient.auth.admin.deleteUser(newUserId, false);

      return jsonResponse(
        {
          ok: false,
          error:
            "Falló la creación del perfil: " + profileError.message +
            (rollbackError
              ? " Además, no fue posible revertir la cuenta de Authentication: " +
                rollbackError.message
              : " La cuenta de Authentication fue revertida para evitar un usuario inconsistente."),
        },
        500
      );
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
        created_by_email: callerProfile.email,
      },
    });

    return jsonResponse(
      {
        ok: true,
        message: "Usuario creado correctamente.",
        temporary_password: finalPassword,
        user: {
          id: newUserId,
          email,
          full_name: fullName,
          role,
        },
      },
      200
    );
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error inesperado creando usuario.",
      },
      500
    );
  }
});
