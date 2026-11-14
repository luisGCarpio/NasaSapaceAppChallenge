import fs from 'node:fs/promises';
import path from 'node:path';
import {
  NasaAuditInventory,
  NasaDatasetInventoryEntry,
  NasaResearchObservation,
  NasaStudyId,
} from '../src/domain/nasa/nasa-types';
import {
  downloadWithCache,
} from './nasa-csv-utils';
import {
  parseBrsmActigraphyCsv,
  parseCrfDailyVitalsCsv,
  parseCrfSymptomsCsv,
  parseMr001gTiltCsv,
  parseMr010gLabCsv,
  parseOsd575Csv,
  ParseResult,
} from './nasa-study-parsers';

interface NlspFileItem {
  id: string;
  file_name?: string;
  __original_file_name?: string;
}

const ROOT = process.cwd();
const RAW_DIR = path.join(ROOT, 'data', 'nasa-raw');
const OUT_DIR = path.join(ROOT, 'data', 'nasa-normalized');
const FORCE = process.argv.includes('--force');

async function fetchNlspFiles(datasetId: string): Promise<NlspFileItem[]> {
  const res = await fetch(`https://nlsp.nasa.gov/api/v1/data/datasets/${datasetId}/full`);
  if (!res.ok) throw new Error(`NLSP metadata HTTP ${res.status} for ${datasetId}`);
  const data = (await res.json()) as { related?: { data_files?: { items?: NlspFileItem[] } } };
  return data.related?.data_files?.items ?? [];
}

async function ingestNlspStudy(opts: {
  studyId: NasaStudyId;
  datasetId: string;
  title: string;
  population: string;
  availableVitals: string[];
  timeAxis: string;
  knownDefectsAndNotes: string[];
  fileFilter: (name: string) => boolean;
  parser: (text: string, fileName: string) => ParseResult;
}): Promise<{ entry: NasaDatasetInventoryEntry; observations: NasaResearchObservation[] }> {
  const items = await fetchNlspFiles(opts.datasetId);
  const allObs: NasaResearchObservation[] = [];
  const samples: NasaDatasetInventoryEntry['sha256Samples'] = [];
  let rawRows = 0;
  let skipped = 0;
  let filesProcessed = 0;

  for (const item of items) {
    const fileName = item.__original_file_name || item.file_name || `${item.id}.csv`;
    if (!opts.fileFilter(fileName)) continue;
    const dl = await downloadWithCache(
      `https://nlsp.nasa.gov/api/v1/files/${item.id}/download`,
      path.join(RAW_DIR, opts.studyId, fileName),
      FORCE
    );
    filesProcessed++;
    if (samples.length < 3) {
      samples.push({ fileName, sha256: dl.sha256, bytes: dl.bytes });
    }
    const parsed = opts.parser(dl.text, fileName);
    rawRows += parsed.rawRows;
    skipped += parsed.skipped;
    allObs.push(...parsed.observations);
  }

  const subjects = [...new Set(allObs.map((o) => o.subjectId))].sort();
  return {
    observations: allObs,
    entry: {
      studyId: opts.studyId,
      officialId: opts.datasetId,
      title: opts.title,
      sourceSystem: 'NASA NLSP',
      sourceUrl: `https://nlsp.nasa.gov/api/v1/data/datasets/${opts.datasetId}/full`,
      population: opts.population,
      filesProcessed,
      rawRowsScanned: rawRows,
      validObservationsExtracted: allObs.length,
      skippedOrDefectiveRows: skipped,
      uniqueSubjects: subjects.length,
      subjectIds: subjects,
      availableVitals: opts.availableVitals,
      timeAxis: opts.timeAxis,
      knownDefectsAndNotes: opts.knownDefectsAndNotes,
      sha256Samples: samples,
    },
  };
}

async function main() {
  const allObservations: NasaResearchObservation[] = [];
  const datasets: NasaDatasetInventoryEntry[] = [];

  // 1. NASA OSDR OSD-575 SpaceX Inspiration4
  const osdUrl = 'https://osdr.nasa.gov/geode-py/ws/studies/OSD-575/download?source=datamanager&file=LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv';
  const osdDl = await downloadWithCache(osdUrl, path.join(RAW_DIR, 'OSD-575', 'LSDS-8_CMP.csv'), FORCE);
  const osdParsed = parseOsd575Csv(osdDl.text, 'LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv');
  const osdSubjects = [...new Set(osdParsed.observations.map((o) => o.subjectId))].sort();
  allObservations.push(...osdParsed.observations);
  datasets.push({
    studyId: 'OSD-575',
    officialId: 'OSD-575',
    title: 'SpaceX Inspiration4 Comprehensive Metabolic Panel (LSDS-8)',
    sourceSystem: 'NASA OSDR',
    sourceUrl: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-575',
    population: '4 astronautas comerciales SpaceX Inspiration4 (3 días órbita LEO)',
    filesProcessed: 1,
    rawRowsScanned: osdParsed.rawRows,
    validObservationsExtracted: osdParsed.observations.length,
    skippedOrDefectiveRows: osdParsed.skipped,
    uniqueSubjects: osdSubjects.length,
    subjectIds: osdSubjects,
    availableVitals: ['glucose'],
    timeAxis: 'L-92, L-44, L-3 pre-vuelo / R+1, R+45, R+82, R+194 post-vuelo',
    knownDefectsAndNotes: ['Sin hora exacta de ayuno en columna Sample Name; valores R+45 incluyen glucemias bajas reales (36 y 44 mg/dL) que deben auditarse según contexto preanalítico.'],
    sha256Samples: [{ fileName: 'LSDS-8_CMP.csv', sha256: osdDl.sha256, bytes: osdDl.bytes }],
  });

  // 2. CRF Campaign 3 Daily Vitals
  const crfVitals = await ingestNlspStudy({
    studyId: 'CRF_C3_VITALS',
    datasetId: '7153409b-d8a3-5a23-b667-9df8a182dfdc',
    title: 'UTMB Bedrest Campaign 3 — Daily Vitals (CRF)',
    population: 'Sujetos humanos adultos en reposo prolongado 6° HDT (NASA JSC / UTMB)',
    availableVitals: ['heart_rate', 'bp_systolic', 'bp_diastolic', 'temperature'],
    timeAxis: 'PRE_TEST / IN_TEST (BR_Day) / POST_TEST con hora clínica',
    knownDefectsAndNotes: ['Cabeceras heterogéneas entre sujetos (SysBP vs Blood Pressure, systolic) normalizadas al ingestar; glucosa, sueño y ánimo no se miden en esta tabla y permanecen ausentes sin imputación.'],
    fileFilter: (n) => n.toLowerCase().endsWith('.csv'),
    parser: parseCrfDailyVitalsCsv,
  });
  allObservations.push(...crfVitals.observations);
  datasets.push(crfVitals.entry);

  // 3. MR001G Campaign 3 Tilt
  const mr001g = await ingestNlspStudy({
    studyId: 'MR001G_C3_TILT',
    datasetId: 'f4a134da-7131-55f8-a0a1-e67d56509432',
    title: 'UTMB Bedrest Campaign 3 — Orthostatic Tilt Test (MR001G)',
    population: 'Subcohorte UTMB Campaign 3 evaluada con prueba ortostática Supine vs Tilt',
    availableVitals: ['heart_rate', 'bp_systolic', 'bp_diastolic'],
    timeAxis: 'PRE_TEST / IN_TEST / POST_TEST por etapa Supine y Standing Tilt',
    knownDefectsAndNotes: ['Se prefirió Campaign 3 sobre Campaign 1 porque MR001G_Campaign_1_Tilt_HR.csv en NLSP contiene columna DBP repetida en lugar de HR. Se extrae el último minuto estable en Supine y el minuto pico en Tilt por sesión.'],
    fileFilter: (n) => n.toLowerCase().endsWith('.csv'),
    parser: parseMr001gTiltCsv,
  });
  allObservations.push(...mr001g.observations);
  datasets.push(mr001g.entry);

  // 4. MR010G Campaign 3 Clinical Lab
  const mr010g = await ingestNlspStudy({
    studyId: 'MR010G_C3_LAB',
    datasetId: 'a36f6361-3492-5590-a675-a0257edf69ac',
    title: 'UTMB Bedrest Campaign 3 — Clinical Laboratory Glucose (MR010G)',
    population: 'Sujetos UTMB Campaign 3 con química sanguínea e i-STAT',
    availableVitals: ['glucose'],
    timeAxis: 'PRE_TEST / IN_TEST / POST_TEST por fecha y fase clínica',
    knownDefectsAndNotes: ['Excluye explícitamente Glucose de Urinalysis para evitar falsos ceros/cadenas "Negative"; preserva calificadores "(L)"/"(H)" en rawFlags.'],
    fileFilter: (n) => n.toLowerCase().endsWith('.csv'),
    parser: parseMr010gLabCsv,
  });
  allObservations.push(...mr010g.observations);
  datasets.push(mr010g.entry);

  // 5. CRF Campaign 3 Symptoms
  const symptoms = await ingestNlspStudy({
    studyId: 'CRF_C3_SYMPTOMS',
    datasetId: '625b7cf3-4cef-5983-8ce1-2e33ec807168',
    title: 'UTMB Bedrest Campaign 3 — Symptom Complaints (CRF)',
    population: 'Eventos sintomáticos reales reportados durante UTMB Campaign 3',
    availableVitals: [],
    timeAxis: 'PRE_TEST / IN_TEST / POST_TEST',
    knownDefectsAndNotes: ['Tabla de síntomas clínicos sin signos vitales numéricos; útil como contexto clínico real sin inventar vitales.'],
    fileFilter: (n) => n.toLowerCase().endsWith('.csv'),
    parser: parseCrfSymptomsCsv,
  });
  allObservations.push(...symptoms.observations);
  datasets.push(symptoms.entry);

  // 6. BRSMAct Campaign 1 Actigraphy Sleep
  const brsm = await ingestNlspStudy({
    studyId: 'BRSMACT_C1_SLEEP',
    datasetId: 'e26501eb-7d7a-5012-8c8e-c5bdb3eecaf6',
    title: 'UTMB Bedrest Campaign 1 — Sleep Actigraphy (BRSMAct)',
    population: 'Sujetos adultos monitoreados con actigrafía objetiva (UTMB Campaign 1)',
    availableVitals: ['sleep_hours'],
    timeAxis: 'PRE_TEST / BEDREST / POST_TEST',
    knownDefectsAndNotes: ['Se ingesta el archivo normalizado BRSMACT_Campagin_1_Actigraphy.csv excluyendo Query_Result duplicado y ReadMe.'],
    fileFilter: (n) => n.toLowerCase() === 'brsmact_campagin_1_actigraphy.csv',
    parser: parseBrsmActigraphyCsv,
  });
  allObservations.push(...brsm.observations);
  datasets.push(brsm.entry);

  allObservations.sort((a, b) => a.cohortGroup.localeCompare(b.cohortGroup) || a.subjectId.localeCompare(b.subjectId) || a.sortOrder - b.sortOrder);

  const inventory: NasaAuditInventory = {
    generatedAt: new Date().toISOString(),
    generator: 'scripts/ingest-nasa-datasets.ts',
    policy: '100% observaciones reales de NASA OSDR y NASA NLSP; cero imputacion de indicadores ausentes ni mezcla entre estudios.',
    totalFilesProcessed: datasets.reduce((s, d) => s + d.filesProcessed, 0),
    totalRawRowsScanned: datasets.reduce((s, d) => s + d.rawRowsScanned, 0),
    totalValidObservations: allObservations.length,
    totalSkippedOrDefective: datasets.reduce((s, d) => s + d.skippedOrDefectiveRows, 0),
    datasets,
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, 'audit-inventory.json'), JSON.stringify(inventory, null, 2), 'utf8');
  await fs.writeFile(path.join(OUT_DIR, 'observations.json'), JSON.stringify(allObservations), 'utf8');

  console.log('NASA ingestion completed:', {
    datasets: datasets.length,
    files: inventory.totalFilesProcessed,
    rawRows: inventory.totalRawRowsScanned,
    validObservations: inventory.totalValidObservations,
    skipped: inventory.totalSkippedOrDefective,
  });
  for (const d of datasets) {
    console.log(` - ${d.studyId}: ${d.validObservationsExtracted} obs / ${d.uniqueSubjects} subjects (${d.filesProcessed} files)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
