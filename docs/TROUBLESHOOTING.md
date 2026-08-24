# Solución de problemas frecuentes

## La página queda en “Cargando plataforma”

1. Espera el diagnóstico automático de la pantalla.
2. Abre las herramientas del navegador y revisa `Console` y `Network`.
3. Confirma que cargan con estado 200 los dos archivos que `index.html` referencia en `assets/`.
4. Ejecuta `npm run verify`.
5. Prueba en una ventana privada para descartar caché.
6. Confirma que el proyecto Supabase configurado esté activo.

No soluciones el problema copiando varios builds a `assets/`; solo debe publicarse el conjunto referenciado por el HTML vigente.

## Se ve el sitio, pero no inicia sesión

1. Confirma que el usuario existe en Auth.
2. Confirma que existe una fila correspondiente en `public.profiles`.
3. Revisa los logs de Auth y de la Data API.
4. Revisa que el rol del perfil esté dentro de la restricción vigente.
5. Comprueba la URL del sitio en Authentication → URL Configuration.
6. Ejecuta el diagnóstico de [SUPABASE_SUPPORT.md](SUPABASE_SUPPORT.md).

## Un administrador no puede crear usuarios

1. Revisa los logs de la Edge Function `create-managed-user`.
2. Confirma que la función desplegada corresponde al código del repositorio.
3. Confirma que el llamador tiene perfil `admin` o `super_admin` según el modelo vigente.
4. Revisa que la función conserve verificación JWT.
5. Comprueba si Auth creó el usuario pero falló el `profiles.upsert`.
6. No uses una llave `service_role` desde el navegador para evitar el error.

## Un curso o archivo no aparece

1. Confirma la matrícula activa del usuario.
2. Revisa el estado `published` del curso, fase y bloque.
3. Comprueba las políticas RLS relacionadas.
4. Para archivos, confirma que la primera carpeta del objeto sea el ID del curso y que el bucket sea `course-assets`.
5. Revisa logs de Storage y Data API.

## Una ruta directa muestra 404

- En GitHub Pages confirma que `404.html` exista en la raíz y sea igual a `index.html`.
- Ejecuta `npm run sync:404` y luego `npm run verify`.
- En Vercel confirma que `vercel.json` continúe en la raíz.

## El certificado no guarda o muestra firmas

1. Confirma la existencia de `certificate_signatures`.
2. Revisa las RPC `get_certificate_signatures`, `save_certificate_signature` y `clear_certificate_signature`.
3. Revisa que el código del certificado exista y coincida exactamente.
4. Comprueba RLS y permisos de ejecución.
5. No reejecutes el parche histórico completo; compara primero contra el esquema real.

