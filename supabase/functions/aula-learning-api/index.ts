import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.107.0";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !anonKey) return reply({ ok: false, error: "Configuración Supabase incompleta." }, 500);

    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\\s+/i, "").trim();
    if (!token) return reply({ ok: false, error: "Token de Aula EI requerido." }, 401);

    const client = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: "Bearer " + token } },
    });

    const { data: authData, error: authError } = await client.auth.getUser(token);
    if (authError || !authData?.user) return reply({ ok: false, error: "Token inválido o vencido." }, 401);

    const path = new URL(req.url).pathname.split("/aula-learning-api").pop() || "/";

    if (req.method === "GET" && (path === "/" || path === "/health" || path === "/v1/health")) {
      return reply({
        ok: true,
        service: "Aula EI Learning API",
        version: "1.0.0",
        capabilities: ["journey", "courses", "certificates", "notifications", "xapi-lite"],
      });
    }

    if (req.method === "GET" && path === "/v1/me/journey") {
      const { data, error } = await client.rpc("get_my_learning_360");
      if (error) return reply({ ok: false, error: error.message }, 400);
      return reply({ ok: true, data });
    }

    if (req.method === "GET" && path === "/v1/courses") {
      const { data, error } = await client
        .from("courses")
        .select("id,title,description,status,passing_score,updated_at")
        .order("title");
      if (error) return reply({ ok: false, error: error.message }, 400);
      return reply({ ok: true, data: data || [] });
    }

    if (req.method === "GET" && path === "/v1/certificates") {
      const { data, error } = await client.rpc("get_my_certificates");
      if (error) return reply({ ok: false, error: error.message }, 400);
      return reply({ ok: true, data: data || [] });
    }

    if (req.method === "GET" && path === "/v1/notifications") {
      const { data, error } = await client
        .from("learning_notifications")
        .select("id,category,title,body,action_url,severity,read_at,created_at,metadata")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) return reply({ ok: false, error: error.message }, 400);
      return reply({ ok: true, data: data || [] });
    }

    if (req.method === "POST" && path === "/v1/xapi/statements") {
      const body = await req.json().catch(() => ({}));
      const payload = {
        p_course_id: body.course_id || null,
        p_event_type: body.event_type || "external_event",
        p_verb: body.verb || "experienced",
        p_object_type: body.object_type || "activity",
        p_object_id: body.object_id || "",
        p_data: body.data || {},
      };
      const { data, error } = await client.rpc("record_external_learning_event", payload);
      if (error) return reply({ ok: false, error: error.message }, 400);
      return reply({ ok: true, data }, 201);
    }

    return reply({ ok: false, error: "Ruta no encontrada." }, 404);
  } catch (error) {
    return reply({ ok: false, error: error instanceof Error ? error.message : "Error inesperado." }, 500);
  }
});
