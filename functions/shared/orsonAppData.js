'use strict';
const { hasUserPermission } = require('./permissions');
const { selectDailyFeedEntries } = require('./orsonDomain/orsonEvidence');
const { normalizeFarmDateKey } = require('./orsonDomain/farmDate');
const {
  decisionToolSchemas,
  periodFeedCostTool,
  comparePondCyclesTool,
  inventoryReplenishmentTool,
  harvestScenarioTool,
  executeDecisionTool,
} = require('./orsonDecisionTools');
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
const MAX_ARRAY_PAGE_BYTES = 24000;
const MAX_ARRAY_PAGE_ITEMS = 30;
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
const parseTimestampMs = val => {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) return Number.isFinite(val.getTime()) ? val.getTime() : null;
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  if (typeof val === 'object') {
    if (typeof val.toMillis === 'function') {
      try {
        const ms = val.toMillis();
        return Number.isFinite(ms) ? ms : null;
      } catch (_) { return null; }
    }
    const sec = val.seconds ?? val._seconds;
    if (typeof sec === 'number' && Number.isFinite(sec)) {
      const nanos = val.nanoseconds ?? val._nanoseconds ?? 0;
      return sec * 1000 + Math.floor(nanos / 1000000);
    }
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
    const parsed = Date.parse(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};
const dateKey = (value, timeZone) => normalizeFarmDateKey(value, timeZone);
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
    if (!timeline.has(date)) timeline.set(date, {
      date,
      mortalityCount: null,
      legacyMortalityCount: null,
      dedicatedMortalityCount: null,
      feedKg: null,
      actualDailyFeedKg: null,
      samplingFeedEstimateKg: null,
      hasAuthoritativeFeed: false,
      hasExplicitZeroFeed: false,
      authoritativeSourceId: null,
      authoritativeTimestampMs: null,
      feedMeasuredAt: null,
      feedPrecision: 'date-only',
      feedSourceId: null,
      samplingSourceId: null,
      samplingTimestampMs: null,
      feedingResponse: null,
      mbwG: null,
      doMorningMgL: null,
      doEveningMgL: null,
      doMinimumMgL: null,
      phMorning: null,
      phEvening: null,
      phSwing: null,
      salinityPpt: null,
      temperatureC: null,
      temperatureMorningC: null,
      temperatureEveningC: null,
      transparencyCm: null,
      transparencyMorningCm: null,
      transparencyEveningCm: null,
      waterDepthCm: null,
      waterDepthCmMorning: null,
      waterDepthCmEvening: null,
      alkalinityMgL: null,
      ammoniaMgL: null,
      nitriteMgL: null,
      nitriteBasis: null,
      waterExchangePercent: null,
      sludgeLoad: null,
      surfaceScum: null,
      shrimpBehaviour: null,
      weatherEvent: null,
      waterQualityMeasuredAt: null,
      waterQualityPrecision: 'date-only',
      waterQualitySourceId: null,
      waterQualityTimestampMs: null,
      events: []
    });
    return timeline.get(date);
  };
  const setNumber = (day, key, value, decimals = 3) => {
    const parsed = round(value, decimals);
    if (parsed !== null) day[key] = parsed;
  };
  const selectedFeedEntries = selectDailyFeedEntries(
    (Array.isArray(pond.samplings) ? pond.samplings : []).filter(record => belongsToCurrentCycle(record, pond)),
    { allowSamplingEstimate: true, asOfDate: endDate, timeZone },
  );

  const sortedSamplings = (Array.isArray(pond.samplings) ? pond.samplings : [])
    .filter(record => belongsToCurrentCycle(record, pond))
    .slice()
    .sort((a, b) => {
      const da = dateKey(a?.measuredAt ?? a?.observedAt ?? a?.date, timeZone) || '';
      const db = dateKey(b?.measuredAt ?? b?.observedAt ?? b?.date, timeZone) || '';
      if (da !== db) return da.localeCompare(db);
      const ta = parseTimestampMs(a?.updatedAt) ?? parseTimestampMs(a?.measuredAt ?? a?.observedAt) ?? 0;
      const tb = parseTimestampMs(b?.updatedAt) ?? parseTimestampMs(b?.measuredAt ?? b?.observedAt) ?? 0;
      if (ta !== tb) return ta - tb;
      return String(a?.id || '').localeCompare(String(b?.id || ''));
    });

  for (const record of sortedSamplings) {
    const date = dateKey(record?.measuredAt ?? record?.observedAt ?? record?.date, timeZone);
    if (!date || date < startDate || date > endDate) continue;
    const day = ensureDay(date);

    const recordTime = parseTimestampMs(record?.updatedAt) ?? parseTimestampMs(record?.measuredAt ?? record?.observedAt) ?? null;
    const isNewer = day.waterQualityTimestampMs === null || (recordTime !== null && recordTime >= day.waterQualityTimestampMs);
    if (recordTime !== null && isNewer) {
      day.waterQualityTimestampMs = recordTime;
      day.waterQualityMeasuredAt = record?.measuredAt ?? record?.observedAt ?? null;
      day.waterQualityPrecision = record?.measuredAt || record?.observedAt ? 'timestamp' : 'date-only';
      day.waterQualitySourceId = record?.id || null;
    }

    const mbw = finite(record.mbw ?? record.abw);
    if (mbw !== null && mbw > 0) day.mbwG = round(mbw);
    const legacyMortality = finite(record.mortality);
    if (legacyMortality !== null && legacyMortality > 0) day.legacyMortalityCount = round((day.legacyMortalityCount ?? 0) + legacyMortality, 0);

    if (typeof record.feedData?.feedingResponse === 'string' && record.feedData.feedingResponse.trim()) {
      day.feedingResponse = record.feedData.feedingResponse.trim().slice(0, 80);
    }
    setNumber(day, 'doMorningMgL', record.doMorning);
    setNumber(day, 'doEveningMgL', record.doEvening);
    const oxygen = [day.doMorningMgL, day.doEveningMgL].filter(value => value !== null);
    day.doMinimumMgL = oxygen.length ? Math.min(...oxygen) : null;
    setNumber(day, 'phMorning', record.phMorning);
    setNumber(day, 'phEvening', record.phEvening);
    day.phSwing = day.phMorning !== null && day.phEvening !== null ? round(Math.abs(day.phEvening - day.phMorning)) : null;
    setNumber(day, 'salinityPpt', record.salinity);
    setNumber(day, 'temperatureC', record.temperature ?? record.temperatureMorning ?? record.temperatureEvening);
    setNumber(day, 'temperatureMorningC', record.temperatureMorning);
    setNumber(day, 'temperatureEveningC', record.temperatureEvening);
    setNumber(day, 'transparencyCm', record.transparency ?? record.transparencyMorning ?? record.transparencyEvening);
    setNumber(day, 'transparencyMorningCm', record.transparencyMorning);
    setNumber(day, 'transparencyEveningCm', record.transparencyEvening);
    const rawMorningDepth = record.waterDepthCmMorning ?? record.waterDepthMorning ??
      ((record.waterDepthCmEvening !== undefined && record.waterDepthCmEvening !== null) || (record.waterDepthEvening !== undefined && record.waterDepthEvening !== null)
        ? null
        : record.waterDepthCm);
    setNumber(day, 'waterDepthCmMorning', rawMorningDepth);
    setNumber(day, 'waterDepthCmEvening', record.waterDepthCmEvening ?? record.waterDepthEvening);
    day.waterDepthCm = day.waterDepthCmMorning ?? day.waterDepthCmEvening ?? (record.waterDepthCm !== undefined ? finite(record.waterDepthCm) : null);
    setNumber(day, 'alkalinityMgL', record.alkalinity);
    setNumber(day, 'ammoniaMgL', record.ammonia);

    const rawNitrite = record.nitriteMgL !== undefined && record.nitriteMgL !== null
      ? record.nitriteMgL
      : record.nitrite;
    if (rawNitrite !== undefined && rawNitrite !== null) {
      const nitriteVal = finite(rawNitrite);
      if (nitriteVal !== null) {
        day.nitriteMgL = round(nitriteVal, 3);
        day.nitriteBasis = record.nitriteBasis || 'NO2';
      }
    }

    const rawExchange = record.waterExchangePercent !== undefined && record.waterExchangePercent !== null
      ? record.waterExchangePercent
      : record.waterExchange;
    if (rawExchange !== undefined && rawExchange !== null) {
      const exVal = finite(rawExchange);
      if (exVal !== null) {
        day.waterExchangePercent = round(exVal, 1);
        day.events = day.events.filter(e => !e.startsWith('Water exchange:'));
        day.events.push(`Water exchange: ${day.waterExchangePercent}%`);
      }
    }
    if (record.sludgeLoad) {
      day.sludgeLoad = String(record.sludgeLoad).slice(0, 40);
      day.events = day.events.filter(e => !e.startsWith('Sludge load:'));
      day.events.push(`Sludge load: ${day.sludgeLoad}`);
    }
    if (typeof record.surfaceScum === 'boolean') {
      day.surfaceScum = record.surfaceScum;
      if (record.surfaceScum === true) {
        day.events = day.events.filter(e => e !== 'No surface scum');
        day.events.push('Surface scum observed');
      } else {
        day.events = day.events.filter(e => e !== 'Surface scum observed');
        day.events.push('No surface scum');
      }
    }
    if (record.shrimpBehaviour) {
      day.shrimpBehaviour = String(record.shrimpBehaviour).slice(0, 80);
      day.events = day.events.filter(e => !e.startsWith('Shrimp behaviour:'));
      day.events.push(`Shrimp behaviour: ${day.shrimpBehaviour}`);
    }
    if (record.weatherEvent) {
      day.weatherEvent = String(record.weatherEvent).slice(0, 80);
      day.events = day.events.filter(e => !e.startsWith('Weather:'));
      day.events.push(`Weather: ${day.weatherEvent}`);
    }
    if (record.harvestData) day.events.push('Harvest recorded');
  }
  for (const entry of selectedFeedEntries) {
    if (entry.farmDate < startDate || entry.farmDate > endDate) continue;
    const day = ensureDay(entry.farmDate);
    day.feedMeasuredAt = entry.measuredAt;
    day.feedPrecision = entry.precision;
    day.feedSourceId = entry.sourceIds[0] || null;
    if (entry.hasAuthoritativeDailyFeed) {
      day.hasAuthoritativeFeed = true;
      day.hasExplicitZeroFeed = entry.feedKg === 0;
      day.actualDailyFeedKg = entry.feedKg;
      day.authoritativeSourceId = entry.sourceIds[0] || null;
    } else if (entry.isEstimate) {
      day.samplingFeedEstimateKg = entry.feedKg;
      day.samplingSourceId = entry.sourceIds[0] || null;
    }
  }
  for (const record of (Array.isArray(pond.mortalityRecords) ? pond.mortalityRecords : [])) {
    const date = dateKey(record?.measuredAt ?? record?.observedAt ?? record?.date, timeZone);
    if (!date || date < startDate || date > endDate || !belongsToCurrentCycle(record, pond)) continue;
    const count = finite(record.count);
    if (count === null || (count <= 0 && record.observationType !== 'none_observed')) continue;
    const day = ensureDay(date);
    day.dedicatedMortalityCount = round((day.dedicatedMortalityCount ?? 0) + Math.max(0, count), 0);
    if (record.observationType) day.events.push(`Mortality observation: ${String(record.observationType).slice(0, 80)}`);
  }
  const rows = [...timeline.values()].sort((a, b) => a.date.localeCompare(b.date)).map(day => {
    const {
      legacyMortalityCount,
      dedicatedMortalityCount,
      hasAuthoritativeFeed,
      hasExplicitZeroFeed,
      authoritativeFeedTotals,
      samplingFeedTotals,
      actualDailyFeedKg,
      samplingFeedEstimateKg,
      ...publicDay
    } = day;

    const hasAuth = hasExplicitZeroFeed || (hasAuthoritativeFeed && actualDailyFeedKg !== null);
    const resolvedFeedKg = hasAuth
      ? (hasExplicitZeroFeed ? 0 : round(actualDailyFeedKg, 2))
      : samplingFeedEstimateKg !== null
        ? round(samplingFeedEstimateKg, 2)
        : null;

    return {
      ...publicDay,
      feedKg: resolvedFeedKg,
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
      nitriteMgL: series('nitriteMgL'),
      waterDepthCmMorning: series('waterDepthCmMorning'),
      waterDepthCmEvening: series('waterDepthCmEvening'),
      waterExchangePercent: series('waterExchangePercent'),
    },
  };
};
const createOrsonAppDataReader = ({ db, company, user, uid, companyId }) => {
  const allowed = permission => hasUserPermission({ company: { ...company, id: companyId }, user, uid, permission });
  const canViewFinance = allowed('viewFinance');
  const enterpriseScoped = company.businessSize === 'enterprise' && user?.role === 'technician' && company.ownerId !== uid;
  let scopePromise;
  const scopedData = async (dataset, record) => {
    if (!enterpriseScoped) return record;
    scopePromise ||= (async () => {
      const base = db.collection('companies').doc(companyId);
      const blocks = await base.collection('blocks').where('assignedTechnicianId', '==', uid).get();
      const blockIds = new Set(blocks.docs.map(doc => doc.id));
      const ponds = await base.collection('ponds').get();
      return { blockIds, pondIds: new Set(ponds.docs.filter(doc => blockIds.has(doc.data().blockId)).map(doc => doc.id)) };
    })();
    const { blockIds, pondIds } = await scopePromise;
    if (['ponds', 'physicalPonds'].includes(dataset)) return blockIds.has(record.blockId) ? record : null;
    if (dataset === 'blocks') return record.assignedTechnicianId === uid ? record : null;
    if (dataset === 'cycles') return (record.blockIds || [record.blockId]).some(id => blockIds.has(id)) ? { ...record, blockIds: (record.blockIds || []).filter(id => blockIds.has(id)), plannedPondIds: undefined } : null;
    if (['feeds', 'additives'].includes(dataset)) return { ...record, usageHistory: (record.usageHistory || []).filter(row => pondIds.has(row.pondId)) };
    if (Array.isArray(record.ponds)) {
      const ponds = record.ponds.filter(row => pondIds.has(row.pondId));
      return ponds.length ? { ...record, ponds, financeEntry: undefined } : null;
    }
    if (record.pondId && pondIds.has(record.pondId)) return record;
    return null;
  };

  const execute = async (name, args) => {
    if (name === timelineTool.name) {
      if (!args || !allowed('viewFarm') || !validId(args.pondId)) throw new Error('Not permitted');
      if (args.days !== undefined && (!Number.isInteger(args.days) || args.days < 7 || args.days > 90)) throw new Error('Invalid days');
      if (args.endDate !== undefined && !validDateKey(args.endDate)) throw new Error('Invalid date');
      const snap = await db.collection('companies').doc(companyId).collection('ponds').doc(args.pondId).get();
      if (!snap.exists) return { status: 'not_found' };
      const scoped = await scopedData('ponds', snap.data());
      if (!scoped) throw new Error('Not permitted');
      return buildPondTimeline(snap.id || args.pondId, cleanRecord(scoped, canViewFinance), args, company.timeZone);
    }
    if (
      name === periodFeedCostTool.name ||
      name === comparePondCyclesTool.name ||
      name === inventoryReplenishmentTool.name ||
      name === harvestScenarioTool.name
    ) {
      return executeDecisionTool(name, args, {
        db,
        company,
        user,
        uid,
        companyId,
        allowed,
        enterpriseScoped,
        scopedData,
        timeZone: company.timeZone,
      });
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
      const scoped = await scopedData(args.dataset, snap.data());
      if (!scoped) throw new Error('Not permitted');
      const data = cleanRecord(scoped, canViewFinance);
      if (args.field && !Object.hasOwn(data, args.field)) return { status: 'field_unavailable', fields: Object.keys(data) };
      let value = args.field ? data[args.field] : data;
      let nextOffset = null;
      if (Array.isArray(value)) {
        const offset = args.offset || 0;
        const all = value;
        value = [];
        for (let index = offset; index < all.length && value.length < MAX_ARRAY_PAGE_ITEMS; index += 1) {
          const candidate = [...value, all[index]];
          if (Buffer.byteLength(JSON.stringify(candidate), 'utf8') > MAX_ARRAY_PAGE_BYTES) {
            if (!value.length) {
              return { status: 'array_item_too_large', dataset: args.dataset, id: snap.id, field: args.field || null, offset: index, fields: Object.keys(data), message: 'This array item is too large to return safely. Request a smaller field or inspect the document another way.' };
            }
            break;
          }
          value = candidate;
        }
        nextOffset = offset + value.length < all.length ? offset + value.length : null;
      }
      if (Buffer.byteLength(JSON.stringify(value), 'utf8') > MAX_ARRAY_PAGE_BYTES) return { status: 'select_field', fields: Object.keys(data), message: 'Document is large. Request one field at a time; array fields support pagination.' };
      return { status: 'ok', dataset: args.dataset, id: snap.id, field: args.field || null, data: value, nextOffset, complete: nextOffset === null };
    }
    let query = args.dataset === 'assets' ? ref.where('companyId', '==', companyId) : ref;
    query = query.orderBy('__name__');
    if (args.after) query = query.startAfter(args.after);
    const snap = await query.limit(11).get();
    const docs = snap.docs.slice(0, 10);
    const records = (await Promise.all(docs.map(async doc => {
      const scoped = await scopedData(args.dataset, doc.data());
      if (!scoped) return null;
      const data = cleanRecord(scoped, canViewFinance);
      return { id: doc.id, fields: Object.keys(data), data: Object.fromEntries(Object.entries(data).filter(([, v]) => v === null || typeof v !== 'object').map(([k, v]) => [k, typeof v === 'string' && v.length > 600 ? { preview: v.slice(0, 600), truncated: true } : v])) };
    }))).filter(Boolean);
    return { status: 'ok', dataset: args.dataset, records, documentDetailsOmitted: true, nextCursor: snap.docs.length > 10 ? docs.at(-1).id : null, complete: snap.docs.length <= 10 };
  };
  const tools = [{ ...recordTool, parameters: { ...recordTool.parameters, properties: { ...recordTool.parameters.properties, dataset: { type: 'string', enum: Object.keys(DATASETS).filter(key => allowed(DATASETS[key])) } } } }];
  if (allowed('viewFarm')) {
    tools.push(timelineTool);
    tools.push(...decisionToolSchemas);
  }
  return { tools, execute };
};
module.exports = {
  createOrsonAppDataReader,
  cleanRecord,
  buildPondTimeline,
  belongsToCurrentCycle,
  farmToday,
  shiftDate,
  validDateKey,
  validId,
  finite,
  round,
};
