# Player de capacitación · Aula EI

Este módulo fuente reemplaza únicamente la experiencia del colaborador en:

```
/#/course/:courseId
```

El resto de Aula EI continúa usando el frontend operativo existente.

## Objetivo

Hacer que consumir una capacitación sea más claro, visual e interactivo sin cambiar el contrato académico ni el modelo de datos.

## Lógica preservada

- `courses`
- `course_phases`
- `content_blocks`
- `block_progress`
- `enrollments`
- RPC `get_exam_questions`
- RPC `submit_exam`

Los bloqueos secuenciales siguen dependiendo de contenidos obligatorios anteriores y el examen final solo se habilita cuando todos los contenidos obligatorios están completos.

## Experiencia

- hero con portada y progreso;
- mapa de fases y contenidos;
- continuar donde quedó;
- progreso general y por fase;
- visor de imágenes con lightbox y zoom;
- video, audio, presentaciones, archivos y enlaces;
- validaciones interactivas;
- navegación Anterior / Siguiente;
- examen final rediseñado;
- logros derivados del progreso real;
- animaciones de hitos y aprobación;
- certificado abierto en pestaña nueva.

## Logros

Los logros son visuales y se calculan a partir del progreso de la capacitación actual. No alteran el modelo académico ni requieren nuevas tablas.

## Build

```bash
npm run build
```

`scripts/wire-studio.mjs` detecta la ruta `/#/course/:id` y monta este bundle dentro del mismo `#root`.
