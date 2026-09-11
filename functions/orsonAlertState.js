const { createHash } = require('node:crypto');

const eventKey = (companyId, pondId, cycleId, finding) => createHash('sha256')
  .update(JSON.stringify([companyId, pondId, cycleId, finding.id, finding.eventDate]))
  .digest('hex');

const notificationSourceDate = (notification, riskId) => {
  const reportFinding = notification.orsonRiskReport?.findings?.find(finding => !riskId || finding.id === riskId);
  const candidate = notification.data?.sourceDate || notification.sourceDate || reportFinding?.eventDate
    || notification.message?.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  return typeof candidate === 'string' ? candidate.slice(0, 10) : null;
};

const syncRiskAlerts = async ({ db, companyId, pondId, calculateRiskReport, timestamp, priority, eventFindings = [] }) => {
  const pondRef = db.collection('companies').doc(companyId).collection('ponds').doc(pondId);
  return db.runTransaction(async transaction => {
    const pondSnapshot = await transaction.get(pondRef);
    if (!pondSnapshot.exists) return { notified: false };
    const pond = pondSnapshot.data();
    const report = calculateRiskReport(pond, pondId);
    const cycleId = pond.pondCycleId || pond.cycleId || pond.docStart || pondId;
    const latestDate = (pond.samplings || []).map(record => record.date).filter(Boolean).sort().pop() || null;
    const activeFindings = report.findings.filter(finding => ['warning', 'critical'].includes(finding.severity))
      .map(finding => ({ ...finding, eventDate: finding.eventDate || latestDate, status: 'active' }));
    const findings = [...activeFindings, ...eventFindings.map(finding => ({ ...finding, status: 'historical' }))];
    const existing = await transaction.get(db.collection('notifications').where('companyId', '==', companyId).where('type', '==', 'orson_risk'));
    const relevant = existing.docs.filter(snapshot => (snapshot.data().pondId || snapshot.data().data?.pondId) === pondId);
    const keys = new Set();
    let notified = false;
    for (const finding of pond.cycleStatus === 'ended' ? [] : findings) {
      if (!finding.eventDate) continue;
      const key = eventKey(companyId, pondId, cycleId, finding);
      if (keys.has(key)) continue;
      keys.add(key);
      const previous = relevant.find(snapshot => {
        const value = snapshot.data();
        return value.dedupeKey === key || (!value.dedupeKey && value.data?.riskId === finding.id
          && notificationSourceDate(value, finding.id) === finding.eventDate);
      });
      if (previous) {
        if (previous.data().dedupeKey === key) transaction.update(previous.ref, {
          'data.status': previous.data().data?.status === 'resolved' ? 'resolved' : finding.status,
          'data.lastEvaluatedDate': latestDate, updatedAt: timestamp(),
          ...(previous.data().createdAt == null && previous.data().timestamp != null
            ? { createdAt: previous.data().timestamp } : {}),
        });
        continue;
      }
      const createdAt = timestamp();
      transaction.set(db.collection('notifications').doc(`orson-${key}`), {
        companyId, pondId, pondName: report.pondName, type: 'orson_risk',
        title: `Orson: ${report.pondName} ${finding.title}`,
        message: `${finding.summary} ${finding.recommendation}`,
        timestamp: createdAt, createdAt, updatedAt: createdAt, read: false, priority: priority(finding.severity, finding.id),
        isOrson: true, icon: 'brain-circuit', dedupeKey: key,
        data: { isOrson: true, pondId, pondName: report.pondName, cycleId, riskId: finding.id,
          severity: finding.severity, sourceDate: finding.eventDate, lastEvaluatedDate: latestDate, status: finding.status },
      });
      notified = true;
    }
    for (const snapshot of relevant) {
      const value = snapshot.data();
      if (!value.dedupeKey || !['active', 'historical'].includes(value.data?.status) || keys.has(value.dedupeKey)) continue;
      const recovered = hasRecovery(pond.samplings || [], value.data.riskId, value.data.sourceDate);
      transaction.update(snapshot.ref, {
        'data.status': recovered ? 'resolved' : 'historical', 'data.lastEvaluatedDate': latestDate,
        updatedAt: timestamp(),
        ...(value.createdAt == null && value.timestamp != null ? { createdAt: value.timestamp } : {}),
        ...(recovered && value.resolvedAt == null ? { resolvedAt: timestamp() } : {}),
      });
    }
    return { notified, report };
  });
};

const hasRecovery = (records, riskId, sourceDate) => records.some(record => {
  if (!sourceDate || record.date <= sourceDate) return false;
  const readings = [record.doMorning, record.doEvening].filter(value => value !== '' && value != null).map(Number);
  if (riskId === 'heavy_rain_low_do' || riskId === 'low_do') return readings.length > 0 && readings.every(value => Number.isFinite(value) && value >= 5);
  if (riskId === 'weak_feeding_response') return record.feedData?.feedingResponse === 'normal';
  if (riskId === 'abnormal_shrimp_behaviour') return record.shrimpBehaviour === 'normal';
  if (riskId === 'high_sludge_load') return record.sludgeLoad === 'low';
  return false;
});

module.exports = { eventKey, hasRecovery, syncRiskAlerts };
