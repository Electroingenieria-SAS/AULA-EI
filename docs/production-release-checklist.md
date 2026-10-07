# Checklist de producción · Aula EI

## Gates automáticos ya cubiertos

- arquitectura y presupuestos de módulos;
- Security v4;
- dependencias de producción;
- CodeQL JavaScript/TypeScript;
- URLs externas seguras;
- MFA AAL2 y sesión administrativa viva en código/migraciones;
- rate limits y HIBP;
- Edge responses con no-store;
- responsive y controles;
- PWA;
- artefacto dist sin secretos privilegiados;
- browser smoke en múltiples viewports;
- contrato SQL posterior al hardening;
- bundle budget;
- despliegue solo para commits asociados a PR fusionado.

## Pendientes externos para certificación total

1. Activar Ruleset nativo sobre main desde GitHub Settings.
2. Conectar el proyecto Supabase real ipoidimevokogptydbvt.
3. Verificar RLS, grants, Storage, Auth, advisors y Edge Functions desplegadas en vivo.
4. Generar baseline SQL desde el esquema real y probar recuperación desde base vacía.
5. Ejecutar E2E autenticado contra un usuario/entorno de prueba real.
6. Si se exige hardening HTTP completo, mover o proxificar GitHub Pages detrás de un host que permita HSTS, Permissions-Policy, COOP/CORP y headers equivalentes.

No deben declararse como completados los puntos externos sin evidencia del servicio real.
