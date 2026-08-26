import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

type AppRole =
  | "colaborador"
  | "creador_contenido"
  | "revisor"
  | "admin"
  | "super_admin";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
};

const DEFAULT_ORIGINS = [
  "https://aulaei.electroingenieria.com",
  "https://aula-ei.vercel.app",
  "https://aula-ei-1z4d.vercel.app",
  "https://electroingenieria-sas.github.io",
];

function getAdminKey() {
  const newKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (newKeys) {
    try {
      const parsed = JSON.parse(newKeys);
      if (typeof parsed?.default === "string" && parsed.default) return parsed.default;
    } catch (_error) {
      // Fallback a la variable legacy si el JSON no es válido.
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY") || "";
}

function corsHeadersFor(req: Request) {
  const configured = (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const allowed = new Set(configured.length ? configured : DEFAULT_ORIGINS);
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
  if (origin && allowed.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return { headers, allowed: !origin || allowed.has(origin) };
}

const roleRank: Record<AppRole, number> = {
  colaborador: 10,
  creador_contenido: 20,
  revisor: 30,
  admin: 40,
  super_admin: 50,
};

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeadersFor(req).headers,
  });
}

function normalizeRole(rawRole: string): AppRole | null {
  const role = String(rawRole || "").trim().toLowerCase();

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
    reviewer: "revisor",
    revisor: "revisor",
    admin: "admin",
    administrador: "admin",
    super_admin: "super_admin",
    superadmin: "super_admin",
    "super admin": "super_admin",
  };

  return roleMap[role] || null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    const c = corsHeadersFor(req);
    return new Response(c.allowed ? "ok" : "forbidden", { status: c.allowed ? 204 : 403, headers: c.headers });
  }

  if (!corsHeadersFor(req).allowed) return jsonResponse(req, { ok: false, error: "Origen no autorizado." }, 403);

  if (req.method !== "POST") {
    return jsonResponse(req, 
      { ok: false, error: "Método no permitido. Usa POST." },
      405
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = getAdminKey();

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(req, 
        {
          ok: false,
          error:
            "Faltan variables de entorno para administrar usuarios de forma segura.",
        },
        500
      );
    }

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return jsonResponse(req, 
        { ok: false, error: "Sesión requerida. Inicia sesión primero." },
        401
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: authUserData, error: authUserError } =
      await adminClient.auth.getUser(token);

    if (authUserError || !authUserData?.user) {
      return jsonResponse(req, 
        { ok: false, error: "No se pudo validar la sesión actual." },
        401
      );
    }

    const callerId = authUserData.user.id;
    const body = await req.json();
    const targetUserId = String(body.user_id || body.userId || "").trim();

    if (!isUuid(targetUserId)) {
      return jsonResponse(req, 
        { ok: false, error: "El identificador del usuario no es válido." },
        400
      );
    }

    if (targetUserId === callerId) {
      return jsonResponse(req, 
        { ok: false, error: "No puedes eliminar tu propia cuenta." },
        403
      );
    }

    const [{ data: callerProfile, error: callerError }, { data: targetProfile, error: targetError }] =
      await Promise.all([
        adminClient
          .from("profiles")
          .select("id, email, full_name, role")
          .eq("id", callerId)
          .single<Profile>(),
        adminClient
          .from("profiles")
          .select("id, email, full_name, role")
          .eq("id", targetUserId)
          .single<Profile>(),
      ]);

    if (callerError || !callerProfile) {
      return jsonResponse(req, 
        { ok: false, error: "No se encontró el perfil del usuario actual." },
        403
      );
    }

    if (targetError || !targetProfile) {
      return jsonResponse(req, 
        { ok: false, error: "El usuario que intentas eliminar no existe." },
        404
      );
    }

    const callerRole = normalizeRole(callerProfile.role);
    const targetRole = normalizeRole(targetProfile.role);

    if (!callerRole || !["admin", "super_admin"].includes(callerRole)) {
      return jsonResponse(req, 
        {
          ok: false,
          error:
            "Acceso denegado. Solo Administradores o Super Administradores pueden eliminar usuarios.",
        },
        403
      );
    }

    if (!targetRole) {
      return jsonResponse(req, 
        { ok: false, error: "El usuario tiene un rol que no se puede administrar." },
        409
      );
    }

    if (roleRank[callerRole] <= roleRank[targetRole]) {
      return jsonResponse(req, 
        {
          ok: false,
          error: "Solo puedes eliminar usuarios con un nivel inferior al tuyo.",
        },
        403
      );
    }

    const deleteAuthUser = () =>
      adminClient.auth.admin.deleteUser(targetUserId, false);

    let { error: deleteError } = await deleteAuthUser();

    if (deleteError) {
      const [coursesResult, assignmentsResult, auditResult] = await Promise.all([
        adminClient.from("courses").select("id").eq("created_by", targetUserId),
        adminClient
          .from("enrollments")
          .select("id")
          .eq("assigned_by", targetUserId),
        adminClient.from("audit_logs").select("id").eq("actor_id", targetUserId),
      ]);

      const courses = coursesResult.data || [];
      const assignments = assignmentsResult.data || [];
      const auditLogs = auditResult.data || [];
      const hasKnownReferences =
        courses.length > 0 || assignments.length > 0 || auditLogs.length > 0;

      if (!hasKnownReferences) {
        return jsonResponse(req, 
          {
            ok: false,
            error:
              deleteError.message ||
              "No fue posible eliminar el usuario. Revisa si posee archivos en Storage.",
          },
          409
        );
      }

      const updates = await Promise.all([
        courses.length
          ? adminClient
              .from("courses")
              .update({ created_by: callerId })
              .in(
                "id",
                courses.map((item) => item.id)
              )
          : Promise.resolve({ error: null }),
        assignments.length
          ? adminClient
              .from("enrollments")
              .update({ assigned_by: callerId })
              .in(
                "id",
                assignments.map((item) => item.id)
              )
          : Promise.resolve({ error: null }),
        auditLogs.length
          ? adminClient
              .from("audit_logs")
              .update({ actor_id: null })
              .in(
                "id",
                auditLogs.map((item) => item.id)
              )
          : Promise.resolve({ error: null }),
      ]);

      const referenceError = updates.find((result) => result.error)?.error;

      if (referenceError) {
        return jsonResponse(req, 
          {
            ok: false,
            error:
              "No fue posible preservar las referencias históricas antes de eliminar el usuario: " +
              referenceError.message,
          },
          500
        );
      }

      ({ error: deleteError } = await deleteAuthUser());

      if (deleteError) {
        await Promise.all([
          courses.length
            ? adminClient
                .from("courses")
                .update({ created_by: targetUserId })
                .in(
                  "id",
                  courses.map((item) => item.id)
                )
            : Promise.resolve(),
          assignments.length
            ? adminClient
                .from("enrollments")
                .update({ assigned_by: targetUserId })
                .in(
                  "id",
                  assignments.map((item) => item.id)
                )
            : Promise.resolve(),
          auditLogs.length
            ? adminClient
                .from("audit_logs")
                .update({ actor_id: targetUserId })
                .in(
                  "id",
                  auditLogs.map((item) => item.id)
                )
            : Promise.resolve(),
        ]);

        return jsonResponse(req, 
          {
            ok: false,
            error:
              deleteError.message ||
              "No fue posible eliminar el usuario. Revisa si posee archivos en Storage.",
          },
          409
        );
      }
    }

    try {
      await adminClient.from("audit_logs").insert({
        actor_id: callerId,
        action: "delete_managed_user",
        entity_type: "profile",
        entity_id: targetUserId,
        metadata: {
          deleted_email: targetProfile.email,
          deleted_full_name: targetProfile.full_name,
          deleted_role: targetRole,
          deleted_by_email: callerProfile.email,
        },
      });
    } catch (_error) {
      // La auditoría no bloquea una eliminación ya completada.
    }

    return jsonResponse(req, {
      ok: true,
      message: "Usuario eliminado correctamente.",
      deleted_user_id: targetUserId,
    });
  } catch (error) {
    return jsonResponse(req, 
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error inesperado eliminando el usuario.",
      },
      500
    );
  }
});
