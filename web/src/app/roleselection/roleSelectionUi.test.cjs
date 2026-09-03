/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const page = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');

test('web signup offers the administrator role and routes it through company approval', () => {
  assert.match(page, /id:\s*'admin'[\s\S]*?title:\s*t\.roleSelection\.administrator[\s\S]*?requiresCompany:\s*true/);
});
