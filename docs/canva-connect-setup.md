# Integración oficial Canva → AULA EI

## Qué hace
En **Capacitaciones → Examen final → Sugerir con IA** puedes pegar la URL de un diseño Canva y, **tras conectar tu propia cuenta Canva**, generar preguntas basadas en el contenido de sus diapositivas sin cargar un PDF a mano.

El backend solicita a la API oficial Canva la exportación PDF temporal del diseño y lo envía al proveedor IA configurado para generar preguntas. Se conservan la selección, edición y publicación manual del examen. Alternativamente, sigue funcionando la carga de PDF local.

**Un enlace público de Canva por sí solo permite incrustar el visor, pero NO autoriza a descargar y analizar todas sus páginas.** No hay scraping ni generación a partir de metadatos de un link. El usuario debe autorizar Canva vía OAuth 2.0 PKCE y tener permisos sobre el diseño.

## Habilitación externa necesaria (una vez)

1. Crear una integración «Outside Canva / Canva REST APIs» en [Canva Developers](https://www.canva.com/developers/).
2. Habilitar permisos `design:content:read` y `design:meta:read`.
3. Registrar literalmente este Redirect URL de la integración:

   `https://ipoidimevokogptydbvt.supabase.co/functions/v1/aula-canva-connect`

4. En el proyecto Supabase **ipoidimevokogptydbvt → Edge Functions → Secrets**, configurar estas variables **sin publicarlas en GitHub**:
   - `CANVA_CLIENT_ID`: ID de la integración en Canva Developers.
   - `CANVA_CLIENT_SECRET`: secreto obtenido en el portal de Canva.
   - `CANVA_TOKEN_KEY`: cadena base64 que representa **exactamente 32 bytes criptográficamente aleatorios**, destinada exclusivamente al cifrado AES-256-GCM de los tokens.
   - `OPENAI_API_KEY`: clave facturable para el análisis de PDFs con IA (necesaria también para el flujo manual de PDF).
   - Opcional: `AULA_EI_AI_MODEL` para seleccionar un modelo compatible con entrada PDF y JSON Schema.
5. Implementar la migración `20261021210000_canva_oauth_connections.sql` y desplegar las Edge Functions:
   - `aula-canva-connect`: `verify_jwt=false` **solo para recibir el callback GET de Canva**. Los POST exigen sesión Supabase y permiso `can_manage_courses()`; callback protegido por estado de un solo uso, caducidad y PKCE.
   - `analyze-course-pdf`: `verify_jwt=true`.
6. Abrir AULA EI y entrar en `Sugerir con IA → Conectar Canva`. El usuario acepta el acceso en Canva y regresa a AULA EI. Ahora `Analizar enlace de Canva` exportará y analizará el diseño si el usuario conectado puede acceder a él.

## Protección de datos y límites

- Las claves privadas Canva y OpenAI solo se leen en Supabase Edge Functions.
- Los tokens por usuario se guardan cifrados AES-GCM, con RLS activada y permisos de tabla retirados a `anon` y `authenticated`.
- Los trabajos de exportación no se guardan permanentemente; el contenido PDF se envía al proveedor IA **solo tras consentimiento explícito**.
- Máximo cinco análisis por usuario/hora con el RPC corporativo `consume_aula_security_rate_limit`.
- Máximo 4 MiB por PDF procesado. Si el diseño produce un archivo superior se indica la causa y se ofrece la alternativa de PDF comprimido.
- Si falta alguna clave, el sistema debe mostrar un mensaje accionable; no generar preguntas sin examinar el contenido.
- Canva Connect requiere autorización de usuario y un diseño al que ese usuario tenga acceso. Tener un enlace «público» no garantiza ese permiso de la API.
