import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, '..');
const bundlePath = path.join(projectDirectory, 'assets', 'index-BZBNDslB.js');
const stylesPath = path.join(projectDirectory, 'assets', 'index-B-4jmJ6C.css');

const startMarker = 'function zx({profiles:n,onRefresh:a,setMessage:r}){';
const endMarker = 'function Mx(n){';
const patchedMarker = 'delete-managed-user';

const usersComponent = 'function zx({profiles:n,onRefresh:a,setMessage:r}){const{profile:l}=ln(),[o,c]=j.useState({full_name:"",email:"",password:"",role:"colaborador"}),[f,p]=j.useState(""),[m,g]=j.useState(!1),[b,y]=j.useState(null),v=l?.role==="super_admin"?["colaborador","creador_contenido","revisor","admin","super_admin"]:["colaborador","creador_contenido","revisor"],S={colaborador:10,creador_contenido:20,revisor:30,admin:40,super_admin:50},x=K=>!!(l&&K.id!==l.id&&["admin","super_admin"].includes(l.role)&&(S[l.role]??0)>(S[K.role]??0)),w=async(K,C)=>{const{error:I}=await re.rpc("set_user_role",{p_user_id:K,p_role:C});I?r(I.message):(r("Rol actualizado."),await a())},A=async K=>{K.preventDefault(),g(!0),p("");try{if(!o.email.trim())throw new Error("El correo es obligatorio.");if(!o.full_name.trim())throw new Error("El nombre completo es obligatorio.");const{data:C,error:I}=await re.functions.invoke("create-managed-user",{body:{email:o.email.trim(),password:o.password.trim()||void 0,full_name:o.full_name.trim(),role:o.role}});if(I)throw new Error(String(C?.error||I.message||"No fue posible crear el usuario."));if(C?.ok===!1)throw new Error(String(C?.error||"No fue posible crear el usuario."));p(String(C?.temporary_password??o.password.trim()??"")),r("Usuario creado: "+o.email.trim()),c({full_name:"",email:"",password:"",role:"colaborador"}),await a()}catch(C){r(C instanceof Error?C.message:"No fue posible crear el usuario.")}finally{g(!1)}},H=async K=>{if(!x(K)){r("Solo puedes eliminar usuarios con un nivel inferior al tuyo.");return}if(!window.confirm("¿Eliminar a "+(K.full_name||K.email||"este usuario")+"? Esta acción revoca su acceso y elimina sus registros asociados. No se puede deshacer."))return;y(K.id);try{const{data:C,error:I}=await re.functions.invoke("delete-managed-user",{body:{user_id:K.id}});if(I)throw new Error(String(C?.error||I.message||"No fue posible eliminar el usuario."));if(C?.ok===!1)throw new Error(String(C?.error||"No fue posible eliminar el usuario."));r("Usuario eliminado: "+(K.full_name||K.email||K.id)),await a()}catch(C){r(C instanceof Error?C.message:"No fue posible eliminar el usuario.")}finally{y(null)}};return d.jsxs("section",{className:"panel",children:[d.jsxs("div",{className:"panel-heading",children:[d.jsx(my,{}),d.jsxs("div",{children:[d.jsx("h2",{children:"Usuarios y roles"}),d.jsx("p",{children:"Administradores y Super Administradores solo pueden eliminar usuarios con un nivel inferior."})]})]}),d.jsxs("form",{className:"user-create-card",onSubmit:A,children:[d.jsxs("div",{className:"panel-heading compact-heading",children:[d.jsx(Vr,{}),d.jsxs("div",{children:[d.jsx("h3",{children:"Crear usuario"}),d.jsx("p",{children:"Usa la Edge Function existente create-managed-user y crea el perfil en Aula EI."})]})]}),d.jsxs("div",{className:"form-grid",children:[d.jsxs("label",{children:["Nombre completo",d.jsx("input",{value:o.full_name,onChange:K=>c({...o,full_name:K.target.value}),placeholder:"Ej. Juan Esteban Pérez",required:!0})]}),d.jsxs("label",{children:["Correo electrónico",d.jsx("input",{type:"email",value:o.email,onChange:K=>c({...o,email:K.target.value}),placeholder:"correo@ei.com.co",required:!0})]}),d.jsxs("label",{children:["Contraseña temporal",d.jsx("input",{type:"text",value:o.password,onChange:K=>c({...o,password:K.target.value}),placeholder:"Opcional, si la dejas vacía se genera automáticamente"}),d.jsx("small",{className:"helper-text",children:"La contraseña se muestra una sola vez para compartirla con el usuario."})]}),d.jsxs("label",{children:["Rol inicial",d.jsx("select",{value:o.role,onChange:K=>c({...o,role:K.target.value}),children:v.map(K=>d.jsx("option",{value:K,children:Mx(K)},K))})]})]}),d.jsxs("button",{className:"primary-button",disabled:m,children:[d.jsx(Vr,{})," ",m?"Creando usuario…":"Crear usuario"]}),f&&d.jsxs("div",{className:"created-password-box",children:[d.jsx("span",{children:"Contraseña temporal generada"}),d.jsx("strong",{children:f}),d.jsxs("button",{type:"button",className:"secondary-button",onClick:()=>navigator.clipboard?.writeText(f),children:[d.jsx(uy,{size:16})," Copiar"]})]})]}),d.jsx("div",{className:"users-table",children:n.map(K=>d.jsxs("div",{children:[d.jsxs("div",{children:[d.jsx("b",{children:K.full_name||"Sin nombre"}),d.jsx("span",{children:K.email})]}),d.jsxs("div",{className:"user-role-actions",children:[d.jsxs("select",{value:K.role,onChange:C=>w(K.id,C.target.value),children:[d.jsx("option",{value:"colaborador",children:"Colaborador"}),d.jsx("option",{value:"creador_contenido",children:"Creador de contenido"}),d.jsx("option",{value:"revisor",children:"Revisor"}),d.jsx("option",{value:"admin",children:"Administrador"}),d.jsx("option",{value:"super_admin",children:"Super Admin"})]}),x(K)&&d.jsx("button",{type:"button",className:"danger-button",disabled:b===K.id,onClick:()=>H(K),children:b===K.id?"Eliminando…":"Eliminar"})]})]},K.id))})]})}';

let bundle = await readFile(bundlePath, 'utf8');

if (!bundle.includes(patchedMarker)) {
  const start = bundle.indexOf(startMarker);
  const end = bundle.indexOf(endMarker, start);

  if (start < 0 || end < 0 || end <= start) {
    throw new Error('No se encontró exactamente el componente de usuarios esperado.');
  }

  bundle = bundle.slice(0, start) + usersComponent + bundle.slice(end);
  await writeFile(bundlePath, bundle, 'utf8');
}

const stylesMarker = '.user-role-actions{';
const deletionStyles = '\n.user-role-actions{display:flex;align-items:center;gap:8px}.user-role-actions select{flex:1;margin-top:0}.danger-button{display:inline-flex;align-items:center;justify-content:center;border:1px solid #fecaca;border-radius:12px;padding:10px 14px;background:#fff1f2;color:#b91c1c;font-weight:900;cursor:pointer;transition:background .14s ease,color .14s ease,transform .14s ease}.danger-button:hover{background:#b91c1c;color:#fff;transform:translateY(-1px)}.danger-button:disabled{opacity:.55;cursor:not-allowed;transform:none}@media(max-width:700px){.user-role-actions{align-items:stretch;flex-direction:column}.danger-button{width:100%}}\n';

let styles = await readFile(stylesPath, 'utf8');

if (!styles.includes(stylesMarker)) {
  styles += deletionStyles;
  await writeFile(stylesPath, styles, 'utf8');
}

console.log('Parche de eliminación jerárquica aplicado y verificado.');
