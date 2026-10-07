# Checklist de producción · Aula EI

## Gates automáticos cubiertos

- arquitectura modular y presupuestos de archivos;
- Security v4;
- dependencias de producción;
- CodeQL JavaScript/TypeScript;
- URLs externas seguras;
- MFA AAL2 y validación de sesión administrativa viva;
- rate limits y comprobación HIBP en flujos de contraseña gestionados;
- Edge Functions con `verify_jwt=true` y `Cache-Control: no-store`;
- responsive y controles;
- PWA;
- artefacto `dist` sin secretos privilegiados;
- browser smoke en múltiples viewports;
- contrato SQL posterior al hardening;
- gate `check:legal` fail-closed para Compliance Center;
- bundle budget;
- despliegue de producción únicamente desde commits asociados a PR fusionado.

## Controles de producción verificados

- Supabase real conectado: `ipoidimevokogptydbvt`.
- RLS, grants, Storage, Auth, advisors y Edge Functions verificados en vivo.
- Disaster Recovery cerrado: baseline reproducible de roles + esquema, hashes verificables y artefacto de GitHub Actions con retención de 30 días.
- El último baseline DR validado antes del Compliance Center fue el run `37649574766`, con `roles.sql`, `schema.sql`, `SHA256SUMS.txt` y `MANIFEST.txt`.
- GitHub reporta actualmente `main` como `protected: true`; el endpoint clásico de protección aparece deshabilitado, por lo que el control depende de la protección/ruleset nativa y del gate adicional del pipeline.
- Compliance Center desplegado en base de datos de producción:
  - documentos y versiones legales;
  - evidencia de aceptación inmutable con SHA-256;
  - audiencias `employee`, `prehire` y `candidate`;
  - solicitudes de privacidad;
  - incidentes restringidos;
  - retención;
  - administración con MFA AAL2;
  - auditoría sobre `audit_logs`.
- Smoke transaccional live:
  - colaborador activo: 5 documentos requeridos, 5 pendientes;
  - aceptación creada correctamente dentro de transacción y revertida;
  - después del rollback: 0 aceptaciones y 0 eventos de aceptación falsos persistidos;
  - administrador AAL2: acceso correcto a los 10 documentos publicados.

## Pendientes humanos o externos para certificación total

1. Dos de cuatro cuentas administrativas activas todavía deben completar personalmente el enrolamiento MFA. El código y las RPC ya bloquean privilegios administrativos sin AAL2/factor verificado.
2. Confirmar en la interfaz de GitHub que el ruleset activo sobre `main` exige PR y bloquea force-push/eliminación. El conector confirma `protected: true`, pero no permite enumerar todas las cláusulas del ruleset.
3. Ejecutar un E2E autenticado en navegador con una identidad de prueba controlada si se exige evidencia funcional end-to-end más allá de los smoke tests CI y RPC live.
4. Si se exige hardening HTTP completo con HSTS, Permissions-Policy, COOP/CORP como headers efectivos en el host público, utilizar un hosting/proxy que permita esos headers. GitHub Pages mantiene HTTPS y CSP en documento, pero no permite el mismo control de headers que Vercel.

No debe declararse cerrado un control humano hasta contar con evidencia del titular o del servicio correspondiente.
