# Seguridad

## Información que nunca debe publicarse

- llaves `service_role` o secret keys de Supabase;
- contraseñas de usuarios;
- tokens personales de GitHub o Supabase;
- archivos `.env` reales;
- copias de base de datos con información personal;
- capturas de pantalla que expongan sesiones o credenciales.

La URL del proyecto y la publishable key pueden existir en el frontend, pero solo son seguras si todas las tablas expuestas usan RLS y privilegios mínimos.

## Eliminación de usuarios

- La autorización se valida dentro de `delete-managed-user` consultando el rol vigente de quien solicita y de la cuenta objetivo.
- El navegador nunca recibe la llave de servicio.
- La función exige JWT, bloquea autoeliminación y rechaza roles iguales o superiores.
- Para pruebas de producción no se deben borrar cuentas reales: usa usuarios de prueba controlados y confirma primero sus dependencias y objetos de Storage.

## Reportar una vulnerabilidad

No publiques credenciales ni detalles explotables en un Issue abierto. Comunica el hallazgo de forma privada al responsable técnico del repositorio e incluye:

- descripción y alcance;
- pasos mínimos para reproducir;
- rol afectado;
- evidencia sin datos personales;
- recomendación de contención;
- versión o commit afectado.

## Respuesta inicial

1. Revocar o rotar cualquier secreto expuesto.
2. Preservar logs y evidencia.
3. Bloquear temporalmente la función o ruta afectada si existe riesgo activo.
4. Corregir primero en un entorno de prueba.
5. Validar RLS, funciones, logs y sesiones existentes.
6. Publicar el arreglo y documentar lo ocurrido sin revelar información sensible.
