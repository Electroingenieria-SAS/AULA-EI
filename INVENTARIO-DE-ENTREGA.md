# Inventario de entrega solicitado

| Requisito solicitado | ¿Está en este paquete? | Ubicación / observación |
| --- | --- | --- |
| Código fuente completo | **Parcial** | El ZIP auditado trae build compilado, no `src/` original. Recuperar el repo `Electroingenieria-SAS/AULA-EI` para completar este punto. |
| Repositorio Git o código completo | **Referencia identificada** | Vercel está vinculado a `Electroingenieria-SAS/AULA-EI`. |
| Frontend | **Sí, ejecutable** | `index.html`, `404.html`, `assets/`, `brand/`. |
| Backend/API | **Sí** | Supabase: PostgreSQL/Auth/Storage/RPC/Edge Functions. |
| Scripts | **Sí** | `scripts/` + asistentes `PREPARAR-Y-DESPLEGAR*`. |
| Dependencias | **Sí/documentadas** | `package.json`; paquete estático no requiere instalar dependencias. Edge Functions fijan su SDK. |
| Migraciones | **Sí** | `supabase/migrations/`. |
| `.env.example` | **Sí** | `.env.example`, sin secretos reales. |
| README de instalación | **Sí** | `README.md`, `LEEME-PRIMERO.md`, `docs/GUIA_DOMINIO_PASO_A_PASO.md`. |
| Inventario de servicios | **Sí** | `docs/ENTREGA_TECNICA_DOMINIO_SEGURIDAD.md`. |
| Inventario de credenciales | **Sí, por tipo y ubicación** | No se incluyen valores secretos. Ver documento técnico. |
| Permisos necesarios | **Sí** | Documento técnico + RLS/migración. |
| Credenciales a regenerar | **Sí, criterios** | Documento técnico explica cuándo rotar; no se exponen valores. |
| Claves automáticas del servidor | **Sí, plantilla** | `.env.example`; secretos deben configurarse en su secret store. |
| Procedimiento de dominio | **Sí** | `docs/GUIA_DOMINIO_PASO_A_PASO.md`. |
| Asistente ejecutable | **Sí** | Windows `.cmd/.ps1`; macOS/Linux `.sh`. |
