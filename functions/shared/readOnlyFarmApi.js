'use strict';

const crypto = require('crypto');
const { Buffer } = require('node:buffer');

let HttpsError;
try {
  ({ HttpsError } = require('firebase-functions/v2/https'));
} catch (_) {
  HttpsError = class extends Error {
    constructor(code, message, details) {
      super(message);
      this.name = 'HttpsError';
      this.code = code;
      this.details = details;
    }
  };
}

const { hasUserPermission } = require('./permissions');
const { resolveFarmTimeZone, normalizeFarmDateKey, getFarmDateKey } = require('./orsonDomain/farmDate');
const { selectDailyFeedEntries } = require('./orsonDomain/orsonEvidence');

const CURRENT_CURSOR_REVISION = 2;
const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 100;
const MAX_DATE_WINDOW_DAYS = 90;
const MAX_ASSIGNED_BLOCKS = 300;
const FIRESTORE_IN_FILTER_LIMIT = 30;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const isValidId = (value) =>
  typeof value === 'string' &&
  value.trim().length > 0 &&
  value.trim().length <= 160 &&
  !value.includes('/') &&
  !['.', '..'].includes(value.trim());

const isValidDateKey = (value) => {
  if (typeof value !== 'string' || !ISO_DATE_REGEX.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const finiteNumber = (value, decimals = null) => {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  if (!Number.isFinite(parsed)) return null;
  if (decimals !== null) {
    const factor = 10 ** decimals;
    return Math.round((parsed + Number.EPSILON) * factor) / factor;
  }
  return parsed;
};

const boundedString = (value, maxLength = 100) => {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (!str) return null;
  return str.slice(0, maxLength);
};

const parseTimestampMs = (val) => {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) return Number.isFinite(val.getTime()) ? val.getTime() : null;
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  if (typeof val === 'object') {
    if (typeof val.toMillis === 'function') {
      try {
        const ms = val.toMillis();
        return Number.isFinite(ms) ? ms : null;
      } catch (_) {
        return null;
      }
    }
    const sec = val.seconds ?? val._seconds;
    if (typeof sec === 'number' && Number.isFinite(sec)) {
      return sec * 1000;
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

const getDeterministicRecordId = (sampling = {}, pondId = null, index = 0) => {
  if (sampling && typeof sampling === 'object' && sampling.id && typeof sampling.id === 'string' && sampling.id.trim()) {
    return sampling.id.trim();
  }
  const dateStr = sampling?.feedData?.date || sampling?.date || 'undated';
  const measured = sampling?.feedData?.measuredAt ?? sampling?.feedData?.observedAt ??
    sampling?.feedData?.date ?? sampling?.measuredAt ?? sampling?.observedAt ?? String(index);
  const content = JSON.stringify({
    pondId: pondId ? String(pondId) : '',
    date: dateStr,
    measured,
    phM: sampling?.phMorning ?? null,
    doM: sampling?.doMorning ?? null,
    totalDailyFeed: sampling?.feedData?.totalDailyFeedKg ?? sampling?.feedData?.totalDailyFeed ?? null,
    feedDate: sampling?.feedData?.date ?? null,
    feedObservedAt: sampling?.feedData?.observedAt ?? null,
  });
  const hash = crypto.createHash('sha256').update(content).digest('hex').slice(0, 12);
  return `${dateStr}-${hash}`;
};

const computeSamplingsDigest = (samplings = []) => {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(samplings || []))
    .digest('hex')
    .slice(0, 16);
};

const encodeCursor = ({
  id,
  revision = CURRENT_CURSOR_REVISION,
  type,
  uid,
  companyId,
  pondId,
  route,
  order,
  blockId,
  startDate,
  endDate,
  digest,
  offset,
} = {}) => {
  if (!id || typeof id !== 'string') return null;
  const payload = {
    rev: revision,
    id: id.trim(),
    uid: String(uid || ''),
    companyId: String(companyId || ''),
    route: String(route || type || ''),
    order: String(order || '__name__'),
    ...(pondId ? { pondId: String(pondId) } : {}),
    ...(blockId !== undefined ? { blockId: blockId ? String(blockId) : null } : {}),
    ...(startDate ? { startDate: String(startDate) } : {}),
    ...(endDate ? { endDate: String(endDate) } : {}),
    ...(digest ? { digest: String(digest) } : {}),
    ...(Number.isInteger(offset) ? { offset } : {}),
  };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
};

const decodeCursor = (cursorInput, expectedContext = {}) => {
  if (!cursorInput) return null;
  let parsed;
  if (typeof cursorInput === 'object') {
    parsed = cursorInput;
  } else if (typeof cursorInput === 'string') {
    const trimmed = cursorInput.trim();
    if (!trimmed) return null;
    try {
      const jsonStr = trimmed.startsWith('{')
        ? trimmed
        : Buffer.from(trimmed, 'base64url').toString('utf8');
      parsed = JSON.parse(jsonStr);
    } catch (_) {
      throw new HttpsError('invalid-argument', 'Invalid cursor format: cursor cannot be decoded.');
    }
  } else {
    throw new HttpsError('invalid-argument', 'Cursor must be a string or object.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new HttpsError('invalid-argument', 'Invalid cursor payload.');
  }

  const revision = parsed.rev ?? parsed.revision;
  if (revision === undefined || revision === null) {
    throw new HttpsError('invalid-argument', 'Cursor is missing revision.');
  }
  if (revision !== CURRENT_CURSOR_REVISION) {
    throw new HttpsError(
      'invalid-argument',
      `Unsupported cursor revision: ${revision}. Expected revision ${CURRENT_CURSOR_REVISION}.`,
    );
  }

  if (!parsed.id || typeof parsed.id !== 'string' || !parsed.id.trim()) {
    throw new HttpsError('invalid-argument', 'Cursor is missing a valid id.');
  }

  // Require every context field:
  if (!parsed.uid || typeof parsed.uid !== 'string' || (expectedContext.uid && parsed.uid !== expectedContext.uid)) {
    throw new HttpsError('invalid-argument', 'Cursor uid is missing or does not match authenticated user.');
  }

  if (
    !parsed.companyId ||
    typeof parsed.companyId !== 'string' ||
    (expectedContext.companyId && parsed.companyId !== expectedContext.companyId)
  ) {
    throw new HttpsError('invalid-argument', 'Cursor companyId is missing or does not match authenticated company.');
  }

  const expRoute = expectedContext.route || expectedContext.type;
  const parsedRoute = parsed.route || parsed.type;
  if (!parsedRoute || typeof parsedRoute !== 'string' || (expRoute && parsedRoute !== expRoute)) {
    throw new HttpsError('invalid-argument', `Cursor route mismatch: expected ${expRoute}, got ${parsedRoute}.`);
  }

  if (!parsed.order || typeof parsed.order !== 'string' || (expectedContext.order && parsed.order !== expectedContext.order)) {
    throw new HttpsError('invalid-argument', `Cursor order mismatch: expected ${expectedContext.order}, got ${parsed.order}.`);
  }

  if (expRoute === 'ponds') {
    const expectedBlockId = expectedContext.blockId || null;
    const parsedBlockId = parsed.blockId || null;
    if (parsed.blockId === undefined || parsedBlockId !== expectedBlockId) {
      throw new HttpsError('invalid-argument', 'Cursor filter mismatch: blockId differs or is missing.');
    }
  }

  if (['water-quality', 'feed-summary'].includes(expRoute)) {
    if (!parsed.pondId || typeof parsed.pondId !== 'string' || (expectedContext.pondId && parsed.pondId !== expectedContext.pondId)) {
      throw new HttpsError('invalid-argument', 'Cursor pondId is missing or does not match requested pond.');
    }
    if (
      !parsed.startDate ||
      typeof parsed.startDate !== 'string' ||
      (expectedContext.startDate && parsed.startDate !== expectedContext.startDate)
    ) {
      throw new HttpsError('invalid-argument', 'Cursor filter mismatch: startDate differs or is missing.');
    }
    if (
      !parsed.endDate ||
      typeof parsed.endDate !== 'string' ||
      (expectedContext.endDate && parsed.endDate !== expectedContext.endDate)
    ) {
      throw new HttpsError('invalid-argument', 'Cursor filter mismatch: endDate differs or is missing.');
    }
    if (!parsed.digest || typeof parsed.digest !== 'string') {
      throw new HttpsError('invalid-argument', 'Cursor digest is missing.');
    }
    if (!Number.isInteger(parsed.offset) || parsed.offset < 1) {
      throw new HttpsError('invalid-argument', 'Cursor offset is missing or invalid.');
    }
    if (expectedContext.digest && parsed.digest !== expectedContext.digest) {
      throw new HttpsError('aborted', 'Cursor is stale: underlying pond data has changed.');
    }
  }

  return {
    id: parsed.id.trim(),
    revision,
    uid: parsed.uid,
    companyId: parsed.companyId,
    route: parsedRoute,
    order: parsed.order,
    pondId: parsed.pondId || null,
    blockId: parsed.blockId || null,
    startDate: parsed.startDate || null,
    endDate: parsed.endDate || null,
    digest: parsed.digest || null,
    offset: Number.isInteger(parsed.offset) ? parsed.offset : null,
  };
};

const handleBackendError = (error, operation = 'operation') => {
  if (error instanceof HttpsError || error?.name === 'HttpsError') {
    throw error;
  }
  const isUnavailable = error?.code === 'unavailable' || error?.code === 14;
  const code = isUnavailable ? 'unavailable' : 'internal';
  const message = isUnavailable
    ? 'Backend database service is temporarily unavailable.'
    : 'An unexpected backend database error occurred.';
  throw new HttpsError(code, message);
};

const hasWaterQualityData = (sampling) => {
  if (!sampling || typeof sampling !== 'object') return false;
  return [
    sampling.phMorning,
    sampling.phEvening,
    sampling.doMorning,
    sampling.doEvening,
    sampling.transparency,
    sampling.transparencyMorning,
    sampling.transparencyEvening,
    sampling.salinity,
    sampling.temperature,
    sampling.temperatureMorning,
    sampling.temperatureEvening,
    sampling.waterAppearance,
    sampling.waterAppearanceMorning,
    sampling.waterAppearanceEvening,
    sampling.waterDepthCm,
    sampling.waterDepthCmMorning,
    sampling.waterDepthCmEvening,
    sampling.alkalinity,
    sampling.ammonia,
    sampling.weatherEvent,
    sampling.waterExchangePercent,
    sampling.sludgeLoad,
    sampling.surfaceScum,
    sampling.shrimpBehaviour,
  ].some((val) => val !== null && val !== undefined && String(val).trim() !== '');
};

/**
 * Sanitizes a sampling record for canonical daily feed selection.
 * Restricts inputs to actual feedData.totalDailyFeedKg / totalDailyFeed and verified feedAllocations only.
 * Excludes sampling.feed, actualDailyFeedKg, and unverified direct-actual fallback.
 * Prevents isExplicitZero from overriding positive recorded totals.
 */
const sanitizeSamplingForDailyFeed = (sampling, pondId = null, index = 0) => {
  if (!sampling || typeof sampling !== 'object') return null;

  const id = getDeterministicRecordId(sampling, pondId, index);
  const feedData = sampling.feedData && typeof sampling.feedData === 'object' ? sampling.feedData : null;

  // Dedicated daily feedData is strictly required; biological sampling.feed is excluded
  if (!feedData) return null;

  // 1. Direct totalDailyFeedKg / totalDailyFeed
  const rawTotal =
    feedData.totalDailyFeedKg !== undefined && feedData.totalDailyFeedKg !== null
      ? feedData.totalDailyFeedKg
      : feedData.totalDailyFeed;

  let directNum = null;
  if (rawTotal !== undefined && rawTotal !== null && String(rawTotal).trim() !== '') {
    const parsed = finiteNumber(rawTotal, 3);
    if (parsed !== null && parsed < 0) return null;
    if (parsed !== null) {
      directNum = parsed;
    }
  }

  // 2. Verified feedAllocations
  let allocationSum = null;
  if (Array.isArray(feedData.feedAllocations) && feedData.feedAllocations.length > 0) {
    let sum = 0;
    let hasValidAlloc = false;
    for (const alloc of feedData.feedAllocations) {
      const q = finiteNumber(alloc?.quantityKg, 3);
      if (q !== null && q < 0) return null;
      if (q !== null) {
        sum += q;
        hasValidAlloc = true;
      }
    }
    if (hasValidAlloc) {
      allocationSum = Math.round(sum * 1000) / 1000;
    }
  }

  // Prevent isExplicitZero from overriding positive recorded totals!
  let resolvedFeedKg = null;
  let isExplicitZero = false;

  if (directNum !== null) {
    resolvedFeedKg = directNum;
  } else if (allocationSum !== null && allocationSum > 0) {
    resolvedFeedKg = allocationSum;
  } else if (allocationSum === 0) {
    resolvedFeedKg = 0;
    isExplicitZero = true;
  } else if (feedData.isExplicitZero === true) {
    resolvedFeedKg = 0;
    isExplicitZero = true;
  }

  if (resolvedFeedKg === 0) isExplicitZero = true;

  if (resolvedFeedKg === null) {
    // Missing feed; kept distinct from zero
    return null;
  }

  const measuredAt = feedData.measuredAt ?? feedData.observedAt ?? feedData.date ??
    sampling.measuredAt ?? sampling.observedAt ?? sampling.date ?? null;

  return {
    id,
    date: feedData.date ?? sampling.date ?? null,
    farmDate: feedData.date ?? sampling.date ?? null,
    measuredAt,
    observedAt: feedData.observedAt ?? sampling.observedAt ?? null,
    feedingResponse: feedData.feedingResponse || sampling.feedingResponse || null,
    feedingFrequency: feedData.feedingFrequency ?? null,
    feedType: feedData.feedType ?? null,
    feedData: {
      totalDailyFeedKg: resolvedFeedKg,
      isExplicitZero,
      measuredAt: feedData.measuredAt ?? null,
      observedAt: feedData.observedAt ?? null,
      date: feedData.date ?? null,
      feedingResponse: feedData.feedingResponse || sampling.feedingResponse || null,
    },
  };
};

const extractRealDailyFeed = (sampling, pondId = null) => {
  const sanitized = sanitizeSamplingForDailyFeed(sampling, pondId, 0);
  if (!sanitized) {
    return { hasFeed: false, feedKg: null, isExplicitZero: false };
  }
  const kg = sanitized.feedData.totalDailyFeedKg;
  return {
    hasFeed: true,
    feedKg: kg,
    isExplicitZero: sanitized.feedData.isExplicitZero,
  };
};

const hasFeedData = (sampling, pondId = null) => {
  return sanitizeSamplingForDailyFeed(sampling, pondId, 0) !== null;
};

const toPondDto = (data = {}, id = null) => {
  const pondId = id || data.id || '';
  return {
    id: String(pondId),
    name: boundedString(data.pondName || data.name || pondId, 160),
    blockId: boundedString(data.blockId, 160),
    blockName: boundedString(data.blockName, 160),
    area: finiteNumber(data.pondArea ?? data.area, 2),
    status: boundedString(data.cycleStatus || data.status, 40),
    cycleId: boundedString(data.pondCycleId || data.cycleId, 160),
    initialStock: finiteNumber(data.initialStock ?? data.initialPopulation, 0),
  };
};

const toWaterQualityRecordDto = (sampling = {}, pondId = null, index = 0, timeZone = 'UTC') => {
  const recId = getDeterministicRecordId(sampling, pondId, index);
  const normalizedDate = normalizeFarmDateKey(sampling.measuredAt || sampling.observedAt || sampling.date, timeZone);
  return {
    id: recId,
    pondId: pondId ? String(pondId) : (sampling.pondId ? String(sampling.pondId) : null),
    date: normalizedDate,
    measuredAt: boundedString(sampling.measuredAt || sampling.observedAt, 40),
    phMorning: finiteNumber(sampling.phMorning, 2),
    phEvening: finiteNumber(sampling.phEvening, 2),
    doMorning: finiteNumber(sampling.doMorning, 2),
    doEvening: finiteNumber(sampling.doEvening, 2),
    salinity: finiteNumber(sampling.salinity, 2),
    temperature: finiteNumber(sampling.temperature ?? sampling.temperatureMorning ?? sampling.temperatureEvening, 2),
    transparency: finiteNumber(sampling.transparency ?? sampling.transparencyMorning ?? sampling.transparencyEvening, 2),
    alkalinity: finiteNumber(sampling.alkalinity, 2),
    ammonia: finiteNumber(sampling.ammonia, 3),
    waterDepthCm: finiteNumber(sampling.waterDepthCm ?? sampling.waterDepthCmMorning, 1),
    waterAppearance: boundedString(sampling.waterAppearance ?? sampling.waterAppearanceMorning, 80),
    weatherEvent: boundedString(sampling.weatherEvent, 50),
    waterExchangePercent: finiteNumber(sampling.waterExchangePercent, 1),
    sludgeLoad: boundedString(sampling.sludgeLoad, 30),
    surfaceScum: typeof sampling.surfaceScum === 'boolean' ? sampling.surfaceScum : null,
    shrimpBehaviour: boundedString(sampling.shrimpBehaviour, 50),
    units: {
      ph: 'pH',
      do: 'mg/L',
      salinity: 'ppt',
      temperature: 'C',
      transparency: 'cm',
      alkalinity: 'mg/L',
      ammonia: 'mg/L',
      waterDepthCm: 'cm',
      waterExchangePercent: '%',
    },
  };
};

const toFeedRecordDtoFromCanonical = (entry = {}, pondId = null) => {
  const sourceId = Array.isArray(entry.sourceIds) && entry.sourceIds[0] ? entry.sourceIds[0] : null;
  const id = sourceId || `feed-${pondId || 'pond'}-${entry.farmDate}`;
  const feedKg = finiteNumber(entry.feedKg, 2);
  const isZero = feedKg === 0;

  return {
    id: String(id),
    pondId: pondId ? String(pondId) : null,
    date: entry.farmDate,
    measuredAt: boundedString(entry.measuredAt, 40),
    feedKg: feedKg !== null ? feedKg : null,
    unit: 'kg',
    feedEntryStatus: 'recorded',
    feedingResponse: boundedString(entry.feedingResponse, 50),
    isExplicitZero: isZero,
  };
};

const toFeedRecordDto = (sampling = {}, pondId = null, index = 0) => {
  const feedInfo = extractRealDailyFeed(sampling, pondId);
  const feedData = sampling.feedData && typeof sampling.feedData === 'object' ? sampling.feedData : {};
  const recId = getDeterministicRecordId(sampling, pondId, index);

  return {
    id: recId,
    pondId: pondId ? String(pondId) : (sampling.pondId ? String(sampling.pondId) : null),
    date: boundedString(sampling.date, 10),
    measuredAt: boundedString(sampling.measuredAt || feedData.measuredAt, 40),
    feedKg: feedInfo.hasFeed ? finiteNumber(feedInfo.feedKg, 2) : null,
    unit: 'kg',
    feedEntryStatus: boundedString(sampling.feedEntryStatus, 30) || (feedInfo.hasFeed ? 'recorded' : 'not_recorded'),
    feedingResponse: boundedString(feedData.feedingResponse || sampling.feedingResponse, 50),
    isExplicitZero: feedInfo.isExplicitZero,
  };
};

const toPondSummaryDto = (pond = {}, id = null, timeZone = 'UTC') => {
  const base = toPondDto(pond, id);
  const samplings = Array.isArray(pond.samplings) ? pond.samplings : [];
  const asOfDate = getFarmDateKey(new Date(), timeZone);

  // Sort samplings by normalized farm date/time
  const sortedSamplings = [...samplings].sort((a, b) => {
    const da = normalizeFarmDateKey(a.measuredAt || a.observedAt || a.date, timeZone) || '';
    const db = normalizeFarmDateKey(b.measuredAt || b.observedAt || b.date, timeZone) || '';
    if (da !== db) return da.localeCompare(db);
    const ta = parseTimestampMs(a.measuredAt || a.observedAt) ?? 0;
    const tb = parseTimestampMs(b.measuredAt || b.observedAt) ?? 0;
    if (ta !== tb) return ta - tb;
    return String(a.id || '').localeCompare(String(b.id || ''));
  });

  // AGENTS biological rule: Look-back for valid non-zero MBW; fallback to initialWeight, then 0.5g
  let currentMbw = null;
  let mbwSource = null;
  for (let i = sortedSamplings.length - 1; i >= 0; i--) {
    const s = sortedSamplings[i];
    const samplingDate = normalizeFarmDateKey(s.measuredAt || s.observedAt || s.date, timeZone);
    if (!samplingDate || samplingDate > asOfDate) continue;
    const mbw = finiteNumber(s.mbw ?? s.abw, 2);
    if (mbw !== null && mbw > 0) {
      currentMbw = mbw;
      mbwSource = 'sampling';
      break;
    }
  }

  if (currentMbw === null) {
    const initialWeight = finiteNumber(pond.initialWeight, 2);
    if (initialWeight !== null && initialWeight > 0) {
      currentMbw = initialWeight;
      mbwSource = 'initialWeight';
    } else {
      currentMbw = 0.5;
      mbwSource = 'default_fallback';
    }
  }

  // Latest water observation sorted by date/time
  const latestWaterSampling = [...sortedSamplings].reverse().find((sampling) => {
    if (!hasWaterQualityData(sampling)) return false;
    const date = normalizeFarmDateKey(sampling.measuredAt || sampling.observedAt || sampling.date, timeZone);
    return Boolean(date && date <= asOfDate);
  });
  const latestWaterQuality = latestWaterSampling
    ? toWaterQualityRecordDto(latestWaterSampling, base.id, 0, timeZone)
    : null;

  // Canonical daily feed selection using selectDailyFeedEntries
  const sanitizedList = sortedSamplings
    .map((s, idx) => sanitizeSamplingForDailyFeed(s, base.id, idx))
    .filter(Boolean);
  const canonicalFeed = selectDailyFeedEntries(sanitizedList, {
    timeZone,
    allowSamplingEstimate: false,
    asOfDate,
  });
  const latestFeedEntry = canonicalFeed.length > 0 ? canonicalFeed[canonicalFeed.length - 1] : null;
  const latestFeed = latestFeedEntry ? toFeedRecordDtoFromCanonical(latestFeedEntry, base.id) : null;

  return {
    ...base,
    currentMbw,
    mbwSource,
    totalSamplings: samplings.length,
    latestWaterQuality,
    latestFeed,
  };
};

const authorizeFarmReader = async (db, uid, explicitCompanyId = null) => {
  if (!uid || typeof uid !== 'string' || !uid.trim()) {
    throw new HttpsError('unauthenticated', 'You must be signed in.');
  }

  const cleanUid = uid.trim();

  let userSnap;
  try {
    userSnap = await db.collection('users').doc(cleanUid).get();
  } catch (err) {
    handleBackendError(err, 'user profile lookup');
  }

  if (!userSnap?.exists) {
    throw new HttpsError('permission-denied', 'User profile not found.');
  }

  const user = userSnap.data() || {};
  const userCompanyId = user.companyId;

  if (!isValidId(userCompanyId)) {
    throw new HttpsError('permission-denied', 'User is not associated with a valid company.');
  }

  if (explicitCompanyId !== undefined && explicitCompanyId !== null && String(explicitCompanyId).trim() !== '') {
    if (String(explicitCompanyId).trim() !== userCompanyId) {
      throw new HttpsError('permission-denied', 'You do not have access to this company.');
    }
  }

  let companySnap;
  try {
    companySnap = await db.collection('companies').doc(userCompanyId).get();
  } catch (err) {
    handleBackendError(err, 'company lookup');
  }

  if (!companySnap?.exists) {
    throw new HttpsError('not-found', 'Company not found.');
  }

  const company = companySnap.data() || {};
  const isOwner = company.ownerId === cleanUid;
  const teamMembers = Array.isArray(company.teamMembers) ? company.teamMembers : [];
  const isMember = teamMembers.includes(cleanUid);

  if (!isOwner && !isMember) {
    throw new HttpsError('permission-denied', 'You do not have access to this company.');
  }

  // company.ownerId is authoritative after ownership transfers. A stale owner role
  // must not retain wildcard permissions through team membership alone.
  if (user.role === 'owner' && !isOwner) {
    throw new HttpsError('permission-denied', 'You do not have access to this company.');
  }

  const allowed = hasUserPermission({
    company: { ...company, id: userCompanyId },
    user: user || {},
    uid: cleanUid,
    permission: 'viewFarm',
  });

  if (!allowed) {
    throw new HttpsError('permission-denied', 'You do not have permission to view farm data.');
  }

  const isEnterpriseScoped = company.businessSize === 'enterprise' && user?.role === 'technician' && !isOwner;
  let assignedBlockIds = null;

  if (isEnterpriseScoped) {
    try {
      const blocksSnap = await db
        .collection('companies')
        .doc(userCompanyId)
        .collection('blocks')
        .where('assignedTechnicianId', '==', cleanUid)
        .limit(MAX_ASSIGNED_BLOCKS + 1)
        .get();
      const docs = blocksSnap?.docs || [];
      if (docs.length > MAX_ASSIGNED_BLOCKS) {
        throw new HttpsError('resource-exhausted', 'Assigned block scope exceeds the supported limit.');
      }
      assignedBlockIds = new Set(docs.map((doc) => doc.id || doc.data?.()?.id).filter(Boolean));
    } catch (err) {
      handleBackendError(err, 'assigned blocks lookup');
    }
  }

  const timeZone = resolveFarmTimeZone(company?.timeZone);

  return {
    uid: cleanUid,
    companyId: userCompanyId,
    company: { ...company, id: userCompanyId },
    user,
    isOwner,
    isEnterpriseScoped,
    assignedBlockIds,
    timeZone,
  };
};

const assertPondAccess = (pond, auth) => {
  if (auth.isEnterpriseScoped) {
    const blockId = pond.blockId || pond.data?.()?.blockId;
    if (!blockId || !auth.assignedBlockIds.has(blockId)) {
      throw new HttpsError('not-found', 'Pond not found.');
    }
  }
};

const validateLimit = (limit) => {
  if (limit === undefined || limit === null) return DEFAULT_PAGE_LIMIT;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_LIMIT) {
    throw new HttpsError('invalid-argument', `Limit must be an integer between 1 and ${MAX_PAGE_LIMIT}.`);
  }
  return limit;
};

const validateRequiredDateRange = (startDate, endDate) => {
  if (!startDate || typeof startDate !== 'string' || !isValidDateKey(startDate)) {
    throw new HttpsError('invalid-argument', 'startDate is required and must be in YYYY-MM-DD format.');
  }
  if (!endDate || typeof endDate !== 'string' || !isValidDateKey(endDate)) {
    throw new HttpsError('invalid-argument', 'endDate is required and must be in YYYY-MM-DD format.');
  }
  if (startDate > endDate) {
    throw new HttpsError('invalid-argument', 'startDate cannot be after endDate.');
  }
  const startMs = Date.parse(`${startDate}T00:00:00.000Z`);
  const endMs = Date.parse(`${endDate}T00:00:00.000Z`);
  const diffDays = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;
  if (diffDays > MAX_DATE_WINDOW_DAYS) {
    throw new HttpsError(
      'invalid-argument',
      `Date range exceeds maximum allowed window of ${MAX_DATE_WINDOW_DAYS} days.`,
    );
  }
  return diffDays;
};

const listPonds = async ({ db, uid, companyId, limit, cursor, blockId } = {}) => {
  if (!db) throw new Error('Firestore db is required.');
  const pageLimit = validateLimit(limit);
  const auth = await authorizeFarmReader(db, uid, companyId);

  let cursorData = null;
  if (cursor) {
    cursorData = decodeCursor(cursor, {
      route: 'ponds',
      order: '__name__',
      uid: auth.uid,
      companyId: auth.companyId,
      blockId,
    });
  }

  if (blockId !== undefined && blockId !== null) {
    if (!isValidId(blockId)) {
      throw new HttpsError('invalid-argument', 'Invalid blockId format.');
    }
    if (auth.isEnterpriseScoped && !auth.assignedBlockIds.has(blockId)) {
      throw new HttpsError('permission-denied', 'Access denied: requested block is outside assigned scope.');
    }
  }

  const pondsRef = db.collection('companies').doc(auth.companyId).collection('ponds');

  if (auth.isEnterpriseScoped && auth.assignedBlockIds.size === 0) {
    return {
      items: [],
      nextCursor: null,
      cursorRevision: CURRENT_CURSOR_REVISION,
      hasMore: false,
      limit: pageLimit,
    };
  }

  let matchingDocs = [];
  try {
    if (!auth.isEnterpriseScoped) {
      let query = pondsRef.orderBy('__name__');
      if (blockId) query = query.where('blockId', '==', blockId);
      if (cursorData?.id) query = query.startAfter(cursorData.id);
      query = query.limit(pageLimit + 1);
      const snap = await query.get();
      matchingDocs = snap?.docs || [];
    } else {
      const scopedBlocks = blockId ? [blockId] : [...auth.assignedBlockIds].sort();
      const blockChunks = [];
      for (let i = 0; i < scopedBlocks.length; i += FIRESTORE_IN_FILTER_LIMIT) {
        blockChunks.push(scopedBlocks.slice(i, i + FIRESTORE_IN_FILTER_LIMIT));
      }

      const pageCandidates = [];
      for (const blockChunk of blockChunks) {
        let query = pondsRef.where('blockId', 'in', blockChunk).orderBy('__name__');
        if (cursorData?.id) query = query.startAfter(cursorData.id);
        query = query.limit(pageLimit + 1);
        const snap = await query.get();
        pageCandidates.push(...(snap?.docs || []));
      }

      const uniqueById = new Map(pageCandidates.map((doc) => [doc.id, doc]));
      matchingDocs = [...uniqueById.values()]
        .sort((a, b) => a.id.localeCompare(b.id))
        .slice(0, pageLimit + 1);
    }
  } catch (err) {
    handleBackendError(err, 'listing ponds');
  }

  const hasMore = matchingDocs.length > pageLimit;
  const pageDocs = hasMore ? matchingDocs.slice(0, pageLimit) : matchingDocs;
  const lastDoc = pageDocs.length > 0 ? pageDocs[pageDocs.length - 1] : null;

  const nextCursor =
    hasMore && lastDoc
      ? encodeCursor({
          id: lastDoc.id,
          revision: CURRENT_CURSOR_REVISION,
          uid: auth.uid,
          companyId: auth.companyId,
          blockId: blockId ? String(blockId) : null,
          route: 'ponds',
          order: '__name__',
        })
      : null;

  return {
    items: pageDocs.map((doc) => toPondDto(doc.data?.() || {}, doc.id)),
    nextCursor,
    cursorRevision: CURRENT_CURSOR_REVISION,
    hasMore,
    limit: pageLimit,
  };
};

const getPondSummary = async ({ db, uid, companyId, pondId } = {}) => {
  if (!db) throw new Error('Firestore db is required.');
  if (!isValidId(pondId)) {
    throw new HttpsError('invalid-argument', 'Invalid pondId.');
  }
  const auth = await authorizeFarmReader(db, uid, companyId);

  let pondSnap;
  try {
    pondSnap = await db.collection('companies').doc(auth.companyId).collection('ponds').doc(pondId.trim()).get();
  } catch (err) {
    handleBackendError(err, 'reading pond summary');
  }

  if (!pondSnap?.exists) {
    throw new HttpsError('not-found', 'Pond not found.');
  }

  const pond = pondSnap.data?.() || {};
  assertPondAccess(pond, auth);

  return toPondSummaryDto(pond, pondSnap.id, auth.timeZone);
};

const getWaterQualityRecords = async ({
  db,
  uid,
  companyId,
  pondId,
  limit,
  cursor,
  startDate,
  endDate,
} = {}) => {
  if (!db) throw new Error('Firestore db is required.');
  if (!isValidId(pondId)) {
    throw new HttpsError('invalid-argument', 'Invalid pondId.');
  }
  const pageLimit = validateLimit(limit);
  const diffDays = validateRequiredDateRange(startDate, endDate);

  const auth = await authorizeFarmReader(db, uid, companyId);

  let pondSnap;
  try {
    pondSnap = await db.collection('companies').doc(auth.companyId).collection('ponds').doc(pondId.trim()).get();
  } catch (err) {
    handleBackendError(err, 'reading pond for water quality records');
  }

  if (!pondSnap?.exists) {
    throw new HttpsError('not-found', 'Pond not found.');
  }

  const pond = pondSnap.data?.() || {};
  assertPondAccess(pond, auth);

  const samplings = Array.isArray(pond.samplings) ? pond.samplings : [];
  const samplingsDigest = computeSamplingsDigest(samplings);

  let cursorData = null;
  if (cursor) {
    cursorData = decodeCursor(cursor, {
      route: 'water-quality',
      order: 'date_id',
      uid: auth.uid,
      companyId: auth.companyId,
      pondId: pondSnap.id,
      startDate,
      endDate,
      digest: samplingsDigest,
    });
  }

  // Filter records: has water quality data, date is valid and in range
  let waterRecords = samplings.filter(hasWaterQualityData);
  waterRecords = waterRecords.filter((r) => {
    const dk = normalizeFarmDateKey(r.measuredAt || r.observedAt || r.date, auth.timeZone);
    return dk && dk >= startDate && dk <= endDate;
  });

  // Sort by normalized farm date/time, then id
  waterRecords.sort((a, b) => {
    const da = normalizeFarmDateKey(a.measuredAt || a.observedAt || a.date, auth.timeZone) || '';
    const db = normalizeFarmDateKey(b.measuredAt || b.observedAt || b.date, auth.timeZone) || '';
    if (da !== db) return da.localeCompare(db);
    const ta = parseTimestampMs(a.measuredAt || a.observedAt) ?? 0;
    const tb = parseTimestampMs(b.measuredAt || b.observedAt) ?? 0;
    if (ta !== tb) return ta - tb;
    const ida = getDeterministicRecordId(a, pondSnap.id);
    const idb = getDeterministicRecordId(b, pondSnap.id);
    return ida.localeCompare(idb);
  });

  let startIndex = 0;
  if (cursorData) {
    if (cursorData.offset >= waterRecords.length) {
      throw new HttpsError('invalid-argument', 'Cursor offset is outside the filtered records.');
    }
    startIndex = cursorData.offset;
  }

  const remaining = waterRecords.slice(startIndex);
  const hasMore = remaining.length > pageLimit;
  const pageItems = hasMore ? remaining.slice(0, pageLimit) : remaining;
  const lastItem = pageItems.length > 0 ? pageItems[pageItems.length - 1] : null;
  const lastItemId = lastItem ? getDeterministicRecordId(lastItem, pondSnap.id, startIndex + pageItems.length - 1) : null;

  const nextCursor =
    hasMore && lastItemId
      ? encodeCursor({
          id: lastItemId,
          revision: CURRENT_CURSOR_REVISION,
          uid: auth.uid,
          companyId: auth.companyId,
          pondId: pondSnap.id,
          startDate,
          endDate,
          digest: samplingsDigest,
          offset: startIndex + pageItems.length,
          route: 'water-quality',
          order: 'date_id',
        })
      : null;

  return {
    pondId: pondSnap.id,
    startDate,
    endDate,
    limit: pageLimit,
    dataCoverage: {
      requestedDays: diffDays,
      recordedDays: new Set(waterRecords.map((record) =>
        normalizeFarmDateKey(record.measuredAt || record.observedAt || record.date, auth.timeZone),
      )).size,
      observationCount: waterRecords.length,
    },
    items: pageItems.map((s, idx) => toWaterQualityRecordDto(s, pondSnap.id, startIndex + idx, auth.timeZone)),
    nextCursor,
    cursorRevision: CURRENT_CURSOR_REVISION,
    hasMore,
  };
};

const getFeedSummary = async ({
  db,
  uid,
  companyId,
  pondId,
  limit,
  cursor,
  startDate,
  endDate,
} = {}) => {
  if (!db) throw new Error('Firestore db is required.');
  if (!isValidId(pondId)) {
    throw new HttpsError('invalid-argument', 'Invalid pondId.');
  }
  const pageLimit = validateLimit(limit);
  const diffDays = validateRequiredDateRange(startDate, endDate);

  const auth = await authorizeFarmReader(db, uid, companyId);

  let pondSnap;
  try {
    pondSnap = await db.collection('companies').doc(auth.companyId).collection('ponds').doc(pondId.trim()).get();
  } catch (err) {
    handleBackendError(err, 'reading pond for feed records');
  }

  if (!pondSnap?.exists) {
    throw new HttpsError('not-found', 'Pond not found.');
  }

  const pond = pondSnap.data?.() || {};
  assertPondAccess(pond, auth);

  const samplings = Array.isArray(pond.samplings) ? pond.samplings : [];
  const samplingsDigest = computeSamplingsDigest(samplings);

  let cursorData = null;
  if (cursor) {
    cursorData = decodeCursor(cursor, {
      route: 'feed-summary',
      order: 'date_id',
      uid: auth.uid,
      companyId: auth.companyId,
      pondId: pondSnap.id,
      startDate,
      endDate,
      digest: samplingsDigest,
    });
  }

  // Canonical daily feed selection using selectDailyFeedEntries
  const sanitizedList = samplings
    .map((s, idx) => sanitizeSamplingForDailyFeed(s, pondSnap.id, idx))
    .filter(Boolean);

  const dailyEntries = selectDailyFeedEntries(sanitizedList, {
    timeZone: auth.timeZone,
    allowSamplingEstimate: false,
    asOfDate: getFarmDateKey(new Date(), auth.timeZone),
  });

  const filteredEntries = dailyEntries.filter((e) => e.farmDate >= startDate && e.farmDate <= endDate);

  let totalFeedKg = 0;
  let explicitZeroDays = 0;
  for (const entry of filteredEntries) {
    if (entry.feedKg === 0) {
      explicitZeroDays += 1;
    } else {
      totalFeedKg += entry.feedKg;
    }
  }

  let startIndex = 0;
  if (cursorData) {
    if (cursorData.offset >= filteredEntries.length) {
      throw new HttpsError('invalid-argument', 'Cursor offset is outside the filtered records.');
    }
    startIndex = cursorData.offset;
  }

  const remaining = filteredEntries.slice(startIndex);
  const hasMore = remaining.length > pageLimit;
  const pageItems = hasMore ? remaining.slice(0, pageLimit) : remaining;
  const lastItem = pageItems.length > 0 ? pageItems[pageItems.length - 1] : null;
  const lastItemId = lastItem ? lastItem.farmDate : null;

  const nextCursor =
    hasMore && lastItemId
      ? encodeCursor({
          id: String(lastItemId),
          revision: CURRENT_CURSOR_REVISION,
          uid: auth.uid,
          companyId: auth.companyId,
          pondId: pondSnap.id,
          startDate,
          endDate,
          digest: samplingsDigest,
          offset: startIndex + pageItems.length,
          route: 'feed-summary',
          order: 'date_id',
        })
      : null;

  return {
    pondId: pondSnap.id,
    startDate,
    endDate,
    limit: pageLimit,
    totalFeedKg: finiteNumber(totalFeedKg, 2) || 0,
    unit: 'kg',
    dataCoverage: {
      requestedDays: diffDays,
      recordedDays: filteredEntries.length,
      explicitZeroDays,
    },
    items: pageItems.map((entry) => toFeedRecordDtoFromCanonical(entry, pondSnap.id)),
    nextCursor,
    cursorRevision: CURRENT_CURSOR_REVISION,
    hasMore,
  };
};

const getFeedRecords = (params = {}) => getFeedSummary(params);

class ReadOnlyFarmApi {
  constructor({ db } = {}) {
    if (!db) throw new Error('ReadOnlyFarmApi requires a Firestore db instance.');
    this.db = db;
  }

  listPonds(params = {}) {
    return listPonds({ db: this.db, ...params });
  }

  list(params = {}) {
    return listPonds({ db: this.db, ...params });
  }

  getPondSummary(params = {}) {
    return getPondSummary({ db: this.db, ...params });
  }

  getWaterQualityRecords(params = {}) {
    return getWaterQualityRecords({ db: this.db, ...params });
  }

  getFeedSummary(params = {}) {
    return getFeedSummary({ db: this.db, ...params });
  }

  getFeedRecords(params = {}) {
    return getFeedSummary({ db: this.db, ...params });
  }

  authorize(params = {}) {
    return authorizeFarmReader(this.db, params.uid, params.companyId);
  }
}

const createReadOnlyFarmApi = ({ db } = {}) => {
  return new ReadOnlyFarmApi({ db });
};

module.exports = {
  createReadOnlyFarmApi,
  ReadOnlyFarmApi,
  listPonds,
  getPondSummary,
  getWaterQualityRecords,
  getFeedSummary,
  getFeedRecords,
  authorizeFarmReader,
  encodeCursor,
  decodeCursor,
  computeSamplingsDigest,
  extractRealDailyFeed,
  sanitizeSamplingForDailyFeed,
  CURRENT_CURSOR_REVISION,
  MAX_PAGE_LIMIT,
  DEFAULT_PAGE_LIMIT,
  MAX_DATE_WINDOW_DAYS,
  toPondDto,
  toPondSummaryDto,
  toWaterQualityRecordDto,
  toFeedRecordDto,
  toFeedRecordDtoFromCanonical,
  hasWaterQualityData,
  hasFeedData,
  getDeterministicRecordId,
};
