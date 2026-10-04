'use strict';

const { resolveEntitlements, resolveBaseEntitlements, hasLifetimeGrant, activeOverride } = require('./shared/companyEntitlements');
const { protectedIdentity } = require('./founderManagement');
const DAY = 86400000;
const iso = value => {
  if (value == null) return null;
  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
};
const number = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
const rows = snapshot => snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
const metric = (value, source, unit) => ({ value, status: value == null ? 'unavailable' : 'recorded', source, unit });
const present = value => value !== undefined && value !== null && value !== '';
const WATER_FIELDS = ['phMorning', 'phEvening', 'doMorning', 'doEvening', 'transparency', 'salinity', 'temperature', 'waterAppearance', 'waterDepthCm', 'alkalinity', 'ammonia', 'operationalNotes', 'weatherEvent', 'waterExchangePercent', 'sludgeLoad', 'surfaceScum', 'shrimpBehaviour'];

function farmRecords(ponds) {
  return ponds.flatMap(pond => (Array.isArray(pond.samplings) ? pond.samplings : []).flatMap((record, index) => {
    if (record.isBaselineEstimate || record.source === 'midcycle_onboarding') return [];
    const date = iso(record.date);
    if (!date) return [];
    const kinds = [];
    if (record.feedData?.feedEntryStatus === 'fasted' || record.feedEntryStatus === 'fasted' || (present(record.feedData?.totalDailyFeed) && Number.isFinite(Number(record.feedData.totalDailyFeed)))) kinds.push('feeding');
    if (Number(record.mbw ?? record.abw) > 0) kinds.push('sampling');
    if (WATER_FIELDS.some(key => present(record[key]))) kinds.push('waterQuality');
    return kinds.map(kind => ({ id: `${pond.id}:${record.id ?? index}:${kind}`, pondId: pond.id, kind, date, source: `companies/${pond.companyId}/ponds/${pond.id}/samplings` }));
  }));
}

function paidPayment(payment) {
  return payment.environment === 'production' && payment.currency === 'IDR' && number(payment.amount) !== null && payment.amount >= 0 && (payment.status === 'settlement' || (payment.status === 'capture' && payment.fraudStatus === 'accept'));
}
function paymentDate(payment) {
  // Midtrans settlement_time has no timezone. Prefer the server activation timestamp.
  return iso(payment.activatedAt) || (typeof payment.settlementTime === 'string' && /[TZ]|[+-]\d\d:?\d\d$/.test(payment.settlementTime) ? iso(payment.settlementTime) : null);
}

async function loadData(db, auth, now = Date.now()) {
  const [companySnapshot, userSnapshot, joinSnapshot, auditSnapshot, accessSnapshot, triageSnapshot] = await Promise.all([
    db.collection('companies').get(), db.collection('users').get(), db.collection('joinRequests').get(), db.collection('founderAudit').orderBy('createdAt', 'desc').limit(1000).get(), db.collection('founderUserAccess').get(), db.collection('founderAttention').get(),
  ]);
  const access = new Map(rows(accessSnapshot).map(row => [row.id, row]));
  const authUsers = new Map();
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    page.users.forEach(user => authUsers.set(user.uid, user));
    pageToken = page.pageToken;
  } while (pageToken);
  const users = rows(userSnapshot).filter(user => user.founderAccountDeleted !== true).map(user => {
    const identity = authUsers.get(user.id);
    return { id: user.id, name: user.name || user.displayName || identity?.displayName || 'Unnamed user', email: identity?.email ?? user.email ?? null, companyId: user.companyId ?? null, role: user.role ?? null, disabled: identity ? identity.disabled : null, lastSignInAt: iso(identity?.metadata.lastSignInTime), accessRevision: access.get(user.id)?.revision || 0, accessPending: !!access.get(user.id)?.pendingOperationId, accessProtected: identity ? protectedIdentity(identity) : true, createdAt: iso(user.createdAt || identity?.metadata.creationTime) };
  });
  for (const identity of authUsers.values()) {
    if (!users.some(user => user.id === identity.uid)) users.push({ id: identity.uid, name: identity.displayName || 'No profile', email: identity.email ?? null, companyId: null, role: null, disabled: identity.disabled, lastSignInAt: iso(identity.metadata.lastSignInTime), accessRevision: access.get(identity.uid)?.revision || 0, accessPending: !!access.get(identity.uid)?.pendingOperationId, accessProtected: protectedIdentity(identity), createdAt: iso(identity.metadata.creationTime) });
  }
  const monthKey = new Date(now).toISOString().slice(0, 7);
  const companies = [];
  // Bound concurrency to keep reads predictable for the founder's small directory.
  const sourceCompanies = rows(companySnapshot);
  for (let offset = 0; offset < sourceCompanies.length; offset += 5) {
    const batch = await Promise.all(sourceCompanies.slice(offset, offset + 5).map(async source => {
      const ref = db.collection('companies').doc(source.id);
      const [ponds, physicalPonds, cycles, entitlement, billing, grant, payments, usage, monthly, cost, feeds, additives, notes, override] = await Promise.all([
        ref.collection('ponds').get(), ref.collection('physicalPonds').get(), ref.collection('cycles').get(),
        ref.collection('entitlements').doc('current').get(), ref.collection('billing').doc('current').get(), ref.collection('subscriptionGrants').doc('current').get(),
        ref.collection('billingPayments').get(), ref.collection('orsonUsage').where('__name__', '>=', new Date(Math.min(now - 30 * DAY, Date.parse(monthKey + '-01T00:00:00Z'))).toISOString().slice(0, 10)).get(),
        ref.collection('orsonUsageMonthly').doc(monthKey).get(), ref.collection('orsonCost').doc(monthKey).get(),
        ref.collection('feeds').limit(1).get(), ref.collection('additives').limit(1).get(), ref.collection('founderNotes').orderBy('createdAt', 'desc').limit(100).get(), ref.collection('accessOverrides').doc('current').get(),
      ]);
      const effective = resolveEntitlements(entitlement.data(), source, now, grant.data(), override.data());
      const base = resolveBaseEntitlements(entitlement.data(), source, now, grant.data());
      const temporary = override.data();
      const lifetime = hasLifetimeGrant(grant.data());
      const storedBilling = billing.data() || {};
      const history = rows(payments).map(payment => ({ ...payment, createdAt: iso(payment.createdAt), activatedAt: iso(payment.activatedAt), recordedPaymentAt: paymentDate(payment) }));
      const records = farmRecords(rows(ponds).map(pond => ({ ...pond, companyId: source.id }))).sort((a, b) => b.date.localeCompare(a.date));
      const count = (kind, days) => records.filter(record => record.kind === kind && Date.parse(record.date) >= now - days * DAY && Date.parse(record.date) <= now).length;
      const active = days => records.some(record => Date.parse(record.date) >= now - days * DAY && Date.parse(record.date) <= now);
      const paidPlanId = ['plus', 'pro'].includes(storedBilling.planId) ? storedBilling.planId : null;
      const subscription = { companyId: source.id, companyName: source.companyName || source.name || 'Unnamed company', paidPlanId, billingStatus: storedBilling.status ?? null, effectivePlanId: effective.planId, accessSource: lifetime ? 'lifetime' : effective.complimentaryAccess ? 'complimentary' : paidPlanId && ['active', 'grace'].includes(base.status) ? 'paid' : base.planId === 'legacy' ? 'early_access' : 'free', paidPeriodStart: iso(storedBilling.currentPeriodStart), paidPeriodEnd: iso(storedBilling.currentPeriodEnd), graceUntil: iso(storedBilling.graceUntil), lifetime, override: temporary ? { ...temporary, startsAt: iso(temporary.startsAt), expiresAt: iso(temporary.expiresAt), status: temporary.status === 'active' ? (lifetime ? 'superseded' : activeOverride(temporary, now) ? 'active' : 'expired') : temporary.status } : null, payments: history };
      const company = { id: source.id, name: subscription.companyName, ownerId: source.ownerId ?? null, timeZone: source.timeZone ?? null, createdAt: iso(source.createdAt), memberCount: users.filter(user => user.companyId === source.id).length, physicalPondCount: physicalPonds.size, activeCycleCount: rows(ponds).filter(pond => pond.cycleStatus === 'active').length, lastActivityAt: records.find(record => Date.parse(record.date) <= now)?.date ?? null, activity7d: active(7), activity30d: active(30), paidPlanId, effectivePlanId: effective.planId, accessSource: subscription.accessSource, accessExpiresAt: lifetime ? null : iso(effective.complimentaryAccess?.expiresAt || effective.currentPeriodEnd || effective.graceUntil), overrideRevision: temporary?.revision || 0 };
      const dailyUsage = rows(usage).filter(row => /^\d{4}-\d{2}-\d{2}$/.test(row.id));
      const monthUsage = dailyUsage.filter(row => row.id.startsWith(monthKey));
      const sumUsage = key => monthUsage.length ? monthUsage.reduce((total, row) => total + (number(row.functions?.[key]) ?? 0), 0) : null;
      const costData = cost.data();
      const orson = { companyId: source.id, companyName: company.name, monthKey, reservedChat: sumUsage('chat'), reservedProjection: sumUsage('projection'), reservedTotal: number(monthly.data()?.total), monthlyLimit: number(effective.orson?.monthlyTotal), monthlyLimitUnlimited: effective.orson?.monthlyTotal === null, estimatedCostUsd: number(costData?.estimatedCostUsdMicros) === null ? null : costData.estimatedCostUsdMicros / 1e6, inputTokens: number(costData?.inputTokens), outputTokens: number(costData?.outputTokens), costRecordedAt: iso(costData?.updatedAt) };
      return { company, subscription, records, dailyUsage, orson, billing: storedBilling, adoption: { companyId: source.id, companyName: company.name, feeding7d: count('feeding', 7), sampling7d: count('sampling', 7), waterQuality7d: count('waterQuality', 7), feeding30d: count('feeding', 30), sampling30d: count('sampling', 30), waterQuality30d: count('waterQuality', 30), inventory: !feeds.empty || !additives.empty, orson: dailyUsage.length > 0, lastActivityAt: company.lastActivityAt }, detail: { company, members: users.filter(user => user.companyId === source.id), physicalPonds: rows(physicalPonds), cycles: rows(cycles), recentRecords: records.slice(0, 100), subscription, notes: rows(notes).map(note => ({ id: note.id, text: note.text, createdAt: iso(note.createdAt) })) } };
    }));
    companies.push(...batch);
  }
  return { companies, users, joins: rows(joinSnapshot), audit: rows(auditSnapshot).map(entry => ({ ...entry, createdAt: iso(entry.createdAt) })), triage: rows(triageSnapshot), asOf: new Date(now).toISOString(), now };
}

function overview(snapshot, days) {
  const { companies, users, now } = snapshot;
  const since = now - days * DAY;
  const payments = new Map();
  for (const item of companies) for (const payment of item.subscription.payments) {
    if (paidPayment(payment)) payments.set(payment.transactionId || payment.orderId || `${item.company.id}:${payment.id}`, payment);
  }
  const currentPaid = companies.filter(item => !item.subscription.lifetime && item.subscription.paidPlanId && ['active', 'grace'].includes(item.subscription.billingStatus) && item.subscription.payments.some(payment => payment.orderId === item.billing.latestOrderId && paidPayment(payment)) && Date.parse(item.subscription.paidPeriodEnd) > now);
  const normalized = currentPaid.map(item => {
    const payment = item.subscription.payments.find(entry => entry.orderId === item.billing.latestOrderId && paidPayment(entry));
    const months = { monthly: 1, cycle: 4, annual: 12 }[payment?.interval];
    return payment && months ? payment.amount / months : null;
  });
  const costs = companies.map(item => item.orson.estimatedCostUsd).filter(value => value !== null);
  const reservations = companies.flatMap(item => item.dailyUsage).filter(row => Date.parse(`${row.id}T00:00:00Z`) >= since && Date.parse(`${row.id}T00:00:00Z`) <= now);
  return {
    companies: metric(companies.length, 'companies'), users: metric(users.length, 'Firebase Authentication + users'),
    activeCompanies7d: metric(companies.filter(item => item.company.activity7d).length, 'Persisted feeding, sampling or water-quality records'),
    activeCompanies30d: metric(companies.filter(item => item.company.activity30d).length, 'Persisted feeding, sampling or water-quality records'),
    paidCompanies: metric(currentPaid.length, 'Active production prepaid contracts'),
    collectedPaymentsIdr: metric([...payments.values()].filter(payment => Date.parse(payment.recordedPaymentAt) >= since && Date.parse(payment.recordedPaymentAt) <= now).reduce((sum, payment) => sum + payment.amount, 0), 'Verified production payments in selected period', 'IDR'),
    normalizedPaidContractMonthlyValueIdr: metric(normalized.some(value => value === null) ? null : normalized.reduce((sum, value) => sum + value, 0), 'Monthly equivalent of active paid contracts', 'IDR'),
    expiringCompanies: metric(currentPaid.filter(item => Date.parse(item.subscription.paidPeriodEnd) <= now + 7 * DAY).length, 'Paid expiry within 7 days'),
    orsonReservations: metric(reservations.reduce((sum, row) => sum + (number(row.functions?.chat) ?? 0) + (number(row.functions?.projection) ?? 0), 0), 'Daily authoritative reservation counters; not successful responses'),
    recordedEstimatedCostUsd: metric(costs.length ? costs.reduce((sum, value) => sum + value, 0) : null, 'Recorded estimates for current UTC month', 'USD'),
    dailyGrowth: Array.from({ length: days }, (_, index) => {
      const date = new Date(now - (days - 1 - index) * DAY).toISOString().slice(0, 10);
      return { date, users: users.filter(user => user.createdAt?.startsWith(date)).length, companies: companies.filter(item => item.company.createdAt?.startsWith(date)).length, activeCompanies: companies.filter(item => item.records.some(record => record.date.startsWith(date))).length };
    }),
  };
}

function attention(snapshot) {
  const issues = [];
  const add = (companyId, kind, title, source, evidenceAt, severity = 'medium') => issues.push({ id: `${kind}:${companyId}`, companyId, kind, severity, title, source, evidenceAt, triageStatus: null, snoozedUntil: null, revision: 0 });
  for (const item of snapshot.companies) {
    const company = item.company;
    if (!company.physicalPondCount) add(company.id, 'onboarding', `${company.name}: no physical ponds recorded`, `companies/${company.id}/physicalPonds`, company.createdAt);
    else if (!company.activity30d) add(company.id, 'stale_records', `${company.name}: no farm records in 30 days`, `companies/${company.id}/ponds`, company.lastActivityAt);
    const expiry = Date.parse(item.subscription.paidPeriodEnd);
    if (!item.subscription.lifetime && expiry > snapshot.now && expiry <= snapshot.now + 7 * DAY) add(company.id, 'expiry', `${company.name}: paid access expires within 7 days`, `companies/${company.id}/billing/current`, item.subscription.paidPeriodEnd, 'high');
    if (item.orson.monthlyLimit > 0 && item.orson.reservedTotal >= item.orson.monthlyLimit * .8) add(company.id, 'quota', `${company.name}: Orson quota above 80%`, `companies/${company.id}/orsonUsageMonthly/${item.orson.monthKey}`, null, 'high');
    if (item.subscription.payments.some(payment => payment.requiresRefundReview)) add(company.id, 'refund_review', `${company.name}: payment needs refund review`, `companies/${company.id}/billingPayments`, null, 'high');
  }
  for (const join of snapshot.joins.filter(row => row.status === 'pending')) add(join.companyId || null, `membership_${join.id}`, 'Pending company membership request', `joinRequests/${join.id}`, iso(join.createdAt));
  return issues.map(issue => {
    const followUp = snapshot.triage?.find(row => row.id === issue.id);
    return { ...issue, triageStatus: followUp?.status || null, snoozedUntil: followUp?.snoozedUntil || null, revision: followUp?.revision || 0 };
  });
}

function responseFor(snapshot, path, query) {
  const days = query.days === '7' ? 7 : 30;
  const warnings = ['Recorded Orson costs cover the current UTC month. Successful-response counts are not available.', 'Physical ponds are counted only from physicalPonds; legacy pond snapshots are not inferred as physical structures.'];
  if (snapshot.companies.some(item => item.records?.some(record => Date.parse(record.date) > snapshot.now))) warnings.push('Future-dated farm records exist. They are excluded from active-farm counts and last-activity dates.');
  if (path === '/adoption') warnings.push('Inventory adoption reflects recorded feeds or additives. Asset-only inventory is not included.');
  const meta = { asOf: snapshot.asOf, windowDays: days, timeZone: 'UTC', coverage: 'partial', warnings, nextCursor: null };
  if (path === '/overview') return { data: overview(snapshot, days), meta };
  const detailMatch = /^\/companies\/([^/]+)$/.exec(path);
  if (detailMatch) {
    const item = snapshot.companies.find(row => row.company.id === decodeURIComponent(detailMatch[1]));
    if (!item) return null;
    return { data: item.detail, meta };
  }
  const endpoints = { '/companies': () => snapshot.companies.map(row => row.company), '/users': () => snapshot.users, '/subscriptions': () => snapshot.companies.map(row => row.subscription), '/adoption': () => snapshot.companies.map(row => row.adoption), '/orson': () => snapshot.companies.map(row => row.orson), '/attention': () => attention(snapshot), '/audit': () => snapshot.audit };
  if (!Object.hasOwn(endpoints, path)) return null;
  const search = String(query.search || '').slice(0, 100).toLowerCase();
  let result = endpoints[path]().filter(row => !search || JSON.stringify(row).toLowerCase().includes(search));
  // Use the same code-point ordering for sorting and cursor comparisons.
  result.sort((a, b) => {
    const left = String(a.id || a.companyId);
    const right = String(b.id || b.companyId);
    return left < right ? -1 : left > right ? 1 : 0;
  });
  const cursor = query.cursor ? Buffer.from(String(query.cursor), 'base64url').toString('utf8') : null;
  if (cursor) result = result.filter(row => String(row.id || row.companyId) > cursor);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 25));
  const data = result.slice(0, limit);
  if (result.length > limit) meta.nextCursor = Buffer.from(String(data.at(-1).id || data.at(-1).companyId)).toString('base64url');
  return { data, meta };
}

module.exports = { loadData, responseFor, farmRecords, paidPayment, paymentDate, overview, iso, attention };
