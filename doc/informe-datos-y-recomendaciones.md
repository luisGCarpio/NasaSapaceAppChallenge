# Informe: uso de datos reales para mejorar las recomendaciones de A.R.E.S. Pulse

**Fecha:** 14 de noviembre de 2026.  
**Alcance:** revisión del motor actual y propuesta de evolución; no se modificó el funcionamiento de la aplicación ni se importaron datos. Las propuestas de decisión necesitan evaluación clínica antes de utilizarse para orientar atención real.

## 1. Decisión recomendada

La mejora más útil consiste en combinar tres componentes: **mediciones reales y contextualizadas, seguimiento individual y reglas con evidencia verificable**. Los datos de NASA pueden ayudar a estudiar variaciones y probar el comportamiento del software. La elección de una acción para una persona necesita, además, protocolos revisados y validación sobre la población que utilizará la app.

La primera versión debería concentrarse en seguimiento cardiovascular, calidad de las mediciones y detección de cambios. Sueño y ánimo pueden añadirse mediante autorregistros. Los biomarcadores de Inspiration4 quedarían para una fase posterior, cuando exista una pregunta concreta que justifique incorporarlos.

**Importar datos auténticos no demuestra que una recomendación sea correcta.** Hay que distinguir tres preguntas: ¿la medición es fiable?, ¿el cambio merece atención? y ¿qué acción está respaldada para ese contexto? Un conjunto de datos puede responder la segunda y carecer de información para responder la tercera.

## 2. Qué ofrecen las fuentes y para qué aprovecharlas

| Fuente | Aporte comprobado | Aplicación propuesta | Límite relevante |
|---|---|---|---|
| Artículos HRP y CSA enlazados por el reto | Contexto sobre riesgos e investigaciones espaciales. | Explicaciones, selección de indicadores y búsqueda de evidencia más específica. | Un artículo general no respalda automáticamente un umbral o una acción concreta. |
| NASA Life Sciences Portal / LSDA, estudios UTMB | NASA presenta campañas humanas de reposo inclinado con datos abiertos y estudios cardiovasculares. | Explorar mediciones repetidas y comparar el motor con observaciones de investigación. | Son estudios terrestres análogos; su transferencia a vuelos y usuarios generales debe evaluarse. |
| Estudio MR001G | Su ficha enumera variables cardiovasculares y neuroendocrinas. | Candidato para buscar pulso y presión, conservando postura, sesión y fase experimental. | La ficha consultada corresponde a aldosterona: falta comprobar las columnas de cada archivo antes de prometer pulso o presión utilizables. |
| Inspiration4 / OSDR | Datos biológicos procesados de astronautas; el acceso a ciertos datos brutos está restringido. | Investigación posterior sobre biomarcadores y cambios entre fases de misión. | No constituye por sí solo un historial diario de las siete entradas actuales. |
| Mediciones de los propios usuarios | Datos obtenidos durante el uso de la aplicación, con procedencia y contexto. | Seguimiento personal, repetición de lecturas y registro de evolución. | Su utilidad depende de calidad, continuidad y representatividad. |

Fuentes: [recursos del reto](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/?tab=resources), [NASA Life Sciences Portal](https://www.nasa.gov/hrp/nlsp/), [ficha MR001G consultada](https://nlsp.nasa.gov/search/data/details/04c0c7e5-4049-56b7-81ac-6ae4944adde5?dataType=DATASETS) y [colección Inspiration4](https://www.nasa.gov/osdr-latest-news-i4-mission-datasets/).

**Estado de disponibilidad:** se revisaron páginas y descripciones. No se han descargado y auditado los archivos, contado participantes o filas utilizables, ni comprobado sus etiquetas de desenlace. Por ahora no puede calcularse una mejora de precisión atribuible a ellos.

## 3. Qué limita actualmente las recomendaciones

Estos hallazgos proceden del código revisado, no de una evaluación clínica del producto:

| Hallazgo | Consecuencia | Cambio propuesto |
|---|---|---|
| `evaluateHealth` recibe únicamente los valores de una captura. | La decisión no utiliza la evolución histórica de la persona. | Añadir tendencias y comparación con una referencia individual. |
| Se exigen las siete entradas para evaluar. | Una glucosa ausente puede impedir evaluar una presión disponible. | Evaluar por indicador y sistema; mostrar cobertura y conservar alertas independientes. |
| Los umbrales se aplican sin campos de reposo, ayuno, postura o método. | Lecturas de contextos distintos reciben la misma interpretación. | Solicitar el contexto necesario para la regla aplicable. |
| Un nuevo registro del mismo día reemplaza los valores anteriores. | Se pierde la secuencia necesaria para confirmar lecturas o estudiar respuesta. | Conservar cada observación y generar el resumen diario por separado. |
| El historial activo se recorta a diez días. | Se limita el seguimiento prolongado y la estimación de la referencia personal. | Separar almacenamiento histórico y ventana visible en pantalla. |
| El índice 0–100 usa penalizaciones y límites definidos en código. | No representa una probabilidad de enfermedad ni una aptitud operativa validada. | Presentarlo como índice orientativo o sustituirlo por un resumen explicable. |
| Las referencias enlazan páginas generales. | El usuario no puede verificar el respaldo específico de cada decisión. | Vincular cada regla con documento, apartado, población y fecha de revisión. |
| Las misiones diarias se generan desde un catálogo fijo. | Es posible presentar una misión de ejercicio junto a una recomendación de suspender esfuerzos. | Aplicar las restricciones de la evaluación también a las misiones. |

Archivos revisados: [evaluación por sistemas](C:/Nasa_Space_apps_Challenge/src/domain/health/systems-evaluator.ts), [cruces](C:/Nasa_Space_apps_Challenge/src/domain/health/cross-evaluator.ts), [validación](C:/Nasa_Space_apps_Challenge/src/domain/health/vital-schema.ts), [entrada del evaluador](C:/Nasa_Space_apps_Challenge/src/domain/health/index.ts), [índice](C:/Nasa_Space_apps_Challenge/src/domain/health/wellness-index.ts), [guardado de registros](C:/Nasa_Space_apps_Challenge/src/server/repositories/state-repo.ts), [almacenamiento](C:/Nasa_Space_apps_Challenge/src/server/storage/file-store.ts) y [misiones](C:/Nasa_Space_apps_Challenge/src/domain/missions/mission-catalog.ts).

También hay inferencias que necesitan revisión: el cruce denominado `dehydration` asocia pulso alto y presión baja con menor volumen circulante; esa combinación no demuestra por sí sola una causa. El sistema debería describir el hallazgo, reconocer la incertidumbre y aplicar un protocolo de comprobación o escalamiento revisado.

## 4. Cómo mejorar las decisiones

### 4.1. Medir mejor antes de interpretar

Cada observación debería guardar valor, unidad, momento de medición, dispositivo o método, contexto y calidad. Para presión, hacen falta condiciones comparables y lecturas repetidas. La AHA recomienda, para medición domiciliaria terrestre, reposo previo y dos lecturas separadas por un minuto. Es una referencia para diseñar la captura; su adaptación al entorno espacial necesita revisión específica. [AHA: medición domiciliaria](https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings/monitoring-your-blood-pressure-at-home).

Para glucosa, registrar ayuno, tiempo desde la comida y tipo de muestra o sensor. NIDDK distingue pruebas en ayunas y aleatorias y sus condiciones de interpretación. Esto justifica revisar el uso actual de un mismo umbral para cualquier entrada. [NIDDK: pruebas y diagnóstico](https://www.niddk.nih.gov/health-information/diabetes/overview/tests-diagnosis).

En temperatura, identificar el método y lugar de medición. En sueño, distinguir duración autorreportada de estimaciones de un dispositivo. El estado de ánimo debe conservarse como autorreporte, sin convertir automáticamente cansancio o estrés en un diagnóstico.

### 4.2. Incorporar una referencia personal

Propuesta de ingeniería: obtener una referencia con observaciones suficientes, de buena calidad y tomadas en condiciones comparables. Evaluar ventanas candidatas —por ejemplo, 14 o 28 días— durante el estudio; ninguna se considera validada por este informe.

Usar una medida robusta del nivel habitual y de su variabilidad. Comparar la lectura actual, su persistencia y la velocidad del cambio. Una referencia basada en pocos datos debe identificarse como provisional; no debe actualizarse automáticamente con episodios anómalos ni convertir un problema persistente en la nueva normalidad.

Esta comparación complementa los límites de seguridad revisados. Una lectura peligrosa no debe perder prioridad porque se parezca al historial de esa persona.

### 4.3. Separar urgencia, cobertura y calidad

La app necesita representar estas dimensiones por separado:

- **Prioridad de atención:** resultado de reglas y síntomas revisados.
- **Cobertura:** qué indicadores pudieron evaluarse y cuáles faltan.
- **Calidad:** si la medición es reciente, repetida y comparable.

Por ejemplo: «Evaluación cardiovascular disponible; falta información metabólica». La ausencia de glucosa no debe borrar una alerta cardiovascular ni permitir declarar un estado global óptimo.

Un valor extremo debe conservarse con una marca de verificación. El sistema puede pedir comprobarlo, pero no debe descartarlo silenciosamente, suavizarlo mediante promedios o retrasar un protocolo urgente por exigir primero todos los campos. El flujo exacto de urgencia y síntomas requiere revisión clínica.

### 4.4. Generar una acción con condiciones explícitas

Cada regla debería definir: datos necesarios, contexto, exclusiones, prioridad, acción permitida, condiciones de seguimiento y fuente. Las acciones específicas necesitan respaldo adicional al conjunto de mediciones utilizado para probar la regla.

Orden propuesto del motor:

1. Detectar condiciones de urgencia según protocolo aprobado.
2. Verificar calidad, contexto y datos disponibles.
3. Aplicar reglas pertinentes y analizar tendencias.
4. Resolver incompatibilidades entre acciones.
5. Explicar la decisión y sus límites.

Si los datos no permiten decidir, la salida útil puede ser solicitar información o una comprobación. Hidratación y ejercicio requieren condiciones de aplicación y exclusiones revisadas; no deberían ser respuestas universales a toda desviación.

### 4.5. Usar IA después de disponer de reglas evaluadas

La primera mejora puede implementarse con reglas transparentes y estadísticas sencillas. Un modelo complejo añade poco si faltan contexto y resultados de referencia.

Si se incorpora un modelo de lenguaje, su función inicial sería explicar decisiones estructuradas y resumir tendencias con fuentes seleccionadas. Los umbrales, la prioridad y las acciones permitidas deben proceder del motor versionado. Un sistema que recupera documentos mejora la trazabilidad, pero no demuestra eficacia clínica ni debe inventar tratamientos, dosis o porcentajes de certeza.

## 5. Ejemplos de cambio en la experiencia

Los siguientes son ejemplos de diseño, no protocolos de tratamiento:

| Situación | Limitación actual | Comportamiento propuesto |
|---|---|---|
| Pulso superior al habitual tras ejercicio. | Se evalúa con reglas que describen reposo, sin capturar esa condición. | Preguntar por actividad y síntomas; aplicar el protocolo correspondiente y conservar el contexto. |
| Glucosa registrada sin información sobre comida. | Se clasifica con umbrales fijos y puede sugerirse ejercicio. | Solicitar el contexto antes de emitir una recomendación dependiente de ayuno. |
| Presión anómala, sin glucosa disponible. | Se devuelve evaluación insuficiente para todos los sistemas. | Mantener la evaluación cardiovascular y señalar el sistema que falta. |
| Varias lecturas comparables muestran un cambio sostenido. | Solo la captura más reciente participa en la decisión. | Mostrar la tendencia y activar el seguimiento establecido en una regla revisada. |
| Alerta que restringe actividad. | El catálogo diario sigue incluyendo ejercicio. | Alinear tareas y recordatorios con las restricciones vigentes. |

Una recomendación debería mostrar: **qué se observó, con qué se comparó, qué acción corresponde, cuándo volver a evaluar y qué información falta**. El nivel de evidencia y la calidad de datos pueden expresarse mediante categorías definidas; un porcentaje de confianza exige calibración demostrada.

## 6. Cómo preparar los datos sin deformarlos

Mantener tres colecciones con objetivos distintos: archivos originales de investigación, observaciones normalizadas y registros de usuarios. Las observaciones de participantes de un estudio no deben convertirse en el historial personal de un usuario de la app.

Para cada conjunto, documentar población, participantes únicos, variables, unidades, frecuencia, fase experimental, faltantes, condiciones de uso y resultados disponibles. Preservar el identificador original anonimizado y la referencia al archivo. Un tiempo como «día 10 de reposo» debe conservarse como tiempo relativo, no transformarse en una fecha clínica inventada.

Las medias de un grupo no equivalen a mediciones individuales. Tampoco deben combinarse participantes de estudios distintos para construir una persona artificial. Mantener separados reposo y ejercicio, y comprobar si pulso y presión realmente se midieron juntos antes de analizar su combinación.

Modelo lógico sugerido:

| Entidad | Información principal |
|---|---|
| Fuente o conjunto | Identificador, versión, procedencia y condiciones de uso. |
| Participante de investigación | Identificador anonimizado dentro del estudio. |
| Observación | Indicador, valor, unidad, tiempos, contexto y calidad. |
| Regla y evidencia | Condiciones, exclusiones, acción, referencia y revisión. |
| Evaluación | Entradas utilizadas, reglas activadas y versiones. |
| Seguimiento | Comprobación posterior, acción reportada y evolución. |

Antes de importar, producir un inventario con **filas, participantes y episodios independientes**. Miles de lecturas de pocas personas no equivalen a miles de personas para validar una recomendación.

## 7. Cómo demostrar una mejora de precisión

Primero debe definirse la población: astronautas, participantes de análogos o usuarios terrestres. La evidencia de un grupo no valida automáticamente el uso en otro. Los principios conjuntos de FDA, MHRA y Health Canada recomiendan representatividad y separación entre desarrollo y prueba, considerando dependencias por paciente y adquisición. [Buenas prácticas para modelos médicos](https://www.gov.uk/government/publications/good-machine-learning-practice-for-medical-device-development-guiding-principles/good-machine-learning-practice-for-medical-device-development-guiding-principles).

**Sin etiquetas independientes no puede medirse la corrección clínica.** Se propone construir un conjunto de evaluación con casos reales y decisiones revisadas por profesionales, mediante criterios definidos previamente, revisión independiente y resolución de desacuerdos. Los evaluadores no deberían conocer la salida del motor al asignar la referencia. Los casos sintéticos servirían para probar límites y fallos del software, y sus resultados se informarían por separado.

| Métrica | Qué responde |
|---|---|
| Sensibilidad de alertas prioritarias | ¿Cuántos episodios que requieren atención se detectaron? |
| Valor predictivo positivo | ¿Cuántas alertas emitidas correspondían a esos episodios? |
| Falsas alertas por persona y periodo | ¿Qué carga de avisos innecesarios recibe el usuario? |
| Concordancia y seguridad de la acción | ¿La acción coincide con la referencia y evita incompatibilidades? |
| Cobertura y abstención | ¿Cuántos casos pueden resolverse y en cuáles se solicita más información? |
| Rendimiento por contexto y grupo | ¿Dónde funciona peor el sistema? |
| Comprensión y cumplimiento seguro | ¿El usuario entiende la instrucción y sus condiciones? |

Comparar el motor actual y el propuesto sobre los mismos casos de prueba reservados. Separar por participante y, cuando sea viable, por estudio; para seguimiento temporal, utilizar únicamente el pasado al calcular la referencia personal. Ajustar reglas en desarrollo y mantener la prueba cerrada hasta la comparación final.

Informar intervalos de incertidumbre respetando las mediciones repetidas por persona, número de participantes y prevalencia de episodios. La exactitud global aislada puede ocultar fallos en eventos poco frecuentes. Los objetivos de aceptación deben fijarse antes de evaluar y con revisión clínica; este informe no propone porcentajes de rendimiento sin resultados.

Los datos observacionales pueden mostrar asociaciones y ayudar a evaluar detección. **Que una variable mejore después de una acción no demuestra que esa acción causó la mejora.** Afirmar beneficio del consejo exige evidencia de intervención o un estudio prospectivo apropiado.

## 8. Orden de implementación y entregables

| Etapa | Trabajo | Criterio para avanzar |
|---|---|---|
| 1. Auditar datos y evidencia | Descargar un conjunto cardiovascular candidato, revisar diccionario y contar datos utilizables; documentar reglas actuales. | Se conocen variables reales, participantes, contexto y alcance de cada fuente. |
| 2. Corregir captura y almacenamiento | Observaciones múltiples, contexto, calidad, faltantes por indicador y conservación del historial. | Ninguna actualización destruye lecturas previas; una ausencia ajena no borra alertas evaluables. |
| 3. Construir el motor revisable | Reglas versionadas, tendencias provisionales, prioridad y compatibilidad con misiones. | Cada salida se puede reconstruir y tiene evidencia y condiciones explícitas. |
| 4. Validar retrospectivamente | Etiquetas independientes, prueba reservada y comparación contra la versión actual. | Existe un informe de resultados y limitaciones, con criterios de aceptación predefinidos. |
| 5. Evaluar prospectivamente | Piloto supervisado, inicialmente sin dirigir decisiones clínicas, con registro de fallos y comprensión. | Se comprueba desempeño en uso real antes de ampliar el alcance. |

La referencia espacial de diseño puede complementarse con [NASA-STD-3001, volumen 1, salud de la tripulación](https://standards.nasa.gov/standard/NASA/NASA-STD-3001_VOL_1). Su consulta no equivale a certificación ni a validación del producto.

## 9. Resultado que podemos perseguir

Un primer resultado defendible sería: **la app utiliza mediciones reales con procedencia, detecta cambios bajo condiciones definidas y ofrece instrucciones revisadas con trazabilidad**. La magnitud de cualquier mejora se publicaría después de la evaluación.

La prioridad inmediata es auditar un conjunto cardiovascular y convertir las recomendaciones actuales en reglas revisables. Esa base permitirá decidir qué datos adicionales hacen falta y si un modelo predictivo aporta una mejora medible.
