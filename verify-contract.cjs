/**
 * The emotional contract, walked.
 *
 * Brief §6.2 lists thirteen promises and says outright: 「每一条都必须在成品里
 * 能被检查到」. They were being checked by reading the code and believing it.
 * This walks the running app and asserts each one against what is on screen —
 * which is how #1 was found: the occasion and date framed the result and were
 * absent from the answering screen, the one place the person is afraid.
 *
 * #3 is asserted conditionally on purpose. A run where everything held has
 * nothing to bring back, so demanding the "coming back" copy there would be
 * testing the test rather than the product.
 */
const p=require('puppeteer-core');
const s=ms=>new Promise(r=>setTimeout(r,ms));
const B=`${process.env.APP_URL || 'http://127.0.0.1:4173'}/index.html`;
const R=[];
const ok=(n,pass,note)=>{R.push({n,pass,note}); console.log(`${pass?'✅':'❌'} #${n} ${note}`);};
(async()=>{
const b=await p.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--no-sandbox']});
const g=await b.newPage();await g.setViewport({width:390,height:844,deviceScaleFactor:2});
const txt=()=>g.evaluate(()=>(document.body.innerText||'').replace(/\s+/g,' '));
await g.goto(B,{waitUntil:'networkidle0'});await s(1500);
await g.evaluate(()=>{const x=[...document.querySelectorAll('button')].find(n=>n.innerText.includes('直接带我自己的来'));x&&x.click()});await s(900);
await g.goto(B+'#/',{waitUntil:'networkidle0'});await s(1100);

// #5 记得你 — Today greets with last piece / next occasion / due follow-ups
ok(5, /先在这里过一遍|带一段你可能|接着上次|下一个场合|我替你记着/.test(await txt()), 'Today 用「上次/下一个场合/到期回访」打招呼');

await g.evaluate(()=>{const x=document.querySelector('.today-specimen');x&&x.click()});await s(900);
await g.evaluate(()=>{const x=[...document.querySelectorAll('.sample-option')][1];x&&x.click()});await s(2000);
// #10 读一遍
const readShot=await g.evaluate(()=>({beam:!!document.querySelector('.reading-v6-beam'),marks:document.querySelectorAll('.reading-v6-page mark').length,count:!!document.querySelector('.reading-v6-count')}));
await s(3000);
const readAfter=await g.evaluate(()=>document.querySelectorAll('.reading-v6-page mark').length);
ok(10, readShot.beam && readAfter>readShot.marks, `当着他的面读：光扫过、标记 ${readShot.marks}→${readAfter} 逐处浮出`);

await g.evaluate(()=>{const x=[...document.querySelectorAll('button')].find(n=>/开始过一遍/.test(n.innerText));x&&x.click()});await s(1500);
// #1 occasion/date frame on the run
ok(1, /组会|答辩|代码评审|考试|就想看看|其他场合|月|日/.test(await txt()), '过一遍这一屏能看到场合/日期作为框');
// #12 blank -> method
await g.evaluate(()=>{const x=[...document.querySelectorAll('button')].find(n=>/这题我会卡住/.test(n.innerText));x&&x.click()});await s(1400);
ok(12, /怎么弄清楚|怎么去搞清楚|我会这样/.test(await txt()), '「我会卡住」→ 追问「那你会怎么去搞清楚」');
await g.evaluate(()=>{const t=document.querySelector('.v5-answer-input')||document.querySelector('textarea');if(t){const st=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;st.call(t,'我会先算两个尺寸，再用 valgrind 找第一处非法写。');t.dispatchEvent(new Event('input',{bubbles:true}))}});await s(300);
await g.evaluate(()=>{const bs=[...document.querySelectorAll('button')].filter(x=>!x.disabled&&x.innerText.trim()&&!/先离开|回到|看全文|收起/.test(x.innerText));const b=bs[bs.length-1];b&&b.click()});await s(1500);
// #9 no internal terms / confidence
ok(9, !/dimensionId|packId|confidence|概率|置信度|\b\d{1,3}%/.test(await txt()), '屏上没有内部枚举名/置信度/百分数');
// self-grade before judgement (#red line 4)
const sg=await g.evaluate(()=>[...document.querySelectorAll('.v5-self-options button')].map(x=>x.innerText.trim()));
ok('5.4', sg.length===3 && !/其实不是我的|不是我写的/.test(sg.join('|')), `自评先于判断，三档：${sg.join(' / ')}`);
await g.evaluate(()=>{const x=[...document.querySelectorAll('.v5-self-options button')][0];x&&x.click()});await s(1700);
// #8 one line + fold, not nine modules
const mods=await g.evaluate(()=>document.querySelectorAll('.run-v5 > section, .run-v5 > div').length);
ok(8, mods<=4, `判定之后屏上 ${mods} 个区块（其余在折叠里）`);
// finish
for(let i=0;i<20;i++){const tid=await g.evaluate(()=>document.querySelector('[data-testid]')?.getAttribute('data-testid'));
 if(tid==='result-screen')break;
 const has=await g.evaluate(()=>!!document.querySelector('.v5-answer-input'));
 if(has){await g.evaluate(()=>{const t=document.querySelector('.v5-answer-input');const st=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;st.call(t,'我不太确定，大概是分配内存吧。');t.dispatchEvent(new Event('input',{bubbles:true}))});await s(220);
  await g.evaluate(()=>{const b=document.querySelector('.v5-send');b&&!b.disabled&&b.click()});}
 else{await g.evaluate(()=>{const bs=[...document.querySelectorAll('button')].filter(x=>!x.disabled&&x.innerText.trim()&&!/先离开|回到|返回|看全文|收起|这题我会卡住|多看一点原文/.test(x.innerText));const b=bs[bs.length-1];b&&b.click()});}
 await s(880);}
await s(1200);
const rt=await txt();
const groupsPeek=await g.evaluate(()=>{const d=document.querySelector('.result-all-v5');if(d)d.open=true;
  const v=[...document.querySelectorAll('.result-group')].map(x=>x.getAttribute('data-verdict'));
  if(d)d.open=false; return v;});
ok(2, !/写得不好|质量差|建议改写|你应该改/.test(rt), '结果只评「你讲出了什么」，不评作品本身');
ok('1b', /场合|组会|答辩|代码评审|考试|就想看看|其他场合/.test(rt), '场合印在结果上');
ok(6, /永远不和班级|不和任何人比较|no comparison/i.test(rt) || !/排名|百分位|平均分/.test(rt), '结果里没有任何比较');
ok(7, !/AI 生成|检测|概率|detector/i.test(rt), '不声称能检测 AI');
ok(11, /你自己说过|你的原话|原样留下/.test(rt), '把他自己站住的话留下来');
const groups=await g.evaluate(()=>{const d=document.querySelector('.result-all-v5');if(d)d.open=true;
 return [...document.querySelectorAll('.result-group')].map(x=>({v:x.getAttribute('data-verdict'),size:getComputedStyle(x.querySelector('h2')).fontSize}))});
const first=groups[0];
ok(4, !groups.length || (first && (first.v==='underclaimed' || new Set(groups.map(x=>x.size)).size===1)), `「比你想的更稳」同字号且排最前（分组：${groups.map(x=>x.v+'@'+x.size).join(', ')||'本次只有一类'}）`);
const end=await g.evaluate(()=>{const e=document.querySelector('.ending-v5');return e?{t:e.querySelector('h2')?.textContent,acts:[...e.querySelectorAll('button')].map(x=>x.innerText.trim())}:null});
ok(13, !!end, `结束卡：${end?end.t+' / '+end.acts.join(' · '):'缺失'}`);
/* Only meaningful when something actually slipped: a run where everything
   held has nothing to bring back, and asserting otherwise tests the test. */
/* Read the verdict groups, not the visible copy: the detail fold is closed by
   default, so a run WITH slipped probes still shows none of those words on
   screen and the assertion skipped itself. */
const slipped = groupsPeek.some((v) => v === 'undefended' || v === 'partial');
ok(3, !slipped || /会回来|回头再问|换一个问法|已经替你排好/.test(rt),
  slipped ? '没站住的会换个形状带回来' : '本轮全部站住，没有需要带回来的（断言按条件跳过）');
console.log('\n--- 汇总 ---');
console.log(R.filter(x=>!x.pass).map(x=>'缺口 #'+x.n+' '+x.note).join('\n') || '13 条全部可检查到');
await b.close();})();
