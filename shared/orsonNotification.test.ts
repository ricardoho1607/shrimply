import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dedupeOrsonNotifications,
  getEffectiveNotificationPriority,
  getOrsonAlertCaption,
  getOrsonNotificationPriority,
} from './orsonNotification.ts';

test('classifies compound heavy-rain and low-DO alerts as high priority', () => {
  assert.equal(getOrsonNotificationPriority('warning', 'heavy_rain_low_do'), 'high');
  assert.equal(getOrsonNotificationPriority('warning', ['low_do', 'heavy_rain_low_do']), 'high');
});

test('keeps ordinary warnings medium and critical findings high priority', () => {
  assert.equal(getOrsonNotificationPriority('warning', 'low_do'), 'medium');
  assert.equal(getOrsonNotificationPriority('critical', 'low_do'), 'high');
});

test('reclassifies an existing SIM-B1 compound alert for the high-priority count', () => {
  assert.equal(getEffectiveNotificationPriority({
    type: 'orson_risk',
    priority: 'medium',
    data: { riskId: 'abnormal_shrimp_behaviour', severity: 'warning' },
    orsonRiskReport: {
      findings: [
        { id: 'abnormal_shrimp_behaviour', severity: 'warning' },
        { id: 'heavy_rain_low_do', severity: 'warning' },
      ],
    },
  }), 'high');
});

test('deduplicates the same pond event and source date while preserving separate events', () => {
  const notifications = dedupeOrsonNotifications([
    { id: 'new', type: 'orson_risk', message: 'Heavy rain on 2026-09-01', data: { pondId: 'sim-b1', riskId: 'heavy_rain_low_do', sourceDate: '2026-09-01' } },
    { id: 'old', type: 'orson_risk', message: 'Heavy rain on 2026-09-01', data: { pondId: 'sim-b1', riskId: 'heavy_rain_low_do' } },
    { id: 'other-date', type: 'orson_risk', message: 'Heavy rain on 2026-09-02', data: { pondId: 'sim-b1', riskId: 'heavy_rain_low_do' } },
  ]);

  assert.deepEqual(notifications.map((notification) => notification.id), ['new', 'other-date']);
});

test('uses the source-record date retained in an Orson risk report', () => {
  const notification = {
    type: 'orson_risk',
    message: 'Latest field TAN is elevated.',
    data: { pondId: 'sim-b1', riskId: 'ammonia_elevated' },
    orsonRiskReport: { findings: [{ id: 'ammonia_elevated', eventDate: '2026-09-03' }] },
  };

  assert.equal(getOrsonAlertCaption(notification), 'Historical · Event: 2026-09-03');
});
