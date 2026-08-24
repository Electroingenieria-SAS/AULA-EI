# Manual de soporte de Supabase

## Identificación del entorno

El build estático recibido apunta al proyecto con referencia:

```text
ipoidimevokogptydbvt
```

Antes de cualquier soporte, confirma que el panel, la CLI o la conexión utilizada tengan exactamente esa referencia. La conexión fue corregida el 23 de agosto de 2026 y se verificó el proyecto esperado: estado `ACTIVE_HEALTHY`, organización `uvoobndkcrchttedthcd`, región `us-east-1` y PostgreSQL 17.

## Primera revisión

1. Abre el proyecto correcto.
2. Ejecuta `supabase/diagnostics/healthcheck.sql` en SQL Editor. Solo contiene consultas de lectura.
3. Revisa Database → Advisors → Security.
4. Revisa Database → Advisors → Performance.
5. Revisa Edge Functions → `create-managed-user` y `delete-managed-user` → Logs.
6. Revisa Authentication → URL Configuration y los dominios autorizados.
7. Comprueba que el bucket `course-assets` sea privado.
8. Exporta o registra las migraciones que realmente figuran aplicadas en producción.

## Variables y llaves

| Ubicación | Permitido | Prohibido |
| --- | --- | --- |
| Frontend | URL del proyecto y publishable key | secret key o `service_role` |
| Edge Function | Variables administradas por Supabase | secretos escritos en el repositorio |
| GitHub | Nombres públicos y documentación | `.env`, contraseñas, tokens personales |

La publishable key visible en un frontend es esperada siempre que RLS y los permisos sean correctos. La llave `service_role` evita RLS y nunca debe llegar al navegador.

## Edge Function `create-managed-user`

Código: `supabase/functions/create-managed-user/index.ts`.

Para desplegarla desde una CLI autenticada en el proyecto correcto:

```bash
supabase functions deploy create-managed-user --project-ref ipoidimevokogptydbvt
```

La función debe conservar verificación JWT y las variables administradas `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`. Después del despliegue prueba:

- un colaborador recibe 403;
- un administrador crea solo roles permitidos;
- un superadministrador no puede crear otro superadministrador desde ese formulario;
- si falla la creación del perfil, no queda un usuario huérfano en Auth;
- el evento de auditoría queda registrado.

## Edge Function `delete-managed-user`

Código: `supabase/functions/delete-managed-user/index.ts`.

Estado verificado en producción el 23 de agosto de 2026: versión 1, `ACTIVE` y `verify_jwt: true`.

```bash
supabase functions deploy delete-managed-user --project-ref ipoidimevokogptydbvt
```

La función no confía en el rol enviado por el navegador. Valida el JWT, consulta ambos perfiles con el cliente de servicio y aplica esta jerarquía:

| Solicitante | Objetivos permitidos |
| --- | --- |
| `super_admin` | `admin`, `revisor`, `creador_contenido`, `colaborador` |
| `admin` | `revisor`, `creador_contenido`, `colaborador` |
| Otros roles | Ninguno |

También bloquea la autoeliminación. Si existen referencias históricas conocidas, conserva la continuidad reasignando cursos y asignaciones al responsable que ejecuta la acción y anonimiza el actor de auditorías anteriores antes del borrado. Los registros de aprendizaje con claves foráneas `ON DELETE CASCADE` se eliminan junto con la cuenta. Si Storage u otra dependencia no prevista impide el borrado, la función devuelve error y no informa un éxito falso.

Pruebas mínimas en una cuenta controlada:

- llamada sin JWT: rechazada;
- colaborador: rechazada;
- admin → admin o super_admin: rechazada;
- admin → colaborador: permitida;
- super_admin → admin: permitida;
- cualquier rol → sí mismo: rechazada.

No pruebes los casos permitidos con cuentas reales de producción sin respaldo y autorización explícita.

## Advisors observados

La revisión en vivo mostró 56 avisos de seguridad y 47 de rendimiento preexistentes. No fueron modificados como parte de la única mejora funcional autorizada, porque endurecer permisos de 26 funciones `SECURITY DEFINER` o reescribir políticas RLS sin un entorno de prueba podría romper flujos activos.

| Grupo | Cantidad | Acción de soporte |
| --- | ---: | --- |
| `function_search_path_mutable` | 3 | Fijar `search_path` en migración probada. |
| `anon_security_definer_function_executable` | 26 | Revisar función por función y revocar `anon` cuando no sea necesario. |
| `authenticated_security_definer_function_executable` | 26 | Conceder ejecución solo a los roles que realmente la requieren. |
| Protección de contraseñas filtradas | 1 | Activarla en Auth después de revisar impacto en acceso. |
| Claves foráneas sin índice | 9 | Medir y añadir índices mediante migración. |
| `auth_rls_initplan` | 16 | Optimizar políticas conservando exactamente sus permisos. |
| Índices no usados | 6 | No borrar sin observar carga real y plan de reversión. |
| Políticas permisivas múltiples | 16 | Consolidar primero en una rama de Supabase. |

## Migraciones

Los archivos en `reference-sql/` son parches históricos y presentan variantes incompatibles de roles y funciones. No constituyen una secuencia confiable.

Para un cambio nuevo:

1. Obtén el esquema y la lista real de migraciones del proyecto correcto.
2. Crea una rama de desarrollo de Supabase o un proyecto de prueba.
3. Crea una migración nueva con un nombre descriptivo.
4. Aplica y prueba allí.
5. Ejecuta Advisors.
6. Prueba RLS con usuarios de cada rol.
7. Solo entonces aplica en producción.

## Pruebas funcionales mínimas

| Rol | Debe poder | No debe poder |
| --- | --- | --- |
| Colaborador | Ver cursos asignados, avanzar, presentar examen, ver y firmar su certificado | Ver usuarios ajenos, administrar cursos, firmar como responsable |
| Creador/Revisor | Solo las acciones definidas formalmente para su rol | Elevarse a administrador |
| Admin | Gestionar contenido y asignaciones según la política vigente | Cambiar o eliminar un superadministrador |
| Super Admin | Administración crítica autorizada | Saltarse auditoría o usar secretos desde el navegador |

## Documentación oficial útil

- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Funciones de base de datos](https://supabase.com/docs/guides/database/functions)
- [Seguridad de la Data API](https://supabase.com/docs/guides/api/securing-your-api)
- [Secretos de Edge Functions](https://supabase.com/docs/guides/functions/secrets)
