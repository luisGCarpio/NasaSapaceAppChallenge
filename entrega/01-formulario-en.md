# A.R.E.S. Pulse — Official NASA Space Apps Challenge 2026 Submission Copy

Ready-to-paste fields in English for the NASA Space Apps Challenge **Project Submission** page.

---

## 1. Project Name

```text
A.R.E.S. Pulse — Autonomous Astronaut Health Triage, Cohort Benchmarking & Gravity Re-Entry Simulator
```
*(Or simply: `A.R.E.S. Pulse`)*

---

## 2. High-Level Project Summary
*(Short summary — usually 150–300 words max depending on the form box)*

```text
On deep-space missions to the Moon (Artemis) and Mars, communication delays of up to 44 minutes and extreme isolation mean astronauts cannot rely on real-time Earth hospitals for routine triage. A.R.E.S. Pulse (Autonomous Readiness & Evaluation System) is an interactive clinical decision-support and health-monitoring platform built for the Health Monitoring Software challenge that answers three critical mission questions in real time:

1. What is happening across my physiological systems—even when telemetry is incomplete? Our Contextual Clinical Engine v3.0.0 evaluates 1 to 7 indicators across four body systems (Mind & Sleep, Heart & Vessels, Energy & Metabolism, Fever & Immunity) without inventing or imputing missing values, factoring in posture, activity state, fasting context, and personal historical baselines (median/IQR).
2. Can I resolve this autonomously on board, or do I need the Flight Surgeon on Earth? Our 4-Level NASA Operational Decision Engine benchmarks every active vital sign against empirical percentile bands (P5–P99) extracted from 3,965 normalized NASA observations (OSDR OSD-575 SpaceX Inspiration4 and 5 NASA Life Sciences Portal studies) and cross-references 921 historical symptom-intervention events.
3. Would my cardiovascular system safely tolerate a planetary EVA or gravity re-entry today? Using 78 paired Supine-to-80° Head-Up Tilt sessions from NASA NLSP study MR001G_C3_TILT, our Gravity Re-Entry Simulator projects orthostatic heart rate and blood pressure stress to classify landing readiness (GO FOR LANDING, COUNTERMEASURE REQUIRED, or PRESYNCOPE ABORT RISK) and safely locks strenuous exercise missions whenever clinical alerts are active.
```

---

## 3. Link to Project Demo
*(Upload the 7-slide PDF/PPTX deck or your ≤30s video to Google Drive / YouTube with **"Anyone with the link can view"** and paste the link)*

```text
[PASTE YOUR PUBLIC GOOGLE DRIVE OR YOUTUBE DEMO LINK HERE]
```
> **Note:** You already have a 7-slide deck in `entrega/demo/ares-pulse-demo.pdf` (and `.pptx`), plus updated slide copy in `entrega/demo/contenido-en.md` and a 30-second video script in `entrega/demo/guion-video-en.md`.

---

## 4. Link to Final Project
*(Make sure https://github.com/luisGCarpio/NasaSapaceAppChallenge is set to **Public** in GitHub Settings → Danger Zone → Change visibility → Public! If deployed on Vercel/Render, include that URL too.)*

```text
https://github.com/luisGCarpio/NasaSapaceAppChallenge
```

---

## 5. Detailed Project Description

```markdown
### 1. The Challenge & Vision
As humanity prepares for sustained lunar presence (Artemis) and Mars transit, crews face NASA's Five Hazards of Human Spaceflight: space radiation, isolation and confinement, distance from Earth, gravity fields, and hostile/closed environments. Standard consumer health monitors fail in spaceflight scenarios because they:
- Demand complete sensor panels or silently fill missing data with synthetic averages.
- Ignore pre-analytical and postural contexts (e.g., interpreting normal post-EVA tachycardia or orthostatic tilt responses as resting pathology).
- Do not distinguish between mild deviations manageable via autonomous onboard countermeasures and critical outliers requiring Flight Surgeon intervention.

**A.R.E.S. Pulse** bridges the gap between raw physiological telemetry, empirical spaceflight cohorts, and autonomous daily crew operations.

### 2. Core Technical Pillars

#### A. Contextual Clinical Engine v3.0.0 (`src/domain/health/`)
- **Honest Partial Telemetry (1 to 7 Indicators):** Astronauts can toggle any subset of 7 indicators (Sleep Duration, Mood, Heart Rate, Systolic BP, Diastolic BP, Serum Glucose, Body Temperature). The engine evaluates active physiological systems independently, reports exact capture coverage (`0/7` to `7/7`), and highlights pending systems without masking active alerts.
- **Pre-Analytical & Postural Awareness:** Evaluates readings against activity state (`rest`, `post_exercise`, `eva`, `orthostatic_tilt`), posture (`supine`, `seated`, `standing_tilt`), glycemic timing (`fasting`, `post_meal`, `random`), thermal measurement method, and repeat-reading confirmation.
- **Causal Personal Baseline (`baseline-analyzer.ts`):** Computes robust personal historical medians and interquartile ranges (IQR) while excluding prior acute `RED` episodes so persistent pathology is never normalized.
- **Auditable Rule Traces:** Every alert exposes exact rule IDs (`ruleTraces`) and bibliographic clinical references (NASA-STD-3001, NASA HRP, AHA, NIDDK).

#### B. 4-Level NASA Operational Decision Engine (`src/domain/nasa/cohort-decision.ts`)
Compares live measurements against empirical percentile distributions (`P5`, `P10`, `P25`, `P50`, `P75`, `P90`, `P95`, `P99`) computed across **3,965 real normalized NASA observations** and maps clinical severity to **921 real clinical symptom-intervention logs** (`CRF_C3_SYMPTOMS`):
- **Level 0 — Full Crew Autonomy:** All measured indicators within the nominal `P10–P90` NASA cohort band. Cleared for EVA and normal mission schedule.
- **Level 1 — Autonomous Onboard Countermeasure:** Mild/moderate deviation aligned with historical onboard nursing/assessment events (`343` historical cases). Prescribes local hydration, guided breathing, or rest with a 60-minute re-check—without escalating to Earth.
- **Level 2 — Earth Flight Surgeon Consultation:** Extreme cohort outliers (`<P5` or `>P95`) or clinical warnings aligned with onboard medication kit / physician notification events (`294` historical cases). Locks strenuous EVA/exercise and packages structured telemetry for Mission Control.
- **Level 3 — Operational Abort / Medical Return Protocol:** Severe physiological decompensation, critical hypoglycemia (`<55 mg/dL`), or high presyncope risk upon gravity return.

#### C. Gravity Re-Entry & Planetary Landing Simulator (`MR001G_C3_TILT`)
Built on **78 paired `Supine -> 80° Standing Tilt` sessions** (`41` post-microgravity analog sessions) from NASA NLSP study `MR001G_C3_TILT`:
- Projects Heart Rate, Systolic/Diastolic Blood Pressure, and Pulse Pressure transitions when returning from microgravity to planetary gravity under two selectable profiles:
  - **Standard Post-Mission Re-Entry (`P50 POST_TEST`):** `+60 bpm` HR, `-5 mmHg` SBP, `+6 mmHg` DBP.
  - **Severe Deconditioning (`P75/P25 Vulnerable Profile`):** `+69 bpm` HR, `-16 mmHg` SBP, `+4 mmHg` DBP.
- Outputs actionable landing readiness verdicts (`GO_FOR_LANDING`, `COUNTERMEASURE_REQUIRED_BEFORE_LANDING`, or `PRESYNCOPE_ABORT_RISK`) and recommends fluid-loading + lower-body compression garment countermeasures.

#### D. Clinically Gated Gamified Missions & Longitudinal NASA Replay
- **Interactive Countermeasure Missions:** Gamified daily routines—Guided Box Breathing (`4-4-4-4` cadence), Microgravity Resistance Exercise, and Circadian Rest Protocol—with interactive state machines, XP rewards, and live vital-sign feedback.
- **Clinical Safety Lock (`mission-safety.ts`):** Automatically locks strenuous exercise missions when cardiovascular, febrile, or metabolic alerts are active—eliminating `100%` of unsafe exercise recommendations (`0` conflicts across `3,044` quantitative NASA observations, compared to `110` conflicts in rigid v2 baseline evaluators).
- **Longitudinal NASA Cohort Replay:** Users can browse and load real de-identified subject timelines from **SpaceX Inspiration4 (`OSD-575`)** and **UTMB Bedrest Campaigns 1 & 3** directly into the interactive astronaut studio.

### 3. Technology Stack & Architecture
- **Frontend & API:** Next.js 16.4 (App Router), React 19.3, TypeScript 7, Tailwind CSS v4, custom SVG interactive anatomical map & real-time telemetry HUD.
- **Data Pipeline & Persistence:** Deterministic CLI ingestion pipeline (`scripts/ingest-nasa-datasets.ts`) auditing 159 CSV files with SHA-256 verification; atomic local JSON store (`.tmp -> .bak -> rename` with mutex locking), `scrypt` authentication, and optional Supabase PostgreSQL synchronization (`supabase/migrations/`).
- **Verification:** Automated test suite (`tsx --test`) covering domain rules, API contracts, NASA cohort benchmarks, studio controls, and mission state machines.

### 4. Methodological Scope & Disclaimer
A.R.E.S. Pulse is an educational and research decision-support prototype developed for the 2026 NASA Space Apps Challenge. It is not a certified medical device and does not replace real Flight Surgeon protocols.
```

---

## 6. Use of Super Intelligence (SI)

```text
Yes. We used AI coding and research assistants (Claude / Gemini in Antigravity IDE and OpenAI Codex) during development and submission preparation to:
1. Assist with TypeScript refactoring, UI component styling, and state-machine unit test generation for our interactive studio and mission modals.
2. Audit and structure data-ingestion parsers for the 6 official NASA OSDR and NLSP datasets while strictly preserving raw empirical values (zero synthetic data imputation).
3. Draft and translate our English submission documentation, 7-slide presentation deck, and 30-second video pitch script.

All clinical rules, physiological thresholds, empirical percentile calculations, and architectural decisions were verified by the ApexCode team against official NASA data files and public clinical references. No AI-generated synthetic patient data was mixed into the NASA research cohort.
```

---

## 7. NASA Data

```text
We built a reproducible ingestion pipeline (`scripts/ingest-nasa-datasets.ts`) that processes 159 CSV files (17,653 raw rows) from 6 official datasets across the NASA Open Science Data Repository (OSDR) and the NASA Life Sciences Portal (NLSP), producing 3,965 normalized longitudinal observations (`data/nasa-normalized/observations.json`) without synthetic imputation:

1. NASA OSDR Study OSD-575 (LSDS-8 — SpaceX Inspiration4 Comprehensive Metabolic Panel): 28 real spaceflight observations across 4 commercial astronauts (L-92 to R+194), used for flight/post-return serum glucose benchmarking and post-landing hypoglycemia detection (https://osdr.nasa.gov/bio/repo/data/studies/OSD-575).
2. NASA NLSP CRF_C3_VITALS (UTMB Bedrest Campaign 3 Daily Vitals, ID: 7153409b-d8a3-5a23-b667-9df8a182dfdc): 2,450 observations across 23 subjects in -6° head-down tilt microgravity analog, establishing empirical P5–P99 cohort percentiles for heart rate, systolic/diastolic blood pressure, and body temperature (https://nlsp.nasa.gov/api/v1/data/datasets/7153409b-d8a3-5a23-b667-9df8a182dfdc/full).
3. NASA NLSP MR001G_C3_TILT (UTMB Campaign 3 Orthostatic Tilt Test, ID: f4a134da-7131-55f8-a0a1-e67d56509432): 156 observations (78 paired Supine vs. 80° Head-Up Tilt sessions across 26 subjects), powering our Gravity Re-Entry & Planetary Landing Simulator (https://nlsp.nasa.gov/api/v1/data/datasets/f4a134da-7131-55f8-a0a1-e67d56509432/full).
4. NASA NLSP MR010G_C3_LAB (UTMB Campaign 3 Clinical Laboratory & i-STAT, ID: a36f6361-3492-5590-a675-a0257edf69ac): 220 serum glucose observations across 31 subjects, separating fasting vs. random glycemic distributions while filtering out urinalysis false positives (https://nlsp.nasa.gov/api/v1/data/datasets/a36f6361-3492-5590-a675-a0257edf69ac/full).
5. NASA NLSP CRF_C3_SYMPTOMS (UTMB Campaign 3 Symptom & Clinical Intervention Logs, ID: 625b7cf3-4cef-5983-8ce1-2e33ec807168): 921 real clinical symptom events across 23 subjects (recording Observation Only, Nursing Support, Onboard Medication Kit, and Flight Surgeon Notification), grounding our 4-Level Operational Decision Engine (https://nlsp.nasa.gov/api/v1/data/datasets/625b7cf3-4cef-5983-8ce1-2e33ec807168/full).
6. NASA NLSP BRSMACT_C1_SLEEP (UTMB Campaign 1 Wrist Actigraphy Sleep Study, ID: e26501eb-7d7a-5012-8c8e-c5bdb3eecaf6): 190 objective sleep duration observations, establishing empirical mission sleep percentiles (https://nlsp.nasa.gov/api/v1/data/datasets/e26501eb-7d7a-5012-8c8e-c5bdb3eecaf6/full).

Additionally, we referenced NASA Human Research Program (HRP) Five Hazards of Human Spaceflight and NASA-STD-3001 Space Flight Human-System Standard for clinical rule context.
```

---

## 8. Space Agency Partner Data and Other References

```text
Space Agency Partner & Clinical References:
- Canadian Space Agency (CSA) — Astronaut Health & Living in Space Reference: https://www.asc-csa.gc.ca/eng/astronauts/living-in-space/astronaut-health.asp
- NASA Human Research Program (HRP) — Five Hazards of Human Spaceflight: https://www.nasa.gov/hrp/hazards/
- NASA Human Research Roadmap — Risk of Orthostatic Intolerance During Re-Exposure to Gravity (Risk ID 95): https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=95
- NASA Human Research Roadmap — Risk of Performance Decrements and Adverse Health Outcomes Resulting from Sleep Loss (Risk ID 88): https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=88
- NASA-STD-3001 — Space Flight Human-System Standard (Crew Health): https://www.nasa.gov/hhp/standards/
- American Heart Association (AHA) — Blood Pressure Categories & Guidelines: https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings
- National Institute of Diabetes and Digestive and Kidney Diseases (NIDDK) — Glycemic Thresholds: https://www.niddk.nih.gov/health-information/diabetes/overview/tests-diagnosis
- MedlinePlus — Fever and Thermoregulation Reference: https://medlineplus.gov/fever.html

Open-Source Software & Tools:
- Next.js 16.4 (https://nextjs.org/), React 19.3 (https://react.dev/), TypeScript (https://www.typescriptlang.org/), Tailwind CSS v4 (https://tailwindcss.com/), Zod (https://zod.dev/), Supabase PostgreSQL Schema (https://supabase.com/).
```
