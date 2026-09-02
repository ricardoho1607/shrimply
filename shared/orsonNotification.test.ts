import test from 'node:test';
import assert from 'node:assert/strict';
import { getEffectiveNotificationPriority, getOrsonNotificationPriority } from './orsonNotification.ts';

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
