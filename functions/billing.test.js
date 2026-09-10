'use strict';

process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { __test } = require('./billing');

test('keeps prepaid billing periods aligned at month end', () => {
  assert.equal(
    __test.addUtcMonths(new Date('2026-01-31T10:00:00Z'), 1).toISOString(),
    '2026-02-28T10:00:00.000Z',
  );
  assert.equal(
    __test.addUtcMonths(new Date('2026-08-31T10:00:00Z'), 4).toISOString(),
    '2026-12-31T10:00:00.000Z',
  );
});

test('validates Midtrans signatures without trusting the notification', () => {
  const values = { orderId: 'shr-1', statusCode: '200', grossAmount: '150000.00' };
  const key = 'server-key';
  const signatureKey = crypto.createHash('sha512')
    .update(`${values.orderId}${values.statusCode}${values.grossAmount}${key}`)
    .digest('hex');
  assert.equal(__test.isValidMidtransSignature({ ...values, signatureKey }, key), true);
  assert.equal(__test.isValidMidtransSignature({ ...values, grossAmount: '1.00', signatureKey }, key), false);
});

test('keeps billing return URLs on trusted hosts', () => {
  assert.equal(
    __test.normalizeReturnUrl('https://www.shrimplytech.com/anything?bad=true'),
    'https://www.shrimplytech.com/dashboard/settings?tab=billing',
  );
  assert.equal(
    __test.normalizeReturnUrl('https://example.com/steal'),
    'https://www.shrimplytech.com/dashboard/settings?tab=billing',
  );
});

test('treats only settled or accepted capture notifications as paid', () => {
  assert.equal(__test.isPaidNotification({ transaction_status: 'settlement', status_code: '200' }), true);
  assert.equal(__test.isPaidNotification({ transaction_status: 'capture', fraud_status: 'accept', status_code: '200' }), true);
  assert.equal(__test.isPaidNotification({ transaction_status: 'capture', status_code: '200' }), false);
  assert.equal(__test.isPaidNotification({ transaction_status: 'settlement', status_code: '202' }), false);
  assert.equal(__test.isPaidNotification({ transaction_status: 'capture', fraud_status: 'challenge' }), false);
  assert.equal(__test.isPaidNotification({ transaction_status: 'pending' }), false);
});

test('fetches authoritative status instead of trusting the unsigned transaction_status', async () => {
  const result = await __test.fetchMidtransStatus('shr-safe', 'sandbox', 'test-key', async (url, options) => {
    assert.equal(url, 'https://api.sandbox.midtrans.com/v2/shr-safe/status');
    assert.ok(options.headers.Authorization.startsWith('Basic '));
    return { ok: true, json: async () => ({ order_id: 'shr-safe', status_code: '201', transaction_status: 'pending', gross_amount: '150000.00' }) };
  });
  assert.equal(__test.isPaidNotification(result), false);
  await assert.rejects(() => __test.fetchMidtransStatus('shr-safe', 'production', 'test-key', async () => ({ ok: true, json: async () => ({ order_id: 'other' }) })), /verification/);
  await assert.rejects(() => __test.fetchMidtransStatus('shr-safe', 'production', 'test-key', async () => ({ ok: false, json: async () => ({}) })), /verification/);
});
