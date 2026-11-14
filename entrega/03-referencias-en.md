# References and asset credits

Project: A.R.E.S. Pulse. Team: ApexCode. Prepared November 14, 2026.

This is a working attribution inventory. It does not certify that every source or dependency used during the project has been identified. Complete the rights and AI-origin review before submitting.

## Challenge and submission rules

- NASA Space Apps, Health Monitoring Software: https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/
- NASA Space Apps, Project Submission Guide: https://www.spaceappschallenge.org/resources/project-submission-guide/
- NASA Space Apps, Terms and Conditions: https://www.spaceappschallenge.org/legal/

## NASA data actually present in the repository

Dataset identifiers, direct source URLs and use descriptions are listed in `02-datos-nasa-en.md`. Sources: NASA Open Science Data Repository, OSD-575, and NASA Life Sciences Portal, UTMB bedrest Campaigns 1 and 3.

The file used for OSD-575 is `LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv`. The local inventory contains sample SHA-256 digests for the downloaded sources. Dataset acknowledgments and associated publication citations should be transcribed from each official record after confirming the relevant terms.

## Contextual and rule references found in the project

These references appear in existing project documents or source code. This list documents attribution and does not verify the clinical correctness of an implemented rule or threshold.

- NASA Human Research Program, five hazards of human spaceflight: https://www.nasa.gov/hrp/hazards/
- NASA Life Sciences Portal: https://www.nasa.gov/hrp/nlsp/
- NASA crew health standards: https://www.nasa.gov/hhp/standards/
- NASA Human Research Roadmap, reference used by the orthostatic rule: https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=95
- NASA Human Research Roadmap, reference used by the sleep rule: https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=88
- American Heart Association, Understanding Blood Pressure Readings: https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings
- NIDDK, Diabetes Tests and Diagnosis: https://www.niddk.nih.gov/health-information/diabetes/overview/tests-diagnosis
- MedlinePlus, Fever: https://medlineplus.gov/fever.html
- Canadian Space Agency, reference stored for astronaut health: https://www.asc-csa.gc.ca/eng/astronauts/living-in-space/astronaut-health.asp

Confirm that each risk identifier still resolves to the topic claimed by the source code. Do not present a source catalog labeled "verified" in code as evidence that every rule received professional or source-level review.

## Software and fonts

| Resource | Use identified | Official source |
| --- | --- | --- |
| Next.js | Web application framework and API routes | https://nextjs.org/ |
| React | Interactive interface and local state | https://react.dev/ |
| TypeScript | Application and data processing code | https://www.typescriptlang.org/ |
| Zod | Input validation | https://zod.dev/ |
| Tailwind CSS | Interface styling | https://tailwindcss.com/ |
| tsx | Existing TypeScript execution and test scripts | https://tsx.is/ |
| Fredoka | Existing app font request | https://fonts.google.com/specimen/Fredoka |
| Plus Jakarta Sans | Existing app font request | https://fonts.google.com/specimen/Plus+Jakarta+Sans |
| Space Mono | Existing app font request | https://fonts.google.com/specimen/Space+Mono |
| OpenAI Codex | Assistance preparing submission documents and demo | https://openai.com/codex/ |

Exact installed versions and transitive dependencies must be checked against the lockfile. Preserve applicable license and NOTICE files when distributing source or dependencies.

## Demo and images

- The seven-slide demo uses editable text and a capture of the astronaut illustration in the existing application. The capture is not a photograph of an astronaut and does not show a real person.
- `demo/ilustracion-prototipo.png` is a direct browser capture of that prototype illustration. The team must confirm the illustration's original authorship, license and any earlier AI generation before publishing. Apply a visible SI-generation watermark if required by its actual provenance.
- Full Spanish interface screenshots in `evidencias/` are internal review material. They are not the English submission demo.
- No NASA logo, flag, mission identifier or agency endorsement has been added to the demo.
- The demo uses Arial. Keep editable font behavior and font licensing in mind if redistributing font files. This package does not distribute font files.

## Items requiring team confirmation

- All people who contributed and all team members registered for the same Local Event.
- Original and third-party code, snippets, assets and any additional design references actually used before this preparation.
- All earlier AI tools, tasks and generated outputs.
- Dataset-specific attribution, restrictions and publication citations.
- The license selected by the team for its own code and documentation. No license has been selected on the team's behalf.
