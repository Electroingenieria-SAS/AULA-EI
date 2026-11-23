# Crea tu avatar — Aula EI

Integración React 18/Vite con 34 personajes completos provenientes del paquete aprobado, sin composición por capas.

## Recursos

`avatars/media/aula-ei-avatar-assets-34.tgz` es una copia optimizada y verificada (SHA-256 protegido por `scripts/prepare-avatar-assets.mjs`) con 34 ilustraciones AVIF 512×512, 8 fondos AVIF y `catalogo.json`. La preparación extrae los recursos en `public/avatars/` antes de compilación, la carpeta queda ignorada por Git; la distribución final no depende de Google Drive, CDN de terceros ni almacenamiento de usuarios. No se incluyen los 34 PNG originales de 45 MB en el build.

## Persistencia y permisos

La RPC `public.set_my_aula_avatar(p_avatar_id,p_background_id)` autentica con `auth.uid()` y `public.is_aula_active()`, valida por lista cerrada de IDs y solo actualiza `public.profiles.avatar_url` del usuario actual. El valor guardado tiene formato `aula-ei-avatar:EI-ANALISTA-M-01:FON-07`, nunca una URL libre. Los personajes nunca modifican el cargo, los roles de autorización o las matrículas.

La función existente `get_my_profile()` devuelve `avatar_url`. El valor se actualiza inmediatamente en estado React; también se devuelve a los responsables autorizados desde `get_training_colleague_profile()`, sin ampliar permisos para datos académicos.

## Inicio y edición

`#/mi-personaje` abre el editor por demanda. Se lanza la bienvenida opcional después de que LegalGate y AdminMfaGate autoricen el acceso y solo en Inicio/Catálogo. `Ahora no` se guarda en sessionStorage por ID de usuario (no se conserva entre dispositivos ni sesiones nuevas). El editor selecciona solo combinaciones presentes, dos precargas vecinas como máximo y respeta `prefers-reduced-motion`.

## Verificación

`npm run build` prepara el archivo y ejecuta `npm run test:avatar-builder` antes de las pruebas existentes de seguridad, base de datos, accesibilidad, móvil y PWA. El CI protegido debe pasar Build & browser smoke, Guided Slides, CodeQL y Dependency Security antes de publicar el cambio.

Prueba funcional autenticada con usuario de prueba y MFA real: abrir el editor, seleccionar una variante, guardar, verificar persistencia de `get_my_profile`, comprobar en otra pestaña/dispositivo y editar nuevamente. La prueba manual con credenciales reales no se simula con SQL de administrador.
