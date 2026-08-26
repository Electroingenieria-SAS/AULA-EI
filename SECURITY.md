# Política de seguridad — Aula EI

## Secretos

Nunca publicar: Supabase `service_role`/secret keys, tokens de administración, PAT de GitHub, tokens de Vercel, credenciales DNS, contraseñas, `.env` reales ni backups con datos personales.

La URL de Supabase y la **publishable key** del frontend son públicas por diseño. No deben tener poder por sí mismas: RLS, grants mínimos y autorización server-side son obligatorios.

## Controles vigentes

- RLS habilitado en las tablas de Aula EI expuestas.
- `anon` sin grants directos sobre las tablas auditadas de Aula EI.
- lectura de `questions/question_options` restringida a roles internos; alumnos usan `get_exam_questions` sin `is_correct`.
- `profiles` no se inserta/actualiza directamente desde el navegador.
- roles sensibles derivados de `app_metadata`, no de metadata editable por el usuario.
- Edge Functions administrativas requieren JWT y vuelven a comprobar rol server-side.
- eliminación de usuarios respeta jerarquía y bloquea autoeliminación.
- firmas de certificado separadas por identidad/rol.
- Storage de cursos privado.
- CSP y headers de seguridad definidos para Vercel.

## Pendiente de configuración de cuenta

Supabase Security Advisor reporta **Leaked Password Protection desactivada**. Debe habilitarse desde Auth. También se recomienda MFA para administradores, signup público desactivado si no se necesita, bot/CAPTCHA protection, rate limits y revisión de sesiones.

## Reporte de vulnerabilidades

No publiques una vulnerabilidad explotable en Issues públicos. Reporta de forma privada al responsable técnico, incluyendo alcance, reproducción mínima, rol afectado, evidencia sin datos personales y recomendación de contención.

## Incidente

1. Rotar/revocar cualquier secreto expuesto.
2. Preservar logs y evidencia.
3. Contener la ruta/función afectada.
4. Corregir y probar fuera de producción.
5. Revalidar RLS, grants, funciones, Storage y sesiones.
6. Ejecutar Security Advisor antes del cierre.
