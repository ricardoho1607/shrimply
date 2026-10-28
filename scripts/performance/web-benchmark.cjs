const { chromium } = require('playwright');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const output = [];
  for (const viewport of [{width:390,height:844}, {width:1440,height:900}]) {
    for (const route of ['/', '/auth', '/resources', '/resources/white-spot-syndrome-virus-shrimp']) {
      for (let run=0; run<3; run++) {
        const context = await browser.newContext({ viewport, deviceScaleFactor:1, reducedMotion:'reduce' });
        const page = await context.newPage();
        // Keep real app assets; block external analytics/auth to make runs repeatable.
        await page.route('**/*', route => route.request().url().startsWith('http://127.0.0.1:') ? route.continue() : route.abort());
        const cdp = await context.newCDPSession(page);
        await cdp.send('Network.enable');
        await cdp.send('Network.emulateNetworkConditions', { offline:false, latency:150, downloadThroughput:200000, uploadThroughput:93750 });
        await cdp.send('Emulation.setCPUThrottlingRate', { rate:4 });
        const errors=[];
        page.on('pageerror', e=>errors.push(e.message));
        await page.addInitScript(() => {
          window.__lcp = 0;
          new PerformanceObserver(list => { for(const e of list.getEntries()) window.__lcp = e.startTime; }).observe({type:'largest-contentful-paint', buffered:true});
        });
        await page.goto((process.env.PERF_URL || 'http://127.0.0.1:4311') + route, {waitUntil:'load', timeout:90000});
        await page.waitForTimeout(1500);
        const metrics = await page.evaluate(() => ({
          fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
          lcp: window.__lcp,
          assets: performance.getEntriesByType('resource').map(r=>({name:new URL(r.name).pathname, bytes:r.encodedBodySize, type:r.initiatorType})),
          overflow:document.documentElement.scrollWidth > innerWidth + 1,
          heading:document.querySelector('h1')?.textContent,
        }));
        output.push({viewport,route,run, ...metrics, errors});
        console.error(viewport.width, route, run, Math.round(metrics.lcp));
        await context.close();
      }
    }
  }
  await browser.close();
  fs.writeFileSync(process.argv[2], JSON.stringify({conditions:'Cold cache, 1.6 Mbps down, 150ms latency, 4x CPU throttle; external services blocked equally',results:output},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
