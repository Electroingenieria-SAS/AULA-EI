# Gestión Aula EI · fuente mantenible

Este directorio contiene el panel administrativo fuente de Aula EI. Se publica en `/studio/` y utiliza el mismo proyecto Supabase y los mismos contratos de datos del frontend operativo.

## Centro de Asignaciones

El módulo reemplaza el flujo unitario anterior por un flujo masivo y reversible:

1. seleccionar una capacitación publicada;
2. buscar o filtrar personas por nombre, correo, rol, estado de cuenta y estado de matrícula;
3. seleccionar una página, todos los resultados filtrados o importar una lista de correos/CSV;
4. definir cómo tratar la fecha límite;
5. asignar/actualizar en lote.

Las matrículas existentes mantienen su `status` cuando están activas, por lo que una actualización de fecha no reinicia progreso. Las escrituras se dividen en lotes para evitar solicitudes excesivamente grandes. Las matrículas `completed` no se cancelan desde el Centro de Asignaciones.

## Integración con el frontend operativo

El build conserva el bundle endurecido actual para la experiencia de colaboradores. Después de construir ambos frontends, `scripts/wire-studio.mjs` genera un bootstrap pequeño: `#/studio` se deriva a `/studio/`; el resto de rutas carga el bundle operativo sin cambios funcionales.

## Build

```bash
npm run build
```

El resultado completo se genera en `dist/`.
