'use strict';
/* ══════════════════════════════════════════════════════════
   桃园 · 引擎
   ══════════════════════════════════════════════════════════ */

const SAVE_KEY='taoyuan.save.v1', UNLOCK_KEY='taoyuan.end.v1';
const PHASE_NAME={1:'第一阶段 · 对峙',2:'第二阶段 · 僵持',3:'第三阶段 · 强攻'};
const WEATHER=['晴','阴','雨','小雨','风大','闷热'];
const WEEK=['周一','周二','周三','周四','周五','周六','周日'];

let S=null;
const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const cl100=v=>clamp(v,0,100);
const rand=n=>Math.floor(Math.random()*n);
const pick=a=>a[rand(a.length)];

/* ── 派系动作 ── */
const FACACT={
  zy:{name:'张院人巡查',eff:{r:6,rad:3},res:'张院人从三楼走到一楼，把每扇门都看了一遍。'},
  mx:{name:'老教师联名',eff:{r:4,pub:5,arm:2},res:'七位老教师在联名信上签了名，字迹一个比一个抖。'},
  xl:{name:'许诺一个副主席',eff:{loy:18,r:-3},res:'学生联盟的代表在会议室里待了四十分钟，出来时表情松了。'},
  jg:{name:'请老师上主席台',eff:{loy:14,pub:4,r:2},res:'三位老师被请上台，说了两句话就下去了——他们要赶最后一班校车。'},
  gw:{name:'给一个许诺',eff:{loy:20,r:-3},res:'观望派的人听完，谁也没表态，但第二天有两个没走。'},
  sg:{name:'保证不换物业',eff:{loy:16,pub:-2},res:'宿管会的人说：钥匙还在我们手里，你们放心。'},
  sl:{name:'请进楼',eff:{enter:'sl',arm:4,r:4},res:'学生力量整队走进桃园。门厅一下子挤满了人。',once:1},
  jz:{name:'请教官带人进楼',eff:{enter:'jz',arm:6,r:3},res:'教官把外套脱了，说：那就进去吧。',once:1}
};

/* ── 开局固定的三个选项（照主公吩咐） ── */
const OPEN=[
  { id:'o1', name:'在保安里寻找盟友', desc:'保安大队和保卫处里也有学生。先去找他们。',
    eff:{ arm:14, s:3 }, res:'值班室的门开着。三个人听完，谁也没说话，但谁也没走。',
    tag:'保安大队 + 保卫处' },
  { id:'o2', name:'向学生呼吁', desc:'站到操场上，把话讲给全校听。',
    eff:{ pub:12, rad:5, s:5 }, res:'操场上的人比昨天多。有人举起了手机，一排一排地亮。',
    tag:'全校支持' },
  { id:'o3', name:'发动媒体朋友', desc:'校媒里有几个愿意帮忙的人。',
    eff:{ pub:8, rad:3, neg:1, s:7 }, res:'当天晚上，校园墙上第一次出现了桃园的消息。',
    tag:'舆论' }
];

/* ══════════ 状态 ══════════ */
function newState(){
  const fac={},cnt={},fl={},sup={};
  FR.forEach(f=>{ fac[f.id]=f.loy; cnt[f.id]=f.n; fl[f.id]=f.floor; });
  LOC.forEach(l=>{ sup[l.id]=l.vs; });
  return {
    day:1, phase:1,
    r:34, rad:20, pub:32, susp:0, neg:0, med:6,
    opening:true, sup, out:{},
    fac, cnt, fl,
    actsLeft:2, lawDone:false, medDone:false,
    lawOffer:[], usedOnce:[], usedEv:[], usedActs:[],
    pulledToday:false, appeals:{},
    sel:'ty', selFac:'zy', ftab:'room', proposed:false,
    log:[], feed:[], pendingEvent:null, over:false, storm:null
  };
}

function insideN(){ return FR.reduce((a,f)=>a + (S.fl[f.id]>=0? S.cnt[f.id]:0), 0); }
function validSeats(){ return FR.reduce((a,f)=>a + (S.fl[f.id]>=0? S.cnt[f.id]*S.fac[f.id]/100 : 0), 0); }
function effMul(){ return clamp(0.78 + validSeats()/700, .78, 1.16); }
function insideMax(){ return FR.filter(f=>S.fl[f.id]>=0).reduce((a,f)=>a+S.cnt[f.id],0); }
function guard(){ return Math.round((S.sup.ab + S.sup.bw)/2); }
function supOf(id){ return S.sup[id]|0; }

/* ══════════ 数值对齐原版 ══════════
   原版一个行动大约「决心 +3、激进 +2」，还常带代价（怀疑 +2、人数 -100）。
   这里把所有效果统一压到那个量级：正效果 ×0.55，负效果 ×0.65，怀疑略轻。
   界面显示的就是压过的数，不会有「写着 +8 实际 +4」的错位。 */
function scaleVal(k,v){
  if(typeof v!=='number') return v;
  if(k==='med'||k==='dep'||k==='neg'||k==='enter') return v;   // 资源/人数/谈判/进楼不缩
  if(k==='s'||k==='susp') return v>0? Math.max(1,Math.round(v*0.6)) : Math.min(-1,Math.round(v*0.8));
  return v>0 ? Math.max(1,Math.round(v*0.55)) : Math.min(-1,Math.round(v*0.65));
}
function scaleEff(e){
  if(!e) return e;
  for(const k in e){
    if(k==='pts'||k==='fac'){
      for(const id in e[k]) e[k][id]=scaleVal('pts',e[k][id]);
    } else {
      e[k]=scaleVal(k,e[k]);
    }
  }
  return e;
}
function normalizeAll(){
  ACT.forEach(a=>scaleEff(a.eff));
  LAW.forEach(l=>scaleEff(l.eff));
  EV.forEach(ev=>ev.c.forEach(c=>scaleEff(c.e)));
  DS.forEach(p=>scaleEff(p.e));
  OPEN.forEach(o=>scaleEff(o.eff));
  FR.forEach(f=>{ if(f.bonus){ scaleEff(f.bonus.fx); scaleEff(f.bonus.bad); } });
  for(const id in OUT_X){
    const x=OUT_X[id];
    ['pas','kpas'].forEach(w=>{ if(x[w]) scaleEff(x[w].fx); });
    ['act','act2'].forEach(w=>{ if(x[w]) scaleEff(x[w].fx); });
  }
}
normalizeAll();

function log(t,k){
  S.log.push({d:S.day,t,k:k||''});
  if(S.log.length>60) S.log.shift();
}

function toast(t){
  const el=$('#toast'); $('#toast-b').textContent=t; el.classList.add('on');
  clearTimeout(toast._t); toast._t=setTimeout(()=>el.classList.remove('on'),2200);
}

/* 董事会怀疑：你动静越大，董事会越早动手 */
function suspGain(e){
  let s=(e.s||0);
  if(e.rad) s += Math.max(0,e.rad)*0.35;
  if(e.pub) s += Math.max(0,e.pub)*0.22;
  if(e.r)   s += Math.max(0,e.r)*0.10;
  if(e.neg) s -= Math.min(9, e.neg*3);
  return Math.round(s);
}

function applyEff(e){
  const m=effMul();
  for(const k in e){
    const v=e[k];
    if(k==='r') S.r=cl100(S.r + Math.round(v>0? v*m : v));
    else if(k==='rad') S.rad=cl100(S.rad + (v>0? Math.max(1,Math.round(v*0.7)) : v));
    else if(k==='pub'){
      // 越往上越难涨（70 以上减半），免得「全校支持」一路满格
      const v2=(v>0 && S.pub>=70)? Math.max(1,Math.round(v*0.5)) : v;
      S.pub=cl100(S.pub+v2);
    }
    else if(k==='arm'){ S.sup.ab=cl100(S.sup.ab+v); S.sup.bw=cl100(S.sup.bw+v); }
    else if(k==='s') S.susp=cl100(S.susp+v);
    else if(k==='susp') S.susp=cl100(S.susp+v);
    else if(k==='neg') S.neg=clamp(S.neg+v,-2,8);
    else if(k==='med') S.med=Math.max(0, S.med+v);
    else if(k==='dep') S.cnt.xl=Math.max(0,S.cnt.xl+v);
    else if(k==='loy') S.fac[S.selFac]=cl100(S.fac[S.selFac]+v);
    else if(k==='pts'){ for(const loc in v){ S.sup[loc]=cl100(S.sup[loc]+v[loc]); } }
    else if(k==='fac'){ for(const fid in v){ S.fac[fid]=cl100((S.fac[fid]||0)+v[fid]); } }
    else if(k==='enter'){ const id=(typeof v==='string')?v:'sl'; if(S.fl[id]<0){ S.fl[id]=1; S.cnt[id]=(FR.find(f=>f.id===id)||{}).n||0; } }
  }
  if(!('s' in e) && !('susp' in e)){
    const ds=suspGain(e);
    if(ds) S.susp=cl100(S.susp+ds);
  }
}

/* ══════════ 屏幕 ══════════ */
let cur='s-title';
function show(id){
  cur=id;
  $$('.screen').forEach(el=>el.classList.remove('on'));
  const el=document.getElementById(id); if(el) el.classList.add('on');
  if(id==='s-map') renderMap();
  if(id==='s-floor') renderFloor();
  if(id==='s-media') renderMedia();
  if(id==='s-laws') renderLaws();
  if(id==='s-assault') renderAssault();
}

/* ══════════ 地图 ══════════ */
function prRate(){
  const P=7;   // 原版 PRATE=5（21 天），这里压到 12 天，基数提到 7
  return Math.max(2, P
    - (S.sup.bw>=65?2:0)      // 保卫处（原总参谋部）站过来 → 慢 2
    - (S.sup.ab>=65?1:0)      // 保安大队（原国防部）→ 慢 1
    + (S.sup.xs<=10?1:0)      // 学生会（原内务部）完全是他们的 → 快 1
    - (S.pub>=65?1:0)         // 全校支持高 → 慢 1
    + (S.pub<=25?1:0)         // 全校支持低 → 快 1
    + (S.rad>=60?1:0)         // 激进 60 以上 → 快 1
    + (S.rad>=80?1:0)         // 激进 80 以上 → 再快 1
    - (insideN()>=200?1:0));  // 楼里人多 → 慢 1
}

function suspState(){
  if(S.susp>=90) return {t:'明早就会动手',k:'hot'};
  if(S.susp>=70) return {t:'开始准备清场',k:'hot'};
  if(S.susp>=45) return {t:'盯着你们了',k:''};
  if(S.susp>=20) return {t:'有人提了一句',k:''};
  return {t:'还没把你们当回事',k:''};
}

function renderMap(){
  drawMapDynamic(S.sel,S);
  const pts=LOC.map(l=>{
    const c = l.id==='ds'? '#b3322b' : l.id==='ty'? '#4f74a8' : l.id==='cp'? '#7d9a52' : '#a08a4a';
    const big=l.big?'big':'';
    const red=l.id==='ds'?'red':'';
    const sel=S.sel===l.id?'sel':'';
    let bar='';
    if(l.id==='ty'){ bar=`<span class="bar"><i style="width:${Math.round(validSeats()/Math.max(1,insideMax())*100)}%"></i></span>`; }
    else if(l.vs!==undefined && !l.fixed){
      const v=supOf(l.id);
      bar=`<span class="bar"><i style="width:${v}%;background:${v>=50?'#4f74a8':'#b3322b'}"></i></span>`;
    }
    return `<div class="pt ${big} ${red} ${sel}" data-loc="${l.id}" style="left:${l.x}px;top:${l.y}px;--c:${c}">
      <div class="mk">${l.id==='ty'?'★':l.id==='ds'?'◆':'■'}</div>
      <div class="lb"><span class="nm">${l.name}</span>${bar}</div>
    </div>`;
  }).join('');
  $('#map-pts').innerHTML=pts;

  $('#m-day').textContent=S.day;
  $('#m-date').textContent=`${WEEK[(S.day-1)%7]} · ${WEATHER[S.day%WEATHER.length]}`;
  $('#m-phase').textContent=PHASE_NAME[S.phase];
  $('#m-r').textContent=Math.round(S.r);
  $('#m-rad').textContent=S.rad;
  $('#m-pub').textContent=S.pub;
  $('#m-in').textContent=insideN();

  let tl='<span class="lbl">十二天</span>';
  for(let d=1;d<=LAST_DAY;d++){
    const cls= d<S.day?'past': d===S.day?'now':'';
    const risk= d>=10 && d>=S.day ? 'risk':'';
    tl+=`<div class="c ${cls} ${risk}">${d}</div>`;
  }
  $('#m-tl').innerHTML=tl;

  $('#m-meters').innerHTML=[
    ['决心','h','#c9a25a',Math.round(S.r)],
    ['激进','r','#b3322b',S.rad],
    ['全校支持','p','#4f74a8',S.pub],
    ['保安支持','c','#7fa0cf',guard()]
  ].map(([n,cls,c,v])=>{
    let seg='';
    for(let i=0;i<20;i++) seg+=`<i class="${i<Math.round(v/5)?'on':''}"></i>`;
    return `<div class="meter"><div class="t"><span>${n}</span><b>${v}%</b></div><div class="seg ${cls}" style="--c:${c}">${seg}</div></div>`;
  }).join('');

  const st=suspState();
  $('#m-susp').textContent=Math.round(S.susp)+'%';
  $('#m-suspbar').style.width=Math.round(S.susp)+'%';
  $('#m-suspstate').textContent=st.t;
  $('#m-assaultbox').classList.toggle('hot', S.susp>=60);
  $('#m-clock').textContent = S.susp>=60 ? ('约 '+Math.max(1,Math.ceil((80-S.susp)/3))+' 天') : '—';
  $('#m-a2').textContent = S.susp>=60 ? '保卫处的传闻' : '尚无动静';

  const loc=LOC.find(l=>l.id===S.sel);
  if(S.opening){
    $('#t-name').textContent='开局 · 第一步';
    $('#t-own').innerHTML='三个选项，先走一条。';
    $('#t-facts').innerHTML='董事会还没把你们当回事。先把人、把保安、把消息抓在手里。';
    $('#t-acts').innerHTML=OPEN.map(o=>`
      <div class="act hi" data-open="${o.id}">
        <div class="k">＋</div>
        <div class="t">${o.name}</div>
        <div class="cost">${o.desc}</div>
      </div>`).join('');
  } else {
    const acts=ACT.filter(a=>a.loc===S.sel);
    $('#t-name').textContent=loc.name;
    if(S.sel==='ty'){
      $('#t-own').innerHTML=`在楼 <span>${insideN()}</span> 人 · 有效席位 <span>${Math.round(validSeats())}</span>`;
    } else if(S.sel==='cp'){
      $('#t-own').innerHTML=`操场人数 <span>${Math.round(300+S.pub*120)}</span>`;
    } else if(loc.vs!==undefined && !loc.fixed){
      const v=supOf(S.sel);
      $('#t-own').innerHTML=`支持桃园 <span>${v}%</span> · 支持董事会 <span>${100-v}%</span>`;
    } else {
      $('#t-own').innerHTML='——';
    }
    $('#t-facts').innerHTML=(supOf(S.sel)>=50 && loc.facts1) ? loc.facts1[0] : loc.facts;
    $('#t-acts').innerHTML=acts.map(a=>{
      const used=(a.once && S.usedOnce.includes(a.id)) || S.usedActs.includes(a.id);
      const off=used||S.actsLeft<=0;
      return `<div class="act ${off?'off':''}" data-act="${a.id}">
        <div class="k">${used?'×':'＋'}</div>
        <div class="t">${a.name}</div>
        <div class="cost">${effText(a.eff)}</div>
      </div>`;
    }).join('');
  }

  $('#m-laws').textContent=S.lawDone?0:1;
  $('#m-acts').textContent=S.actsLeft;
  $('#b-laws').classList.toggle('none', S.lawDone);
  $$('.navacts').forEach(n=>n.textContent=S.actsLeft);
  const L=S.log.slice(-3);
  $('#m-log').innerHTML=L.map((l,i)=>`<div class="${i===L.length-1?'new':''} ${l.k}"><span class="tm">D${l.d}</span>${l.t}</div>`).join('');
}

/* ══════════ 开局三步 ══════════ */
function pickOpening(id){
  const o=OPEN.find(x=>x.id===id); if(!o) return;
  S.opening=false;
  applyEff(o.eff);
  log(`<b>${o.name}</b>：${o.res}`,'new');
  toast(`${o.name} — ${o.tag}`);
  addFeed();
  renderAll(); save();
}

function effText(e){
  const N={r:'决心',rad:'激进',pub:'支持',arm:'保安',s:'怀疑',susp:'怀疑',neg:'谈判',dep:'人数',loy:'忠诚',med:'舆论',enter:'进楼'};
  const parts=[];
  for(const k in e){
    const v=e[k];
    if(k==='enter'){ parts.push(`<span class="up">进楼</span>`); continue; }
    if(k==='pts'){
      for(const loc in v){
        const name=(LOC.find(x=>x.id===loc)||{}).name||loc;
        const good=v[loc]>0;
        parts.push(`<span class="${good?'up':'dn'}">${name}${v[loc]>0?'+':''}${v[loc]}</span>`);
      }
      continue;
    }
    if(k==='fac'){
      for(const fid in v){
        const f=(typeof FR!=='undefined'? FR.find(x=>x.id===fid):null);
        parts.push(`<span class="${v[fid]>0?'up':'dn'}">${f?f.name:fid}忠诚${v[fid]>0?'+':''}${v[fid]}</span>`);
      }
      continue;
    }
    if(k==='order'||k==='chance'||k==='run') continue;
    const good=(k==='r'||k==='pub'||k==='neg'||k==='loy'||k==='arm'||k==='med')? v>0 : (k==='s'||k==='susp'? v<0 : v>0);
    parts.push(`<span class="${good?'up':'dn'}">${N[k]||k}${v>0?'+':''}${v}</span>`);
  }
  return parts.join(' ');
}
/* ══════════ 桃园 / 派系 ══════════ */
function renderFloor(){
  drawFloor(S, S.selFac);
  const rows=floorRows(S);
  // 楼层标签
  let notes=rows.map(r=>`<div class="note" style="left:6px;top:${r.y*2-2}px;--c:${r.f.c}">${r.tag} ${r.f.name}</div>`).join('');
  const outside=FR.filter(f=>S.fl[f.id]<0);
  if(outside.length){
    notes+=`<div class="note sys" style="left:6px;bottom:10px">楼外 · ${outside.map(f=>f.name+' '+S.cnt[f.id]).join(' / ')}</div>`;
  }
  $('#floor-notes').innerHTML=notes;
  $('#f-day').textContent=S.day;
  $('#f-inside').textContent=insideN();
  $('#f-valid').textContent=Math.round(validSeats());
  $('#f-outside').textContent=FR.filter(f=>S.fl[f.id]<0).reduce((a,f)=>a+S.cnt[f.id],0);

  const list=FR.map(f=>{
    const inside=S.fl[f.id]>=0, loy=S.fac[f.id], n=S.cnt[f.id], lv=loyLvl(loy), L=LOY[lv];
    let seg=''; for(let i=0;i<10;i++) seg+=`<i class="${i<Math.round(loy/10)?'on':''}"></i>`;
    return `<div class="fc ${S.selFac===f.id?'sel':''}" data-fac="${f.id}" style="--c:${f.c}">
      <div class="fn"><b>${f.name}</b><span>${inside? n+' 人' : '楼外 · '+n+' 人'} · <em style="color:${L.c}">${L.nm}</em></span></div>
      <div class="fb">${seg}</div>
    </div>`;
  }).join('');
  $('#f-list').innerHTML=list;

  const sel=FR.find(f=>f.id===S.selFac)||FR[0];
  const fa=FACACT[S.selFac]||{name:'—',eff:{}};
  const usedOnce=fa.once && S.fl[S.selFac]>=0;
  const lv=loyLvl(S.fac[S.selFac]), L=LOY[lv];
  const bonusTxt = lv>=3 ? `每晚：${fa&&sel.bonus?sel.bonus.t:''}（${effText(sel.bonus.fx)}）`
                 : lv<=1 ? `每晚添乱：${effText(sel.bonus.bad)}` : '每晚：只出一半力，没有加成';
  $('#f-btns').innerHTML=`
    <div class="hint box" style="padding:6px 9px;line-height:16px">
      <b style="color:${L.c}">${sel.name}</b> · ${L.nm}<br>
      <span style="color:var(--mute)">${sel.sub}</span><br>
      ${sel.desc}<br>
      <span style="color:var(--dim)">${bonusTxt}</span>
    </div>
    <div class="hint box" style="padding:6px 9px">今天还可：行动 ${S.actsLeft} 次 · 决议 ${S.lawDone?0:1} · 舆论 ${S.med}</div>
    <div class="act ${S.actsLeft<=0?'off':''}" data-facact="talk">
      <div class="k">＋</div><div class="t">讲话稳一稳</div>
      <div class="cost"><span class="up">忠诚+12</span> <span class="dn">决心-2</span></div>
    </div>
    <div class="act ${S.actsLeft<=0?'off':''}" data-facact="supply">
      <div class="k">＋</div><div class="t">送热水与补给</div>
      <div class="cost"><span class="up">忠诚+8 支持+2</span></div>
    </div>
    <div class="act ${(S.actsLeft<=0||usedOnce)?'off':''}" data-facact="special">
      <div class="k">＋</div><div class="t">${fa.name}</div>
      <div class="cost">${fa.once&&usedOnce?'已用':effText(fa.eff)}</div>
    </div>`;

  $$('.navacts').forEach(n=>n.textContent=S.actsLeft);
  const LOGL=S.log.slice(-2);
  $('#f-log').innerHTML=LOGL.map(l=>`<div class="${l.k}"><span class="tm">D${l.d}</span>${l.t}</div>`).join('');
}

/* ══════════ 舆论（照原版 Эфир） ══════════ */
let mediaSel=null;
function outSt(o){ if(o.id==='rm') return supOf('rm')>=50?'vs':'kr'; return S.out[o.id]||o.s; }
function outLocked(o){ return o.lock; }
function mediaIncome(){ return Math.round(OUTLETS.reduce((a,o)=>a+(outSt(o)==='vs'? o.r:0), 0) * 0.5); }

function nightlyFactions(){
  FR.forEach(f=>{
    const lvl=loyLvl(S.fac[f.id]);
    if(lvl>=3 && f.bonus && f.bonus.fx) applyEff(f.bonus.fx);
    else if(lvl<=1 && f.bonus && f.bonus.bad) applyEff(f.bonus.bad);
  });
}

function nightlyMedia(){
  const inc=mediaIncome();
  if(inc){ S.med+=inc; log(`你手里的媒体带来了 ${inc} 点舆论。`,'kr'); }
  OUTLETS.forEach(o=>{
    const X=OUT_X[o.id]; if(!X) return;
    const st=outSt(o);
    if(st==='vs' && X.pas) applyEff(X.pas.fx);
    else if(st==='kr' && X.kpas) applyEff(X.kpas.fx);
  });
}

function renderMedia(){
  if(!mediaSel || !OUTLETS.find(o=>o.id===mediaSel)) mediaSel=(OUTLETS.find(o=>outSt(o)==='vs')||OUTLETS[0]).id;
  $('#d-day').textContent=S.day;
  $('#d-pub').textContent=S.pub;
  $('#d-rad').textContent=S.rad;
  $('#d-med').textContent=S.med;

  const SN={vs:'支持桃园',neu:'中立',kr:'支持董事会',off:'已关闭'};
  const ord={vs:0,neu:1,kr:2,off:3};
  const list=OUTLETS.slice().sort((a,b)=>ord[outSt(a)]-ord[outSt(b)]||b.r-a.r);
  const groups=[['vs','支持桃园'],['neu','中立'],['kr','支持董事会'],['off','已关闭']];
  let html='';
  const propUsed=!!S.appeals.prop;
  html+=`<div class="grp">常规宣传</div>
    <div class="mc s-vs ${propUsed?'dim':''}" data-prop="1">
      <div class="mn">例行宣传 · 楼内广播</div><div class="mr">—</div>
      <div class="ms vs">${propUsed?'今天已播':'每天一次 · 免费'}</div>
    </div>`;
  groups.forEach(([g,label])=>{
    const rows=list.filter(o=>outSt(o)===g);
    if(!rows.length) return;
    html+=`<div class="grp">${label}</div>`;
    rows.forEach(o=>{
      const st=outSt(o), locked=outLocked(o)&&st!=='vs';
      html+=`<div class="mc s-${st} ${mediaSel===o.id?'sel':''}" data-o="${o.id}">
        <div class="mn">${o.nm}</div><div class="mr">${o.r}</div>
        <div class="ms ${st}">${SN[st]}${locked?' · 锁':''}</div>
      </div>`;
    });
  });
  $('#d-list').innerHTML=html;

  const o=OUTLETS.find(x=>x.id===mediaSel), st=outSt(o), X=OUT_X[o.id];
  let detail=`<h3>${o.nm}</h3><div class="od">${X&&X.about||''}</div><div class="os">覆盖 ${o.r} · ${SN[st]} · ${o.aud||''}</div>`;
  if(st==='vs'){
    const acts=[['o'+o.id,X.act],['p'+o.id,X.act2]].filter(a=>a[1]);
    acts.forEach(([key,a])=>{
      const used=S.appeals[key], can=S.med>=a.cost&&!used;
      detail+=`<div class="act2 ${can?'':'off'}" data-oa="${key}"><div class="wt">${a.t}${used?' · 今天已发':''}</div><div class="wc">${effText(a.fx)} · 消耗 ${a.cost} 舆论</div></div>`;
    });
    if(!acts.length) detail+=`<div class="od">这家在你手里，但今天没有可发的内容。</div>`;
  } else if(st!=='off'){
    if(outLocked(o)){
      detail+=`<div class="od">这家争取不到。${o.id==='rm'?'只能从地图上的融媒体中心下手。':''}</div>`;
    } else {
      const ways=(X&&X.ways||'mxs').split('');
      ways.forEach(k=>{
        const W=OUT_WAYS[k]; if(!W) return;
        const req=W.req?W.req(S,o):true;
        const ok=req===true&&!S.pulledToday;
        detail+=`<div class="way ${ok?'':'off'}" data-w="${k}"><div class="wt">${W.t}</div><div class="wd">${W.d(o)}</div><div class="wc">${ok?'':req}</div></div>`;
      });
      if(S.pulledToday) detail+=`<div class="od">今天已经与一家编辑部打过交道。</div>`;
    }
  } else {
    detail+=`<div class="od">这家已经不起作用了。</div>`;
  }
  detail+=`<div class="feed">${S.feed.slice(-5).reverse().map(t=>`<div>${t}</div>`).join('')}</div>`;
  $('#d-detail').innerHTML=detail;
  $('#d-log').innerHTML=S.log.slice(-2).map(l=>`<div class="${l.k}"><span class="tm">D${l.d}</span>${l.t}</div>`).join('');
}

function outWin(k){
  const o=OUTLETS.find(x=>x.id===mediaSel); if(!o) return;
  const W=OUT_WAYS[k]; if(!W) return;
  const req=W.req?W.req(S,o):true;
  if(req!==true || outLocked(o)) return;
  const st=outSt(o);
  applyEff(W.cost(o));
  if(W.order) S.actsLeft--;
  if(W.run) W.run(S);
  S.pulledToday=true;
  if(W.chance && Math.random()>W.chance){
    applyEff({pub:-3});
    log('拉拢失败：'+o.nm+' 反而在写「闹事者」。','bad');
  } else {
    S.out[o.id]= st==='kr'?'neu':'vs';
    log(o.nm+(st==='kr'?' 不再为校董会说话。':' 现在把话匣子交给桃园。'),'new');
  }
  renderAll(); save();
}

function outAct(key){
  const o=OUTLETS.find(x=>x.id===mediaSel); if(!o) return;
  const a= key==='o'+o.id ? OUT_X[o.id].act : OUT_X[o.id].act2;
  if(!a) return;
  if(S.appeals[key]){ toast('今天已经发过了。'); return; }
  if(S.med<a.cost){ toast('需要 '+a.cost+' 舆论。'); return; }
  S.med-=a.cost; S.appeals[key]=1;
  applyEff(a.fx);
  note('media', o.nm+'：'+a.t, a.fx);
  log(o.nm+': '+a.t+'。','new');
  S.feed.push(`【校园墙】${o.nm}：${a.t}`);
  renderAll(); save();
}

/* 常规宣传：楼内广播，每天一次，不占行动、不花舆论 */
function doProp(){
  if(S.appeals.prop){ toast('今天的例行宣传已经做过了。'); return; }
  S.appeals.prop=1;
  const eff={pub:3, s:1};
  applyEff(eff);
  note('media','例行宣传：楼内广播照常播报', eff);
  log('楼内广播照常播报，声音传到了操场边缘。','new');
  renderAll(); save();
}

/* ══════════ 决议 ══════════ */
function renderLaws(selId){
  $('#l-day').textContent=S.day;
  $('#l-r').textContent=Math.round(S.r);
  $('#l-pub').textContent=S.pub;
  $('#l-state').textContent=S.lawDone?'已用':'可颁布';

  if(!S.lawSel || !S.lawOffer.includes(S.lawSel)) S.lawSel=S.lawOffer[0];
  $('#l-list').innerHTML=S.lawOffer.map(id=>{
    const L=LAW.find(x=>x.id===id);
    return `<div class="lc ${S.lawSel===id?'sel':''}" data-law="${id}">
      <div class="ln">${L.name}</div><div class="ld">${L.desc}</div></div>`;
  }).join('');
  const cur=LAW.find(x=>x.id===S.lawSel);
  if(cur){
    $('#l-detail').innerHTML=`<p>${cur.desc}</p>
      <div class="eff">${effText(cur.eff)}</div>
      <div style="margin-top:10px;color:var(--dim)">颁布后：${cur.res}</div>
      <div style="margin-top:14px"><span class="act ${S.lawDone?'off':''}" data-dolaw="${cur.id}" style="display:inline-flex">
        <span class="k">●</span><span class="t">${S.lawDone?'今日已颁布':'颁布这道决议'}</span></span></div>`;
  }
  const L=S.log.slice(-2);
  $('#l-log').innerHTML=L.map(l=>`<div class="${l.k}"><span class="tm">D${l.d}</span>${l.t}</div>`).join('');
}

/* ══════════ 事件 ══════════ */
function pickEvent(){
  const scripted=EV.find(e=>e.day===S.day && !S.usedEv.includes(e.id));
  if(scripted) return scripted;
  const pool=EV.filter(e=>!S.usedEv.includes(e.id) && !e.day && e.ph.includes(S.phase) && (!e.cond||e.cond(S)));
  if(!pool.length){ const any=EV.filter(e=>!S.usedEv.includes(e.id) && !e.day); return any.length?pick(any):null; }
  return pick(pool);
}

function eventTime(ev){
  return ev.time || (typeof EV_TIME!=='undefined' && EV_TIME[ev.id]) || '';
}

function showEvent(ev){
  S.pendingEvent=ev;
  drawEvent(ev.sc);
  $('#e-capn').textContent=ev.cap||'';
  $('#e-capr').textContent=ev.capr||'';
  const tm=eventTime(ev);
  $('#e-meta').textContent=`第 ${S.day} 天${tm?' · '+tm:''} · 事件`;
  $('#e-title').textContent=ev.t;
  const q=ev.q||ev.capr||'';
  $('#e-quote').textContent=q;
  $('#e-body').textContent=ev.d;
  $('#e-hud').innerHTML=`<div>决心 <b>${Math.round(S.r)}</b></div><div>支持 <b>${S.pub}</b></div><div>激进 <b>${S.rad}</b></div>`;
  $('#e-choices').innerHTML=ev.c.map((c,i)=>{
    const req=c.req? c.req(S) : true;
    const ok=req===true;
    const nums=effText(c.e||{});
    const note=c.n? `<span class="cn">${c.n}</span>` : '';
    const line=ok
      ? (nums + (note? ' · '+note : ''))
      : `<span class="n">${c.rq||req}</span>`;
    return `<div class="ch ${ok?'':'off'}" data-ch="${i}"><div class="k">${i+1}</div><div>${c.l}</div>
      <div class="e">${line}</div></div>`;
  }).join('');
  show('s-event');
}

function chooseEvent(i){
  const ev=S.pendingEvent; if(!ev) return;
  const c=ev.c[i]; if(!c) return;
  if(c.req && c.req(S)!==true){ toast(c.rq||'现在做不到。'); return; }
  S.usedEv.push(ev.id); S.pendingEvent=null;
  applyEff(c.e);
  note('event', ev.t+' · '+c.l, c.e);
  log(`「${ev.t}」— ${c.l}`,'new');
  addFeed();
  show('s-map');
  renderAll();
  save();
}

/* ══════════ 行动 ══════════ */
function doAct(id){
  const a=ACT.find(x=>x.id===id); if(!a) return;
  if(S.actsLeft<=0){ toast('今天没有行动了。'); return; }
  if(a.once && S.usedOnce.includes(a.id)) return;
  if(S.usedActs.includes(a.id)){ toast('这件事今天已经做过了。'); return; }
  S.actsLeft--;
  S.usedActs.push(a.id);
  if(a.once) S.usedOnce.push(a.id);
  applyEff(a.eff);
  note('act', a.name+'：'+a.res, a.eff);
  log(`<b>${a.name}</b>：${a.res}`,'new');
  addFeed();
  renderAll(); save();
}

function doFacAct(kind){
  if(S.actsLeft<=0){ toast('今天没有行动了。'); return; }
  const f=FR.find(x=>x.id===S.selFac);
  if(kind==='talk'){
    S.actsLeft--; S.fac[f.id]=cl100(S.fac[f.id]+12); S.r=cl100(S.r-2);
    log(`在${f.name}那边讲了十分钟。<span class="kr">忠诚+12</span>`,'new');
  } else if(kind==='supply'){
    S.actsLeft--; S.fac[f.id]=cl100(S.fac[f.id]+8); S.pub=cl100(S.pub+2);
    log(`给${f.name}送去热水和补给。<span class="kr">忠诚+8</span>`,'new');
  } else {
    const fa=FACACT[S.selFac];
    if(fa.once && S.fl.sl>=0) return;
    S.actsLeft--; applyEff(fa.eff);
    log(`${fa.name}：${fa.res}`,'new');
  }
  renderAll(); save();
}

function doLaw(id){
  if(S.lawDone){ toast('今天已经颁布过决议了。'); return; }
  const L=LAW.find(x=>x.id===id); if(!L) return;
  S.lawDone=true; S.usedOnce.push(id);
  if(id==='L6') S.proposed=true;
  applyEff(L.eff);
  note('law', L.name, L.eff);
  log(`<b>${L.name}</b> 颁布。${L.res}`,'new');
  addFeed();
  show('s-map'); renderAll(); save();
}

/* ══════════ 回合 ══════════ */
function offerLaws(){
  const pool=LAW.filter(l=>!S.usedOnce.includes(l.id));
  const bag=pool.slice(), out=[];
  while(out.length<3 && bag.length) out.push(bag.splice(rand(bag.length),1)[0].id);
  S.lawOffer=out; S.lawSel=out[0];
}

function startDay(){
  if(S.over) return;
  S.phase=S.day<=4?1:(S.day<=8?2:3);
  S.actsLeft=2; S.lawDone=false; S.medDone=false;
  S.usedActs=[]; S.pulledToday=false; S.appeals={};
  S.dayMoves=[];                                   // 当日流水，写报纸用
  S.d0={ r:Math.round(S.r), rad:S.rad, pub:S.pub, med:S.med, susp:Math.round(S.susp),
         guard:guard(), valid:Math.round(validSeats()), inside:insideN() };
  offerLaws();
  log(`第 ${S.day} 天 · ${PHASE_NAME[S.phase]}`,'kr');
  addFeed();

  if(S.day>=LAST_DAY || S.susp>=100){ startAssault(); return; }

  const ev=pickEvent();
  renderAll(); save();
  if(ev) showEvent(ev); else show('s-map');
}

function note(kind,t,eff){
  if(!S.dayMoves) S.dayMoves=[];
  S.dayMoves.push({kind,t,eff:eff||{}});
}

function endTurn(){
  if(S.over||S.pendingEvent) return;
  if(S.actsLeft>0) log('还有行动没做，这一天就这么过去了。','');
  const p=pick(DS);
  applyEff(p.e);
  note('ds', p.t, p.e);
  log(p.t,'dn');
  applyEff({r:-(2+Math.floor(S.day/4)), pub:-3, arm:-2, rad:-1});
  if(S.susp>=60) applyEff({pub:-1});   // 董事会一认真，舆论就跟着压过来
  S.susp=cl100(S.susp+prRate());
  log('又过去一天。门口的铁马换了个位置，别的一样。','');
  if(guard()<20){
    S.susp=cl100(S.susp+3);
    log('保安大队被集体约谈，态度一下子硬了起来。','bad');
  }
  // 每晚：派系各显其能 + 媒体进账 + 各媒体发挥影响
  nightlyFactions();
  nightlyMedia();

  if(S.rad>=95) return gameOver('blood');
  if(S.r<=0) return gameOver('collapse');
  if(validSeats()<=80) return gameOver('hollow');
  if(S.day>=8 && guard()>=85 && S.pub>=50) return gameOver('defect');
  if(S.day>=10 && S.proposed && S.neg>=4 && S.r>=25 && S.pub>=45 && validSeats()>=150) return gameOver('negotiated');

  showPaper();          // 一天结束：先看报纸
}

function nextDay(){
  if(S.over) return;
  S.day++;
  startDay();
}

/* ══════════ 日报（照原版：一天结束一张报纸） ══════════ */
const PAPER_KICK={ ds:'董事会', event:'校内', law:'决议', act:'桃园', media:'舆论', none:'本日' };
const PAPER_WORD={
  ds:'据本社了解', event:'本报记者现场记录', law:'桃园方面发布',
  act:'桃园方面', media:'媒体观察', none:'本报编辑部'
};

function paperHead(t){
  const s=String(t||'').replace(/<[^>]+>/g,'').replace(/^[^：]{1,12}：/,'');
  return s.length>26 ? s.slice(0,26)+'…' : s;
}
function paperLine(t){
  return String(t||'').replace(/<[^>]+>/g,'');
}
function paperStamps(e){
  const t=effText(e||{});
  return t ? `<span class="st">${t}</span>` : '';
}
function paperComment(){
  const v=Math.round(S.susp);
  if(v>=80) return '明天不会平静。董事会的车队已经在北门等着了。';
  if(v>=60) return '楼下的铁马又加了一排。编辑部今晚不打算关灯。';
  if(v>=40) return '校董会开始认真对待桃园了，这不是好事，也不是坏事。';
  if(S.rad>=70) return '操场上的话越来越硬。有人开始问「然后呢」。';
  return '这一天又过去了。桃园的灯还亮着，董事会的也是。';
}

function showPaper(){
  const M=(S.dayMoves||[]).slice();
  const rank={ds:0,event:1,law:2,act:3,media:4};
  M.sort((a,b)=>(rank[a.kind]??9)-(rank[b.kind]??9));
  const lead=M.shift()||{kind:'none',t:'这一天平静地过去了，没有人敲门。',eff:{}};
  const cols=M.splice(0,2);
  const brief=M.slice();
  const d0=S.d0||{};
  const now={ r:Math.round(S.r),rad:S.rad,pub:S.pub,med:S.med,susp:Math.round(S.susp),
              guard:guard(),valid:Math.round(validSeats()),inside:insideN() };
  const rows=[
    ['决心',d0.r,now.r],['激进',d0.rad,now.rad],['全校支持',d0.pub,now.pub],
    ['董事会怀疑',d0.susp,now.susp],['舆论',d0.med,now.med],
    ['保安支持',d0.guard,now.guard],['有效席位',d0.valid,now.valid],['在楼人数',d0.inside,now.inside]
  ];
  const rowHtml=rows.map(([nm,a,b])=>{
    const dv=(b|0)-(a|0);
    const cls=dv>0?'up':dv<0?'dn':'';
    const sign=dv>0?'+':'';
    return `<div class="row"><span>${nm}</span><b>${b}</b><i class="${cls}">${dv?(sign+dv):'—'}</i></div>`;
  }).join('');

  const colsHtml=cols.map(m=>`
    <div class="col">
      <div class="h2">${paperHead(m.t)}</div>
      <p>${PAPER_WORD[m.kind]||''}，${paperLine(m.t)}</p>
      ${paperStamps(m.eff)}
    </div>`).join('');

  const briefHtml=brief.length
    ? `<div class="brief"><b>简讯</b> ${brief.map(m=>paperLine(m.t).slice(0,28)).join(' · ')}</div>`
    : '';

  $('#p-sheet').innerHTML=`
    <div class="ptop"><span>第 ${180+S.day} 期</span><span>明德学院 · 校内发行</span><span>免费取阅</span></div>
    <div class="pmast">明德日报</div>
    <div class="pdate"><span>${WEEK[(S.day-1)%7]}　第 ${S.day} 天</span><span>${PHASE_NAME[S.phase]}</span></div>
    <div class="pkick">${PAPER_KICK[lead.kind]||'本日'}　·　${PHASE_NAME[S.phase]}</div>
    <div class="ph1">${paperHead(lead.t)}</div>
    <div class="plead">
      <p>${PAPER_WORD[lead.kind]||''}，${paperLine(lead.t)}</p>
      ${paperStamps(lead.eff)}
    </div>
    ${colsHtml?`<div class="pcols">${colsHtml}</div>`:''}
    ${briefHtml}
    <div class="pfoot">明德日报 · 编辑部设在图书馆三楼 · 本版言论不代表校方</div>`;

  $('#p-side').innerHTML=`
    <div class="pbox">
      <h3>今日结算</h3>
      ${rowHtml}
    </div>
    <div class="pbox">
      <h3>编辑部短评</h3>
      <p class="pc">${paperComment()}</p>
    </div>
    <div class="pbtn" id="p-next"><span>继续</span><small>第 ${S.day+1} 天 · ENTER</small></div>`;

  show('s-paper');
  $('#p-next').onclick=()=>nextDay();
  save();
}

function addFeed(){
  if(Math.random()<.7) S.feed.push(pick(FEED));
  if(S.feed.length>40) S.feed.shift();
}

/* ══════════ 强攻（照原版：按小时守、分部位、下指令） ══════════ */
const SECTORS=['正门','东侧楼梯','广播室'];
const HOUR_FROM=7, HOUR_TO=18;
const ORDERS=[
  { id:'hold',     nm:'固守',     d:'最弱的一处补 2 人，稳一小时' },
  { id:'counter',  nm:'反击',     d:'打出去：这一小时来犯减 1，决心 −2' },
  { id:'fallback', nm:'撤回内圈', d:'外围各撤 1 人到底楼，减少损失' },
  { id:'call',     nm:'呼叫支援', d:'舆论 ≥30 时补 2 人，花 8 点舆论' }
];

function startAssault(){
  S.over=true; S.pendingEvent=null;
  const pool=clamp(Math.round(6 + S.pub/10 + validSeats()/22 + guard()/20), 5, 30);
  const air=clamp(Math.round(S.med*2 + S.pub/2), 0, 100);
  S.storm={
    hour:HOUR_FROM, def:[0,0,0], pool, total:pool, cas:0, broke:0, air,
    order:'hold', done:false, log:[], lastHits:null
  };
  S.storm.log.push({t:`07:00 · 装甲车堵住两个路口。能上墙的 ${pool} 人，舆论 ${air}。`,k:''});
  show('s-assault'); renderAssault(); save();
}

function weakest(){
  const d=S.storm.def; let w=0;
  for(let i=1;i<3;i++) if(d[i]<d[w]) w=i;
  return w;
}

function renderAssault(){
  const st=S.storm; if(!st) return;
  $('#a-wave').textContent=`${st.hour}:00`;
  $('#a-res').textContent=st.pool;
  $('#a-r').textContent=Math.round(S.r);
  drawAssault(st);
  if(st.done){
    $('#a-sectors').innerHTML=''; $('#a-orders').innerHTML='';
    $('#b-wave').innerHTML='<div>已结束</div><small>—</small>'; return;
  }
  $('#a-sectors').innerHTML=SECTORS.map((n,i)=>{
    const cls=st.lastHits&&st.lastHits[i]!==undefined? (st.lastHits[i]?'break':'hold'):'';
    return `<div class="sc ${cls}">
      <div class="sn"><span>${n}</span><b>${st.def[i]}</b></div>
      <div class="st">
        <button data-sec="${i}" data-d="-1" ${st.def[i]<=0?'disabled':''}>−</button>
        <button data-sec="${i}" data-d="1" ${st.pool<=0?'disabled':''}>＋</button>
        <span style="font-size:12px;color:var(--dim);line-height:26px">守卫</span>
      </div>
    </div>`;
  }).join('');
  $('#a-orders').innerHTML=`<div class="grp">这一小时的指令</div>`+ORDERS.map(o=>{
    const on=st.order===o.id?'on':'';
    return `<div class="order ${on}" data-ord="${o.id}">
      <div class="on1">${o.nm}</div><div class="on2">${o.d}</div></div>`;
  }).join('');
  const enemy=3+Math.floor((st.hour-HOUR_FROM)/2)+(guard()<45?1:0)+(S.rad>=60?1:0);
  $('#a-hint').textContent=`保卫处判断：这一小时会有两处被压上，每处约 ${enemy} 人。离傍晚还有 ${HOUR_TO-st.hour} 小时。`;
  $('#a-log').innerHTML=st.log.slice(-7).map(l=>`<div class="${l.k}">${l.t}</div>`).join('');
  $('#b-wave').innerHTML=`<div>下一小时</div><small>${st.hour+1}:00 · 回车</small>`;
}

function stormStep(i,d){
  const st=S.storm; if(!st||st.done) return;
  if(d>0){ if(st.pool<=0) return; st.def[i]++; st.pool--; }
  else { if(st.def[i]<=0) return; st.def[i]--; st.pool++; }
  renderAssault();
}

function pickOrder(id){
  const st=S.storm; if(!st||st.done) return;
  st.order=id; renderAssault();
}

function stormHour(){
  const st=S.storm; if(!st||st.done) return;
  let enemy=3+Math.floor((st.hour-HOUR_FROM)/2)+(guard()<45?1:0)+(S.rad>=60?1:0);
  const hh=`${st.hour}:00 → ${st.hour+1}:00`;

  // 指令
  if(st.order==='hold'){ const w=weakest(); st.def[w]+=2; st.log.push({t:`${hh} 固守：${SECTORS[w]}补上 2 人。`,k:''}); }
  else if(st.order==='counter'){
    enemy=Math.max(1,enemy-1); S.r=cl100(S.r-2); st.cas+=1;
    st.log.push({t:`${hh} 反击：打退了前面的几个人，决心 −2，伤了 1 个。`,k:'bad'});
  } else if(st.order==='fallback'){
    [0,1].forEach(i=>{ if(st.def[i]>0){ st.def[i]--; st.def[2]++; } });
    st.log.push({t:`${hh} 撤回内圈：外围让出来，人都退到底楼。`,k:''});
  } else if(st.order==='call'){
    if(st.air>=30){ st.pool+=2; st.air-=8; st.log.push({t:`${hh} 呼叫支援：从后门进来 2 个人。`,k:'new'}); }
    else st.log.push({t:`${hh} 呼叫支援：外面没人在听。`,k:'bad'});
  }
  st.order='hold';

  // 来犯：两处被压上
  const order=[0,1,2].sort(()=>Math.random()-.5).slice(0,2);
  st.lastHits=[0,0,0];
  st.log.push({t:`${hh} 对方压上了${SECTORS[order[0]]}和${SECTORS[order[1]]}，每处 ${enemy} 人。`,k:''});
  order.forEach(i=>{
    if(st.def[i]>=enemy){
      st.lastHits[i]=0; st.def[i]=Math.max(0,st.def[i]-1);
      st.log.push({t:`${SECTORS[i]}守住了。`,k:'new'});
    } else {
      st.lastHits[i]=1; st.cas+=st.def[i]; st.def[i]=0; st.broke++;
      S.r=cl100(S.r-7); S.pub=cl100(S.pub-4); st.air=clamp(st.air-6,0,100);
      st.log.push({t:`${SECTORS[i]}被冲破，伤亡惨重。决心 −7，支持 −4。`,k:'bad'});
    }
  });

  // 每小时：支持够就有志愿者补充
  if(S.pub>=50 && st.pool+st.def[0]+st.def[1]+st.def[2]<st.total+4){
    st.pool+=1; st.log.push({t:'楼下有人从后门进来，补进预备队。',k:'new'});
  }

  st.hour++;

  if(S.r<=0 || st.broke>=3){
    st.done=true; renderAssault();
    return setTimeout(()=>gameOver(st.air>=50 ? 'pyrrhic' : 'fallen'), 600);
  }
  if(st.hour>HOUR_TO){
    st.done=true; renderAssault();
    const kind = st.air>=45 ? (S.neg>=2 ? 'mediate' : 'held') : 'isolated';
    return setTimeout(()=>gameOver(kind), 600);
  }
  renderAssault(); save();
}
/* ══════════ 结算 ══════════ */
function gameOver(kind){
  S.over=true; S.endedAs=kind;
  const E=END[kind]||END.held;
  let unlocked=0;
  try{
    const raw=localStorage.getItem(UNLOCK_KEY);
    const arr=raw?JSON.parse(raw):[];
    if(!arr.includes(kind)){ arr.push(kind); localStorage.setItem(UNLOCK_KEY,JSON.stringify(arr)); }
    unlocked=arr.length;
  }catch(e){}
  $('#x-tag').textContent=`${E.tag} · 结局 ${unlocked} / ${Object.keys(END).length}`;
  $('#x-tag').className='end-tag '+(E.cls==='win'?'win':E.cls==='lose'?'lose':'mid');
  $('#x-title').textContent=E.title;
  $('#x-sub').textContent=E.sub;
  $('#x-text').innerHTML=E.p.map((p,i)=>`<p class="${i===E.p.length-1?'em':''}">${p}</p>`).join('');
  $('#x-fin').innerHTML=[
    ['天数',`${S.day} / ${LAST_DAY}`],
    ['在楼人数',insideN()],
    ['有效席位',Math.round(validSeats())],
    ['决心',Math.round(S.r)],
    ['全校支持',S.pub],
    ['董事会怀疑',Math.round(S.susp)+'%'],
    ['保安支持',guard()+'%'],
    ['舆论',S.med],
    ['激进',S.rad]
  ].map(([k,v])=>`<div class="fr"><span>${k}</span><b>${v}</b></div>`).join('');
  $('#x-note').textContent=E.note;
  $('#x-btns').innerHTML=`<div class="btn box" id="x-again"><div>再来一局</div><small>R</small></div>
    <div class="btn box" id="x-home"><div>回到封面</div><small>ESC</small></div>`;
  try{ localStorage.removeItem(SAVE_KEY); }catch(e){}
  show('s-end');
  $('#x-again').onclick=newGame;
  $('#x-home').onclick=()=>{ show('s-title'); refreshTitle(); };
}

/* ══════════ 存档 ══════════ */
function save(){ try{ localStorage.setItem(SAVE_KEY,JSON.stringify(S)); }catch(e){} }
function load(){ try{ const r=localStorage.getItem(SAVE_KEY); if(!r) return null; const s=JSON.parse(r); return s&&s.day?s:null; }catch(e){ return null; } }

/* ══════════ 总渲染 ══════════ */
function renderAll(){
  if(!S) return;
  if(cur==='s-map') renderMap();
  else if(cur==='s-floor') renderFloor();
  else if(cur==='s-media') renderMedia();
  else if(cur==='s-laws') renderLaws();
  else if(cur==='s-assault') renderAssault();
}

/* ══════════ 开局 / 存档继续 ══════════ */
function newGame(){
  S=newState();
  for(let i=0;i<4;i++) S.feed.push(pick(FEED));
  log('校董会通知：学生自治委员会即日起解散。','bad');
  log('周正站在桃园门厅，身后还有两百多个人。','');
  show('s-map');
  startDay();
}

function continueGame(){
  const s=load(); if(!s) return;
  S=s;
  if(S.storm && !S.storm.done){ show('s-assault'); renderAssault(); }
  else { show('s-map'); renderMap(); if(S.pendingEvent) showEvent(S.pendingEvent); }
}

function refreshTitle(){
  const btn=$('#title-menu').querySelector('[data-k="continue"]');
  btn.classList.toggle('off', !load());
  let n=0; try{ const r=localStorage.getItem(UNLOCK_KEY); n=r?JSON.parse(r).length:0; }catch(e){}
  $('.dates').textContent=`12 天 · 已解锁结局 ${n} / ${Object.keys(END).length}`;
}

/* ══════════ 舞台缩放 ══════════ */
function fitStage(){
  const w=window.innerWidth, h=window.innerHeight;
  const k=Math.min(w/1280, h/720);
  const el=$('#stage');
  el.style.transform=`scale(${k})`;
  // 竖着拿手机就请主公转过来（照原版的好心提示）
  const rot=$('#rotate');
  if(rot) rot.classList.toggle('on', h>w && w<900);
}

/* ══════════ 键盘 ══════════ */
function onKey(e){
  const k=e.key;
  if(k==='Escape'){
    if(cur==='s-floor'||cur==='s-media'||cur==='s-laws'){ show('s-map'); return; }
    if(cur==='s-map'){ openMenu(); return; }
    return;
  }
  if(cur==='s-event'){
    if(k>='1'&&k<='3'){ chooseEvent(parseInt(k,10)-1); }
    return;
  }
  if(cur==='s-title'){
    if(k==='Enter') newGame();
    return;
  }
  if(cur==='s-map'){
    if(k==='Enter'){ endTurn(); }
    else if(k==='Tab'){ e.preventDefault(); show('s-floor'); }
    else if(k==='m'||k==='M'){ show('s-media'); }
    else if(k==='l'||k==='L'){ show('s-laws'); }
  } else if(cur==='s-paper'){
    if(k==='Enter') nextDay();
  } else if(cur==='s-assault'){
    if(k==='Enter') stormHour();
  } else if(cur==='s-end'){
    if(k==='r'||k==='R') newGame();
  }
}

/* ══════════ 菜单 / 导航 ══════════ */
function navGo(t){
  if(t==='menu') return openMenu();
  if(t==='end') return endTurn();
  if(t==='map') return show('s-map');
  if(t==='floor') return show('s-floor');
  if(t==='media') return show('s-media');
  if(t==='laws') return show('s-laws');
}

function openMenu(){
  const m=$('#modal');
  $('#modal-c').innerHTML=`<h2>菜单</h2>
    <p>第 ${S.day} 天 · ${PHASE_NAME[S.phase]} · 董事会怀疑 ${Math.round(S.susp)}%</p>
    <div class="ch" data-mi="close"><div class="k">1</div><div>继续游戏</div><div class="e">ESC</div></div>
    <div class="ch" data-mi="help"><div class="k">2</div><div>怎么玩</div><div class="e">规则与快捷键</div></div>
    <div class="ch" data-mi="title"><div class="k">3</div><div>回到封面</div><div class="e">自动存档会保留</div></div>`;
  m.classList.add('on');
  m.onclick=e=>{
    const b=e.target.closest('[data-mi]');
    if(!b){ if(e.target===m) m.classList.remove('on'); return; }
    const k=b.dataset.mi;
    m.classList.remove('on');
    if(k==='help') openHelp();
    else if(k==='title'){ save(); show('s-title'); refreshTitle(); }
  };
}
/* ══════════ 绑定 ══════════ */
function bind(){
  // 标题
  $('#title-menu').addEventListener('click',e=>{
    const d=e.target.closest('[data-k]'); if(!d||d.classList.contains('off')) return;
    const k=d.dataset.k;
    if(k==='new') newGame();
    else if(k==='continue') continueGame();
    else if(k==='help') openHelp();
  });
  // 地图：选点
  $('#map-pts').addEventListener('click',e=>{
    const p=e.target.closest('.pt'); if(!p) return;
    S.sel=p.dataset.loc; renderMap();
  });
  // 地图：行动
  $('#t-acts').addEventListener('click',e=>{
    const a=e.target.closest('[data-act]'); if(!a) return;
    doAct(a.dataset.act);
  });
  $('#b-end').onclick=()=>endTurn();
  $('#b-laws').onclick=()=>show('s-laws');
  $('#b-menu').onclick=()=>openMenu();
  $('#b-wh').onclick=()=>show('s-floor');
  $('#b-ether').onclick=()=>show('s-media');

  // 顶部导航
  $$('.tabs.nav').forEach(nav=>{
    nav.addEventListener('click',e=>{
      const t=e.target.closest('[data-nav]'); if(!t) return;
      navGo(t.dataset.nav);
    });
  });

  // 开局三选一
  $('#t-acts').addEventListener('click',e=>{
    const o=e.target.closest('[data-open]'); if(!o) return;
    pickOpening(o.dataset.open);
  });

  // 桃园
  $('#f-list').onclick=e=>{ const f=e.target.closest('[data-fac]'); if(!f) return; S.selFac=f.dataset.fac; renderFloor(); };
  $('#f-btns').onclick=e=>{ const b=e.target.closest('[data-facact]'); if(!b) return; doFacAct(b.dataset.facact); };

  // 舆论
  $('#d-list').onclick=e=>{
    if(e.target.closest('[data-prop]')){ doProp(); return; }
    const o=e.target.closest('[data-o]'); if(!o) return; mediaSel=o.dataset.o; renderMedia();
  };
  $('#d-detail').onclick=e=>{
    const w=e.target.closest('[data-w]'); if(w){ outWin(w.dataset.w); return; }
    const a=e.target.closest('[data-oa]'); if(a){ outAct(a.dataset.oa); return; }
  };

  // 决议
  $('#l-list').onclick=e=>{ const l=e.target.closest('[data-law]'); if(!l) return; S.lawSel=l.dataset.law; renderLaws(); };
  $('#l-detail').addEventListener('click',e=>{ const b=e.target.closest('[data-dolaw]'); if(!b) return; doLaw(b.dataset.dolaw); });

  // 强攻
  $('#a-sectors').addEventListener('click',e=>{
    const b=e.target.closest('button[data-sec]'); if(!b) return;
    stormStep(parseInt(b.dataset.sec,10), parseInt(b.dataset.d,10));
  });
  $('#b-wave').onclick=()=>stormHour();
  $('#a-orders').addEventListener('click',e=>{
    const o=e.target.closest('[data-ord]'); if(!o) return;
    pickOrder(o.dataset.ord);
  });

  // 事件
  $('#e-choices').addEventListener('click',e=>{
    const c=e.target.closest('[data-ch]'); if(!c) return;
    chooseEvent(parseInt(c.dataset.ch,10));
  });

  // toast 关闭
  $('#toast').onclick=()=>$('#toast').classList.remove('on');

  window.addEventListener('resize',fitStage);
  window.addEventListener('keydown',onKey);
}

function openHelp(){
  const m=$('#modal');
  $('#modal-c').innerHTML=`<h2>怎么玩</h2>
    <p>你是周正。桃园里还有两百多个人，楼外是学生，楼对面是董事会和保安大队。</p>
    <p><b>每天两道命令</b>：在地图上选地点，点行动。每个选项一天只能用一次。<br>
    <b>每天一道决议</b>：以桃园名义发布的正式文件，威力大，代价也大。<br>
    <b>舆论</b>：在舆论页拉拢校媒（一天一家），拉过来后每天发一条「发声」，消耗舆论点。<br>
    <b>每天一个事件</b>：早间弹出，三选一，选了就定了。</p>
    <p>四根指标：<b>决心</b>（归零就散了）、<b>激进</b>（到 95 就出事）、<b>全校支持</b>（决定成败）、<b>保安支持</b>（保安大队和保卫处站哪边）。
    各地点（博学楼、学生会、融媒体中心…）都有支持度，可在图上拉拢。</p>
    <p>董事会怀疑才是一切的关键：动静越大它涨得越快，到 80 就清场，第 12 天必定清场。</p>
    <p>快捷键：<b>ESC</b> 菜单 · <b>TAB</b> 桃园 · <b>M</b> 舆论 · <b>L</b> 决议 · <b>ENTER</b> 结束回合</p>
    <p style="color:var(--paper)">十二天，八种结局。撑满十二天，或者在此之前逼出一个结果。</p>
    <div class="ch" data-close="1"><div class="k">1</div><div>知道了</div><div class="e"></div></div>`;
  m.classList.add('on');
  m.onclick=e=>{ if(e.target.closest('[data-close]')||e.target===m) m.classList.remove('on'); };
}

/* ══════════ 启动 ══════════ */
function boot(){
  fitStage();
  drawTitle();
  bind();
  refreshTitle();
  const q=new URLSearchParams(location.search);
  const auto=q.get('autoplay')||window.__AUTO;
  if(auto) setTimeout(()=>autoplay(parseInt(auto,10)||4), 60);
}

/* 调试：自动跑几轮 */
function autoplay(n){
  newGame();
  for(let t=0;t<n;t++){
    if(S.over&&!S.storm) break;
    if(S.pendingEvent){
      const ok=S.pendingEvent.c.map((c,i)=>({c,i})).filter(x=>!x.c.req||x.c.req(S)===true);
      if(ok.length) chooseEvent(pick(ok).i);
    }
    let guard=0;
    while(S.actsLeft>0 && guard++<8){
      if(Math.random()<.3){ S.selFac=pick(FR).id; doFacAct('special'); }
      else {
        const a=pick(ACT.filter(x=>!(x.once&&S.usedOnce.includes(x.id)) && !S.usedActs.includes(x.id)));
        if(a) doAct(a.id); else break;
      }
    }
    if(!S.lawDone && S.lawOffer.length) doLaw(S.lawOffer[0]);
    // 随机拉拢或发声一次
    if(!S.pulledToday){
      const pullable=OUTLETS.filter(o=>!o.lock && (outSt(o)==='kr'||outSt(o)==='neu'));
      if(pullable.length && Math.random()<.7){ mediaSel=pick(pullable).id; const ws=(OUT_X[mediaSel]&&OUT_X[mediaSel].ways||'mxs').split(''); outWin(pick(ws)); }
    } else if(S.med>0){
      const mine=OUTLETS.filter(o=>outSt(o)==='vs' && OUT_X[o.id] && OUT_X[o.id].act);
      if(mine.length){ mediaSel=pick(mine).id; outAct('o'+mediaSel); }
    }
    if(S.storm && !S.storm.done){
      let g=0; while(S.storm&&!S.storm.done&&g++<8){ let k=0; while(S.storm.reserve>0){ S.storm.def[k++%3]++; S.storm.reserve--; } nextWave(); }
      break;
    }
    endTurn();
    if(cur==='s-paper') nextDay();     // 报纸那一屏，自动翻到第二天
  }
  renderAll();
}

window.__DBG={ get S(){return S;}, show, set:o=>{Object.assign(S,o); renderAll();}, storm:startAssault, render:renderAll, end:gameOver };

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
else boot();