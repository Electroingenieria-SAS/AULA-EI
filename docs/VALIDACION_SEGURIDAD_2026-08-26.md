# Validación de seguridad — 26/08/2026

## Supabase remoto

- Migración aplicada: `20260826163217_aula_ei_security_hardening_20260826`.
- `anon` tiene **0 grants** sobre las tablas auditadas de Aula EI.
- `profiles` para `authenticated`: `SELECT` únicamente.
- `question_options` y `questions`: SELECT directo limitado a staff por RLS.
- RPC críticos (`get_exam_questions`, `submit_exam`, firmas) no son ejecutables por `anon`.
- Funciones internas (`handle_new_user`, `next_certificate_code`, `write_audit_log`) no son ejecutables directamente por `anon` ni `authenticated`.
- Bucket `course-assets`: privado, 100 MB máximo, MIME allowlist.

## Prueba RLS con rol alumno

Se simuló una sesión `authenticated` de un usuario matriculado real:

- perfiles visibles: **1** (solo el propio);
- preguntas visibles por consulta directa: **0**;
- opciones visibles por consulta directa: **0**.

Esto verifica que el alumno no puede extraer el campo `is_correct` mediante una consulta directa a la Data API. El examen debe pasar por `get_exam_questions`, que omite dicho campo y aplica controles de matrícula/progreso.

## Paquete estático

`npm run verify`: **OK**.

Comprobaciones adicionales:

- JavaScript activo: sintaxis válida;
- TypeScript de las dos Edge Functions: sintaxis válida;
- `service_role`/`sb_secret` real en frontend: **no detectado**;
- GitHub PAT: **no detectado**;
- Vercel token: **no detectado**;
- Firebase activo: **no detectado**;
- fallback SPA local: **OK**.

## Hallazgo de cuenta pendiente

Supabase Security Advisor todavía informa **Leaked Password Protection desactivada**. Es un ajuste de Auth que debe habilitarse en el Dashboard. Algunas funciones `SECURITY DEFINER` autenticadas siguen apareciendo como advertencia del Advisor porque son RPC intencionalmente invocables por usuarios con sesión; sus cuerpos realizan autorización explícita. Para un aislamiento superior, migrarlas en una fase posterior a un esquema privado/BFF.
