# Aula EI · Performance & Security v4

Fecha: 22 de septiembre de 2026.

## Objetivos
Reducir tiempo de apertura, tráfico de red y superficie de carga sin debilitar RLS, MFA/AAL2 ni la trazabilidad ya implementada.

## Cambios de rendimiento
- Code splitting con React.lazy para Learner, Certificados, Studio y rutas pesadas.
- CSS de Player, Studio y Certificados se carga con su módulo, no en el login.
- Herramientas de Studio se cargan por pestaña.
- Studio abre inicialmente solo con cursos; perfiles y matrículas se consultan únicamente donde son requeridos.
- Inicio usa `get_my_home_snapshot()`: 3 lecturas de red pasan a 1.
- Catálogo usa `get_my_catalog_snapshot()`: 4 lecturas de red pasan a 1.
- Caché en memoria con TTL corto e invalidación al cerrar sesión.
- La caché de Inicio/Catálogo se invalida inmediatamente al completar contenido o enviar un examen.
- URLs firmadas de Storage se agrupan con `createSignedUrls()`, se deduplican y se mantienen en memoria hasta poco antes de expirar.

## Build y supply chain
- `package-lock.json` generado por GitHub Actions.
- El deploy usa `npm ci`.
- GitHub Actions usa caché de npm.
- `npm audit --omit=dev --audit-level=high` bloquea vulnerabilidades altas/críticas de dependencias de producción.
- Presupuesto automático de bundle basado en tamaño gzip.
- Manifest de Vite disponible para medir el grafo inicial y chunks dinámicos.

## Seguridad en GitHub Pages
Se añadió Content Security Policy mediante `<meta http-equiv="Content-Security-Policy">`, restringiendo scripts, conexiones, iframes, objetos y orígenes de recursos.

Limitación: GitHub Pages no permite configurar desde este repositorio todos los headers HTTP de seguridad equivalentes a un servidor propio (por ejemplo HSTS y `frame-ancestors` vía meta). CSP en documento protege las directivas compatibles; MFA, RLS y autorización permanecen del lado de Supabase.

## Medición inicial de snapshots
En prueba autenticada sobre la base productiva:
- `get_my_home_snapshot()`: ~31 ms de ejecución PostgreSQL.
- `get_my_catalog_snapshot()`: ~127 ms de ejecución PostgreSQL.

La reducción principal es de round trips: Inicio 3 → 1 y Catálogo 4 → 1.
