const {chromium}=require('playwright');
const fs=require('node:fs');
require('../register-typescript.cjs');
const {translations}=require('../../web/src/translations/index.ts');
const {chunks}=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
(async()=>{
 const b=await chromium.launch({channel:'chrome'}),results=[];
 for(const language of ['en','id','th','zh','vi','th-failed','storage-denied']){
  const c=await b.newContext({locale:'en-US'}),p=await c.newPage(),errors=[],requests=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(language=>{
   if(language==='storage-denied'){Storage.prototype.getItem=()=>{throw new Error('Storage denied')};return;}
   localStorage.setItem('@language',language==='th-failed'?'th':language);
  },language);
  await p.route('**/*',route=>{
   const url=route.request().url();requests.push(url);
   if(!url.startsWith('http://127.0.0.1:'))return route.abort();
   if(language==='th-failed'&&chunks.th.some(file=>url.includes('/'+file)))return route.abort();
   return route.continue();
  });
  await p.goto((process.env.PERF_URL||'http://127.0.0.1:4315')+'/auth');
  const expected=translations[['th-failed','storage-denied'].includes(language)?'en':language].auth.loginTitle;
  await p.locator('h2').filter({hasText:expected}).waitFor();
  await p.locator('#login-email').fill('read-only@example.test');
  await p.waitForTimeout(300);
  const loaded=Object.fromEntries(Object.entries(chunks).map(([lang,files])=>[lang,files.some(file=>requests.some(url=>url.includes('/'+file)))]));
  const text=await p.locator('h2').innerText();
  results.push({language,expected,text,loaded,errors});
  await c.close();
 }
 await b.close();fs.writeFileSync(process.argv[3],JSON.stringify(results,null,2)+'\n');
 if(results.some(r=>r.text!==r.expected||r.errors.length))process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
