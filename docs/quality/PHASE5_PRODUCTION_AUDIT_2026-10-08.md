# Aula EI — Fase 5 | Auditoría técnica y protocolo de certificación

**Fecha de corte:** 2026-10-08  
**Repositorio:** `Electroingenieria-SAS/AULA-EI`  
**Versión auditada:** `4213b3093db69ca602e7a449cc5734ecfcbf35f2`  
**Superficies:** GitHub Pages, Vercel, Supabase `ipoidimevokogptydbvt`.  
**Tipo de auditoría:** revisión de configuración, contratos, permisos declarativos, controles automáticos y estado del entorno; **sin pruebas con credenciales de usuarios reales**.

## Decisión

**En implementación de Fase 5. NO CERTIFICADO TODAVÍA.** No se identificó mediante estos controles un incidente crítico confirmado, pero permanecen hallazgos prioritarios y faltan pruebas funcionales autenticadas y de restauración. No afirmar que la plataforma es «100 % segura» o «certificada» con solo CodeQL/build/smoke.

## Evidencia técnica recogida

| Control | Evidencia de 2026-10-08 | Interpretación |
| --- | --- | --- |
| Producción Vercel | Alias `aula-ei.vercel.app` en `READY`, SHA `4213b309` | Compilación publicada, no prueba funcional autenticada |
| GitHub Pages | Workflow `Build and Deploy Aula EI` de `main` en `SUCCESS` para el mismo SHA | Publicación y verificación HTTP de título |
| CodeQL y dependencias | Workflows de `main` en `SUCCESS` | Análisis automático, no pentest |
| Errores de Vercel | Sin errores agrupados en últimos 7 días | Sitio SPA estático: no equivale a ausencia de errores del navegador |
| Políticas de base de datos | **52/52** tablas `public` con RLS habilitada; **0** RLS deshabilitadas | Protección declarativa presente; requiere casos de acceso por rol |
| Acceso anónimo | **0** funciones ejecutables por `anon` en `public`; tablas examinadas sin `SELECT` anónimo | Restricción favorable; no cubre otras API/Edge Functions |
| Funciones privilegiadas | Advisor: **33** `SECURITY DEFINER` ejecutables por `authenticated` | Revisar procedimientos uno a uno. Algunas requieren expresamente autenticación o MFA |
| Tablas sin políticas | Advisor: **19** tablas con RLS y sin políticas, pertenecientes principalmente a `dt_*`/`helpdesk_*` | Acceso directo bloqueado; son superficies compartidas, **no** abrir acceso para eliminar la advertencia |
| Contraseñas comprometidas | Advisor: `auth_leaked_password_protection` en `WARN` | Pendiente de habilitar en el panel Auth |
| Índices | Advisor: 37 no utilizados en estadísticas disponibles | No eliminar sin mediciones/cargas representativas |
| Migraciones | 32 archivos versionados en repositorio; 42 entradas en el historial del proyecto Supabase | Versiones/referencias de despliegue diferentes y cambios de servicios compartidos. Conciliar antes de un restore/replay |
| Edge Functions | 7 activas, incluidas 5 operaciones de usuarios/perfil con `verify_jwt=true`; `helpdesk-admin` y `helpdesk-api` con `verify_jwt=false` | Las dos últimas pertenecen al entorno compartido; revisar autenticación dentro de sus handlers sin alterarlas desde Aula EI |
| Recuperación DR | Workflow programado que exige `SUPABASE_DB_URL` y genera `roles.sql` + `schema.sql` con SHA256, artefacto 30 días | **No** constituye respaldo de datos, Storage ni prueba de restauración |
| Pruebas responsive | `scripts/smoke-browser.sh` recorre ocho viewports de 320 a 1440 px | Comprueba presencia del login y ausencia de ErrorBoundary; no mide superposiciones visuales ni valida sesiones autenticadas |

Fuentes de consulta: GitHub Actions, `vercel.json`, scripts de smoke/build, políticas/funciones en `pg_catalog`, Supabase Advisors de seguridad/rendimiento y lista de Edge Functions. Las comprobaciones sobre tablas, funciones y roles se realizaron con SQL **solo lectura**.

### Hallazgos y plan de tratamiento

| ID | Nivel | Hallazgo | Tratamiento y criterio de cierre |
| --- | --- | --- | --- |
| F5-01 | **P1** | Protección contra contraseñas filtradas desactivada | Habilitar *Leaked Password Protection* en Supabase Auth, volver a ejecutar asesor de seguridad y capturar evidencia |
| F5-02 | **P1** | No hay prueba documentada de recuperación completa de datos y Storage | Definir backup recuperable, RPO/RTO, ejecutar restore en entorno aislado y comparar conteos/checksums; no volcar datos personales a artefactos públicos |
| F5-03 | **P1** | Pruebas autenticadas de los roles sin ejecutar | Ejecutar matriz de aceptación con cuentas de prueba asignadas de cada rol y evidencias de permisos, progreso, evaluaciones y certificados |
| F5-04 | **P2** | 33 funciones `SECURITY DEFINER` señaladas por linter | Clasificar función API versus helper y demostrar controles internos. Las funciones de incidentes inspeccionadas exigen Super Admin + AAL2; no revocar masivamente |
| F5-05 | **P2** | Divergencia entre versiones de migraciones locales e historial desplegado | Construir mapa version→equivalencia, comparar definiciones y generar una ruta de reconstrucción sobre **instancia aislada** |
| F5-06 | **P2** | Escasa observabilidad de errores JS cliente | Definir estrategia de reporte sin datos privados, errores de red/SPA, alertas y procedimiento de soporte |
| F5-07 | **P2** | Análisis pendiente de Edge Functions ajenas al LMS con `verify_jwt=false` | Revisar auth interna, CORS y rate-limit del módulo helpdesk; coordinar con responsable del servicio, no modificar sin alcance |
| F5-08 | **P2** | Índices sin uso registrado | Reevaluar tras uso representativo; conservar índices de integridad/rutas críticas |

**Importante:** la ausencia de políticas en tablas que ya tienen RLS no implica exposición. Ningún reporte de hallazgos permite asumir sin pruebas una vulnerabilidad explotable.

## Matriz de aceptación manual (requiere cuentas autorizadas y un navegador)

| Escenario | Rol/entorno | Resultado esperado |
| --- | --- | --- |
| Login, recuperación OTP, cambio inicial de contraseña | Usuario de prueba | Sesión correcta, errores útiles, sin filtraciones de cuenta |
| MFA administrativo, cierre de sesión y sesión invalidada | Admin y Super Admin | AAL2 exigida; endpoints críticos no aceptan un AAL1 no autorizado |
| Documentos legales | Usuario nuevo, vigente y admin | Documentos obligatorios visibles, lecturas y consentimientos trazados |
| Capacitaciones y rutas | Colaborador asignado y no asignado | No lectura de contenidos ajenos, bloqueo de fases correcto |
| Juegos automáticos, notas de repaso | Colaborador con bloques pendientes y completados | No se anticipan respuestas/examen final; juegos no alteran calificación |
| Examen y certificado | Colaborador con prueba asignada | No se permite examen anticipado; nota calculada en servidor; certificado verificable en nueva pestaña y exportaciones funcionales |
| Gestión, importación y reportes | Creador, revisor, admin | Privilegios ajustados por rol, consultas sin saltarse RLS, CSV protegido |
| Matriz analítica | Admin | Filtros y mínimos de muestra coherentes con resultados |
| Responsive y teclado | 320, 360, 390, 430, 768, 1024, 1280, 1440 px | Sin scroll horizontal involuntario, botones y modales utilizables, focus visible y Escape donde corresponda |
| PWA, red y caché | Android/iPhone/escritorio | Instalar, actualizar, recuperar conectividad sin exponer datos privados en caché |
| Recuperación | Operación TI, instancia aislada | Restore de esquema y datos; integridad probada; RPO/RTO documentados |

## Condiciones para cierre formal

1. Sin P0 abiertos y P1 tratados o formalmente aceptados por el responsable del riesgo.
2. Build, pruebas, CodeQL, dependencias, controles legales y security checks en verde sobre el SHA auditado.
3. Evidencia reproducible de las pruebas autenticadas **por rol**, no solo de login público.
4. Plan de copias de seguridad/DR con al menos una restauración validada en un entorno aislado.
5. Check de políticas Auth, funciones `SECURITY DEFINER` y Edge Functions con trazabilidad.
6. Validación explícita de PC/tablet/móvil con reportes de superposición y accesibilidad.
7. Acta de aprobación firmada con versión, fecha, responsables y evidencias.

**Estado de esta acta:** abierta; certificación pendiente de pruebas de aceptación y mitigaciones. La documentación de esta auditoría no constituye un certificado legal de seguridad.
