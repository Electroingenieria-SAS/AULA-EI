# Seguridad de Aula EI

Aula EI es una aplicación interna de ELECTROINGENIERÍA S.A.S.

## Reporte responsable

No publiques vulnerabilidades, credenciales, tokens, datos personales ni evidencias sensibles en Issues públicos.

Reporta cualquier hallazgo directamente al equipo responsable del repositorio y adjunta únicamente la información mínima necesaria para reproducirlo.

## Alcance

Se consideran especialmente sensibles:

- autenticación, recuperación de contraseña y MFA;
- elevación o modificación de roles;
- acceso a perfiles, matrículas, progreso, exámenes y certificados;
- Supabase RLS/RPC/Storage;
- Edge Functions administrativas;
- exposición de secretos o credenciales;
- bypass del pipeline o del despliegue de producción.

## Política de secretos

Nunca deben almacenarse en Git claves de servicio de Supabase, claves `sb_secret_*`, tokens personales, contraseñas, archivos `.env` reales ni claves privadas.

La clave publishable de Supabase no se considera un secreto y está diseñada para uso cliente con RLS correctamente configurado.
