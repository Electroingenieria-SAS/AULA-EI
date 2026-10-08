# Auditoría técnica Aula EI — Fase 8 (corte 2026-10-08)

## Alcance inspeccionado y evidencia

- GitHub `Electroingenieria-SAS/AULA-EI`: autenticación inicial, aislamiento entre sesiones, caché, Inicio, gestión, rutas, PWA, pruebas automatizadas y flujo de despliegue.
- Proyecto activo Supabase `ipoidimevokogptydbvt`: asesores de seguridad/rendimiento, catálogo de migraciones y metadatos de ejecución de funciones seleccionadas.
- CI principal: `Build and Deploy Aula EI`, `CodeQL` y `Dependency Security`; versión exacta de producción debe verificarse después de cada merge.
- **Ninguna restauración, importación, operación SQL de escritura ni cambios de configuración de Auth** fueron ejecutados desde esta auditoría.

## Fase 8.1 — Auditoría y regresiones

**Código corregido en PR #111**: Inicio manejaba fallos del snapshot con `finally` pero sin `catch`, permitiendo una promesa rechazada no controlada y un estado visual aparentemente normal. Se añadió captura, aviso accesible y reintento explícito. El gate `test:phase81-82` comprueba el manejo.

**Por validar en sesión autenticada:** recorridos integrales de colaborador, creador, revisor, admin y super_admin, juegos, repaso, examen, políticas legales, certificados, autoría y responsive por botón a 320/360/390/430/768/1024/1280/1440 px. El smoke existente prueba únicamente el login público, no estos flujos.

## Fase 8.2 — Seguridad

**Código corregido en PR #111:** separación explícita `profileUserId`/sesión, remontaje del LMS al cambiar de cuenta y generación invalidable de caché, con prueba de carrera simulada. Sin modificar roles ni calificaciones.

**Hallazgos del asesor Supabase (2026-10-08):**

| Hallazgo | Nivel/count | Evidencia y siguiente acción |
|---|---|---|
| Protección de contraseñas filtradas | WARN / 1 | [Configurar Leaked Password Protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) en Supabase Auth cuando la organización autorice. No se puede declarar activada. |
| Funciones autenticadas `SECURITY DEFINER` | WARN / 33 | [Analizar RPC individualmente](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable): revisar pruebas SQL con roles de prueba, guardas, AAL2 y `EXECUTE`. **No revocar a ciegas**: funciones como `accept_legal_document` y `get_my_course_route_access` son operaciones legítimas para colaboradores; `admin_generate_certificate` y `admin_list_legal_documents` muestran llamada a `is_admin()` en su definición. |
| RLS activada sin políticas | INFO / 19 | [Revisar tablas sin políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy). Las tablas indicadas corresponden a familias `dt_*` y `helpdesk_*`, no una indicación de lectura pública en Aula EI. No crear políticas permisivas para silenciar avisos. |
| Índices sin lecturas observadas | INFO / 37 | [Revisar índices](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index) tras evidencia operativa suficiente; **ningún índice eliminado**. |

El `is_admin()` del esquema utiliza comprobaciones de actividad y AAL2 en la migración del proyecto. Eso no equivale a una prueba de penetración de todas las 33 funciones. Se requieren sesiones de prueba y cobertura de matrices de rol/RLS.

## Fase 8.3 — Continuidad

El procedimiento está en [runbook de recuperación](../runbooks/PHASE8_AULA_EI_RECOVERY_2026-10-08.md). Un validador local de destino impide apuntar accidentalmente al proyecto remoto. **No hay evidencia de un backup completo ni de restauración aislada efectuada**; la certificación de continuidad sigue pendiente.

## Fase 8.4 — Rendimiento, PWA y despliegue

Se limita la precarga especulativa de módulos a catálogo, desarrollo y plan, y se desactiva en conexiones 2G o con `saveData`. Juegos, entrenador, permisos legales, certificados y administración siguen en carga bajo demanda. El reproductor continúa precargándose al abrir la ruta correspondiente.

Se actualiza service worker PWA a `v7` con marcador `phase-8.4-2026-10-08`. El gate de tamaño mantiene los presupuestos: JavaScript inicial gzip máximo 220 KiB, CSS inicial 64 KiB y chunk JS único 300 KiB. **No declarar métricas de velocidad real** hasta medir dispositivos y conexión de usuarios.

## Estado de certificación

| Condición | Estado |
|---|---|
| Pruebas estáticas y públicas CI / CodeQL / dependencias de PR final | Verificar al completar el gate y release |
| Aislamiento de caché y errores de Inicio | Pruebas nuevas automatizadas; aceptación autenticada pendiente |
| Leaked Password Protection | Pendiente de configuración Auth |
| Auditoría exhaustiva 33 RPC y RLS por cada rol | Pendiente |
| Backup exportado, inventario Storage y restauración probada | Pendiente |
| Aceptación UI móvil y escritorio con varios perfiles | Pendiente |
| Release idéntico en Vercel/GitHub Pages | Verificar SHA tras despliegue |

**Conclusión:** Fase 8 implementa los correctivos verificables de frontend, un runbook y puertas automáticas. No hay evidencia suficiente para certificar globalmente seguridad, recuperación o experiencia con cuentas reales. Mantener estos pendientes explícitos y no modificar producción para fabricar una prueba.
