# Auditoría Supabase producción · Aula EI · 2026-10-07

Proyecto auditado: `ipoidimevokogptydbvt`

## Estado general verificado en vivo

Migraciones live de hardening registradas previamente: `20261007145446`, `20261007145515` y `20261007145659`.

Migraciones live del Compliance Center:

- `20261007191851 aula_ei_compliance_center`
- `20261007191900 seed_aula_ei_legal_documents`
- `20261007191907 aula_ei_compliance_admin`
- `20261007192010 aula_ei_compliance_indexes`
- `20261007192146 aula_ei_compliance_audit`

Controles verificados:

- proyecto operativo y conectado al backend real;
- RLS habilitada en las tablas núcleo de Aula EI;
- Storage `course-assets` restringido a usuarios autenticados con reglas por matrícula/rol;
- las tablas del motor de formación no conservan DML para `anon`;
- helpers y RPC sensibles con `search_path` explícito y autorización interna;
- RPC administrativas con Admin/Super Admin + MFA AAL2/sesión viva cuando corresponde;
- cinco Edge Functions de Aula EI desplegadas con `verify_jwt=true` y respuestas `no-store`;
- cuatro cuentas administrativas activas: dos con MFA verificado y dos pendientes de enrolamiento personal.

## Compliance Center

Estado live después del despliegue:

- 10 documentos legales;
- 10 versiones publicadas;
- 16 reglas de audiencia obligatoria;
- 8/8 tablas nuevas con RLS;
- 0 hashes inválidos;
- `anon` sin EXECUTE sobre `get_my_legal_requirements` ni `accept_legal_document`;
- `authenticated` sin UPDATE/DELETE directo sobre `legal_acceptances`;
- aceptación protegida además por trigger de inmutabilidad;
- versiones publicadas protegidas contra modificación de contenido/hash y solo susceptibles de pasar a estado histórico `retired`;
- auditoría integrada a `public.audit_logs` sin duplicar narrativa sensible de solicitudes o incidentes.

No se generaron aceptaciones retroactivas. Al cierre de la prueba live persistían:

- 0 aceptaciones legales;
- 0 solicitudes de privacidad;
- 0 incidentes de privacidad.

### Smoke transaccional de producción

Se simuló un usuario Aula EI activo usando contexto JWT únicamente dentro de una transacción:

- `get_my_legal_requirements()`: 5 documentos requeridos, 5 pendientes, contexto `employee`;
- `accept_legal_document(...)`: generó una evidencia válida dentro de la transacción;
- el rollback dejó 0 aceptaciones y 0 eventos `legal.accepted` persistidos.

Se simuló también una sesión administrativa real compatible con AAL2, factor MFA verificado y sesión viva:

- `admin_list_legal_documents()`: 10 documentos visibles y 10 versiones publicadas.

Las pruebas no dejaron datos de aceptación ficticios en producción.

## Advisors

Los avisos `RLS Enabled No Policy` restantes pertenecen a tablas `dt_*` y `helpdesk_*`, no al núcleo de Aula EI ni a las ocho tablas del Compliance Center.

Los avisos `Signed-In Users Can Execute SECURITY DEFINER Function` incluyen endpoints autenticados intencionales del LMS y del Compliance Center. No se convierten mecánicamente a `SECURITY INVOKER`: las funciones expuestas revocan `anon/PUBLIC` cuando corresponde y aplican identidad, estado de cuenta y autorización interna; las administrativas requieren además AAL2.

Los siete foreign keys nuevos inicialmente señalados sin índice quedaron cubiertos mediante `aula_ei_compliance_indexes`. El advisor ya no reporta FKs sin índice del Compliance Center. Los índices nuevos aparecen como `unused`, comportamiento esperado antes de tráfico real.

## Leaked Password Protection y plan Free

La protección nativa de contraseñas filtradas de Supabase permanece deshabilitada por restricción del plan utilizado.

Compensaciones activas:

- contraseña de 12 a 128 caracteres;
- mayúscula, minúscula, número y símbolo;
- comprobación contra HaveIBeenPwned en creación/cambio/reset de contraseñas gestionadas;
- MFA AAL2 para administración.

## Disaster Recovery

El control DR está cerrado.

El workflow `Database DR Baseline` genera `roles.sql` y `schema.sql`, manifiesto y hashes. La ejecución validada `37649574766` produjo el artefacto `aula-ei-dr-baseline-37649574766`, y la verificación descargada confirmó:

- `roles.sql: OK`;
- `schema.sql: OK`;
- ausencia de URI PostgreSQL, secretos Supabase, hostname del pooler o contraseña;
- hashes portables después del ajuste del PR #80.

Los cambios del Compliance Center en `supabase/migrations` obligan a generar una nueva baseline DR después del merge a `main`.

## GitHub y controles humanos

GitHub reporta actualmente `main` como `protected: true`. El bloque clásico `protection.enabled` aparece deshabilitado y el conector no expone el detalle completo de Rulesets, por lo que las condiciones exactas del ruleset deben confirmarse en la interfaz de GitHub. Se mantiene además el gate de despliegue que rechaza pushes de producción no asociados a un PR fusionado.

No se modifica unilateralmente ninguna cuenta para forzar MFA. Dos administradores aún deben enrolar personalmente un factor verificado; sin ello no superan el gate AAL2 ni pueden usar las RPC administrativas.
