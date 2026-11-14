# NASA data provenance and actual use

Team: ApexCode. Project: A.R.E.S. Pulse. Review date: November 14, 2026.

## Local inventory

The existing file `data/nasa-normalized/audit-inventory.json` reports generation at `2026-11-14T20:06:55.916Z`. A copy is included as `evidencias/inventario-nasa.json`. The observation array was checked directly against that inventory.

| Measure | Local result |
| --- | ---: |
| Datasets | 6 |
| CSV files reported as processed | 159 |
| Raw rows reported as scanned | 17,653 |
| Normalized records counted in the observation array | 3,965 |
| Records with at least one numeric vital | 3,044 |
| Qualitative symptom records without numeric vitals | 921 |

The 3,965 records are repeated research observations. They are not 3,965 people or validated clinical cases. The inventory reports 167 skipped or defective records, but this figure is not the difference between raw rows and normalized output. The parsers select and reduce records differently, including orthostatic session summaries and laboratory analytes. A complete row disposition audit remains pending. We did not rerun the download or independently verify all 159 source files for this delivery.

## Imported sources

| Source | Official identifier | Records | Numeric indicators available |
| --- | --- | ---: | --- |
| NASA OSDR, Inspiration4 Comprehensive Metabolic Panel | OSD-575 | 28 | Glucose |
| NASA NLSP, UTMB Campaign 3 Daily Vitals | 7153409b-d8a3-5a23-b667-9df8a182dfdc | 2,450 | Heart rate, systolic/diastolic blood pressure, temperature |
| NASA NLSP, UTMB Campaign 3 Orthostatic Tilt | f4a134da-7131-55f8-a0a1-e67d56509432 | 156 | Heart rate, systolic/diastolic blood pressure |
| NASA NLSP, UTMB Campaign 3 Clinical Laboratory | a36f6361-3492-5590-a675-a0257edf69ac | 220 | Glucose |
| NASA NLSP, UTMB Campaign 3 Symptom Complaints | 625b7cf3-4cef-5983-8ce1-2e33ec807168 | 921 | None; qualitative symptom records |
| NASA NLSP, UTMB Campaign 1 Sleep Actigraphy | e26501eb-7d7a-5012-8c8e-c5bdb3eecaf6 | 190 | Sleep duration |

These counts sum to 3,965. Per-dataset subject counts must not be summed as independent participants because Campaign 3 cohorts overlap. The audit found 39 distinct normalized subject strings across the full array. That is a software identifier count, not an independently verified count of unique people.

## How the project uses the files

1. `scripts/ingest-nasa-datasets.ts` retrieves files from NASA repositories and builds the inventory.
2. `scripts/nasa-study-parsers.ts` extracts supported variables while preserving research context and missing indicators.
3. `data/nasa-normalized/observations.json` stores normalized research records separately from user records.
4. `src/server/repositories/nasa-datasets-repo.ts` exposes source inventory, subject summaries and evaluation timelines through the existing research API code.
5. `src/domain/nasa/benchmark-runner.ts` contains a software comparison procedure. Its HTTP endpoint initially failed, then returned HTTP 200 after concurrent application updates outside this preparation. The later response reported 3,044 evaluable records out of 3,044 with numeric vitals. This describes processing coverage, not clinical performance. Both responses are preserved in `evidencias/`.

The main home-page component uses a different, local simulation evaluator and fixed historical arrays. The research files do not currently drive that visible simulation. The delivery documents and demo preserve this distinction.

## Important limits

- Inspiration4 includes a short spaceflight cohort and pre-/post-flight metabolic sampling. It does not provide a complete daily seven-indicator monitoring record.
- UTMB bedrest studies are terrestrial analogs. They do not establish validity for astronauts during long missions.
- Mood data are absent from the listed imports. Missing glucose, sleep or mood must not be presented as measured values.
- Different measurement positions, experimental phases and glucose timing affect comparability. Parser handling needs review against the original data dictionaries.
- Qualitative symptom records do not provide independent ground-truth labels for every alert.
- A software coverage comparison is not sensitivity, specificity, diagnostic accuracy or a demonstration of treatment benefit.
- Hash samples in the inventory help identify files. They do not establish medical validity or prove that every download was independently verified.

## Source links

- NASA Life Sciences Portal overview: https://www.nasa.gov/hrp/nlsp/
- OSD-575 study: https://osdr.nasa.gov/bio/repo/data/studies/OSD-575
- OSD-575 downloaded file: https://osdr.nasa.gov/geode-py/ws/studies/OSD-575/download?source=datamanager&file=LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv
- Daily vitals metadata: https://nlsp.nasa.gov/api/v1/data/datasets/7153409b-d8a3-5a23-b667-9df8a182dfdc/full
- Tilt metadata: https://nlsp.nasa.gov/api/v1/data/datasets/f4a134da-7131-55f8-a0a1-e67d56509432/full
- Laboratory metadata: https://nlsp.nasa.gov/api/v1/data/datasets/a36f6361-3492-5590-a675-a0257edf69ac/full
- Symptom metadata: https://nlsp.nasa.gov/api/v1/data/datasets/625b7cf3-4cef-5983-8ce1-2e33ec807168/full
- Actigraphy metadata: https://nlsp.nasa.gov/api/v1/data/datasets/e26501eb-7d7a-5012-8c8e-c5bdb3eecaf6/full

Dataset-level access terms, associated publication citations and redistribution permissions must be checked before publishing a data bundle. This delivery supplies documentation and aggregate counts, and does not copy the full observation array or raw CSV cache into the submission folder.
