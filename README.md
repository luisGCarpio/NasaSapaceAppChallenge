# A.R.E.S. Pulse (ARES Orbit)

A.R.E.S. Pulse is an interactive astronaut health-monitoring prototype built by **ApexCode** for the NASA Space Apps Challenge 2026. It combines contextual vital-sign assessment, mission activities, NASA research data, and a return-to-gravity simulation.

## Try the demo

The application opens with a fictional crew member and seven days of example data. No account or login is required. Explore the dashboard, adjust measurements and context, try the predefined scenarios, complete missions, and reset the demo when needed.

Demo activity is stored in the browser. If browser storage is unavailable, it remains in memory for the current page session and is lost on reload. The NASA replay uses research observations and is distinct from the synthetic demo scenarios.

## Features

- **Contextual health assessment:** Evaluate one or more vital signs with measurement context, coverage, data quality, and personal baseline information.
- **NASA data explorer:** Review the dataset inventory, benchmark results, and longitudinal participant observations.
- **Return-to-gravity simulation:** Explore estimated cardiovascular responses using the `MR001G_C3_TILT` dataset.
- **Daily missions:** Try hydration, exercise, rest, and breathing activities with clinical restrictions where applicable.
- **Mission report:** Generate and copy a report for Mission Control. This records a local event; it does not transmit data to NASA.

## Run locally

Install Node.js 20.9 or later and npm, then run:

```bash
git clone https://github.com/luisGCarpio/NasaSapaceAppChallenge.git
cd NasaSapaceAppChallenge
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The interface is currently in Spanish.

## Main routes

| Route | Purpose |
| --- | --- |
| `/` | Astronaut overview and operational assessment |
| `/registro` | Vital signs, measurement context, and scenarios |
| `/historial` | Trends and observation history |
| `/bienestar` | Daily mission activities |
| `/datos-nasa` | Dataset audit, benchmark, and participant replay |

## NASA datasets

The normalized data and audit inventory are stored in `data/nasa-normalized/`. The project draws on [NASA OSDR](https://osdr.nasa.gov/bio/repo/data/studies/OSD-575) and NASA Life Sciences Data Archive datasets, including `CRF_C3_VITALS`, `MR001G_C3_TILT`, `MR010G_C3_LAB`, `CRF_C3_SYMPTOMS`, and `BRSMACT_C1_SLEEP`.

Original downloaded CSV files are excluded from the repository. To download and rebuild the normalized data:

```bash
npx tsx scripts/ingest-nasa-datasets.ts --force
```

## Project structure

```text
data/       NASA data and local server seed
scripts/    NASA dataset ingestion and parsing
src/app/    Next.js pages and API routes
src/components/  Interactive interface
src/context/     Application state
src/domain/      Health, mission, and NASA decision logic
src/lib/         Browser storage and client API
src/server/      Server repositories and storage
tests/      Domain, API, and interface tests
```

## Verification

```bash
npm test
npm run build
```

The application uses Next.js, React, TypeScript, and Tailwind CSS.

## Scope

This is an educational research prototype, not a certified medical device. Its assessments and simulations do not replace clinical advice or operational flight-surgeon protocols.
