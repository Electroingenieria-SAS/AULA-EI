# Informe de auditoría técnica

Fecha: 23 de agosto de 2026  
Alcance: estructura del ZIP, paquete estático activo, referencias, configuración pública, fragmentos fuente, SQL histórico y Edge Function.

## Resultado general

La versión estática activa fue preservada y organizada. El único cambio funcional es la eliminación jerárquica de usuarios solicitada. El JavaScript supera la comprobación sintáctica, `index.html` y `404.html` son idénticos y todas las referencias locales activas existen.

La conexión de Supabase fue corregida y la auditoría se ejecutó sobre `ipoidimevokogptydbvt`, que estaba `ACTIVE_HEALTHY`. Se desplegó únicamente `delete-managed-user`, versión 1, activa y con verificación JWT. No se eliminó ningún usuario real.

## Mejora funcional implementada

La autorización se aplica dos veces: la interfaz solo ofrece la acción cuando corresponde y la Edge Function vuelve a verificar la sesión y los roles actuales en `public.profiles`.

| Rol que ejecuta | Puede eliminar | No puede eliminar |
| --- | --- | --- |
| Super Admin | Admin, Revisor, Creador de contenido, Colaborador | Otro Super Admin o su propia cuenta |
| Admin | Revisor, Creador de contenido, Colaborador | Admin, Super Admin o su propia cuenta |
| Otros | Nadie | Cualquier usuario |

El control del servidor es la fuente de verdad; manipular el botón o la solicitud del navegador no permite saltar la jerarquía.

## Estado real de Supabase

- `profiles`: 74 perfiles, con RLS habilitado; roles vigentes `colaborador`, `creador_contenido`, `revisor`, `admin` y `super_admin`.
- Edge Functions: `create-managed-user` versión 6 y `delete-managed-user` versión 1, ambas activas y con JWT obligatorio.
- Historial de migraciones visible: una migración (`fix_auth_boot_profile_rpc`). El repositorio recibido no contiene un historial completo reconciliado.
- Advisors: 56 avisos de seguridad y 47 de rendimiento preexistentes. Se documentaron, pero no se aplicaron cambios masivos fuera del alcance autorizado.

## Hallazgos

| Prioridad | Hallazgo | Estado/acción |
| --- | --- | --- |
| Crítica | Dos scripts históricos toman el rol desde `raw_user_meta_data.managed_role`, campo editable por el usuario. | Los scripts quedaron aislados como referencia. El esquema vivo normaliza el perfil mediante lógica server-side; cualquier migración futura debe conservar ese control. |
| Crítica | Los SQL históricos de firmas permiten variantes de permisos incompatibles. | No se ejecutaron. Debe contrastarse la función viva y probarse por rol antes de una migración. |
| Alta | El contenido HTML de bloques se renderiza con `dangerouslySetInnerHTML` sin sanitización observable en el build. Un contenido malicioso puede causar XSS y acceder a la sesión. | Requiere recuperar el fuente y sanitizar con una lista permitida. |
| Alta | Los SQL históricos alternan roles en inglés y español y redefinen `is_admin`, `handle_new_user`, restricciones y políticas con reglas distintas. | Aislados en `supabase/reference-sql/`; no ejecutar en bloque. |
| Alta | `audit_logs` aparece con dos diseños incompatibles (`uuid` frente a `bigint`, y `uuid` frente a `text` en `entity_id`). | Comparar con el esquema vivo antes de crear una migración consolidada. |
| Alta | Advisors reporta 26 funciones `SECURITY DEFINER` ejecutables por `anon` y 26 por `authenticated`. | Documentado para una fase de endurecimiento en rama; no se revocaron permisos a ciegas en producción. |
| Media | `write_audit_log` no valida rol y la Edge Function ignora su posible error. | Restringir ejecución, validar el resultado y definir una política de auditoría. |
| Media | La función desplegada `create-managed-user` debe mantener compensación si falla el perfil. | La versión viva revisada incluye validación del llamador y creación controlada; conservar estas garantías en futuros despliegues. |
| Media | No hay esquema inicial ni historial completo de migraciones en el ZIP. | Recuperar `supabase/migrations` desde el repositorio fuente o conciliarlo con producción. |
| Media | El proyecto fuente React/Vite está incompleto y no puede reconstruirse. | Fragmentos movidos a `legacy/source-fragments/`; recuperar el repositorio original. |
| Baja | Faltaba `.nojekyll` aunque todas las instrucciones lo exigían. | Resuelto. |
| Baja | Había decenas de builds antiguos y 14 instrucciones repetidas en la raíz. | Resuelto y consolidado. |

## Limpieza realizada

- Eliminados 48 archivos no referenciados de builds anteriores en `assets/`.
- Eliminados 10 medios no referenciados por el build activo.
- Eliminados 14 archivos de instrucciones repetitivas después de consolidar su contenido.
- Conservados únicamente el JS y CSS enlazados por `index.html`.
- Conservados únicamente los cuatro recursos de `brand/` referenciados por el HTML, JS o CSS activo.
- Movidos siete SQL históricos a una zona de referencia explícitamente no ejecutable en bloque.
- Movida la Edge Function a la estructura estándar `supabase/functions/create-managed-user/index.ts`.
- Movidos tres fragmentos fuente incompletos a `legacy/source-fragments/`.

El ZIP original se mantuvo aparte, por lo que todo archivo retirado puede recuperarse desde el paquete de entrada.

## Controles añadidos

- `npm run verify`: comprueba archivos, referencias, igualdad de `index`/`404`, sintaxis del bundle y posibles secretos públicos.
- `npm run dev`: levanta el sitio localmente sin instalar dependencias.
- Flujo de GitHub Actions para validar cada Pull Request.
- Manuales de edición, despliegue, reversión y soporte.
- Diagnóstico SQL de solo lectura y contrato esperado por el frontend.
- Verificación automática del contrato de eliminación jerárquica en el bundle activo.
- Edge Function autenticada que impide autoeliminación y objetivos de nivel igual o superior.

## Próximo paso recomendado

Recuperar el proyecto fuente React/Vite original y trasladar allí la mejora reproducible de `scripts/patch-user-deletion.mjs`. Después, preparar en una rama de Supabase una fase separada para los Advisors, con pruebas de regresión por rol antes de tocar producción.
