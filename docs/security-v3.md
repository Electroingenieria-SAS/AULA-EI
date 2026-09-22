# Aula EI · Security v3

## Controles activos en código

- MFA TOTP obligatorio para roles Admin y Super Admin.
- La aplicación no muestra contenido protegido a un administrador hasta alcanzar AAL2.
- Contraseñas nuevas: mínimo 12 caracteres, mayúscula, minúscula, número y símbolo.
- Comprobación de contraseñas nuevas contra Pwned Passwords de HaveIBeenPwned mediante k-anonymity.
  - Solo se envían los primeros 5 caracteres del hash SHA-1.
  - La contraseña y el hash completo nunca salen del Edge Function.
  - Para Admin/Super Admin la verificación falla cerrada si HIBP no está disponible.
- Rate limiting servidor para creación de usuarios, activación/desactivación y primer cambio de contraseña.
- Auditoría automática de cambios sensibles en perfiles, matrículas, cursos, certificados y firmas.
- Las operaciones administrativas de base de datos requieren AAL2.
- GitHub Actions ejecuta guard de arquitectura y guard Security v3.
- Vercel Git deployment permanece deshabilitado.

## CAPTCHA / Turnstile

Supabase soporta Cloudflare Turnstile e hCaptcha, pero requiere un Site Key y Secret reales de un proveedor externo y habilitar el secreto en Auth > Bot and Abuse Protection. No se almacena un secreto de CAPTCHA en GitHub.

Cuando existan esas credenciales, la integración debe activarse en Supabase Auth y luego conectarse al formulario de login. Hasta entonces el proyecto conserva los rate limits propios de Supabase Auth, MFA obligatorio para administradores y los controles Security v3 anteriores.

## Leaked Password Protection nativa

La función nativa de Supabase sigue siendo exclusiva de Pro. Security v3 agrega una comprobación propia contra la misma base de Pwned Passwords para los flujos de creación/cambio de contraseña que controla Aula EI.
