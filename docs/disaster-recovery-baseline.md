# Baseline SQL de recuperación · Aula EI

Proyecto Supabase: `ipoidimevokogptydbvt`.

## Objetivo

Generar una baseline estructural reproducible de disaster recovery con la herramienta oficial de Supabase, evitando reconstrucciones manuales incompletas desde `information_schema` o `pg_catalog`.

El workflow `.github/workflows/database-dr-baseline.yml` produce:

- `roles.sql`: roles de base de datos exportables que Supabase CLI permite conservar.
- `schema.sql`: esquema lógico exportado mediante `supabase db dump`.
- `SHA256SUMS.txt`: hashes para validar integridad.
- `MANIFEST.txt`: proyecto, commit origen, fecha UTC, versión del CLI y alcance.

## Seguridad

El repositorio es público. Por diseño, este workflow **no exporta datos de aplicación** ni archivos almacenados en Supabase Storage. Los artefactos generados contienen únicamente la baseline estructural y se conservan 30 días en GitHub Actions.

La conexión se entrega únicamente mediante el secreto de Actions `SUPABASE_DB_URL`. El valor no se imprime, no se persiste en archivos y no debe añadirse al código ni a variables públicas.

## Ejecución

Se ejecuta:

- cuando cambia el workflow o una migración en `main`;
- semanalmente;
- manualmente mediante `workflow_dispatch`.

Si `SUPABASE_DB_URL` no está configurado, el job falla de forma explícita y no puede considerarse cumplido el control de disaster recovery. Un run verde exige que se hayan generado y validado los archivos reales.

## Restauración de estructura

En una recuperación real, restaurar primero `roles.sql` y después `schema.sql` sobre un proyecto Supabase nuevo y compatible. Validar extensiones, RLS, funciones, triggers, políticas y permisos antes de habilitar tráfico.

Esta baseline no reemplaza un backup de datos. Supabase Storage requiere respaldo independiente de los objetos, y los datos operativos requieren un mecanismo privado separado.

## Alcance del proyecto compartido

`ipoidimevokogptydbvt` contiene objetos de Aula EI y otros objetos del proyecto compartido. El dump oficial preserva el alcance que Supabase considera exportable y evita inventar una baseline parcial solo con las tablas conocidas de Aula EI.

## Estado de cierre al 2026-10-07

El workflow quedó desplegado en `main` mediante el PR #78. La primera ejecución confirmó que el Secret `SUPABASE_DB_URL` aún no existe en GitHub Actions, por lo que no se generó ningún artefacto. Esto no se sustituye por introspección manual.

Para cerrar el control falta una única acción de custodia de credenciales: crear el Secret de repositorio `SUPABASE_DB_URL` con la cadena de conexión del proyecto y volver a ejecutar `Database DR Baseline`. El conector de GitHub disponible no expone escritura de Secrets y el conector de Supabase no entrega la contraseña de base de datos.
