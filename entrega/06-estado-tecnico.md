# Estado observado para preparar la entrega

Revisión del 14 de noviembre de 2026. Este documento describe una instantánea del directorio de trabajo y del servidor de desarrollo ya abierto en el puerto 3000. Había cambios sin confirmar y archivos nuevos antes de iniciar la preparación. La versión local puede seguir cambiando por trabajo concurrente.

## Interfaz visible

- `src/app/page.tsx` renderiza `AresStudioView`.
- `src/components/home/AresStudioView.tsx` contiene un evaluador local, estado de React, misiones y arreglos de ejemplo `PAST_SCORES`, `PAST_BPM` y `PAST_GLUCOSE`.
- No se observó una llamada de ese componente a `/api/nasa-datasets`, `/api/evaluate` ni al motor de dominio durante esta lectura.
- `src/app/layout.tsx` usa `lang="es"`. El contenido visible está en español.
- `pingEarth` actualiza el estado visual y un temporizador. El mensaje de envío en 0,4 segundos no representa una transmisión de red.
- Las capturas se obtuvieron del navegador con el servidor existente. No se insertó una traducción temporal ni se alteró el código para las capturas.

Evidencia: `evidencias/prototipo-actual.png` y `evidencias/controles-actuales.png`.

## Motor y datos presentes en código

- `src/domain/health/index.ts` recibe contexto e historial opcionales y devuelve cobertura, calidad, comparación con referencias personales y trazas.
- `src/domain/nasa/benchmark-runner.ts` y `src/server/repositories/nasa-datasets-repo.ts` contienen procedimientos de evaluación de los registros NASA.
- Se verificó que el arreglo de observaciones y la suma del inventario contienen 3.965 registros, de seis conjuntos. Hay 3.044 registros con alguna variable numérica y 921 sin signos vitales numéricos.
- El inventario es un archivo generado previamente por el proyecto. Esta revisión no descargó de nuevo los CSV ni auditó cada transformación.
- En la lectura inicial, `saveUserCheckin` evaluaba sin contexto ni observaciones previas y sustituía el registro del mismo día. En una lectura posterior, tras cambios concurrentes externos, el código ya recibía contexto, utilizaba `priorObservations` y añadía entradas a `user.observations` con un límite de 730 observaciones, manteniendo además un resumen diario. No se probó el flujo de escritura de extremo a extremo.
- La implementación principal también cambió sus nombres internos: los arreglos iniciales `PAST_*` pasaron a formar parte de `INITIAL_STATE` como `pastScores`, `pastBpm` y `pastGlucose`; la evaluación continuaba siendo local. Las capturas conservan la versión observada al principio.

## Comprobación HTTP

- `GET http://localhost:3000`: respondió HTTP 200 y mostró el prototipo.
- `GET http://localhost:3000/api/nasa-datasets?view=benchmark`: inicialmente respondió HTTP 500 con `Cannot read properties of undefined (reading 'restrictStrenuousExercise')`, conservado en `evidencias/benchmark-existente.json`.
- Tras cambios concurrentes externos, la misma consulta respondió HTTP 200 y reportó versión 3.0.0, 3.044 registros con vitales numéricos y 3.044 evaluables. La respuesta está en `evidencias/benchmark-segunda-revision.json`, con su hora. Es cobertura de procesamiento del software y no precisión clínica. No se revisó independientemente cada métrica.
- El error se documenta sin asignar una causa definitiva: el código y el proceso en ejecución pueden estar en estados distintos. Una corrección debe reproducirlo primero.
- La URL remota configurada por Git devolvió 404 al consultarla sin sesión. Esto no demuestra que el repositorio no exista: puede ser privado, haber cambiado de ruta o no estar disponible públicamente.

## Alcance de la revisión

No se ejecutó un despliegue, una migración, una importación de datos, el envío oficial ni pruebas que requieran modificar el proyecto. Se inspeccionaron fuentes, se hicieron consultas de lectura al servidor existente y se prepararon documentos, capturas y la demo dentro de `entrega/`.

La existencia de referencias médicas y un motor con reglas no equivale a validación clínica. La documentación externa no promete exactitud, prevención demostrada, uso operativo ni transmisión real a NASA.
