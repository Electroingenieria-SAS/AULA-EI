# Aula EI — Fase 8.5 | Auditoría de seguridad y acta de aceptación condicionada

**Fecha de corte:** 8 de octubre de 2026.  
**Proyecto verificado:** Supabase `ipoidimevokogptydbvt` (compartido con otros dominios de la organización).  
**Fuente de código:** `Electroingenieria-SAS/AULA-EI`.  
**Estado del control:** **PENDIENTE DE CERTIFICACIÓN INTEGRAL**, no equivale a un dictamen de pentesting aprobado.

## 1. Alcance y pruebas realizadas

Auditoría de metadatos *en vivo y sin cambios* de PostgreSQL: privilegios EXECUTE de funciones `SECURITY DEFINER`, grants a `anon` y `PUBLIC`, `search_path`, referencias aparentes a controles de identidad y revisión de tablas sin políticas. Inspección estática de login, MFA AAL2, recovery, creación/restablecimiento de usuarios, rate limits y comprobación HIBP en Edge Functions. Se añadió una consulta SQL de auditoría **solo lectura** en `supabase/audits/phase85_readonly_security.sql`.

| Verificación en Supabase | Valor observado | Interpretación |
| --- | ---: | --- |
| Funciones en `public` SECURITY DEFINER y ejecutables por autenticados | 33 | Son superficie a probar individualmente; no 33 vulnerabilidades confirmadas |
| De esas funciones, `anon` con EXECUTE | 0 | Sin acceso directo anónimo por grants |
| De esas funciones, permiso EXECUTE concedido a `PUBLIC` | 0 | Sin exposición directa universal por grant |
| Sin `search_path` fijado | 0 | Cumplen este control de endurecimiento |
| Con alguna referencia visible a autenticación/identidad | 32 | Heurística de texto, **no** prueba de autorización |
| Sin esa referencia textual | 1 | `erp_x_paco_snapshot` usa `erp_supply.require_profile()` y `erp_supply.current_org_id()`; pertenece a otro dominio compartido |
| Con referencia a helper administrativo | 17 | Heurística; exige verificación de autorización de parámetros |
| Tablas con RLS sin políticas | 19 | Familias `dt_*` y `helpdesk_*` no relacionadas directamente con las pantallas de Aula EI |
| Entre esas 19, con grants de lectura `anon` o `authenticated` | 0 | Diseño cerrado por defecto, no abrirlo automáticamente |

**Segundo control de RLS realizado:** las 11 tablas principales de Aula EI inspeccionadas (`profiles`, `courses`, `enrollments`, `content_blocks`, `certificates`, `exam_attempts`, `learning_paths`, `training_notifications`, `legal_acceptances`, `privacy_requests` y `audit_logs`) tienen RLS activo y ninguna concede `SELECT` directo a `anon`. Las políticas SELECT de certificados y exámenes exigen pertenencia del usuario y actividad, o el helper administrativo; las de privacidad/aceptaciones vinculan al solicitante. Esto verifica el diseño de las políticas, **no** su comportamiento ante sesiones reales de distintos usuarios.

Las cifras son una instantánea del **2026-10-08**, no garantías perpetuas. Los asesores de Supabase también reportaron 37 índices sin uso observado. Mantenerlos hasta medir uso operativo y costo real.

Remediación de referencia: [funciones privilegiadas](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [RLS sin políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [índices sin uso](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

## 2. Las 33 funciones para revisión individual

| Dominio | Funciones | Pruebas que faltan |
| --- | --- | --- |
| Gestión de formación/privacidad (14) | `admin_create_legal_document_version`, `admin_create_privacy_incident`, `admin_generate_certificate`, `admin_list_legal_documents`, `admin_list_legal_user_contexts`, `admin_list_privacy_incidents`, `admin_list_privacy_requests`, `admin_publish_legal_document_version`, `admin_resolve_privacy_request`, `admin_run_training_automations`, `admin_set_legal_user_type`, `admin_set_user_job_position`, `admin_set_user_supervisor`, `admin_sync_training_engine` | AAL1 denegado, AAL2 autorizado, comprobar pertenencia al ámbito, ausencia de acceso de colaborador/creador/revisor y argumentos ajenos |
| Autogestión/aprendizaje (13) | `accept_legal_document`, `check_course_practice_answer`, `complete_block`, `create_my_privacy_request`, `get_course_practice_question`, `get_exam_questions`, `get_my_course_route_access`, `get_my_legal_acceptances`, `get_my_legal_requirements`, `get_my_privacy_requests`, `get_my_training_profile`, `is_aula_active`, `submit_exam` | Cuenta propia admitida y cuenta ajena denegada; pruebas de requisitos, preguntas, idempotencia, asignaciones y calificaciones oficiales |
| Certificados/roles y helpers (5) | `clear_certificate_signature`, `save_certificate_signature`, `set_user_role`, `is_admin`, `is_super_admin` | Propiedad del certificado, integridad de firma, elevación de rol prohibida, sesión viva y AAL2 |
| RPC ERP externa (1) | `erp_x_paco_snapshot` | Separar ámbito de Supply/ERP; su función comienza llamando `erp_supply.require_profile()`. Validación de alcance por el propietario de ERP |

**No revocar estas 33 funciones en lote**, porque las operaciones `get_my_*`, `submit_exam` y otras deben ser ejecutables por miembros autenticados; revocarlas cortaría operaciones legítimas. El grep de una guarda es un indicio, nunca prueba unitaria o de penetración.

## 3. Protección de contraseñas filtradas

El Security Advisor sigue reportando `auth_leaked_password_protection` como **WARN**. La función nativa Leaked Password Protection [requiere plan Supabase Pro o superior](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). El [plan Free no la incluye](https://supabase.com/pricing). No se ha comprado ningún plan ni activado esta función.

Controles compensatorios identificados en el código: política de contraseña de mínimo 12 caracteres y comprobación de reputación contra HIBP (k-anonimato) en `create-managed-user`, `complete-password-change` y `reset-managed-user-password`. Las rutas administrativas exigen sesión validada y AAL2. **Límite:** la verificación implementada en Edge Functions no reemplaza la protección nativa de todas las operaciones Auth, y su comportamiento ante fallo de HIBP requiere aceptación del riesgo.

**Opción sin gasto:** mantener controles Edge, MFA TOTP de administradores, límites de tasa y revisión de flujos de restablecimiento; registrar la observación nativa como pendiente/aceptación de riesgo documentada. Si se decide pasar a Pro, obtener autorización de costo y confirmar que el Security Advisor dejó de mostrar el aviso.

## 4. Matriz de aceptación funcional por rol

**No se ejecutaron sesiones de cuentas de prueba reales**, por lo que los siguientes casos **no están aprobados**.

| Perfil | Acciones positivas | Pruebas negativas obligatorias |
| --- | --- | --- |
| Colaborador | Login y consentimiento, Inicio, plan, cursos asignados, juegos, entrenador, progreso y certificado propio | No ver curso sin asignar, no abrir ruta bloqueada, no ingresar a administración, no alterar registros de otro usuario |
| Creador de contenido | Gestión editorial de cursos autorizados y vista previa según rol | No consultar usuarios privados, no cambiar roles, no generar certificados administrativos |
| Revisor | Flujo de revisión/publicación según permisos concedidos | No modificar perfiles ni saltar pasos editoriales; no asumir capacidad de super_admin |
| Admin | MFA AAL2, asignaciones, matrículas, gestión de formación y cumplimiento | Sesión AAL1 rechazada en RPC administrativa, no elevarse a super_admin, no manipular una cuenta ajena sin permiso |
| Super Admin | MFA AAL2, administración de roles, emisión/gestión de certificados con trazabilidad | No saltar verificación de sesión viva, auditoría ni controles de integridad; cuenta suspendida sin acceso |

**Transversales:** logout y cambio A→B sin filtraciones de caché; inicio de sesión inválido; expiración de JWT; corte/reanudación de red; consentimiento legal obligatorio; registro de nota única; código de certificado; rendimiento sin overlays; 320, 360, 390, 430, 768, 1024, 1280 y 1440 px. Guardar evidencia con datos anonimizados, sin adjuntar cookies, tokens, contraseñas o códigos MFA.

## 5. Respaldo y continuidad

A la fecha **no existe evidencia de un dump exportado, copia de Storage íntegra ni restauración concluida en laboratorio**. Los proyectos Supabase Free no incluyen descargas de backup gestionadas. Es posible preparar un respaldo lógico autorizado con `supabase db dump`, y descargar separadamente objetos privados de Storage siguiendo un procedimiento cifrado bajo custodia institucional. Un backup PostgreSQL no contiene los binarios de Storage. Véase [Supabase Backups](https://supabase.com/docs/guides/platform/backups).

Runbook detallado: `docs/runbooks/PHASE8_AULA_EI_RECOVERY_2026-10-08.md`. El comprobador `scripts/recovery-target-guard.mjs` rechaza un destino remoto y no ejecuta ninguna restauración. Completar únicamente en un laboratorio autorizado, con RTO/RPO observados.

## 6. Evidencia y puerta de certificación

Fuente estructurada: `docs/quality/phase85-certification-evidence.json`. Los diez controles de seguridad, roles, responsive, respaldos y acta están **PENDIENTES**, sin evidencia firmada.

- `npm run test:phase85-readiness` verifica los contratos de seguridad de código y que no se declare una certificación inexistente. **Debe pasar en CI**.
- `npm run check:phase85-certification` es la puerta de certificación institucional y debe **fallar** mientras existan controles pendientes o pruebas sin evidencia; no usar este comando como condición de construcción hasta tener las cuentas/autorizaciones y respaldo necesarios.
- Cuando se ejecute cada prueba, conservar referencia interna segura (nunca secreta) en `evidence`, asignar `APROBADO` y adjuntar aprobación externa, sin falsificar fechas, capturas ni firmas. Solo se puede cerrar `certification_status` como `CERTIFICADO` al tener 10/10 evidencias y resolución del riesgo nativo.

## 7. Acta de aceptación (pendiente)

**Aplicación:** Aula EI · Electroingeniería S.A.S.  
**Versión bajo prueba:** completar con SHA definitivo de `main` y coincidencia con Vercel/Pages.  
**Responsable del sistema:** ____________________  
**Responsable de protección de datos:** ____________________  
**Representante de operación:** ____________________  
**Fecha y hora de aceptación:** ____________________  
**Revisión de evidencias, RTO/RPO y pendientes:** ____________________  
**Decisión:** [ ] Aceptar  [ ] Aceptación condicionada  [ ] Rechazar  
**Observaciones:** ___________________________________________________

A la fecha **no se ha firmado el acta ni emitido una certificación global**. No confundir CI público en verde con pruebas de acceso, restauración, contrato de protección de datos o evaluación de seguridad ofensiva.
