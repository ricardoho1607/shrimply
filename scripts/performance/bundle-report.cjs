const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const root = path.resolve(process.argv[2]);
const routes = ['/auth', '/dashboard', '/dashboard/ponds', '/dashboard/feed', '/dashboard/water', '/dashboard/harvest', '/dashboard/finance', '/dashboard/inventory/feeds', '/dashboard/inventory/assets', '/dashboard/inventory/treatment-mixes', '/dashboard/reports/financial', '/dashboard/reports/shrimp', '/dashboard/reports/daily-operations', '/dashboard/reports/cycles', '/dashboard/projections', '/dashboard/ai', '/dashboard/settings'];
const data = routes.map(route => {
  const html = fs.readFileSync(path.join(root, route + '.html'), 'utf8');
  const scripts = [...new Set([...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1]).filter(x=>x.startsWith('/_next/')))];
  const sizes = scripts.map(src => {const data=fs.readFileSync(path.join(root,src));return {src,raw:data.length,gzip:zlib.gzipSync(data).length}});
  return {route,rawJs:sizes.reduce((s,x)=>s+x.raw,0),gzipJs:sizes.reduce((s,x)=>s+x.gzip,0),scripts:sizes};
});
fs.writeFileSync(process.argv[3], JSON.stringify({method:'Unique script src tags in production exported HTML, raw and gzip byte counts; excludes deferred imports',routes:data}, null, 2)+'\n');
