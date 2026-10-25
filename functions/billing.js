'use strict';

const crypto = require('node:crypto');
const { Buffer } = require('node:buffer');
const { defineSecret } = require('firebase-functions/params');
const { onRequest, HttpsError } = require('firebase-functions/v2/https');
const { onCall } = require('./shared/guardedCallable');
const { onDocumentCreated, onDocumentDeleted } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('./firebaseAdmin');
const { assertCompanyMemberForCallable } = require('./shared/companyAccess');
const {
  BILLING_INTERVALS,
  PRICE_VERSION,
  buildEntitlements,
  getPlan,
  getPlanPrice,
  normalizeBillingInterval,
  normalizePlanId,
  publicPlanCatalog,
} = require('./shared/companyPlans');
const { resolveEntitlements, timestampMillis, hasLifetimeGrant } = require('./shared/companyEntitlements');

const midtransServerKeySecret = defineSecret('MIDTRANS_SERVER_KEY');
const DAY_MS = 24 * 60 * 60 * 1000;
const PLAN_RANK = Object.freeze({ free: 0, plus: 1, pro: 2 });

const getMidtransServerKey = () => {
  try {
    return midtransServerKeySecret.value() || process.env.MIDTRANS_SERVER_KEY || '';
  } catch (_error) {
    return process.env.MIDTRANS_SERVER_KEY || '';
  }
};

const resolveMidtransEnvironment = (serverKey, configuredValue = process.env.MIDTRANS_IS_PRODUCTION) => {
  const keyEnvironment = serverKey.startsWith('SB-Mid-server-')
    ? 'sandbox'
    : serverKey.startsWith('Mid-server-')
      ? 'production'
      : null;
  if (!keyEnvironment) {
    throw new HttpsError('failed-precondition', 'MIDTRANS_SERVER_KEY is not a valid Midtrans server key.');
  }

  const configuredEnvironment = configuredValue === 'true'
    ? 'production'
    : configuredValue === 'false'
      ? 'sandbox'
      : null;
  if (configuredEnvironment && configuredEnvironment !== keyEnvironment) {
    throw new HttpsError(
      'failed-precondition',
      `The Midtrans ${keyEnvironment} server key does not match the configured ${configuredEnvironment} environment.`,
    );
  }
  return configuredEnvironment || keyEnvironment;
};

const timestampOrNull = (value) => {
  const millis = timestampMillis(value);
  return millis > 0 ? new Date(millis).toISOString() : null;
};

const addUtcMonths = (date, months) => {
  const next = new Date(date.getTime());
  const day = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(day, lastDay));
  return next;
};

const companyMonthKey = (timeZone) => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'UTC',
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}`;
  } catch (_error) {
    return new Date().toISOString().slice(0, 7);
  }
};

const normalizeReturnUrl = (value) => {
  const fallback = 'https://www.shrimplytech.com/dashboard/settings?tab=billing';
  if (typeof value !== 'string' || !value.trim()) return fallback;
  try {
    const url = new URL(value);
    const allowedProductionHost = ['shrimplytech.com', 'www.shrimplytech.com'].includes(url.hostname) && url.protocol === 'https:';
    const allowedLocalHost = ['localhost', '127.0.0.1'].includes(url.hostname) && url.protocol === 'http:';
    if (!allowedProductionHost && !allowedLocalHost) return fallback;
    url.pathname = '/dashboard/settings';
    url.search = '?tab=billing';
    url.hash = '';
    return url.toString();
  } catch (_error) {
    return fallback;
  }
};

const serializeEntitlements = (entitlements) => ({
  planId: entitlements.planId,
  planName: entitlements.planName,
  status: entitlements.status,
  pondLimit: Number.isFinite(entitlements.pondLimit) ? entitlements.pondLimit : null,
  orson: entitlements.orson,
  billingInterval: entitlements.billingInterval || null,
  currentPeriodStart: timestampOrNull(entitlements.currentPeriodStart),
  currentPeriodEnd: timestampOrNull(entitlements.currentPeriodEnd),
  graceUntil: timestampOrNull(entitlements.graceUntil) || (
    Number.isFinite(entitlements.graceUntilMs) ? new Date(entitlements.graceUntilMs).toISOString() : null
  ),
  scheduledPlanId: entitlements.scheduledPlanId || null,
  priceVersion: entitlements.priceVersion || PRICE_VERSION,
  complimentaryAccess: entitlements.complimentaryAccess ? { ...entitlements.complimentaryAccess, expiresAt: timestampOrNull(entitlements.complimentaryAccess.expiresAt) } : null,
});

const ensureEntitlements = async (db, companyId, company, applyOverride = true) => {
  const ref = db.collection('companies').doc(companyId).collection('entitlements').doc('current');
  return db.runTransaction(async (transaction) => {
    const [snapshot, grant, override, companySnapshot] = await Promise.all([
      transaction.get(ref), transaction.get(db.collection('companies').doc(companyId).collection('subscriptionGrants').doc('current')),
      transaction.get(db.collection('companies').doc(companyId).collection('accessOverrides').doc('current')),
      transaction.get(db.collection('companies').doc(companyId)),
    ]);
    if (snapshot.exists || hasLifetimeGrant(grant.data())) return { ref, entitlements: resolveEntitlements(snapshot.data(), company, Date.now(), grant.data(), applyOverride ? override.data() : null) };

    const entitlements = resolveEntitlements(null, company, Date.now(), null, null, companySnapshot.createTime);
    const payload = {
      ...entitlements,
      ...(Number.isFinite(entitlements.graceUntilMs)
        ? { graceUntil: admin.firestore.Timestamp.fromMillis(entitlements.graceUntilMs) }
        : {}),
      companyId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    delete payload.graceUntilMs;
    transaction.create(ref, payload);
    return { ref, entitlements: resolveEntitlements(payload, company, Date.now(), grant.data(), applyOverride ? override.data() : null) };
  });
};

const assertCompanyOwner = async (request) => {
  const uid = request.auth?.uid;
  const companyId = typeof request.data?.companyId === 'string' ? request.data.companyId.trim() : '';
  if (!uid) throw new HttpsError('unauthenticated', 'You must be signed in.');
  if (!companyId || companyId.length > 160 || companyId.includes('/')) {
    throw new HttpsError('invalid-argument', 'A valid company is required.');
  }
  const db = admin.firestore();
  const [companySnap, userSnap] = await Promise.all([
    db.collection('companies').doc(companyId).get(),
    db.collection('users').doc(uid).get(),
  ]);
  if (!companySnap.exists) throw new HttpsError('not-found', 'Company not found.');
  const company = { ...companySnap.data(), id: companySnap.id };
  if (company.ownerId !== uid) throw new HttpsError('permission-denied', 'Only the company owner can manage billing.');
  return { db, uid, companyId, company, user: userSnap.exists ? userSnap.data() : null };
};

exports.initializeCompanyPlan = onDocumentCreated('companies/{companyId}', async (event) => {
  const companyId = event.params.companyId;
  const company = event.data?.data() || {};
  const companyRef = admin.firestore().collection('companies').doc(companyId);
  const entitlementsRef = companyRef.collection('entitlements').doc('current');
  const billingRef = companyRef.collection('billing').doc('current');
  const usageRef = companyRef.collection('planUsage').doc('current');
  const free = buildEntitlements('free');

  await admin.firestore().runTransaction(async (transaction) => {
    const [entitlementsSnapshot, billingSnapshot, usageSnapshot] = await Promise.all([
      transaction.get(entitlementsRef),
      transaction.get(billingRef),
      transaction.get(usageRef),
    ]);
    if (!entitlementsSnapshot.exists) transaction.create(entitlementsRef, {
      ...free,
      companyId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    if (!billingSnapshot.exists) transaction.create(billingRef, {
      companyId,
      planId: 'free',
      status: 'free',
      priceVersion: PRICE_VERSION,
      ownerId: company.ownerId || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    if (!usageSnapshot.exists) transaction.create(usageRef, {
      companyId,
      physicalPondCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
});

exports.getCompanyBillingSummary = onCall(async (request) => {
  const uid = request.auth?.uid;
  const companyId = typeof request.data?.companyId === 'string' ? request.data.companyId.trim() : '';
  const db = admin.firestore();
  const company = await assertCompanyMemberForCallable(db, uid, companyId, 'viewFarm');
  const [{ entitlements }, pondCountSnapshot] = await Promise.all([
    ensureEntitlements(db, companyId, company),
    db.collection('companies').doc(companyId).collection('physicalPonds').count().get(),
  ]);
  const monthKey = companyMonthKey(company.timeZone);
  const monthSnapshot = await db.collection('companies').doc(companyId).collection('orsonUsageMonthly').doc(monthKey).get();
  const monthlyUsage = monthSnapshot.exists && Number.isFinite(monthSnapshot.data()?.total)
    ? monthSnapshot.data().total
    : 0;
  const canManageBilling = company.ownerId === uid;
  const paymentsSnapshot = canManageBilling
    ? await db.collection('companies').doc(companyId).collection('billingPayments').orderBy('createdAt', 'desc').limit(10).get()
    : null;

  return {
    companyName: company.companyName || company.name || companyId,
    entitlements: serializeEntitlements(entitlements),
    usage: {
      physicalPonds: pondCountSnapshot.data().count,
      orsonMonthly: monthlyUsage,
    },
    plans: publicPlanCatalog(),
    intervals: Object.values(BILLING_INTERVALS),
    canManageBilling,
    payments: paymentsSnapshot ? paymentsSnapshot.docs.map(snapshot => {
      const payment = snapshot.data();
      return { orderId: snapshot.id, planName: getPlan(payment.planId).name, amount: payment.amount, status: payment.status, activated: Boolean(payment.activatedAt), createdAt: timestampOrNull(payment.createdAt) };
    }) : [],
  };
});

exports.createCompanyPhysicalPond = onCall(async (request) => {
  const uid = request.auth?.uid;
  const companyId = typeof request.data?.companyId === 'string' ? request.data.companyId.trim() : '';
  const requestedPondId = typeof request.data?.pondId === 'string' ? request.data.pondId.trim() : '';
  const raw = request.data?.pond && typeof request.data.pond === 'object' ? request.data.pond : {};
  const pondName = typeof raw.pondName === 'string' ? raw.pondName.trim() : '';
  const pondArea = Number(raw.pondArea);
  if (!pondName || pondName.length > 120 || !Number.isFinite(pondArea) || pondArea <= 0 || pondArea > 1000000000) {
    throw new HttpsError('invalid-argument', 'A valid pond name and area are required.');
  }
  if (requestedPondId && (!/^[A-Za-z0-9_-]{1,160}$/.test(requestedPondId))) {
    throw new HttpsError('invalid-argument', 'Invalid pond ID.');
  }

  const db = admin.firestore();
  const company = await assertCompanyMemberForCallable(db, uid, companyId, 'managePonds');
  const companyRef = db.collection('companies').doc(companyId);
  const pondRef = requestedPondId
    ? companyRef.collection('physicalPonds').doc(requestedPondId)
    : companyRef.collection('physicalPonds').doc();
  const usageRef = companyRef.collection('planUsage').doc('current');
  const entitlementsRef = companyRef.collection('entitlements').doc('current');
  const existingCount = (await companyRef.collection('physicalPonds').count().get()).data().count;

  const created = await db.runTransaction(async (transaction) => {
    const [pondSnapshot, usageSnapshot, entitlementsSnapshot, grantSnapshot, userSnapshot, overrideSnapshot, companySnapshot] = await Promise.all([
      transaction.get(pondRef),
      transaction.get(usageRef),
      transaction.get(entitlementsRef),
      transaction.get(companyRef.collection('subscriptionGrants').doc('current')),
      transaction.get(db.collection('users').doc(uid)),
      transaction.get(companyRef.collection('accessOverrides').doc('current')),
      transaction.get(companyRef),
    ]);
    if (company.businessSize === 'enterprise' && company.ownerId !== uid
      && !['co-owner', 'manager', 'admin', 'mechanic', 'buyer'].includes(userSnapshot.data()?.role)) {
      if (typeof raw.blockId !== 'string' || !/^[^/]{1,160}$/.test(raw.blockId)) {
        throw new HttpsError('permission-denied', 'Choose a block assigned to you.');
      }
      const block = await transaction.get(companyRef.collection('blocks').doc(raw.blockId));
      if (!block.exists || block.data()?.assignedTechnicianId !== uid) throw new HttpsError('permission-denied', 'You can only add ponds to your assigned blocks.');
    }
    if (pondSnapshot.exists) {
      const existing = pondSnapshot.data() || {};
      const sameRequest = existing.createdBy === uid
        && existing.pondName === pondName
        && Number(existing.pondArea) === pondArea;
      if (sameRequest) return false;
      throw new HttpsError('already-exists', 'This pond already exists.');
    }
    const entitlements = resolveEntitlements(entitlementsSnapshot.exists ? entitlementsSnapshot.data() : null, company, Date.now(), grantSnapshot.data(), overrideSnapshot.data(), companySnapshot.createTime);
    const storedCount = usageSnapshot.exists && Number.isFinite(usageSnapshot.data()?.physicalPondCount)
      ? Math.max(usageSnapshot.data().physicalPondCount, existingCount)
      : existingCount;
    if (Number.isFinite(entitlements.pondLimit) && storedCount >= entitlements.pondLimit) {
      throw new HttpsError('resource-exhausted', `Your ${entitlements.planName} plan allows ${entitlements.pondLimit} ponds.`, {
        reason: 'pond-limit',
        planId: entitlements.planId,
        limit: entitlements.pondLimit,
        used: storedCount,
      });
    }

    const optionalText = (value) => typeof value === 'string' && value.trim() ? value.trim().slice(0, 160) : null;
    transaction.create(pondRef, {
      pondName,
      pondNameNormalized: pondName.toLocaleLowerCase().replace(/\s+/g, ''),
      pondArea,
      ...(optionalText(raw.blockId) ? { blockId: optionalText(raw.blockId) } : {}),
      ...(optionalText(raw.blockName) ? { blockName: optionalText(raw.blockName) } : {}),
      status: 'idle',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: uid,
    });
    transaction.set(usageRef, {
      companyId,
      physicalPondCount: storedCount + 1,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return true;
  });

  return { id: pondRef.id, pondName, pondArea, created };
});

exports.trackPhysicalPondDeletion = onDocumentDeleted('companies/{companyId}/physicalPonds/{pondId}', async (event) => {
  const companyId = event.params.companyId;
  const companyRef = admin.firestore().collection('companies').doc(companyId);
  const usageRef = companyRef.collection('planUsage').doc('current');
  const eventRef = companyRef.collection('planUsageEvents').doc(crypto.createHash('sha256').update(event.id).digest('hex'));
  await admin.firestore().runTransaction(async (transaction) => {
    const [snapshot, processed] = await Promise.all([transaction.get(usageRef), transaction.get(eventRef)]);
    if (processed.exists) return;
    // Firestore delivers events at least once. A retry must not free another slot.
    transaction.create(eventRef, { processedAt: admin.firestore.FieldValue.serverTimestamp() });
    if (!snapshot.exists || !Number.isFinite(snapshot.data()?.physicalPondCount)) return;
    transaction.update(usageRef, {
      physicalPondCount: Math.max(snapshot.data().physicalPondCount - 1, 0),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
});

exports.createMidtransPlanPayment = onCall({ timeoutSeconds: 30, secrets: [midtransServerKeySecret] }, async (request) => {
  const { db, uid, companyId, company, user } = await assertCompanyOwner(request);
  const { entitlements } = await ensureEntitlements(db, companyId, company);
  if (entitlements.planId === 'lifetime') throw new HttpsError('failed-precondition', 'Your company has lifetime free access. No subscription payment is needed.');
  if (!['plus', 'pro'].includes(request.data?.planId) || !Object.hasOwn(BILLING_INTERVALS, request.data?.interval)) {
    throw new HttpsError('invalid-argument', 'Choose a valid paid plan and billing period.');
  }
  const planId = normalizePlanId(request.data?.planId);
  const interval = normalizeBillingInterval(request.data?.interval);
  if (planId === 'free') throw new HttpsError('invalid-argument', 'The Free plan does not require payment.');
  const amount = getPlanPrice(planId, interval);
  if (!Number.isInteger(amount) || amount <= 0) throw new HttpsError('failed-precondition', 'This plan is not available for online purchase.');

  const serverKey = getMidtransServerKey();
  if (!serverKey) throw new HttpsError('failed-precondition', 'Midtrans billing is not configured yet.');
  const environment = resolveMidtransEnvironment(serverKey);
  const endpoint = environment === 'production'
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions';
  const orderId = `shr-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const returnUrl = normalizeReturnUrl(request.data?.returnUrl);
  const plan = getPlan(planId);
  const orderRef = db.collection('billingOrders').doc(orderId);
  const paymentRef = db.collection('companies').doc(companyId).collection('billingPayments').doc(orderId);
  const createdAt = admin.firestore.FieldValue.serverTimestamp();
  const orderRecord = {
    orderId,
    companyId,
    ownerId: uid,
    planId,
    interval,
    amount,
    currency: 'IDR',
    priceVersion: PRICE_VERSION,
    environment,
    status: 'creating',
    createdAt,
    updatedAt: createdAt,
  };
  await Promise.all([orderRef.create(orderRecord), paymentRef.create(orderRecord)]);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      transaction_details: { order_id: orderId, gross_amount: amount },
      item_details: [{ id: `${planId}-${interval}`, price: amount, quantity: 1, name: `Shrimply ${plan.name} - ${BILLING_INTERVALS[interval].label}` }],
      customer_details: {
        first_name: String(user?.name || company.companyName || 'Shrimply customer').slice(0, 50),
        email: String(request.auth?.token?.email || user?.email || '').slice(0, 100),
        phone: String(user?.phone || company.contactPhone || '').slice(0, 20),
      },
      callbacks: { finish: returnUrl },
    }),
  });

  let body = {};
  try { body = await response.json(); } catch (_error) { body = {}; }
  if (!response.ok || !body.token || !body.redirect_url) {
    const message = typeof body?.error_messages?.[0] === 'string' ? body.error_messages[0] : 'Midtrans could not start the payment.';
    await Promise.all([
      orderRef.set({ status: 'create_failed', failureMessage: message.slice(0, 300), updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true }),
      paymentRef.set({ status: 'create_failed', failureMessage: message.slice(0, 300), updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true }),
    ]);
    throw new HttpsError('unavailable', message);
  }

  await Promise.all([
    orderRef.set({ status: 'pending', snapToken: body.token, redirectUrl: body.redirect_url, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true }),
    paymentRef.set({ status: 'pending', updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true }),
  ]);
  return { orderId, token: body.token, redirectUrl: body.redirect_url, environment };
});

const isValidMidtransSignature = ({ orderId, statusCode, grossAmount, signatureKey }, serverKey) => {
  if (![orderId, statusCode, grossAmount, signatureKey, serverKey].every((value) => typeof value === 'string' && value)) return false;
  const expected = crypto.createHash('sha512').update(`${orderId}${statusCode}${grossAmount}${serverKey}`).digest('hex');
  if (expected.length !== signatureKey.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureKey));
};

const isPaidNotification = (body) => String(body.status_code) === '200' && (
  body.transaction_status === 'settlement'
  || (body.transaction_status === 'capture' && body.fraud_status === 'accept')
);

// Midtrans's signature does not cover transaction_status. Always fetch the current
// status server-to-server before changing access, including for replayed notifications.
const fetchMidtransStatus = async (orderId, environment, serverKey, fetcher = fetch) => {
  const host = environment === 'production' ? 'api.midtrans.com' : 'api.sandbox.midtrans.com';
  const response = await fetcher(`https://${host}/v2/${encodeURIComponent(orderId)}/status`, {
    headers: { Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(10000),
  });
  const body = await response.json();
  if (!response.ok || body.order_id !== orderId) throw new Error('Midtrans status verification unavailable');
  return body;
};

exports.midtransBillingWebhook = onRequest({ timeoutSeconds: 30, secrets: [midtransServerKeySecret] }, async (request, response) => {
  if (request.method !== 'POST') {
    response.status(405).send('Method not allowed');
    return;
  }
  let body = request.body && typeof request.body === 'object' ? request.body : {};
  const serverKey = getMidtransServerKey();
  if (!isValidMidtransSignature({
    orderId: body.order_id,
    statusCode: body.status_code,
    grossAmount: body.gross_amount,
    signatureKey: body.signature_key,
  }, serverKey)) {
    response.status(401).send('Invalid signature');
    return;
  }

  const db = admin.firestore();
  if (typeof body.order_id !== 'string' || body.order_id.includes('/') || body.order_id.length > 160) {
    response.status(400).send('Invalid order');
    return;
  }
  const orderRef = db.collection('billingOrders').doc(body.order_id);
  try {
    const storedOrder = await orderRef.get();
    if (!storedOrder.exists) throw new Error('Unknown order');
    body = await fetchMidtransStatus(body.order_id, storedOrder.data().environment, serverKey);
    await db.runTransaction(async (transaction) => {
      const orderSnapshot = await transaction.get(orderRef);
      if (!orderSnapshot.exists) throw new Error('Unknown order');
      const order = orderSnapshot.data();
      const notifiedAmount = Number(body.gross_amount);
      if (!Number.isFinite(notifiedAmount) || notifiedAmount !== order.amount) throw new Error('Amount mismatch');
      if (body.currency && body.currency !== 'IDR') throw new Error('Currency mismatch');

      const companyRef = db.collection('companies').doc(order.companyId);
      const entitlementRef = companyRef.collection('entitlements').doc('current');
      const billingRef = companyRef.collection('billing').doc('current');
      const paymentRef = companyRef.collection('billingPayments').doc(body.order_id);
      const [companySnapshot, entitlementSnapshot, grantSnapshot] = await Promise.all([
        transaction.get(companyRef),
        transaction.get(entitlementRef),
        transaction.get(companyRef.collection('subscriptionGrants').doc('current')),
      ]);
      if (!companySnapshot.exists) throw new Error('Company not found');
      const paid = isPaidNotification(body);
      const alreadyActivated = Boolean(order.activatedAt);
      const safeStatus = String(body.transaction_status || 'unknown').slice(0, 40);
      const paymentUpdate = {
        status: safeStatus,
        transactionId: typeof body.transaction_id === 'string' ? body.transaction_id.slice(0, 160) : null,
        paymentType: typeof body.payment_type === 'string' ? body.payment_type.slice(0, 80) : null,
        fraudStatus: typeof body.fraud_status === 'string' ? body.fraud_status.slice(0, 40) : null,
        settlementTime: typeof body.settlement_time === 'string' ? body.settlement_time.slice(0, 80) : null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      transaction.set(orderRef, paymentUpdate, { merge: true });
      transaction.set(paymentRef, paymentUpdate, { merge: true });

      if (!paid || alreadyActivated) return;
      if (hasLifetimeGrant(grantSnapshot.data())) {
        // An older unpaid checkout can settle after a grant. Preserve the grant and
        // flag this payment for a human refund review; never silently charge again.
        const review = { requiresRefundReview: true, activationSkipped: 'lifetime-grant' };
        transaction.set(orderRef, review, { merge: true });
        transaction.set(paymentRef, review, { merge: true });
        return;
      }
      const current = resolveEntitlements(entitlementSnapshot.exists ? entitlementSnapshot.data() : null, companySnapshot.data(), Date.now(), null, null, companySnapshot.createTime);
      const now = new Date();
      const currentEndMs = timestampMillis(current.currentPeriodEnd);
      const startsAt = current.planId === order.planId && currentEndMs > now.getTime()
        ? new Date(currentEndMs)
        : now;
      const endsAt = addUtcMonths(startsAt, BILLING_INTERVALS[order.interval].months);
      const graceUntil = new Date(endsAt.getTime() + 7 * DAY_MS);
      const entitlements = buildEntitlements(order.planId, {
        companyId: order.companyId,
        status: 'active',
        billingInterval: order.interval,
        currentPeriodStart: admin.firestore.Timestamp.fromDate(startsAt),
        currentPeriodEnd: admin.firestore.Timestamp.fromDate(endsAt),
        graceUntil: admin.firestore.Timestamp.fromDate(graceUntil),
        scheduledPlanId: null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      transaction.set(entitlementRef, entitlements, { merge: false });
      transaction.set(billingRef, {
        companyId: order.companyId,
        ownerId: order.ownerId,
        planId: order.planId,
        status: 'active',
        billingInterval: order.interval,
        currentPeriodStart: entitlements.currentPeriodStart,
        currentPeriodEnd: entitlements.currentPeriodEnd,
        graceUntil: entitlements.graceUntil,
        latestOrderId: body.order_id,
        provider: 'midtrans',
        autoRenew: false,
        priceVersion: PRICE_VERSION,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      transaction.set(orderRef, { activatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      transaction.set(paymentRef, { activatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    });
    response.status(200).json({ received: true });
  } catch (error) {
    console.error('midtrans_billing_webhook_failed', { orderId: body.order_id, error: error.message });
    response.status(error.message === 'Unknown order' ? 404 : 503).send('Payment confirmation could not be processed; retry required.');
  }
});

exports.scheduleCompanyPlanChange = onCall(async (request) => {
  const { db, companyId, company } = await assertCompanyOwner(request);
  const targetPlanId = normalizePlanId(request.data?.planId);
  if (targetPlanId !== 'free') {
    throw new HttpsError('failed-precondition', 'Paid plan changes require payment.');
  }
  const { ref, entitlements } = await ensureEntitlements(db, companyId, company, false);
  if (entitlements.planId === 'lifetime') throw new HttpsError('failed-precondition', 'Your company has lifetime free access. No plan change is needed.');
  const storedPlanId = typeof entitlements.planId === 'string' ? entitlements.planId : 'free';
  const currentPlanId = storedPlanId === 'legacy' ? 'pro' : normalizePlanId(storedPlanId);
  if (PLAN_RANK[targetPlanId] > PLAN_RANK[currentPlanId]) {
    throw new HttpsError('failed-precondition', 'Upgrades require payment.');
  }
  if (storedPlanId === targetPlanId) return { status: 'unchanged', planId: currentPlanId };
  const periodEndMs = timestampMillis(entitlements.currentPeriodEnd);
  if (periodEndMs <= Date.now()) {
    await ref.set({
      ...buildEntitlements(targetPlanId),
      companyId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: false });
    return { status: 'changed', planId: targetPlanId };
  }
  await ref.set({
    scheduledPlanId: targetPlanId,
    graceUntil: entitlements.currentPeriodEnd,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  return { status: 'scheduled', planId: targetPlanId, effectiveAt: new Date(periodEndMs).toISOString() };
});

exports.expireCompanyPlans = onSchedule({ schedule: 'every day 01:15', timeZone: 'UTC' }, async () => {
  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();
  // Bound work per run; each candidate is revalidated transactionally.
  const snapshot = await db.collectionGroup('entitlements').where('graceUntil', '<=', now).limit(200).get();
  if (snapshot.empty) return;
  for (const document of snapshot.docs) {
    if (document.id !== 'current') continue;
    await db.runTransaction(async transaction => {
      const current = await transaction.get(document.ref);
      if (!current.exists) return;
      const data = current.data();
      const companyRef = document.ref.parent.parent;
      if (!companyRef) return;
      const grant = await transaction.get(companyRef.collection('subscriptionGrants').doc('current'));
      if (hasLifetimeGrant(grant.data()) || !['active', 'grace', 'trialing'].includes(data.status)
        || data.planId === 'free' || timestampMillis(data.graceUntil) <= 0
        || timestampMillis(data.graceUntil) > timestampMillis(now)) return;
      const targetPlanId = normalizePlanId(data.scheduledPlanId || 'free');
      transaction.set(document.ref, {
        ...buildEntitlements(targetPlanId), companyId: data.companyId || companyRef.id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: false });
      transaction.set(companyRef.collection('billing').doc('current'), {
        planId: targetPlanId, status: targetPlanId === 'free' ? 'expired' : 'active',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    });
  }
});

if (process.env.NODE_ENV === 'test') {
  exports.__test = {
    addUtcMonths,
    fetchMidtransStatus,
    isPaidNotification,
    isValidMidtransSignature,
    normalizeReturnUrl,
    resolveMidtransEnvironment,
    serializeEntitlements,
    ensureEntitlements,
  };
}
