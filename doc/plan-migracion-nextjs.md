# Plan de Migración Modular de A.R.E.S. Pulse a Next.js

Fecha: 14 de noviembre de 2026.  
Estado: Plan definitivo validado (arquitectura modular y orientada a componentes).

---

## 1. Alcance y Reglas de Ingeniería

Migrar **A.R.E.S. Pulse** a una aplicación web **mobile-first (`375px` primero)** con adaptación limpia a escritorio, **100% software** (sin referencias a hardware o sensores externos), resolviendo todos los hallazgos de seguridad, motor fisiológico, persistencia, trazabilidad científica y experiencia de usuario.

### Regla Anti-Monolito (Modularización Estricta)
Quedan **prohibidos los archivos monolíticos** (como los antiguos `frontend/app.js` de 1,553 líneas, `frontend/styles.css` de 2,108 líneas, `frontend/index.html` de 947 líneas o `backend/engine.js` de 721 líneas). Todo el código nuevo cumplirá estas restricciones:

1. **Límite de tamaño por archivo:** Ningún archivo de código superará las **200–250 líneas**. Si un módulo crece más allá de ese umbral, debe dividirse por sub-responsabilidad.
2. **Un componente por archivo:** Cada componente visual de React tendrá su propio archivo `.tsx` con una única responsabilidad clara.
3. **Separación estricta de capas:**
   - **Dominio (`src/domain/`):** Reglas fisiológicas, validaciones y cálculos puros en TypeScript, con **cero dependencias** de React, DOM o peticiones HTTP.
   - **Datos y Servidor (`src/server/` y `src/lib/supabase/`):** Repositorios por entidad y validación de sesión SSR.
   - **Endpoints (`src/app/api/`):** Route Handlers delgados (**máximo 80 líneas**) que solo validan sesión/entrada y delegan al repositorio o dominio.
   - **Estado y Efectos de Cliente (`src/hooks/`):** Custom hooks pequeños para borradores, simulador y portapapeles.
   - **Estilos:** Tokens CSS globales (< 120 líneas) + utilidades de **Tailwind CSS** encapsuladas en cada componente, eliminando hojas CSS gigantes.

---

## 2. Decisiones Validadas del Contexto del Proyecto

1. **Un solo proyecto Next.js (App Router + TypeScript + Tailwind CSS):** Sustituye por completo la dupla Express + Vanilla JS. Todas las operaciones son peticiones HTTP cortas que caben en Route Handlers y Server Actions/Components.
2. **Supabase Auth SSR + PostgreSQL en proyecto dedicado:**
   - Se descarta el proyecto `LaSanaF` (`zospytgoblymaouaapiz`) que estaba configurado por error sin tablas de A.R.E.S.
   - Se utiliza un proyecto dedicado a A.R.E.S. Pulse con `@supabase/ssr`, cookies HttpOnly verificadas en servidor (`supabase.auth.getUser()`) y políticas **Row Level Security (RLS)** estrictas por propietario (`auth.uid() = user_id`), sin acceso anónimo a datos privados.
3. **Seed limpio en lugar de migrar JSON corrupto:**
   - Los archivos actuales (`seed.json` y `runtime_db.json`) solo contienen 2 cuentas ficticias (`elena` y `marco`) con contraseñas en texto plano (`123`) y 10 registros cuyos puntajes y estados no coinciden con el motor actual.
   - **No se migrarán contraseñas en texto plano ni datos inconsistentes:** se ejecutará un script de **seed limpio** que crea los usuarios demo en Supabase Auth y genera su historial de 5 días calculado directamente con el motor `v2.0.0`.
4. **Conservación del Simulador para la Demo del Jurado (aislado de datos reales):**
   - La captura real en **Registro** usará **entradas numéricas precisas** (`inputMode="decimal"`, unidades visibles y validación por campo).
   - Para la presentación de la hackathon se mantiene un **Cajón/Modo Simulador Interactivo** (con los 3 escenarios en 1 clic + sliders en vivo que actualizan el mapa corporal y el semáforo al instante), claramente etiquetado con un banner fijo (*"Simulación activa — no se guarda en tu bitácora"*) y bloqueado frente al guardado en base de datos.
5. **Fecha de misión real por zona horaria e idempotencia:**
   - El día de misión (`mission_date`, `YYYY-MM-DD`) se resuelve con la zona horaria del tripulante (evitando que el uso de UTC crudo cambie de día a las 19:00 hora local `UTC-5`).
   - Cada guardado incluye un `clientSubmissionId` (UUID) único y las misiones tienen restricción `UNIQUE (user_id, mission_id, mission_date)` para que ningún reintento o reinicio duplique registros ni XP.
6. **Rigor de contenido y referencias NASA / CSA:**
   - Se eliminan las etiquetas `NASA-STD-3001` sin respaldo, el falso escáner láser, el falso ECG continuo y los códigos decorativos (`GRID-REF`, `AXIS: Z-01`, `VIEW-01`, `TLM-IN`).
   - El antiguo "Puntaje de Preparación" se presenta como **Índice Orientativo de Bienestar (0–100)** con desglose transparente de penalizaciones (`scoreBreakdown`), acompañado de los umbrales exactos activados y enlaces verificables a **NASA HRP** y **CSA**.

---

## 3. Estructura Modular de Archivos y Componentes

```text
src/
├── domain/                          # Lógica pura de negocio (0 dependencias de UI/HTTP)
│   ├── health/
│   │   ├── vital-specs.ts           # ENGINE_VERSION='2.0.0', rangos únicos, unidades y óptimos
│   │   ├── vital-schema.ts          # Esquema Zod + coherencia sistólica/diastólica (>= 10 mmHg)
│   │   ├── systems-evaluator.ts     # Evaluación de Mente, Corazón y Cuerpo + razones + fuentes
│   │   ├── cross-evaluator.ts       # Cruces fisiológicos + prioridad por severidad máxima
│   │   ├── wellness-index.ts        # Índice orientativo (0-100) + desglose de penalizaciones
│   │   ├── scenarios.ts             # Escenarios de simulación (Nominal, Precaución, Crítico)
│   │   ├── report-builder.ts        # Generador de texto de reporte según estado y alertas
│   │   └── index.ts                 # Fachada evaluateHealth() (< 60 líneas)
│   └── missions/
│       ├── mission-catalog.ts       # Las 4 misiones diarias universales, XP y niveles
│       └── mission-date.ts          # Cálculo de fecha local de misión y racha consecutiva
│
├── lib/
│   └── supabase/
│       ├── client.ts                # Cliente Supabase de navegador
│       ├── server.ts                # Cliente Supabase SSR (cookies HttpOnly)
│       └── middleware.ts            # Guardián de sesión y rutas protegidas
│
├── server/
│   └── repositories/                # Acceso a PostgreSQL desacoplado por entidad
│       ├── profile-repo.ts          # Perfil del tripulante y zona horaria
│       ├── checkin-repo.ts          # Guardado idempotente y consulta histórica
│       ├── mission-repo.ts          # Cumplimiento diario único por fecha y cálculo de XP/racha
│       └── comms-repo.ts            # Bitácora de reportes generados/copiados
│
├── hooks/                           # Estado cliente reutilizable (< 120 líneas c/u)
│   ├── useCheckinDraft.ts           # Borrador en localStorage aislado por userId
│   ├── useScenarioSimulator.ts      # Estado efímero de simulación separado del estado real
│   └── useClipboardReport.ts        # Copia verificada al portapapeles + bitácora
│
├── components/                      # Componentes UI modulares (1 componente = 1 archivo < 180 líneas)
│   ├── ui/
│   │   ├── StatusBadge.tsx          # Semáforo accesible (Óptimo, Cuidado, Peligro, Datos Insuf.)
│   │   ├── NumericField.tsx         # Input numérico accesible con unidad, rango y error inline
│   │   ├── SectionCard.tsx          # Contenedor base sobrio (inspirado en Open MCT / Horizon)
│   │   └── AlertBanner.tsx          # Avisos de error de red, validación o estado vacío
│   ├── layout/
│   │   ├── AppHeader.tsx            # Cabecera con perfil, estado real de guardado y botón Simular
│   │   ├── BottomNav.tsx            # Barra inferior móvil (Inicio, Registro, Historial, Bienestar)
│   │   ├── DesktopSidebar.tsx       # Navegación lateral compacta para escritorio
│   │   └── SimulationBanner.tsx     # Cinta fija cuando se explora un escenario simulado
│   ├── home/
│   │   ├── PriorityAlertCard.tsx    # Alerta principal (máxima gravedad), razones y acción humana
│   │   ├── BodySystemMap.tsx        # Mapa corporal interactivo SVG (sin láser ni ECG falso)
│   │   ├── SystemDetailCard.tsx     # Detalle del sistema seleccionado + delta vs promedio personal
│   │   ├── LastCheckinStrip.tsx     # Resumen de los 6 indicadores con fecha, antigüedad y origen
│   │   └── ScenarioDrawer.tsx       # Cajón de simulación interactiva con sliders para demos
│   ├── checkin/
│   │   ├── CheckinForm.tsx          # Formulario de captura con manejo de borrador y reintentos
│   │   ├── BloodPressureGroup.tsx   # Campos sistólica/diastólica sin mutación silenciosa cruzada
│   │   ├── MoodSelector.tsx         # Selector accesible de 5 estados de ánimo con iconos SVG
│   │   └── PreliminaryPreview.tsx   # Tarjeta de evaluación preliminar antes de confirmar guardado
│   ├── history/
│   │   ├── DateFilterBar.tsx        # Selector temporal por fecha de misión (estilo Worldview)
│   │   ├── IndicatorTrendChart.tsx  # Gráfico dinámico por indicador e índice con bandas
│   │   ├── CheckinHistoryList.tsx   # Lista/tabla de registros con versión del motor
│   │   └── CheckinDetailModal.tsx   # Inspección completa de un registro histórico
│   └── wellness/
│       ├── StreakSummaryCard.tsx    # Nivel, progreso de XP y racha por días reales
│       ├── DailyMissionsList.tsx    # Lista de las 4 misiones diarias de adherencia
│       ├── MissionCardItem.tsx      # Tarjeta individual de misión con estado del día
│       └── CommsReportModal.tsx     # Modal de reporte con verificación real de copia
│
└── app/                             # Rutas de Next.js App Router (páginas delgadas)
    ├── (auth)/
    │   └── login/page.tsx           # Inicio de sesión, registro y acceso explícito a Modo Demo
    ├── (dashboard)/
    │   ├── layout.tsx               # Shell autenticado con AppHeader, BottomNav y DesktopSidebar
    │   ├── page.tsx                 # Pantalla 1: Inicio (Estado actual, mapa corporal y alertas)
    │   ├── registro/page.tsx        # Pantalla 2: Registro numérico de los 6 indicadores
    │   ├── historial/page.tsx       # Pantalla 3: Tendencias por indicador y bitácora por fecha
    │   └── bienestar/page.tsx       # Pantalla 4: Misiones diarias, racha y bitácora de reportes
    └── api/                         # Route Handlers delgados (< 80 líneas c/u)
        ├── evaluate/route.ts        # POST evaluación preliminar / simulación (422 si inválido)
        ├── checkins/route.ts        # GET historial / POST guardado real idempotente
        ├── missions/complete/route.ts # POST completar misión diaria (única por fecha)
        └── comms/log/route.ts       # POST registrar reporte copiado en bitácora
```

---

## 4. Experiencia Web para Teléfono y Escritorio

### Navegación Inferior en Móvil (`< 1024px`) y Lateral en Escritorio (`>= 1024px`)

| Destino | Ruta | Componentes principales | Propósito |
| :--- | :--- | :--- | :--- |
| **Inicio** | `/` | `PriorityAlertCard`, `BodySystemMap`, `SystemDetailCard`, `LastCheckinStrip` | Ver en 1 segundo el estado actual, la alerta de máxima prioridad, el mapa corporal interactivo y la siguiente acción. |
| **Registro** | `/registro` | `CheckinForm`, `NumericField`, `BloodPressureGroup`, `MoodSelector`, `PreliminaryPreview` | Capturar los 6 indicadores con teclado numérico, validar sin ocultar errores y confirmar el guardado real en base de datos. |
| **Historial** | `/historial` | `DateFilterBar`, `IndicatorTrendChart`, `CheckinHistoryList`, `CheckinDetailModal` | Explorar la evolución por fecha real e indicador, comparando contra el promedio habitual del tripulante. |
| **Bienestar** | `/bienestar` | `StreakSummaryCard`, `DailyMissionsList`, `MissionCardItem`, `CommsReportModal` | Completar las 4 rutinas diarias de adherencia (una vez por día calendario) y generar/copiar reportes verificados. |

* **Acciones contextuales en cabecera (`AppHeader`):**
  1. **Reporte rápido (`CommsReportModal`):** Accesible desde Inicio, Bienestar o el detalle de un registro.
  2. **Simulador de escenarios (`ScenarioDrawer`):** Accesible en 1 clic para pruebas o demostración ante el jurado, con sliders exclusivos para simulación y bloqueo total de escritura en la bitácora personal.

---

## 5. Fases de Implementación (4 Bloques Ejecutables)

### Bloque 1. Dominio Puro, Validación Compartida y Pruebas Unitarias
Construir primero `src/domain/health/` y `src/domain/missions/` junto con su suite de tests automatizados (`tests/domain/`):

* **Validación estricta (`vital-schema.ts`):**
  * `{}` o `{ heart_rate: "abc" }` devuelven `valid: false` y `overallStatus: "INSUFFICIENT_DATA"`, jamás `GREEN`.
  * Si `bp_diastolic > bp_systolic - 10`, se devuelve un error explícito en `fieldErrors.bp_diastolic` sin modificar automáticamente el otro campo.
* **Priorización clínica correcta (`cross-evaluator.ts`):**
  * Se evalúan primero los 3 sistemas (`mind`, `heart`, `body`) y todos los cruces activados.
  * `overallStatus` toma la severidad máxima detectada.
  * Ningún cruce `YELLOW` puede convertirse en la conclusión/acción principal cuando existe un sistema en `RED` (ej. pulso `120 BPM` en `RED` + glucosa `110 mg/dL` en `YELLOW` produce conclusión y acción cardiovascular `RED`).
* **Trazabilidad y lenguaje honesto (`systems-evaluator.ts`):**
  * Cada alerta incluye `reasons` (ej. `["Frecuencia cardíaca: 120 BPM (umbral crítico > 100 BPM)"]`) y `reference` con título y URL oficial de **NASA HRP** o **CSA**.

**Criterio de salida del Bloque 1:** Suite de pruebas de dominio (`npm test`) pasando al 100% con cero archivos mayores a 200 líneas.

---

### Bloque 2. Esquema PostgreSQL en Supabase, Auth SSR y Seed Limpio
Configurar el proyecto Supabase dedicado y los módulos de `src/lib/supabase/` y `src/server/repositories/`:

* **Tablas y restricciones de integridad (`supabase/migrations/`):**
  * `profiles`: `id uuid PK REFERENCES auth.users(id)`, `username`, `full_name`, `mission_role`, `timezone`, `xp`, `level`, `streak`, `last_streak_date`.
  * `checkins`: `id uuid PK`, `user_id uuid REFERENCES profiles(id)`, `client_submission_id uuid UNIQUE`, `mission_date date`, `measured_at timestamptz`, `source text CHECK (source IN ('manual', 'seed'))`, `engine_version text`, los 7 campos de signos vitales, `overall_status`, `wellness_index`, `cross_conclusion_id`, `reasons jsonb`.
  * `mission_completions`: `id uuid PK`, `user_id uuid`, `mission_id text`, `mission_date date`, `xp_awarded integer`, `completed_at timestamptz`, con restricción **`UNIQUE (user_id, mission_id, mission_date)`**.
  * `comms_logs`: `id uuid PK`, `user_id uuid`, `checkin_id uuid NULL`, `report_text text`, `copied_to_clipboard boolean`, `created_at timestamptz`.
* **Seguridad RLS:** Políticas `SELECT`, `INSERT`, `UPDATE` restringidas a `auth.uid() = user_id` para el rol `authenticated`; acceso `anon` revocado.
* **Seed verificable (`supabase/seed.ts`):** Crear cuentas demo (`elena`, `marco`) mediante Supabase Auth y poblar 5 días de historial reales (`2026-11-10` a `2026-11-14`) evaluados directamente con `evaluateHealth()` (`v2.0.0`).

**Criterio de salida del Bloque 2:** Aislamiento entre cuentas comprobado con RLS y 100% de coincidencia entre historial guardado y motor `v2.0.0`.

---

### Bloque 3. Endpoints Delgados y Componentes UI Mobile-First
Implementar `src/app/api/`, `src/hooks/`, `src/components/` y las páginas de `src/app/`:

* **Route Handlers delgados (`src/app/api/`):**
  * Comprueban la sesión en servidor con `supabase.auth.getUser()` (nunca por headers `x-user-id` enviados por el cliente).
  * Recalculan siempre la evaluación en el servidor antes de insertar en `checkins`.
  * Responden códigos HTTP semánticos (`400` JSON malformado, `401` sin sesión, `422` datos insuficientes o fuera de rango, `200/201` persistencia confirmada).
* **Componentes y Hooks de Interfaz:**
  * `useCheckinDraft.ts`: Guarda el borrador en `localStorage` bajo la clave `ares_draft_${userId}`, distingue visualmente `Borrador sin guardar` vs `Guardado confirmado`, y permite reintentar con el mismo `clientSubmissionId` si se corta la conexión sin duplicar el registro.
  * `useScenarioSimulator.ts` + `ScenarioDrawer.tsx`: Permite explorar escenarios y mover sliders en vivo durante la presentación sin alterar el borrador ni el historial real del usuario.
  * `useClipboardReport.ts` + `CommsReportModal.tsx`: Comprueba si `navigator.clipboard.writeText` tuvo éxito real antes de mostrar *"Copiado al portapapeles"* y registra el evento en `comms_logs` sin afirmar transmisiones inexistentes.
  * Accesibilidad garantizada en cada componente: contraste mínimo WCAG AA (`>= 4.5:1`), textos auxiliares `>= 12px`, `:focus-visible` nítido y soporte para `prefers-reduced-motion`.

**Criterio de salida del Bloque 3:** Las 4 pantallas navegables en móvil (`375px`) y escritorio, con todos los componentes por debajo de 180 líneas.

---

### Bloque 4. Verificación E2E, Limpieza y Reemplazo
1. Detener el servidor Express legado en el puerto `3000` y retirar/archivar el código antiguo (`backend/`, `database/`, `frontend/`).
2. Ejecutar pruebas automatizadas de extremo a extremo:
   - Inicio de sesión real y bloqueo de rutas sin sesión.
   - Rechazo de entradas vacías o incoherentes (`422 INSUFFICIENT_DATA`).
   - Registro completo desde vista móvil (`375px`), confirmación de guardado en Supabase y consulta inmediata en `/historial`.
   - Intento de reenvío con el mismo `clientSubmissionId` y doble clic en misión diaria para confirmar **cero duplicados** de registros y de XP.
   - Verificación en nueva sesión de que un usuario no puede leer ni modificar datos de otro.

---

## 6. Referencias Aplicadas

- [Next.js App Router: Route Handlers y Backend for Frontend](https://nextjs.org/docs/app/guides/backend-for-frontend)
- [Next.js: Seguridad de Datos](https://nextjs.org/docs/app/guides/data-security)
- [Supabase: Server-Side Auth para Next.js App Router](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [NASA Open MCT](https://nasa.github.io/openmct/) — organización funcional de telemetría, tendencias e historial
- [NASA Horizon Design System](https://nasa.github.io/hds-core/) — jerarquía tipográfica, contraste y sobriedad visual
- [NASA Human Research Program (HRP)](https://www.nasa.gov/hrp/) — trazabilidad de riesgos fisiológicos en vuelos espaciales
