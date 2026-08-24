import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { cycleFeatureTranslations } from './cycleFeatureTranslations.ts';

const readSource = (path: string) => readFileSync(path, 'utf8');

test('enterprise mobile owners can switch between enterprise and normal dashboards', () => {
  const home = readSource('app/(tabs)/index.tsx');
  const enterpriseDashboard = readSource('app/components/enterprise/EnterpriseCycleDashboard.tsx');

  assert.match(home, /useState<'enterprise' \| 'normal'>\('enterprise'\)/);
  assert.match(home, /dashboardMode === 'enterprise'/);
  assert.match(home, /setDashboardMode\(mode\)/);
  assert.match(home, /dashboardModeSwitch=\{dashboardModeSwitch\}/);
  assert.match(enterpriseDashboard, /\{dashboardModeSwitch\}/);

  const normalDashboardStart = home.indexOf('styles.cycleManagerCard');
  const normalModeSwitch = home.indexOf('{dashboardModeSwitch}', normalDashboardStart);
  assert.ok(normalDashboardStart >= 0 && normalModeSwitch > normalDashboardStart);
});

test('enterprise dashboard mode labels exist for every supported language', () => {
  Object.entries(cycleFeatureTranslations).forEach(([language, translation]) => {
    assert.ok(translation.enterpriseCycle.enterpriseView.trim(), `${language} enterprise view label is empty`);
    assert.ok(translation.enterpriseCycle.normalView.trim(), `${language} normal view label is empty`);
  });
});
