# Ejecución, publicación y reversión

## 1. Verificación local

Requisito: Node.js 18 o superior.

```bash
npm run verify
npm run dev
```

Abre `http://127.0.0.1:4173` y comprueba:

- aparece la pantalla de acceso;
- cargan los logos y el fondo;
- no queda la pantalla inicial después del tiempo de espera;
- un usuario real puede iniciar y cerrar sesión;
- las rutas internas regresan a la aplicación y no a un 404 genérico.
- un admin solo ve **Eliminar** frente a roles inferiores;
- un super admin no ve **Eliminar** frente a sí mismo ni frente a otro super admin.

Detén el servidor con `Ctrl+C`.

## 2. Publicar con GitHub Pages

1. Sube los archivos a la rama `main`.
2. En GitHub abre `Settings` → `Pages`.
3. Selecciona `Deploy from a branch`.
4. Selecciona la rama `main` y la carpeta `/ (root)`.
5. Guarda y espera a que GitHub termine la publicación.
6. Abre la URL en una ventana privada y prueba el inicio de sesión.

La raíz debe conservar `index.html`, `404.html`, `.nojekyll`, `favicon.svg`, `assets/` y `brand/`.

## 3. Publicar con Vercel

El archivo `vercel.json` mantiene el respaldo de rutas hacia la aplicación. Publica el repositorio como sitio estático sin comando de build. Verifica que Vercel sirva primero los archivos existentes de `assets/` y `brand/`.

## 4. Reemplazar un build

1. Conserva una copia o etiqueta Git de la versión vigente.
2. Copia el build nuevo en una rama.
3. Revisa los nombres de JS/CSS que referencia el nuevo `index.html`.
4. Ejecuta `npm run sync:404`.
5. Ejecuta `npm run verify`.
6. Prueba la aplicación con Supabase.
7. Elimina los assets viejos únicamente después de confirmar que ningún HTML, JS o CSS los referencia.

## 5. Reversión

Si el despliegue falla, revierte el Pull Request o vuelve a publicar la última etiqueta estable. No reemplaces archivos uno por uno desde la interfaz de GitHub: restaura el conjunto completo `index.html` + `404.html` + `assets/` + `brand/` para evitar mezclar dos builds.

Los cambios de Supabase se revierten por separado. Revertir Git no deshace una Edge Function ya desplegada ni cambios ejecutados en la base de datos. Para revertir esta mejora, restaura el build anterior y vuelve a desplegar o elimina `delete-managed-user` solo después de retirar todas sus llamadas del frontend.
