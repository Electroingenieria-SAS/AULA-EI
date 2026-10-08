# Aula EI — Procedimiento de respaldos, recuperación y continuidad

**Estado:** procedimiento documentado; **restauración aislada NO ejecutada todavía**.  
**Proyecto Supabase identificado:** `ipoidimevokogptydbvt`.  
**Repositorio:** `Electroingenieria-SAS/AULA-EI`.  
**Objetivo:** recuperar base de datos, autenticación y archivos de cursos sin tocar producción durante una simulación.

## Alcance y supuestos

- La operación actual usa Supabase Auth, PostgreSQL, Storage `course-assets`, Vercel y GitHub Pages.
- Una copia física/lógica de **PostgreSQL no contiene los archivos binarios de Storage**: recuperarlos por separado. Ver [Supabase Database Backups](https://supabase.com/docs/guides/platform/backups).
- Una carpeta de migraciones en Git **no** sustituye un respaldo de información real (matrículas, evaluaciones, legal, cursos, certificados).
- No hay en este informe evidencia de una copia descargada, una restauración comprobada ni RPO/RTO aprobados.
- Nunca almacenar `service_role`, claves privadas, dump con datos personales ni credenciales de BD en Git, logs de CI o artefactos públicos.

## 1. Preparación sin intervención de producción

1. Abrir [Supabase → Database → Backups](https://supabase.com/dashboard/project/ipoidimevokogptydbvt/database/backups/scheduled) para verificar disponibilidad según plan. Si el plan no ofrece respaldos gestionados, exportar la BD con la CLI de Supabase según la documentación oficial.
2. Registrar fecha/hora exactas, tamaño y hash SHA-256 del archivo de respaldo, cifrado, custodia y ubicación externa restringida. Nunca registrar su contenido.
3. Enumerar los objetos de `course-assets` usando un procedimiento de exportación autorizado, guardar un manifiesto de rutas, tamaños y hashes. **No descargar públicamente recursos protegidos**.
4. Guardar por separado, bajo custodia autorizada, la configuración de Auth, configuración de Edge Functions y variables protegidas necesarias para reconstruir el entorno, sin divulgar sus valores.
5. Reservar un equipo aislado con PostgreSQL de versión compatible y base **vacía y no productiva** de nombre `aula_ei_restore_<identificador>`. Usar usuarios y credenciales exclusivos del simulacro.

## 2. Simulación de restauración aislada

1. Definir `RESTORE_TARGET_URL` únicamente para PostgreSQL en `localhost`, `127.0.0.1` o `::1`; no insertar valores en el repositorio.
2. Ejecutar `node scripts/recovery-target-guard.mjs`. Este script **solo valida el destino**, rechaza hosts remotos y exige prefijo `aula_ei_restore_`.
3. Confirmar que la base de simulacro está vacía, que hay consentimiento institucional y que la copia fue verificada.
4. Restaurar la copia mediante las herramientas PostgreSQL que correspondan al **formato real** del archivo (`psql` para SQL o `pg_restore` para formato custom). No usar `--clean` ni opciones que puedan afectar otras bases. **Este proyecto no automatiza la restauración.**
5. Reconstituir en entorno aislado los recursos Storage de prueba desde una copia autorizada y privada. La restauración de metadatos por sí sola **no** recrea los objetos binarios.
6. Asegurar que Auth, dominio, URL de Supabase, SMTP y Edge Functions del laboratorio no puedan enviar mensajes, mutar producción ni confundir a usuarios reales.

## 3. Pruebas de aceptación en laboratorio

- Comparar conteos, claves referenciales y estructuras de `courses`, `enrollments`, `content_blocks`, `certificates`, evidencia de exámenes y aceptación legal, sin exportar PII a reportes abiertos.
- Consultar y abrir un curso de prueba, su portada/recursos protegidos, y un certificado de prueba; no crear ni modificar certificados oficiales.
- Confirmar que roles de colaborador/creador/revisor/admin/super_admin mantengan el mismo modelo de acceso, con MFA AAL2 para operaciones administrativas.
- Validar que el usuario A no puede consultar objetos del usuario B (RLS y RPC) y que una sesión terminada no expone datos en caché.
- Comparar tiempos y evidencias de recuperación, registrar **RTO observado y RPO observado**, errores, remediaciones, responsable y acta de aceptación.
- Si las pruebas fallan, conservar el backup intacto, registrar incidente y repetir solamente en entorno aislado.

## 4. Continuidad y reversión de frontend

- Identificar commit de `main` con CI completo verde; publicar **ese mismo SHA** en GitHub Pages y Vercel.
- En una regresión de frontend, revertir el PR responsable y republicar un commit aprobado; **nunca restaurar producción para resolver una incidencia visual**.
- Verificar `aula-ei.vercel.app`, la URL de Pages, `aula-ei-release` y la versión PWA. Una versión almacenada de service worker puede impedir observar cambios hasta refrescar.
- Confirmar con usuarios de prueba autenticados (móvil, tablet, PC) antes de aprobar la liberación general.

## 5. Pendientes para la certificación

| Evidencia requerida | Estado a 2026-10-08 |
| --- | --- |
| Estado de respaldo gestionado o copia exportada y cifrada | No verificado |
| Copia independiente de Storage | No verificada |
| Restauración física/lógica completada en laboratorio | No realizada |
| Ensayo de permisos y certificados restaurados | No realizado |
| RTO/RPO medidos y aprobados | No disponibles |
| Aceptación con perfiles reales de prueba | Pendiente |

**Aprobación:** requiere el responsable del sistema, responsable de datos y Control Interno/SI según corresponda. Nunca interpretar esta guía como una ejecución de un backup o restauración.
