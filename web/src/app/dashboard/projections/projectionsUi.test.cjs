const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
const styles = fs.readFileSync(path.join(__dirname, 'ProjectionsPage.module.css'), 'utf8');

test('harvest projections collapse to one readable column on narrow screens', () => {
  assert.match(source, /className={styles\.mainGrid}/);
  assert.doesNotMatch(source, /var\(--gradient\)/);
  assert.match(styles, /@media \(max-width: 1120px\)[\s\S]*?\.mainGrid\s*{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) !important;/);
  assert.match(styles, /\.mainGrid > \*[\s\S]*?min-width:\s*0;/);
  assert.match(source, /className={styles\.outcomeGrid}/);
  assert.match(styles, /\.outcomeGrid[\s\S]*?grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(styles, /\.outcomeGrid,[\s\S]*?\.metricGrid\s*{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\);/);
  assert.match(styles, /\.outcomeValue[\s\S]*?overflow-wrap:\s*anywhere;/);
});
