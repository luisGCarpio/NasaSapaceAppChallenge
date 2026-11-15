# A.R.E.S. Pulse — 7-Slide Pitch Deck (English)

> **Strict NASA Rule:** Maximum **7 slides** (including Title slide), all in **English**.

---

## Slide 1 — Title & Mission Identity
- **Title:** **A.R.E.S. Pulse**
- **Tagline:** *Autonomous Astronaut Health Triage, Empirical NASA Cohort Benchmarking & Gravity Re-Entry Simulator*
- **Team:** ApexCode — Brandon Alvis, Luis Carpio, Mateo Vargas (Universidad CUC)
- **Challenge:** Health Monitoring Software — NASA Space Apps Challenge 2026
- **Visual:** Hero view of the A.R.E.S. Pulse interactive Astronaut HUD & Body Map.

---

## Slide 2 — The Deep-Space Problem (Relevance)
- **44-Minute Comms Delay to Mars:** Crews on Artemis and Mars missions cannot wait for Earth hospitals during acute physiological shifts.
- **Why Standard Health Monitors Fail in Space:**
  1. Require all 7 sensors at once or invent synthetic averages for missing inputs.
  2. Confuse normal post-EVA or orthostatic adaptation with resting illness.
  3. Cannot tell the crew whether to apply an onboard countermeasure or escalate to the Flight Surgeon.
- **Visual:** Diagram of NASA's 5 Hazards of Human Spaceflight -> The 3 Operational Questions A.R.E.S. Pulse answers.

---

## Slide 3 — Contextual Clinical Engine v3.0.0 (Validity)
- **Honest Partial Telemetry (`1/7` to `7/7`):** Evaluates 4 physiological systems (*Mind & Sleep*, *Heart & Vessels*, *Energy & Metabolism*, *Fever & Immunity*) independently—zero synthetic data imputation.
- **Context-Aware Evaluation:** Accounts for posture (`supine`, `standing_tilt`), activity (`rest`, `post_exercise`, `eva`), fasting state, and causal personal baseline (`Median/IQR` excluding prior `RED` episodes).
- **100% Auditable:** Every alert links to explicit rule IDs (`ruleTraces`) and clinical standards (NASA-STD-3001, HRP, AHA, NIDDK).
- **Visual:** Screenshot of the Controls & Interactive Astronaut Body Map reacting live to partial telemetry.

---

## Slide 4 — Powered by 3,965 Real NASA Observations (NASA Data)
- **159 CSV Files Audited -> 3,965 Normalized Records across 6 Official Studies:**
  - **OSDR `OSD-575` (SpaceX Inspiration4):** Real orbital flight & post-landing glucose profiles (`28` obs).
  - **NLSP `CRF_C3_VITALS`:** Empirical `P5–P99` microgravity analog percentiles (`2,450` obs).
  - **NLSP `MR001G_C3_TILT`:** `78` paired `Supine -> 80° Tilt` orthostatic stress tests (`156` obs).
  - **NLSP `MR010G_C3_LAB` & `BRSMACT_C1_SLEEP`:** Lab glucose (`220` obs) & objective actigraphy sleep (`190` obs).
  - **NLSP `CRF_C3_SYMPTOMS`:** `921` real clinical symptom & medical intervention logs.
- **Visual:** Screenshot of the NASA Cohort Percentile Comparator (`P10–P90` bands) & Longitudinal Replay Drawer.

---

## Slide 5 — 4-Level NASA Triage & Gravity Re-Entry Simulator (Creativity)
- **4-Level Autonomous Triage (`cohort-decision.ts`):**
  - 🟢 **Level 0:** Nominal (`P10–P90`) — Full autonomy & EVA cleared.
  - 🔵 **Level 1:** Onboard Countermeasure (Hydration / Box Breathing / Rest + 60m re-check).
  - 🟠 **Level 2:** Flight Surgeon Escalation (`>P95`/`<P5` or clinical alert) — Locks strenuous EVA.
  - 🔴 **Level 3:** Mission Abort / Immediate Medical Return protocol.
- **Gravity Re-Entry Simulator (`MR001G_C3_TILT`):**
  - Projects orthostatic HR (`+60` to `+69 bpm`) and BP (`-5` to `-16 mmHg` SBP) upon landing to detect `PRESYNCOPE_ABORT_RISK` before atmospheric entry.
- **Visual:** Screenshot of the Gravity Re-Entry Modal & 4-Level Operational Decision Card.

---

## Slide 6 — Clinically Gated Gamified Missions (User Experience)
- **Daily Crew Engagement:** Interactive state-machine missions for **4-4-4-4 Box Breathing**, **Resistance Exercise**, and **Circadian Rest** with real-time physiological feedback and XP streaks.
- **Zero-Conflict Clinical Safety Lock:** Automatically blocks strenuous exercise when cardiovascular, febrile, or metabolic alerts are active—reducing unsafe exercise conflicts from `110` (in rigid v2 evaluators) to **`0` across 3,044 quantitative NASA observations**.
- **Visual:** Screenshot of the Interactive Mission Modal (Breathing / Exercise / Rest cards) + Safety Lock badge.

---

## Slide 7 — Impact: From Deep Space to Rural Earth (Impact)
- **For Spaceflight:** Empowers autonomous crew self-triage on Artemis lunar habitats, Gateway, and Mars transit.
- **For Earth:** The exact same partial-telemetry + empirical-cohort architecture enables autonomous rural telemedicine, remote mining/maritime clinics, and home monitoring where lab panels are incomplete.
- **Open & Reproducible:** Full Next.js + TypeScript source code, deterministic NASA CSV ingestion pipeline (`SHA-256` verified), and automated test suite.
- *Disclaimer: Educational and research prototype for NASA Space Apps Challenge 2026; not a certified medical device.*
