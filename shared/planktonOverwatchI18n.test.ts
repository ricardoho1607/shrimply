import assert from 'node:assert/strict';
import test from 'node:test';
import type { PlanktonOverwatchSnapshot, PlanktonOverwatchState } from './planktonOverwatch.ts';
import {
  localizePlanktonOverwatchSnapshot,
  PLANKTON_OVERWATCH_SIGNAL_IDS,
  planktonOverwatchLocalizedCopy,
} from './planktonOverwatchI18n.ts';

const states: PlanktonOverwatchState[] = ['insufficient', 'stable', 'watch', 'high', 'critical'];
const missingData = [
  'total plankton density',
  'plankton composition',
  'dawn dissolved oxygen',
  'morning and afternoon pH',
  'enough trend history',
];

test('every Overwatch locale covers every status, signal, action, and missing-data label', () => {
  for (const [language, copy] of Object.entries(planktonOverwatchLocalizedCopy)) {
    assert.deepEqual(Object.keys(copy.overwatchMessages).sort(), [...states].sort(), `${language} messages`);
    assert.deepEqual(Object.keys(copy.overwatchActions).sort(), [...states].sort(), `${language} actions`);
    assert.deepEqual(Object.keys(copy.overwatchSignals).sort(), [...PLANKTON_OVERWATCH_SIGNAL_IDS].sort(), `${language} signals`);
    assert.deepEqual(Object.keys(copy.overwatchMissingLabels).sort(), [...missingData].sort(), `${language} missing data`);
    Object.values(copy).forEach((value) => assert.ok(value));
  }
});

test('saved English snapshot text is replaced by the selected locale', () => {
  const snapshot: PlanktonOverwatchSnapshot = {
    version: 1,
    state: 'watch',
    message: 'SAVED ENGLISH MESSAGE',
    signals: PLANKTON_OVERWATCH_SIGNAL_IDS.map((id, index) => ({
      id,
      category: 'test',
      points: 1,
      severity: 'watch',
      title: 'SAVED ENGLISH TITLE',
      evidence: index === 0 ? 'SAVED ENGLISH EVIDENCE 4.2 mg/L' : 'SAVED ENGLISH EVIDENCE',
      recommendation: 'SAVED ENGLISH RECOMMENDATION',
    })),
    recommendations: ['SAVED ENGLISH ACTION'],
    dataQuality: { missing: [...missingData, 'future field'] },
  };

  for (const [language, copy] of Object.entries(planktonOverwatchLocalizedCopy)) {
    const localized = localizePlanktonOverwatchSnapshot(snapshot, copy);
    const rendered = JSON.stringify(localized);
    assert.equal(localized.evidence.length, PLANKTON_OVERWATCH_SIGNAL_IDS.length, language);
    assert.match(localized.evidence[0].text, /4\.2 mg\/L/, language);
    assert.equal(localized.missing.length, missingData.length + 1, language);
    assert.doesNotMatch(rendered, /SAVED ENGLISH/, language);
    assert.equal(localized.missing.at(-1), copy.overwatchUnknownMissingData, language);
  }
});
