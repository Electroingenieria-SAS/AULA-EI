# Entrega técnica para dominio, GitHub, Vercel y Supabase

Fecha de auditoría: **26 de agosto de 2026**.

## 1. Estado real del código recibido

El archivo entregado contiene una **versión estática compilada** de Aula EI, no el proyecto React/Vite fuente completo. La aplicación publicada está en `index.html`, `assets/` y `brand/`. El JavaScript principal está minificado/compilado en `assets/index-BZBNDslB.js`.

Por tanto:

- **Frontend ejecutable:** sí, incluido y verificable.
- **Frontend fuente editable (src/, componentes React, vite config, etc.):** **no estaba incluido** en el ZIP recibido.
- **Backend/API propio:** Supabase (Postgres/Auth/Storage/RPC/Edge Functions); no existe un servidor Node tradicional dentro de este paquete.
- **Edge Functions:** incluidas en `supabase/functions/`.
- **Migración de seguridad validada:** incluida en `supabase/migrations/20260826163217_aula_ei_security_hardening_20260826.sql` y aplicada en el proyecto remoto.
- **SQL histórico:** `supabase/reference-sql/`; conservar como referencia, no ejecutar masivamente.
- **Dependencias del paquete estático:** no necesita `npm install`; los scripts usan Node.js estándar. Las Edge Functions fijan `@supabase/supabase-js@2.57.4`.

El proyecto Vercel conectado indica que el repositorio Git de origen es `Electroingenieria-SAS/AULA-EI`. Para una entrega de “código fuente completo” contractual, debe recuperarse ese repositorio fuente si contiene `src/`; este ZIP por sí solo no permite reconstruir limpiamente el frontend.

## 2. Arquitectura actual

Navegador → archivos estáticos (GitHub Pages o Vercel) → Supabase Auth/Data API/RPC/Storage/Edge Functions.

Servicios externos observados en el bundle: Google Drive (previews/miniaturas), OneDrive (embed) y `api.qrserver.com` (QR de certificados). No se detectó Firebase en el código activo.

## 3. Inventario de servicios

| Servicio | Uso actual | ¿Se reemplaza al pasar a dominio? | Configuración necesaria |
| --- | --- | --- | --- |
| GitHub | Repositorio y opcionalmente GitHub Pages | No | Mantener repo como fuente; branch protection, secret scanning y Pages si se desea espejo |
| Vercel | Hosting estático y despliegue desde GitHub | No | Conectar repo, asignar dominio, conservar `vercel.json`, HTTPS automático |
| Supabase | PostgreSQL, Auth, RLS, Storage, RPC y Edge Functions | No necesariamente | URL/publishable key en cliente; secretos solo en Edge Functions; RLS/grants; Auth; Storage privado |
| Firebase | No detectado | No aplica | Si se incorpora después, documentar proyecto y credenciales por separado |
| DNS/registrador | Resolver el dominio | Sí, es el punto que cambia | A/CNAME según indique Vercel; no compartir credenciales del registrador |
| Google Drive | Embeds/recursos | No | Mantener permisos de los archivos utilizados |
| OneDrive | Embeds | No | Mantener permisos de los archivos utilizados |
| QR Server | Imagen QR de verificación | No | Permitido por CSP; considerar reemplazo interno si se quiere eliminar dependencia externa |

## 4. Vercel y dominio

La cuenta conectada tiene **dos proyectos Vercel enlazados al mismo repositorio `Electroingenieria-SAS/AULA-EI`**: `aula-ei` y `aula-ei-1z4d`. Para producción conviene escoger uno como canónico y evitar administrar el mismo dominio desde ambos.

Dominios Vercel estables detectados:

- `https://aula-ei.vercel.app`
- `https://aula-ei-1z4d.vercel.app`

El código también referencia `https://aulaei.electroingenieria.com` como URL de verificación de certificados, por lo que ese hostname debe mantenerse o modificarse en el frontend fuente cuando se recupere.

El patrón recomendado es: **GitHub = fuente**, **Vercel = producción con dominio**, **GitHub Pages = espejo opcional**. Un mismo hostname DNS no puede apuntar simultáneamente a Vercel y GitHub Pages; si se necesitan ambos, use el dominio principal en Vercel y deje GitHub Pages en `*.github.io` o en otro subdominio.

## 5. Inventario de credenciales

| Credencial | Dónde debe existir | Permiso | ¿Visible en navegador? | Acción |
| --- | --- | --- | --- | --- |
| Supabase publishable key | Frontend | Solo lo que permitan grants + RLS | Sí, por diseño | No tratar como secreto; rotar opcionalmente |
| Supabase project URL | Frontend | N/A | Sí | No es secreto |
| Supabase service role / secret key | Supabase Edge secrets únicamente | Privilegios elevados/bypass RLS | **Nunca** | Rotar inmediatamente si alguna vez apareció en repo, logs o frontend |
| Supabase access token | CI/administración | Gestión de proyecto | No | Guardar en secret store; rotar si se expone |
| Vercel token | CI si se utiliza | Deployment/proyecto | No | Scope mínimo y rotación si se expone |
| GitHub token/PAT | GitHub Actions o automatización | Repo mínimo necesario | No | Preferir `GITHUB_TOKEN` de Actions; no guardar PAT en código |
| DNS/registrador | Proveedor DNS | Gestión de zona | No | MFA obligatorio y acceso restringido |

No se encontró `service_role`, secret key, PAT de GitHub, token de Vercel ni credenciales Firebase dentro de los archivos públicos auditados.

**Claves Supabase 2026:** para componentes backend nuevos se recomienda migrar de la llave legacy `service_role` a una `sb_secret_...` nombrada. Las Edge Functions del paquete aceptan `SUPABASE_SECRET_KEYS` y mantienen fallback temporal a `SUPABASE_SERVICE_ROLE_KEY` para no romper producción.

## 6. Seguridad aplicada en Supabase

Se aplicó y registró la migración `20260826163217_aula_ei_security_hardening_20260826`.

Cambios principales:

1. Se eliminaron todos los grants de `anon` sobre las tablas de Aula EI.
2. `authenticated` quedó con privilegios mínimos por tabla; se retiraron `TRUNCATE`, `TRIGGER`, `REFERENCES` y operaciones innecesarias.
3. Se cerró la lectura directa de `questions` y `question_options` para alumnos. El alumno obtiene el examen únicamente por `get_exam_questions`, que no devuelve `is_correct` y valida matrícula/progreso.
4. `profiles` quedó de solo lectura desde el navegador. La creación/modificación sensible se realiza en servidor/RPC.
5. `handle_new_user()` ya no usa `raw_user_meta_data` para decidir rol. La autorización proviene de `app_metadata`, evitando autoescalamiento de privilegios.
6. Las firmas de certificados quedaron separadas: participante solo firma su certificado; firma responsable solo Admin/Super Admin.
7. Se revocó `EXECUTE` anónimo de los RPC de Aula EI y se creó una allowlist de funciones autenticadas necesarias.
8. Se fijó `search_path` en funciones sensibles.
9. El bucket `course-assets` sigue privado, ahora con límite de 100 MB y allowlist de MIME.

## 7. Endurecimiento del hosting

`vercel.json` incluye ahora HSTS, CSP, `nosniff`, política de referencia, Permissions Policy, COOP/CORP y reglas de caché. La CSP permite únicamente los hosts que la aplicación activa usa actualmente (Supabase, Drive, OneDrive y QR Server).

Las Edge Functions locales incluyen CORS por allowlist. **No se fuerza ese cambio sobre la función productiva hasta confirmar todos los dominios de preview que el equipo quiere conservar**, para evitar cortar despliegues existentes. La autorización real sigue estando protegida por JWT y validación de rol en servidor.

## 8. Configuración de variables

Use `.env.example` solo como plantilla. Nunca suba `.env` real. En Supabase, `SUPABASE_SERVICE_ROLE_KEY` debe existir como secreto de Edge Functions; no en Vercel para este frontend estático salvo que en el futuro se añada un backend server-side.

## 9. Controles manuales pendientes para “máxima seguridad”

- Activar **Leaked Password Protection** en Supabase Auth; el Security Advisor la reporta desactivada.
- Desactivar signup público si Aula EI es exclusivamente corporativa; altas mediante administradores.
- Exigir MFA a Admin/Super Admin y a cuentas administrativas de Supabase, GitHub, Vercel y DNS.
- Revisar expiración de sesión/JWT y revocar sesiones al retirar usuarios sensibles.
- Configurar CAPTCHA/bot protection y rate limits de Auth según el flujo real.
- Habilitar backups/PITR acordes al plan y probar restauración.
- Habilitar branch protection, code review, secret scanning y Dependabot/actualizaciones de dependencias.
- Configurar `ALLOWED_ORIGINS` con todos los orígenes productivos/preview permitidos antes de desplegar las nuevas Edge Functions.
- Ejecutar Supabase Security Advisor después de cada DDL/RLS/function change.

## 10. Sobre “inhackeable” y “que nada quede visible”

Ningún sistema conectado a Internet puede garantizarse como “inhackeable”. Además, un frontend web siempre entrega HTML/CSS/JS al navegador. En la arquitectura Supabase directa, la URL del proyecto y la **publishable key** también son visibles por diseño; la seguridad se sostiene con RLS, grants mínimos, RPC controlados y secretos exclusivamente server-side.

Si el requisito contractual es que **ni siquiera las tablas/endpoints de Supabase sean observables desde el navegador**, la siguiente fase debe migrar a un patrón BFF/API: el navegador habla solo con un backend/Edge API propio, se mueve la lógica sensible a un esquema privado y se reduce o deshabilita la exposición directa de Data API. Eso aumenta aislamiento, pero no vuelve invisible el código cliente ni elimina todos los riesgos.

## 11. Instalación / despliegue

### Local

```bash
npm run verify
npm run dev
```

### Vercel

1. Conectar/importar `Electroingenieria-SAS/AULA-EI`.
2. Framework preset: Other/Static.
3. Sin build command para este paquete compilado.
4. Output/root: raíz del repositorio.
5. Añadir el dominio en Project → Settings → Domains.
6. Configurar en el proveedor DNS exactamente los registros que Vercel indique.
7. Verificar HTTPS y las cabeceras de `vercel.json`.

### GitHub Pages

Mantener `index.html`, `404.html` y `.nojekyll` en raíz. Publicar `main` → `/ (root)`. El dominio principal puede permanecer en Vercel; GitHub Pages funciona desde su URL `github.io`.

## 12. Pruebas mínimas antes de producción

- login/logout y recuperación de sesión;
- alumno ve solo sus cursos y no puede leer respuesta correcta por REST;
- Admin crea usuarios inferiores; Admin no crea Admin/Super Admin;
- jerarquía de eliminación de usuarios;
- carga/lectura de Storage solo autorizada;
- examen: no disponible antes de completar obligatorios; corrección en servidor;
- certificado y firmas con separación participante/administrador;
- rutas directas funcionan en Vercel y GitHub Pages;
- CSP no bloquea imágenes, videos, Drive, OneDrive ni QR;
- no aparecen service keys/secrets en Sources/Network/HTML/JS.
