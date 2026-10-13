import assert from 'node:assert/strict';
import { readFeatureSource } from '../scripts/read-feature-source.cjs';
import test from 'node:test';
import { cycleFeatureTranslations } from './cycleFeatureTranslations.ts';

const readSource = (path: string) => readFeatureSource(path);

test('enterprise cycle creation exposes and persists the cycle start mode on mobile', () => {
  const dashboard = readSource('app/components/enterprise/EnterpriseCycleDashboard.tsx');
  const persistence = readSource('app/(tabs)/index.tsx');

  assert.match(dashboard, /setCycleStartMode\(mode\)/);
  assert.match(dashboard, /copy\.existingCycle/);
  assert.match(dashboard, /baselineMbw: parseOptionalEnterprisePondNumber/);
  assert.match(persistence, /cycleStartMode: input\.cycleStartMode/);
  assert.match(persistence, /source: 'midcycle_onboarding'/);
});

test('enterprise cycle creation exposes and persists the cycle start mode on web', () => {
  const dashboard = readSource('web/src/components/EnterpriseCycleDashboard.tsx');

  assert.match(dashboard, /setCycleStartMode\(mode\)/);
  assert.match(dashboard, /copy\.existingCycle/);
  assert.match(dashboard, /cycleStartMode,/);
  assert.match(dashboard, /source: 'midcycle_onboarding'/);
});

test('enterprise cycle creation persists a separate stocking date for every pond', () => {
  const mobileDashboard = readSource('app/components/enterprise/EnterpriseCycleDashboard.tsx');
  const mobilePersistence = readSource('app/(tabs)/index.tsx');
  const webDashboard = readSource('web/src/components/EnterpriseCycleDashboard.tsx');

  assert.match(mobileDashboard, /stockingDate: pondSetupValues\[pond\.id\]\.stockingDate/);
  assert.match(mobilePersistence, /docStart: stockingDate/);
  assert.match(mobilePersistence, /cycleStartedAt: stockingDate/);
  assert.match(webDashboard, /docStart: stockingDate/);
  assert.match(webDashboard, /cycleStartedAt: stockingDate/);
  assert.match(webDashboard, /getEnterpriseStockingDateRange/);
});

test('enterprise cycle start menu has complete translations for every supported language', () => {
  Object.entries(cycleFeatureTranslations).forEach(([language, translation]) => {
    const copy = translation.enterpriseCycle;
    [
      copy.cycleStartQuestion,
      copy.stockingDate,
      copy.newCycle,
      copy.existingCycle,
      copy.newCycleHint,
      copy.existingCycleHint,
      copy.currentMbw,
      copy.currentPopulation,
      copy.currentSurvivalRate,
      copy.feedUsedSoFar,
      copy.feedUsedSoFarHint,
      copy.baselineMbwRequired,
      copy.baselineDateInvalid,
    ].forEach((value) => assert.ok(value.trim(), `${language} has an empty enterprise cycle translation`));
  });
});
