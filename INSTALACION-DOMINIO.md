# Instalación de dominio — Aula EI

Este documento está pensado para que un administrador de infraestructura pueda recibir Aula EI y publicarlo en un dominio sin alterar la arquitectura funcional.

## Arquitectura recomendada

```text
Repositorio GitHub
      ↓
    Vercel
      ↓
Dominio corporativo

Frontend ↔ Supabase
           ├─ PostgreSQL
           ├─ Auth
           ├─ Storage
           ├─ RPC
           └─ Edge Functions
```

**Supabase no se copia dentro del hosting web.** Se mantiene como backend administrado salvo que exista un proyecto formal de migración de infraestructura.

## Inicio rápido

### Windows

1. Descomprima el paquete.
2. Abra `ABRIR-INSTALADOR-DOMINIO.cmd` para usar la mini app de instalación.
3. Abra `PREPARAR-Y-DESPLEGAR-WINDOWS.cmd` para validar, ejecutar localmente o lanzar el despliegue de Vercel.
4. Antes de publicar, ejecute la opción **Verificar paquete**.

### macOS / Linux

```bash
chmod +x PREPARAR-Y-DESPLEGAR.sh
./PREPARAR-Y-DESPLEGAR.sh
```

También puede abrir directamente `instalador-dominio/index.html` en un navegador.

## Flujo recomendado

1. Confirmar acceso al repositorio `Electroingenieria-SAS/AULA-EI`.
2. Confirmar que el repositorio contiene el código fuente editable (`src/`, configuración del bundler y dependencias). El ZIP de entrega contiene un build compilado y no sustituye el repositorio fuente.
3. Ejecutar `npm run verify` en este paquete.
4. Vincular el repositorio con el proyecto correcto de Vercel.
5. Desplegar producción.
6. En Vercel abrir **Settings → Domains** y agregar el dominio deseado.
7. Copiar exactamente los registros DNS indicados por Vercel al proveedor del dominio.
8. Esperar la validación DNS y comprobar HTTPS.
9. En Supabase Auth revisar **Site URL** y **Redirect URLs** para incluir el dominio final cuando corresponda.
10. Ejecutar pruebas de login, perfiles, cursos, Storage, examen, certificados y funciones administrativas.

## Variables y credenciales

Use `.env.example` como inventario de nombres. **No convierta `.env.example` en un almacén de secretos.**

### Puede aparecer en frontend

- URL pública del proyecto Supabase.
- Publishable key / clave pública de Supabase diseñada para navegador.

Su seguridad depende de RLS, privilegios SQL y autorización de usuario; no de mantener la publishable key oculta.

### Solo backend / panel de secretos

- `SUPABASE_SERVICE_ROLE_KEY` o claves secretas equivalentes.
- `sb_secret_...`.
- Tokens GitHub.
- Tokens Vercel.
- Contraseñas de base de datos.
- Credenciales del registrador DNS.
- Claves privadas de cualquier proveedor.

Nunca deben incorporarse a JavaScript público, HTML, Git, documentación compartida o parámetros de URL.

## DNS

No existe un registro DNS universal que deba escribirse manualmente en esta guía. Vercel muestra la configuración correcta para cada dominio y debe considerarse la fuente de verdad.

No agregue simultáneamente registros A/CNAME contradictorios para el mismo host. Si el proveedor usa proxy/CDN, valide la configuración específica antes de activarlo.

## GitHub, Vercel y dominio pueden convivir

Sí. El esquema esperado es:

- **GitHub:** repositorio y fuente.
- **Vercel:** construcción y hosting de producción.
- **Dominio:** nombre público que apunta a Vercel.
- **Supabase:** backend externo.

Cada `push` a la rama configurada puede seguir generando un nuevo despliegue en Vercel sin perder el dominio.

## Seguridad aplicada

La base compartida de Supabase registra la migración:

`20260826163217_aula_ei_security_hardening_20260826`

Entre las medidas incluidas se encuentran RLS, reducción de grants, protección de respuestas de examen, restricción de funciones sensibles, Storage privado y endurecimiento de funciones/roles.

No vuelva a ejecutar scripts SQL históricos indiscriminadamente sobre producción. Use migraciones revisadas y respaldos.

## Verificación final

- [ ] Repositorio fuente completo disponible.
- [ ] `npm run verify` termina correctamente.
- [ ] Proyecto Vercel correcto.
- [ ] Producción carga sin errores.
- [ ] Dominio validado por Vercel.
- [ ] HTTPS correcto.
- [ ] Redirect URLs de Auth revisadas.
- [ ] Alumno solo ve información autorizada.
- [ ] Examen no expone respuestas correctas por REST.
- [ ] Storage privado funciona para usuarios autorizados.
- [ ] Funciones administrativas exigen usuario y rol.
- [ ] No hay secretos en Git/frontend.

## Herramientas incluidas

- `ABRIR-INSTALADOR-DOMINIO.cmd`: abre la mini app local.
- `instalador-dominio/index.html`: checklist interactivo y generador de resumen.
- `PREPARAR-Y-DESPLEGAR-WINDOWS.cmd`: asistente de consola para Windows.
- `PREPARAR-Y-DESPLEGAR.sh`: asistente para macOS/Linux.
- `LEEME-PRIMERO.md`: explicación general de la entrega.
- `INVENTARIO-DE-ENTREGA.md`: inventario solicitado.
- `docs/ENTREGA_TECNICA_DOMINIO_SEGURIDAD.md`: detalle técnico y de seguridad.
