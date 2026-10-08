# Fase 9.1 — Automatización de formación por cargo y rutas

**Fecha:** 2026-10-08  
**Servicio:** Aula EI · Gestión → Formación y cumplimiento → Automatizaciones  
**Alcance:** UI de planificación, simulación, controles de ejecución, PWA v8 y eliminación de precarga global innecesaria.

## Diagnóstico de producción (consultas SQL solo lectura, 2026-10-08)

| Indicador observado en Supabase | Valor |
| --- | ---: |
| Reglas de automatización existentes | 6 |
| Reglas activas | 4 |
| Rutas activas | 3 |
| Relaciones cargo → ruta | 7 |
| Relaciones cargo → competencia | 13 |
| Cursos publicados vinculados a rutas | 0 |
| Relaciones curso → competencia | 0 |
| Personas activas con cargo `job_position_id` | 0 |
| Ejecuciones de automatización registradas | 18 |

El **motor real ya existía** (`admin_sync_training_engine`, `admin_set_user_job_position`, `admin_run_training_automations`). No se reemplazó, no se duplicaron procedimientos en base de datos, no se creó otra tarea cron ni nuevas consultas.

## Entrega

- Modelo puro `automation-readiness.js`: reconstruye una vista **orientativa** desde datos previamente cargados por ComplianceCenter y deduplica cursos por persona. Excluye colaboradores inactivos, rutas no activas, cursos no publicados, cursos opcionales y vínculos a cargos inexistentes.
- Panel `AutomationReadiness.jsx`: métricas, diagnóstico por pasos, vínculos a Cargos/Rutas, vista previa por colaborador, responsive y confirmación explícita.
- La sincronización institucional solo es accesible tras una vista previa válida y consentimiento, con confirmación adicional. Las llamadas oficiales del motor siguen sujetas a Auth/RLS/MFA y validación del servidor.
- El botón en Resumen ahora conduce a revisar la configuración. Se elimina el segundo botón de ejecución directa no revisada del listado de reglas.
- La ejecución manual de avisos y recertificaciones conserva las RPC originales y solicita confirmación.
- Script `test-phase91-automation.mjs` conectado al build con casos de matrícula única, condiciones bloqueantes, cursos sin publicar, optativos y ausencia de cargos.
- Sin servicios nuevos, sin gastos, sin acceso público a reportes administrativos.

## Qué NO hace la simulación

- No es una predicción exacta de matrículas. El motor PostgreSQL es responsable de desbloqueo secuencial, vigencia de evidencias, fechas definitivas, reactivaciones y unicidad de `enrollments(course_id,user_id)`.
- No emite certificados, no modifica evaluaciones, no matrícula a nadie mientras se visualiza la simulación.
- Las **excepciones individuales justificadas y persistentes** todavía requieren tabla/RPC administrativa con vigencia, motivo, responsable, auditoría y bypass controlado dentro del motor. No se simulan falsas exclusiones ni se altera el backend existente sin las pruebas de migración/restauración. Deben desarrollarse en un PR backend independiente antes de declarar esa capacidad completada.
- El hecho de tener 0 vínculos ruta-curso y 0 personas con cargo significa que **no existe información suficiente para asignaciones masivas efectivas ahora**. La interfaz presenta esos bloqueos, en vez de un mensaje de éxito engañoso.

## Cómo habilitar el circuito operativo

1. Asignar cargos a las personas autorizadas en **Cargos y personas** (solo Admin/Super Admin).
2. Revisar rutas obligatorias de cada cargo y seleccionar **Cursos de rutas** publicados, plazos y recertificación.
3. Configurar competencias, vincular cursos a las competencias cuando corresponda y activar exclusivamente las reglas institucionalmente aprobadas.
4. Entrar en **Automatizaciones**, validar que haya personas y capacitaciones candidatas, revisar la vista previa y confirmar.
5. Verificar la matriz de cumplimiento, matrícula efectiva, histórico de automatización y permisos con dos cuentas de prueba de distintos cargos.
6. Registrar evidencia de los resultados bajo la incidencia [#114](https://github.com/Electroingenieria-SAS/AULA-EI/issues/114). No declarar 8.5 certificada hasta completar los ensayos correspondientes.

## Advertencias de precarga

**Causa:** `index.html` usaba `<link rel="preload" as="image" href="%BASE_URL%brand/fondo.jpg" fetchpriority="high">` incluso al navegar por catálogo, cursos, privacidad, juego y entrenador. Esto producía avisos *resource was preloaded but not used*.

**Corrección:** PR #115 elimina exclusivamente el hint de preload global y actualiza los tests visuales. Los fondos institucionales continúan en los componentes `AuthVisualShell` y `LearnerShell`, solicitados cuando realmente se renderizan. Se conserva estilo/imagen. Versión PWA `v8` en este PR para invalidar los recursos de edición anterior.

**Aceptación:** comprobar el build, Chrome público en CI, CodeQL, dependencias y navegación autenticada real con DevTools. Los warnings históricos en la consola pueden continuar visibles si se preserva el registro; borrar consola/hacer hard reload y comprobar de nuevo. Si surgen warnings por preloads distintos, diagnosticarlos por separado.
