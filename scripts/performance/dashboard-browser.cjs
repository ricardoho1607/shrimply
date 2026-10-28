// Real screens + synthetic farm. Browser rendering test, not a live backend test.
const{chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const results=[];
 const screens=(process.env.PERF_SCREENS||'home,ponds,feed,water,harvest,finance,inventory,assets,financial,sampling,cycles,daily,projections').split(',');
 for(const width of [390,1440])for(const screen of screens){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:')?route.continue():route.abort());
  const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await page.goto(`${process.env.PERF_URL}/?screen=${screen}`,{timeout:120000});
  await page.waitForFunction(()=>window.__ready===true,{},{timeout:120000});
  await page.waitForTimeout(300);
  const data=await page.evaluate(()=>({renderMs:window.__renderMs,overflow:document.documentElement.scrollWidth>innerWidth+1,text:document.body.innerText.slice(0,700),inputs:document.querySelectorAll('input').length,buttons:document.querySelectorAll('button').length}));
  if(!data.text)errors.push('Screen rendered no text');
  let interaction='not checked';
  if(['feed','finance','inventory','ponds'].includes(screen)){
   const search=page.locator('input[type="text"],input[type="search"]').first();
   if(await search.count()){await search.fill('Pond 01');await page.waitForTimeout(250);interaction=await search.inputValue()==='Pond 01'?'typing passed':'typing failed'}
  }
  if(process.env.PERF_SHOTS){const dir=path.resolve(process.env.PERF_SHOTS);fs.mkdirSync(dir,{recursive:true});await page.screenshot({path:path.join(dir,`${screen}-${width}.jpg`),type:'jpeg',quality:80,fullPage:false})}
  const result={screen,width,...data,errors,interaction};results.push(result);console.error(screen,width,Math.round(data.renderMs),errors.join(','),data.overflow?'OVERFLOW':'');
  await context.close();
 }
 await browser.close();fs.writeFileSync(process.argv[2],JSON.stringify({conditions:'Real React dashboard screens and layout, synthetic 24-pond farm with 80 records each, mocked Firebase and navigation, Chrome CPU throttled 4x; no production data or writes',results},null,2)+'\n');
 if(results.some(r=>r.errors.length||r.overflow))process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
