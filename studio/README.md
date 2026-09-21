# Gestión Aula EI · módulo administrativo integrado

Este directorio contiene el código fuente mantenible del módulo de Gestión de Aula EI.

## Integración

Gestión **no es una segunda aplicación visible**. El usuario entra por la ruta normal de Aula EI:

```
/#/studio
```

El build genera internamente los recursos React/Vite del módulo en `dist/studio/assets`. `scripts/wire-studio.mjs` decide qué bundle montar en el mismo `#root`:

- cualquier ruta normal de Aula EI carga el frontend operativo endurecido;
- `#/studio` carga el módulo administrativo fuente;
- al cruzar entre ambos contextos, el bootstrap recarga únicamente una vez para evitar dos árboles React simultáneos.

El módulo administrativo reproduce el mismo shell de Aula EI: sidebar, tarjeta de usuario, Inicio, Mis capacitaciones, Juegos EI, Gestión y navegación móvil.

## Centro de Asignaciones

El flujo masivo permite:

1. seleccionar una capacitación publicada;
2. buscar y filtrar personas por nombre, correo, rol, estado de cuenta y estado de matrícula;
3. seleccionar una página, todos los resultados filtrados o importar una lista de correos/CSV;
4. decidir cómo tratar la fecha límite;
5. asignar o actualizar en lote.

Las matrículas existentes preservan su `status` y progreso. Las matrículas `completed` no se cancelan desde este módulo.

## Build

```bash
npm run build
```

El resultado completo se publica desde `dist/`.
