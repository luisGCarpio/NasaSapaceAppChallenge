export type EvidenceTier =
  | 'clinical_standard'
  | 'aerospace_operational'
  | 'physiological_heuristic';

export interface VerifiedSourceRef {
  id: string;
  organization: string;
  title: string;
  sectionNote: string;
  url: string;
  tier: EvidenceTier;
  lastReviewed: string;
}

export interface RuleAuditTrace {
  ruleId: string;
  title: string;
  inputsUsed: string[];
  thresholdApplied: string;
  baselineComparison: string | null;
  exclusions: string;
  followUpWindow: string;
  evidenceTier: EvidenceTier;
  sourceRefId: string;
  sourceTitle: string;
  sourceUrl: string;
}

export const VERIFIED_SOURCES: Record<string, VerifiedSourceRef> = {
  aha_bp: {
    id: 'aha_bp',
    organization: 'American Heart Association (AHA)',
    title: 'Understanding Blood Pressure Readings',
    sectionNote: 'Normal <120/80, Elevada 120-129/<80, HTA Est. 1 130-139/80-89, Crisis >180/>120 mmHg',
    url: 'https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings',
    tier: 'clinical_standard',
    lastReviewed: '2026-11-14',
  },
  niddk_glucose: {
    id: 'niddk_glucose',
    organization: 'NIDDK (NIH)',
    title: 'Tests & Diagnosis for Diabetes and Blood Glucose',
    sectionNote: 'Ayunas normal <100 mg/dL, aleatoria y postprandial requieren contexto de ingesta; hipoglucemia clínica <70 mg/dL',
    url: 'https://www.niddk.nih.gov/health-information/diabetes/overview/tests-diagnosis',
    tier: 'clinical_standard',
    lastReviewed: '2026-11-14',
  },
  medline_fever: {
    id: 'medline_fever',
    organization: 'MedlinePlus (NLM / NIH)',
    title: 'Fever & Body Temperature Measurement',
    sectionNote: 'Variabilidad por método (oral vs timpánico vs central) y ciclo circadiano; alerta febril >=38.0 °C',
    url: 'https://medlineplus.gov/fever.html',
    tier: 'clinical_standard',
    lastReviewed: '2026-11-14',
  },
  nasa_orthostatic: {
    id: 'nasa_orthostatic',
    organization: 'NASA Human Research Program (HRP)',
    title: 'Risk of Orthostatic Intolerance During Reexposure to Gravity',
    sectionNote: 'Evaluación diferenciada supino vs bipedestación/tilt tras desacondicionamiento o hipovolemia',
    url: 'https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=95',
    tier: 'aerospace_operational',
    lastReviewed: '2026-11-14',
  },
  nasa_sleep: {
    id: 'nasa_sleep',
    organization: 'NASA Human Research Program (HRP)',
    title: 'Risk of Performance Decrements from Sleep Loss & Circadian Desynchronization',
    sectionNote: 'Restricción <6 h/noche o desalineación circadiana deteriora atención y toma de decisiones en misión',
    url: 'https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=88',
    tier: 'aerospace_operational',
    lastReviewed: '2026-11-14',
  },
  nasa_standards: {
    id: 'nasa_standards',
    organization: 'NASA Office of the Chief Health and Medical Officer (OCHMO)',
    title: 'NASA-STD-3001 Vol. 1 & Crew Health Standards',
    sectionNote: 'Marco de vigilancia biomédica, monitoreo de signos vitales y protección de tripulación',
    url: 'https://www.nasa.gov/hhp/standards/',
    tier: 'aerospace_operational',
    lastReviewed: '2026-11-14',
  },
  csa_health: {
    id: 'csa_health',
    organization: 'Canadian Space Agency (CSA)',
    title: 'Astronaut Health & Medical Operations',
    sectionNote: 'Operaciones médicas en vuelo, autochequeos diarios y reporte contextualizado a cirujano de vuelo',
    url: 'https://www.asc-csa.gc.ca/eng/astronauts/living-in-space/astronaut-health.asp',
    tier: 'aerospace_operational',
    lastReviewed: '2026-11-14',
  },
};

export function makeRuleTrace(opts: {
  ruleId: string;
  title: string;
  inputsUsed: string[];
  thresholdApplied: string;
  baselineComparison?: string | null;
  exclusions: string;
  followUpWindow: string;
  sourceKey: keyof typeof VERIFIED_SOURCES;
}): RuleAuditTrace {
  const src = VERIFIED_SOURCES[opts.sourceKey];
  return {
    ruleId: opts.ruleId,
    title: opts.title,
    inputsUsed: opts.inputsUsed,
    thresholdApplied: opts.thresholdApplied,
    baselineComparison: opts.baselineComparison ?? null,
    exclusions: opts.exclusions,
    followUpWindow: opts.followUpWindow,
    evidenceTier: src.tier,
    sourceRefId: src.id,
    sourceTitle: src.title,
    sourceUrl: src.url,
  };
}
