// Exercise real form controls and deferred report generators against test data.
const {chromium}=require('playwright'),fs=require('node:fs');
(async()=>{
 const b=await chromium.launch({channel:'chrome'}),results=[];
 for(const width of [390,1440]){
  const c=await b.newContext({viewport:{width,height:900}}),p=await c.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:')?route.continue():route.abort());
  for(const [screen,label] of [['feed','New Feed Log'],['water','New Parameter Log']]){
   await p.goto(`${process.env.PERF_URL}/?screen=${screen}`);await p.waitForFunction(()=>window.__ready);
   await p.getByRole('button',{name:label,exact:true}).click();
   await p.locator('form').first().waitFor({state:'visible'});
   const overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
   results.push({screen,width,formOpened:true,overflow});
  }
  await p.goto(`${process.env.PERF_URL}/?screen=financial`);await p.waitForFunction(()=>window.__ready);
  for(const report of ['profit-loss','cogs','cash-flow','transaction-history']){
   await p.locator('#financial-report-type').selectOption(report);
   await p.evaluate(()=>{delete window.__exportedReport});
   await p.getByRole('button',{name:'Download Statement',exact:true}).click();
   await p.waitForFunction(()=>Boolean(window.__exportedReport),{},{timeout:30000});
   const result=await p.evaluate(()=>window.__exportedReport);
   if(result.hasNaN||!result.hasCompany||result.htmlBytes<1000)throw new Error('Invalid generated report '+report);
   results.push({screen:'financial',report,width,...result});
  }
  if(errors.length)throw new Error(errors.join('; '));
  await c.close();
 }
 await b.close();fs.writeFileSync(process.argv[2],JSON.stringify({method:'Read-only synthetic farm. Actual form components and lazy report generators. PDF download transport captured locally; no backend writes.',results},null,2)+'\n');
})().catch(e=>{console.error(e);process.exit(1)});
