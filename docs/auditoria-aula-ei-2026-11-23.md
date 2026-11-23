# Aula EI — auditoría técnica y visual de mantenimiento

**Fecha:** 23 de noviembre de 2026  
**Repositorio:** `Electroingenieria-SAS/AULA-EI`  
**Proyecto de backend:** `ipoidimevokogptydbvt`  
**Modalidad:** revisión no destructiva de código, CI, configuración visible y consultas SQL de lectura.  
**Cambio solicitado:** eliminar la tarjeta promocional de avatar del Inicio, sin quitar el editor ni la mascota flotante.

## 1. Cambio visual aplicado

- Se elimina por completo la sección `ei-avatar-home-card` y su texto «Mi personaje me acompaña en Aula EI» del componente `player/src/HomePage.jsx`.
- Se eliminan los imports y el manejador `onAvatarIntro` que dejaron de ser necesarios.
- Se retiran selectores CSS exclusivos de esa tarjeta, evitando código visual muerto.
- El editor permanece disponible en `#/mi-personaje` desde el menú lateral y la cabecera móvil. La bienvenida para quien aún no tenga avatar y la figura flotante siguen operativas.
- Se agrega una aserción de regresión en `scripts/test-avatar-builder.mjs` para evitar el regreso de esa tarjeta.
- No se modifican datos personales, matrículas, exámenes, roles, RLS ni migraciones.

## 2. Auditoría de código, compilación y experiencia

| Área | Evidencia revisada | Resultado |
| --- | --- | --- |
| Arquitectura | `scripts/verify-architecture.mjs`; build del PR | Aprobada. Una sola sesión y un cliente Supabase central; límites de tamaño de archivos superados por ninguno. |
| Seguridad de aplicación | `check:security`, `test:security-runtime`, `check:database`, `check:legal` y pruebas existentes | Compilan y pasan. No equivalen a pruebas de penetración con cuentas de distintos roles. |
| Avatar e Inicio | `test:avatar-builder` y aserción de ausencia de la tarjeta | Aprobado; preserva catálogo de 34 personajes, 8 fondos y editor. |
| Accesibilidad/responsive | `check:visual`, `check:motion`, `check:mobile`, `check:controls`; smoke browser | Ocho tamaños probados: 320, 360, 390, 430, 768, 1024, 1280 y 1440 px. Es una prueba del login, no un barrido visual autenticado de todas las rutas. |
| PWA y actualizaciones | `check:pwa` y revisión de `public/sw.js` | Caché por versión, JS/CSS network-first y aviso de actualización. |
| Tamaño y rendimiento | `check:performance`, `check:bundle` | JS inicial 122,3 KB gzip (límite 220 KB); CSS inicial 63,8 KB gzip (límite 64 KB). |
| Dependencias | `npm audit --omit=dev --audit-level=high` en CI | Sin vulnerabilidades altas que impidan build. **Hay una moderada en Vite 6.4.4**, advisory GHSA-8g5g-mxqh-grgj. |
| CI / entrega | Build & Deploy, CodeQL y Dependency Security del PR | Los tres completados correctamente; verificar publicación de `main` antes de comunicar disponibilidad al usuario. |

**Observación de rendimiento — prioridad media:** el CSS inicial deja menos de 0,2 KB de margen con respecto a 64 KB gzip. Cualquier componente nuevo de estilos globales puede romper el presupuesto. Recomendable seguir desplazando estilos a rutas autenticadas o bajo demanda y reducir reglas heredadas, sin subir el límite.

**Observación de dependencias — prioridad media:** planear una actualización puntual de Vite y su lockfile, comprobar compatibilidad con Node 24 y ejecutar el pipeline completo. No ejecutar un `npm audit fix` indiscriminado en el proyecto de producción.

## 3. Supabase: seguridad y exposición de datos (lectura de producción)

Auditores ejecutados: **Security**, **Performance** y **Health**. El asesor Health no devolvió incidencias.

### Verificaciones positivas
- Consulta `pg_class`: ninguna tabla ordinaria de `public` apareció con RLS deshabilitado.
- Consulta de vistas ordinarias en `public`: ninguna vista pública ordinaria encontrada en la revisión.
- Consulta `pg_policies`: políticas explícitas de usuario/admin para perfiles, certificados, cursos, matrículas, notificaciones y aceptaciones legales.
- `admin_generate_certificate`, `admin_set_user_job_position` y `set_my_aula_avatar` tienen comprobaciones de administrador o membresía dentro de sus definiciones. Esto es evidencia de protección, no sustituto de tests de roles y acceso a objetos.

### Advertencias sin resolver automáticamente

| Prioridad | Hallazgo | Alcance y siguiente paso |
| --- | --- | --- |
| Alta (revisión) | 43 funciones `SECURITY DEFINER` ejecutables por `authenticated` | Revisar las 43 funciones con escenarios de usuario no autorizado, autorización por objeto y `search_path`; la marca por sí sola no confirma vulnerabilidad. No revocar indiscriminadamente: muchas RPC son intencionales y las pantallas dependen de ellas. |
| Media | Protección contra contraseñas filtradas desactivada | Verificar elegibilidad del plan (Supabase indica Pro o superior) y habilitar en Auth si el plan lo permite; validar flujo de alta/restablecimiento. |
| Media | RLS de `enrollments` con 3 pares de políticas permisivas superpuestas | Analizar semántica OR y permisos de creador/admin antes de consolidar. La ejecución de permisos puede ampliarse si se fusionan mal. |
| Media | Una política `creator_enrollments_assign` reevalúa `auth.uid()` por fila | Evaluar cambio a `(select auth.uid())` y medir plan/impacto con usuarios y permisos de prueba. |
| Informativa | 19 tablas de mesa de ayuda con RLS y sin políticas | RLS sin políticas bloquea acceso directo ordinario; revisar si ese aislamiento es intencional y si las Edge Functions actúan como único acceso. |
| Informativa | 29 índices sin uso observado | No eliminarlos sin métricas de tráfico representativo, volumen y claves foráneas. |

**Edge Functions:** nueve funciones activas revisadas en metadatos. Seis con `verify_jwt=true`; tres con `false` (`helpdesk-api`, `helpdesk-admin` y `aula-canva-connect`). Las dos de Helpdesk implementan su propia lógica de sesiones/CORS según inspección inicial, pero requieren auditoría funcional independiente de sus operaciones con `service_role`. La función Canva retirada devuelve 410. No se cambió su configuración automáticamente para evitar romper servicios ajenos a Aula EI.

**Logs:** revisada la presencia de fuentes `edge_logs`, `postgres_logs`, `auth_logs`, `postgrest_logs` y Edge Functions. Los registros contienen eventos de error que requieren clasificación por endpoint y código de respuesta; no es correcto deducir incidentes de seguridad únicamente por coincidencias de texto en logs.

### Fuentes para revisión
- Asesor de seguridad del proyecto en el panel Supabase.
- [Protección de contraseñas filtradas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- [Políticas permisivas múltiples](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies).
- [RLS initialization plan](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan).
- [Funciones SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- [Advisory Vite](https://github.com/advisories/GHSA-8g5g-mxqh-grgj).

## 4. Límites de esta auditoría

- No se ejecutaron pruebas penetración, bypass de roles, IDOR/BOLA ni un recorrido real autenticado con cuentas colaborador/creador/revisor/admin.
- No se modificaron políticas ni definiciones de SQL de producción; la consulta de `SECURITY DEFINER` no verifica exhaustivamente cada ruta del código.
- No se probaron manualmente creación/restablecimiento de contraseñas ni cargas PDF/OneDrive desde sesión auténtica.
- No se hizo una prueba de carga o Lighthouse completo de vistas autenticadas ni contrastes WCAG por pantalla.
- No se infiere ausencia de fallos a partir de que el pipeline CI pase.

## 5. Orden recomendado

1. **Hecho:** retirar tarjeta redundante de Inicio y validar CI.
2. **Prioridad alta:** evaluar RPC privilegiadas con matriz de permisos y escenarios IDOR usando usuarios de pruebas, empezando por las 43 `SECURITY DEFINER`.
3. **Prioridad media:** corregir policy de `enrollments` y consolidar permisos solo tras pruebas RLS por cargo y rol.
4. **Prioridad media:** actualizar Vite con PR separado y ejecutar suite de regresión.
5. **Prioridad media:** habilitar protección de contraseñas filtradas si el plan lo permite y validar flujos actuales de contraseña.
6. **Prioridad media:** auditoría visual autenticada de Inicio, Catálogo, Desarrollo, Mi Plan, Coach, Juegos y Studio en desktop/móvil.
7. **Seguimiento:** perfilar CSS de carga inicial y revisar endpoints/logs del proyecto Helpdesk en un trabajo separado.

**Conclusión:** la modificación visual está desacoplada de backend y conserva los mecanismos de avatar; el CI existente cubre compilación, contratos y smoke de login. La base presenta advertencias reales que deben tratarse como tareas de endurecimiento con pruebas específicas, no como brechas explotadas ya demostradas.
