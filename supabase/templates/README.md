# Plantilla de recuperación OTP · Aula EI

Esta plantilla corresponde a **Authentication > Email Templates > Reset password** en Supabase.

- Asunto recomendado: `Código para restablecer tu contraseña · Aula EI`
- Contenido: usar `recovery-otp.html`.
- La plantilla debe conservar `{{ .Token }}`; Supabase sustituye esa variable por el código OTP de 6 dígitos.
- No reemplazar el código por `{{ .ConfirmationURL }}` si se desea mantener el flujo de ingreso manual del OTP dentro de Aula EI.

El frontend solicita el correo con `resetPasswordForEmail()`, valida el código mediante `verifyOtp(... type: 'recovery')` y finaliza el cambio mediante la Edge Function `complete-password-change`.
