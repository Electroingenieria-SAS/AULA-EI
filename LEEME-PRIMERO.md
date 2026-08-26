# LEEME PRIMERO — Entrega técnica Aula EI

Este paquete está preparado para entregar Aula EI a un administrador de infraestructura, hosting o dominio.

## Qué contiene

- Frontend **ejecutable compilado**: `index.html`, `404.html`, `assets/`, `brand/`.
- Backend/API: Supabase (PostgreSQL, Auth, Storage, RPC y Edge Functions).
- Edge Functions: `supabase/functions/`.
- Migraciones: `supabase/migrations/`.
- SQL histórico de referencia: `supabase/reference-sql/`.
- Scripts de validación y ejecución local: `scripts/`.
- Archivo de variables de ejemplo: `.env.example`.
- Configuración segura de Vercel: `vercel.json`.
- Documentación completa de servicios, credenciales, despliegue y seguridad: `docs/`.
- Asistente de entrega/despliegue para Windows: `PREPARAR-Y-DESPLEGAR-WINDOWS.ps1` y `PREPARAR-Y-DESPLEGAR-WINDOWS.cmd`.
- Asistente equivalente para macOS/Linux: `PREPARAR-Y-DESPLEGAR.sh`.
- Mini app local de instalación de dominio: `ABRIR-INSTALADOR-DOMINIO.cmd` → `instalador-dominio/index.html`.
- Guía resumida adicional: `INSTALACION-DOMINIO.md`.

## Limitación importante

El ZIP recibido para esta auditoría **no contenía el frontend fuente original** (`src/`, componentes React/Vite, configuración de bundler, etc.). Contiene el build ya compilado.

El proyecto de Vercel está vinculado al repositorio:

`Electroingenieria-SAS/AULA-EI`

Para una entrega contractual de **“código fuente completo”**, el responsable debe incluir además una copia/clone de ese repositorio con el `src/` original, si allí está disponible.

## Qué debe hacer quien recibe el proyecto

### Opción recomendada: dominio sobre Vercel

1. Leer `docs/ENTREGA_TECNICA_DOMINIO_SEGURIDAD.md`.
2. En Windows, ejecutar con doble clic `PREPARAR-Y-DESPLEGAR-WINDOWS.cmd`.
3. Elegir **Verificar** primero.
4. Vincular el repositorio/proyecto correcto de Vercel si aún no está vinculado.
5. Publicar en Vercel.
6. Agregar el dominio personalizado en Vercel y copiar exactamente los DNS que Vercel solicite al proveedor del dominio.
7. Mantener GitHub como repositorio fuente. GitHub Pages puede seguir existiendo como espejo, pero el dominio principal debe apuntar a un solo hosting.

## Seguridad

La migración de hardening de Supabase ya fue aplicada y quedó registrada como:

`20260826163217_aula_ei_security_hardening_20260826`

No vuelva a ejecutar indiscriminadamente todo el contenido de `supabase/reference-sql/`.

No hay garantía técnica válida de un sistema “inhackeable”. Este paquete aplica defensa en profundidad: RLS, grants mínimos, RPC controlados, Storage privado, separación de secretos, CSP/headers, y validación de roles.

## Documentos principales

- `docs/ENTREGA_TECNICA_DOMINIO_SEGURIDAD.md`: responde al inventario solicitado.
- `docs/GUIA_DOMINIO_PASO_A_PASO.md`: procedimiento operativo para publicar el dominio.
- `docs/VALIDACION_SEGURIDAD_2026-08-26.md`: evidencia de la validación de seguridad realizada.
- `SECURITY.md`: política y reglas de secretos.
