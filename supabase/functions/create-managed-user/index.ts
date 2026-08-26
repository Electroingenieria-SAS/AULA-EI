import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

type AppRole = "colaborador" | "creador_contenido" | "revisor" | "admin" | "super_admin";

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

function allowedOrigins() {
  const configured = (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",").map((v) => v.trim()).filter(Boolean);
  return new Set(configured.length ? configured : DEFAULT_ORIGINS);
}

function cors(req: Request) {
  const origin = req.headers.get("origin");
  const allowed = allowedOrigins();
  const headers: Record<string,string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin",
    "Cache-Control": "no-store",
  };
  if (origin && allowed.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return { headers, originAllowed: !origin || allowed.has(origin) };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors(req).headers });
}

function normalizeRole(raw: string): AppRole | null {
  const v=String(raw||"").trim().toLowerCase();
  const map: Record<string,AppRole> = {
    visitor:"colaborador", visitante:"colaborador", worker:"colaborador", trabajador:"colaborador",
    learner:"colaborador", estudiante:"colaborador", usuario:"colaborador", colaborador:"colaborador",
    content_creator:"creador_contenido", creador:"creador_contenido", creador_contenido:"creador_contenido",
    "creador de contenido":"creador_contenido", reviewer:"revisor", revisor:"revisor",
    admin:"admin", administrador:"admin", super_admin:"super_admin", superadmin:"super_admin", "super admin":"super_admin",
  };
  return map[v] || null;
}

function temporaryPassword() {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 16) + "Aa1$";
}

serve(async (req) => {
  const c = cors(req);
  if (req.method === "OPTIONS") return new Response(c.originAllowed ? "ok" : "forbidden", { status: c.originAllowed ? 204 : 403, headers: c.headers });
  if (!c.originAllowed) return json(req, { ok:false, error:"Origen no autorizado." }, 403);
  if (req.method !== "POST") return json(req, { ok:false, error:"Método no permitido." }, 405);

  try {
    const url=Deno.env.get("SUPABASE_URL");
    const service=getAdminKey();
    if (!url || !service) return json(req,{ok:false,error:"Configuración de servidor incompleta."},500);

    const authHeader=req.headers.get("Authorization") || "";
    const token=authHeader.replace(/^Bearer\s+/i,"").trim();
    if (!token) return json(req,{ok:false,error:"Sesión requerida."},401);

    const admin=createClient(url,service,{auth:{autoRefreshToken:false,persistSession:false}});
    const {data:ud,error:ue}=await admin.auth.getUser(token);
    if (ue || !ud.user) return json(req,{ok:false,error:"Sesión inválida."},401);

    const {data:caller,error:pe}=await admin.from("profiles").select("id,email,role").eq("id",ud.user.id).single();
    if (pe || !caller) return json(req,{ok:false,error:"Perfil no autorizado."},403);
    const callerRole=normalizeRole(caller.role);
    if (!callerRole || !["admin","super_admin"].includes(callerRole)) return json(req,{ok:false,error:"Acceso denegado."},403);

    const body=await req.json().catch(()=>({}));
    const email=String(body.email||"").trim().toLowerCase();
    const fullName=String(body.full_name||body.fullName||"").trim();
    const role=normalizeRole(String(body.role||"colaborador"));
    const supplied=String(body.password||"").trim();
    if (!email || !email.includes("@") || !fullName || !role) return json(req,{ok:false,error:"Datos de usuario inválidos."},400);
    if (callerRole === "admin" && ["admin","super_admin"].includes(role)) return json(req,{ok:false,error:"Un Admin no puede crear Admin ni Super Admin."},403);
    if (role === "super_admin" && callerRole !== "super_admin") return json(req,{ok:false,error:"Solo Super Admin puede crear Super Admin."},403);

    const password=supplied || temporaryPassword();
    if (password.length < 12) return json(req,{ok:false,error:"La contraseña temporal debe tener mínimo 12 caracteres."},400);

    const {data:created,error:ce}=await admin.auth.admin.createUser({
      email,password,email_confirm:true,
      user_metadata:{full_name:fullName,must_change_password:true},
      app_metadata:{aula_ei_role:role},
    });
    if (ce || !created.user) return json(req,{ok:false,error:ce?.message||"No fue posible crear el usuario."},400);

    const {error:profileError}=await admin.from("profiles").upsert({
      id:created.user.id,email,full_name:fullName,role,updated_at:new Date().toISOString()
    },{onConflict:"id"});
    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id,false).catch(()=>{});
      return json(req,{ok:false,error:"No fue posible sincronizar el perfil; la creación fue revertida."},500);
    }

    await admin.from("audit_logs").insert({actor_id:ud.user.id,action:"create_managed_user",entity_type:"profile",entity_id:created.user.id,metadata:{role}}).catch(()=>{});
    return json(req,{ok:true,message:"Usuario creado correctamente.",temporary_password:password,user:{id:created.user.id,email,full_name:fullName,role}},200);
  } catch (e) {
    return json(req,{ok:false,error:e instanceof Error?e.message:"Error inesperado."},500);
  }
});
