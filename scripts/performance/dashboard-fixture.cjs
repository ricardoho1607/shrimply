// Build real dashboard screens against a synthetic farm. No production access.
// Set PERF_REAL_PDF=1 for an interactive preview with real PDF downloads.
// Usage: PERF_ESBUILD=/path/to/esbuild node scripts/performance/dashboard-fixture.cjs SOURCE OUTPUT
const path=require('node:path'),fs=require('node:fs');
const esbuild=require(process.env.PERF_ESBUILD || 'esbuild');
const source=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);
const fixtures=path.join(__dirname,'fixtures');
const pages={home:'page.tsx',ponds:'ponds/page.tsx',feed:'feed/page.tsx',water:'water/page.tsx',harvest:'harvest/page.tsx',finance:'finance/page.tsx',inventory:'inventory/feeds/page.tsx',assets:'inventory/assets/page.tsx',financial:'reports/financial/page.tsx',sampling:'reports/shrimp/page.tsx',cycles:'reports/cycles/page.tsx',daily:'reports/daily-operations/page.tsx',projections:'projections/page.tsx'};
const imports=Object.entries(pages).map(([key,file])=>`import ${key} from ${JSON.stringify(path.join(source,'web/src/app/dashboard',file))};`).join('\n');
const entry=`import React from 'react';import {createRoot} from 'react-dom/client';import {LanguageProvider} from ${JSON.stringify(path.join(source,'web/src/contexts/LanguageContext.tsx'))};import Layout from ${JSON.stringify(path.join(source,'web/src/app/dashboard/layout.tsx'))};import ${JSON.stringify(path.join(source,'web/src/app/globals.css'))};${imports}\nconst pages={${Object.keys(pages).join(',')}};const key=new URLSearchParams(location.search).get('screen')||'home';const Page=pages[key]||home;function Probe(){React.useEffect(()=>{requestAnimationFrame(()=>{window.__renderMs=performance.now()-window.__renderStart;window.__ready=true})},[]);return <Layout><Page/></Layout>};window.__renderStart=performance.now();createRoot(document.getElementById('root')).render(<LanguageProvider><Probe/></LanguageProvider>);`;
fs.mkdirSync(out,{recursive:true});
esbuild.build({stdin:{contents:entry,resolveDir:source,loader:'tsx'},bundle:true,format:'esm',splitting:true,outdir:out,entryNames:'app',minify:false,jsx:'automatic',define:{'process.env.NODE_ENV':'"production"','process.env.NEXT_PUBLIC_ADAPTIVE_SOPS_ENABLED':'"false"'},alias:{react:path.join(source,'web/node_modules/react'),'react-dom':path.join(source,'web/node_modules/react-dom')},plugins:[{name:'fixture-only',setup(build){
 build.onResolve({filter:/^\./},args=>{
  const target=path.resolve(path.dirname(args.importer),args.path).replace(/\.tsx?$/, '');
  if(target.endsWith('/web/src/lib/firebase'))return {path:path.join(fixtures,'firebase.ts')};
  if(['/web/src/contexts/AuthContext','/web/src/hooks/useDashboardData','/web/src/hooks/useFarmDateKey'].some(p=>target.endsWith(p)))return {path:path.join(fixtures,'data.ts')};
 });
 build.onResolve({filter:/^\//},args=>args.kind==='url-token'?{path:args.path,external:true}:undefined);
 build.onResolve({filter:/^(?:@\/|next\/|firebase\/)/},args=>{
  if(['@/contexts/AuthContext','@/hooks/useDashboardData','@/hooks/useFarmDateKey'].includes(args.path))return {path:path.join(fixtures,'data.ts')};
  if(args.path==='@/lib/mobilePdfExport' && process.env.PERF_REAL_PDF !== '1')return {path:path.join(fixtures,'pdf.ts')};
  if(args.path==='@/contexts/CurrencyContext')return {path:'currency',namespace:'fixture'};
  if(args.path==='@/lib/firebase'||args.path.startsWith('firebase/'))return {path:path.join(fixtures,'firebase.ts')};
  if(args.path==='next/link'||args.path==='next/navigation')return {path:path.join(fixtures,'next.tsx')};
  if(args.path==='next/image')return {path:'image',namespace:'fixture'};
  if(args.path.startsWith('@/')) return {path:path.join(source,'web/src',args.path.slice(2))+(/\.[a-z]+$/.test(args.path)?'':fs.existsSync(path.join(source,'web/src',args.path.slice(2)+'.tsx'))?'.tsx':'.ts')};
 });
 build.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.path==='currency'?`export const useCurrency=()=>({currentCurrency:'USD',currencyConfig:{code:'USD',symbol:'$',decimalPlaces:2},formatCurrency:value=>new URLSearchParams(location.search).has('reportStress') ? 'Rp '+Number(value).toLocaleString('id-ID',{maximumFractionDigits:0}) : '$'+Number(value).toFixed(2)});`:`export {Image as default} from ${JSON.stringify(path.join(fixtures,'next.tsx'))};`,loader:'tsx',resolveDir:source}));
}}],logLevel:'warning'}).then(()=>{
if (process.env.PERF_REAL_PDF === '1') fs.cpSync(path.join(source,'web/public/pdf'), path.join(out,'pdf'), { recursive: true });
fs.writeFileSync(path.join(out,'index.html'),'<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>');
}).catch(e=>{console.error(e);process.exit(1)});
