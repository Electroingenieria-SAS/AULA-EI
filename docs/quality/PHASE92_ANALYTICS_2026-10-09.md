# Aula EI — Fase 9.2: analítica segmentada y exportación ejecutiva

**Fecha:** 9 de octubre de 2026.  
**Acceso:** Gestión → Formación y cumplimiento → Analítica, exclusivamente bajo autenticación y control administrativo existente.

## Qué se agrega

- Panel comparativo por **dependencia/área y cargo** usando `positions` y `admin_training_compliance_rows` que **ya fueron consultados por ComplianceCenter**. No se añaden consultas Supabase ni nuevas tablas, funciones, cron o servicios de pago.
- Métricas actuales por ámbito: requisitos únicos persona-curso, conformes, en riesgo (vencidos/expirados/por vencer), pendientes y sin matrícula. Se identifica el denominador expresamente; un curso requerido en dos rutas del mismo usuario solo cuenta una vez.
- Ordenación por vencimientos/riesgos para identificar prioridades. Filtros dependientes área→cargo, útiles en equipos pequeños y pantallas móviles.
- Descargas **CSV** con protección frente a fórmulas de hoja de cálculo y **PDF** generado bajo demanda mediante la dependencia `jspdf` existente.
- Protección de grupos pequeños: si hay menos de tres personas en un ámbito, no se muestra ni exporta desglose numérico. Ningún export contiene nombres, correos, UUID, notas ni respuestas individuales.
- CSS responsive de la pantalla administrativa, sin cambios al CSS público de login y sin engordar innecesariamente los paquetes iniciales. PWA `v9` y metadato de release `phase-9.2-2026-10-09`.
- Suite `test:phase92-analytics` integrada al build: pares únicos, filtros, riesgos, datos vacíos, confidencialidad de grupos pequeños, CSV malicioso, PDF diferido, ninguna RPC nueva y contrato de integración.

## Componentes previos conservados

El tablero `AnalyticsWorkbench.jsx` permanece intacto: finalización y notas, aprobación por intento, indicadores globales, hallazgos por pregunta/bloque, filtros de muestra y exportación pedagógica. El nuevo tablero es complementario; **no suma indicadores globales de cursos para presentarlos como si fueran porcentajes específicos por cargo**.

La función `admin_training_compliance_rows()` del servidor comprueba sesión y `is_admin()`. Consultada sin contexto de administrador, devolvió `Acceso denegado`, comportamiento esperado. Sus columnas inspeccionadas incluyen `user_id`, `position_id`, `course_id`, `compliance_state`, sin área; el área se obtiene de `job_positions.department`, ya disponible en la pantalla administrativa. No se intentaron lecturas privadas no autorizadas.

## Limitaciones y aceptación

- **Estado observado previamente:** cero usuarios activos con cargo y cero cursos vinculados a rutas. Por tanto, el panel puede mostrar correctamente ausencia de requisitos y no inventa cumplimiento del 100 %.
- **Histórico real:** NO IMPLEMENTADO en esta entrega. Para comparar periodos y tendencias se requieren snapshots agregados persistidos y custodiados, una política de retención, una estrategia de conciliación y validación temporal. No usar fechas de publicación ni histogramas ficticios como tendencias.
- No se certifica todavía la experiencia autenticada real de todos los roles ni se ejecuta ensayo de restauración; continúan las [pruebas institucionales pendientes](https://github.com/Electroingenieria-SAS/AULA-EI/issues/114).
- El PDF generado con jsPDF emplea fuentes estándar embebidas y puede simplificar algunas tildes/caracteres especiales. El archivo CSV conserva texto UTF-8.
- Comprobar los filtros de área y cargo, una cohorte de menos de tres integrantes, salida CSV/PDF en Android y escritorio, bloqueo de rol no admin, y que los KPIs no cambian calificaciones ni matrículas.

**Criterio técnico de cierre:** PR fusionado solo después de Build, Browser smoke, CodeQL y Dependency Security aprobados; despliegue GitHub Pages + Vercel al mismo SHA verificado.
