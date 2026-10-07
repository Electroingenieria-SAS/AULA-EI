# Inventario de almacenamiento local y tecnologías similares — AULA EI

Fecha de control: 2026-10-07

AULA EI no incorpora Google Analytics, Meta Pixel, Hotjar, Microsoft Clarity ni trackers publicitarios externos.

| Elemento | Tecnología | Proveedor | Finalidad | Necesidad | Duración / control |
|---|---|---|---|---|---|
| `aula-ei-auth` | Web Storage administrado por supabase-js | Supabase | Persistir sesión, tokens y renovación autenticada | Estrictamente necesaria | Mientras la sesión permanezca válida o hasta cerrar sesión/limpiar datos del sitio |
| `aula-ei-pwa-refresh-v2` | `sessionStorage` | AULA EI / navegador | Evitar bucles de recarga cuando cambia el Service Worker | Estrictamente necesaria para estabilidad PWA | Sesión del navegador |
| `aula-ei-pwa-v2-static` | Cache Storage / Service Worker | AULA EI / navegador | App shell, manifest, iconos y logo | Funcional / rendimiento | Se reemplaza al cambiar la versión de caché |
| `aula-ei-pwa-v2-runtime` | Cache Storage / Service Worker | AULA EI / navegador | Recursos same-origin cacheables y fallback de navegación | Funcional / resiliencia | Se reemplaza al cambiar la versión de caché o limpiar datos del sitio |
| Caché HTTP de assets | Caché del navegador | Navegador / hosting | Rendimiento de recursos versionados | Funcional | Según headers/versionado del recurso |

## Reglas

1. No se utilizará almacenamiento local para publicidad comportamental, identificación entre sitios o venta de perfiles.
2. Los datos de autenticación no deben copiarse a claves paralelas de almacenamiento creadas por módulos de AULA EI.
3. Un nuevo mecanismo no esencial requiere actualizar este inventario y evaluar si procede consentimiento previo.
4. Limpiar el almacenamiento del navegador puede cerrar sesión, eliminar preferencias o forzar la recarga de recursos.
5. El contenido sensible de negocio no debe persistirse manualmente en `localStorage` salvo que exista diseño, justificación y control específico.
