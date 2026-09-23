# AULA EI · Vercel Legacy Operativa

Esta rama conserva la versión operativa que estaba publicada en Vercel antes de la migración a la nueva experiencia.

## Propósito

- Mantener continuidad operativa mientras la nueva versión evoluciona en `main`.
- Conservar la interfaz y funcionalidad de la versión Vercel existente.
- Aplicar únicamente correcciones de compatibilidad con el backend actual de Supabase.
- No debilitar MFA, RLS ni controles administrativos.

## Compatibilidad aplicada · 23/09/2026

- almacenamiento de sesión aislado para evitar refresh tokens históricos inválidos;
- recuperación controlada de sesiones con refresh token inexistente;
- MFA TOTP/AAL2 antes de montar Gestión Aula EI para Admin/Super Admin;
- política de contraseña alineada a mínimo 12 caracteres;
- sin cambios funcionales deliberados al diseño o flujo del LMS.

Base original de esta rama: `381518ced8dd24fd3d360ca670e236c4ec7b0938`.
