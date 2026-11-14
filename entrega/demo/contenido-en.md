# A.R.E.S. Pulse — Seven-slide demo content

Status: draft for team review. English submission materials. Team: ApexCode. Team member supplied: Luis Carpio. Institution / venue supplied: Universidad CUC. Confirm the complete roster before submission. The prototype illustration's original attribution and any earlier AI generation remain pending.

## 1. A.R.E.S. Pulse

Astronaut health self-assessment prototype

ApexCode  
Luis Carpio  
Universidad CUC  
Health Monitoring Software  
NASA Space Apps Challenge 2026

## 2. Health checks during long missions

Crews need a clear way to review health indicators when Earth-based support is distant.

Our prototype explores an understandable daily check with a body-based view.

Source: NASA Space Apps, Health Monitoring Software challenge; NASA HRP five hazards. No measured clinical benefit claimed.

## 3. The interactive prototype

Users adjust sleep, mood, pulse, blood pressure, glucose and temperature.

The body map and simulated system states respond to those inputs.

The current interface uses Spanish text and local simulation rules. The image is a capture of the existing prototype illustration.

Source: `src/components/home/AresStudioView.tsx`, browser capture from the running prototype. Illustration authorship and prior AI generation require confirmation.

## 4. A daily routine to explore

Illustrative trends help explain the proposed monitoring experience.

Wellness missions and a breathing interaction make the routine tangible.

History uses example values. Earth contact is a visual simulation. User benefit has not been measured.

Source: `src/components/home/AresStudioView.tsx`. No live sensor integration or actual Earth transmission claimed.

## 5. NASA research data

6 datasets. 159 CSV files processed. 3,965 normalized records.

3,044 records contain numeric vitals. 921 contain qualitative symptom information.

NASA OSDR Inspiration4 metabolic data and NASA NLSP bedrest studies support a separate research layer. They do not currently drive the home-page simulation.

Sources: local inventory `data/nasa-normalized/audit-inventory.json`, observation array, NASA OSDR OSD-575 and NASA NLSP. Repeated records are not participant counts. No clinical accuracy claim.

## 6. Integration and validation

Separate engine modules handle partial measurements, context and rule traces.

The next integration connects those modules to the visual interface.

The research API supports software replay. Clinical validation remains future work.

Sources: `src/domain/health/index.ts`, `src/domain/nasa/benchmark-runner.ts`, `entrega/evidencias/benchmark-existente.json`, `entrega/evidencias/benchmark-segunda-revision.json`. The endpoint initially failed and later returned HTTP 200 with 3,044 evaluable numeric records. This is software coverage, not clinical accuracy.

## 7. A clearer daily health check

Our aim is to help crews understand what they record and what deserves attention.

Next: an English interface, a connected evaluation flow and independent validation.

Research and educational prototype. Team review and public hosting pending.

AI disclosure: OpenAI Codex assisted with submission writing and slide preparation. The team must confirm any earlier AI use and illustration provenance.
