# Guía rápida para editar

## Antes de comenzar

```bash
git pull
git switch -c tipo/descripcion-corta
npm run verify
```

Usa ramas como `fix/logo-login`, `docs/manual-soporte` o `supabase/permisos-certificados`.

## Cambiar imágenes institucionales

1. Reemplaza el archivo dentro de `brand/`.
2. Conserva exactamente el mismo nombre y extensión.
3. Mantén proporciones similares para evitar deformaciones.
4. Ejecuta `npm run verify` y `npm run dev`.
5. Revisa login, menú, fondo y certificado según el archivo modificado.

## Cambiar el HTML de arranque

1. Edita únicamente `index.html`.
2. Ejecuta `npm run sync:404`.
3. Ejecuta `npm run verify`.
4. Comprueba la página localmente con `npm run dev`.

## Cambiar la aplicación React

No edites `assets/index-BZBNDslB.js` o `assets/index-B-4jmJ6C.css` a mano. Son archivos compilados y minificados.

Primero recupera el repositorio fuente completo. El flujo correcto será:

1. Editar componentes en el proyecto fuente.
2. Ejecutar pruebas y build.
3. Copiar el contenido generado por Vite a este repositorio de publicación.
4. Verificar que `index.html` apunte a los nombres hash nuevos.
5. Sincronizar `404.html`.
6. Ejecutar `npm run verify`.
7. Retirar solo los assets del build anterior que ya no tengan referencias.

La eliminación jerárquica incluida en esta entrega fue aplicada al build recibido con un parche determinista porque el ZIP no contenía el fuente React completo. Para verificar o volver a aplicarlo sobre **este mismo build**:

```bash
npm run patch:user-deletion
npm run verify
```

El script es idempotente y se detiene si no reconoce exactamente el componente esperado. No se debe reutilizar a ciegas sobre un build nuevo.

## Cambiar Supabase

1. Lee [SUPABASE_SUPPORT.md](SUPABASE_SUPPORT.md).
2. Confirma el `project_ref`; no trabajes por nombre ni por intuición.
3. Ejecuta primero `supabase/diagnostics/healthcheck.sql`.
4. Haz el cambio en una rama o proyecto de prueba.
5. Guarda cada modificación de esquema en una migración nueva.
6. Ejecuta Security Advisor y Performance Advisor.
7. Prueba al menos los roles colaborador, administrador y superadministrador.
8. Documenta reversión antes de aplicar en producción.

## Entregar el cambio

```bash
npm run verify
git status
git add <archivos-revisados>
git commit -m "tipo: descripción concreta"
git push -u origin <nombre-de-rama>
```

Abre un Pull Request y completa la lista de [CONTRIBUTING.md](../CONTRIBUTING.md).
