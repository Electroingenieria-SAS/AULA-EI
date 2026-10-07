# Diseño de cumplimiento legal, privacidad y evidencia — AULA EI

Fecha: 2026-10-07  
Estado: Especificación para revisión  
Repositorio: `Electroingenieria-SAS/AULA-EI`

## 1. Objetivo

AULA EI incorporará una capa integral de cumplimiento jurídico, privacidad, seguridad y evidencia electrónica. El sistema no se limitará a publicar documentos legales: deberá controlar qué versión aplica a cada usuario, impedir el acceso cuando falte una aceptación obligatoria, conservar prueba verificable de la aceptación, permitir la atención de derechos del titular y soportar auditoría, retención, incidentes y continuidad.

La política corporativa existente `DA-PL-005` será el punto de partida documental. No se eliminará ni se sustituirá silenciosamente. Se preparará una versión reforzada y controlada, alineada con el funcionamiento real de AULA EI y con los procesos internos de ELECTROINGENIERÍA S.A.S.

## 2. Alcance de usuarios

AULA EI admite tres contextos de uso:

1. **Colaborador activo**: persona ya vinculada a ELECTROINGENIERÍA.
2. **Preingreso aprobado**: persona cuyo ingreso fue aprobado y puede recibir inducción antes del inicio formal.
3. **Candidato**: persona mayor de edad que excepcionalmente usa AULA EI para una evaluación o proceso de selección.

El caso ordinario es el colaborador activo. Los escenarios de preingreso y candidato son excepcionales.

Todos los usuarios son mayores de 18 años.

## 3. Exclusiones obligatorias

AULA EI no debe almacenar, mostrar ni recibir:

- historias clínicas;
- diagnósticos;
- resultados médicos ocupacionales;
- conceptos de aptitud;
- restricciones médicas;
- soportes clínicos;
- datos de menores de edad;
- datos destinados a publicidad comportamental;
- información proveniente de trackers externos.

No se integrarán Google Analytics, Meta Pixel, Hotjar, Microsoft Clarity u otros mecanismos de seguimiento de terceros.

## 4. Decisiones laborales y rankings

AULA EI puede calcular puntajes, resultados y rankings de evaluaciones, capacitación o selección.

AULA EI **no decide automáticamente una contratación, continuidad laboral, ascenso o terminación**. Los resultados son insumos para Gestión Humana y otros responsables autorizados. La decisión final es humana y puede considerar variables externas a AULA EI.

La interfaz deberá evitar textos que presenten un ranking como una decisión definitiva.

## 5. Arquitectura documental

El sistema gestionará documentos legales versionados. Como mínimo:

- `CORP-DATA`: Política corporativa de tratamiento de datos personales.
- `AULA-PRIV`: Aviso de privacidad específico de AULA EI.
- `AULA-TYC`: Términos y condiciones / condiciones de uso.
- `AULA-STORAGE`: Política de almacenamiento local, cookies y tecnologías similares.
- `AULA-SEC`: Política de seguridad y uso aceptable.
- `AULA-CAND`: Aviso y autorización para candidatos.
- `AULA-PRE`: Aviso para preingreso e inducción.
- `AULA-RET`: Política/matriz de conservación y supresión.
- `AULA-INC`: Procedimiento de incidentes de privacidad y seguridad.
- `AULA-SLA`: Acuerdo interno de niveles de servicio y continuidad.

Los documentos deben ser visibles desde un Centro de Privacidad y Legal dentro de la aplicación y, cuando corresponda, desde la pantalla de acceso.

## 6. Versionado y materialidad

Cada documento tendrá versiones independientes.

Una nueva versión puede clasificarse como:

- **no material**: ortografía, diseño, estructura o correcciones sin cambio de finalidad, derechos, obligaciones o alcance;
- **material**: cambio de finalidad, categoría de datos, proveedor relevante, tratamiento, retención, transmisión/transferencia, derechos, obligaciones, responsabilidades o condiciones de uso.

Solo una versión material obliga a reaceptar.

Una versión publicada no podrá sobrescribirse. Cualquier cambio posterior crea una nueva versión.

## 7. Gate de aceptación

Flujo obligatorio:

`login -> sesión válida -> resolución de obligaciones legales -> gate -> aplicación`

Si el usuario tiene todas las versiones obligatorias vigentes aceptadas, continúa normalmente.

Si falta una aceptación:

- se bloquea el acceso funcional al LMS;
- se muestra el documento completo o una vista accesible del mismo;
- el usuario debe confirmar lectura y aceptar;
- no habrá casillas preseleccionadas;
- no habrá aceptación implícita por continuar navegando.

La aceptación se hará documento por documento o mediante un paquete claramente identificado cuando todos los documentos del paquete se presenten íntegramente.

## 8. Reglas por tipo de usuario

### Colaborador activo

Obligatorios:

- CORP-DATA;
- AULA-PRIV;
- AULA-TYC;
- AULA-STORAGE;
- AULA-SEC.

### Preingreso aprobado

Obligatorios:

- CORP-DATA;
- AULA-PRIV;
- AULA-TYC;
- AULA-STORAGE;
- AULA-SEC;
- AULA-PRE.

### Candidato

Obligatorios antes de iniciar una evaluación:

- CORP-DATA;
- AULA-PRIV;
- AULA-STORAGE;
- AULA-CAND;
- términos específicos de la evaluación cuando existan.

Si un candidato posteriormente se vincula, AULA EI no reutiliza automáticamente su aceptación de selección para finalidades laborales. Se le exigirán las versiones aplicables a colaborador.

## 9. Modelo de datos

### 9.1 `legal_documents`

Campos mínimos:

- `id uuid pk`
- `code text unique not null`
- `title text not null`
- `category text not null`
- `is_active boolean not null default true`
- `created_at timestamptz not null`
- `created_by uuid`

### 9.2 `legal_document_versions`

Campos mínimos:

- `id uuid pk`
- `document_id uuid not null fk legal_documents`
- `version text not null`
- `content_markdown text not null`
- `content_sha256 text not null`
- `is_material boolean not null`
- `status text not null check in ('draft','approved','published','retired')`
- `effective_at timestamptz`
- `published_at timestamptz`
- `approved_at timestamptz`
- `approved_by uuid`
- `created_at timestamptz not null`
- `created_by uuid`
- unique(`document_id`, `version`)

Solo versiones `published` y vigentes pueden generar obligaciones.

### 9.3 `legal_audience_rules`

Define qué documento aplica a qué tipo de usuario.

Campos:

- `id uuid pk`
- `document_id uuid not null`
- `audience text not null check in ('employee','prehire','candidate')`
- `required boolean not null default true`
- `created_at timestamptz not null`

### 9.4 `legal_acceptances`

Registro probatorio, append-only.

Campos:

- `id uuid pk`
- `user_id uuid not null`
- `document_version_id uuid not null`
- `document_code text not null`
- `document_version text not null`
- `document_sha256 text not null`
- `user_type text not null`
- `accepted_at timestamptz not null default now()`
- `acceptance_method text not null default 'authenticated_explicit_acceptance'`
- `auth_session_id uuid`
- `application_version text`
- `created_at timestamptz not null default now()`
- unique(`user_id`, `document_version_id`)

No se almacenará IP por defecto. La identidad se acredita con sesión autenticada y la relación con el usuario.

No se permitirá UPDATE ni DELETE a usuarios finales. Cualquier corrección administrativa excepcional debe producir un nuevo evento de auditoría, no alterar la evidencia original.

### 9.5 `privacy_requests`

Para consultas, actualización, corrección, supresión y revocatoria.

Campos:

- `id uuid pk`
- `requester_user_id uuid`
- `request_type text not null`
- `description text not null`
- `status text not null`
- `received_at timestamptz not null`
- `due_at timestamptz not null`
- `extension_used boolean not null default false`
- `resolution text`
- `resolved_at timestamptz`
- `resolved_by uuid`
- `created_at timestamptz not null`

### 9.6 `privacy_incidents`

Acceso restringido a responsables autorizados.

Campos mínimos:

- `id uuid pk`
- `severity text not null`
- `category text not null`
- `detected_at timestamptz not null`
- `reported_internal_at timestamptz`
- `description text not null`
- `affected_scope text`
- `containment text`
- `root_cause text`
- `remediation text`
- `regulatory_report_required boolean`
- `regulatory_reported_at timestamptz`
- `status text not null`
- `created_by uuid not null`
- `created_at timestamptz not null`

### 9.7 `retention_rules`

No se hardcodearán plazos dispersos en frontend.

Campos:

- `id uuid pk`
- `data_category text unique not null`
- `trigger_event text not null`
- `retention_basis text not null`
- `retention_days integer`
- `action text not null check in ('delete','anonymize','archive','review')`
- `is_active boolean not null`
- `approved_by uuid`
- `approved_at timestamptz`

Los plazos se parametrizarán conforme a la tabla de retención aprobada por la organización y a obligaciones legales aplicables. La aplicación no presumirá que toda información se elimina al finalizar la relación laboral.

## 10. Seguridad y RLS

Toda tabla de cumplimiento en esquema expuesto debe tener RLS.

Principios:

- usuario final: solo puede leer documentos publicados y sus propias aceptaciones;
- usuario final: puede insertar su propia aceptación exclusivamente mediante una RPC controlada;
- usuario final: no puede editar ni eliminar aceptaciones;
- administrador común de AULA EI: no adquiere automáticamente acceso a incidentes de privacidad;
- acceso a incidentes y configuración jurídica: rol específico de cumplimiento o Super Admin autorizado;
- las RPC `SECURITY DEFINER` deberán usar `search_path` explícito y autorización interna;
- `anon` no tendrá acceso a evidencia, solicitudes ni incidentes;
- no se confiará en `user_metadata` para autorización.

## 11. RPC y servicios previstos

### `get_my_legal_requirements()`

Devuelve:

- documentos obligatorios;
- versión vigente;
- si fue aceptada;
- motivo de reaceptación;
- URL/ruta de consulta.

### `accept_legal_document(p_document_version_id uuid, p_application_version text)`

Debe:

1. validar sesión autenticada;
2. determinar el usuario;
3. comprobar que la versión está publicada;
4. comprobar que aplica al tipo de usuario;
5. obtener el hash almacenado del documento;
6. registrar aceptación de forma idempotente;
7. devolver evidencia de aceptación.

### `get_my_legal_acceptances()`

Solo devuelve evidencia propia.

### `admin_publish_legal_document_version(...)`

Solo para rol autorizado y MFA AAL2.

No debe permitir modificar una versión ya publicada.

## 12. Integridad documental

El hash `SHA-256` se calculará sobre una representación canónica del contenido legal.

Al publicar una versión:

- se calcula el hash;
- se guarda junto al contenido;
- queda inmutable;
- cada aceptación copia el hash correspondiente.

De este modo la evidencia no depende de que el texto futuro conserve la misma ubicación o presentación visual.

## 13. Centro de Privacidad y Legal

Nueva sección visible desde AULA EI.

Debe permitir al usuario:

- consultar documentos vigentes;
- consultar versiones aceptadas;
- ver fecha de aceptación;
- descargar o imprimir una copia legible;
- conocer el canal de privacidad;
- iniciar una solicitud de derechos;
- consultar el estado de sus solicitudes.

Debe existir acceso desde login y desde sesión iniciada.

## 14. Gestión de derechos del titular

Tipos de solicitud:

- consulta;
- corrección;
- actualización;
- supresión;
- revocatoria cuando proceda;
- reclamo.

El sistema no ejecutará automáticamente una supresión total.

Antes de eliminar o anonimizar datos deberá evaluarse:

- obligación legal de conservación;
- evidencia de capacitación;
- SG-SST;
- relación contractual;
- defensa de reclamaciones;
- auditoría;
- integridad de certificados.

La respuesta debe diferenciar datos eliminables de datos sujetos a conservación obligatoria.

## 15. Ciclo de vida por tipo de usuario

### Candidato no seleccionado

- se bloquea la cuenta;
- se impide nuevo acceso;
- se activa la regla de retención aplicable;
- no se convierte en perfil de colaborador;
- su información no se utiliza para finalidades laborales distintas sin base y comunicación apropiadas.

### Candidato seleccionado / preingreso

- puede migrar a `prehire`;
- recibe las nuevas obligaciones legales;
- conserva trazabilidad de las aceptaciones previas.

### Colaborador activo

- se aplican políticas de formación, evaluación, certificados y cumplimiento.

### Retiro

- se revoca el acceso;
- no se destruyen automáticamente registros sujetos a conservación;
- se aplican reglas de archivo, anonimización, eliminación o revisión por categoría.

## 16. Cookies y almacenamiento local

Como no existen trackers externos, AULA EI no mostrará un banner de marketing de “aceptar todas/rechazar todas”.

Se creará un inventario técnico de:

- sesión de Supabase;
- autenticación;
- MFA;
- preferencias de interfaz;
- caché/PWA;
- almacenamiento funcional indispensable.

Cada entrada deberá documentar:

- nombre técnico;
- tecnología;
- finalidad;
- alcance;
- duración;
- proveedor;
- necesidad.

No se introducirá almacenamiento no esencial sin actualizar el inventario y evaluar si requiere consentimiento adicional.

## 17. Proveedores y tratamiento por terceros

Se mantendrá una matriz de proveedores que realmente intervienen en el tratamiento, incluyendo como mínimo los servicios de backend, hosting/despliegue y correo si aplica.

Para cada proveedor:

- función;
- categoría de datos;
- ubicación/procesamiento;
- rol contractual;
- mecanismo de seguridad;
- contrato/DPA aplicable;
- subencargados relevantes;
- proceso de baja o sustitución.

No se afirmará que los datos permanecen exclusivamente en Colombia si la infraestructura real no lo garantiza.

## 18. Seguridad operativa

El sistema de cumplimiento se apoyará en los controles ya existentes:

- autenticación Supabase;
- MFA AAL2 para administración;
- RLS;
- Edge Functions protegidas;
- DR;
- auditoría;
- CI;
- branch protection;
- control de secretos.

Además:

- las aceptaciones se tratarán como evidencia crítica;
- los incidentes tendrán acceso restringido;
- documentos legales publicados no serán mutables;
- toda publicación o retiro de versiones deberá quedar auditado.

## 19. Incidentes

Flujo:

`detección -> clasificación -> contención -> análisis -> remediación -> evaluación regulatoria -> cierre`

El módulo debe registrar fechas, responsable, alcance, acciones y evidencia.

No debe enviar automáticamente una notificación regulatoria sin revisión humana autorizada.

## 20. SLA y continuidad

Se creará un SLA interno realista, no una promesa comercial ficticia.

Debe cubrir:

- disponibilidad objetivo;
- ventanas de mantenimiento;
- clasificación de incidentes;
- tiempos objetivo de respuesta;
- recuperación;
- DR;
- RPO/RTO;
- copias de seguridad;
- dependencias de terceros;
- exclusiones por fuerza mayor o indisponibilidad de proveedores.

Los objetivos no podrán exceder garantías que la infraestructura utilizada no pueda razonablemente soportar.

## 21. SSL/TLS y cabeceras

AULA EI debe operar exclusivamente sobre HTTPS en producción.

Se verificará:

- certificado TLS válido;
- redirección a HTTPS;
- HSTS cuando sea compatible;
- CSP;
- X-Content-Type-Options;
- Referrer-Policy;
- Permissions-Policy;
- ausencia de mixed content.

## 22. Certificados de capacitación

Los certificados de AULA EI deberán distinguir entre:

- evidencia de finalización de una capacitación;
- constancia emitida por la empresa;
- certificaciones externas reguladas, si alguna vez existieran.

No se presentará un certificado interno como licencia profesional, habilitación estatal o certificación de tercero.

El certificado deberá incorporar identificador verificable y trazabilidad de la capacitación.

## 23. Política corporativa reforzada

La siguiente versión de la política corporativa debe incorporar, como mínimo:

- identificación del responsable;
- alcance;
- categorías de titulares;
- categorías de datos;
- principios;
- finalidades por proceso;
- selección;
- preingreso;
- relación laboral;
- formación y evaluación;
- certificados;
- rankings;
- registros técnicos;
- seguridad;
- encargados;
- transmisión/transferencia;
- conservación;
- derechos;
- consultas y reclamos;
- incidentes;
- vigencia;
- cambios materiales;
- control documental.

La política deberá indicar expresamente que AULA EI no trata información médica ocupacional.

## 24. Texto de términos de uso

Los términos deberán cubrir:

- finalidad corporativa del LMS;
- carácter personal de las credenciales;
- prohibición de compartir cuentas;
- integridad de evaluaciones;
- prohibición de manipulación;
- disponibilidad;
- mantenimiento;
- propiedad intelectual;
- uso de materiales;
- resultados y rankings;
- alcance de certificados;
- suspensión de cuentas;
- seguridad;
- responsabilidades del usuario;
- limitaciones razonables y legales;
- canal de soporte;
- cambios materiales y reaceptación.

No se incluirán cláusulas que pretendan renunciar a derechos irrenunciables ni exoneraciones absolutas incompatibles con la ley.

## 25. Estados de aprobación documental

Flujo administrativo:

`draft -> approved -> published -> retired`

- `draft`: editable.
- `approved`: aprobado internamente, aún no vigente.
- `published`: vigente e inmutable.
- `retired`: deja de generar nuevas obligaciones, pero permanece consultable como evidencia histórica.

Solo usuarios autorizados con MFA AAL2 podrán aprobar/publicar.

## 26. Migración inicial

Al habilitar el sistema:

1. se crean tablas y RLS;
2. se cargan documentos iniciales como borradores;
3. se revisan y aprueban corporativamente;
4. se publican;
5. el gate entra en modo obligatorio;
6. todos los usuarios existentes deberán aceptar la versión vigente en su siguiente sesión.

No se generarán aceptaciones retroactivas falsas.

## 27. Auditoría

Eventos mínimos:

- creación de documento;
- creación de versión;
- aprobación;
- publicación;
- retiro;
- aceptación;
- intento de aceptación inválido;
- creación/cambio/cierre de solicitud de privacidad;
- creación/cambio/cierre de incidente;
- modificación de regla de retención.

Los logs no deben exponer contenido sensible innecesario.

## 28. Pruebas

### Unitarias

- resolución de documentos obligatorios;
- materialidad;
- cálculo/hash canónico;
- transición de estados;
- vencimientos de solicitudes.

### Integración

- usuario sin aceptación queda bloqueado;
- usuario con aceptación vigente entra;
- versión material fuerza reaceptación;
- versión no material no fuerza reaceptación;
- candidato convertido en colaborador recibe nuevo paquete;
- usuario no puede aceptar por otro usuario;
- aceptación repetida es idempotente;
- aceptación no puede borrarse por usuario final.

### Seguridad

- RLS por tabla;
- `anon` denegado;
- MFA para publicación;
- no acceso cruzado entre usuarios;
- no UPDATE/DELETE de evidencia;
- funciones privilegiadas con `search_path` seguro.

### E2E

- login -> gate -> aceptación -> LMS;
- reaceptación por cambio material;
- Centro de Privacidad;
- solicitud de derechos;
- bloqueo de candidato retirado;
- responsive móvil y escritorio.

## 29. Criterios de aceptación del proyecto

El frente se considera técnicamente cerrado cuando:

1. existe política corporativa reforzada y documentos específicos aprobados;
2. los documentos están versionados y publicados;
3. el gate bloquea correctamente;
4. cada aceptación queda registrada con usuario, versión, fecha y hash;
5. RLS y RPC impiden suplantación o alteración de evidencia;
6. existe Centro de Privacidad y Legal;
7. existe flujo de derechos;
8. existe módulo/registro restringido de incidentes;
9. existe matriz de retención;
10. existe inventario de almacenamiento local;
11. existe matriz de proveedores;
12. existe SLA interno;
13. HTTPS/cabeceras pasan las verificaciones;
14. CI y pruebas de seguridad están verdes;
15. no se almacenan datos médicos;
16. no se incluyen menores;
17. no hay trackers externos;
18. ningún ranking se presenta como decisión automática de contratación.

## 30. Gobernanza y aprobación

La implementación técnica puede ser desarrollada por el equipo de AULA EI, pero la publicación de la política corporativa y documentos con efectos institucionales debe contar con aprobación del responsable interno que ELECTROINGENIERÍA designe.

AULA EI no reemplaza las funciones de Gestión Humana, SST, Jurídica o de protección de datos; proporciona infraestructura, control, evidencia y cumplimiento operativo.

## 31. Fuentes jurídicas base para redacción

La redacción definitiva deberá contrastarse al menos con:

- Ley 1581 de 2012;
- Decreto 1074 de 2015 y normas que desarrollan protección de datos;
- Ley 527 de 1999 sobre mensajes de datos;
- Decreto 1072 de 2015 para conservación de registros cuando aplique al SG-SST;
- lineamientos y conceptos vigentes de la Superintendencia de Industria y Comercio;
- política corporativa `DA-PL-005` vigente de ELECTROINGENIERÍA S.A.S.

La aplicación debe privilegiar minimización, finalidad, acceso restringido, trazabilidad, integridad y responsabilidad demostrada.
