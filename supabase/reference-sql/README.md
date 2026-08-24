# SQL histórico de referencia

Estos archivos estaban sueltos en la raíz del ZIP. Se conservaron para trazabilidad, pero **no deben ejecutarse juntos ni en orden alfabético**.

Problemas confirmados:

- mezclan roles `visitor/worker` con `colaborador/creador_contenido/revisor`;
- redefinen varias veces funciones y políticas con comportamientos distintos;
- declaran diseños incompatibles de `audit_logs`;
- incluyen reparaciones de datos junto con cambios de esquema;
- no traen las migraciones iniciales de cursos, contenidos, preguntas, progreso y certificados;
- algunas consultas cambian usuarios específicos a `super_admin`.

La forma segura de usarlos es comparar cada objeto con el esquema vivo y convertir únicamente el cambio necesario en una migración nueva y probada.

