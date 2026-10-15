import type { OrsonNormalizedPond, OrsonNormalizedRecord, OrsonPromptPackage } from './types';

export interface OrsonResponsePreview { title: string; text: string }
export interface OrsonPreviewAnalysisInput {
  normalizedPonds: OrsonNormalizedPond[];
  promptPackage: Pick<OrsonPromptPackage, 'userMessage' | 'questionFocus' | 'exactRecordAnswer'>;
}

type Reading = {
  key: keyof OrsonNormalizedRecord; field: string; group: string;
  en: string; id: string; unit: string; period?: 'morning' | 'evening';
};
const READINGS: Reading[] = [
  { key: 'doMorning', field: 'do_morning_mg_l', group: 'dissolved_oxygen', en: 'Morning DO', id: 'DO Pagi', unit: 'mg/L', period: 'morning' },
  { key: 'doEvening', field: 'do_evening_mg_l', group: 'dissolved_oxygen', en: 'Evening DO', id: 'DO Sore', unit: 'mg/L', period: 'evening' },
  { key: 'phMorning', field: 'ph_morning', group: 'ph', en: 'Morning pH', id: 'pH Pagi', unit: '', period: 'morning' },
  { key: 'phEvening', field: 'ph_evening', group: 'ph', en: 'Evening pH', id: 'pH Sore', unit: '', period: 'evening' },
  { key: 'salinityPpt', field: 'salinity_ppt', group: 'salinity', en: 'Salinity', id: 'Salinitas', unit: 'ppt' },
  { key: 'mbwG', field: 'mbw_g', group: 'mbw', en: 'MBW', id: 'MBW', unit: 'g' },
  { key: 'temperatureMorningC', field: 'temperature_c', group: 'temperature', en: 'Morning Temperature', id: 'Suhu Pagi', unit: '°C', period: 'morning' },
  { key: 'temperatureEveningC', field: 'temperature_c', group: 'temperature', en: 'Evening Temperature', id: 'Suhu Sore', unit: '°C', period: 'evening' },
  { key: 'temperatureC', field: 'temperature_c', group: 'temperature', en: 'Temperature', id: 'Suhu', unit: '°C' },
  { key: 'transparencyMorningCm', field: 'transparency_cm', group: 'plankton_transparency', en: 'Morning Transparency', id: 'Kecerahan Pagi', unit: 'cm', period: 'morning' },
  { key: 'transparencyEveningCm', field: 'transparency_cm', group: 'plankton_transparency', en: 'Evening Transparency', id: 'Kecerahan Sore', unit: 'cm', period: 'evening' },
  { key: 'transparencyCm', field: 'transparency_cm', group: 'plankton_transparency', en: 'Transparency', id: 'Kecerahan', unit: 'cm' },
];
const validDate = (value: string | null): value is string => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const relativeDate = /\b(?:yesterday|today|tomorrow|kemarin|besok|hari ini|recent(?:ly)?|earlier|terakhir|since|sejak)\b|\b(?:last|past|previous)\s+(?:\d+\s+)?(?:days?|weeks?|months?)\b|\b(?:minggu|bulan)\s+lalu\b|\b(?:between|range|dari)\s+.+\s+(?:and|to|sampai)\b/i;
const unsupported = /\b(?:nitrogen|ammonia|amonia|nh3|nh4|tan|nitrite|nitrit|nitrate|nitrat|alkalinity|alkalinitas|mortality|kematian|deaths?|dead|mati|adg|average daily gain|fcr|feed conversion|biomass|biomasa|population|populasi|survival|sr|dose|doses|dosis|treatment|obat|probiotik|chemical|kimia|kaporit|lime|kapur)\b/i;

/** Saved observations only. This is progress copy, never an AI answer or diagnosis. */
export function buildOrsonResponsePreview(analysis: OrsonPreviewAnalysisInput, explicitAction = false): OrsonResponsePreview | null {
  const { questionFocus: focus, userMessage: question, exactRecordAnswer } = analysis.promptPackage;
  if (explicitAction || exactRecordAnswer || focus.route !== 'farm_analysis' || focus.suppressPondAnalysis
    || focus.containsUserReportedMeasurements || focus.isComparison || (focus.comparedPondNames?.length ?? 0) > 1
    || ['general', 'comparison'].includes(focus.intent) || focus.answerContract.routeConfidence !== 'high'
    || !focus.answerContract.needsFarmData || unsupported.test(question)
    || /\b(?:compare|vs|versus|bandingkan)\b/i.test(question)) return null;

  const ponds = analysis.normalizedPonds;
  const matches = focus.focusedPondId
    ? ponds.filter(pond => pond.id === focus.focusedPondId)
    : focus.focusedPondName
      ? ponds.filter(pond => pond.pondName.toLowerCase() === focus.focusedPondName!.toLowerCase()) : ponds;
  if (matches.length !== 1) return null;
  const pond = matches[0];
  if (focus.focusedPondName && pond.pondName.toLowerCase() !== focus.focusedPondName.toLowerCase()) return null;
  const mentioned = [...question.matchAll(/\b(?:pond|kolam|tambak)\s+([\w-]+)\b/gi)].map(match => match[1].toLowerCase());
  const names = [pond.id?.toLowerCase(), pond.pondName.toLowerCase(), pond.pondName.toLowerCase().replace(/^(?:pond|kolam|tambak)\s*/i, '')];
  if (mentioned.some(name => !names.includes(name))) return null;
  if (!validDate(pond.asOfDate)) return null;
  const dates = focus.requestedDates;
  if (dates.some(date => !validDate(date) || date > pond.asOfDate) || dates.length > 2
    || (relativeDate.test(question) && !dates.length)) return null;

  const fields = focus.requestedFields;
  if (fields.some(field => !READINGS.some(reading => reading.field === field))) return null;
  const alias: Record<string, string> = { do: 'dissolved_oxygen', transparency: 'plankton_transparency' };
  let group = focus.requestedParameter ? alias[focus.requestedParameter] || focus.requestedParameter : null;
  if (!group && !fields.length) group = focus.intent === 'growth' ? 'mbw' : null;
  if (!group && !fields.length) return null;
  let candidates = READINGS.filter(reading => (!group || reading.group === group) && (!fields.length || fields.includes(reading.field)));
  if (!candidates.length) return null;
  const morning = /\b(?:morning|pagi)\b/i.test(question) || /\bAM\b/.test(question);
  const evening = /\b(?:evening|afternoon|sore|malam)\b/i.test(question) || /\bPM\b/.test(question);
  const fieldPeriods = new Set(candidates.map(reading => reading.period).filter(Boolean));
  const period = morning !== evening ? (morning ? 'morning' : 'evening')
    : fields.length && fieldPeriods.size === 1 ? [...fieldPeriods][0] : null;
  if (period) candidates = candidates.filter(reading => reading.period === period);
  if (!candidates.length) return null;

  const id = /\b(?:dan|atau|tidak|saya|kami|udang|tambak|kolam|air|pakan|suhu|kecerahan|berapa|bagaimana|tolong|mohon|catatan)\b/i.test(question);
  const lines: string[] = [];
  const records = pond.records.filter(record => !record.isBaselineEstimate && record.source !== 'midcycle_onboarding'
    && validDate(record.date) && record.date <= pond.asOfDate && (!dates.length || dates.includes(record.date)))
    .sort((a, b) => b.date!.localeCompare(a.date!) || (b.timestampMs ?? 0) - (a.timestampMs ?? 0));
  for (const record of records) {
    for (const reading of candidates) {
      if (!record.kinds.includes(reading.group === 'mbw' ? 'sampling' : 'water_quality')) continue;
      const value = record[reading.key];
      if (!finite(value)) continue;
      // Generic normalization fields can copy a session reading. Show it only once.
      if (!reading.period && ['temperature', 'plankton_transparency'].includes(reading.group)
        && candidates.some(other => other.group === reading.group && other.period && finite(record[other.key]))) continue;
      lines.push(`- ${record.date}: ${id ? reading.id : reading.en} ${value}${reading.unit ? ` ${reading.unit}` : ''}`);
      if (lines.length === 2) break;
    }
    if (lines.length === 2) break;
  }
  if (!lines.length) return null;
  const name = pond.pondName.replace(/[\r\n]/g, ' ');
  return {
    title: id ? 'Pratinjau data tersimpan' : 'Saved-record preview',
    text: `${id ? 'Rekaman tersimpan untuk' : 'Saved records for'} ${name}:\n${lines.join('\n')}\n${id
      ? 'Orson masih memeriksa detail untuk jawaban lengkap.' : 'Orson is still checking details for your answer.'}`,
  };
}
