# Superficie RPC de Aula EI

Fecha de auditoría: 22 de septiembre de 2026.

## Resultado

La alerta de Supabase por funciones `SECURITY DEFINER` ejecutables por usuarios autenticados bajó de **38 a 18** sin retirar ninguna función que el frontend necesite.

Las 18 funciones restantes se mantienen de forma intencional porque ejecutan mutaciones controladas, necesitan acceso a datos que no deben exponerse directamente o actúan como primitivas de confianza utilizadas por RLS.

## Criterio de clasificación

Las funciones públicas de PostgreSQL se clasifican en tres grupos:

1. **RPC autenticada de aplicación.** El frontend la invoca directamente. Si necesita saltar RLS para calificar exámenes, escribir firmas o ejecutar operaciones controladas, conserva `SECURITY DEFINER` y valida sesión/rol dentro de la función.
2. **RPC administrativa.** El frontend de Gestión la invoca y exige Admin o Super Admin. Los reportes de solo lectura usan `SECURITY INVOKER`; las mutaciones sensibles conservan `SECURITY DEFINER`.
3. **Helper interno/autorización.** Si no debe ser invocado directamente desde PostgREST se revoca `EXECUTE` a `anon` y `authenticated`.

## SECURITY DEFINER conservadas por diseño — 18

### Usuario — 9

- `check_course_practice_answer`
- `complete_block`
- `get_course_practice_question`
- `get_exam_questions`
- `get_my_course_route_access`
- `get_my_training_profile`
- `save_certificate_signature`
- `clear_certificate_signature`
- `submit_exam`

Estas funciones encapsulan preguntas/respuestas, progreso, reglas de ruta o escrituras que no deben depender de acceso directo a tablas.

### Administración — 6

- `admin_generate_certificate`
- `admin_run_training_automations`
- `admin_set_user_job_position`
- `admin_set_user_supervisor`
- `admin_sync_training_engine`
- `set_user_role`

Realizan mutaciones controladas y validan permisos administrativos en servidor.

### Primitivas de confianza/RLS — 3

- `is_aula_active`
- `is_admin`
- `is_super_admin`

Estas funciones validan membresía confiable y evitan ciclos o dependencias inseguras dentro de las políticas RLS.

## Convertidas a SECURITY INVOKER — 16

- `admin_certificate_ranking`
- `admin_completed_without_certificate`
- `admin_content_block_analytics`
- `admin_question_analytics`
- `admin_training_analytics`
- `admin_training_compliance_rows`
- `admin_training_engine_snapshot`
- `can_access_certificate`
- `can_manage_assignments`
- `can_manage_courses`
- `can_manage_users`
- `is_enrolled`
- `get_my_profile`
- `get_my_certificates`
- `get_certificate_by_code`
- `get_certificate_signatures`

Estas funciones son de lectura o wrappers de autorización y funcionan correctamente usando los permisos y RLS del usuario autenticado.

## Retiradas de la superficie RPC autenticada — 4

- `admin_sync_user_training`: helper llamado internamente por `admin_set_user_job_position`.
- `can_take_exam`: helper interno usado por las RPC de examen.
- `can_delete_critical_content`: helper sin uso directo en frontend/RLS.
- `is_staff`: primitiva reemplazada en `can_manage_courses` por membresía validada + rol confiable del JWT.

## Pruebas realizadas

Se ejecutaron pruebas bajo contexto real de rol `authenticated`:

- Admin: acceso de gestión, ranking, pendientes de certificado, analítica de bloques/preguntas, analítica de formación, cumplimiento y snapshot.
- Colaborador: acceso a sus cursos y matrículas mediante RLS.
- Colaborador con certificado: perfil, certificados propios, detalle del certificado y firmas.
- Admin: consulta de detalle y firmas de certificados administrables.
- Verificación de permisos: las cuatro funciones internas anteriores ya no conceden `EXECUTE` a `authenticated`.

## Leaked Password Protection

Este control no es una migración SQL. Se configura en Supabase Auth.

Ruta recomendada:
**Auth → Providers → Email / Password security → Prevent the use of leaked passwords**.

Supabase usa Pwned Passwords de HaveIBeenPwned para rechazar contraseñas conocidas como filtradas. La documentación oficial indica que esta función está disponible en planes Pro y superiores.

Aula EI ya exige durante el cambio inicial una contraseña de 10 a 128 caracteres con mayúscula, minúscula, número y símbolo; la protección de contraseñas filtradas debe habilitarse adicionalmente en Auth.
