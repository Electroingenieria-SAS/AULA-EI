## 2026-08-26 — Hardening de seguridad y handoff de dominio

- migración Supabase `20260826163217_aula_ei_security_hardening_20260826` aplicada;
- cierre de exposición de respuestas correctas del examen;
- cierre de escalamiento de rol por metadata editable;
- mínimos privilegios/grants y restricción de RPC;
- controles de firma de certificados;
- Storage privado con allowlist;
- CSP/headers de Vercel, `.env.example`, `.gitignore` y documentación de dominio/credenciales.

# Historial de cambios

## 2026-08-23 — Eliminación jerárquica de usuarios

- Se conectó y auditó el proyecto Supabase `ipoidimevokogptydbvt`.
- Se desplegó `delete-managed-user` con verificación JWT habilitada.
- Se impidió que un administrador o superadministrador elimine su propia cuenta o usuarios de nivel igual o superior.
- Se añadió el botón de eliminación únicamente para usuarios de nivel inferior.
- Se añadieron confirmación irreversible, mensajes de error y actualización de la lista.
- No se eliminaron usuarios reales durante la implementación o verificación.

## 2026-08-23 — Organización inicial del repositorio

- Se conservó sin cambios la versión estática activa.
- Se eliminaron 48 archivos acumulados de builds anteriores en `assets/`.
- Se retiraron 10 recursos de marca no referenciados por la aplicación activa.
- Se consolidaron 14 archivos de instrucciones repetidos en documentación única.
- Se movió la Edge Function a la estructura estándar de Supabase.
- Se separó el SQL histórico de las futuras migraciones.
- Se identificaron como legado los fragmentos fuente incompletos.
- Se añadieron verificación automática, servidor local y documentación de soporte.
