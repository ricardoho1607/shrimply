const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../../../../..');
const settingsPagePath = path.join(repoRoot, 'web/src/app/dashboard/settings/page.tsx');
const sitesMcpDir = path.join(repoRoot, 'web/src/app/dashboard/settings/sites-mcp');
const dormantComponentPath = path.join(repoRoot, 'web/src/components/integrations/SitesMcpSettings.tsx');

// Supported page extensions from Next.js page convention guide
const PAGE_EXTENSIONS = ['.js', '.jsx', '.tsx', '.ts'];

test('routed sites-mcp page is absent for all supported page extensions', () => {
  for (const ext of PAGE_EXTENSIONS) {
    const candidatePath = path.join(sitesMcpDir, `page${ext}`);
    assert.strictEqual(
      fs.existsSync(candidatePath),
      false,
      `Routed page should be absent: ${candidatePath}`
    );
  }
});

test('settings navigation does not expose or link to sites-mcp', () => {
  assert.strictEqual(fs.existsSync(settingsPagePath), true, 'Settings page must exist');
  const settingsContent = fs.readFileSync(settingsPagePath, 'utf8');

  // Verify absence of link to sites-mcp route
  assert.strictEqual(
    settingsContent.includes('/dashboard/settings/sites-mcp'),
    false,
    'Settings page must not contain link to /dashboard/settings/sites-mcp'
  );

  // Verify absence of MCP Settings card title / copy
  assert.strictEqual(
    settingsContent.includes('Sites MCP access'),
    false,
    'Settings page must not contain Sites MCP access heading'
  );
  assert.strictEqual(
    settingsContent.includes('Sites MCP'),
    false,
    'Settings page must not contain Sites MCP card'
  );
});

test('dormant SitesMcpSettings component exists and is unexposed', () => {
  assert.strictEqual(
    fs.existsSync(dormantComponentPath),
    true,
    'Dormant component web/src/components/integrations/SitesMcpSettings.tsx must exist'
  );

  const componentContent = fs.readFileSync(dormantComponentPath, 'utf8');
  assert.strictEqual(
    componentContent.includes('export default function SitesMcpSettingsPage()'),
    true,
    'Component must preserve original SitesMcpSettingsPage export'
  );

  // Verify no routed page or settings page imports or wraps the dormant component
  const settingsContent = fs.readFileSync(settingsPagePath, 'utf8');
  assert.strictEqual(
    settingsContent.includes('SitesMcpSettings'),
    false,
    'Settings page must not import or expose SitesMcpSettings'
  );
  assert.strictEqual(
    settingsContent.includes('components/integrations/SitesMcpSettings'),
    false,
    'Settings page must not import from components/integrations/SitesMcpSettings'
  );
});
