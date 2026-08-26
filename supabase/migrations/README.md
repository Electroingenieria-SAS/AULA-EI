# Migraciones

La migración validada y aplicada en producción para Aula EI está incluida aquí:

- `20260826163217_aula_ei_security_hardening_20260826.sql`

Fue registrada en el historial remoto de Supabase el 26 de agosto de 2026. Los SQL de `../reference-sql/` siguen siendo históricos y **no** deben ejecutarse en bloque.

Para nuevas migraciones: generar el nombre con Supabase CLI, probar primero fuera de producción, revisar RLS/grants/functions/Storage, ejecutar los Advisors y confirmar el historial remoto antes de hacer commit.
