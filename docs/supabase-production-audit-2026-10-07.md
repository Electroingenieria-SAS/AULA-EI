# Auditoría Supabase producción · Aula EI · 2026-10-07

Proyecto auditado: `ipoidimevokogptydbvt`

## Estado verificado en vivo

Migraciones live registradas durante el hardening: `20261007145446`, `20261007145515` y `20261007145659`.

- Proyecto `ACTIVE_HEALTHY`.
- RLS habilitada en las tablas núcleo de Aula EI.
- Storage `course-assets` restringido a usuarios autenticados con reglas por matrícula/rol.
- Las tablas del motor de formación ya no conservan DML para `anon`.
- Helpers `aula_is_aal2` y `normalize_aula_ei_role` quedan disponibles solo para `authenticated`.
- `touch_training_engine_updated_at` queda sin EXECUTE para `authenticated`, `anon` ni `PUBLIC`.
- Las RPC sensibles verificadas usan `SECURITY DEFINER` con `search_path` explícito y `anon` sin EXECUTE.
- Las RPC administrativas verificadas comprueban internamente Admin/Super Admin y MFA/sesión viva cuando corresponde.
- Existen 4 cuentas administrativas activas: 2 tienen MFA verificado y 2 deben completar personalmente el enrolamiento. Las cuentas sin factor verificado no superan el gate AAL2 ni pueden ejercer funciones administrativas.
- Las cinco Edge Functions de Aula EI fueron sincronizadas desde `main` y redeployadas con `verify_jwt=true`:
  - create-managed-user
  - delete-managed-user
  - complete-password-change
  - get-my-profile
  - reset-managed-user-password
- Las funciones redeployadas incorporan `Cache-Control: no-store`.

## Advisors

Los avisos `RLS Enabled No Policy` restantes pertenecen a tablas `dt_*` y `helpdesk_*`, no al núcleo Aula EI.

Los avisos `Signed-In Users Can Execute SECURITY DEFINER Function` restantes son endpoints autenticados intencionales del LMS. No se convirtieron mecánicamente a SECURITY INVOKER porque varias funciones necesitan escribir progreso/certificados o consultar datos protegidos y ya aplican autorización interna.

Los avisos de índices no usados son informativos. No se eliminaron índices sin evidencia suficiente de carga real.

## Restricción del plan gratuito

Supabase documenta que Leaked Password Protection está disponible en Pro y superiores. No se habilitó para mantener el proyecto en Free.

Aula EI mantiene una compensación gratuita:
- contraseña mínima de 12 caracteres;
- mayúscula, minúscula, número y símbolo;
- verificación contra HaveIBeenPwned en creación/cambio/reset de contraseñas gestionadas;
- MFA AAL2 para administración.

## Cierre de controles externos

- GitHub continúa reportando `main` como `protected: false` y no existen Rulesets nativos. El pipeline mantiene la compensación que impide desplegar a producción un push directo no asociado a un PR fusionado. El conector instalado no expone mutaciones de Branch Protection/Rulesets.
- Se incorporó mediante PR #78 el workflow `Database DR Baseline`, basado en `supabase db dump`, para generar `roles.sql` y `schema.sql` de forma reproducible, con hashes y manifest.
- La primera ejecución no produjo la baseline porque el Secret `SUPABASE_DB_URL` aún no está configurado en GitHub Actions. El workflow queda en modo fail-closed: mientras falte la credencial, el control debe aparecer fallido y no puede declararse cerrado.
- No se modifica unilateralmente ninguna cuenta administrativa para forzar MFA. El enrolamiento TOTP ya está integrado en `AdminMfaGate` y debe ser completado por cada titular.
