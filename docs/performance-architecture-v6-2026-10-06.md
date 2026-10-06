# Aula EI · Performance & Architecture v6

Fecha: 2026-10-06  
Rama: `perf/fluid-navigation-architecture-v6-2026-10-06`  
Base: `main@2f7b7af`

## Objetivo

Reducir la latencia perceptual entre pantallas y herramientas, eliminar trabajo decorativo continuo del navegador y dividir los principales monolitos de React/CSS sin modificar contratos de autenticación, RLS ni persistencia de Supabase.

## Hallazgos de rendimiento

1. Gestión Aula EI combinaba `flushSync`, View Transitions API y una animación CSS adicional sobre el mismo cambio de pestaña.
2. La navegación principal capturaba la pantalla mediante `document.startViewTransition` aunque la shell ya permanecía montada.
3. `ExperienceLayer` observaba continuamente `document.body` para encontrar elementos decorativos nuevos.
4. Player mantenía fades de página completos, fondos ambientales animados indefinidamente y transiciones que incluían `filter`.
5. Algunos chunks pesados, especialmente CoursePlayer y herramientas de Studio, se descargaban únicamente al primer clic.
6. Los principales controladores mezclaban persistencia, estado, formularios, overlays y presentación en archivos de cientos o más de mil líneas.

## Cambios de fluidez

- Navegación por hash directa sin captura de pantalla completa.
- Studio usa `startTransition` de React para diferir renders pesados sin bloquear la respuesta al clic.
- Herramientas de Studio se precargan durante tiempo ocioso.
- CoursePlayer también se precarga en idle.
- Se eliminó el observer global de mutaciones/reveals y se dejó un escaneo decorativo puntual, agrupado por `requestAnimationFrame`.
- Se eliminaron fades globales de página de 420 ms e infinitas animaciones ambientales.
- La barra de progreso de ruta se redujo a una transición corta.
- Controles deshabilitados usan opacidad en vez de filtros de saturación.
- La transición de herramientas de Studio quedó limitada a una microtransición de opacidad/translate3d.

## Refactor estructural

| Área | Antes | Después: controlador principal |
| --- | ---: | ---: |
| `src/App.jsx` | ~21.4 KB | ~5.6 KB |
| `studio/src/App.jsx` | ~9.7 KB | ~5.7 KB |
| `studio/src/CoursesManager.jsx` | ~66.3 KB / 1428 líneas | ~12.6 KB / 288 líneas |
| `player/src/CoursePlayer.jsx` | ~55.2 KB / 1151 líneas | ~26.4 KB / 581 líneas |
| `studio/src/ComplianceCenter.jsx` | ~40.5 KB / 815 líneas | ~16.8 KB / 424 líneas |
| `studio/src/UsersManager.jsx` | ~34.5 KB / 634 líneas | ~26.3 KB / 519 líneas |
| `studio/src/styles.css` | ~105.4 KB | 5 módulos por dominio |
| `player/src/styles.css` | ~136.4 KB | 6 módulos por dominio |

### Nuevos módulos principales

- `src/auth/AuthScreens.jsx`
- `src/async-utils.js`
- `studio/src/studio-modules.js`
- `studio/src/useStudioData.js`
- `studio/src/StudioLoading.jsx`
- `studio/src/course-editor/CourseBuilder.jsx`
- `studio/src/course-editor/CourseBuilderPanels.jsx`
- `studio/src/course-editor/ExamBuilder.jsx`
- `studio/src/course-editor/course-utils.js`
- `studio/src/users/UserPanels.jsx`
- `studio/src/users/user-utils.js`
- `studio/src/compliance/CompliancePanels.jsx`
- `player/src/course-player/CourseContentViews.jsx`
- `player/src/course-player/CoursePlayerViews.jsx`

## CSS modular

Studio conserva la cascada original en este orden:

1. `styles/core.css`
2. `styles/users.css`
3. `styles/certificates.css`
4. `styles/courses.css`
5. `styles/compliance.css`

Player conserva la cascada original en este orden:

1. `styles/core.css`
2. `styles/course.css`
3. `styles/catalog.css`
4. `styles/shell.css`
5. `styles/modules.css`
6. `styles/notifications.css`

La separación fue textual; no se reordenaron selectores entre módulos.

## Depuración de archivos y código muerto

El árbol base versionado contiene 104 archivos y no mostró candidatos verificables de basura como `.bak`, `.old`, `.tmp`, `.swp`, `.DS_Store`, `dist`, `node_modules` o copias/backups. Por seguridad no se eliminaron documentos, migraciones ni recursos históricos legítimos.

Sí se retiró código obsoleto o redundante:

- View Transitions de pantalla completa.
- `flushSync` para cambios de herramienta.
- observers decorativos globales.
- animaciones ambientales infinitas.
- fade global redundante de páginas.
- filtros animados generales.
- los dos stylesheets monolíticos, reemplazados por módulos.

## Gates incorporados

`check:architecture` ahora impone presupuestos de tamaño a shells, controladores, paneles y hojas CSS, exige la nueva estructura modular y rechaza el retorno de los antiguos `player/src/styles.css` y `studio/src/styles.css`.

`check:performance`, `check:motion`, `check:visual` y `check:mobile` fueron adaptados para la nueva estructura y protegen contra la reintroducción de View Transitions completas, `flushSync`, observers globales y animaciones costosas.

## Seguridad y datos

No se modificaron políticas RLS, roles, RPC, MFA ni la semántica de autenticación. La lectura principal de sesión continúa centralizada en `src/App.jsx`; la recuperación de contraseña conserva el token de recuperación en estado local en vez de volver a consultar la sesión desde una segunda pantalla.

## Validación

La ejecución local completa de `npm ci && npm run build` no pudo realizarse desde el entorno de trabajo porque no dispone de resolución de red hacia GitHub para clonar la rama. La validación definitiva debe provenir del pipeline del repositorio/Vercel al abrir el pull request, que ejecuta los gates del `build` antes de aceptar el despliegue.
