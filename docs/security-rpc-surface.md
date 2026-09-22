# Superficie RPC de Aula EI

Fecha de auditoría: 22 de septiembre de 2026.

## Criterio de clasificación

Las funciones públicas de PostgreSQL se clasifican en tres grupos:

1. **RPC autenticada de aplicación.** El frontend la invoca directamente. Si necesita saltar RLS para calificar exámenes, escribir firmas, actualizar `auth.users` o ejecutar operaciones controladas, conserva `SECURITY DEFINER` y valida sesión/rol dentro de la función.
2. **RPC administrativa.** El frontend de Gestión la invoca y exige Admin o Super Admin. Los reportes de solo lectura usan `SECURITY INVOKER` para heredar RLS; las mutaciones sensibles conservan `SECURITY DEFINER`.
3. **Helper interno/autorización.** No debe ser un endpoint público si solo es utilizado por otras funciones. Se revoca `EXECUTE` a `anon`/`authenticated` cuando no participa directamente en RLS. Los helpers usados por políticas permanecen ejecutables, pero se prefieren como `SECURITY INVOKER` cuando no requieren privilegios del dueño.

## RPC que permanecen SECURITY DEFINER por diseño

### Usuario
- `check_course_practice_answer`
- `complete_block`
- `get_course_practice_question`
- `get_exam_questions`
- `get_my_course_route_access`
- `get_my_training_profile`
- `save_certificate_signature`
- `clear_certificate_signature`
- `submit_exam`

Estas funciones encapsulan datos o escrituras que no deben exponerse como acceso directo a tablas.

### Administración
- `admin_generate_certificate`
- `admin_run_training_automations`
- `admin_set_user_job_position`
- `admin_set_user_supervisor`
- `admin_sync_training_engine`
- `set_user_role`

Estas funciones realizan mutaciones controladas y validan rol administrativo dentro del servidor.

### Primitivas de confianza/RLS
- `is_aula_active`
- `is_admin`
- `is_super_admin`

Estas funciones necesitan consultar o validar membresía confiable y son utilizadas por políticas RLS. Mantenerlas como `SECURITY DEFINER` es intencional.

## Convertidas a SECURITY INVOKER

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

Estas funciones son de lectura o wrappers de autorización y pueden operar usando los permisos y RLS del usuario autenticado.

## Retiradas de la superficie RPC autenticada

- `admin_sync_user_training`: helper llamado por `admin_set_user_job_position`.
- `can_take_exam`: helper interno de evaluación.
- `can_delete_critical_content`: helper sin uso directo en el frontend/RLS actual.
- `is_staff`: primitiva interna sustituida en `can_manage_courses` por membresía validada + rol confiable del JWT.

## Leaked Password Protection

No es una migración SQL. Supabase la configura en Auth. La documentación oficial indica:

- Auth → Providers → Email / Password security.
- Activar **Prevent the use of leaked passwords**.
- La función usa la API de Pwned Passwords de HaveIBeenPwned.
- Está disponible en planes Pro y superiores.
- Mantener además longitud mínima fuerte y requerir mayúsculas, minúsculas, números y símbolos.

La aplicación ya exige una contraseña inicial de 10 a 128 caracteres con esos grupos al completar el cambio de contraseña. La protección contra contraseñas filtradas debe activarse adicionalmente en la configuración del proyecto.
