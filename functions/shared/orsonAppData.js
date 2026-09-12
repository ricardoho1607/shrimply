'use strict';
const { hasUserPermission } = require('./permissions');
const DATASETS = Object.freeze({
  ponds: 'viewFarm', physicalPonds: 'viewFarm', blocks: 'viewFarm', cycles: 'viewFarm',
  feeds: 'viewFarm', additives: 'viewFarm', harvestRecords: 'viewFarm', labReports: 'viewFarm',
  expenses: 'viewFinance', revenues: 'viewFinance', assets: 'viewAssets',
});
const validId = value => typeof value === 'string' && value.length > 0 && value.length <= 160 && !value.includes('/') && !['.', '..'].includes(value);
const privateField = /password|secret|token|credential|api.?key|email|phone|address|latitude|longitude|download.?url|file.?url|attachment|ownerId|createdBy|updatedBy|userId|bank|accountNumber/i;
const financeField = /cost|price|profit|revenue|expense|payment|salary|wage|financial|billing|invoice|purchase|depreciation/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const validDateKey = value => {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
const cleanRecord = (value, canViewFinance) => {
  if (value === null || value === undefined) return value ?? null;
  if (typeof value?.toDate === 'function') return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(item => cleanRecord(item, canViewFinance));
  if (typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !privateField.test(key) && (canViewFinance || !financeField.test(key)))
    .map(([key, item]) => [key, cleanRecord(item, canViewFinance)]));
};
const recordTool = {
  type: 'function', name: 'read_app_records',
  description: 'Read saved records from the current Shrimply company. Ponds include samplings, feeding and water-quality histories. List a dataset to discover IDs and fields; then use documentId and field for full historical arrays. Pagination is explicit: never treat a partial page as the entire farm or a complete financial total. No writes.',
  parameters: {
    type: 'object', properties: {
      dataset: { type: 'string', enum: Object.keys(DATASETS) },
      documentId: { type: 'string', description: 'Optional exact document ID from an earlier lookup.' },
      field: { type: 'string', description: 'Optional top-level field, such as samplings, to read from a document.' },
      after: { type: 'string', description: 'Next-page document cursor returned by a list lookup.' },
      offset: { type: 'integer', minimum: 0, description: 'Array offset for a document field.' },
    }, required: ['dataset'], additionalProperties: false,
  },
};
const timelineTool = {
  type: 'function', name: 'read_pond_timeline',
  description: 'Read a canonical, date-aligned timeline for one authorized pond. Returns recorded mortality, feed, MBW, oxygen, pH, salinity, temperature and operational events plus chart-ready line series. Missing dates remain missing, never zero. Use for sudden changes and historical pond investigations.',
  parameters: {
    type: 'object', properties: {
      pondId: { type: 'string', description: 'Exact pond ID from ORSON context or a ponds list lookup.' },
      days: { type: 'integer', minimum: 7, maximum: 90, description: 'Calendar lookback. Defaults to 30 days.' },
      endDate: { type: 'string', description: 'Optional inclusive farm date in YYYY-MM-DD format.' },
    }, required: ['pondId'], additionalProperties: false,
  },
};

const finite = value => {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) return null;
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};
const round = (value, decimals = 3) => {
  const number = finite(value);
  if (number === null) return null;
  const factor = 10 ** decimals;
  return Math.round((number + Number.EPSILON) * factor) / factor;
};
const dateKey = value => {
  if (typeof value === 'string' && validDateKey(value.slice(0, 10))) return value.slice(0, 10);
  if (typeof value?.toDate === 'function') return value.toDate().toISOString().slice(0, 10);
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  return null;
};
const farmToday = timeZone => {
  try {
    const parts = new Intl.DateTimeFormat('en', { timeZone: timeZone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const part = type => parts.find(item => item.type === type)?.value;
    const result = `${part('year')}-${part('month')}-${part('day')}`;
    return ISO_DATE.test(result) ? result : new Date().toISOString().slice(0, 10);
  } catch (_) { return new Date().toISOString().slice(0, 10); }
};
const shiftDate = (value, days) => new Date(Date.parse(`${value}T00:00:00.000Z`) + days * DAY_MS).toISOString().slice(0, 10);
const belongsToCurrentCycle = (record, pond) => {
  const current = [pond.pondCycleId, pond.cycleId].filter(value => typeof value === 'string' && value);
  if (!current.length) return true;
  const recorded = [record?.pondCycleId, record?.cycleId].filter(value => typeof value === 'string' && value);
  return !recorded.length || recorded.some(value => current.includes(value));
};
const buildPondTimeline = (pondId, pond, args, timeZone) => {
  const endDate = args.endDate || farmToday(timeZone);
  const days = args.days || 30;
  const startDate = shiftDate(endDate, -(days - 1));
  const timeline = new Map();
  const ensureDay = date => {
    if (!timeline.has(date)) timeline.set(date, { date, mortalityCount: null, legacyMortalityCount: null, dedicatedMortalityCount: null, feedKg: null, feedingResponse: null, mbwG: null, doMorningMgL: null, doEveningMgL: null, doMinimumMgL: null, phMorning: null, phEvening: null, phSwing: null, salinityPpt: null, temperatureC: null, transparencyCm: null, events: [] });
    return timeline.get(date);
  };
  const setNumber = (day, key, value, decimals = 3) => {
    const parsed = round(value, decimals);
    if (parsed !== null) day[key] = parsed;
  };
  for (const record of (Array.isArray(pond.samplings) ? pond.samplings : [])) {
    const date = dateKey(record?.date);
    if (!date || date < startDate || date > endDate || !belongsToCurrentCycle(record, pond)) continue;
    const day = ensureDay(date);
    const mbw = finite(record.mbw ?? record.abw);
    if (mbw !== null && mbw > 0) day.mbwG = round(mbw);
    const legacyMortality = finite(record.mortality);
    if (legacyMortality !== null && legacyMortality > 0) day.legacyMortalityCount = round((day.legacyMortalityCount ?? 0) + legacyMortality, 0);
    const feed = finite(record.feedData?.totalDailyFeed ?? record.feed);
    if (feed !== null && feed > 0) day.feedKg = Math.max(day.feedKg ?? 0, round(feed));
    if (typeof record.feedData?.feedingResponse === 'string' && record.feedData.feedingResponse.trim()) day.feedingResponse = record.feedData.feedingResponse.trim().slice(0, 80);
    setNumber(day, 'doMorningMgL', record.doMorning);
    setNumber(day, 'doEveningMgL', record.doEvening);
    const oxygen = [day.doMorningMgL, day.doEveningMgL].filter(value => value !== null);
    day.doMinimumMgL = oxygen.length ? Math.min(...oxygen) : null;
    setNumber(day, 'phMorning', record.phMorning);
    setNumber(day, 'phEvening', record.phEvening);
    day.phSwing = day.phMorning !== null && day.phEvening !== null ? round(Math.abs(day.phEvening - day.phMorning)) : null;
    setNumber(day, 'salinityPpt', record.salinity);
    setNumber(day, 'temperatureC', record.temperature ?? record.temperatureMorning ?? record.temperatureEvening);
    setNumber(day, 'transparencyCm', record.transparency ?? record.transparencyMorning ?? record.transparencyEvening);
    if (record.weatherEvent) day.events.push(`Weather: ${String(record.weatherEvent).slice(0, 80)}`);
    if (record.waterExchangePercent !== undefined && String(record.waterExchangePercent).trim()) day.events.push(`Water exchange: ${String(record.waterExchangePercent).slice(0, 40)}%`);
    if (record.sludgeLoad) day.events.push(`Sludge load: ${String(record.sludgeLoad).slice(0, 40)}`);
    if (record.surfaceScum === true) day.events.push('Surface scum observed');
    if (record.shrimpBehaviour) day.events.push(`Shrimp behaviour: ${String(record.shrimpBehaviour).slice(0, 80)}`);
    if (record.harvestData) day.events.push('Harvest recorded');
  }
  for (const record of (Array.isArray(pond.mortalityRecords) ? pond.mortalityRecords : [])) {
    const date = dateKey(record?.date);
    if (!date || date < startDate || date > endDate || !belongsToCurrentCycle(record, pond)) continue;
    const count = finite(record.count);
    if (count === null || (count <= 0 && record.observationType !== 'none_observed')) continue;
    const day = ensureDay(date);
    day.dedicatedMortalityCount = round((day.dedicatedMortalityCount ?? 0) + Math.max(0, count), 0);
    if (record.observationType) day.events.push(`Mortality observation: ${String(record.observationType).slice(0, 80)}`);
  }
  const rows = [...timeline.values()].sort((a, b) => a.date.localeCompare(b.date)).map(day => {
    const { legacyMortalityCount, dedicatedMortalityCount, ...publicDay } = day;
    return {
      ...publicDay,
      mortalityCount: dedicatedMortalityCount ?? legacyMortalityCount,
      events: [...new Set(day.events)],
    };
  });
  const series = key => rows.filter(day => day[key] !== null).map(day => ({ date: day.date, value: day[key] }));
  return {
    status: 'ok',
    pond: { id: pondId, name: String(pond.pondName || pond.name || pondId).slice(0, 160), pondCycleId: pond.pondCycleId || null, cycleId: pond.cycleId || null },
    coverage: { startDate, endDate, requestedDays: days, recordedDays: rows.length, missingDatesAreUnknown: true },
    timeline: rows,
    lineSeries: {
      mortalityCount: series('mortalityCount'),
      doMinimumMgL: series('doMinimumMgL'),
      phSwing: series('phSwing'),
      feedKg: series('feedKg'),
      mbwG: series('mbwG'),
    },
  };
};
const createOrsonAppDataReader = ({ db, company, user, uid, companyId }) => {
  const allowed = permission => hasUserPermission({ company: { ...company, id: companyId }, user, uid, permission });
  const canViewFinance = allowed('viewFinance');
  const execute = async (name, args) => {
    if (name === timelineTool.name) {
      if (!args || !allowed('viewFarm') || !validId(args.pondId)) throw new Error('Not permitted');
      if (args.days !== undefined && (!Number.isInteger(args.days) || args.days < 7 || args.days > 90)) throw new Error('Invalid days');
      if (args.endDate !== undefined && !validDateKey(args.endDate)) throw new Error('Invalid date');
      const snap = await db.collection('companies').doc(companyId).collection('ponds').doc(args.pondId).get();
      if (!snap.exists) return { status: 'not_found' };
      return buildPondTimeline(snap.id || args.pondId, cleanRecord(snap.data(), canViewFinance), args, company.timeZone);
    }
    if (name !== recordTool.name || !args || !Object.hasOwn(DATASETS, args.dataset) || !allowed(DATASETS[args.dataset])) throw new Error('Not permitted');
    if (args.documentId !== undefined && !validId(args.documentId)) throw new Error('Invalid document');
    if (args.after !== undefined && !validId(args.after)) throw new Error('Invalid cursor');
    if (args.offset !== undefined && (!Number.isInteger(args.offset) || args.offset < 0)) throw new Error('Invalid offset');
    if (args.field !== undefined && (typeof args.field !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_]{0,80}$/.test(args.field))) throw new Error('Invalid field');
    const ref = args.dataset === 'assets' ? db.collection('assets') : db.collection('companies').doc(companyId).collection(args.dataset);
    if (args.documentId) {
      const snap = await ref.doc(args.documentId).get();
      if (!snap.exists) return { status: 'not_found' };
      if (args.dataset === 'assets' && snap.data().companyId !== companyId) throw new Error('Not permitted');
      const data = cleanRecord(snap.data(), canViewFinance);
      if (args.field && !Object.hasOwn(data, args.field)) return { status: 'field_unavailable', fields: Object.keys(data) };
      let value = args.field ? data[args.field] : data;
      let nextOffset = null;
      if (Array.isArray(value)) {
        const offset = args.offset || 0;
        const all = value;
        value = all.slice(offset, offset + 30);
        nextOffset = offset + value.length < all.length ? offset + value.length : null;
      }
      if (JSON.stringify(value).length > 24000) return { status: 'select_field', fields: Object.keys(data), message: 'Document is large. Request one field at a time; array fields support pagination.' };
      return { status: 'ok', dataset: args.dataset, id: snap.id, field: args.field || null, data: value, nextOffset, complete: nextOffset === null };
    }
    let query = args.dataset === 'assets' ? ref.where('companyId', '==', companyId) : ref;
    query = query.orderBy('__name__');
    if (args.after) query = query.startAfter(args.after);
    const snap = await query.limit(11).get();
    const docs = snap.docs.slice(0, 10);
    const records = docs.map(doc => {
      const data = cleanRecord(doc.data(), canViewFinance);
      return { id: doc.id, fields: Object.keys(data), data: Object.fromEntries(Object.entries(data).filter(([, v]) => v === null || typeof v !== 'object').map(([k, v]) => [k, typeof v === 'string' && v.length > 600 ? { preview: v.slice(0, 600), truncated: true } : v])) };
    });
    return { status: 'ok', dataset: args.dataset, records, documentDetailsOmitted: true, nextCursor: snap.docs.length > 10 ? docs.at(-1).id : null, complete: snap.docs.length <= 10 };
  };
  const tools = [{ ...recordTool, parameters: { ...recordTool.parameters, properties: { ...recordTool.parameters.properties, dataset: { type: 'string', enum: Object.keys(DATASETS).filter(key => allowed(DATASETS[key])) } } } }];
  if (allowed('viewFarm')) tools.push(timelineTool);
  return { tools, execute };
};
module.exports = { createOrsonAppDataReader, cleanRecord, buildPondTimeline };
