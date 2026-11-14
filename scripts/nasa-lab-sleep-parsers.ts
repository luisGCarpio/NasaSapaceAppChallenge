import { NasaResearchObservation } from '../src/domain/nasa/nasa-types';
import {
  normalizePhaseOrder,
  parseClinicalNumber,
  parseCsv,
  parseDurationHours,
  pickCol,
} from './nasa-csv-utils';
import type { ParseResult } from './nasa-study-parsers';

export function parseMr010gLabCsv(rawText: string, fileName: string): ParseResult {
  const { rows } = parseCsv(rawText);
  const observations: NasaResearchObservation[] = [];
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const param = pickCol(r, ['ParameterName', 'Parameter Name']);
    const group = pickCol(r, ['Group']);
    if (!param.toLowerCase().includes('glucose') || /urinalysis/i.test(group)) continue;

    const { value: glucose, flag } = parseClinicalNumber(pickCol(r, ['Measured_Value']));
    if (glucose === undefined || glucose < 20 || glucose > 600) { skipped++; continue; }

    const subjRaw = pickCol(r, ['Subject']);
    const subj = `C3-${subjRaw.replace(/[^a-zA-Z0-9]/g, '')}`;
    const phaseRaw = pickCol(r, ['Test_Phase']) || 'UNKNOWN';
    const brDayRaw = pickCol(r, ['BR_Day']) || '0';
    const { phase, relativeDay, sortOrder } = normalizePhaseOrder(phaseRaw, brDayRaw, 420);

    observations.push({
      observationId: `MR010G_C3_LAB:${subj}:${phase}:${relativeDay}:${i}`,
      studyId: 'MR010G_C3_LAB',
      sourceSystem: 'NASA NLSP',
      sourceFile: fileName,
      subjectId: subj,
      cohortGroup: 'UTMB_Campaign_3',
      missionType: 'bedrest_analog',
      testPhase: phase,
      relativeDay,
      relativeLabel: `${phase} Day ${relativeDay} (${group})`,
      sortOrder,
      sourceDate: pickCol(r, ['Date']),
      vitals: { glucose },
      context: {
        activityState: 'rest',
        posture: 'unknown',
        glucoseTiming: /chemistry/i.test(group) ? 'fasting' : 'unknown',
        tempMethod: 'unknown',
        confirmedRepeated: false,
        symptoms: [],
        studyNote: `MR010G Clinical Lab (${group}; Normal ${pickCol(r, ['Normal_Range'])} mg/dL)`,
      },
      rawFlags: [group, ...(flag ? [flag] : [])],
    });
  }
  return { observations, rawRows: rows.length, skipped, notes: [] };
}

export function parseBrsmActigraphyCsv(rawText: string, fileName: string): ParseResult {
  const { rows } = parseCsv(rawText);
  const observations: NasaResearchObservation[] = [];
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const subj = pickCol(r, ['Subject']);
    const duration = parseDurationHours(pickCol(r, ['Sleep Duration (hours)', 'Sleep duration']));
    if (!subj || duration === undefined) { skipped++; continue; }
    const eff = parseClinicalNumber(pickCol(r, ['Sleep Efficiency (%)', 'Sleep efficiency'])).value;
    const phaseRaw = pickCol(r, ['Test_Phase']) || 'UNKNOWN';
    const brDayRaw = pickCol(r, ['BR_Day']) || '0';
    const { phase, relativeDay, sortOrder } = normalizePhaseOrder(phaseRaw, brDayRaw, 360);

    observations.push({
      observationId: `BRSMACT_C1_SLEEP:${subj}:${phase}:${relativeDay}:${i}`,
      studyId: 'BRSMACT_C1_SLEEP',
      sourceSystem: 'NASA NLSP',
      sourceFile: fileName,
      subjectId: subj,
      cohortGroup: 'UTMB_Campaign_1',
      missionType: 'bedrest_analog',
      testPhase: phase,
      relativeDay,
      relativeLabel: `${phase} BR ${relativeDay}`,
      sortOrder,
      sourceDate: pickCol(r, ['Date']),
      vitals: { sleep_hours: duration },
      context: {
        activityState: 'rest',
        posture: 'supine',
        glucoseTiming: 'unknown',
        tempMethod: 'unknown',
        confirmedRepeated: false,
        symptoms: [],
        studyNote: `Actigraphy objective sleep${eff !== undefined ? ` (${eff}% eff.)` : ''}`,
      },
      rawFlags: eff !== undefined ? [`Sleep Efficiency: ${eff}%`] : [],
    });
  }
  return { observations, rawRows: rows.length, skipped, notes: [] };
}

export function parseCrfSymptomsCsv(rawText: string, fileName: string): ParseResult {
  const { rows } = parseCsv(rawText);
  const observations: NasaResearchObservation[] = [];
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const subjRaw = pickCol(r, ['Subject']);
    const symptom = pickCol(r, ['Symptom', 'Symptom/Complaint']);
    if (!subjRaw || !symptom || /^na$/i.test(symptom)) {
      skipped++;
      continue;
    }
    const subj = `C3-${subjRaw.replace(/[^a-zA-Z0-9]/g, '')}`;
    const phaseRaw = pickCol(r, ['Test_Phase']) || 'UNKNOWN';
    const brDayRaw = pickCol(r, ['BR_Day']) || '0';
    const pain = pickCol(r, ['Pain_Score']);
    const action = pickCol(r, ['Action', 'Action_Taken']);
    const { phase, relativeDay, sortOrder } = normalizePhaseOrder(phaseRaw, brDayRaw, 720);

    observations.push({
      observationId: `CRF_C3_SYMPTOMS:${subj}:${phase}:${relativeDay}:${i}`,
      studyId: 'CRF_C3_SYMPTOMS',
      sourceSystem: 'NASA NLSP',
      sourceFile: fileName,
      subjectId: subj,
      cohortGroup: 'UTMB_Campaign_3',
      missionType: 'bedrest_analog',
      testPhase: phase,
      relativeDay,
      relativeLabel: `${phase} Day ${relativeDay} (Symptom)`,
      sortOrder,
      sourceDate: pickCol(r, ['Date']),
      vitals: {},
      context: {
        activityState: 'rest',
        posture: phase === 'IN_TEST' ? 'supine' : 'unknown',
        glucoseTiming: 'unknown',
        tempMethod: 'unknown',
        confirmedRepeated: false,
        symptoms: [symptom.slice(0, 80)],
        studyNote: `CRF Symptom Complaint${pain && !/^na$/i.test(pain) ? ` (Pain: ${pain})` : ''}`,
      },
      rawFlags: action && !/^na$/i.test(action) ? [`Action: ${action.slice(0, 60)}`] : [],
    });
  }
  return { observations, rawRows: rows.length, skipped, notes: [] };
}
