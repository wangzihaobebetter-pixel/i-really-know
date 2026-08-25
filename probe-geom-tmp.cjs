const puppeteer = require('puppeteer-core');
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE='http://127.0.0.1:4174';
const forget = (p) => p.evaluate(async () => {
  const raw = await new Promise((res) => { const o=indexedDB.open('keyval-store'); o.onsuccess=()=>{const r=o.result.transaction('keyval','readonly').objectStore('keyval').get('irk-v2'); r.onsuccess=()=>res(r.result??null); r.onerror=()=>res(null);}; o.onerror=()=>res(null); });
  if(!raw) return; const j=JSON.parse(raw); if(j?.state?.ui) delete j.state.ui.stuckPrimeSeenAt;
  await new Promise((res)=>{ const o=indexedDB.open('keyval-store'); o.onsuccess=()=>{const tx=o.result.transaction('keyval','readwrite'); tx.objectStore('keyval').put(JSON.stringify(j),'irk-v2'); tx.oncomplete=()=>res(); tx.onerror=()=>res();}; o.onerror=()=>res(); });
});
const box = (p, sel) => p.evaluate((s)=>{ const e=document.querySelector(s); if(!e) return null; const r=e.getBoundingClientRect(); return {top:Math.round(r.top),bottom:Math.round(r.bottom),h:Math.round(r.height),w:Math.round(r.width)};},sel);
(async()=>{
  const b=await puppeteer.launch({executablePath:CHROME,headless:'new',args:['--no-sandbox']});
  const p=await b.newPage(); await p.setViewport({width:390,height:844,deviceScaleFactor:2});
  await p.goto(`${BASE}/`,{waitUntil:'networkidle0'}); await p.evaluate(()=>localStorage.clear());
  await p.goto(`${BASE}/#/`,{waitUntil:'networkidle0'}); await new Promise(r=>setTimeout(r,800));
  if(await p.evaluate(()=>location.hash.includes('welcome'))){ await p.evaluate(()=>{const s=[...document.querySelectorAll('button')].find(x=>/直接带我自己的来|Bring my own/.test(x.textContent||'')); (s||document.querySelector('.welcome-primary'))?.click();}); await new Promise(r=>setTimeout(r,900)); await p.goto(`${BASE}/#/`,{waitUntil:'networkidle0'}); await new Promise(r=>setTimeout(r,600)); }
  await p.evaluate(()=>{const g=document.querySelector('.today-specimen, .sample-invitation, .s-specimen'); if(g) g.click();}); await new Promise(r=>setTimeout(r,600));
  await p.evaluate(()=>{const o=document.querySelector('.sample-option'); if(o) o.click();}); await new Promise(r=>setTimeout(r,1100));
  const sid=await p.evaluate(()=>(location.hash.match(/#\/(?:read|run)\/([^/?]+)/)||[])[1]);
  for (const ui of ['04','01']) {
    await p.goto(`${BASE}/?ui=${ui}&pass=clear#/run/${sid}`,{waitUntil:'networkidle0'});
    await forget(p);
    await p.goto(`${BASE}/?ui=${ui}#/run/${sid}`,{waitUntil:'networkidle0'}); await new Promise(r=>setTimeout(r,600));
    console.log(ui,'PRIME actions', JSON.stringify(await box(p,'.run-prime-actions')), 'go', JSON.stringify(await box(p,'.run-prime-go')), 'section', JSON.stringify(await box(p,'.run-prime')));
    if (await p.$('[data-testid="run-prime-go"]')) { await p.click('[data-testid="run-prime-go"]'); await new Promise(r=>setTimeout(r,700)); }
    console.log(ui,'RUN dock', JSON.stringify(await box(p,'.s-dock-meta')), 'send', JSON.stringify(await box(p,'.s-send, .v5-send')), 'scrollH', await p.evaluate(()=>document.documentElement.scrollHeight));
  }
  await b.close();
})();
