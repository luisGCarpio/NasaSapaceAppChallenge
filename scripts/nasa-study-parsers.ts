import { NasaResearchObservation } from '../src/domain/nasa/nasa-types';
import {
  normalizePhaseOrder,
  parseClinicalNumber,
  parseCsv,
  pickCol,
} from './nasa-csv-utils';

export {
  parseBrsmActigraphyCsv,
  parseCrfSymptomsCsv,
  parseMr010gLabCsv,
} from './nasa-lab-sleep-parsers';

export interface ParseResult {
  observations: NasaResearchObservation[];
  rawRows: number;
  skipped: number;
  notes: string[];
}

export function parseOsd575Csv(rawText: string, fileName: string): ParseResult {
  const { rows } = parseCsv(rawText);
  const observations: NasaResearchObservation[] = [];
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const sample = pickCol(r, ['Sample Name']);
    const match = sample.match(/^(C\d+)_[^_]+_([LR][+-]?\d+)/i);
    const { value: glucose } = parseClinicalNumber(
      pickCol(r, ['glucose_value_milligram_per_deciliter'])
    );
    if (!match || glucose === undefined || glucose <= 0 || glucose > 600) {
      skipped++;
      continue;
    }
    const subj = `I4-${match[1].toUpperCase()}`;
    const phaseTag = match[2].toUpperCase();
    const { phase, relativeDay, sortOrder } = normalizePhaseOrder(
      phaseTag,
      phaseTag.replace(/^[LR][+-]?/, ''),
      0
    );
    const minRef = pickCol(r, ['glucose_range_min_milligram_per_deciliter']) || '65';
    const maxRef = pickCol(r, ['glucose_range_max_milligram_per_deciliter']) || '99';

    observations.push({
      observationId: `OSD-575:${subj}:${phaseTag}:${i}`,
      studyId: 'OSD-575',
      sourceSystem: 'NASA OSDR',
      sourceFile: fileName,
      subjectId: subj,
      cohortGroup: 'Inspiration4_OSD575',
      missionType: 'spaceflight',
      testPhase: phase,
      relativeDay,
      relativeLabel: phaseTag,
      sortOrder,
      sourceDate: phaseTag,
      vitals: { glucose },
      context: {
        activityState: 'rest',
        posture: 'unknown',
        glucoseTiming: 'unknown',
        tempMethod: 'unknown',
        confirmedRepeated: false,
        symptoms: [],
        studyNote: `Inspiration4 Serum CMP (Ref ${minRef}-${maxRef} mg/dL)`,
      },
      rawFlags: [`Ref: ${minRef}-${maxRef} mg/dL`, 'SpaceX Inspiration4'],
    });
  }
  return { observations, rawRows: rows.length, skipped, notes: [] };
}

export function parseCrfDailyVitalsCsv(rawText: string, fileName: string): ParseResult {
  const { rows } = parseCsv(rawText);
  const observations: NasaResearchObservation[] = [];
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const subjectRaw = pickCol(r, ['Subject']);
    if (!subjectRaw) { skipped++; continue; }
    const subj = `C3-${subjectRaw.replace(/[^a-zA-Z0-9]/g, '')}`;
    const dateStr = pickCol(r, ['Date', 'Test_Date']);
    const phaseRaw = pickCol(r, ['Test_Phase', 'Test Phase']) || 'UNKNOWN';
    const brDayRaw = pickCol(r, ['BR_Day']);
    const timeStr = pickCol(r, ['Vitals Time', 'Vitals collection time']) || '06:00';
    const [hh, mm] = timeStr.split(':').map((n) => Number(n) || 0);
    const { phase, relativeDay, sortOrder } = normalizePhaseOrder(phaseRaw, brDayRaw, hh * 60 + mm);

    const hr = parseClinicalNumber(pickCol(r, ['Pulse (bpm)', 'Pulse'])).value;
    const sbp = parseClinicalNumber(pickCol(r, ['SysBP (mmHg)', 'SysBP', 'Blood Pressure, systolic'])).value;
    const dbp = parseClinicalNumber(pickCol(r, ['DiaBP (mmHg)', 'DiaBP', 'Blood Pressure, diastolic'])).value;
    const temp = parseClinicalNumber(
      pickCol(r, ['Body Temp (Celsius)', 'Body Temp', 'Temperature, body (Celsius)'])
    ).value;

    const vitals: NasaResearchObservation['vitals'] = {};
    if (hr !== undefined && hr >= 30 && hr <= 220) vitals.heart_rate = Math.round(hr);
    if (
      sbp !== undefined && dbp !== undefined &&
      sbp >= 65 && sbp <= 250 && dbp >= 35 && dbp <= 160 && dbp <= sbp - 10
    ) {
      vitals.bp_systolic = Math.round(sbp);
      vitals.bp_diastolic = Math.round(dbp);
    }
    if (temp !== undefined && temp >= 34 && temp <= 42.5) {
      vitals.temperature = Number(temp.toFixed(1));
    }

    if (Object.keys(vitals).length === 0) { skipped++; continue; }

    const issues = pickCol(r, ['Issues Reported']);
    const comment = pickCol(r, ['Comment', 'Comments, vitals']);
    const rawFlags: string[] = [];
    if (issues && issues.toLowerCase() === 'yes') rawFlags.push('Issues Reported: Yes');
    if (comment && !/^na$/i.test(comment)) rawFlags.push(`Note: ${comment.slice(0, 70)}`);

    observations.push({
      observationId: `CRF_C3_VITALS:${subj}:${phase}:${relativeDay}:${i}`,
      studyId: 'CRF_C3_VITALS',
      sourceSystem: 'NASA NLSP',
      sourceFile: fileName,
      subjectId: subj,
      cohortGroup: 'UTMB_Campaign_3',
      missionType: 'bedrest_analog',
      testPhase: phase,
      relativeDay,
      relativeLabel: `${phase} Day ${relativeDay} (${timeStr})`,
      sortOrder,
      sourceDate: dateStr,
      vitals,
      context: {
        activityState: 'rest',
        posture: phase === 'IN_TEST' ? 'supine' : 'seated',
        glucoseTiming: 'unknown',
        tempMethod: 'oral',
        confirmedRepeated: false,
        symptoms: [],
        studyNote: `UTMB Campaign 3 Daily Vitals (${phase})`,
      },
      rawFlags,
    });
  }
  return { observations, rawRows: rows.length, skipped, notes: [] };
}

export function parseMr001gTiltCsv(rawText: string, fileName: string): ParseResult {
  const { rows } = parseCsv(rawText);
  const observations: NasaResearchObservation[] = [];
  let skipped = 0;

  type StageRow = {
    row: Record<string, string>;
    minute: number;
    hr: number;
    sbp: number;
    dbp: number;
    stage: 'Supine' | 'Tilt';
  };
  const stageRows: StageRow[] = [];

  for (const r of rows) {
    const stageRaw = pickCol(r, ['Stage']);
    const stage = /tilt/i.test(stageRaw) ? 'Tilt' : /supine/i.test(stageRaw) ? 'Supine' : null;
    const hr = parseClinicalNumber(pickCol(r, ['HR', 'HR (Dinamap)', 'AVE HR'])).value;
    const sbp = parseClinicalNumber(pickCol(r, ['SBP'])).value;
    const dbp = parseClinicalNumber(pickCol(r, ['DBP'])).value;
    const minute = parseClinicalNumber(pickCol(r, ['Minute', 'Min'])).value ?? stageRows.length + 1;
    if (
      !stage || hr === undefined || sbp === undefined || dbp === undefined ||
      hr < 30 || hr > 220 || sbp < 50 || sbp > 240 || dbp < 30 || dbp > 150 || dbp > sbp - 10
    ) {
      skipped++;
      continue;
    }
    stageRows.push({ row: r, minute, hr: Math.round(hr), sbp: Math.round(sbp), dbp: Math.round(dbp), stage });
  }

  const supineList = stageRows.filter((s) => s.stage === 'Supine');
  const tiltList = stageRows.filter((s) => s.stage === 'Tilt');
  const picks: StageRow[] = [];
  if (supineList.length > 0) picks.push(supineList[supineList.length - 1]);
  if (tiltList.length > 0) {
    picks.push([...tiltList].sort((a, b) => b.hr - a.hr || a.sbp - b.sbp)[0]);
  }

  for (const pick of picks) {
    const subjNum = pickCol(pick.row, ['Subject']) || fileName.split('_')[4] || 'UNK';
    const subj = `C3-${subjNum.replace(/[^a-zA-Z0-9]/g, '')}`;
    const phaseRaw = pickCol(pick.row, ['Test_Phase']) || 'UNKNOWN';
    const brDayRaw = pickCol(pick.row, ['BR_Day']) || '0';
    const dateStr = pickCol(pick.row, ['Date']);
    const timeOffset = pick.stage === 'Supine' ? 800 + pick.minute : 830 + pick.minute;
    const { phase, relativeDay, sortOrder } = normalizePhaseOrder(phaseRaw, brDayRaw, timeOffset);

    observations.push({
      observationId: `MR001G_C3_TILT:${subj}:${phase}:${relativeDay}:${pick.stage}`,
      studyId: 'MR001G_C3_TILT',
      sourceSystem: 'NASA NLSP',
      sourceFile: fileName,
      subjectId: subj,
      cohortGroup: 'UTMB_Campaign_3',
      missionType: 'bedrest_analog',
      testPhase: phase,
      relativeDay,
      relativeLabel: `${phase} BR ${relativeDay} ${pick.stage} (Min ${pick.minute})`,
      sortOrder,
      sourceDate: dateStr,
      vitals: { heart_rate: pick.hr, bp_systolic: pick.sbp, bp_diastolic: pick.dbp },
      context: {
        activityState: pick.stage === 'Tilt' ? 'orthostatic_tilt' : 'rest',
        posture: pick.stage === 'Tilt' ? 'standing_tilt' : 'supine',
        glucoseTiming: 'unknown',
        tempMethod: 'unknown',
        confirmedRepeated: true,
        symptoms: [],
        studyNote: `MR001G Orthostatic Tilt ${pick.stage} (Min ${pick.minute} of ${rows.length})`,
      },
      rawFlags: [`Tilt Stage: ${pick.stage}`, `Minute: ${pick.minute}`],
    });
  }

  return { observations, rawRows: rows.length, skipped, notes: [] };
}
