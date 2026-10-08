# Fase 7 — Evolución de la experiencia formativa

**Inicio:** 2026-10-08  
**Repositorio:** Electroingenieria-SAS/AULA-EI  
**Despliegue:** PR → gate completo (build/navegador/CodeQL/dependencias) → main → GitHub Pages + Vercel mismo SHA

## Alcance y estado

| Entrega | Producto | Estado |
| --- | --- | --- |
| 7.1 | Mi plan de formación: prioridades, fechas, filtros, progreso, rutas bloqueadas, actualización | PR #108 fusionado, pendiente de aceptación visual autenticada |
| 7.2 | Seguimiento y avisos: filtros, urgencias, navegación a plan, polling existente de 180 s | PR #109 fusionado, despliegue consolidado sujeto a gate final |
| 7.3 | Seguimiento institucional dentro de la matriz administrativa existente | Implementado en PR #110, sujeto a validación |
| 7.4 | QA integrada, smoke público con reintento estricto, PWA v6 y publicación coordinada | Implementado en PR #110, sujeto a validación |

## Criterios de Fase 7.1

- Proyección **solo lectura** desde \`get_my_home_snapshot\` con caché compartida 45 s, recarga explícita y manejo de error.
- Priorización: vencido → próximo a vencer (7 días) → en curso → pendiente con fecha → pendiente sin fecha → bloqueado → cumplido.
- Las rutas institucionales obligatorias **bloqueadas tienen precedencia sobre una asignación visible**; no se ofrece botón para abrirlas.
- El jugador de cursos sigue validando acceso con los controles existentes, sin confiar en la UI.
- Los filtros muestran estados reales; los cursos sin asignación no se inventan y una fecha de vencimiento no equivale a caducidad de un certificado.
- El responsive de 320 a 1440 px debe ser revisado con sesión autenticada. La barra móvil conserva el número de opciones existente.
- No modifica notas, certificados, preguntas de exámenes, perfiles ni registro oficial; no añade servicios de pago ni tablas.

## Validación

Las pruebas automáticas de fase 7.1 verifican prioridades, permisos bloqueados, acceso desde inicio y desarrollo, rutas, CSS lazy y ausencia de mutaciones a calificaciones. Build y browser smoke prueban el login público.

**Cierre pendiente:** la aceptación visual/funcional de Fase 6 y de esta Fase 7.1 requiere un usuario de prueba autenticado con varios cursos (vencido, futuro, bloqueado, cumplido) y revisión manual de móvil/desktop. No afirmar “certificado” sin ello. Los pendientes de seguridad y restauración de Fase 5 siguen siendo independientes.


## Fase 7.2 — Control de alertas

No se realizan nuevas consultas ni procesos de notificación. Las prioridades son una clasificación local de \`training_notifications\` **ya autorizadas**, y solo se etiquetan como urgentes los avisos sin leer, asociados a curso o ruta y con fecha válida dentro de 7 días o vencida. Los avisos sin ruta ni curso mantienen su acción original.

## Fase 7.3 — Gestión de seguimiento

Las tarjetas de casos se insertan **dentro del ComplianceCenter** que ya limita acceso a \`admin\` y \`super_admin\`. Agrupan exclusivamente filas devueltas por \`admin_training_compliance_rows\` y autorizadas por la RLS/RPC del sistema. No se añade acceso global a supervisores ni se usa una unión de datos fuera del contrato autorizado. Se priorizan requisitos vencidos, por vencer y pendientes; un clic filtra la matriz existente.

## Fase 7.4 — Puerta de producción

El service worker utiliza cache v6 y el HTML público incorpora \`aula-ei-release=phase-7.4-2026-10-08\`. El smoke de Chrome en los ocho viewports reintenta hasta tres veces únicamente si no logra **validar todas las condiciones de DOM**. Tres intentos fallidos continúan bloqueando producción.

Los nuevos gates de Fase 7.1–7.4 deben estar en SUCCESS, junto con CodeQL, dependencias, GitHub Pages y Vercel. La aceptación **autenticada** sigue sin poder afirmarse sin un usuario de pruebas autorizado. Persisten, separadamente, los hallazgos de la Fase 5 sobre contraseña filtrada y restauración aislada.
