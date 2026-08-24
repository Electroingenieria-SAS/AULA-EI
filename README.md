# Aula EI

Aula EI es la plataforma interna de capacitaciones, evaluaciones y certificados de Electroingeniería S.A.S.

Este repositorio contiene una **versión estática ya compilada** para GitHub Pages o Vercel. La aplicación funcional se ejecuta desde `index.html`, `assets/` y `brand/`. El paquete recibido no incluía el proyecto React/Vite completo, por lo que no es posible recompilarlo desde estas fuentes sin recuperar el repositorio fuente original.

## Ejecutar en el computador

Requisito: [Node.js 18 o superior](https://nodejs.org/).

```bash
git clone <URL-DEL-REPOSITORIO>
cd <CARPETA-DEL-REPOSITORIO>
npm run verify
npm run dev
```

Después abre `http://127.0.0.1:4173`.

No es necesario ejecutar `npm install`: los comandos de soporte usan únicamente funciones incluidas en Node.js.

## Estructura

| Ruta | Uso |
| --- | --- |
| `index.html`, `404.html` | Entrada principal y respaldo para rutas en GitHub Pages. Deben permanecer iguales. |
| `assets/` | JavaScript y CSS compilados que usa la versión publicada. |
| `brand/` | Imágenes institucionales realmente utilizadas por la aplicación. |
| `supabase/functions/` | Código mantenible de las Edge Functions. |
| `supabase/reference-sql/` | SQL histórico recibido. Es referencia, no una cadena de migraciones validada. |
| `supabase/diagnostics/` | Consultas de solo lectura para soporte. |
| `legacy/source-fragments/` | Fragmentos React/CSS incompletos; no forman un proyecto compilable. |
| `docs/` | Arquitectura, publicación, soporte, edición y auditoría. |
| `scripts/` | Verificación y servidor local sin dependencias. |

## Eliminación jerárquica de usuarios

La pantalla **Usuarios y roles** aplica la misma regla en la interfaz y en la Edge Function autenticada `delete-managed-user`:

| Usuario actual | Puede eliminar |
| --- | --- |
| Super Admin | Admin, Revisor, Creador de contenido y Colaborador |
| Admin | Revisor, Creador de contenido y Colaborador |
| Demás roles | Nadie |

Nadie puede eliminarse a sí mismo ni eliminar a una persona de su mismo nivel o de un nivel superior. La comprobación definitiva se hace en Supabase; ocultar el botón en la interfaz no se usa como medida de seguridad.

## Cambios seguros y frecuentes

- Para cambiar un logo o fondo, reemplaza el archivo correspondiente en `brand/` conservando su nombre y formato.
- Si editas `index.html`, ejecuta `npm run sync:404` para actualizar `404.html`.
- Antes de subir cualquier cambio, ejecuta `npm run verify`.
- No edites manualmente los archivos minificados de `assets/`. Para cambiar la aplicación se necesita recuperar el proyecto fuente completo y generar un build nuevo.
- La mejora de eliminación jerárquica es una excepción controlada y reproducible mediante `npm run patch:user-deletion`; no apliques otros cambios manuales al bundle.
- Nunca subas llaves secretas, `service_role`, contraseñas ni archivos `.env`.
- No ejecutes en bloque los archivos de `supabase/reference-sql/`; contienen parches históricos que se reemplazan entre sí.

## Publicación

La guía completa está en [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Para GitHub Pages, la configuración actual esperada es `main` + `/ (root)`.

## Documentación del equipo

- [Cómo editar y entregar cambios](docs/TEAM_EDITING.md)
- [Arquitectura y mapa de carpetas](docs/ARCHITECTURE.md)
- [Publicación y reversión](docs/DEPLOYMENT.md)
- [Solución de problemas frecuentes](docs/TROUBLESHOOTING.md)
- [Soporte de Supabase](docs/SUPABASE_SUPPORT.md)
- [Resultado de la auditoría](docs/AUDIT_REPORT.md)
- [Reglas para contribuir](CONTRIBUTING.md)
- [Política de seguridad](SECURITY.md)
