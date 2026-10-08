# Aula EI — Fase 6.5 | Cierre técnico y aceptación visual

**Fecha de corte:** 8 de octubre de 2026  
**Repositorio:** `Electroingenieria-SAS/AULA-EI`  
**Rama objetivo:** `main`  
**Entornos:** GitHub Pages `/AULA-EI/` y Vercel `aula-ei.vercel.app`

## Alcance implementado

- **Fase 6.2 / PR #104:** laboratorio de Juegos EI, tarjetas del entrenador, notificaciones y cuatro herramientas.
- **Corrección / PR #105:** encabezado de escritorio cargado en la hoja incondicional y campana en el flujo en vez de superpuesta.
- **Fase 6.3 / PR #106:** rediseño cohesivo de selector, contexto visible de ronda, tarjetas y jerarquía de Tutor, Repaso adaptativo, Insignias y Rutas.
- **Fase 6.4 / PR #107:** selección de primer tipo jugable, continuidad al finalizar y repetición voluntaria, reintento de consulta, lectura de estados accesible, bloqueo de edición de rondas finalizadas y semántica de pestañas.
- **Fase 6.5 / PR #107:** marcador de versión verificable `phase-6.5-2026-10-08`, invalidación de cache PWA v5, pruebas de contrato de rutas, responsive y compilación.

## Reglas de seguridad preservadas

El repaso utiliza únicamente contenidos autorizados y bloques completados, después de `get_my_course_route_access`, no consulta el banco de exámenes, no cambia calificaciones ni certificados y conserva contadores locales por usuario. Esta fase **no modifica** Supabase, políticas RLS, MFA ni migraciones. No se añadieron dependencias ni servicios de pago.

## Validación automática y evidencia

| Caso | Mecanismo | Resultado certificable |
|---|---|---|
| Validaciones de compilación y seguridad | GitHub Actions Build / CodeQL / Dependency Security | Registrar SUCCESS del SHA fusionado |
| Flujo de juegos y progreso local | `test:interactive-learning`, `test:intelligent-learning`, `test:phase64-experience` | Contratos de código y modelos |
| Encabezado y diseño responsive | `test:phase62-visual`, `check:mobile`, `check:controls`, `test:phase65-release` | Comprobación estática automatizada |
| Login y splash público | `scripts/smoke-browser.sh` en 320, 360, 390, 430, 768, 1024, 1280 y 1440 px | Navegador público, **sin autenticación** |
| Renovación de recursos PWA | `check:pwa`, worker `v5` e identificador en HTML | Contrato de actualización |
| Correspondencia GitHub Pages/Vercel | SHA de despliegue de ambos proveedores | Confirmar manualmente antes de aceptación |

## Casos que no deben darse por aprobados con CI público

Requieren una sesión **autorizada y de prueba** en cada rol pertinente, sin compartir contraseñas ni modificar datos oficiales:

1. Colaborador: entrar a Juegos EI, escoger una capacitación que contenga bloques completados; abrir memoria, clasificación, secuencia y decisión y verificar acierto, error, reinicio, avance y repetición.
2. Colaborador: recorrer las cuatro pestañas de Mi entrenador; consultar un tema estudiado, completar un repaso, comprobar insignias y abrir una recomendación habilitada.
3. Colaborador: comprobar que una capacitación no asignada o una ruta obligatoria bloqueada no se revela en tutor, juegos o recomendaciones.
4. Usuario creador/revisor: confirmar que la gestión editorial, cursos y vista de contenidos no cambiaron.
5. Admin/superadmin: comprobar MFA, notificaciones, certificados y políticas obligatorias sin alterar evidencias.
6. Móvil 320–430 px, tablet 768 px, portátil 1024 px, escritorio 1280/1440 px: observar el contenido real, botones y campana sin recortes, scroll horizontal ni overlays.
7. PWA instalada y navegador: actualizar, cerrar y volver a abrir; comprobar el cambio a v5, sin borrar datos de usuarios. Verificar versiones idénticas en ambos hosts.

**Estado de aceptación:** código sujeto a CI y a verificación de despliegues. **La aceptación visual con sesión real no puede inferirse del smoke público**. El control de continuidad/restore y observaciones de seguridad de la Fase 5 continúan independientes: no declarar una certificación global del LMS.

## Plan de reversión

Ante regresión real, revertir el PR que introdujo el cambio y repetir el gate antes de redeplegar el SHA anterior tanto en Pages como en Vercel. No restaurar ni modificar información de Supabase para solucionar un fallo visual.
