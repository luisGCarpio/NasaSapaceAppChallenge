export type NasaStudyId =
  | 'OSD-575'
  | 'CRF_C3_VITALS'
  | 'MR001G_C3_TILT'
  | 'MR010G_C3_LAB'
  | 'CRF_C3_SYMPTOMS'
  | 'BRSMACT_C1_SLEEP';

export type ActivityState = 'rest' | 'post_exercise' | 'eva' | 'orthostatic_tilt';
export type PostureState = 'supine' | 'seated' | 'standing_tilt' | 'unknown';
export type GlucoseTiming = 'fasting' | 'post_meal' | 'random' | 'unknown';
export type TempMethod = 'oral' | 'tympanic' | 'core_sensor' | 'unknown';

export interface ObservationContext {
  activityState: ActivityState;
  posture: PostureState;
  glucoseTiming: GlucoseTiming;
  tempMethod: TempMethod;
  confirmedRepeated: boolean;
  symptoms: string[];
  studyNote?: string;
}

export interface PartialVitalFields {
  heart_rate?: number | null;
  bp_systolic?: number | null;
  bp_diastolic?: number | null;
  temperature?: number | null;
  glucose?: number | null;
  sleep_hours?: number | null;
  mood?: 'excelente' | 'bien' | 'cansado' | 'estresado' | 'agotado' | null;
}

export interface NasaResearchObservation {
  observationId: string;
  studyId: NasaStudyId;
  sourceSystem: 'NASA OSDR' | 'NASA NLSP';
  sourceFile: string;
  subjectId: string;
  cohortGroup: string;
  missionType: 'spaceflight' | 'bedrest_analog';
  testPhase: string;
  relativeDay: number;
  relativeLabel: string;
  sortOrder: number;
  sourceDate: string;
  vitals: PartialVitalFields;
  context: ObservationContext;
  rawFlags: string[];
}

export interface NasaFileChecksum {
  fileName: string;
  sha256: string;
  bytes: number;
}

export interface NasaDatasetInventoryEntry {
  studyId: NasaStudyId;
  officialId: string;
  title: string;
  sourceSystem: 'NASA OSDR' | 'NASA NLSP';
  sourceUrl: string;
  population: string;
  filesProcessed: number;
  rawRowsScanned: number;
  validObservationsExtracted: number;
  skippedOrDefectiveRows: number;
  uniqueSubjects: number;
  subjectIds: string[];
  availableVitals: string[];
  timeAxis: string;
  knownDefectsAndNotes: string[];
  sha256Samples: NasaFileChecksum[];
}

export interface NasaAuditInventory {
  generatedAt: string;
  generator: string;
  policy: string;
  totalFilesProcessed: number;
  totalRawRowsScanned: number;
  totalValidObservations: number;
  totalSkippedOrDefective: number;
  datasets: NasaDatasetInventoryEntry[];
}
