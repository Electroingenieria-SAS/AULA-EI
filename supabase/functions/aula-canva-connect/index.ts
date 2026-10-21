import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.107.0";

// Hosted OAuth endpoint. Callback has no user JWT, but requires a one-time
// cryptographic state and PKCE. Every other action validates AULA EI identity.
const project = Deno.env.get("SUPABASE_URL") || "";
const srKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const publicKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const clientId = Deno.env.get("CANVA_CLIENT_ID") || "";
const clientSecret = Deno.env.get("CANVA_CLIENT_SECRET") || "";
const tokenKey = Deno.env.get("CANVA_TOKEN_KEY") || "";
const callbackUrl = project + "/functions/v1/aula-canva-connect";
const successUrl = "https://electroingenieria-sas.github.io/AULA-EI/#/studio";
const configured = Boolean(clientId && clientSecret && tokenKey);
const service = createClient(project, srKey, { auth: { persistSession: false, autoRefreshToken: false } });
const cors = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info", "Access-Control-Allow-Methods":"POST,OPTIONS", "Content-Type":"application/json;charset=utf-8", "Cache-Control":"no-store" };
const respond = (body: unknown, status=200) => new Response(JSON.stringify(body), { status, headers:cors });
const toB64Url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const rand = () => toB64Url(crypto.getRandomValues(new Uint8Array(48)));
const encrypt = async (plaintext: string) => {
  const raw = Uint8Array.from(atob(tokenKey), (c) => c.charCodeAt(0));
  if (raw.length !== 32) throw Error("CANVA_TOKEN_KEY debe ser una clave base64 de 32 bytes.");
  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv}, key, new TextEncoder().encode(plaintext)));
  return btoa(String.fromCharCode(...iv,...cipher));
};
async function exchangeToken(body: URLSearchParams) {
  const res = await fetch("https://api.canva.com/rest/v1/oauth/token", {
    method:"POST", headers:{ "Authorization":"Basic "+btoa(clientId+":"+clientSecret), "Content-Type":"application/x-www-form-urlencoded" }, body, signal:AbortSignal.timeout(18000),
  });
  if (!res.ok) throw Error("Canva no aceptó el intercambio de autorización.");
  const data=await res.json();
  if (!data.access_token || !data.refresh_token) throw Error("Canva no entregó credenciales renovables.");
  return data;
}
async function authorized(req: Request) {
  const bearer = (req.headers.get("authorization")||"").match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!bearer) return null;
  const scoped = createClient(project, publicKey, {
    global: { headers: {Authorization:"Bearer "+bearer} },
    auth: { persistSession:false, autoRefreshToken:false },
  });
  const {data, error} = await scoped.auth.getUser(bearer);
  if (error || !data.user?.id) return null;
  const {data:canManage,error:permError}=await scoped.rpc("can_manage_courses");
  return !permError && canManage===true ? data.user.id : null;
}
Deno.serve(async(req)=>{
  if(req.method==="OPTIONS") return new Response(null,{headers:cors});
  if(!project || !srKey || !publicKey) return respond({error:"Supabase sin configuración completa."},503);
  if(req.method==="GET") {
    const query = new URL(req.url).searchParams;
    const state=query.get("state")||"", code=query.get("code")||"";
    if(query.has("error")) return new Response("Canva rechazó la autorización. Puedes cerrar esta pestaña.",{status:400});
    if(!/^[A-Za-z0-9_-]{50,90}$/.test(state) || !code || !configured) return new Response("Autorización inválida o integración no configurada.",{status:400});
    const {data:states,error:consumeError} = await service.from("aula_canva_oauth_requests").delete()
      .eq("state",state).gt("expires_at",new Date().toISOString())
      .select("user_id,code_verifier");
    const attempt=states?.[0];
    if(consumeError||!attempt) return new Response("La autorización expiró o ya fue utilizada.",{status:400});
    try {
      const params = new URLSearchParams({grant_type:"authorization_code",code,code_verifier:attempt.code_verifier,redirect_uri:callbackUrl});
      const token=await exchangeToken(params);
      const {error:saveError}=await service.from("aula_canva_connections").upsert({
        user_id:attempt.user_id,
        access_cipher:await encrypt(token.access_token),
        refresh_cipher:await encrypt(token.refresh_token),
        expires_at:new Date(Date.now()+Math.max(300,Number(token.expires_in)||14400)*1000).toISOString(),
        updated_at:new Date().toISOString(),
      });
      if(saveError) throw Error("No se pudo guardar la conexión.");
      return Response.redirect(successUrl,302);
    }catch{return new Response("No fue posible completar la conexión con Canva. Repite la autorización desde AULA EI.",{status:502});}
  }
  if(req.method!=="POST") return respond({error:"Método no permitido"},405);
  const userId=await authorized(req);
  if(!userId) return respond({error:"Inicia sesión con permisos de gestión de capacitaciones."},403);
  let payload: {action?:string};
  try{payload=await req.json()}catch{return respond({error:"Solicitud inválida"},400)}
  const action=payload?.action;
  if(action==="status"){
    const {data,error}=await service.from("aula_canva_connections").select("user_id").eq("user_id",userId).maybeSingle();
    if(error) return respond({error:"No se pudo consultar la conexión."},503);
    return respond({configured,connected:Boolean(data),redirect_uri:callbackUrl});
  }
  if(action==="disconnect") {
    const {error}=await service.from("aula_canva_connections").delete().eq("user_id",userId);
    return error?respond({error:"No fue posible desvincular Canva."},503):respond({disconnected:true});
  }
  if(action!=="start") return respond({error:"Acción inválida."},400);
  if(!configured) return respond({error:"Conexión Canva pendiente de configurar por el administrador. Agrega CANVA_CLIENT_ID, CANVA_CLIENT_SECRET y CANVA_TOKEN_KEY en Supabase Secrets y registra el Redirect URI indicado.",redirect_uri:callbackUrl},503);
  const state=rand(), verifier=rand();
  const digest=new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(verifier)));
  const challenge=toB64Url(digest);
  const {error:saveError}=await service.from("aula_canva_oauth_requests").insert({
    state, user_id:userId, code_verifier:verifier, expires_at:new Date(Date.now()+10*60*1000).toISOString(),
  });
  if(saveError) return respond({error:"No fue posible iniciar autorización con Canva."},503);
  const url=new URL("https://www.canva.com/api/oauth/authorize");
  for(const [k,v] of Object.entries({
    client_id:clientId, response_type:"code", scope:"design:content:read design:meta:read",
    code_challenge:challenge,code_challenge_method:"S256",state,redirect_uri:callbackUrl,
  }))url.searchParams.set(k,v);
  return respond({authorization_url:url.href,redirect_uri:callbackUrl});
});
