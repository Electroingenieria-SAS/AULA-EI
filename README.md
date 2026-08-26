# Aula EI

Aula EI es la plataforma interna de capacitaciones, evaluaciones y certificados de Electroingeniería S.A.S.

> **Importante:** este paquete es una **versión estática compilada**. El ZIP recibido no contiene el proyecto React/Vite fuente completo. Para desarrollo estructural debe recuperarse el repositorio fuente `Electroingenieria-SAS/AULA-EI` con su `src/` original si existe.

## Verificación rápida

```bash
npm run verify
npm run dev
```

Node.js 18+ es suficiente; no hay dependencias npm del paquete estático.

## Entrega para dominio y seguridad

La documentación principal está en **[docs/ENTREGA_TECNICA_DOMINIO_SEGURIDAD.md](docs/ENTREGA_TECNICA_DOMINIO_SEGURIDAD.md)**. Incluye inventario de servicios/credenciales, GitHub + Vercel + dominio, Supabase, RLS, migraciones, variables y controles pendientes.

## Estructura

| Ruta | Uso |
| --- | --- |
| `index.html`, `404.html`, `.nojekyll` | Entrada SPA y compatibilidad GitHub Pages |
| `assets/` | JS/CSS compilados activos |
| `brand/` | Assets institucionales |
| `supabase/functions/` | Edge Functions mantenibles |
| `supabase/migrations/` | Migraciones validadas/aplicadas |
| `supabase/reference-sql/` | SQL histórico; **no ejecutar en bloque** |
| `supabase/diagnostics/` | Consultas de diagnóstico |
| `docs/` | Arquitectura, despliegue, soporte y handoff técnico |
| `scripts/` | Servidor/verificación sin dependencias externas |

## Seguridad aplicada el 26/08/2026

- grants `anon` retirados de las tablas de Aula EI;
- privilegios `authenticated` reducidos al mínimo funcional;
- respuestas correctas del examen ocultas detrás de RPC server-side;
- cierre de autoescalamiento de rol mediante metadata editable;
- separación estricta de firmas de participante y responsable;
- ejecución anónima de RPC sensibles revocada;
- bucket `course-assets` privado con MIME allowlist y límite de 100 MB;
- headers de seguridad y CSP añadidos para Vercel;
- `.env.example` + `.gitignore` incluidos.

Migración remota registrada: `20260826163217_aula_ei_security_hardening_20260826`.


## Entrega simplificada al administrador del dominio

Para una entrega directa, empiece por **[LEEME-PRIMERO.md](LEEME-PRIMERO.md)** y **[INVENTARIO-DE-ENTREGA.md](INVENTARIO-DE-ENTREGA.md)**.

En Windows puede ejecutar `PREPARAR-Y-DESPLEGAR-WINDOWS.cmd` con doble clic. El asistente valida el proyecto, permite levantarlo localmente y puede iniciar el flujo interactivo oficial de Vercel. El DNS no se modifica automáticamente: debe copiarse exactamente la configuración que Vercel muestre para el dominio.

## Publicación

- **GitHub** debe conservarse como fuente/versionado.
- **Vercel** puede ser el hosting productivo con dominio personalizado.
- **GitHub Pages** puede seguir funcionando como espejo desde `github.io`.

Antes de cada entrega: `npm run verify`.

## Más documentación

- [Entrega técnica, dominio y seguridad](docs/ENTREGA_TECNICA_DOMINIO_SEGURIDAD.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Publicación](docs/DEPLOYMENT.md)
- [Soporte Supabase](docs/SUPABASE_SUPPORT.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Auditoría previa](docs/AUDIT_REPORT.md)
- [Política de seguridad](SECURITY.md)
- [Validación de seguridad 26/08/2026](docs/VALIDACION_SEGURIDAD_2026-08-26.md)

## Asistente visual de dominio

Para facilitar la entrega a infraestructura se incluye una mini app local que **no solicita secretos**. En Windows abra `ABRIR-INSTALADOR-DOMINIO.cmd`; en cualquier sistema puede abrir `instalador-dominio/index.html`. El asistente guía GitHub → Vercel → dominio → Supabase, mantiene un checklist local y genera un resumen de instalación para el administrador.

Consulte también `INSTALACION-DOMINIO.md`.
