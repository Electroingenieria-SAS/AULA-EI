# Matriz de proveedores y terceros tecnológicos — AULA EI

Fecha de control: 2026-10-07

Esta matriz describe los terceros que intervienen o pueden intervenir técnicamente en AULA EI. La clasificación contractual definitiva debe mantenerse alineada con los contratos, DPA y condiciones vigentes de cada proveedor.

| Proveedor / servicio | Uso real en AULA EI | Información potencialmente involucrada | Rol técnico | Control requerido |
|---|---|---|---|---|
| Supabase | PostgreSQL, Auth, RLS/RPC, Storage y Edge Functions | Cuentas, perfiles, formación, progreso, certificados, evidencia legal, solicitudes de privacidad, logs necesarios | Infraestructura/encargado tecnológico según relación contractual | Mantener DPA/condiciones, región, subencargados, seguridad, baja y portabilidad bajo revisión |
| GitHub / GitHub Pages | Repositorio, CI/CD y hosting estático de producción | Código fuente; el sitio estático no debe contener secretos. GitHub Pages recibe tráfico técnico del navegador | Proveedor de desarrollo y hosting estático | Branch protection, Actions pinneadas, secretos en Actions, revisión de términos y ubicación de procesamiento |
| Have I Been Pwned — Pwned Passwords | Verificación de contraseñas comprometidas desde Edge Functions | Solo el prefijo del hash requerido por el modelo k-anonymity; nunca contraseña en texto claro | Servicio externo de seguridad | Mantener implementación k-anonymity, no enviar contraseña ni hash completo, fail-safe ante indisponibilidad según política de seguridad |
| Google Drive | Visualización de contenidos cuando un curso incluye un enlace Drive autorizado | Solicitudes técnicas del navegador y contenido enlazado por la organización | Tercero de contenido | Solo URLs seguras y aprobadas; revisar permisos del recurso y evitar documentos públicos por error |
| Microsoft OneDrive | Visualización embebida de contenidos autorizados | Solicitudes técnicas del navegador y contenido enlazado | Tercero de contenido | Igual control de permisos, URL y exposición |
| YouTube | Reproducción embebida cuando un curso incorpora un video autorizado | Datos técnicos que el navegador comunique al proveedor al cargar el embed | Tercero de contenido | Preferir modo respetuoso de privacidad cuando sea compatible; no usar para analítica propia de AULA EI |

## Ubicación y transmisión internacional

El proyecto Supabase auditado se encuentra configurado en región `us-east-1`. Por tanto, AULA EI no debe afirmar que toda la información permanece físicamente en Colombia. ELECTROINGENIERÍA deberá mantener documentado el mecanismo jurídico aplicable a la transmisión o transferencia internacional según el rol efectivo de cada tercero.

## Reglas de alta de proveedores

Antes de introducir un nuevo tercero que procese datos personales se debe documentar:

- finalidad;
- datos involucrados;
- rol de Responsable/Encargado/subencargado;
- ubicación de procesamiento;
- controles de seguridad;
- contrato/DPA y condiciones aplicables;
- conservación/borrado;
- procedimiento de terminación y exportación;
- necesidad de actualizar avisos, política o consentimiento.

Vercel no se considera en esta matriz como hosting operativo de producción mientras `git.deploymentEnabled=false` y el despliegue efectivo siga gestionado por GitHub Actions/GitHub Pages.
