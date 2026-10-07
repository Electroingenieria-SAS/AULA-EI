# AULA EI Compliance Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar y desplegar en producción el sistema de cumplimiento legal de AULA EI con documentos versionados, gate obligatorio de aceptación, evidencia inmutable, derechos del titular, administración legal y controles de seguridad.

**Architecture:** El núcleo jurídico vive en PostgreSQL/Supabase con tablas RLS y RPC de superficie mínima. React consulta las obligaciones legales después de autenticar al usuario y antes de renderizar el LMS; si faltan aceptaciones, muestra un gate bloqueante. El Centro de Privacidad usa las mismas RPC para consulta de documentos, evidencia y solicitudes, y la administración legal queda detrás de rol administrativo + MFA AAL2.

**Tech Stack:** React 18, Vite 6, Supabase/PostgreSQL/Auth, GitHub Actions, JavaScript ES Modules, CSS.

**Spec:** `docs/superpowers/specs/2026-10-07-aula-ei-compliance-legal-privacy-design.md`

## Global Constraints

- Todos los usuarios de AULA EI son mayores de 18 años.
- AULA EI no almacena información médica ocupacional.
- No se integran trackers externos de analítica o publicidad.
- Los rankings no toman decisiones automáticas de contratación.
- Las aceptaciones existentes no se inventan ni se generan retroactivamente.
- Las versiones legales publicadas son inmutables.
- Los usuarios finales no pueden UPDATE/DELETE sobre evidencia de aceptación.
- `anon` no obtiene acceso a evidencia, solicitudes, incidentes ni administración legal.
- Publicación/retirada administrativa exige sesión viva de Admin/Super Admin y AAL2.
- No se usa `user_metadata` como fuente de autorización.
- Usuario existente sin clasificación jurídica explícita se trata como `employee` para no romper el LMS actual.
- La puesta en producción será DB-first: el backend legal se despliega y valida antes de fusionar el frontend que activa el gate.

## Review Focus

1. Usuario autenticado sin fila en `legal_user_contexts`: debe resolverse como `employee`, nunca quedar bloqueado por error técnico.
2. Versión publicada después de una aceptación anterior: si `is_material=true`, debe volver a aparecer como pendiente; si es no material y reemplaza una versión vigente, no debe crear un bloqueo innecesario.
3. Doble click/reintento de aceptación: debe ser idempotente y producir una sola evidencia por usuario/versión.
4. Usuario intenta aceptar una versión que no le aplica o está en `draft/retired`: debe rechazarse en DB aunque manipule el frontend.
5. Cuenta que cambia de `candidate` a `employee`: debe conservar evidencia histórica y recibir el paquete laboral nuevo.

---

### Task 1: Núcleo de base de datos, RLS y RPC jurídicas

**Files:**
- Create: `supabase/migrations/20261007193000_aula_ei_compliance_center.sql`
- Modify: `scripts/verify-database-contract.mjs`
- Modify: `scripts/verify-security.mjs`

**Interfaces:**
- Produces: tablas `legal_documents`, `legal_document_versions`, `legal_audience_rules`, `legal_user_contexts`, `legal_acceptances`, `privacy_requests`, `privacy_incidents`, `retention_rules`.
- Produces RPC: `get_my_legal_requirements()`, `get_my_legal_acceptances()`, `accept_legal_document(uuid,text)`, `create_my_privacy_request(text,text)`, `get_my_privacy_requests()`, `admin_set_legal_user_type(uuid,text)`.
- Consumes: helpers actuales `is_admin()`, `is_super_admin()`, `aula_is_aal2()` y perfil activo existente.

- [ ] **Step 1: Añadir verificaciones que fallen si faltan tablas/RPC/RLS del Compliance Center.**
- [ ] **Step 2: Ejecutar `npm run check:database && npm run check:security` y confirmar fallo por contratos nuevos ausentes.**
- [ ] **Step 3: Crear la migración SQL con tablas, constraints, índices, RLS, grants mínimos y RPC con `SECURITY DEFINER` solo donde sea necesario, `search_path = public, auth, pg_temp`, checks de `auth.uid()` y MFA administrativo.**
- [ ] **Step 4: Implementar `legal_user_contexts` con `user_type in ('employee','prehire','candidate')`; la ausencia de fila se resuelve como `employee`.**
- [ ] **Step 5: Hacer `legal_acceptances` append-only: usuario solo puede insertar por RPC, sin UPDATE/DELETE para `authenticated`.**
- [ ] **Step 6: Ejecutar verificadores y confirmar PASS.**
- [ ] **Step 7: Commit `feat: add legal compliance database core`.**

### Task 2: Documentos legales iniciales y reglas de audiencia

**Files:**
- Create: `supabase/migrations/20261007194000_seed_aula_ei_legal_documents.sql`
- Create: `docs/legal/corp-data-v2.md`
- Create: `docs/legal/aula-privacy-v1.md`
- Create: `docs/legal/aula-terms-v1.md`
- Create: `docs/legal/aula-storage-v1.md`
- Create: `docs/legal/aula-security-use-v1.md`
- Create: `docs/legal/aula-candidate-v1.md`
- Create: `docs/legal/aula-prehire-v1.md`
- Create: `docs/legal/aula-retention-v1.md`
- Create: `docs/legal/aula-incident-response-v1.md`
- Create: `docs/legal/aula-sla-v1.md`

**Interfaces:**
- Consumes: tablas/versionado de Task 1.
- Produces: versiones `published` iniciales y reglas employee/prehire/candidate.
- Produces: contenido legal fuente versionado en Git y hash SHA-256 equivalente al contenido canónico almacenado en DB.

- [ ] **Step 1: Redactar documentos con base en la política DA-PL-005 y normativa colombiana vigente, sin cláusulas de exoneración absoluta ni promesas incompatibles con infraestructura Free.**
- [ ] **Step 2: Definir finalidades separadas para candidato, preingreso y colaborador, y excluir explícitamente datos médicos de AULA EI.**
- [ ] **Step 3: Definir inventario de almacenamiento local real: `aula-ei-auth`, preferencias y PWA/cache; sin trackers externos.**
- [ ] **Step 4: Definir matriz de retención por categoría y criterio de revisión; no prometer borrado automático al terminar relación laboral.**
- [ ] **Step 5: Sembrar documentos, versiones, hashes y audiencia en SQL; no generar filas en `legal_acceptances`.**
- [ ] **Step 6: Añadir validación SQL que rechace versiones publicadas sin hash, fecha de vigencia o contenido.**
- [ ] **Step 7: Commit `docs: add versioned AULA EI legal pack`.**

### Task 3: Cliente legal y gate bloqueante

**Files:**
- Create: `src/legal/legal-api.js`
- Create: `src/legal/LegalGate.jsx`
- Create: `src/legal/LegalDocument.jsx`
- Create: `src/legal/legal.css`
- Modify: `src/App.jsx`
- Modify: `src/main.jsx`
- Create: `scripts/test-legal-helpers.mjs`
- Modify: `package.json`

**Interfaces:**
- `loadLegalRequirements(): Promise<LegalRequirement[]>`
- `acceptLegalDocument(versionId: string): Promise<LegalAcceptance>`
- `LegalGate({ profile, sessionUser, children })`
- Consumes RPC de Task 1.

- [ ] **Step 1: Crear tests para normalización de requisitos, pendientes y reintentos idempotentes.**
- [ ] **Step 2: Ejecutar `node scripts/test-legal-helpers.mjs` y confirmar FAIL.**
- [ ] **Step 3: Implementar `legal-api.js` sin consultas directas privilegiadas; usar solo RPC permitidas.**
- [ ] **Step 4: Implementar `LegalGate` con estados loading/error/required/complete; bloquear el LMS mientras exista requisito pendiente.**
- [ ] **Step 5: Implementar vista accesible del documento con aceptación explícita no preseleccionada y botón deshabilitado durante envío.**
- [ ] **Step 6: Integrar el gate en `src/App.jsx` después de perfil/password y antes de `AdminMfaGate`/contenido de LMS.**
- [ ] **Step 7: Añadir estilos responsive sin bloquear scroll en iOS/Android.**
- [ ] **Step 8: Ejecutar tests y `npm run build`; confirmar PASS.**
- [ ] **Step 9: Commit `feat: enforce legal acceptance gate`.**

### Task 4: Centro de Privacidad del usuario

**Files:**
- Create: `player/src/PrivacyCenter.jsx`
- Modify: `player/src/LearnerApp.jsx`
- Modify: `player/src/LearnerShell.jsx`
- Modify: `player/src/navigation.js`
- Modify: `player/src/experience.css`

**Interfaces:**
- Ruta: `#/privacy`
- Consume: `get_my_legal_acceptances()`, `get_my_privacy_requests()`, `create_my_privacy_request(type,description)`.
- Produces: vista de documentos vigentes, evidencias propias y formulario de derechos.

- [ ] **Step 1: Añadir ruta `privacy` y enlace permanente “Privacidad y Legal”.**
- [ ] **Step 2: Mostrar versiones aceptadas con código, versión, fecha y hash abreviado; nunca datos de otros usuarios.**
- [ ] **Step 3: Implementar formulario para consulta/corrección/actualización/supresión/revocatoria/reclamo.**
- [ ] **Step 4: Validar tipo y contenido en frontend y DB; evitar submit duplicado.**
- [ ] **Step 5: Asegurar responsive y accesibilidad de modal/página en móvil.**
- [ ] **Step 6: Ejecutar `npm run build` y verificadores responsive.**
- [ ] **Step 7: Commit `feat: add privacy and legal center`.**

### Task 5: Administración legal con MFA

**Files:**
- Create: `studio/src/LegalComplianceManager.jsx`
- Modify: `studio/src/App.jsx`
- Modify: `studio/src/studio-modules.js`
- Modify: `studio/src/shared.js`
- Modify: `studio/src/styles.css` o stylesheet existente importado por Studio.

**Interfaces:**
- Admin/Super Admin AAL2: ver documentos/versiones, crear borradores, aprobar/publicar/retirar, cambiar contexto jurídico de usuario.
- Ninguna acción administrativa se autoriza solo desde frontend; DB repite autorización.

- [ ] **Step 1: Añadir pestaña “Privacidad y legal” solo a roles administrativos.**
- [ ] **Step 2: Implementar listado y edición de borradores sin permitir mutar versiones `published`.**
- [ ] **Step 3: Implementar publicar/retirar mediante RPC AAL2 y mostrar impacto de reaceptación antes de confirmar.**
- [ ] **Step 4: Implementar cambio controlado employee/prehire/candidate con auditoría.**
- [ ] **Step 5: No exponer `privacy_incidents` a administradores comunes salvo autorización explícita; dejar registro restringido para Super Admin/compliance.**
- [ ] **Step 6: Ejecutar build y pruebas de seguridad.**
- [ ] **Step 7: Commit `feat: add legal compliance administration`.**

### Task 6: Cabeceras, SLA, inventario técnico y comprobaciones CI

**Files:**
- Modify: `vercel.json`
- Modify: `index.html`
- Create: `docs/legal/storage-inventory.md`
- Create: `docs/legal/provider-matrix.md`
- Create: `docs/legal/retention-matrix.md`
- Create: `scripts/verify-legal-compliance.mjs`
- Modify: `package.json`
- Modify: `.github/workflows/deploy-pages.yml`

**Interfaces:**
- Produce: `npm run check:legal` integrado en build/CI.
- Verifica ausencia de trackers, presencia del gate, documentos fuente, rutas legales, migraciones, cabeceras y contratos mínimos.

- [ ] **Step 1: Añadir verificador fail-closed para archivos legales, gate, RPC esperadas y ausencia de trackers conocidos.**
- [ ] **Step 2: Integrar `check:legal` al `npm run build` antes de Vite.**
- [ ] **Step 3: Revisar y endurecer cabeceras HTTPS/CSP/Referrer-Policy/Permissions-Policy sin romper Supabase ni assets.**
- [ ] **Step 4: Documentar proveedores reales (Supabase, GitHub Pages/Vercel según despliegue efectivo) sin afirmar residencia de datos no comprobada.**
- [ ] **Step 5: Ejecutar build completo, security runtime, database contract, responsive, PWA y legal checker.**
- [ ] **Step 6: Commit `ci: enforce legal compliance checks`.**

### Task 7: Despliegue seguro DB-first y producción

**Files:**
- No nuevos archivos obligatorios; actualiza evidencia en `docs/production-release-checklist.md` y `docs/supabase-production-audit-2026-10-07.md`.

**Interfaces:**
- Consumes: rama completa y migraciones finales.
- Produces: Supabase live compatible antes del deploy frontend, PR verde y producción activa.

- [ ] **Step 1: Leer skill Supabase y documentación/changelog vigente antes de aplicar DDL.**
- [ ] **Step 2: Aplicar las migraciones finales al proyecto `ipoidimevokogptydbvt` mediante mecanismo de migración de producción, en orden.**
- [ ] **Step 3: Consultar DB y verificar tablas, RLS, grants, hashes, documentos publicados y RPC.**
- [ ] **Step 4: Ejecutar Supabase security advisors y resolver únicamente hallazgos atribuibles al nuevo módulo.**
- [ ] **Step 5: Verificar que ningún usuario tenga aceptación precreada y que los 4 administradores existentes conserven acceso condicionado por sus controles actuales.**
- [ ] **Step 6: Pasar PR de draft a ready, esperar `build`, `audit` y `CodeQL JavaScript` requeridos; no fusionar con checks fallidos.**
- [ ] **Step 7: Fusionar por squash a `main`.**
- [ ] **Step 8: Verificar workflow de producción, sitio publicado y que un usuario autenticado sin aceptación sea enviado al gate.**
- [ ] **Step 9: Verificar que una aceptación real cree exactamente una fila con usuario, versión, fecha y hash y habilite el LMS.**
- [ ] **Step 10: Actualizar checklist/auditoría con commit, migraciones, resultados y limitaciones de revisión jurídica institucional.**

## Definition of Done

- DB/RLS/RPC live y verificadas.
- Documentos legales iniciales versionados, con hash y audiencia.
- Gate activo en producción.
- Evidencia append-only.
- Centro de Privacidad funcional.
- Administración legal protegida por MFA AAL2.
- Sin trackers externos.
- Sin datos médicos ni menores.
- CI requerido verde.
- `main` protegido y merge vía PR.
- Producción validada después del merge.
