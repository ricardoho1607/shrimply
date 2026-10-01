const { createHash } = require('node:crypto');
const { normalizeFarmDateKey, getFarmDateKey } = require('./shared/orsonDomain/farmDate');
const { evaluateMeasurementFreshness, extractMeasurementProvenanceDateKey } = require('./shared/orsonDomain/orsonEvidence');

const eventKey = (companyId, pondId, cycleId, finding) => createHash('sha256')
  .update(JSON.stringify([companyId, pondId, cycleId, finding.id, finding.eventDate]))
  .digest('hex');

const notificationSourceDate = (notification, riskId, timeZone = 'UTC') => {
  const reportFinding = notification.orsonRiskReport?.findings?.find(finding => !riskId || finding.id === riskId);
  const candidate = notification.data?.sourceDate
    || notification.data?.eventDate
    || notification.sourceDate
    || reportFinding?.eventDate
    || notification.message?.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  if (!candidate) return null;
  return normalizeFarmDateKey(candidate, timeZone) || (typeof candidate === 'string' ? candidate.slice(0, 10) : null);
};

const hasRecovery = (records, riskId, sourceDate, options = {}) => {
  const timeZone = options.timeZone || 'UTC';
  const normSourceDate = normalizeFarmDateKey(sourceDate, timeZone);
  if (!normSourceDate) return false;

  const asOf = options.asOfDate || options.now || new Date();
  const asOfDateKey = normalizeFarmDateKey(asOf, timeZone) || getFarmDateKey(asOf, timeZone);

  const list = Array.isArray(records) ? records : [];
  return list.some(record => {
    if (!record) return false;
    const rawDate = extractMeasurementProvenanceDateKey(record, timeZone) || record.date;
    const recordDate = normalizeFarmDateKey(rawDate, timeZone);
    if (!recordDate) return false;

    // Only a valid strictly later measurement resolves
    if (recordDate <= normSourceDate) return false;
    // Cannot be in the future relative to evaluation asOfDate
    if (recordDate > asOfDateKey) return false;

    // Freshness check: stale normal data cannot resolve
    const domain = (riskId === 'weak_feeding_response' || riskId === 'feed_allocation_drop' || riskId === 'feed_pressure_high')
      ? 'dailyFeed'
      : (riskId === 'abnormal_shrimp_behaviour' || riskId === 'high_sludge_load')
        ? 'operations'
        : 'water';

    const freshness = evaluateMeasurementFreshness(record, asOf, { domain, timeZone });
    if (!freshness.isFresh) {
      // Stale normal data cannot resolve a newer warning
      return false;
    }

    const readings = [record.doMorning, record.doEvening]
      .filter(value => value !== '' && value != null)
      .map(Number);

    if (riskId === 'heavy_rain_low_do' || riskId === 'low_do' || riskId === 'do_decline') {
      return readings.length > 0 && readings.every(value => Number.isFinite(value) && value >= 5);
    }
    if (riskId === 'weak_feeding_response') {
      const response = record.feedData?.feedingResponse ?? record.feedingResponse;
      return response === 'normal' || response === 'strong';
    }
    if (riskId === 'abnormal_shrimp_behaviour') {
      return record.shrimpBehaviour === 'normal';
    }
    if (riskId === 'high_sludge_load') {
      return record.sludgeLoad === 'low' || record.sludgeLoad === 'normal';
    }
    if (riskId === 'unsafe_ph' || riskId === 'ph_instability') {
      const morning = Number(record.phMorning);
      const evening = Number(record.phEvening);
      if (Number.isFinite(morning) && Number.isFinite(evening)) {
        return morning >= 7.0 && morning <= 8.5 && evening >= 7.0 && evening <= 8.5 && Math.abs(evening - morning) <= 0.5;
      }
      return false;
    }
    if (riskId === 'low_do_high_temperature' || riskId === 'low_do_high_tan' || riskId === 'high_nitrite_low_do') {
      return readings.length > 0 && readings.every(value => Number.isFinite(value) && value >= 5);
    }
    if (riskId === 'mortality_spike') {
      const mort = Number(record.mortality ?? record.mortalityCount);
      return Number.isFinite(mort) && mort === 0;
    }
    return false;
  });
};

const syncRiskAlerts = async ({
  db,
  companyId,
  pondId,
  calculateRiskReport,
  timestamp,
  priority,
  eventFindings = [],
  asOfDate = null,
  options = {},
}) => {
  const pondRef = db.collection('companies').doc(companyId).collection('ponds').doc(pondId);
  return db.runTransaction(async transaction => {
    const pondSnapshot = await transaction.get(pondRef);
    if (!pondSnapshot.exists) return { notified: false };
    const pond = pondSnapshot.data() || {};
    const timeZone = options.timeZone || pond.timeZone || 'UTC';
    const asOf = asOfDate || options.asOfDate || options.now || new Date();
    const report = calculateRiskReport(pond, pondId, { asOfDate: asOf, timeZone });
    const cycleId = pond.pondCycleId || pond.cycleId || pond.docStart || pondId;
    const latestDate = (pond.samplings || [])
      .map(record => extractMeasurementProvenanceDateKey(record, timeZone))
      .filter(Boolean)
      .sort()
      .pop() || null;
    const activeFindings = report.findings
      .filter(finding => ['warning', 'critical'].includes(finding.severity))
      .map(finding => ({ ...finding, status: 'active' }));

    const findings = [...activeFindings, ...eventFindings.map(finding => ({ ...finding, status: 'historical' }))];
    const existing = await transaction.get(
      db.collection('notifications').where('companyId', '==', companyId).where('type', '==', 'orson_risk')
    );
    const relevant = existing.docs.filter(snapshot => (snapshot.data().pondId || snapshot.data().data?.pondId) === pondId);
    const keys = new Set();
    let notified = false;

    for (const finding of pond.cycleStatus === 'ended' ? [] : findings) {
      if (!finding.eventDate) continue;
      const key = eventKey(companyId, pondId, cycleId, finding);
      if (keys.has(key)) continue;
      keys.add(key);

      const previous = relevant.find(snapshot => {
        const value = snapshot.data() || {};
        return value.dedupeKey === key || (!value.dedupeKey && value.data?.riskId === finding.id
          && notificationSourceDate(value, finding.id, timeZone) === finding.eventDate);
      });

      if (previous) {
        const prevData = previous.data() || {};
        // Resolved events remain resolved; otherwise keep finding status
        const nextStatus = prevData.data?.status === 'resolved' ? 'resolved' : finding.status;
        transaction.update(previous.ref, {
          'data.status': nextStatus,
          'data.lastEvaluatedDate': latestDate,
          updatedAt: timestamp(),
          ...(prevData.dedupeKey == null ? { dedupeKey: key } : {}),
          ...(prevData.createdAt == null && prevData.timestamp != null
            ? { createdAt: prevData.timestamp } : {}),
        });
        continue;
      }

      const createdAt = timestamp();
      transaction.set(db.collection('notifications').doc(`orson-${key}`), {
        companyId,
        pondId,
        pondName: report.pondName,
        type: 'orson_risk',
        title: `Orson: ${report.pondName} ${finding.title}`,
        message: `${finding.summary} ${finding.recommendation}`,
        timestamp: createdAt,
        createdAt,
        updatedAt: createdAt,
        read: false,
        priority: priority(finding.severity, finding.id),
        isOrson: true,
        icon: 'brain-circuit',
        dedupeKey: key,
        data: {
          isOrson: true,
          pondId,
          pondName: report.pondName,
          cycleId,
          riskId: finding.id,
          severity: finding.severity,
          sourceDate: finding.eventDate,
          lastEvaluatedDate: latestDate,
          status: finding.status,
        },
      });
      notified = true;
    }

    for (const snapshot of relevant) {
      const value = snapshot.data() || {};
      const currentStatus = value.data?.status;
      // Skip if already resolved or outside active/historical
      if (!['active', 'historical'].includes(currentStatus)) continue;

      const key = value.dedupeKey || (value.data?.riskId ? eventKey(companyId, pondId, cycleId, {
        id: value.data.riskId,
        eventDate: notificationSourceDate(value, value.data.riskId),
      }) : null);

      if (key && keys.has(key)) continue;

      const sourceDate = value.data?.sourceDate || notificationSourceDate(value, value.data?.riskId, timeZone);
      const recovered = hasRecovery(pond.samplings || [], value.data?.riskId, sourceDate, {
        asOfDate: asOf,
        timeZone,
      });

      // Staleness alone may transition active -> historical, but NEVER resolves it alone.
      // Only a valid later measurement resolves.
      const nextStatus = recovered ? 'resolved' : 'historical';

      transaction.update(snapshot.ref, {
        'data.status': nextStatus,
        'data.lastEvaluatedDate': latestDate,
        updatedAt: timestamp(),
        ...(value.dedupeKey == null && key ? { dedupeKey: key } : {}),
        ...(value.createdAt == null && value.timestamp != null ? { createdAt: value.timestamp } : {}),
        ...(recovered && value.resolvedAt == null ? { resolvedAt: timestamp() } : {}),
      });
    }

    return { notified, report };
  });
};

module.exports = { eventKey, hasRecovery, syncRiskAlerts };
