# Aula EI · Auditoría Mobile First v2

Fecha: 22 de septiembre de 2026.

## Objetivo
Convertir la experiencia móvil en una interfaz de primera clase, no en una versión reducida del escritorio.

## Arquitectura implementada
- Capa canónica `src/mobile.css` cargada al final del sistema visual.
- `MobileViewportSync` usa `visualViewport` para conocer alto/ancho útil y apertura del teclado.
- Variables CSS `--mobile-vh`, `--mobile-vw`, `--mobile-keyboard-height`.
- Safe areas iOS mediante `viewport-fit=cover` y `env(safe-area-inset-*)`.
- Breakpoint principal: 900 px; ajustes adicionales a 600 px, 420 px y landscape bajo.

## UX móvil
- Bottom navigation estable con feedback háptico cuando el navegador/dispositivo lo permite.
- La navegación inferior se oculta al abrir el teclado para no cubrir formularios.
- Centro de notificaciones convertido en bottom sheet.
- Inicio, catálogo y juegos en una sola columna con CTA táctiles.
- Filtros, búsquedas y selects a ancho completo.
- Inputs de 16 px mínimo para evitar zoom involuntario en iOS.

## Reproductor
- Topbar compacta y sticky.
- Ruta de contenidos como bottom sheet.
- Práctica rápida como bottom sheet.
- Navegación Anterior/Siguiente sticky sobre la barra inferior.
- Contenido y progreso en una sola columna.
- Targets táctiles mínimos de 44 px.

## Gestión
- Hero compacto.
- Navegación administrativa sticky y horizontal.
- Actualizar reducido a acción táctil de icono.
- Métricas en 2 columnas.
- Filtros y toolbars apilados.
- Cursos y pendientes en una columna.
- Acciones masivas sticky sobre la navegación inferior.

## Tablas
Usuarios, Asignaciones y Certificados cambian de tabla horizontal a tarjetas legibles:
- cada celda incluye etiqueta;
- acciones siempre accesibles;
- selects y estados ocupan ancho útil;
- paginación adaptada.

## Modales y drawers
- Creación de usuarios/cursos abre como bottom sheet.
- Detalle de usuario/certificado abre como sheet casi full-screen.
- Headers sticky.
- Scroll interno controlado.
- Certificados incorporan Web Share API en dispositivos compatibles.

## Orientación horizontal
En landscape móvil:
- se reduce chrome vertical;
- login vuelve a dos columnas cuando cabe;
- navegación inferior disminuye altura;
- hero de Gestión compacta descripción.

## Reglas
- No modificar la versión desktop con reglas mobile.
- No usar tamaños táctiles menores a 44 px en acciones primarias.
- No fijar controles debajo del teclado.
- Toda nueva tabla administrativa debe tener estrategia card/mobile.
- Toda nueva modal debe contemplar bottom-sheet móvil.
