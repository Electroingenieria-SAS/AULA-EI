-- Seed versioned legal documents for AULA EI.
-- Content SHA-256 is computed inside PostgreSQL from the exact stored UTF-8 text.

insert into public.legal_documents (code,title,category,is_active)
values ('CORP-DATA','Política Integral de Tratamiento de Datos Personales','corporate_policy',true)
on conflict (code) do nothing;

insert into public.legal_document_versions (
  document_id,version,content_markdown,content_sha256,is_material,status,effective_at,published_at,approved_at
)
select d.id,'2.0',$doc_0$# Política Integral de Tratamiento de Datos Personales — ELECTROINGENIERÍA S.A.S.

**Código de referencia:** DA-PL-005 · actualización integral  
**Versión:** 2.0  
**Responsable:** ELECTROINGENIERÍA S.A.S.  
**NIT:** 891.903.664-9  
**Domicilio:** Tuluá, Valle del Cauca, Colombia  
**Dirección:** Carrera 23 N.° 25-57  
**Correo para protección de datos:** protecciondedatos@ei.com.co  
**Sitio web:** www.ei.com.co

## 1. Objeto y alcance

ELECTROINGENIERÍA S.A.S., en calidad de Responsable del Tratamiento, adopta esta política para establecer reglas claras, verificables y proporcionales sobre la recolección, almacenamiento, uso, circulación, actualización, conservación, archivo, supresión y demás operaciones realizadas sobre datos personales.

La política aplica a las bases de datos y sistemas de información administrados por la compañía, incluidos los procesos de selección, preingreso, contratación, gestión humana, formación, evaluación, cumplimiento y seguridad de la información. AULA EI es uno de los sistemas internos cubiertos por esta política.

## 2. Marco general

El tratamiento se realizará conforme a la Constitución Política de Colombia, la Ley 1581 de 2012, sus normas reglamentarias compiladas en el Decreto 1074 de 2015, la Ley 527 de 1999 para mensajes de datos cuando corresponda, las disposiciones laborales y de seguridad y salud en el trabajo aplicables, y las instrucciones vigentes de la Superintendencia de Industria y Comercio.

## 3. Principios

ELECTROINGENIERÍA aplicará los principios de legalidad, finalidad, libertad, veracidad o calidad, transparencia, acceso y circulación restringida, seguridad, confidencialidad, necesidad, proporcionalidad, temporalidad y responsabilidad demostrada.

No se recolectarán datos únicamente porque técnicamente sea posible hacerlo. Cada dato deberá responder a una finalidad legítima, informada y verificable.

## 4. Categorías de titulares

La compañía puede tratar datos de, entre otros, trabajadores, ex trabajadores, contratistas, aspirantes, candidatos, personas con ingreso aprobado, proveedores, clientes y demás titulares relacionados con su operación. Dentro de AULA EI el alcance está restringido a personas mayores de edad que sean colaboradores, personas en preingreso o, excepcionalmente, candidatos autorizados para una evaluación.

## 5. Datos tratados

Según el proceso, pueden tratarse datos de identificación, contacto, relación laboral o contractual, cargo, dependencia, perfil de acceso, formación, asignaciones, resultados de evaluación, evidencias de capacitación, certificados, registros de actividad, seguridad, auditoría y soporte.

AULA EI no almacena historias clínicas, diagnósticos, restricciones médicas, resultados de exámenes médicos ocupacionales, conceptos de aptitud ni soportes clínicos. La información médica ocupacional se mantiene fuera de AULA EI y bajo los controles propios de Gestión Humana, SST y los prestadores autorizados.

## 6. Finalidades

Los datos podrán ser tratados para:

1. Gestionar procesos de selección, evaluación y vinculación.
2. Verificar identidad, habilitar cuentas y administrar perfiles y roles.
3. Asignar, ejecutar y evidenciar inducciones, reinducciones, capacitaciones y evaluaciones.
4. Generar constancias y certificados internos de formación.
5. Llevar trazabilidad del cumplimiento de obligaciones internas o legales.
6. Elaborar estadísticas y rankings internos relacionados con formación o resultados, sin que AULA EI adopte por sí sola decisiones de contratación, terminación, ascenso o continuidad.
7. Atender consultas, reclamos, solicitudes de soporte y derechos de los titulares.
8. Prevenir fraude, suplantación, abuso de cuentas y accesos no autorizados.
9. Mantener registros de auditoría, continuidad, respaldo y recuperación.
10. Cumplir obligaciones legales, contractuales, laborales, contables, de seguridad y salud en el trabajo y de defensa jurídica.
11. Realizar transmisiones de datos a proveedores tecnológicos indispensables, bajo condiciones contractuales y de seguridad apropiadas.

Los datos no se venderán ni se usarán para publicidad comportamental de terceros dentro de AULA EI.

## 7. Selección, preingreso y candidatos

Cuando AULA EI sea utilizada excepcionalmente por candidatos, los resultados constituyen un insumo del proceso de selección. El sistema puede generar puntajes o rankings, pero la decisión final corresponde a personas autorizadas de la organización y puede considerar entrevistas, requisitos del cargo, verificaciones, exámenes externos y otras variables legítimas.

Si un candidato no es seleccionado, su acceso se cerrará y sus datos quedarán sujetos a la regla de retención aplicable. Si posteriormente es vinculado, recibirá las autorizaciones, avisos y condiciones correspondientes al nuevo contexto.

## 8. Autorización, avisos y evidencia electrónica

Cuando la ley exija autorización, esta será previa, expresa e informada y podrá obtenerse mediante mecanismos físicos o electrónicos que permitan consulta posterior.

AULA EI registra de forma trazable las aceptaciones exigibles, asociando como mínimo usuario autenticado, documento, versión, fecha y hora, contexto jurídico y huella criptográfica SHA-256 del contenido. Las versiones publicadas se conservan para demostrar qué texto fue aceptado.

No se generan aceptaciones retroactivas ni se presume aceptación por silencio o mera navegación.

## 9. Derechos de los titulares

El titular puede conocer, actualizar y rectificar sus datos; solicitar prueba de la autorización cuando sea procedente; ser informado sobre el uso dado a sus datos; presentar consultas o reclamos; solicitar supresión o revocatoria cuando legalmente proceda; y acudir ante la Superintendencia de Industria y Comercio una vez agotado el trámite aplicable ante el Responsable.

Las solicitudes pueden enviarse a **protecciondedatos@ei.com.co** con información suficiente para identificar al titular y la petición.

## 10. Consultas y reclamos

Las consultas se atenderán dentro de los términos previstos por la Ley 1581 de 2012. Los reclamos de corrección, actualización, supresión o presunto incumplimiento seguirán el procedimiento legal aplicable. Cuando una solicitud no pueda ser resuelta en el término inicial, se informará la causa y la nueva fecha dentro de los límites legales.

AULA EI puede registrar solicitudes y fechas objetivo como mecanismo de control interno; el sistema no reemplaza el análisis humano de procedencia.

## 11. Conservación y supresión

La información se conservará durante el tiempo necesario para cumplir la finalidad y las obligaciones legales o contractuales aplicables. No existe una regla única de eliminación al terminar la relación laboral.

Los registros de capacitación, formación y entrenamiento en seguridad y salud en el trabajo que estén sujetos al Decreto 1072 de 2015 se conservarán por el término legal aplicable. Los demás registros estarán sujetos a la tabla de retención documental y a criterios de necesidad, defensa jurídica, auditoría, integridad de certificados y cumplimiento.

Cumplido el plazo y ausente una obligación de conservación, los datos serán eliminados, anonimizados, archivados o revisados según corresponda.

## 12. Seguridad y confidencialidad

La compañía aplicará controles administrativos, humanos y técnicos acordes con la naturaleza de la información y el riesgo. En AULA EI se incluyen autenticación, control de roles, RLS, MFA para administración, cifrado en tránsito, registros de auditoría, respaldo, continuidad, protección de secretos y restricciones de acceso.

Ninguna medida elimina por completo el riesgo. Los controles se revisarán y mejorarán conforme cambien la tecnología, el riesgo y la regulación.

## 13. Encargados, proveedores y tratamiento internacional

ELECTROINGENIERÍA podrá utilizar proveedores tecnológicos que actúen como Encargados o subencargados. Antes de habilitar un tratamiento relevante se evaluarán finalidad, categorías de datos, seguridad, ubicación del procesamiento, condiciones contractuales y mecanismos aplicables a transmisiones o transferencias internacionales.

No se afirmará que los datos permanecen exclusivamente en Colombia cuando la arquitectura del proveedor no lo garantice.

## 14. Incidentes

Los eventos de pérdida, acceso no autorizado, alteración, divulgación indebida, indisponibilidad o uso no autorizado serán gestionados mediante un procedimiento de detección, contención, análisis, remediación, evaluación regulatoria y cierre. Cuando exista obligación de reporte a la autoridad, la compañía lo realizará conforme a la normativa vigente.

## 15. Decisiones y perfiles

Los resultados de AULA EI no constituyen por sí solos decisiones laborales automatizadas. Toda decisión de alto impacto corresponde a responsables humanos autorizados y debe considerar el contexto y las reglas internas aplicables.

## 16. Tecnologías de almacenamiento

AULA EI utiliza almacenamiento estrictamente necesario para sesión, autenticación, seguridad, preferencias y funcionamiento PWA. No incorpora rastreadores publicitarios externos. El inventario técnico se mantiene actualizado en la documentación de la aplicación.

## 17. Cambios de política

Toda modificación material que cambie finalidades, categorías de datos, derechos, retención, proveedores relevantes, transferencias o responsabilidades será versionada y comunicada. AULA EI puede exigir una nueva aceptación cuando el cambio material afecte al titular.

Los cambios puramente editoriales o de forma pueden publicarse sin exigir reaceptación, conservando trazabilidad de versión.

## 18. Vigencia y control documental

Esta versión refuerza y actualiza los lineamientos históricos de DA-PL-005 para el entorno digital y debe integrarse al sistema de control documental corporativo. La compañía conservará versiones históricas para fines de evidencia y auditoría.
$doc_0$,
       encode(extensions.digest(convert_to($doc_0$# Política Integral de Tratamiento de Datos Personales — ELECTROINGENIERÍA S.A.S.

**Código de referencia:** DA-PL-005 · actualización integral  
**Versión:** 2.0  
**Responsable:** ELECTROINGENIERÍA S.A.S.  
**NIT:** 891.903.664-9  
**Domicilio:** Tuluá, Valle del Cauca, Colombia  
**Dirección:** Carrera 23 N.° 25-57  
**Correo para protección de datos:** protecciondedatos@ei.com.co  
**Sitio web:** www.ei.com.co

## 1. Objeto y alcance

ELECTROINGENIERÍA S.A.S., en calidad de Responsable del Tratamiento, adopta esta política para establecer reglas claras, verificables y proporcionales sobre la recolección, almacenamiento, uso, circulación, actualización, conservación, archivo, supresión y demás operaciones realizadas sobre datos personales.

La política aplica a las bases de datos y sistemas de información administrados por la compañía, incluidos los procesos de selección, preingreso, contratación, gestión humana, formación, evaluación, cumplimiento y seguridad de la información. AULA EI es uno de los sistemas internos cubiertos por esta política.

## 2. Marco general

El tratamiento se realizará conforme a la Constitución Política de Colombia, la Ley 1581 de 2012, sus normas reglamentarias compiladas en el Decreto 1074 de 2015, la Ley 527 de 1999 para mensajes de datos cuando corresponda, las disposiciones laborales y de seguridad y salud en el trabajo aplicables, y las instrucciones vigentes de la Superintendencia de Industria y Comercio.

## 3. Principios

ELECTROINGENIERÍA aplicará los principios de legalidad, finalidad, libertad, veracidad o calidad, transparencia, acceso y circulación restringida, seguridad, confidencialidad, necesidad, proporcionalidad, temporalidad y responsabilidad demostrada.

No se recolectarán datos únicamente porque técnicamente sea posible hacerlo. Cada dato deberá responder a una finalidad legítima, informada y verificable.

## 4. Categorías de titulares

La compañía puede tratar datos de, entre otros, trabajadores, ex trabajadores, contratistas, aspirantes, candidatos, personas con ingreso aprobado, proveedores, clientes y demás titulares relacionados con su operación. Dentro de AULA EI el alcance está restringido a personas mayores de edad que sean colaboradores, personas en preingreso o, excepcionalmente, candidatos autorizados para una evaluación.

## 5. Datos tratados

Según el proceso, pueden tratarse datos de identificación, contacto, relación laboral o contractual, cargo, dependencia, perfil de acceso, formación, asignaciones, resultados de evaluación, evidencias de capacitación, certificados, registros de actividad, seguridad, auditoría y soporte.

AULA EI no almacena historias clínicas, diagnósticos, restricciones médicas, resultados de exámenes médicos ocupacionales, conceptos de aptitud ni soportes clínicos. La información médica ocupacional se mantiene fuera de AULA EI y bajo los controles propios de Gestión Humana, SST y los prestadores autorizados.

## 6. Finalidades

Los datos podrán ser tratados para:

1. Gestionar procesos de selección, evaluación y vinculación.
2. Verificar identidad, habilitar cuentas y administrar perfiles y roles.
3. Asignar, ejecutar y evidenciar inducciones, reinducciones, capacitaciones y evaluaciones.
4. Generar constancias y certificados internos de formación.
5. Llevar trazabilidad del cumplimiento de obligaciones internas o legales.
6. Elaborar estadísticas y rankings internos relacionados con formación o resultados, sin que AULA EI adopte por sí sola decisiones de contratación, terminación, ascenso o continuidad.
7. Atender consultas, reclamos, solicitudes de soporte y derechos de los titulares.
8. Prevenir fraude, suplantación, abuso de cuentas y accesos no autorizados.
9. Mantener registros de auditoría, continuidad, respaldo y recuperación.
10. Cumplir obligaciones legales, contractuales, laborales, contables, de seguridad y salud en el trabajo y de defensa jurídica.
11. Realizar transmisiones de datos a proveedores tecnológicos indispensables, bajo condiciones contractuales y de seguridad apropiadas.

Los datos no se venderán ni se usarán para publicidad comportamental de terceros dentro de AULA EI.

## 7. Selección, preingreso y candidatos

Cuando AULA EI sea utilizada excepcionalmente por candidatos, los resultados constituyen un insumo del proceso de selección. El sistema puede generar puntajes o rankings, pero la decisión final corresponde a personas autorizadas de la organización y puede considerar entrevistas, requisitos del cargo, verificaciones, exámenes externos y otras variables legítimas.

Si un candidato no es seleccionado, su acceso se cerrará y sus datos quedarán sujetos a la regla de retención aplicable. Si posteriormente es vinculado, recibirá las autorizaciones, avisos y condiciones correspondientes al nuevo contexto.

## 8. Autorización, avisos y evidencia electrónica

Cuando la ley exija autorización, esta será previa, expresa e informada y podrá obtenerse mediante mecanismos físicos o electrónicos que permitan consulta posterior.

AULA EI registra de forma trazable las aceptaciones exigibles, asociando como mínimo usuario autenticado, documento, versión, fecha y hora, contexto jurídico y huella criptográfica SHA-256 del contenido. Las versiones publicadas se conservan para demostrar qué texto fue aceptado.

No se generan aceptaciones retroactivas ni se presume aceptación por silencio o mera navegación.

## 9. Derechos de los titulares

El titular puede conocer, actualizar y rectificar sus datos; solicitar prueba de la autorización cuando sea procedente; ser informado sobre el uso dado a sus datos; presentar consultas o reclamos; solicitar supresión o revocatoria cuando legalmente proceda; y acudir ante la Superintendencia de Industria y Comercio una vez agotado el trámite aplicable ante el Responsable.

Las solicitudes pueden enviarse a **protecciondedatos@ei.com.co** con información suficiente para identificar al titular y la petición.

## 10. Consultas y reclamos

Las consultas se atenderán dentro de los términos previstos por la Ley 1581 de 2012. Los reclamos de corrección, actualización, supresión o presunto incumplimiento seguirán el procedimiento legal aplicable. Cuando una solicitud no pueda ser resuelta en el término inicial, se informará la causa y la nueva fecha dentro de los límites legales.

AULA EI puede registrar solicitudes y fechas objetivo como mecanismo de control interno; el sistema no reemplaza el análisis humano de procedencia.

## 11. Conservación y supresión

La información se conservará durante el tiempo necesario para cumplir la finalidad y las obligaciones legales o contractuales aplicables. No existe una regla única de eliminación al terminar la relación laboral.

Los registros de capacitación, formación y entrenamiento en seguridad y salud en el trabajo que estén sujetos al Decreto 1072 de 2015 se conservarán por el término legal aplicable. Los demás registros estarán sujetos a la tabla de retención documental y a criterios de necesidad, defensa jurídica, auditoría, integridad de certificados y cumplimiento.

Cumplido el plazo y ausente una obligación de conservación, los datos serán eliminados, anonimizados, archivados o revisados según corresponda.

## 12. Seguridad y confidencialidad

La compañía aplicará controles administrativos, humanos y técnicos acordes con la naturaleza de la información y el riesgo. En AULA EI se incluyen autenticación, control de roles, RLS, MFA para administración, cifrado en tránsito, registros de auditoría, respaldo, continuidad, protección de secretos y restricciones de acceso.

Ninguna medida elimina por completo el riesgo. Los controles se revisarán y mejorarán conforme cambien la tecnología, el riesgo y la regulación.

## 13. Encargados, proveedores y tratamiento internacional

ELECTROINGENIERÍA podrá utilizar proveedores tecnológicos que actúen como Encargados o subencargados. Antes de habilitar un tratamiento relevante se evaluarán finalidad, categorías de datos, seguridad, ubicación del procesamiento, condiciones contractuales y mecanismos aplicables a transmisiones o transferencias internacionales.

No se afirmará que los datos permanecen exclusivamente en Colombia cuando la arquitectura del proveedor no lo garantice.

## 14. Incidentes

Los eventos de pérdida, acceso no autorizado, alteración, divulgación indebida, indisponibilidad o uso no autorizado serán gestionados mediante un procedimiento de detección, contención, análisis, remediación, evaluación regulatoria y cierre. Cuando exista obligación de reporte a la autoridad, la compañía lo realizará conforme a la normativa vigente.

## 15. Decisiones y perfiles

Los resultados de AULA EI no constituyen por sí solos decisiones laborales automatizadas. Toda decisión de alto impacto corresponde a responsables humanos autorizados y debe considerar el contexto y las reglas internas aplicables.

## 16. Tecnologías de almacenamiento

AULA EI utiliza almacenamiento estrictamente necesario para sesión, autenticación, seguridad, preferencias y funcionamiento PWA. No incorpora rastreadores publicitarios externos. El inventario técnico se mantiene actualizado en la documentación de la aplicación.

## 17. Cambios de política

Toda modificación material que cambie finalidades, categorías de datos, derechos, retención, proveedores relevantes, transferencias o responsabilidades será versionada y comunicada. AULA EI puede exigir una nueva aceptación cuando el cambio material afecte al titular.

Los cambios puramente editoriales o de forma pueden publicarse sin exigir reaceptación, conservando trazabilidad de versión.

## 18. Vigencia y control documental

Esta versión refuerza y actualiza los lineamientos históricos de DA-PL-005 para el entorno digital y debe integrarse al sistema de control documental corporativo. La compañía conservará versiones históricas para fines de evidencia y auditoría.
$doc_0$,'UTF8'),'sha256'),'hex'),
       true,'published',timestamptz '2026-10-07 13:54:00-05',now(),now()
from public.legal_documents d where d.code='CORP-DATA'
on conflict (document_id,version) do nothing;

insert into public.legal_documents (code,title,category,is_active)
values ('AULA-PRIV','Aviso de Privacidad — AULA EI','privacy_notice',true)
on conflict (code) do nothing;

insert into public.legal_document_versions (
  document_id,version,content_markdown,content_sha256,is_material,status,effective_at,published_at,approved_at
)
select d.id,'1.0',$doc_1$# Aviso de Privacidad — AULA EI

**Versión:** 1.0

AULA EI es una plataforma interna de ELECTROINGENIERÍA S.A.S. para formación, inducción, evaluación, cumplimiento y evidencias de capacitación.

## Responsable

ELECTROINGENIERÍA S.A.S., NIT 891.903.664-9, con domicilio en Tuluá, Valle del Cauca. Canal de protección de datos: **protecciondedatos@ei.com.co**.

## Información tratada

AULA EI puede tratar identificación, correo, nombre, cargo, rol, dependencia, asignaciones, progreso, resultados de evaluaciones, certificados, registros de actividad, eventos de seguridad y evidencia de aceptación de documentos legales.

AULA EI **no almacena información médica ocupacional**, historias clínicas, diagnósticos, restricciones ni resultados de exámenes médicos.

## Finalidades

Los datos se usan para habilitar acceso, administrar capacitación, ejecutar inducciones, evidenciar cumplimiento, generar certificados, producir estadísticas y rankings internos, proteger la seguridad del sistema, atender soporte y derechos de privacidad y cumplir obligaciones legales o contractuales.

Los rankings son informativos y no constituyen por sí solos una decisión de contratación o continuidad laboral.

## Trazabilidad de aceptación

Cuando una versión legal requiere aceptación, AULA EI registra el usuario autenticado, versión, fecha y hora, contexto y hash SHA-256 del documento. No se generan aceptaciones retroactivas.

## Derechos

Puedes presentar consultas, correcciones, actualizaciones, solicitudes de supresión o revocatoria cuando procedan y reclamos mediante el Centro de Privacidad de AULA EI o escribiendo a **protecciondedatos@ei.com.co**.

## Conservación

La conservación depende de la categoría de información, la relación con la empresa y las obligaciones legales. Algunos registros de formación pueden requerir conservación prolongada. La salida de la organización no implica la eliminación automática de toda evidencia.
$doc_1$,
       encode(extensions.digest(convert_to($doc_1$# Aviso de Privacidad — AULA EI

**Versión:** 1.0

AULA EI es una plataforma interna de ELECTROINGENIERÍA S.A.S. para formación, inducción, evaluación, cumplimiento y evidencias de capacitación.

## Responsable

ELECTROINGENIERÍA S.A.S., NIT 891.903.664-9, con domicilio en Tuluá, Valle del Cauca. Canal de protección de datos: **protecciondedatos@ei.com.co**.

## Información tratada

AULA EI puede tratar identificación, correo, nombre, cargo, rol, dependencia, asignaciones, progreso, resultados de evaluaciones, certificados, registros de actividad, eventos de seguridad y evidencia de aceptación de documentos legales.

AULA EI **no almacena información médica ocupacional**, historias clínicas, diagnósticos, restricciones ni resultados de exámenes médicos.

## Finalidades

Los datos se usan para habilitar acceso, administrar capacitación, ejecutar inducciones, evidenciar cumplimiento, generar certificados, producir estadísticas y rankings internos, proteger la seguridad del sistema, atender soporte y derechos de privacidad y cumplir obligaciones legales o contractuales.

Los rankings son informativos y no constituyen por sí solos una decisión de contratación o continuidad laboral.

## Trazabilidad de aceptación

Cuando una versión legal requiere aceptación, AULA EI registra el usuario autenticado, versión, fecha y hora, contexto y hash SHA-256 del documento. No se generan aceptaciones retroactivas.

## Derechos

Puedes presentar consultas, correcciones, actualizaciones, solicitudes de supresión o revocatoria cuando procedan y reclamos mediante el Centro de Privacidad de AULA EI o escribiendo a **protecciondedatos@ei.com.co**.

## Conservación

La conservación depende de la categoría de información, la relación con la empresa y las obligaciones legales. Algunos registros de formación pueden requerir conservación prolongada. La salida de la organización no implica la eliminación automática de toda evidencia.
$doc_1$,'UTF8'),'sha256'),'hex'),
       true,'published',timestamptz '2026-10-07 13:54:00-05',now(),now()
from public.legal_documents d where d.code='AULA-PRIV'
on conflict (document_id,version) do nothing;

insert into public.legal_documents (code,title,category,is_active)
values ('AULA-TYC','Condiciones de Uso — AULA EI','terms',true)
on conflict (code) do nothing;

insert into public.legal_document_versions (
  document_id,version,content_markdown,content_sha256,is_material,status,effective_at,published_at,approved_at
)
select d.id,'1.0',$doc_2$# Condiciones de Uso — AULA EI

**Versión:** 1.0

## 1. Finalidad

AULA EI es un sistema corporativo destinado a capacitación, inducción, evaluación, certificación interna y gestión del cumplimiento de ELECTROINGENIERÍA S.A.S.

## 2. Acceso

El acceso es personal, restringido y administrado por la organización. No existe registro público. Cada usuario es responsable de mantener la confidencialidad de sus credenciales y de no compartir sesiones, contraseñas, códigos OTP o factores MFA.

## 3. Integridad de evaluaciones

El usuario debe responder personalmente las evaluaciones asignadas y abstenerse de manipular resultados, suplantar identidades, automatizar respuestas, alterar controles técnicos o utilizar mecanismos destinados a evadir las reglas de una capacitación.

## 4. Resultados y rankings

AULA EI puede mostrar puntajes y rankings internos. Estos resultados son herramientas de apoyo y no constituyen automáticamente una decisión laboral, contractual o de selección.

## 5. Certificados

Los certificados emitidos por AULA EI acreditan la finalización o aprobación de una actividad interna según los registros disponibles. No equivalen a licencias profesionales, títulos académicos, certificaciones estatales o acreditaciones de terceros salvo que el propio documento indique expresamente otra cosa y exista soporte jurídico para ello.

## 6. Disponibilidad y mantenimiento

La compañía procura mantener el servicio disponible y seguro, pero puede realizar mantenimientos, cambios o suspensiones necesarias. La disponibilidad también depende de proveedores tecnológicos y conectividad. No se ofrece una garantía absoluta de operación ininterrumpida.

## 7. Propiedad intelectual

Los contenidos, marcas, materiales y elementos de la plataforma pertenecen a sus respectivos titulares. El acceso se concede únicamente para finalidades corporativas autorizadas. No se permite copiar, redistribuir, publicar o explotar materiales fuera de dichas finalidades sin autorización.

## 8. Seguridad y auditoría

La plataforma registra eventos necesarios para seguridad, soporte, trazabilidad y cumplimiento. Los intentos de acceso indebido, manipulación o abuso pueden generar bloqueo de cuenta y revisión interna conforme a las políticas de la organización.

## 9. Privacidad

El tratamiento de datos se rige por la Política Integral de Tratamiento de Datos y por el Aviso de Privacidad de AULA EI. Los derechos del titular pueden ejercerse mediante los canales definidos por ELECTROINGENIERÍA.

## 10. Cambios

Los cambios materiales de estas condiciones se versionan y pueden requerir una nueva aceptación antes de continuar usando AULA EI.
$doc_2$,
       encode(extensions.digest(convert_to($doc_2$# Condiciones de Uso — AULA EI

**Versión:** 1.0

## 1. Finalidad

AULA EI es un sistema corporativo destinado a capacitación, inducción, evaluación, certificación interna y gestión del cumplimiento de ELECTROINGENIERÍA S.A.S.

## 2. Acceso

El acceso es personal, restringido y administrado por la organización. No existe registro público. Cada usuario es responsable de mantener la confidencialidad de sus credenciales y de no compartir sesiones, contraseñas, códigos OTP o factores MFA.

## 3. Integridad de evaluaciones

El usuario debe responder personalmente las evaluaciones asignadas y abstenerse de manipular resultados, suplantar identidades, automatizar respuestas, alterar controles técnicos o utilizar mecanismos destinados a evadir las reglas de una capacitación.

## 4. Resultados y rankings

AULA EI puede mostrar puntajes y rankings internos. Estos resultados son herramientas de apoyo y no constituyen automáticamente una decisión laboral, contractual o de selección.

## 5. Certificados

Los certificados emitidos por AULA EI acreditan la finalización o aprobación de una actividad interna según los registros disponibles. No equivalen a licencias profesionales, títulos académicos, certificaciones estatales o acreditaciones de terceros salvo que el propio documento indique expresamente otra cosa y exista soporte jurídico para ello.

## 6. Disponibilidad y mantenimiento

La compañía procura mantener el servicio disponible y seguro, pero puede realizar mantenimientos, cambios o suspensiones necesarias. La disponibilidad también depende de proveedores tecnológicos y conectividad. No se ofrece una garantía absoluta de operación ininterrumpida.

## 7. Propiedad intelectual

Los contenidos, marcas, materiales y elementos de la plataforma pertenecen a sus respectivos titulares. El acceso se concede únicamente para finalidades corporativas autorizadas. No se permite copiar, redistribuir, publicar o explotar materiales fuera de dichas finalidades sin autorización.

## 8. Seguridad y auditoría

La plataforma registra eventos necesarios para seguridad, soporte, trazabilidad y cumplimiento. Los intentos de acceso indebido, manipulación o abuso pueden generar bloqueo de cuenta y revisión interna conforme a las políticas de la organización.

## 9. Privacidad

El tratamiento de datos se rige por la Política Integral de Tratamiento de Datos y por el Aviso de Privacidad de AULA EI. Los derechos del titular pueden ejercerse mediante los canales definidos por ELECTROINGENIERÍA.

## 10. Cambios

Los cambios materiales de estas condiciones se versionan y pueden requerir una nueva aceptación antes de continuar usando AULA EI.
$doc_2$,'UTF8'),'sha256'),'hex'),
       true,'published',timestamptz '2026-10-07 13:54:00-05',now(),now()
from public.legal_documents d where d.code='AULA-TYC'
on conflict (document_id,version) do nothing;

insert into public.legal_documents (code,title,category,is_active)
values ('AULA-STORAGE','Política de Almacenamiento Local, Cookies y Tecnologías Similares','storage',true)
on conflict (code) do nothing;

insert into public.legal_document_versions (
  document_id,version,content_markdown,content_sha256,is_material,status,effective_at,published_at,approved_at
)
select d.id,'1.0',$doc_3$# Política de Almacenamiento Local, Cookies y Tecnologías Similares — AULA EI

**Versión:** 1.0

AULA EI no utiliza cookies publicitarias, Meta Pixel, Google Analytics, Hotjar, Microsoft Clarity ni rastreadores equivalentes de terceros.

La aplicación utiliza tecnologías estrictamente necesarias o funcionales para operar de forma segura.

## Inventario principal

### aula-ei-auth

Almacenamiento administrado por Supabase Auth para conservar la sesión autenticada, renovar tokens y mantener el acceso del usuario. Es necesario para que la aplicación funcione con sesión persistente.

### sessionStorage de PWA

AULA EI puede usar almacenamiento de sesión para evitar recargas repetidas durante la actualización del service worker. Su finalidad es técnica y temporal.

### Caché de PWA y recursos

El navegador puede almacenar archivos estáticos para mejorar rendimiento, resiliencia y experiencia móvil. La caché no se utiliza con fines publicitarios.

### Preferencias funcionales

Cuando existan preferencias de interfaz, podrán guardarse localmente para recordar opciones del usuario. No se usarán para seguimiento entre sitios.

## Consentimiento

Las tecnologías estrictamente necesarias para autenticación, seguridad y operación no se presentan como opcionales, porque rechazarlas impediría el funcionamiento seguro del LMS. Si en el futuro se incorporan tecnologías no esenciales, la organización deberá evaluar y, cuando corresponda, obtener consentimiento antes de activarlas.

## Control del usuario

El usuario puede limpiar datos del sitio desde el navegador, entendiendo que esto puede cerrar la sesión o borrar preferencias locales.
$doc_3$,
       encode(extensions.digest(convert_to($doc_3$# Política de Almacenamiento Local, Cookies y Tecnologías Similares — AULA EI

**Versión:** 1.0

AULA EI no utiliza cookies publicitarias, Meta Pixel, Google Analytics, Hotjar, Microsoft Clarity ni rastreadores equivalentes de terceros.

La aplicación utiliza tecnologías estrictamente necesarias o funcionales para operar de forma segura.

## Inventario principal

### aula-ei-auth

Almacenamiento administrado por Supabase Auth para conservar la sesión autenticada, renovar tokens y mantener el acceso del usuario. Es necesario para que la aplicación funcione con sesión persistente.

### sessionStorage de PWA

AULA EI puede usar almacenamiento de sesión para evitar recargas repetidas durante la actualización del service worker. Su finalidad es técnica y temporal.

### Caché de PWA y recursos

El navegador puede almacenar archivos estáticos para mejorar rendimiento, resiliencia y experiencia móvil. La caché no se utiliza con fines publicitarios.

### Preferencias funcionales

Cuando existan preferencias de interfaz, podrán guardarse localmente para recordar opciones del usuario. No se usarán para seguimiento entre sitios.

## Consentimiento

Las tecnologías estrictamente necesarias para autenticación, seguridad y operación no se presentan como opcionales, porque rechazarlas impediría el funcionamiento seguro del LMS. Si en el futuro se incorporan tecnologías no esenciales, la organización deberá evaluar y, cuando corresponda, obtener consentimiento antes de activarlas.

## Control del usuario

El usuario puede limpiar datos del sitio desde el navegador, entendiendo que esto puede cerrar la sesión o borrar preferencias locales.
$doc_3$,'UTF8'),'sha256'),'hex'),
       true,'published',timestamptz '2026-10-07 13:54:00-05',now(),now()
from public.legal_documents d where d.code='AULA-STORAGE'
on conflict (document_id,version) do nothing;

insert into public.legal_documents (code,title,category,is_active)
values ('AULA-SEC','Política de Seguridad y Uso Aceptable','security',true)
on conflict (code) do nothing;

insert into public.legal_document_versions (
  document_id,version,content_markdown,content_sha256,is_material,status,effective_at,published_at,approved_at
)
select d.id,'1.0',$doc_4$# Política de Seguridad y Uso Aceptable — AULA EI

**Versión:** 1.0

Cada cuenta de AULA EI es personal e intransferible. El usuario debe proteger sus credenciales, utilizar contraseñas robustas, atender las solicitudes de MFA cuando su rol lo exija y reportar oportunamente cualquier sospecha de acceso no autorizado.

Está prohibido:

- compartir contraseñas, OTP, sesiones o factores MFA;
- suplantar a otra persona;
- modificar o intentar modificar resultados sin autorización;
- extraer masivamente información o contenidos;
- ejecutar herramientas destinadas a evadir controles;
- usar la plataforma para fines ajenos a la actividad corporativa autorizada;
- cargar código malicioso o contenido que comprometa a otros usuarios;
- divulgar información confidencial obtenida mediante el LMS.

La empresa puede registrar eventos técnicos y de seguridad necesarios para detectar abuso, investigar incidentes y preservar la integridad de la plataforma. El acceso administrativo está sujeto a controles reforzados.

Los hallazgos de seguridad deben reportarse por los canales internos definidos. No deben publicarse datos, vulnerabilidades explotables o credenciales en canales abiertos.
$doc_4$,
       encode(extensions.digest(convert_to($doc_4$# Política de Seguridad y Uso Aceptable — AULA EI

**Versión:** 1.0

Cada cuenta de AULA EI es personal e intransferible. El usuario debe proteger sus credenciales, utilizar contraseñas robustas, atender las solicitudes de MFA cuando su rol lo exija y reportar oportunamente cualquier sospecha de acceso no autorizado.

Está prohibido:

- compartir contraseñas, OTP, sesiones o factores MFA;
- suplantar a otra persona;
- modificar o intentar modificar resultados sin autorización;
- extraer masivamente información o contenidos;
- ejecutar herramientas destinadas a evadir controles;
- usar la plataforma para fines ajenos a la actividad corporativa autorizada;
- cargar código malicioso o contenido que comprometa a otros usuarios;
- divulgar información confidencial obtenida mediante el LMS.

La empresa puede registrar eventos técnicos y de seguridad necesarios para detectar abuso, investigar incidentes y preservar la integridad de la plataforma. El acceso administrativo está sujeto a controles reforzados.

Los hallazgos de seguridad deben reportarse por los canales internos definidos. No deben publicarse datos, vulnerabilidades explotables o credenciales en canales abiertos.
$doc_4$,'UTF8'),'sha256'),'hex'),
       true,'published',timestamptz '2026-10-07 13:54:00-05',now(),now()
from public.legal_documents d where d.code='AULA-SEC'
on conflict (document_id,version) do nothing;

insert into public.legal_documents (code,title,category,is_active)
values ('AULA-CAND','Aviso y Autorización para Candidatos','candidate_notice',true)
on conflict (code) do nothing;

insert into public.legal_document_versions (
  document_id,version,content_markdown,content_sha256,is_material,status,effective_at,published_at,approved_at
)
select d.id,'1.0',$doc_5$# Aviso y Autorización para Candidatos — AULA EI

**Versión:** 1.0

Este documento aplica únicamente cuando ELECTROINGENIERÍA habilita de forma excepcional una cuenta de AULA EI para una persona candidata dentro de un proceso de selección.

Al aceptar, autorizas el tratamiento de tus datos de identificación, contacto, acceso, respuestas, puntajes, tiempos, resultados y trazabilidad de evaluación para administrar el proceso de selección, verificar integridad de la prueba, comparar resultados y documentar la decisión humana correspondiente.

AULA EI puede producir un ranking de resultados. El ranking **no decide por sí solo** la contratación. Gestión Humana y los responsables autorizados pueden considerar entrevistas, perfil del cargo, requisitos, verificaciones, evaluaciones externas y otros factores legítimos.

AULA EI no almacena resultados médicos ocupacionales. Cualquier examen de salud se gestiona fuera de esta plataforma.

Si no eres seleccionado, tu cuenta será deshabilitada y la información quedará sujeta a la regla de retención aplicable. Si posteriormente eres vinculado, se te presentarán las políticas y condiciones correspondientes al nuevo contexto; la autorización de candidato no sustituye las finalidades propias de la relación laboral.

Puedes ejercer tus derechos mediante **protecciondedatos@ei.com.co** o el Centro de Privacidad cuando esté disponible para tu cuenta.
$doc_5$,
       encode(extensions.digest(convert_to($doc_5$# Aviso y Autorización para Candidatos — AULA EI

**Versión:** 1.0

Este documento aplica únicamente cuando ELECTROINGENIERÍA habilita de forma excepcional una cuenta de AULA EI para una persona candidata dentro de un proceso de selección.

Al aceptar, autorizas el tratamiento de tus datos de identificación, contacto, acceso, respuestas, puntajes, tiempos, resultados y trazabilidad de evaluación para administrar el proceso de selección, verificar integridad de la prueba, comparar resultados y documentar la decisión humana correspondiente.

AULA EI puede producir un ranking de resultados. El ranking **no decide por sí solo** la contratación. Gestión Humana y los responsables autorizados pueden considerar entrevistas, perfil del cargo, requisitos, verificaciones, evaluaciones externas y otros factores legítimos.

AULA EI no almacena resultados médicos ocupacionales. Cualquier examen de salud se gestiona fuera de esta plataforma.

Si no eres seleccionado, tu cuenta será deshabilitada y la información quedará sujeta a la regla de retención aplicable. Si posteriormente eres vinculado, se te presentarán las políticas y condiciones correspondientes al nuevo contexto; la autorización de candidato no sustituye las finalidades propias de la relación laboral.

Puedes ejercer tus derechos mediante **protecciondedatos@ei.com.co** o el Centro de Privacidad cuando esté disponible para tu cuenta.
$doc_5$,'UTF8'),'sha256'),'hex'),
       true,'published',timestamptz '2026-10-07 13:54:00-05',now(),now()
from public.legal_documents d where d.code='AULA-CAND'
on conflict (document_id,version) do nothing;

insert into public.legal_documents (code,title,category,is_active)
values ('AULA-PRE','Aviso de Preingreso e Inducción','prehire_notice',true)
on conflict (code) do nothing;

insert into public.legal_document_versions (
  document_id,version,content_markdown,content_sha256,is_material,status,effective_at,published_at,approved_at
)
select d.id,'1.0',$doc_6$# Aviso de Preingreso e Inducción — AULA EI

**Versión:** 1.0

Este aviso aplica a personas cuyo ingreso a ELECTROINGENIERÍA ha sido aprobado y que reciben acceso anticipado a AULA EI para actividades de preingreso o inducción.

El acceso puede utilizarse para asignar contenidos, registrar progreso, evaluar comprensión, evidenciar inducción y preparar actividades necesarias para el inicio de la vinculación.

La existencia de una cuenta de preingreso no reemplaza el contrato, acto de vinculación ni demás requisitos formales que correspondan. Si la vinculación no se perfecciona, la cuenta será deshabilitada y la información quedará sujeta a las reglas de retención aplicables.

Al iniciar formalmente la relación, AULA EI podrá cambiar el contexto de la cuenta a colaborador y solicitar la aceptación de las versiones legales que correspondan a ese nuevo escenario.
$doc_6$,
       encode(extensions.digest(convert_to($doc_6$# Aviso de Preingreso e Inducción — AULA EI

**Versión:** 1.0

Este aviso aplica a personas cuyo ingreso a ELECTROINGENIERÍA ha sido aprobado y que reciben acceso anticipado a AULA EI para actividades de preingreso o inducción.

El acceso puede utilizarse para asignar contenidos, registrar progreso, evaluar comprensión, evidenciar inducción y preparar actividades necesarias para el inicio de la vinculación.

La existencia de una cuenta de preingreso no reemplaza el contrato, acto de vinculación ni demás requisitos formales que correspondan. Si la vinculación no se perfecciona, la cuenta será deshabilitada y la información quedará sujeta a las reglas de retención aplicables.

Al iniciar formalmente la relación, AULA EI podrá cambiar el contexto de la cuenta a colaborador y solicitar la aceptación de las versiones legales que correspondan a ese nuevo escenario.
$doc_6$,'UTF8'),'sha256'),'hex'),
       true,'published',timestamptz '2026-10-07 13:54:00-05',now(),now()
from public.legal_documents d where d.code='AULA-PRE'
on conflict (document_id,version) do nothing;

insert into public.legal_documents (code,title,category,is_active)
values ('AULA-RET','Política de Retención y Disposición de Información','retention',true)
on conflict (code) do nothing;

insert into public.legal_document_versions (
  document_id,version,content_markdown,content_sha256,is_material,status,effective_at,published_at,approved_at
)
select d.id,'1.0',$doc_7$# Política de Retención y Disposición de Información — AULA EI

**Versión:** 1.0

AULA EI aplica retención por categoría y no una regla única de eliminación.

1. **Evidencias SG-SST:** los registros de capacitación, formación y entrenamiento sujetos al Decreto 1072 de 2015 se conservarán por el periodo legal aplicable, incluyendo el mínimo de veinte años después de terminar la relación laboral cuando la norma así lo exija.
2. **Certificados y evidencias de capacitación no SG-SST:** se conservarán según la tabla de retención documental corporativa, necesidades de auditoría, defensa jurídica e integridad de certificados.
3. **Aceptaciones legales:** se conservarán como evidencia del documento y versión aceptados mientras exista necesidad jurídica o probatoria.
4. **Solicitudes de privacidad:** se conservarán por el tiempo necesario para demostrar su atención y cumplimiento.
5. **Candidatos no seleccionados:** la cuenta se deshabilita y los datos se someten a la regla aprobada para selección, sin conservación indefinida por defecto.
6. **Logs de seguridad:** se conservarán durante el periodo definido por la política técnica, procurando minimizar datos personales.

Al vencer el plazo aplicable, la disposición podrá ser eliminación segura, anonimización, archivo o revisión según la categoría. Ninguna solicitud de supresión produce borrado automático de información cuya conservación sea legalmente obligatoria.
$doc_7$,
       encode(extensions.digest(convert_to($doc_7$# Política de Retención y Disposición de Información — AULA EI

**Versión:** 1.0

AULA EI aplica retención por categoría y no una regla única de eliminación.

1. **Evidencias SG-SST:** los registros de capacitación, formación y entrenamiento sujetos al Decreto 1072 de 2015 se conservarán por el periodo legal aplicable, incluyendo el mínimo de veinte años después de terminar la relación laboral cuando la norma así lo exija.
2. **Certificados y evidencias de capacitación no SG-SST:** se conservarán según la tabla de retención documental corporativa, necesidades de auditoría, defensa jurídica e integridad de certificados.
3. **Aceptaciones legales:** se conservarán como evidencia del documento y versión aceptados mientras exista necesidad jurídica o probatoria.
4. **Solicitudes de privacidad:** se conservarán por el tiempo necesario para demostrar su atención y cumplimiento.
5. **Candidatos no seleccionados:** la cuenta se deshabilita y los datos se someten a la regla aprobada para selección, sin conservación indefinida por defecto.
6. **Logs de seguridad:** se conservarán durante el periodo definido por la política técnica, procurando minimizar datos personales.

Al vencer el plazo aplicable, la disposición podrá ser eliminación segura, anonimización, archivo o revisión según la categoría. Ninguna solicitud de supresión produce borrado automático de información cuya conservación sea legalmente obligatoria.
$doc_7$,'UTF8'),'sha256'),'hex'),
       true,'published',timestamptz '2026-10-07 13:54:00-05',now(),now()
from public.legal_documents d where d.code='AULA-RET'
on conflict (document_id,version) do nothing;

insert into public.legal_documents (code,title,category,is_active)
values ('AULA-INC','Procedimiento de Incidentes de Privacidad y Seguridad','incident',true)
on conflict (code) do nothing;

insert into public.legal_document_versions (
  document_id,version,content_markdown,content_sha256,is_material,status,effective_at,published_at,approved_at
)
select d.id,'1.0',$doc_8$# Procedimiento de Incidentes de Privacidad y Seguridad — AULA EI

**Versión:** 1.0

## Objetivo

Establecer un flujo verificable para eventos que puedan afectar confidencialidad, integridad, disponibilidad o uso autorizado de datos personales.

## Flujo

1. **Detección:** registrar fecha, origen, alcance preliminar y evidencia disponible.
2. **Contención:** limitar acceso, revocar sesiones o credenciales comprometidas y evitar propagación.
3. **Clasificación:** evaluar severidad, categorías de datos, cantidad de titulares, posibilidad de uso indebido y continuidad.
4. **Análisis:** identificar causa raíz y sistemas afectados.
5. **Remediación:** corregir la causa, restaurar controles y validar que el riesgo haya sido reducido.
6. **Evaluación regulatoria:** determinar si existe obligación de reporte a la Superintendencia de Industria y Comercio u otra autoridad y si corresponde comunicación a titulares.
7. **Cierre:** documentar decisiones, medidas, responsables, lecciones aprendidas y acciones preventivas.

El registro de incidentes es restringido. No debe exponer información sensible a administradores que no requieran conocerla.

La notificación regulatoria no se automatiza: requiere revisión y decisión humana autorizada.
$doc_8$,
       encode(extensions.digest(convert_to($doc_8$# Procedimiento de Incidentes de Privacidad y Seguridad — AULA EI

**Versión:** 1.0

## Objetivo

Establecer un flujo verificable para eventos que puedan afectar confidencialidad, integridad, disponibilidad o uso autorizado de datos personales.

## Flujo

1. **Detección:** registrar fecha, origen, alcance preliminar y evidencia disponible.
2. **Contención:** limitar acceso, revocar sesiones o credenciales comprometidas y evitar propagación.
3. **Clasificación:** evaluar severidad, categorías de datos, cantidad de titulares, posibilidad de uso indebido y continuidad.
4. **Análisis:** identificar causa raíz y sistemas afectados.
5. **Remediación:** corregir la causa, restaurar controles y validar que el riesgo haya sido reducido.
6. **Evaluación regulatoria:** determinar si existe obligación de reporte a la Superintendencia de Industria y Comercio u otra autoridad y si corresponde comunicación a titulares.
7. **Cierre:** documentar decisiones, medidas, responsables, lecciones aprendidas y acciones preventivas.

El registro de incidentes es restringido. No debe exponer información sensible a administradores que no requieran conocerla.

La notificación regulatoria no se automatiza: requiere revisión y decisión humana autorizada.
$doc_8$,'UTF8'),'sha256'),'hex'),
       true,'published',timestamptz '2026-10-07 13:54:00-05',now(),now()
from public.legal_documents d where d.code='AULA-INC'
on conflict (document_id,version) do nothing;

insert into public.legal_documents (code,title,category,is_active)
values ('AULA-SLA','Acuerdo Interno de Nivel de Servicio y Continuidad','sla',true)
on conflict (code) do nothing;

insert into public.legal_document_versions (
  document_id,version,content_markdown,content_sha256,is_material,status,effective_at,published_at,approved_at
)
select d.id,'1.0',$doc_9$# Acuerdo Interno de Nivel de Servicio y Continuidad — AULA EI

**Versión:** 1.0

AULA EI es una herramienta corporativa interna y no una oferta comercial de disponibilidad garantizada.

## Objetivos operativos

- Priorizar disponibilidad durante la jornada laboral de la organización.
- Ejecutar mantenimiento planificado procurando minimizar interrupciones.
- Mantener respaldo y recuperación de esquema, configuración y evidencias críticas conforme al plan de Disaster Recovery.
- Clasificar incidentes por impacto y atender primero los que impidan autenticación, formación obligatoria o administración.
- Preservar integridad y seguridad antes que disponibilidad cuando exista un riesgo activo.

## Dependencias

La plataforma depende de servicios de terceros, incluyendo infraestructura de base de datos/autenticación y hosting. Las capacidades reales de recuperación y disponibilidad no pueden superar las garantías del plan contratado a dichos proveedores.

## Recuperación

El RPO y RTO internos se revisarán conforme a las capacidades efectivas del entorno y a la criticidad de los datos. No se promete cero pérdida de datos ni disponibilidad de 99,99 % cuando el plan tecnológico contratado no lo respalde.

## Comunicación

Las interrupciones relevantes se comunicarán por los canales internos disponibles. Los incidentes de seguridad seguirán el procedimiento específico de privacidad y seguridad.
$doc_9$,
       encode(extensions.digest(convert_to($doc_9$# Acuerdo Interno de Nivel de Servicio y Continuidad — AULA EI

**Versión:** 1.0

AULA EI es una herramienta corporativa interna y no una oferta comercial de disponibilidad garantizada.

## Objetivos operativos

- Priorizar disponibilidad durante la jornada laboral de la organización.
- Ejecutar mantenimiento planificado procurando minimizar interrupciones.
- Mantener respaldo y recuperación de esquema, configuración y evidencias críticas conforme al plan de Disaster Recovery.
- Clasificar incidentes por impacto y atender primero los que impidan autenticación, formación obligatoria o administración.
- Preservar integridad y seguridad antes que disponibilidad cuando exista un riesgo activo.

## Dependencias

La plataforma depende de servicios de terceros, incluyendo infraestructura de base de datos/autenticación y hosting. Las capacidades reales de recuperación y disponibilidad no pueden superar las garantías del plan contratado a dichos proveedores.

## Recuperación

El RPO y RTO internos se revisarán conforme a las capacidades efectivas del entorno y a la criticidad de los datos. No se promete cero pérdida de datos ni disponibilidad de 99,99 % cuando el plan tecnológico contratado no lo respalde.

## Comunicación

Las interrupciones relevantes se comunicarán por los canales internos disponibles. Los incidentes de seguridad seguirán el procedimiento específico de privacidad y seguridad.
$doc_9$,'UTF8'),'sha256'),'hex'),
       true,'published',timestamptz '2026-10-07 13:54:00-05',now(),now()
from public.legal_documents d where d.code='AULA-SLA'
on conflict (document_id,version) do nothing;

insert into public.legal_audience_rules (document_id,audience,required)
select id,'employee',true from public.legal_documents where code='CORP-DATA'
on conflict (document_id,audience) do update set required=excluded.required;
insert into public.legal_audience_rules (document_id,audience,required)
select id,'employee',true from public.legal_documents where code='AULA-PRIV'
on conflict (document_id,audience) do update set required=excluded.required;
insert into public.legal_audience_rules (document_id,audience,required)
select id,'employee',true from public.legal_documents where code='AULA-TYC'
on conflict (document_id,audience) do update set required=excluded.required;
insert into public.legal_audience_rules (document_id,audience,required)
select id,'employee',true from public.legal_documents where code='AULA-STORAGE'
on conflict (document_id,audience) do update set required=excluded.required;
insert into public.legal_audience_rules (document_id,audience,required)
select id,'employee',true from public.legal_documents where code='AULA-SEC'
on conflict (document_id,audience) do update set required=excluded.required;

insert into public.legal_audience_rules (document_id,audience,required)
select id,'prehire',true from public.legal_documents where code='CORP-DATA'
on conflict (document_id,audience) do update set required=excluded.required;
insert into public.legal_audience_rules (document_id,audience,required)
select id,'prehire',true from public.legal_documents where code='AULA-PRIV'
on conflict (document_id,audience) do update set required=excluded.required;
insert into public.legal_audience_rules (document_id,audience,required)
select id,'prehire',true from public.legal_documents where code='AULA-TYC'
on conflict (document_id,audience) do update set required=excluded.required;
insert into public.legal_audience_rules (document_id,audience,required)
select id,'prehire',true from public.legal_documents where code='AULA-STORAGE'
on conflict (document_id,audience) do update set required=excluded.required;
insert into public.legal_audience_rules (document_id,audience,required)
select id,'prehire',true from public.legal_documents where code='AULA-SEC'
on conflict (document_id,audience) do update set required=excluded.required;
insert into public.legal_audience_rules (document_id,audience,required)
select id,'prehire',true from public.legal_documents where code='AULA-PRE'
on conflict (document_id,audience) do update set required=excluded.required;

insert into public.legal_audience_rules (document_id,audience,required)
select id,'candidate',true from public.legal_documents where code='CORP-DATA'
on conflict (document_id,audience) do update set required=excluded.required;
insert into public.legal_audience_rules (document_id,audience,required)
select id,'candidate',true from public.legal_documents where code='AULA-PRIV'
on conflict (document_id,audience) do update set required=excluded.required;
insert into public.legal_audience_rules (document_id,audience,required)
select id,'candidate',true from public.legal_documents where code='AULA-STORAGE'
on conflict (document_id,audience) do update set required=excluded.required;
insert into public.legal_audience_rules (document_id,audience,required)
select id,'candidate',true from public.legal_documents where code='AULA-SEC'
on conflict (document_id,audience) do update set required=excluded.required;
insert into public.legal_audience_rules (document_id,audience,required)
select id,'candidate',true from public.legal_documents where code='AULA-CAND'
on conflict (document_id,audience) do update set required=excluded.required;

insert into public.retention_rules (data_category,trigger_event,retention_basis,retention_days,action,is_active,approved_at)
values
 ('sst_training','employment_end','Decreto 1072 de 2015: conservar por el término legal aplicable; para registros comprendidos por el artículo 2.2.4.6.13, mínimo veinte años desde el cese de la relación laboral.',null,'archive',true,now()),
 ('legal_acceptances','document_acceptance','Evidencia de autorización/aceptación y responsabilidad demostrada; conservar mientras exista necesidad jurídica o probatoria.',null,'archive',true,now()),
 ('privacy_requests','request_resolution','Evidencia de atención de derechos del titular y cumplimiento.',null,'review',true,now()),
 ('candidate_selection','candidate_process_end','Conservar solo durante el plazo aprobado por la tabla de retención corporativa y necesidades de defensa jurídica; no indefinidamente.',null,'review',true,now())
on conflict (data_category) do nothing;
