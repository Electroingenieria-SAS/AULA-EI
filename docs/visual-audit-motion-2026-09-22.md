# Aula EI · Auditoría visual y sistema de movimiento

Fecha: 22 de septiembre de 2026.

## Diagnóstico

La interfaz tenía buena identidad visual, pero la riqueza de movimiento estaba desbalanceada:
- Player contaba con una capa avanzada de animaciones y microinteracciones.
- Gestión tenía menos transiciones y varios paneles se percibían más estáticos.
- Modales, drawers, tablas, métricas y mensajes usaban timings distintos.
- El scroll reveal estaba concentrado en unas pocas secciones.
- La navegación cambiaba de ruta sin aprovechar View Transitions cuando el navegador las soportaba.

## Mejoras implementadas

### Sistema común
- Tokens compartidos de duración y easing.
- Reveal escalonado sin alterar layout.
- Hover de paneles con profundidad moderada.
- Feedback de presión en botones.
- Transición coherente para inputs y focus.
- Respeto completo por `prefers-reduced-motion`.

### Gestión
- Entrada fluida por pestaña.
- View Transition nativa progresiva entre herramientas.
- Paneles, métricas, tarjetas de curso, cumplimiento y certificados incluidos en reveal.
- Modales con entrada suave.
- Drawers con desplazamiento lateral controlado.
- Mensajes y barras de selección con entrada consistente.
- Tablas con hover más claro y encabezados ordenables con feedback.
- Chips/estados con microinteracción.
- Plantillas y selectores de curso con elevación moderada.
- Flujo de cumplimiento con feedback direccional.
- Métrica del hero con movimiento ambiental sutil.

### Player
- Navegación hash convertida a History API para que View Transitions capture correctamente el cambio.
- La ruta visual puede usar transición nativa cuando existe soporte.
- Se mantiene el fallback CSS.
- La aparición por scroll queda centralizada y no duplicada.

### Rendimiento y estabilidad
- Todas las animaciones principales usan opacity/transform.
- No se animan width/height del layout principal.
- En móvil se reduce desplazamiento y se prioriza fade.
- No se añade dependencia externa de animación.
- Los usuarios con reduced-motion reciben una experiencia estática y accesible.

## Oportunidades visuales siguientes

1. Animaciones de gráficas y KPI basadas en datos reales al entrar a Analítica.
2. Onboarding contextual de primera visita con spotlight sobre funciones importantes.
3. Empty states ilustrados/animados propios de Aula EI.
4. Transiciones de progreso al completar competencias y rutas.
5. Microcelebraciones controladas para certificados, cursos completados y logros.
6. Tooltips inteligentes para iconos administrativos densos.
7. Densidad adaptable en tablas según ancho de pantalla.
8. Temas visuales por tipo de capacitación o dependencia, manteniendo identidad institucional.

Estas mejoras deben implementarse únicamente si aportan información o feedback; no como movimiento decorativo permanente.
