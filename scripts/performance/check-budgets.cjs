// Run after the web production build; optionally check an Expo export too.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const root = path.resolve(process.argv[2] || 'web/out');
const routes = ['/auth','/dashboard','/dashboard/ponds','/dashboard/feed','/dashboard/water','/dashboard/harvest','/dashboard/finance','/dashboard/inventory/feeds','/dashboard/inventory/assets','/dashboard/inventory/treatment-mixes','/dashboard/reports/financial','/dashboard/reports/shrimp','/dashboard/reports/daily-operations','/dashboard/reports/cycles','/dashboard/projections','/dashboard/ai','/dashboard/settings'];
let failed = false;
for (const route of routes) {
  const html = fs.readFileSync(path.join(root,route+'.html'),'utf8');
  const scripts = [...new Set([...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1]).filter(src=>src.startsWith('/_next/')))];
  const bytes = scripts.reduce((sum,src)=>sum+zlib.gzipSync(fs.readFileSync(path.join(root,src))).length,0);
  // Before this pass, portal pages shipped roughly 1 MB of compressed JS each.
  const limit = route === '/auth' ? 525000 : 700000;
  if(bytes>limit){console.error(`${route}: ${bytes} gzip JS bytes exceeds ${limit}`);failed=true}
}
if(process.argv[3]){
  const assets=path.resolve(process.argv[3],'assets');
  const bytes=fs.readdirSync(assets).reduce((sum,file)=>sum+fs.statSync(path.join(assets,file)).size,0);
  if(bytes>2500000){console.error(`Native assets: ${bytes} bytes exceeds 2500000`);failed=true}
}
if(failed)process.exitCode=1;
else console.log('Performance budgets passed for 17 portal routes'+(process.argv[3]?' and native assets':'')+'.');
