# delete-managed-user

Edge Function autenticada para eliminar usuarios administrados en Aula EI.

## Regla de autorización

- `super_admin`: puede eliminar `admin`, `revisor`, `creador_contenido` y `colaborador`.
- `admin`: puede eliminar `revisor`, `creador_contenido` y `colaborador`.
- Ningún usuario puede eliminarse a sí mismo ni eliminar un rol igual o superior.

La función valida la sesión y consulta los roles vigentes en `public.profiles`. La clave de servicio permanece únicamente en Supabase.

## Solicitud

```json
{
  "user_id": "UUID_DEL_USUARIO"
}
```

Debe desplegarse con verificación JWT habilitada.
