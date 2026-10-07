# Matriz técnica de retención — AULA EI

Fecha de control: 2026-10-07

Esta matriz es una línea base técnica. Los periodos no fijados expresamente por ley deben ser ratificados por el responsable corporativo de gestión documental/jurídica antes de convertirse en un plazo automático de eliminación.

| Categoría | Evento inicial | Regla de conservación | Disposición | Automatización |
|---|---|---|---|---|
| Capacitación/formación/entrenamiento SG-SST comprendida por la obligación legal | Terminación de la relación laboral | Mínimo legal aplicable; para los registros cubiertos por el art. 2.2.4.6.13 del Decreto 1072 de 2015, veinte años desde el cese de la relación laboral | Archivo controlado y eliminación al vencer el término, sujeto a TRD | No borrar automáticamente sin clasificación |
| Certificados internos y evidencias de capacitación no SG-SST | Cierre de capacitación o retiro | Según TRD corporativa, auditoría, defensa jurídica e integridad del certificado | Archivo / revisión / eliminación | Revisión |
| Aceptaciones legales | Aceptación de una versión | Mientras exista necesidad jurídica o probatoria de demostrar qué versión aceptó el titular | Archivo probatorio | No modificar ni borrar por usuario |
| Versiones legales publicadas/retiradas | Publicación/retiro | Históricas mientras existan aceptaciones o necesidad de auditoría | Archivo permanente durante la vida probatoria | Inmutables |
| Solicitudes de privacidad | Resolución/cierre | Plazo corporativo suficiente para demostrar atención de derechos y cumplimiento | Archivo / revisión | No borrado inmediato |
| Incidentes de privacidad/seguridad | Cierre del incidente | Según obligación legal, auditoría, defensa jurídica y gestión de riesgos | Archivo restringido | Revisión humana |
| Candidatos no seleccionados | Cierre del proceso de selección | Plazo definido por TRD corporativa y necesidad legítima; no conservar indefinidamente por defecto | Eliminar/anonimizar/revisar | Cuenta se deshabilita; disposición posterior controlada |
| Logs técnicos y de seguridad | Generación del evento | Mínimo necesario para seguridad, diagnóstico y auditoría, minimizando datos personales | Rotación/eliminación | Según política técnica |
| Cuenta de usuario | Retiro/no selección | El acceso se revoca inmediatamente; los datos asociados siguen su categoría documental | Deshabilitar primero; luego aplicar retención por categoría | No “borrado total” automático |

## Principios de ejecución

- Una solicitud de supresión no elimina automáticamente datos sujetos a obligación legal de conservación.
- Una cuenta desactivada no equivale a destrucción del expediente.
- Cuando un plazo no esté aprobado, la acción predeterminada es `review`, no `delete`.
- Cualquier automatización futura de borrado deberá generar auditoría, soportar legal hold y operar sobre categorías específicas, nunca sobre “todo el usuario”.
