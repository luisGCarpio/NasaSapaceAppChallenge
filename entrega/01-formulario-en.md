# A.R.E.S. Pulse — Project submission draft

Status: review draft. Replace the PENDING link fields before submission. The current application interface is in Spanish. Its English version and public access remain delivery tasks.

## Team information

Team: ApexCode  
Team member supplied for this draft: Luis Carpio  
Institution / venue supplied by the participant: Universidad CUC  
Event: NASA Space Apps Challenge 2026  
Challenge: Health Monitoring Software  
Official registered Local Event: PENDING — confirm in the team account.  
Additional team members, if applicable: PENDING — confirm the complete roster.

## Project Name

A.R.E.S. Pulse

## High-Level Project Summary

A.R.E.S. Pulse is an interactive prototype for astronaut health self-assessment. Users adjust sleep, mood, heart rate, blood pressure, glucose and temperature, then explore a body map and a visual summary of the simulated state. Daily wellness missions make the proposed routine tangible. The project addresses the Health Monitoring Software challenge by exploring how crews could understand health indicators during missions with limited access to Earth-based support. Alongside the interface, we have prepared a separate evaluation engine and normalized research observations from NASA OSDR and the NASA Life Sciences Portal. Connecting these components is the next integration step. This is a research and educational prototype. Clinical validation remains future work.

## Link to Project Demo

PENDING — publish `demo/ares-pulse-demo.pdf` or `demo/ares-pulse-demo.pptx` and insert its public URL. The deck has seven slides, including the title slide.

## Link to Final Project

PENDING — provide a public application or complete project package that judges can access without a login, password, permission request or registration.

The configured repository URL is https://github.com/luisGCarpio/NasaSapaceAppChallenge. An anonymous check returned HTTP 404 on November 14, 2026. Public availability is unconfirmed. Do not use that URL as the final project link until access and submitted content have been checked.

## Detailed Project Description

### Problem and intended users

Long missions expose crews to health risks while increasing the distance from Earth-based care. Our intended user is a crew member performing a routine health check. The prototype explores a visual way to review measurements and understand which body systems deserve attention.

### What the current interface does

The home page presents an astronaut illustration with interactive body nodes. A control view lets the user change sleep duration, mood, pulse, systolic and diastolic pressure, glucose and body temperature. Local rules update the simulated system states and an overall explanation. Additional views show illustrative trends and wellness missions with experience points. A breathing interaction demonstrates a guided routine.

The visible experience uses local React state and example history. It does not read live sensor measurements. The Earth contact interaction displays a simulated confirmation. It does not transmit a medical report to a flight surgeon. The current prototype interface is in Spanish.

### Evaluation engine and NASA research data

Separate TypeScript modules implement evaluation by body system, partial measurement coverage, measurement context, comparisons with prior observations, rule traces and restrictions for wellness missions. These modules are separate from the local evaluator used by the main visual interface. Their presence in the source does not establish an integrated, validated user flow.

Our ingestion pipeline has produced a local inventory of six NASA research datasets: 159 processed CSV files and 3,965 normalized records. Of those records, 3,044 contain at least one numeric vital and 921 contain qualitative symptom information without numeric vitals. The sources include Inspiration4 metabolic measurements and terrestrial bedrest analog studies. We preserve missing indicators and source context instead of completing a fictitious seven-indicator profile.

These data support investigation of data coverage and evaluation behavior. They do not establish diagnostic accuracy, treatment benefit or performance during a long space mission. The research benchmark endpoint initially returned HTTP 500. After concurrent application updates outside this preparation, a later read returned HTTP 200 and reported 3,044 evaluable numeric records. This is a software processing result, not a measurement of clinical accuracy.

### Development tools

The project uses Next.js, React, TypeScript, Zod and Tailwind CSS. The repository includes a CSV ingestion pipeline, JSON storage modules and API routes. The main visual experience currently runs independently of the broader application state flow. Package versions and dependencies are recorded in `package.json` and the repository lockfile.

### Intended benefit and originality

The design combines a body-based visual explanation with a daily routine that a user can explore through a working simulation. The proposed benefit is easier interpretation of a routine check and sustained engagement with health monitoring. These benefits remain hypotheses pending user evaluation. The NASA data work makes missing measurements and different research contexts explicit.

### Limitations and next steps

The next steps are to connect the interface to the contextual evaluation engine, provide English content and verify the complete user flow after concurrent changes. The updated persistence source now contains repeated-observation storage and passes context and history to the engine. That flow still requires end-to-end verification. Benchmark methodology and the rules also need independent review. Future evaluation should measure false alerts, missed priority events and comprehension using independent reference labels. No clinical accuracy percentage, certification or operational readiness is claimed.

## Use of Super Intelligence (SI)

Yes. OpenAI Codex assisted with inspecting the existing project and drafting the English submission, the seven-slide demonstration, supporting references and delivery tasks. It did not modify application source code during this delivery-preparation step. The project already existed before this step. The team must confirm any earlier use of AI in ideation, code, images, data processing or other materials and add those details before submitting. See `04-declaracion-ia-en.md` for the draft and verification items.

## NASA Data

We used publicly accessible research files from NASA OSDR study OSD-575 and five NASA Life Sciences Portal datasets covering daily vitals, orthostatic tilt, laboratory glucose, symptom complaints and sleep actigraphy. Our ingestion pipeline normalized these files into 3,965 research records and generated an inventory with source URLs and sample file hashes. The NASA-derived records currently reside in a research data layer separate from the home-page simulation. See `02-datos-nasa-en.md` for dataset identifiers, measurements and limitations.

NASA HRP resources provide the spaceflight health context. Using these resources does not imply NASA endorsement or clinical validation of the prototype.

## Space Agency Partner Data and Other References

NASA OSDR OSD-575; NASA Life Sciences Portal / UTMB bedrest datasets; NASA Human Research Program; Next.js; React; TypeScript; Zod; Tailwind CSS; Google Fonts; OpenAI Codex. Additional source links and the distinction between data actually imported and contextual references appear in `03-referencias-en.md`.

No Space Agency Partner dataset import has been verified in this preparation. CSA resources appear in the existing project documentation and source references, and should be credited where actually used. The team must complete the third-party and AI asset audit before submission.
