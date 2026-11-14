# A.R.E.S. Pulse — Dirección visual y plan de experiencia

Propuesta de diseño · 14 de noviembre de 2026 · Revisión 0.1

## Decisión de dirección

**Un observatorio personal para cuidar de ti durante la misión.**

La identidad nace de mirar el espacio desde un interior habitable: fondo de grafito azulado, estrellas escasas, un horizonte planetario recortado, luz cálida y datos de lectura inmediata. La aplicación debe sentirse serena, humana y precisa. El momento más memorable será la transición de registrar cómo te sientes a entender qué merece atención.

La expresión espacial se concentra en el acceso, los encabezados y unos pocos momentos de transición. Captura, alertas y gráficas se apoyan en superficies opacas y estables. La experiencia cotidiana debe invitar a volver, incluso cuando el resultado exige atención.

Este documento define la estética y el comportamiento antes de componer pantallas. No cambia la aplicación ni implementa el motor de evaluación. La muestra visual asociada explora materiales, tipografía, formas y ritmo; sus textos son especímenes, no mediciones personales.

## Investigación: qué evitar del «AI slop»

El término no constituye una norma de diseño. Lo utilizamos aquí para describir soluciones repetidas sin una decisión específica sobre el producto. El catálogo de [Impeccable](https://impeccable.style/slop/) documenta ejemplos de paneles de vidrio decorativos, capas de tarjetas, composiciones intercambiables, iconos desproporcionados, poco contraste y movimiento que compite por atención. También muestra que el cliché puede cambiar de un degradado violeta a una composición editorial beige o neobrutalista.

Por tanto, cambiar el color o la fuente por sí solo no resuelve el problema. Cada recurso de A.R.E.S. debe tener una razón:

| Recurso | Decisión para A.R.E.S. Pulse |
| --- | --- |
| Galaxia | Un campo estelar con profundidad y una franja atmosférica localizada. La zona de lectura conserva un fondo uniforme. |
| Tarjetas | Solo para una tarea autónoma, una selección o una capa flotante. Las métricas relacionadas comparten filas y divisores. |
| Jerarquía | Una conclusión dominante, una acción principal y después los motivos. Cada elemento tiene un peso según su importancia. |
| Color | Un acento de marca; los colores semánticos aparecen donde existe un estado que comunicar. |
| Círculos y órbitas | Horizonte y respiración guiada. Un círculo decorativo no representa una puntuación ni un dato. |
| Movimiento | Responde a guardar, abrir, seleccionar o explorar. Los datos permanecen quietos mientras se leen. |
| Escritura | «Falta registrar la temperatura». Frases concretas que explican la situación y la siguiente acción. |
| Iconos | Una familia vectorial pequeña, acompañada de texto. Sin emojis estructurales. |

## Referencias seleccionadas

Las aplicaciones de salud aportan jerarquía, cercanía y contexto personal. Las experiencias espaciales aportan profundidad, escala y transiciones. Las adaptaciones de la última columna son decisiones propuestas para A.R.E.S., no características atribuidas a las referencias.

| Referencia y enlace directo | Qué estudiar | Cómo lo adaptamos |
| --- | --- | --- |
| [Oura: rediseño de la app](https://ouraring.com/blog/new-app-design/) | La documentación separa el foco diario, los indicadores y la salud a largo plazo; usa el contexto personal para interpretar métricas. Su imagen de presentación combina paisaje y lectura de estado. | Hoy explica primero lo prioritario; el promedio personal se distingue del intervalo objetivo. Una imagen ambiental queda lejos de los formularios. |
| [WHOOP: Home](https://www.whoop.com/us/en/thelocker/the-all-new-whoop-home-screen/) | Del resumen al detalle de tendencias semanales, mensuales y de seis meses. | Acceso directo de cada indicador a su evolución. El estado global se acompaña de evidencia y fecha. |
| [Gentler Streak](https://gentlerstories.com/gentlerstreak) | Seguimiento que propone progreso personal y recomendaciones acordes con cómo se siente la persona. | Mensajes de cuidado y hábitos sin castigar el descanso ni culpabilizar por perder la racha. |
| [NASA Eyes](https://science.nasa.gov/eyes/) y [experiencia](https://eyes.nasa.gov/apps/solar-system/) | Exploración espacial en 3D sustentada en datos y misiones reales. | Profundidad, horizonte y sensación de escala. La exploración visual será secundaria frente a registrar y comprender la salud. |
| [Space Trash Signs](https://spacetrashsigns.org/) | En la inspección visual: estrellas, nube de partículas orbitales, introducción omisible y control de audio. | Fondo con profundidad, control sobre la atmósfera y una entrada breve que se puede omitir. Usar una fracción de su densidad visual. |
| [Endel](https://endel.io/) | Su producto vincula paisajes sonoros con visuales generativos; la presentación mantiene una identidad gráfica coherente. | Sonido suave opcional y un motivo visual para respiración. No trasladamos sus afirmaciones de eficacia a A.R.E.S. |
| [Lusion](https://lusion.co/) | El estudio presenta trabajo que combina diseño, movimiento, 3D e interacción. | Referencia de ambición y continuidad entre estados. El trabajo cotidiano conserva navegación y desplazamiento convencionales. |

**Ruta de exploración sugerida:** Oura → Gentler Streak para entender el tono; NASA Eyes → Space Trash Signs para la atmósfera; Endel → Lusion para movimiento e interacción. Consultadas el 14 de noviembre de 2026. Se inspeccionaron visualmente la imagen principal del rediseño de Oura, la entrada de Space Trash Signs y la presentación de Endel. El audio de referencia no se verificó; Endel mostró un error de reproducción en el navegador de inspección. NASA Eyes, WHOOP, Gentler y Lusion se revisaron documentalmente, sin una auditoría de su interacción completa.

## Paleta y contraste

Tema principal oscuro, pensado como una cabina tranquila. Predominio del grafito y del texto hueso; el albaricoque aparece en la acción principal y en pequeñas decisiones de marca. La calidez evita que el conjunto se sienta distante.

| Token | Color | Función |
| --- | --- | --- |
| `canvas` | `#0B1116` | Fondo general y cielo. |
| `surface` | `#1B252B` | Campos, hojas y zonas de lectura que requieren aislamiento. |
| `text` | `#EEECE5` | Títulos, valores y texto principal. |
| `text-muted` | `#AAB6BD` | Unidades, fecha, ayuda y contexto. |
| `brand` | `#EEB18A` | Acción principal; texto oscuro `canvas` sobre el botón. |
| `input-edge` | `#677A86` | Límite de campos y controles que necesitan contorno perceptible. |
| `divider` | `#344149` | Separación decorativa; no sustituye el límite de un control. |
| `optimal` | `#A9D5BD` | Óptimo, con etiqueta e icono de comprobación. |
| `caution` | `#F0C56E` | Precaución, con etiqueta y triángulo. |
| `danger` | `#FF8F87` | Peligro o error; texto describe cuál de los dos es. |
| `insufficient` | `#AAB6BD` | Datos insuficientes; guion y explicación de faltantes. |
| `simulation` | `#BEB4F6` | Etiqueta persistente de prueba; nunca significa peligro. |

Contrastes calculados con luminancia relativa WCAG para colores sólidos: `text/canvas` 16,06:1; `text/surface` 13,20:1; `text-muted/surface` 7,53:1; `canvas/brand` 10,21:1; `input-edge/surface` 3,50:1. Los cuatro acentos `optimal`, `caution`, `danger` y `simulation` sobre `surface` superan 7:1. No se deben aplicar opacidades a esos textos sin volver a medir el resultado. El [criterio de contraste WCAG](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) establece 4,5:1 para texto normal y 3:1 para texto grande.

Las alertas conservan el fondo neutro: icono y encabezado semánticos, explicación en hueso. El color de la marca no se usa para «Precaución». Las gráficas usan una serie principal en hueso y etiquetas directas; color y patrón distinguen las referencias necesarias. El tema claro queda fuera de esta primera dirección; si se incorpora deberá diseñarse y verificarse por separado.

## Tipografía y voz

**[Manrope](https://fonts.google.com/specimen/Manrope)** para títulos, lectura, controles y valores. **[IBM Plex Mono](https://www.ibm.com/plex/)** para fecha, versión, identificadores y metadatos breves. La monoespaciada ocupa una parte pequeña de la interfaz; los mensajes de cuidado conservan Manrope.

| Uso | Tamaño / interlínea | Peso | Regla |
| --- | --- | --- | --- |
| Expresión de marca | 40/44 móvil; 64/68 escritorio | 400 | Solo en acceso o una apertura de marca. |
| Título de vista | 28/34 móvil; 36/42 escritorio | 600 | Frase breve, mayúscula inicial. |
| Título de sección | 20/28 | 600 | Nombres que explican el contenido. |
| Texto y campos | 16/24 | 400 | Sin tracking añadido. |
| Botones | 16/24 | 600 | Verbo preciso. |
| Ayuda y metadatos | 14/20 | 400–500 | No esconder información esencial en texto diminuto. |
| Valor destacado | 40/44 | 500 | Cifras tabulares; unidad a 16/24. |

Tracking de título grande: −0,025em; cuerpo: normal. Solo fechas y valores alineados usan cifras tabulares; nada de contar desde cero al mostrar una medición. Respetar tildes, `ñ`, `°C`, `≥`, `mmHg`. Cargar las fuentes localmente en la aplicación final para disponibilidad offline, con fallback del sistema y `font-display: swap`.

Ejemplos de voz:

- Bienvenida: «Un momento para revisar cómo estás».
- Vacío: «Tu historial empieza con tu primera medición».
- Incompleto: «Faltan sueño y temperatura para completar la evaluación».
- Error: «La diastólica debe ser al menos 10 mmHg menor que la sistólica».
- Offline: «Borrador guardado en este dispositivo».
- Simulación: «Estás probando valores. Tu historial conserva los datos reales».
- Hábito: «Respiración completada · +25 XP».
- Reporte: «Texto copiado. Puedes pegarlo en tu bitácora local».

Los textos de acciones ante un riesgo proceden del motor y de su revisión de contenido. La interfaz identifica la fuente específica; no presenta un rango del brief como una recomendación clínica de NASA.

## Fondo, luz y forma

**Tres capas visuales:**

1. Cielo de grafito casi uniforme. Campo estelar determinista con 24–40 puntos en un encabezado móvil y hasta 70 en escritorio. Tamaño de 1–2 px y dos o tres planos de luminosidad. La densidad baja en la zona del texto.
2. Un horizonte planetario parcial, situado en un borde y recortado por el encuadre. Textura mineral o fotografía con licencia y crédito comprobados; luz tenue en el limbo. Una banda atmosférica localizada puede aportar profundidad sin teñir controles.
3. Lectura sobre fondo opaco. Formularios, resultados detallados, barras de navegación y hojas no dejan pasar estrellas.

La galaxia se sugiere por escala, oscuridad y una nube localizada de baja intensidad en espacios libres. Evitar fondos fotográficos multicolores detrás de datos. La captura usa el cielo como margen superior y retira el motivo planetario de la zona de trabajo. No hay retícula técnica decorativa, coordenadas inventadas, escáneres ni ondas ECG falsas. Los puntos de fondo no representan mediciones.

**Formas:** botones y campos de radio 12 px; superficies autónomas de 20 px; hoja móvil con esquinas superiores de 24 px. Píldoras solo para estados cortos y selección de ánimo. Círculos completos para avatar o respiración. Si hay superficies concéntricas con un inset uniforme, el radio exterior suma radio interior + padding + borde. Las filas de métricas se separan con aire y un divisor, sin tarjeta individual para cada valor.

Las superficies oscuras usan diferencias de luminosidad para su profundidad. Las hojas flotantes pueden usar sombra de `0 12px 32px rgb(0 0 0 / 0.24)`; evitar resplandores. Los campos mantienen borde real de 1 px; el foco tiene anillo de 2 px en hueso, offset de 3 px. Los gráficos y valores no usan desenfoque. Imágenes de contenido: contorno blanco al 10%, de 1 px e inset de 1 px; logos y arte transparente quedan exentos.

Identidad verbal: `A.R.E.S.` como nombre y `Pulse` como palabra cercana en caja mixta. El horizonte recortado puede convertirse en recurso propio de la marca. La participación en NASA Space Apps 2026 se informa en el contexto del proyecto, sin convertir el sello NASA en el logo del producto ni insinuar aval médico.

## Componentes base

| Componente | Anatomía y comportamiento |
| --- | --- |
| Acción principal | Botón albaricoque, texto grafito, 48 px de alto mínimo, padding horizontal 20 px, radio 12 px. Una acción dominante por vista. |
| Acción secundaria | Texto hueso, superficie neutra. Los enlaces discretos llevan subrayado cuando su contexto no identifica claramente una acción. |
| Campo numérico | Etiqueta visible, valor editable, unidad persistente, ayuda y error debajo. Input de 52 px mínimo; teclado decimal o numérico según indicador. |
| Selector de ánimo | Cinco opciones de texto completas. Selección con relleno neutro más claro, indicador y estado accesible. Refluye en varias filas. |
| Fila de indicador | Nombre, valor y unidad, intervalo de referencia y fecha. El detalle revela criterio y tendencia. |
| Resultado | Estado en palabras, índice si existe, criterio prioritario y acción. Debajo: sistemas y alertas secundarias. |
| Etiqueta de procedencia | «Real», «Demo» o «Simulación» más condición «Borrador»/«Guardado». No confundir con salud o conectividad. |
| Estado de persistencia | «En este dispositivo», «Pendiente de sincronizar», «Sincronizado» o «Error al sincronizar». Fecha de última confirmación cuando aplique. |
| Hábito | Fila con nombre, XP y control de completar; después muestra «Completado hoy». No modifica una medición. |
| Gráfica | Línea de datos reales con puntos y huecos para faltantes, unidades, ejes y valores accesibles por toque o teclado. Tabla alternativa. |
| Hoja de detalle | Solo para ampliar contexto sin abandonar la tarea. Cierre visible, foco contenido y retorno al disparador; `overscroll-behavior: contain`. |

Iconos: Lucide, outline como base, tamaños de 20 y 24 px. Usar `currentColor`; trazo de 1,5 px junto a peso 400, 2 px junto a 600 y 2,5 px junto a 700. La navegación combina icono y nombre. Un contenedor táctil puede ser mayor que el dibujo.

## Ritmo, interacción y sonido

El espacio respira en los márgenes; las mediciones mantienen estabilidad. Hay tres gestos propios:

1. **Llegar:** el horizonte aparece una sola vez junto con el título. Entrada de 300 ms, opacidad, 12 px verticales y 4 px de blur solo en contenido de bienvenida. Título y acción pueden escalonarse 100 ms. No repetir la secuencia al cambiar de pestaña.
2. **Completar:** un pequeño punto de progreso se convierte en comprobación; el texto cambia a «Guardado». La confirmación no oculta la fecha ni añade valores animados.
3. **Pausar:** la actividad de respiración ofrece una expansión pausada solo al iniciarla. Tiene instrucciones textuales y control de detener. La duración del ejercicio se define como contenido específico, sin disfrazar una animación ambiental de pauta terapéutica.

| Situación | Movimiento propuesto |
| --- | --- |
| Pulsar botón habilitado | Escala a `0.96`, 150 ms, `ease-out`; variante estática para tareas sensibles. Deshabilitado sin escala. |
| Cambio frecuente, pestañas o escritura | Respuesta inmediata; fondo u opacidad de hasta 150 ms. Sin saltos ni stagger. |
| Abrir contexto | 300 ms, `cubic-bezier(0.2, 0, 0, 1)`, transición interrumpible. |
| Cerrar contexto | Opacidad y −12 px durante 150 ms; una hoja sí puede volver hacia su origen. |
| Icono de copiar a copiado | Opacidad 0→1, escala 0.25→1 y blur 4→0; 300 ms, curva anterior; si usa spring, bounce 0. |
| Fondo ambiental | Quieto por defecto. «Activar atmósfera» permite una deriva de hasta 6 px en 24 s; «Pausar atmósfera» la detiene. Se suspende al ocultar la pestaña, enfocar un formulario o mostrar peligro. |
| Cambio de tema futuro | Suprimir transiciones de color durante el cambio. |

Animar únicamente propiedades nombradas; nunca `transition: all`. Priorizar transform y opacidad; limitar blur a los momentos breves indicados. No aplicar `will-change` preventivamente. Los hovers solo se definen dentro de `@media (hover: hover)`.

`prefers-reduced-motion` prevalece: sin desplazamiento, escala, parallax ni blur animado; conservar transición corta de opacidad y todas las etiquetas. Si hay movimiento continuo, ofrecer pausa visible, siguiendo la orientación de [W3C para movimiento automático](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) y [animación por interacción](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html).

**Sonido apagado al entrar.** Activación explícita y volumen independiente; recordar preferencia sin iniciar sonido automáticamente en la siguiente visita. Propuesta: una confirmación amortiguada de 120–180 ms al guardar; dos tonos suaves para copiar un reporte. Sonidos de hábitos opcionales, sin fanfarria. No sonorizar cada tecla, pestaña o punto de gráfica. No usar latidos vinculados a números introducidos manualmente, ruido de radio, sirenas o voz de control de misión. El sonido nunca es la única señal. [W3C recomienda que el audio comience por una acción intencional](https://www.w3.org/WAI/WCAG22/Understanding/audio-control.html).

## Navegación y jerarquía antes de diseñar vistas

Cuatro destinos principales: **Hoy · Registro · Historial · Hábitos**. En móvil, barra inferior con icono y etiqueta, altura de 64 px más safe area. La navegación ocupa el mismo lugar en toda el área autenticada. Reservar su espacio en el documento. Perfil y preferencias se abren desde la cabecera; cerrar sesión queda dentro del perfil, separado de las tareas habituales.

El simulador se alcanza con una acción secundaria «Probar escenario» en Hoy. Es una ruta propia y también aparece en el menú de perfil, sin competir con la captura diaria. La evaluación completa es el detalle del resultado de Hoy o de un día del historial. Reporte se genera desde ese detalle y conserva su procedencia.

| Vista futura | Prioridad de contenido | Acción principal |
| --- | --- | --- |
| Acceso | Marca, explicación breve, usuario/correo, clave y mostrar/ocultar. Acceso a registro y demo claramente separados. | Entrar |
| Registro de cuenta | Nombre, usuario, correo, rol y clave de al menos 6 caracteres, con errores locales y autocompletado apropiado. | Crear cuenta |
| Hoy, cuenta nueva | Mensaje vacío, cómo empezar y acceso al registro. Sin puntuaciones ni gráficas sembradas con datos ficticios. | Registrar indicadores |
| Hoy, con registro | Fecha y antigüedad; conclusión prioritaria; acción; después sistemas y contexto personal. | Completar registro o ver evaluación, según estado |
| Captura | Seis indicadores en una columna, agrupados por sistema. Resumen de completitud; borrador persistente. | Guardar registro |
| Evaluación | Mayor gravedad, criterio que la dispara, acción y fuente. Después cruces, alertas secundarias y tres sistemas. | Acción definida por el resultado |
| Simulador | Franja persistente «Simulación · no se guarda». Escenarios Nominal, Precaución y Crítico; valores hipotéticos editables. | Volver a datos reales |
| Historial | Cronología por día, periodo y una métrica seleccionada. Detalle con fecha inequívoca. | Abrir un día |
| Hábitos | Cuatro acciones diarias, XP, nivel y racha. Cuidado y consistencia antes que competición. | Completar un hábito |
| Reporte | Vista previa de texto con fecha, datos, faltantes, procedencia, evaluación, versión y fuentes. | Copiar a bitácora |
| Perfil | Identidad, rol, preferencias, almacenamiento y sesión. | Guardar preferencias cuando cambien |

Móvil: contenedor fluido con márgenes de 20 px, 16 px en 320 px; separación de sección de 32 px. Ritmo de espaciado: 4, 8, 12, 16, 24, 32, 48 y 64 px. A partir de 768 px puede aparecer contexto lateral; a partir de 1024 px la barra inferior se sustituye por una navegación lateral de 216 px. Máximo de contenido de 1200 px y formularios de 640 px. La lectura de evaluación se limita a unas 70 letras por línea. En escritorio, fecha y contexto pueden ir a un lateral, conservando el mismo orden semántico.

## Contrato de datos que el diseño debe hacer visible

### Captura sin falsos estados sanos

| Indicador | Entrada permitida | Intervalo objetivo aportado en el brief |
| --- | --- | --- |
| Sueño | 0–14 h | 7–9 h |
| Pulso | 40–180 BPM | 60–85 BPM |
| Presión | Sistólica 70–200; diastólica 40–130 mmHg | 100–125 / 65–80 mmHg |
| Glucosa | 50–250 mg/dL | 70–99 mg/dL |
| Temperatura | 34,5–41,0 °C | 36,1–37,2 °C |
| Ánimo | Excelente, Bien, Cansado, Estresado, Agotado | Sin asignación numérica inventada por la interfaz |

Presión constituye un indicador con dos campos relacionados: diastólica ≤ sistólica − 10 mmHg. Se valida la relación además de los límites individuales. Un dato fuera del intervalo objetivo pero dentro del rango de captura es una medición válida; el evaluador decide su clasificación. Un dato fuera del rango permitido es un error de entrada que se explica junto al campo.

Todos los campos comienzan vacíos. Un placeholder no es un valor. Validación al salir del campo y al guardar; permitir corrección sin perder las demás entradas. Una entrada inválida no sustituye el último dato válido guardado. El borrador puede estar incompleto, pero se identifica como tal. Si existe cualquier indicador faltante o inválido, el índice global es `null` y se presenta como «— · Datos insuficientes», nunca como cero ni como cien.

### Evaluador v2.0.0 y procedencia

Tres sistemas: **Mente/Descanso · Corazón/Circulación · Cuerpo/Defensas**. Cruces que deben tener explicación visible: deshidratación/hipotensión, fiebre con fatiga o taquicardia, sueño bajo con tensión e hiperglucemia.

Si la evaluación está completa, se muestran Óptimo, Precaución o Peligro, índice 0–100 y criterio prioritario de máxima gravedad. El significado exacto y dirección del índice deben venir documentados por el motor antes de dibujar una escala; no se asume que un número alto signifique mejor salud. No promediar un peligro para convertirlo en un estado aceptable.

Con información incompleta, presentar «Datos insuficientes» e índice nulo. Si los datos disponibles activan una alerta grave válida, esa alerta aparece primero y de forma explícita, junto con la advertencia de que la evaluación global está incompleta. La falta de datos no oculta señales ya detectadas.

Cada detalle muestra: valores que activaron el criterio, umbral aplicado, acción, versión `v2.0.0`, momento de evaluación y enlace al recurso NASA/CSA que sustenta ese criterio. Si la atribución específica no existe o no respalda el umbral, mostrar «Fuente del criterio pendiente de verificar»; no poner un sello de validación. Los intervalos de este documento proceden del brief. No se ha realizado validación clínica de ellos.

Promedio personal: usar solo datos reales guardados del usuario, con ventana y cantidad explícitas —por ejemplo, «Últimos 7 días con registro · n = 4»—. En una cuenta nueva no existe promedio. No inferir que una desviación del promedio equivale a enfermedad ni que estar dentro del promedio elimina una alerta. Antigüedad por indicador cuando las entradas consolidadas proceden de momentos distintos; el umbral de obsolescencia se define por indicador en el motor, no se inventa como recurso visual.

### Historial, cuentas y simulación

- Clave diaria de historial por usuario y fecha local `YYYY-MM-DD`; la fecha se muestra de forma legible y el identificador permanece disponible en detalle y reporte.
- Consolidar el mismo día: los valores válidos nuevos reemplazan el mismo campo; campos no editados conservan su valor y momento originales. Nunca promediar dos registros por el mero hecho de compartir fecha. Mostrar que el día fue actualizado y cuántas revisiones tiene.
- Si una operación offline y otra nube modifican el mismo campo de forma concurrente, conservar ambas revisiones y pedir elegir un valor. La resolución muestra las fechas de cada versión.
- Días sin medición son huecos, sin puntos ni interpolación que sugiera datos reales. Un día pasado conserva su etiqueta y no se presenta como estado de hoy.
- Cuenta nueva, demo y usuario real tienen espacios de datos separados. La demo anuncia su carácter desde el acceso y nunca se importa automáticamente.
- «Simulación» permanece visible en la ruta, el resultado y cualquier reporte de prueba. No tiene acción de guardar en historial ni genera XP. Al volver se restaura el contexto real previo.
- Al cerrar sesión, quitar de la vista y de la memoria de navegación los datos y borradores del usuario. Un borrador conservado localmente solo se recupera bajo la misma cuenta; no debe aparecer a otra persona.

### Hábitos y reportes

Hidratarse +25 XP; Ejercicio +50 XP; Dormir +30 XP; Respiración +25 XP. Nivel propuesto: `1 + floor(XP acumulada / 100)`, empezando en nivel 1; mostrar progreso restante hasta el siguiente centenar. La racha propuesta cuenta días consecutivos con al menos un hábito completado y explica esa regla junto a su detalle.

El estado visual «Completado hoy» bloquea volver a sumar XP del mismo hábito, usuario y fecha. El reinicio diario abre un nuevo día sin borrar las adjudicaciones anteriores. Un reinicio manual de progreso, separado y explicado, no permite cobrar otra vez un hábito ya adjudicado ese día. Los hábitos nunca cambian sueño, pulso ni otros vitales. El detalle del reinicio manual debe confirmarse como decisión de producto antes de implementarlo si se pretende otro alcance.

El reporte se forma y copia localmente. La acción se llama **«Copiar a bitácora»** y el texto explica **«Sin envío por red o radio»**. Si el portapapeles falla, dejar texto seleccionable para copia manual. Registrar un hábito y copiar un reporte no envían mensajes a una tripulación ni simulan una conexión operativa con NASA.

## Estados y recuperación

Los estados de salud, origen, edición y persistencia son dimensiones distintas. Ejemplo: «Real · Guardado en este dispositivo · Pendiente de sincronizar» puede coexistir con «Precaución». No agrupar todo bajo un único punto de color.

| Estado | Qué ve la persona | Recuperación o garantía |
| --- | --- | --- |
| Carga | Estructura estable y «Cargando tu registro»; no una puntuación temporal. | Mantener sitio para los datos, evitar saltos. |
| Vacío | Explicación breve y primera acción. | Demo accesible por separado. |
| Error de campo | Mensaje cerca del campo y resumen enlazado si hay varios. | Enfocar el primer error al enviar; conservar el resto. |
| Borrador offline | «Borrador en este dispositivo» y hora local. | Volver a editarlo bajo la misma cuenta; no confundirlo con historial guardado. |
| Guardando | Botón ocupado con texto; prevenir envío simultáneo. | Operación con identificador estable para permitir reintento. |
| Guardado local | Confirmación solo después de persistir. | Si falla almacenamiento, decir que no se guardó y conservar edición. |
| Pendiente nube | Persistencia local confirmada y sincronización pendiente por separado. | Reintento del mismo identificador; mismo día actualizado sin duplicación. |
| Error de sync | «Guardado aquí; no se pudo sincronizar» y Reintentar. | No borrar el registro local ni prometer nube confirmada. |
| Sincronizado | «Sincronizado» tras confirmación remota. | Mostrar última sincronización si se consulta. |
| Sesión vencida | Solicitar volver a entrar sin exponer datos a otra cuenta. | Recuperar el borrador de esa cuenta después de autenticar. |

## Plan de diseño y verificación

1. **Dirección de arte:** discutir esta paleta, el horizonte, las fuentes y la intensidad ambiental sobre la muestra de materiales. Cerrar los elementos que forman identidad.
2. **Flujos en baja fidelidad:** cuenta nueva → primer registro → evaluación → detalle → reporte; después día pasado, simulación y hábitos. Resolver incompletos y errores antes del acabado.
3. **Kit de componentes:** campo vacío/válido/inválido, controles de ánimo, alerta, resultado incompleto, etiqueta de procedencia, persistencia y navegación adaptable.
4. **Tres composiciones iniciales:** Hoy vacío, captura con un error y resultado de precaución con motivo. Estas tres pruebas muestran si la dirección funciona fuera de una presentación ideal.
5. **Movimiento y sonido:** prototipar llegada, confirmación y respiración. Probar la misma experiencia con sonido apagado y movimiento reducido.
6. **Ampliación:** historial, hábitos, simulador, cuentas y escritorio reutilizan las decisiones anteriores.

Criterios de aceptación para la implementación posterior:

- Anchos de 320, 375, 390, 768, 1024 y 1440 px; móvil en horizontal, zoom al 200% y texto ampliado, sin desbordes ni acciones tapadas.
- Objetivos táctiles de al menos 48 × 48 px, separación de 8 px, teclado, foco visible, lector de pantalla y regreso predecible.
- Contraste sobre fondos finales, no solo tokens aislados; estrellas fuera de superficies de lectura.
- Movimiento reducido sin pérdida de contenido; pausa del ambiente; audio nunca obligatorio ni automático.
- Caso incompleto sin índice, peligro con faltantes, presión inválida, registro consolidado del día, día antiguo, aislamiento entre cuentas y demo.
- Reintento sin duplicación, almacenamiento lleno, fallo nube, recuperación de borrador, portapapeles bloqueado y sesión vencida.
- XP diaria imposible de repetir por recarga, doble toque o reinicio; historial sin cambios por completar hábitos o simular.

**Verificación de esta entrega:** referencias documentales consultadas y tres referencias visuales inspeccionadas; contraste de las parejas sólidas calculado. Muestra revisada visualmente en móvil y a 736 px de contenido; su ancho no desborda en los viewports de 320 y 375 px. Confirmación y activación/pausa de atmósfera comprobadas. El botón de señal responde y vuelve a estar disponible; no se ha evaluado perceptualmente el audio. Sintaxis JavaScript válida y consola sin errores durante esas interacciones. Movimiento reducido se contempla en código, pero no se ha probado con la preferencia activada. Las reglas de precisión de better-ui se aplican a los tokens propuestos. La CLI instalada de ui-ux-pro-max no admite `--design-system`; se consultaron sus dominios producto, estilo, tipografía y UX como respaldo. Sus sugerencias de neumorfismo, vidrio y estilo técnico se filtraron según el brief. No se ha auditado la interfaz actual ni verificado todavía un flujo funcional, lector de pantalla o dispositivo físico. El comportamiento clínico del evaluador sigue fuera de esta revisión de diseño.
