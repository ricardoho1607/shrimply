const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const dashboard = fs.readFileSync(path.join(__dirname, 'EnterpriseCycleDashboard.tsx'), 'utf8');
const styles = fs.readFileSync(path.join(__dirname, 'EnterpriseDashboard.module.css'), 'utf8');
const cycleCopy = fs.readFileSync(path.join(__dirname, '../../../shared/cycleFeatureTranslations.ts'), 'utf8');

test('modal header cannot shrink over the cycle-start question', () => {
  assert.match(dashboard, /<fieldset className=\{styles\.cycleModeSelector\}>[\s\S]*?<legend>\{copy\.cycleStartQuestion\}<\/legend>/);
  assert.match(styles, /\.modalHeader\s*\{[^}]*flex-shrink:\s*0;/s);
});

test('mid-cycle population and feed labels do not say optional', () => {
  const enterpriseCopy = cycleCopy.match(/const enterpriseCycleErrors = \{([\s\S]*?)\n\} as const;/)?.[1] || '';
  const populationLabels = [...enterpriseCopy.matchAll(/currentPopulation:\s*'([^']*)'/g)].map((match) => match[1]);
  const feedLabels = [...enterpriseCopy.matchAll(/feedUsedSoFar:\s*'([^']*)'/g)].map((match) => match[1]);

  assert.equal(populationLabels.length, 5);
  assert.equal(feedLabels.length, 5);
  [...populationLabels, ...feedLabels].forEach((label) => {
    assert.doesNotMatch(label, /optional|opsional|ไม่บังคับ|tùy chọn|可选/i);
  });
});

test('enterprise owners can assign unallocated ponds to a block', () => {
  const assignmentFlow = dashboard.match(/const savePondAssignment = async[\s\S]*?\n  const closeCycle/)?.[0] || '';

  assert.match(dashboard, /t\.enterprise\.assignPond/);
  assert.match(dashboard, /unassignedPondOptions/);
  assert.match(dashboard, /new Set\(sortedBlocks\.map\(\(block\) => block\.id\)\)/);
  assert.match(dashboard, /!pond\.blockId \|\| !assignedBlockIds\.has\(pond\.blockId\)/);
  assert.match(assignmentFlow, /companies', company\.id, 'physicalPonds'/);
  assert.match(assignmentFlow, /companies', company\.id, 'ponds'/);
  assert.match(assignmentFlow, /blockId: block\.id/);
  assert.match(assignmentFlow, /batch\.commit\(\)/);
});
