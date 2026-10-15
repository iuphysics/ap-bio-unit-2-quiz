// Run with a local server: QUIZ_URL=http://localhost:4174 node tests/offline-browser.mjs
// Install Playwright or set PLAYWRIGHT_MODULE to an existing Playwright module.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.QUIZ_URL||'http://localhost:4174';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}});
 let page=await context.newPage();
 await page.goto(base);await page.waitForFunction(()=>document.querySelector('#download-offline')?.disabled===false);
 assert.match(await page.locator('#offline-status').innerText(),/Download all/);
 // An interrupted download must never claim readiness; retry resumes it.
 await context.setOffline(true);await page.click('#download-offline');
 await page.waitForFunction(()=>document.querySelector('#offline-status').textContent.includes('incomplete'));
 await context.setOffline(false);await page.click('#download-offline');
 await page.waitForFunction(()=>document.querySelector('#offline-status').textContent.startsWith('Ready offline'),null,{timeout:120000});
 const result=await page.evaluate(async()=>{
  const cache=await caches.open('cell-study-offline-v1');
  const q=await (await cache.match(new URL('questions.json',location.href))).json();
  const urls=[...new Set(q.flatMap(q=>[...q.images,...q.contextImages,...q.answerImages].map(im=>im.src)))];
  return {total:q.length,allCached:(await Promise.all(urls.map(u=>cache.match(new URL(u,location.href))))).every(Boolean)};
 });
 assert.equal(result.total,277);assert.equal(result.allCached,true);
 await context.setOffline(true);await page.close();page=await context.newPage();await page.goto(base);
 await page.waitForSelector('[data-choice="B"]');await page.click('[data-choice="B"]');
 assert.match(await page.locator('#feedback').innerText(),/incorrect/);
 await page.click('[data-mode="missed"]');assert.match(await page.locator('.question-head').innerText(),/Question 1/);
 await page.click('[data-choice="A"]');await page.click('[data-mode="mcq"]');await page.click('#shuffle');
 await page.waitForFunction(()=>[...document.querySelectorAll('.answer-option img')].every(im=>im.complete&&im.naturalWidth>0));
 await page.click('[data-mode="frq"]');await page.click('#browse');await page.click('[data-index="93"]');
 assert.match(await page.locator('.question-head').innerText(),/277/);
 await page.fill('#response','My offline response');await page.click('#reveal');
 await page.locator('.rubric').scrollIntoViewIfNeeded();
 // Fetch every rubric directly, including lazy images below the viewport.
 assert.equal(await page.evaluate(async()=>{
  const imgs=[...document.querySelectorAll('.rubric img')];
  return (await Promise.all(imgs.map(async im=>(await fetch(im.src)).ok))).every(Boolean);
 }),true);
 await page.reload();await page.waitForSelector('#response');assert.equal(await page.inputValue('#response'),'My offline response');
 await page.waitForFunction(()=>document.querySelector('#offline-status').textContent.startsWith('Ready offline'));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 // A missing cache entry must invalidate readiness, then repair while online.
 await page.evaluate(async()=>{const c=await caches.open('cell-study-offline-v1');await c.delete(new URL('assets/question-1-1.webp',location.href));});
 await page.click('#download-offline');await page.waitForFunction(()=>document.querySelector('#download-offline').textContent==='Resume download');
 await context.setOffline(false);await page.click('#download-offline');
 await page.waitForFunction(()=>document.querySelector('#offline-status').textContent.startsWith('Ready offline'));
 console.log('Offline browser checks passed: interrupted download + resume, all 277 problems cached, offline reopen, scoring, missed practice, shuffle, unvisited FRQ rubric, saved draft, mobile layout, cache-loss detection + repair.');
}finally{await browser.close();}
