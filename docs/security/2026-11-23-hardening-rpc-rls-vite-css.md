# Cierre técnico de advertencias — Aula EI

**Fecha:** 2026-11-23. **Proyecto:** `ipoidimevokogptydbvt`.  
**Método:** auditoría de metadatos SQL sin datos de usuarios, revisión de funciones, asesor de Supabase, cambios versionados y pruebas CI.

## 1. Matriz de decisiones

| Hallazgo original | Cambio y evidencia | Situación |
| --- | --- | --- |
| 43 funciones `SECURITY DEFINER` con permiso de ejecución autenticada | Se inspeccionaron individualmente metadatos de las 43, sus permisos de ejecución, `search_path` y uso de SQL dinámico. Ninguna permite ejecución a `anon` ni por privilegio `PUBLIC` efectivo, todas fijan `search_path` y ninguna muestra `EXECUTE` dinámico. El caso `erp_x_paco_snapshot` delega la validación de identidad en `erp_supply.require_profile()`. | **Revisión estática realizada.** El aviso permanecerá porque las 43 RPC están expuestas a `authenticated` intencionalmente; no revocar ni cambiar a invoker sin demostrar equivalencia. Falta certificación funcional multirol/IDOR con sesiones reales. |
| Protección de contraseñas filtradas | Organización Supabase con `plan=free`. La protección integrada de Auth requiere Pro. **Mitigación ya instalada:** las Edge Functions `create-managed-user`, `reset-managed-user-password` y `complete-password-change` consultan HIBP mediante hash SHA-1 por prefijo, bloquean coincidencias y exigen al menos 12 caracteres. Si HIBP no responde, los administradores fallan en modo seguro; para colaboradores el flujo puede continuar por disponibilidad. | **Mitigación implementada y verificada en código; aviso nativo pendiente por plan.** No se ha cambiado la suscripción. |
| Tres pares de políticas permisivas en `enrollments` | Migración aplicada en producción `20261123215638`: se mantuvieron las políticas SELECT, INSERT, UPDATE existentes incorporando las expresiones de los creadores con `OR`; se eliminaron únicamente las tres políticas duplicadas de los creadores. | **Resuelto y verificado.** `multiple_permissive_policies`: 3 → 0. |
| Una evaluación repetida de `auth.uid()` en RLS | Las reglas consolidadas usan `(select auth.uid())`, manteniendo la condición original sobre el usuario que asigna. | **Resuelto y verificado.** `auth_rls_initplan`: 1 → 0. |
| Vite 6.4.4 con GHSA-8g5g-mxqh-grgj | Paquete y `package-lock.json` actualizados al parche 6.4.5, con tarball y `sha512` verificados por npm. Se conserva la misma línea mayor Vite 6. | **Corrección versionada.** Validación por `npm ci`, audit y build en CI antes de fusionar. |
| CSS inicial cerca de 64 KB | `studio/src/styles/courses.css` (33.086 bytes) se traslada de `src/main.jsx` al módulo Studio, cargándolo solo cuando un usuario accede a Gestión. Se mantiene el límite existente del bundle. | **Optimización versionada.** Confirmar el ahorro gzip real en CI; no se aumentó el límite. |
| 29 índices sin uso observado | 29 índices no únicos sin lecturas registradas; ocupan **376 KB en conjunto**, cada uno como máximo 16 KB. La cifra corresponde al contador de acceso de PostgreSQL y no demuestra que nunca sean necesarios. | **Evaluados: se conservan.** No hay una mejora significativa por borrarlos, y algunos soportan consultas poco frecuentes o claves foráneas. |

## 2. Privilegios y seguridad de las RPC

La advertencia de Supabase **`authenticated_security_definer_function_executable`** identifica funciones privilegiadas invocables por cualquier sesión autenticada; no implica automáticamente una explotación. El diagnóstico no se elimina artificialmente revocando `EXECUTE` a `authenticated`, ya que muchas operaciones legítimas (examinar, firmar, consultar formación) dependen de estas RPC y realizan controles adicionales dentro del cuerpo.

La revisión de seguridad estructural de las 43 encontró:

- **43/43:** `EXECUTE` otorgado a `authenticated` de manera intencional.
- **0/43:** permiso ejecutable por `anon`.
- **0/43:** permiso ejecutable a través de `PUBLIC` en el estado inspeccionado.
- **43/43:** `search_path` explícito.
- **0/43:** `EXECUTE` dinámico detectado por búsqueda estática.
- **42/43:** referencias directas a autorización/membresía por expresiones SQL revisadas; la restante utiliza un guard de `erp_supply`.
- Se revisaron cuerpos de funciones de alto impacto, incluidas `admin_generate_certificate`, `admin_set_user_job_position`, `set_user_role`, `submit_exam`, `creator_assignment_allowed` y `set_my_aula_avatar`. No se reescribieron ni alteraron estos mecanismos por conjetura.

**Inventario exacto de las 43:**  
1. `accept_legal_document`
2. `admin_create_legal_document_version`
3. `admin_create_privacy_incident`
4. `admin_generate_certificate`
5. `admin_list_legal_documents`
6. `admin_list_legal_user_contexts`
7. `admin_list_privacy_incidents`
8. `admin_list_privacy_requests`
9. `admin_position_assessment_metrics`
10. `admin_publish_legal_document_version`
11. `admin_resolve_privacy_request`
12. `admin_run_training_automations`
13. `admin_set_legal_user_type`
14. `admin_set_user_job_position`
15. `admin_set_user_supervisor`
16. `admin_sync_training_engine`
17. `check_course_practice_answer`
18. `clear_certificate_signature`
19. `complete_block`
20. `create_my_privacy_request`
21. `creator_assignment_allowed`
22. `creator_assignment_target_allowed`
23. `creator_certificate_ranking`
24. `creator_get_certificate_by_code`
25. `creator_get_certificate_signatures`
26. `erp_x_paco_snapshot`
27. `get_course_practice_question`
28. `get_exam_questions`
29. `get_my_course_route_access`
30. `get_my_legal_acceptances`
31. `get_my_legal_requirements`
32. `get_my_privacy_requests`
33. `get_my_training_profile`
34. `get_training_colleague_profile`
35. `is_admin`
36. `is_aula_active`
37. `is_super_admin`
38. `list_course_responsibles`
39. `list_training_assignment_candidates`
40. `save_certificate_signature`
41. `set_my_aula_avatar`
42. `set_user_role`
43. `submit_exam`

**Límite de la verificación:** falta una matriz dinámica de acceso autenticado con identidades de prueba (colaborador, creador, revisor, administrador y superadministrador) y recursos propios/ajenos. No debe describirse como prueba de penetración concluida.

## 3. Políticas RLS — migración y verificación directa

Migración aplicada en Supabase: `20261123215638_consolidate_aula_enrollments_permissive_rls_20261123`.

Se conservaron las expresiones previas combinadas con la misma semántica lógica de políticas permisivas, que PostgreSQL evalúa con `OR`, tanto en `USING` como en `WITH CHECK`. La política DELETE de administradores no se tocó; los registros históricos tampoco.

Consulta posterior a `pg_policies`: **4 políticas** (SELECT: 1, INSERT: 1, UPDATE: 1, DELETE: 1), todas para `authenticated`. El asesor de rendimiento de Supabase retornó únicamente `unused_index` como informativo. Las alertas RLS `auth_rls_initplan` y `multiple_permissive_policies` desaparecieron.

Archivo de migración en repositorio: `supabase/migrations/20261123215638_consolidate_aula_enrollments_permissive_rls_20261123.sql`. El archivo representa el cambio **ya aplicado**; no ejecutarlo de nuevo sobre esa base.

## 4. Contraseñas filtradas — limitación real del plan

El proyecto pertenece a la organización `uvoobndkcrchttedthcd`, cuya suscripción consultada es **Free**. Supabase documenta que la protección integrada de contraseñas filtradas necesita **Pro o superior**. Por ello no se puede asegurar que esta alerta desaparezca en el plan actual. No se efectúan compras, cargos ni mejoras de plan sin autorización explícita.

Configuración tras cambiar a un plan compatible: **Authentication → Settings / Email password security → Prevent use of leaked passwords**. Volver a ejecutar el asesor `security` y probar alta y cambio de contraseña.

**Control compensatorio confirmado directamente en producción:** las Edge Functions `create-managed-user` (versión 15), `reset-managed-user-password` (versión 5) y `complete-password-change` (versión 6) validan contra el servicio HIBP mediante la API de rango de hash SHA-1; el texto completo de la contraseña no se envía al servicio. Las credenciales presentes en filtraciones se rechazan. La política exige longitud mínima de 12 caracteres y, ante indisponibilidad de HIBP, deniega operaciones para cuentas `admin` y `super_admin`. Para roles no administrativos continúa la operación cuando el servicio está inaccesible, por lo que hay un **riesgo residual de disponibilidad frente a verificación**. Las funciones `verify_jwt=true` permanecen activas. El asistente de CI `test:phase85-readiness` comprueba que la lógica HIBP está presente; no es una prueba real de fallo/rechazo del servicio externo. Esta mitigación no equivale a activar la función nativa de Supabase ni elimina la advertencia del dashboard.

## 5. Índices

La consulta `pg_stat_user_indexes` identificó exactamente **29 índices no únicos** con `idx_scan=0`, un tamaño combinado de **385.024 bytes (376 KB)**; tamaño individual máximo **16.384 bytes**. Los índices únicos y claves primarias se excluyeron de la consideración de limpieza. No se aplicaron `DROP INDEX`, `REINDEX` ni cambios de estructura de datos por falta de un ahorro relevante y de evidencia de patrones de carga representativos.

## 6. Validación de entrega

La suite CI debe ejecutar `npm ci`, análisis de dependencias, `test:security-hardening`, arquitectura, pruebas de función y UI, build de producción, presupuesto de bundle, smoke de navegador en ocho viewports, CodeQL y Dependency Security. No se considera desplegado ni se declara el parche de Vite operativo hasta que el PR se fusione y GitHub Pages confirme su publicación.

**Fuentes:**
- https://github.com/advisories/GHSA-8g5g-mxqh-grgj
- https://supabase.com/docs/guides/auth/password-security
- https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable

**Consultas de comprobación:** `supabase/audits/20261123_aula_ei_rls_rpc_and_unused_indexes.sql` (solo lectura).
