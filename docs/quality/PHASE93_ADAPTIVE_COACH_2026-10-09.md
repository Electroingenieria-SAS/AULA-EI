# Aula EI — Fase 9.3: aprendizaje adaptativo explicable

**Fecha:** 9 de octubre de 2026  
**Módulo:** Colaborador → Mi Entrenador (`#/coach`)  
**Estado de entrega:** desarrollo y pruebas automatizadas; la aceptación autenticada institucional sigue pendiente.

## 1. Auditoría previa

Ya existía Mi Entrenador con cuatro vistas: tutor contextual basado en material completado, repaso adaptativo con juegos originales del curso, insignias locales y rutas recomendadas. El motor `intelligence-model.js` ya guardaba exclusivamente contadores de práctica (`attempts`, `solved`, `mistakes`, `lastSeen`, `lastMistakes`, `streak`) por usuario y curso dentro de **localStorage** y contaba con una función para limpiar únicamente el historial de ese usuario. El material autorizado se carga después de comprobar `get_my_course_route_access`; las rutas bloqueadas no se desbloquean desde el cliente.

No existe una API segura con desglose individual de preguntas finales falladas para Mi Entrenador y **no se consultó ni habilitó** ninguna consulta de exámenes oficiales. Se rechazó fingir personalización a partir de resultados inaccesibles.

## 2. Implementación

- **Plan de refuerzo:** una quinta pestaña inicial `Mi plan de refuerzo` prioriza las capacitaciones que aparecen en el **catálogo autorizado del usuario** y las recomendaciones ya disponibles de su ruta institucional. Explica el motivo: vencimiento, próximos plazos, error local de práctica o siguiente curso de ruta.
- **Programación de repaso:** `scheduleReviewRounds` utiliza los contadores de cada ronda guardados **en ese navegador**. Primero sitúa los errores recientes, luego rondas nuevas y después repasos que vuelven a ser recomendables. Si hay rachas positivas, sugiere intervalos aproximados de **1, 3, 7 o 14 días**. No se convierte en obligación ni modifica fechas oficiales.
- **Seguimiento de la mejora local:** el panel muestra cantidad de rondas pendientes de repaso y rondas con una buena racha, sin prometer una competencia certificada ni afirmar que la calificación cambió. Después de completar una ronda, el mismo flujo `recordPractice` actualiza solamente contadores locales.
- **Diseño institucional:** tarjetas, prioridades, acciones, indicadores de origen de recomendación, texto explicativo, colores corporativos, Century Gothic, accesibilidad de teclado y diseño responsive.
- **Seguridad:** las recomendaciones parten de matrículas visibles al usuario, su catálogo, las rutas con contenido desbloqueado y el historial propio. Un curso borrado del catálogo no puede recuperarse desde localStorage. Al cambiar la capacitación se evita mostrar por un instante contenido del curso previamente cargado.
- **Eficiencia:** **cero llamadas nuevas a Supabase** y ninguna tabla, RPC, Edge Function, modelo de IA remoto, cron ni dependencia de pago. `IntelligencePage` continúa con su importación diferida al abrir la ruta.
- **Publicación:** PWA v10, release `phase-9.3-2026-10-09`, prueba `npm run test:phase93-coach` obligatoria dentro del build.

## 3. Lo que no está implementado ni se debe declarar

- No se analizan las preguntas individuales falladas de **exámenes oficiales**, pues no existe un permiso de consulta propio apto para este propósito.
- No se aplican notas o recuperaciones de exámenes, ni se actualizan `exam_attempts`, `enrollments`, certificados o evidencias oficiales.
- La curva de aprendizaje no es un algoritmo predictivo con validación científica. Los intervalos por racha son una **heurística pedagógica transparente**.
- Las señales de repaso son locales del navegador, pueden desaparecer al borrar el almacenamiento y no sincronizan automáticamente entre dispositivos. No se exportan a servicios de terceros.
- Un conteo de juegos o buena racha no implica cumplimiento obligatorio, acreditación o ascenso de competencias.
- Las pruebas de roles autenticados, experiencia real en distintos dispositivos y restauración de datos de producción permanecen en la incidencia #114.

## 4. Aceptación

1. Ingresar como colaborador con cursos autorizados; revisar pestaña Mi plan de refuerzo y motivos de cada recomendación.
2. Entrar a una capacitación con bloques **completados**; probar una ronda, repetirla con errores y verificar la prioridad local.
3. Cambiar a otra capacitación y a otra cuenta, confirmar que contenidos ni contadores se filtran entre cuentas.
4. Comprobar que una capacitación bloqueada o revocada no aparece como sugerencia utilizable.
5. Confirmar que notas oficiales, estado de matrícula y certificados **no cambian** tras prácticas.
6. Probar responsive de 320, 360, 390, 430, 768, 1024, 1280 y 1440 px, teclado y contraste.
7. Verificar Build, navegador público, CodeQL, dependencias y mismo SHA publicado en GitHub Pages/Vercel.

**Resultado de la fase:** se puede cerrar el código/despliegue con las pruebas automatizadas en verde, sin afirmar que se completó una auditoría autenticada de todos los perfiles.
