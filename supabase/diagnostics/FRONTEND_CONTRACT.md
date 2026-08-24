# Contrato observado del frontend

## Tablas consultadas directamente

- `public.profiles`
- `public.courses`
- `public.course_phases`
- `public.content_blocks`
- `public.enrollments`
- `public.block_progress`
- `public.questions`
- `public.question_options`

## Tablas usadas mediante RPC o soporte

- `public.exam_attempts`
- `public.certificates`
- `public.certificate_signatures`
- `public.audit_logs`

## RPC invocadas por el build activo

- `set_user_role(uuid, text)`
- `get_exam_questions(uuid)`
- `submit_exam(uuid, jsonb)`
- `get_my_certificates()`
- `get_certificate_by_code(text)`
- `admin_certificate_ranking()`
- `admin_completed_without_certificate()`
- `admin_generate_certificate(uuid, uuid)`
- `get_certificate_signatures(text)`
- `save_certificate_signature(text, text, text)`
- `clear_certificate_signature(text, text)`

## RPC observada solo en un fragmento fuente posterior

- `get_my_profile()`

## Otros servicios

- Bucket privado: `course-assets`.
- Edge Functions: `create-managed-user` y `delete-managed-user`.
- RPC auxiliares observadas en SQL: `is_admin`, `is_super_admin`, `is_enrolled`, `can_take_exam`, `write_audit_log`, `can_access_certificate` y funciones generadoras de código.

Si un objeto cambia de nombre o firma, debe actualizarse el proyecto fuente y generarse un build nuevo. La única excepción provisional es el parche determinista y verificable `scripts/patch-user-deletion.mjs`, creado porque el paquete recibido no incluyó el fuente completo.
