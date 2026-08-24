# Arquitectura del repositorio

## Vista general

```text
Aula-EI/
├── index.html                 # Entrada de la aplicación
├── 404.html                   # Respaldo SPA para GitHub Pages
├── assets/                    # Build activo: un JS y un CSS
├── brand/                     # Cuatro recursos usados por el build
├── supabase/
│   ├── functions/             # Edge Functions mantenibles
│   ├── diagnostics/           # Consultas de soporte de solo lectura
│   ├── migrations/            # Lugar para migraciones futuras validadas
│   └── reference-sql/         # Parches históricos, no ejecutar en bloque
├── legacy/source-fragments/   # Código fuente incompleto recibido
├── docs/                      # Manuales del equipo
├── scripts/                   # Servidor y validación local
└── .github/workflows/         # Validación automática de Pull Requests
```

## Componentes funcionales

| Componente | Responsabilidad | Dependencia principal |
| --- | --- | --- |
| Aplicación web estática | Interfaz, sesión, cursos, exámenes y certificados | `index.html` + build en `assets/` |
| Supabase Auth | Inicio de sesión y usuarios | Proyecto configurado en el build |
| Data API | Cursos, fases, contenido, matrículas, progreso y preguntas | Tablas `public.*` con RLS |
| RPC de PostgreSQL | Exámenes, perfiles, certificados y firmas | Funciones `public.*` |
| Supabase Storage | Archivos de capacitaciones | Bucket privado `course-assets` |
| Edge Functions | Creación y eliminación jerárquica de usuarios | `create-managed-user`, `delete-managed-user` |

## Contrato observado en el frontend

El build activo consume directamente:

- Tablas: `profiles`, `courses`, `course_phases`, `content_blocks`, `enrollments`, `block_progress`, `questions` y `question_options`.
- RPC del build activo: `set_user_role`, `get_exam_questions`, `submit_exam`, `get_my_certificates`, `get_certificate_by_code`, `admin_certificate_ranking`, `admin_completed_without_certificate`, `admin_generate_certificate`, `get_certificate_signatures`, `save_certificate_signature` y `clear_certificate_signature`.
- RPC del fragmento fuente posterior: `get_my_profile`.
- Storage: bucket `course-assets`.
- Edge Functions: `create-managed-user` y `delete-managed-user`.

La lista completa para soporte está en [../supabase/diagnostics/FRONTEND_CONTRACT.md](../supabase/diagnostics/FRONTEND_CONTRACT.md).

## Limitación actual

El ZIP recibido no contiene el árbol fuente completo de React/Vite. Los archivos en `legacy/source-fragments/` importan módulos que no existen en el paquete. Por eso:

- La versión estática puede publicarse y probarse.
- Logos y archivos de soporte pueden mantenerse.
- La lógica del frontend no debe editarse manualmente en el JavaScript minificado. La mejora excepcional de eliminación se reproduce con `scripts/patch-user-deletion.mjs` mientras se recupera el fuente original.
- Para desarrollo normal debe recuperarse el repositorio fuente que produjo el build activo.
