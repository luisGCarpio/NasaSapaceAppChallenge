# Por hacer

Estos son pendientes documentados. **No se han aplicado cambios al código de la aplicación.** Prioridad P0 significa necesario antes de presentar esa capacidad como parte de la entrega; P1 corresponde a mejoras de integridad y validación.

## P0 — Entrega y acceso

- [ ] Publicar una URL del proyecto final y otra de la demo, accesibles sin registro ni permisos. El remoto `https://github.com/luisGCarpio/NasaSapaceAppChallenge` respondió 404 en consulta anónima. Revisar visibilidad y contenido antes de usarlo. No publicar secretos ni historiales personales.
- [ ] Confirmar nombre exacto del Local Event, inscripción aceptada, integrantes y horario local. Datos recibidos: ApexCode, Luis Carpio, Universidad CUC.
- [ ] Completar los dos enlaces `PENDING` del formulario. La carpeta y la presentación aún no constituyen una entrega oficial.
- [ ] Revisar licencias, referencias, atribución por dataset y uso previo de IA. Confirmar autoría/licencia y generación o no mediante IA de la ilustración del astronauta antes de publicar la demo.

## P0 — Cambios de código necesarios para coherencia de la entrega

### Interfaz y contenido en inglés

Archivos orientativos: `src/app/layout.tsx`, `src/components/home/AresStudioView.tsx`, componentes secundarios, etiquetas del motor y mensajes de API utilizados en el flujo final.

- [ ] Ofrecer un flujo completo en inglés y ajustar el idioma del documento según corresponda.
- [ ] Traducir navegación, unidades explicadas, estados, conclusiones, misiones, errores y mensajes finales.
- [ ] Volver a obtener capturas del flujo en inglés si se incorporan pantallas completas en la demo. Las capturas actuales en `evidencias/` son internas.

Criterio: un juez que solo lea inglés puede recorrer todo el proyecto y los materiales enlazados. La guía exige inglés, con la excepción específica de narración de video acompañada de subtítulos en inglés.

### Una misma evaluación para interfaz y dominio

Archivos: `src/app/page.tsx`, `src/components/home/AresStudioView.tsx`, `src/app/api/evaluate/route.ts`, `src/domain/health/index.ts`.

- [ ] Conectar la pantalla principal al motor contextual de dominio y acordar el modelo de datos común.
- [ ] Resolver el evaluador local duplicado y alinear estados, mensajes y puntuación con la evaluación compartida.
- [ ] Identificar explícitamente los datos simulados y los registros NASA. Mantener separados los historiales del usuario y los de participantes de investigación.
- [ ] Incorporar la fuente, identificador del conjunto y contexto cuando se muestre una observación NASA.

Criterio: la misma entrada produce la misma interpretación en interfaz y API; se puede distinguir una captura sintética de una observación NASA. Hasta entonces, no decir que el panel principal está alimentado por NASA.

### Benchmark NASA: reproducibilidad y significado de métricas

Archivos: `src/app/api/nasa-datasets/route.ts`, `src/server/repositories/nasa-datasets-repo.ts`, `src/domain/nasa/benchmark-runner.ts`, `src/domain/missions/mission-safety.ts` y tipos de evaluación.

- [x] Volver a consultar `GET /api/nasa-datasets?view=benchmark`: inicialmente devolvió 500; después de cambios concurrentes externos devolvió 200 con 3.044 registros evaluables. No se corrigió código en esta tarea. Ambas respuestas están en `evidencias/`.
- [ ] Verificar contratos de evaluación, valores parciales y coherencia de claves de sistemas tras las correcciones concurrentes. La lectura inicial tenía claves `MIND`, `HEART`, `BODY` y consultas a `systems.mind`; una lectura posterior ya utilizaba claves minúsculas. Tratarlo como revisión de regresión, no asumir que la discrepancia continúa.
- [ ] Revisar orden temporal y separación por estudio/sujeto antes de calcular referencias personales. No mezclar sesiones o estudios no comparables ni usar el futuro de una observación como referencia.
- [ ] Revisar las métricas: el código denominado `unknownGlucoseFlaggedContextualConfirmation` cuenta un estado `GREEN`, lo cual por sí solo no prueba que se solicitó confirmación de contexto.
- [ ] Distinguir comparación de una regla histórica de completitud frente a ejecución real de dos motores. `v2EvaluableCount` cuenta presencia de siete indicadores; no ejecuta por sí mismo una versión anterior completa.
- [ ] Guardar resultados reproducibles sobre una versión identificada del código y los datos. El endpoint ya respondió 200 en la segunda revisión. Etiquetar cobertura y conflictos como medidas de software; no llamarlas exactitud clínica.

Criterio: endpoint 200 con resultados coherentes y rastreables, sin convertir ausencia de excepciones en validación médica.

### Seguridad de misiones y mensajes del prototipo

Archivos: `src/components/home/AresStudioView.tsx`, `src/domain/missions/mission-safety.ts`, `src/domain/health/systems-evaluator.ts`, `src/domain/health/cross-evaluator.ts`.

- [ ] Aplicar a las misiones de la pantalla las restricciones que produce el motor compartido.
- [ ] Revisar inferencias causales y afirmaciones de aptitud; el prototipo usa textos como equilibrio óptimo y nombres de condiciones que pueden exceder la evidencia disponible.
- [ ] Identificar visualmente `pingEarth` como simulación. Un aviso de confirmación y temporizador no son una comunicación real con tierra.
- [ ] Mostrar el estado de prototipo y límites del índice orientativo en el recorrido final.

Criterio: no se ofrece una misión incompatible con las restricciones activas y el usuario reconoce las funciones simuladas.

### Atribución y reconocimiento de IA en código y metadatos

- [ ] Confirmar el uso real de IA en el desarrollo previo y añadir los reconocimientos requeridos a texto descriptivo y metadatos de los materiales afectados.
- [ ] Incorporar marcas visibles a imágenes/videos generados por IA si su procedencia lo requiere, sin generar ni alterar elementos de marca NASA.
- [ ] Conservar avisos de terceros y añadir la licencia que el equipo elija para su trabajo.

## P1 — Captura, persistencia y evidencia

- [ ] Verificar el flujo completo de contexto e historial desde la captura. La lectura inicial los omitía, pero el código actualizado concurrentemente ya los propaga en `saveUserCheckin`. Confirmar su funcionamiento antes de marcarlo como validado.
- [ ] Verificar conservación de lecturas repetidas con fecha/hora y contexto. El código actualizado ya añade `user.observations` y mantiene un resumen diario; comprobar que dos capturas del mismo día se conservan, sin ejecutar aquí cambios en el historial del usuario.
- [ ] Conectar las gráficas con observaciones persistidas, conservando una etiqueta para ejemplos. El panel principal mantiene valores de historia de ejemplo en su estado inicial.
- [ ] Auditar los 159 CSV, diccionarios, unidades y calificadores; reconciliar filas leídas, filtradas, reducidas y descartadas. No usar `rawRows - normalized` como cifra de errores.
- [ ] Revisar con especialistas los umbrales, exclusiones, escalamiento y referencias concretas. Mantener las heurísticas y su nivel de evidencia visibles.
- [ ] Definir evaluación independiente por participante/contexto, falsos avisos y eventos omitidos antes de afirmar beneficios o precisión clínica.
- [ ] Verificar el flujo completo publicado después de las correcciones: navegador, API, persistencia y respuesta. Evitar publicar componentes que dependan de un proveedor de contexto ausente.

## Actualización de materiales tras corregir

- [ ] Ajustar formulario, demo y descripción de datos a la versión final, sin anunciar funciones que continúen pendientes.
- [ ] Sustituir las capturas internas por nuevas evidencias si hace falta y confirmar el idioma.
- [ ] Revisar que la demo siga teniendo siete diapositivas como máximo, o que un video alternativo dure 30 segundos como máximo.
- [ ] Publicar y comprobar enlaces en incógnito antes de pulsar **Submit for Judging**.
