'use strict';
const fs = require('node:fs');
const path = require('node:path');
function finalizeSopRollout(output, enabled) {
  if (enabled) return;
  // Static export writes not-found HTML with a route filename. Remove it so
  // disabled SOP URLs receive the host's actual 404 rather than an HTTP 200.
  for (const route of ['sops', 'todo']) {
    for (const suffix of ['', '.html', '.txt']) {
      fs.rmSync(path.join(output, 'dashboard', route + suffix), { recursive: true, force: true });
    }
  }
}
if (require.main === module) finalizeSopRollout(path.resolve(__dirname, '../out'), process.env.NEXT_PUBLIC_ADAPTIVE_SOPS_ENABLED === 'true');
module.exports = { finalizeSopRollout };
