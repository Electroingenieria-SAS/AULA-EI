# Cómo contribuir

## Flujo de trabajo

1. Actualiza tu copia de la rama `main`.
2. Crea una rama corta y descriptiva, por ejemplo `fix/logo-login` o `docs/soporte-supabase`.
3. Haz un cambio a la vez y evita mezclar ajustes visuales, SQL y documentación en la misma entrega.
4. Ejecuta `npm run verify`.
5. Prueba localmente con `npm run dev`.
6. Abre un Pull Request indicando qué cambió, cómo se probó y cómo se revierte.

## Reglas obligatorias

- No subir contraseñas, tokens, llaves secretas ni `service_role`.
- No modificar `assets/*.js` ni `assets/*.css` manualmente. La excepción temporal de esta entrega se reproduce únicamente con `npm run patch:user-deletion` sobre el build reconocido.
- No ejecutar SQL histórico directamente en producción.
- Mantener `index.html` y `404.html` sincronizados con `npm run sync:404`.
- No acumular builds antiguos en `assets/`: primero validar el nuevo build y luego retirar únicamente los archivos sin referencias.
- Para cambios de base de datos, crear una migración nueva, revisarla en un entorno de prueba y documentar reversión.

## Lista del Pull Request

- [ ] `npm run verify` termina correctamente.
- [ ] La página principal carga localmente.
- [ ] No se incluyeron secretos.
- [ ] Se actualizaron las instrucciones afectadas.
- [ ] Existe un procedimiento de reversión si el cambio toca Supabase o el despliegue.
