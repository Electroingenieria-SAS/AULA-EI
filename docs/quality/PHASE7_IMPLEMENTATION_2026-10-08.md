# Fase 7 — Evolución de la experiencia formativa

**Inicio:** 2026-10-08  
**Repositorio:** Electroingenieria-SAS/AULA-EI  
**Despliegue:** PR → gate completo (build/navegador/CodeQL/dependencias) → main → GitHub Pages + Vercel mismo SHA

## Alcance y estado

| Entrega | Producto | Estado |
| --- | --- | --- |
| 7.1 | Mi plan de formación: prioridades, fechas, filtros, progreso, rutas bloqueadas, actualización | Implementado en PR, sujeto a aceptación y publicación |
| 7.2 | Seguimiento y recordatorios: reducir ruido del centro de avisos existente, navegación a planes, evitar duplicación de backend | Por desarrollar |
| 7.3 | Gestión para responsables: seguimiento agregado seguro con autorización por rol, sin acceso cruzado | Por desarrollar |
| 7.4 | Consolidación: pruebas con cuentas autorizadas, rendimiento, accesibilidad y observabilidad | Por desarrollar |

## Criterios de Fase 7.1

- Proyección **solo lectura** desde \`get_my_home_snapshot\` con caché compartida 45 s, recarga explícita y manejo de error.
- Priorización: vencido → próximo a vencer (7 días) → en curso → pendiente con fecha → pendiente sin fecha → bloqueado → cumplido.
- Las rutas institucionales obligatorias **bloqueadas tienen precedencia sobre una asignación visible**; no se ofrece botón para abrirlas.
- El jugador de cursos sigue validando acceso con los controles existentes, sin confiar en la UI.
- Los filtros muestran estados reales; los cursos sin asignación no se inventan y una fecha de vencimiento no equivale a caducidad de un certificado.
- El responsive de 320 a 1440 px debe ser revisado con sesión autenticada. La barra móvil conserva el número de opciones existente.
- No modifica notas, certificados, preguntas de exámenes, perfiles ni registro oficial; no añade servicios de pago ni tablas.

## Validación

Las pruebas automáticas de fase 7.1 verifican prioridades, permisos bloqueados, acceso desde inicio y desarrollo, rutas, CSS lazy y ausencia de mutaciones a calificaciones. Build y browser smoke prueban el login público.

**Cierre pendiente:** la aceptación visual/funcional de Fase 6 y de esta Fase 7.1 requiere un usuario de prueba autenticado con varios cursos (vencido, futuro, bloqueado, cumplido) y revisión manual de móvil/desktop. No afirmar “certificado” sin ello. Los pendientes de seguridad y restauración de Fase 5 siguen siendo independientes.
