/* Bump VERSION whenever app code or the question bank changes. */
const VERSION = 'cell-study-offline-v1';
const BASE = new URL('./', self.location.href);
const SHELL = ['index.html','app.js','state.js','offline.js','style.css','vendor/daisyui.css','questions.json','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png'];
const url = path => new URL(path, BASE).href;
let downloadJob = null;
async function inventory() {
  const cache = await caches.open(VERSION);
  const response = await cache.match(url('questions.json'));
  if (!response) throw new Error('Question bank is not saved. Reconnect and reload.');
  const questions = await response.json();
  return [...new Set([...SHELL, ...questions.flatMap(q => [...q.images, ...q.answerImages, ...q.contextImages].map(im => im.src))])].map(url);
}
async function status() {
  const files = await inventory();
  const cache = await caches.open(VERSION);
  const keys = new Set((await cache.keys()).map(r => r.url));
  const saved = files.filter(file => keys.has(file)).length;
  return {saved, total:files.length, ready:saved===files.length, downloading:!!downloadJob};
}
async function announce(data) {
  for (const client of await self.clients.matchAll({type:'window', includeUncontrolled:true})) {
    if (client.url.startsWith(BASE.href)) client.postMessage({type:'OFFLINE_STATUS', ...data});
  }
}
async function download() {
  const files = await inventory();
  const cache = await caches.open(VERSION);
  const keys = new Set((await cache.keys()).map(r=>r.url));
  const pending = files.filter(file=>!keys.has(file));
  let next=0, saved=files.length-pending.length, failure=null;
  // A bounded pool avoids hundreds of simultaneous requests on mobile.
  await Promise.all(Array.from({length:6}, async()=>{
    while(next<pending.length && !failure) {
      const file=pending[next++];
      try {
        const response=await fetch(file,{cache:'reload'});
        if(!response.ok) throw new Error('Download interrupted. Reconnect and try again.');
        await cache.put(file,response);
        saved++;
        if(saved%10===0 || saved===files.length) await announce({saved,total:files.length,ready:false,downloading:true});
      } catch(error) { failure=error; }
    }
  }));
  if(failure) throw failure;
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(VERSION);
  await cache.addAll(SHELL.map(path=>new Request(url(path),{cache:'reload'})));
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||!request.url.startsWith(BASE.href))return;
  event.respondWith((async()=>{
    const cache=await caches.open(VERSION);
    const requested=new URL(request.url);
    const key=request.mode==='navigate' && (requested.pathname===BASE.pathname || requested.pathname===new URL('index.html',BASE).pathname) ? url('index.html') : request.url;
    return await cache.match(key) || fetch(request);
  })());
});
self.addEventListener('message',event=>{
  if(!['OFFLINE_STATUS','DOWNLOAD_OFFLINE'].includes(event.data?.type))return;
  event.waitUntil((async()=>{
    try {
      if(event.data.type==='DOWNLOAD_OFFLINE'){
        if(!downloadJob) downloadJob=download().finally(()=>{downloadJob=null;});
        await downloadJob;
      }
      const result=await status();
      event.ports[0]?.postMessage(result);
      await announce(result);
    } catch(error) {
      const result={...(await status().catch(()=>({}))),ready:false,downloading:false,error:error.message};
      event.ports[0]?.postMessage(result);
      await announce(result);
    }
  })());
});
