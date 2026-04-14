// ══════════════════════════════════════════════════════
//  app.js — Lumina Financial
//  State, navigation, Firebase data, and all screen logic
//  Depends on: payperiod.js (loaded before this file)
//  Auth functions are in auth.js (loaded after this file)
// ══════════════════════════════════════════════════════

// ── State ──────────────────────────────────────────────────────
let db=null,uref=null,txs=[],budgets={},goals=[],alerts=[];
let curScr='dashboard',editId=null;
let anBar=null,anLine=null,anWaterfall=null,fChart=null;
let txPg=1,txPS=20,anStart='',anEnd='';
let eType='expense',eCat=null,sType='expense',sCat=null;
let ppOvrd={};
let isLoading=true;

let CATS={
  expense:{Loan:['PTPTN','Emas'],Bills:['Unifi','Umobile','TNB'],Takaful:[],Family:['Wife','Kids'],CC:['Charge'],Subs:['Netflix','Sooka'],Car:[],Community:['Zakat'],Food:['Family','Work'],Toll:[],Parking:[],Fuel:['Fuel','Charge'],Medical:[],Misc:[]},
  income:{Salary:[],Freelance:[],Bonus:[],Investment:[],Other:[]},
  savings:{Saving:[]}
};
let ACCTS=['CIMB','Maybank','RHB','AEON','TNG','SETEL','SPay','Cash','Other'];

// Icons
const ICONS={Loan:'account_balance',Bills:'bolt',Takaful:'shield',Family:'family_restroom',CC:'credit_card',Subs:'subscriptions',Car:'directions_car',Community:'mosque',Food:'restaurant',Toll:'toll',Parking:'local_parking',Fuel:'local_gas_station',Medical:'medical_services',Misc:'category',Salary:'attach_money',Freelance:'work',Bonus:'card_giftcard',Investment:'trending_up',Saving:'savings',Other:'more_horiz',SPay:'payments'};

// Palette (indigo-themed)
const PAL=['#3525cd','#4f46e5','#58579b','#7e3000','#a44100','#1e40af','#0f766e','#7c3aed','#b45309','#be123c','#047857','#0369a1'];
const COMMITTED_CATS=['Loan','Bills','Takaful','CC','Subs'];
const PAL_BG=['#e2dfff','#dad7ff','#e2dfff','#ffdbcc','#ffd2be','#dbeafe','#ccfbf1','#ede9fe','#fef3c7','#ffe4e6','#d1fae5','#e0f2fe'];

const RM=v=>'RM '+parseFloat(v||0).toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2});
const LOADING_HTML='<div class="flex flex-col items-center justify-center py-16 gap-3"><div class="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin"></div><p class="text-xs text-slate-400 font-medium">Loading…</p></div>';
const fd=d=>new Date(d+'T00:00:00').toLocaleDateString('en-MY',{day:'2-digit',month:'short',year:'numeric'});
const avg=arr=>{const nz=arr.filter(v=>v>0);return nz.length?nz.reduce((s,v)=>s+v,0)/nz.length:0};

// ── Auth state (set by auth.js) ──────────────────────────────────
let auth=null;
let currentUser=null;

// ── Navigation ──────────────────────────────────────────────────
function nav(scr){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('[id^="snav-"]').forEach(n=>{n.classList.remove('nav-active');});
  const sc=document.getElementById('sc-'+scr);if(sc){sc.classList.add('active');sc.classList.add('slide-in');setTimeout(()=>sc.classList.remove('slide-in'),350);}
  const sn=document.getElementById('snav-'+scr);if(sn)sn.classList.add('nav-active');
  curScr=scr;
  ppEditKey=null; // close any open pay-period tile editor
  if(scr==='entry'&&!editId)resetEntry();
  if(scr==='analytics'){applyAnalyticsPeriod();}
  if(scr==='forecast')renderForecast();
  if(scr==='budgets')renderBudgets();
  if(scr==='dashboard')renderDashboard();
  if(scr==='settings')renderSettings();
  if(scr==='transactions')renderTx();
  window.scrollTo(0,0);
}

// ── Firebase data ────────────────────────────────────────────────

async function initDB(){
  isLoading=true;
  try{
    setDB('connecting');
    const uid=currentUser.uid;
    uref=db.collection('users').doc(uid);
    PAY_PERIOD.init(db,uid);
    PAY_PERIOD.onChange(()=>{ renderDashboard(); renderBudgets(); if(curScr==='analytics') applyAnalyticsPeriod(); if(curScr==='forecast') renderForecast(); });
    uref.collection('settings').doc('preferences').onSnapshot(doc=>{
      if(doc.exists){
        const d=doc.data();
        if(d.categories) CATS=d.categories;
        if(d.accounts)   ACCTS=d.accounts;
        if(d.payperiod){
          ppOvrd=d.payperiod.overrides||{};
          const dayEl=document.getElementById('s-day');
          if(dayEl) dayEl.value=d.payperiod.defaultDay||25;
        }
      }
      refreshEntry();renderSettings();
    });
    uref.collection('budgets').doc('settings').get().then(doc=>{if(doc.exists)budgets=doc.data();renderBudgets();});
    uref.collection('goals').doc('list').get().then(doc=>{if(doc.exists)goals=(doc.data().goals||[]);});
    uref.collection('alerts').onSnapshot(snap=>{alerts=snap.docs.map(d=>({id:d.id,...d.data()}));renderAlerts();});
    uref.collection('transactions').orderBy('createdAt','desc').onSnapshot(snap=>{
      txs=snap.docs.map(d=>({id:d.id,...d.data()}));
      isLoading=false;
      setDB('connected',txs.length+' RECORDS');
      renderDashboard();renderTx();renderBudgets();
    },err=>{isLoading=false;setDB('error');console.error(err);});
  }catch(e){
    isLoading=false;
    setDB('error');
    console.error(e);
  }
}
function setDB(st,msg=''){
  const cl={connected:'bg-emerald-400',connecting:'bg-amber-400',error:'bg-red-400'};
  document.getElementById('db-dot').className='w-2 h-2 rounded-full flex-shrink-0 '+cl[st];
  document.getElementById('db-lbl').textContent=st==='connected'?msg:st;
}

// ── Dashboard ────────────────────────────────────────────────────
function renderDashboard(){
  if(isLoading){
    ['d-inc','d-exp','d-sav'].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent='—'; });
    return;
  }
  const p=PAY_PERIOD.currentPeriod();
  const inP=PAY_PERIOD.filterToPeriod(txs,p);
  const inc=inP.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const exp=inP.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const sav=inP.filter(t=>t.type==='savings').reduce((s,t)=>s+t.amount,0);

  // Greeting
  const hr=new Date().getHours();
  const greet=hr<12?'Good morning':hr<17?'Good afternoon':'Good evening';
  const firstName=(currentUser&&currentUser.displayName||'').split(/\s+/)[0];
  document.getElementById('d-greeting').textContent=greet+(firstName?', '+firstName:'');

  // Period subheader with days left
  const start=new Date(p.start),end=new Date(p.end);
  const today=new Date(); today.setHours(0,0,0,0);
  const daysLeft=Math.max(Math.ceil((end-today)/86400000),0);
  const fmt=d=>d.toLocaleDateString('en-MY',{day:'numeric',month:'short'});
  document.getElementById('d-period-sub').textContent=`${fmt(start)} – ${fmt(end)} · ${daysLeft} day${daysLeft!==1?'s':''} left`;

  // Summary chips
  document.getElementById('d-inc').textContent=RM(inc);
  document.getElementById('d-exp').textContent=RM(exp);
  document.getElementById('d-sav').textContent=RM(sav);

  // Total Liquidity + period-over-period change
  const bal=inc-exp-sav;
  document.getElementById('d-liquidity').textContent=RM(bal);
  const prevP=PAY_PERIOD.lastNPeriods(2)[1];
  const chEl=document.getElementById('d-liquidity-change');
  if(prevP){
    const prevInP=PAY_PERIOD.filterToPeriod(txs,prevP);
    const prevBal=prevInP.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0)
                 -prevInP.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0)
                 -prevInP.filter(t=>t.type==='savings').reduce((s,t)=>s+t.amount,0);
    if(prevBal!==0){
      const pct=(bal-prevBal)/Math.abs(prevBal)*100;
      const up=pct>=0;
      chEl.textContent=(up?'↑':'↓')+' '+Math.abs(pct).toFixed(1)+'% vs last period';
      chEl.style.color=up?'#1D9E75':'#E24B4A';
      chEl.classList.remove('hidden');
    } else { chEl.classList.add('hidden'); }
  } else { chEl.classList.add('hidden'); }

  // Budget Runway
  const exC=Object.keys(CATS.expense||{});
  const budgetTot=exC.reduce((s,c)=>s+((budgets[c]&&budgets[c].amount)||0),0);
  const totalDays=Math.max(Math.round((end-start)/86400000)+1,1);
  const elapsed=Math.min(Math.max(Math.round((today-start)/86400000)+1,1),totalDays);
  const daily=elapsed>0?exp/elapsed:0;
  const remaining=Math.max((end-today)/86400000,0);
  const projected=exp+daily*remaining;
  const runwayOk=budgetTot===0||projected<=budgetTot;
  const usedPct=budgetTot>0?Math.min(exp/budgetTot*100,100):0;
  document.getElementById('d-runway-used-fill').style.width=usedPct.toFixed(1)+'%';
  document.getElementById('d-runway-used-fill').style.backgroundColor=runwayOk?'#1D9E75':'#E24B4A';
  document.getElementById('d-runway-used-amt').textContent=budgetTot>0?`${RM(exp)} / ${RM(budgetTot)}`:`${RM(exp)} / no budget`;
  document.getElementById('d-runway-elapsed-fill').style.width=(elapsed/totalDays*100).toFixed(1)+'%';
  document.getElementById('d-runway-days').textContent=`Day ${elapsed} of ${totalDays}`;
  const statusEl=document.getElementById('d-runway-status');
  statusEl.textContent=runwayOk?'Lasts the full period':'At risk';
  statusEl.style.color=runwayOk?'#1D9E75':'#E24B4A';

  // Anomaly alert — show worst anomaly from current period
  const thresholds=unusualThresholds();
  const anomalies=inP.filter(t=>t.type==='expense'&&thresholds[t.category]>0&&t.amount>2*thresholds[t.category]);
  anomalies.sort((a,b)=>b.amount-a.amount);
  const alertEl=document.getElementById('d-alert');
  if(anomalies.length>0){
    const a=anomalies[0];
    const mult=(a.amount/thresholds[a.category]).toFixed(0);
    document.getElementById('d-alert-title').textContent=`Unusual spend — ${a.subcategory||a.category}`;
    document.getElementById('d-alert-msg').textContent=`${RM(a.amount)} on ${fd(a.date)}. That's ${mult}× your usual for ${a.category}.`;
    alertEl.classList.remove('hidden');
  } else {
    alertEl.classList.add('hidden');
  }

  calculateHealthScore();
}

function calculateHealthScore(){
  const p=PAY_PERIOD.currentPeriod();
  const inP=PAY_PERIOD.filterToPeriod(txs,p);
  const ptxs=inP.filter(t=>t.type==='expense');
  const exC=Object.keys(CATS.expense||{});

  // Signal 1 — Budget compliance (30 pts)
  const spent=ptxs.reduce((s,t)=>s+t.amount,0);
  const budgetTot=exC.reduce((s,c)=>s+((budgets[c]&&budgets[c].amount)||0),0);
  let s1=15;
  if(budgetTot>0){
    const r=spent/budgetTot;
    if(r<=0.80)s1=30;
    else if(r<=1.00)s1=Math.round(30-(r-0.80)/0.20*12);
    else if(r<=1.10)s1=8;
    else s1=0;
  }

  // Signal 2 — Burn rate safety (30 pts)
  let s2=15;
  if(budgetTot>0){
    const start=new Date(p.start),end=new Date(p.end),today=new Date();
    const elapsed=Math.max((today-start)/86400000,1);
    const remaining=Math.max((end-today)/86400000,0);
    const daily=spent/elapsed;
    const projected=spent+daily*remaining;
    const daysShort=projected>budgetTot?Math.round((projected-budgetTot)/daily):0;
    if(daysShort<=0)s2=30;
    else if(daysShort<=3)s2=18;
    else if(daysShort<=7)s2=8;
    else s2=0;
  }

  // Signal 3 — Savings on track (25 pts)
  const savAmt=inP.filter(t=>t.type==='savings').reduce((s,t)=>s+t.amount,0);
  const savGoal=(goals||[]).reduce((s,g)=>s+(g.monthly||0),0);
  let s3=12;
  if(savGoal>0){
    const r=savAmt/savGoal;
    if(r>=1.00)s3=25;
    else if(r>=0.50)s3=Math.round(12+(r-0.50)/0.50*13);
    else if(r>0)s3=6;
    else s3=0;
  }

  // Signal 4 — Fixed cost ratio (15 pts)
  const FIXED=['Loan','Bills','Takaful','CC','Subs'];
  const hist3=PAY_PERIOD.lastNPeriods(4).slice(1);
  let s4=8;
  if(hist3.length>=1){
    const h3txs=txs.filter(t=>hist3.some(hp=>t.date>=hp.start&&t.date<=hp.end));
    const fixedExp=h3txs.filter(t=>t.type==='expense'&&FIXED.includes(t.category)).reduce((s,t)=>s+t.amount,0);
    const h3inc=h3txs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
    if(h3inc>0){
      const r=fixedExp/h3inc;
      if(r<=0.40)s4=15;
      else if(r<=0.50)s4=12;
      else if(r<=0.60)s4=7;
      else if(r<=0.70)s4=3;
      else s4=0;
    }
  }

  const score=s1+s2+s3+s4;
  const colour=score>=80?'#1D9E75':score>=60?'#BA7517':'#E24B4A';
  const label=score>=80?'Healthy':score>=60?'Fair':'At risk';

  // Detail — lowest signal wins; tie-break: burn > budget > savings > fixed
  const sigs=[
    {s:s2,msg:'Budget projected to run out before period ends.'},
    {s:s1,msg:'Spending is tracking over budget this period.'},
    {s:s3,msg:'No savings recorded yet this period.'},
    {s:s4,msg:'Fixed commitments are taking up a high share of income.'},
  ];
  const minS=Math.min(...sigs.map(x=>x.s));
  const detail=minS>20?'All signals looking good — keep it up.':sigs.find(x=>x.s===minS).msg;

  // Update DOM
  const circ=175.93;
  const ring=document.getElementById('hs-ring');
  const sc=document.getElementById('hs-score');
  const lbl=document.getElementById('hs-label');
  const det=document.getElementById('hs-detail');
  if(!ring||!sc||!lbl||!det)return;
  ring.setAttribute('stroke',colour);
  ring.setAttribute('stroke-dashoffset',(circ*(1-score/100)).toFixed(2));
  sc.textContent=score;
  lbl.textContent=label;
  lbl.style.color=colour;
  det.textContent=detail;

  // Persist to Firestore (non-blocking)
  if(uref){
    const entry={period:p.start,score,label,breakdown:{budgetCompliance:s1,burnRate:s2,savings:s3,fixedCostRatio:s4},calculatedAt:firebase.firestore.FieldValue.serverTimestamp()};
    const href=uref.collection('health').doc('history');
    href.get().then(doc=>{
      const periods=doc.exists?(doc.data().periods||[]):[];
      const idx=periods.findIndex(e=>e.period===p.start);
      if(idx>=0)periods[idx]=entry;else periods.push(entry);
      if(periods.length>24)periods.splice(0,periods.length-24);
      href.set({periods}).catch(()=>{});
    }).catch(()=>{});
  }
}

// ── Transactions ────────────────────────────────────────────────
function unusualThresholds(){
  const periods=PAY_PERIOD.lastNPeriods(4).slice(1); // 3 past periods, not current
  const hist=txs.filter(t=>t.type==='expense'&&periods.some(p=>t.date>=p.start&&t.date<=p.end));
  const sums={},counts={};
  hist.forEach(t=>{sums[t.category]=(sums[t.category]||0)+t.amount;counts[t.category]=(counts[t.category]||0)+1;});
  const out={};
  Object.keys(sums).forEach(c=>{out[c]=sums[c]/counts[c];});
  return out;
}

function renderTx(){
  if(isLoading){document.getElementById('tx-list').innerHTML=LOADING_HTML;return;}
  const tf=document.getElementById('tf-type')?.value||'all';
  const cf=document.getElementById('tf-cat')?.value||'all';
  const mf=document.getElementById('tf-month')?.value||'all';
  let fil=txs.filter(t=>(tf==='all'||t.type===tf)&&(cf==='all'||t.category===cf)&&(mf==='all'||(t.date&&t.date.slice(5,7)===mf)));
  const allC=[...new Set(txs.map(t=>t.category))].sort();
  const csel=document.getElementById('tf-cat');
  if(csel){const cur=csel.value;csel.innerHTML='<option value="all">All Categories</option>'+allC.map(c=>`<option value="${c}"${c===cur?' selected':''}>${c}</option>`).join('');}
  const tot=fil.length,pgs=Math.ceil(tot/txPS)||1;
  if(txPg>pgs)txPg=pgs;
  const sl=fil.slice((txPg-1)*txPS,txPg*txPS);
  const TCLR={expense:'text-slate-900',income:'text-primary',savings:'text-secondary'};
  const thresholds=unusualThresholds();
  document.getElementById('tx-list').innerHTML=sl.length?sl.map(t=>{
    const unusual=t.type==='expense'&&thresholds[t.category]>0&&t.amount>2*thresholds[t.category];
    return`
    <div class="group bg-surface-container-lowest hover:bg-surface-container-low transition-all duration-200 p-4 rounded-2xl flex items-center gap-4">
      <div class="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 flex-shrink-0">
        <span class="material-symbols-outlined msym text-[20px]">${ICONS[t.category]||'payments'}</span>
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-bold text-slate-900 text-sm truncate">${t.category}${t.subcategory?' · '+t.subcategory:''}</p>
        <p class="text-xs text-slate-400 mt-0.5">${fd(t.date)} · ${t.account||''}</p>
        ${t.description?`<p class="text-[11px] text-slate-400 truncate">${t.description}</p>`:''}
      </div>
      <span class="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-surface-container text-slate-500 flex-shrink-0">${t.type}</span>
      ${unusual?'<span class="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 flex-shrink-0">Unusual</span>':''}
      <p class="font-bold text-sm ${TCLR[t.type]} whitespace-nowrap flex-shrink-0">${t.type==='income'?'+':'-'}${RM(t.amount)}</p>
      <div class="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onclick="editTx('${t.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary-fixed transition-all" title="Edit"><span class="material-symbols-outlined msym text-[16px]">edit</span></button>
        <button onclick="delTx('${t.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-error hover:bg-error-container transition-all" title="Delete"><span class="material-symbols-outlined msym text-[16px]">delete</span></button>
      </div>
    </div>`;
  }).join(''):'<div class="p-10 text-center text-sm text-slate-400">No transactions match your filters.</div>';
  document.getElementById('tx-cnt').textContent=tot+' entries';
  document.getElementById('tx-info').textContent=tot?`Showing ${(txPg-1)*txPS+1}–${Math.min(txPg*txPS,tot)} of ${tot}`:'';
  const pn=document.getElementById('tx-pages');
  pn.innerHTML=pgs>1?`<button onclick="txGo(${txPg-1})" ${txPg===1?'disabled':''} class="px-3 py-1.5 rounded-xl bg-white border border-slate-100 text-slate-600 text-xs font-bold disabled:opacity-30 hover:bg-slate-50 transition-all">←</button>${Array.from({length:Math.min(pgs,7)},(_,i)=>i+1).map(i=>`<button onclick="txGo(${i})" class="px-3 py-1.5 rounded-xl text-xs font-bold ${i===txPg?'bg-gradient-to-br from-primary to-primary-container text-white shadow-sm shadow-indigo-200':'bg-white border border-slate-100 text-slate-600 hover:bg-slate-50'} transition-all">${i}</button>`).join('')}<button onclick="txGo(${txPg+1})" ${txPg===pgs?'disabled':''} class="px-3 py-1.5 rounded-xl bg-white border border-slate-100 text-slate-600 text-xs font-bold disabled:opacity-30 hover:bg-slate-50 transition-all">→</button>`:'';
}
function txGo(n){txPg=n;renderTx();}

// ── Entry Form ──────────────────────────────────────────────────
function resetEntry(){editId=null;eType='expense';eCat=null;document.getElementById('e-amt').value='';document.getElementById('e-date').value=new Date().toISOString().slice(0,10);document.getElementById('e-memo').value='';document.getElementById('e-cat-sel').textContent='';document.getElementById('e-mode').textContent='New Entry';document.getElementById('e-submit').textContent='Log Entry';document.getElementById('e-cancel').style.display='none';setType('expense');}
function setType(t){eType=t;eCat=null;['expense','income','savings'].forEach(x=>{const b=document.getElementById('tb-'+x);if(!b)return;b.className=x===t?'px-5 py-2 rounded-lg text-sm font-semibold bg-gradient-to-br from-primary to-primary-container text-white transition-all duration-200 shadow-sm shadow-indigo-200':'px-5 py-2 rounded-lg text-sm font-semibold text-slate-500 hover:text-slate-800 hover:bg-white transition-all duration-200';});refreshEntry();}
function refreshEntry(){
  const as=document.getElementById('e-acct');if(as){const c=as.value;as.innerHTML=ACCTS.map(a=>`<option value="${a}"${a===c?' selected':''}>${a}</option>`).join('');}
  const cats=Object.keys(CATS[eType]||{});
  document.getElementById('e-cat-grid').innerHTML=cats.map(cat=>`
    <button onclick="selCat('${cat}')" class="group flex flex-col items-center gap-3 p-5 rounded-xl transition-all duration-200 active:scale-95 ${cat===eCat?'cat-active bg-primary':'bg-surface-container-low hover:bg-primary-fixed'}">
      <div class="cat-icon w-12 h-12 flex items-center justify-center rounded-full ${cat===eCat?'bg-white/20 text-white':'bg-surface-container-lowest text-on-surface-variant'} group-hover:text-primary transition-colors">
        <span class="material-symbols-outlined msym">${ICONS[cat]||'category'}</span>
      </div>
      <span class="text-xs font-semibold ${cat===eCat?'text-white':'text-slate-600'}">${cat}</span>
    </button>`).join('');
  updSub();
}
function selCat(c){eCat=c;document.getElementById('e-cat-sel').textContent=c;refreshEntry();}
function updSub(){const subs=(CATS[eType]&&eCat&&CATS[eType][eCat])||[];const ss=document.getElementById('e-sub');if(ss)ss.innerHTML=subs.length?subs.map(s=>`<option value="${s}">${s}</option>`).join(''):'<option value="">— none —</option>';}
async function submitEntry(){
  const amt=parseFloat(document.getElementById('e-amt').value);
  const date=document.getElementById('e-date').value;
  const acct=document.getElementById('e-acct').value;
  const sub=document.getElementById('e-sub').value;
  const memo=document.getElementById('e-memo').value.trim();
  const cat=eCat||Object.keys(CATS[eType]||{})[0]||'Misc';
  if(!amt||amt<=0){alert('Please enter a valid amount.');return;}
  if(!date){alert('Please select a date.');return;}
  const t={date,amount:amt,account:acct,type:eType,category:cat,subcategory:sub||'',description:memo,createdAt:Date.now()};
  if(editId){if(uref)await uref.collection('transactions').doc(String(editId)).update(t);else{const i=txs.findIndex(x=>String(x.id)===String(editId));if(i!==-1)txs[i]={...txs[i],...t};}}
  else{if(uref)await uref.collection('transactions').add(t);else{t.id=Date.now();txs.unshift(t);}}
  resetEntry();nav('dashboard');
}
function editTx(id){
  const t=txs.find(x=>String(x.id)===String(id));if(!t)return;
  editId=id;setType(t.type);eCat=t.category;
  document.getElementById('e-amt').value=t.amount;
  document.getElementById('e-date').value=t.date;
  document.getElementById('e-memo').value=t.description||'';
  document.getElementById('e-cat-sel').textContent=t.category;
  document.getElementById('e-mode').textContent='Editing Entry';
  document.getElementById('e-submit').textContent='Update Entry';
  document.getElementById('e-cancel').style.display='block';
  refreshEntry();
  setTimeout(()=>{const s=document.getElementById('e-acct');if(s)s.value=t.account||'';updSub();setTimeout(()=>{const ss=document.getElementById('e-sub');if(ss)ss.value=t.subcategory||'';},50);},50);
  nav('entry');
}
function cancelEdit(){editId=null;resetEntry();nav('transactions');}
async function delTx(id){if(!confirm('Delete this transaction?'))return;if(uref)await uref.collection('transactions').doc(String(id)).delete();else{txs=txs.filter(t=>String(t.id)!==String(id));renderTx();renderDashboard();}}

// ── Analytics ───────────────────────────────────────────────────
function applyAnalyticsPeriod(){
  const v=document.getElementById('an-period')?.value||'this_period';
  const now=new Date();
  if(v==='this_period'){const p=PAY_PERIOD.currentPeriod();anStart=p.start;anEnd=p.end;}
  else if(v==='last_period'){const p=PAY_PERIOD.lastNPeriods(2)[1];anStart=p.start;anEnd=p.end;}
  else if(v==='this_month'){anStart=new Date(now.getFullYear(),now.getMonth(),1).toISOString().slice(0,10);anEnd=new Date(now.getFullYear(),now.getMonth()+1,0).toISOString().slice(0,10);}
  else if(v==='last_30'){const s=new Date(now);s.setDate(s.getDate()-30);anStart=s.toISOString().slice(0,10);anEnd=now.toISOString().slice(0,10);}
  else if(v==='last_90'){const s=new Date(now);s.setDate(s.getDate()-90);anStart=s.toISOString().slice(0,10);anEnd=now.toISOString().slice(0,10);}
  else{const ds=txs.map(t=>t.date).sort();anStart=ds[0]||'';anEnd=ds[ds.length-1]||'';}
  renderAnalytics();
}
function switchAnTab(tab){
  const active='px-4 py-1.5 rounded-lg text-sm font-semibold bg-white text-primary shadow-sm transition-all';
  const inactive='px-4 py-1.5 rounded-lg text-sm font-semibold text-slate-500 hover:text-slate-700 transition-all';
  document.getElementById('an-tab-trends').className=tab==='trends'?active:inactive;
  document.getElementById('an-tab-waterfall').className=tab==='waterfall'?active:inactive;
  document.getElementById('an-trends').classList.toggle('hidden',tab!=='trends');
  document.getElementById('an-waterfall').classList.toggle('hidden',tab!=='waterfall');
  document.getElementById('an-type').classList.toggle('hidden',tab==='waterfall');
  renderAnalytics();
}

function renderWaterfall(inR){
  const wfWrap=document.getElementById('an-wf-wrap');
  const wfEmpty=document.getElementById('an-wf-empty');
  const income=txs.filter(t=>t.type==='income'&&inR(t)).reduce((s,t)=>s+t.amount,0);
  if(!income){wfWrap.innerHTML='';wfEmpty.classList.remove('hidden');return;}
  wfEmpty.classList.add('hidden');
  const expTxs=txs.filter(t=>t.type==='expense'&&inR(t));
  const committed=expTxs.filter(t=>COMMITTED_CATS.includes(t.category)).reduce((s,t)=>s+t.amount,0);
  const disc=expTxs.filter(t=>!COMMITTED_CATS.includes(t.category)).reduce((s,t)=>s+t.amount,0);
  const sav=txs.filter(t=>t.type==='savings'&&inR(t)).reduce((s,t)=>s+t.amount,0);
  const remaining=income-committed-disc-sav;
  const segs=[];
  if(committed>0) segs.push({id:'Committed',value:committed,color:'#E24B4A'});
  if(disc>0)      segs.push({id:'Discretionary',value:disc,color:'#F59E0B'});
  if(sav>0)       segs.push({id:'Savings',value:sav,color:'#3B82F6'});
  if(remaining>0) segs.push({id:'Remaining',value:remaining,color:'#3525cd'});
  // SVG layout constants
  const W=600,H=260,nW=14,pad=10,lX=110,rX=W-130;
  const totalH=H-Math.max(segs.length-1,0)*pad;
  const incY=(H-totalH)/2;
  // Lay out right nodes proportionally
  let ry=incY;
  segs.forEach(s=>{s.h=(s.value/income)*totalH;s.y=ry;ry+=s.h+pad;});
  // Bezier ribbons
  let lCursor=incY;
  const ribbons=segs.map(s=>{
    const lT=lCursor,lB=lCursor+s.h;lCursor+=s.h;
    const cx=(lX+nW+rX)/2;
    return `<path d="M${lX+nW},${lT} C${cx},${lT} ${cx},${s.y} ${rX},${s.y} L${rX},${s.y+s.h} C${cx},${s.y+s.h} ${cx},${lB} ${lX+nW},${lB} Z" fill="${s.color}44" stroke="${s.color}88" stroke-width="0.5"/>`;
  });
  // Left (Income) node + label
  const leftSVG=`<rect x="${lX}" y="${incY}" width="${nW}" height="${totalH}" rx="3" fill="#1D9E75"/>
    <text x="${lX-10}" y="${incY+totalH/2-8}" text-anchor="end" font-family="Inter,sans-serif" font-size="12" font-weight="600" fill="#334155">Income</text>
    <text x="${lX-10}" y="${incY+totalH/2+8}" text-anchor="end" font-family="Inter,sans-serif" font-size="11" fill="#94a3b8">${RM(income)}</text>`;
  // Right nodes + labels
  const rightSVG=segs.map(s=>`<rect x="${rX}" y="${s.y}" width="${nW}" height="${s.h}" rx="3" fill="${s.color}"/>
    <text x="${rX+nW+10}" y="${s.y+s.h/2-8}" font-family="Inter,sans-serif" font-size="12" font-weight="600" fill="#334155">${s.id}</text>
    <text x="${rX+nW+10}" y="${s.y+s.h/2+8}" font-family="Inter,sans-serif" font-size="11" fill="#94a3b8">${RM(s.value)}</text>`).join('');
  wfWrap.innerHTML=`<svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" style="overflow:visible">${ribbons.join('')}${leftSVG}${rightSVG}</svg>`;
}

function renderAnalytics(){
  if(isLoading){document.getElementById('an-table').innerHTML=LOADING_HTML;return;}
  const tp=document.getElementById('an-type')?.value||'expense';
  const inR=t=>(!anStart||t.date>=anStart)&&(!anEnd||t.date<=anEnd);
  const e2=txs.filter(t=>t.type==='expense'&&inR(t)).reduce((s,t)=>s+t.amount,0);
  const i2=txs.filter(t=>t.type==='income'&&inR(t)).reduce((s,t)=>s+t.amount,0);
  const s2=txs.filter(t=>t.type==='savings'&&inR(t)).reduce((s,t)=>s+t.amount,0);
  document.getElementById('an-exp').textContent=RM(e2);document.getElementById('an-inc').textContent=RM(i2);document.getElementById('an-sav').textContent=RM(s2);
  const ct2={};txs.filter(t=>t.type==='expense'&&inR(t)).forEach(t=>ct2[t.category]=(ct2[t.category]||0)+t.amount);
  const top2=Object.entries(ct2).sort((a,b)=>b[1]-a[1])[0];
  document.getElementById('an-top').textContent=top2?`${top2[0]} (${RM(top2[1])})`:'—';
  // Waterfall tab — render waterfall and skip trends charts
  if(!document.getElementById('an-waterfall')?.classList.contains('hidden')){
    if(anBar){anBar.destroy();anBar=null;}
    if(anLine){anLine.destroy();anLine=null;}
    renderWaterfall(inR);
    return;
  }
  if(anWaterfall){anWaterfall.destroy();anWaterfall=null;}
  const fil=txs.filter(t=>t.type===tp&&inR(t));
  if(!fil.length){
    if(anBar){anBar.destroy();anBar=null;}
    if(anLine){anLine.destroy();anLine=null;}
    document.getElementById('an-table').innerHTML='<p class="text-sm text-slate-400 text-center py-6">No data for selected period.</p>';
    return;
  }
  const cats=[...new Set(fil.map(t=>t.category))].sort();
  const ms=[...new Set(fil.map(t=>t.date.slice(0,7)))].sort();
  const ml=ms.map(m=>{const[y,mo]=m.split('-');return['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(mo)-1]+' '+y;});
  const data={};ms.forEach(m=>{data[m]={};cats.forEach(c=>data[m][c]=0);});fil.forEach(t=>{const m=t.date.slice(0,7);data[m][t.category]=(data[m][t.category]||0)+t.amount;});
  const ds=cats.map((c,i)=>({label:c,data:ms.map(m=>data[m][c]||0),backgroundColor:PAL[i%PAL.length]+'cc',borderColor:PAL[i%PAL.length],borderWidth:1.5,borderRadius:4}));
  if(anBar){anBar.destroy();anBar=null;}if(anLine){anLine.destroy();anLine=null;}
  const bOpts={responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{size:10,family:'Inter'},boxWidth:10,padding:10}}},scales:{x:{stacked:true,grid:{display:false},ticks:{font:{size:10,family:'Inter'}}},y:{stacked:true,ticks:{callback:v=>'RM'+v.toLocaleString(),font:{size:10,family:'Inter'}},grid:{color:'#f2f4f6'}}}};
  const bc=document.getElementById('an-bar')?.getContext('2d');if(bc)anBar=new Chart(bc,{type:'bar',data:{labels:ml,datasets:ds},options:bOpts});
  const lc=document.getElementById('an-line')?.getContext('2d');
  if(lc)anLine=new Chart(lc,{type:'line',data:{labels:ml,datasets:cats.map((c,i)=>({label:c,data:ms.map(m=>data[m][c]||0),borderColor:PAL[i%PAL.length],backgroundColor:PAL[i%PAL.length]+'18',borderWidth:2,pointRadius:3.5,pointHoverRadius:5,tension:.4,fill:false}))},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{size:10,family:'Inter'},boxWidth:10,padding:10}}},scales:{x:{grid:{color:'#f2f4f6'},ticks:{font:{size:10}}},y:{ticks:{callback:v=>'RM'+v.toLocaleString(),font:{size:10}},grid:{color:'#f2f4f6'}}}}});
  const tots={};fil.forEach(t=>tots[t.category]=(tots[t.category]||0)+t.amount);
  const grand=Object.values(tots).reduce((s,v)=>s+v,0)||1;
  const srt=Object.entries(tots).sort((a,b)=>b[1]-a[1]);
  document.getElementById('an-table').innerHTML=srt.length?`<div class="space-y-3">${srt.map(([c,a],i)=>{const p=a/grand*100;return`<div class="flex items-center gap-4">
    <div class="w-3 h-3 rounded-full flex-shrink-0" style="background:${PAL[i%PAL.length]}"></div>
    <span class="flex-1 text-sm font-medium text-slate-700">${c}</span>
    <span class="text-sm font-bold text-slate-900">${RM(a)}</span>
    <div class="w-28 bg-surface-container-low rounded-full overflow-hidden h-2"><div style="width:${p}%;background:${PAL[i%PAL.length]}" class="h-full rounded-full"></div></div>
    <span class="text-xs text-slate-400 font-semibold w-10 text-right">${p.toFixed(0)}%</span>
  </div>`;}).join('')}</div>`:'<p class="text-sm text-slate-400 text-center py-6">No data for selected period.</p>';
}

// ── Budgets ──────────────────────────────────────────────────────
function renderAlerts(){
  const el=document.getElementById('b-alerts');
  if(!el)return;
  const open=alerts.filter(a=>a.status==='open');
  el.innerHTML=open.map(a=>`
    <div class="mb-3 px-5 py-3.5 rounded-2xl flex items-center gap-3 flex-wrap text-sm font-medium bg-error-container text-on-error-container">
      <span class="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex-shrink-0 bg-red-600 text-white">Budget Alert</span>
      <span class="flex-1"><strong>${a.category}</strong> is over budget by <strong>${RM(a.amount_over||0)}</strong> this period.</span>
      <button onclick="acknowledgeAlert('${a.id}')" class="flex-shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-white/30 hover:bg-white/50 transition-colors">Acknowledge</button>
    </div>`).join('');
  renderAlertBadge();
}

function renderAlertBadge(){
  const el=document.getElementById('alert-badge');
  if(!el)return;
  const n=alerts.filter(a=>a.status==='open').length;
  el.textContent=n;
  el.classList.toggle('hidden',n===0);
}

function acknowledgeAlert(id){
  if(uref)uref.collection('alerts').doc(id).update({status:'acknowledged'});
  else{const a=alerts.find(x=>x.id===id);if(a)a.status='acknowledged';renderAlerts();}
}

function getPTxs(){const p=PAY_PERIOD.currentPeriod();return txs.filter(t=>t.type==='expense'&&t.date&&t.date>=p.start&&t.date<=p.end);}
function renderBudgets(){
  if(curScr!=='budgets')return;
  if(isLoading){document.getElementById('b-prog').innerHTML=LOADING_HTML;return;}
  const p=PAY_PERIOD.currentPeriod();
  document.getElementById('b-period-note').textContent='Tracking your spending for '+p.label;
  const ptxs=getPTxs(),exC=Object.keys(CATS.expense||{});
  const spent=ptxs.reduce((s,t)=>s+t.amount,0);
  const tot=exC.reduce((s,c)=>s+((budgets[c]&&budgets[c].amount)||0),0);
  const rem=tot-spent;
  const pct=tot>0?Math.min(spent/tot*100,100):0;
  // Gauge
  const circ=2*Math.PI*80;
  document.getElementById('gauge-fill').setAttribute('stroke-dashoffset',(circ*(1-pct/100)).toFixed(2));
  document.getElementById('gauge-pct').textContent=pct.toFixed(0)+'%';
  document.getElementById('b-spent-big').textContent=RM(spent);
  document.getElementById('b-total-note').textContent=`of ${RM(tot)} limit reached`;
  document.getElementById('b-warn').classList.toggle('hidden',pct<75);
  document.getElementById('b-spent').textContent=RM(spent);
  document.getElementById('b-total').textContent=RM(tot);
  const re=document.getElementById('b-rem');re.textContent=RM(Math.abs(rem));re.className=`text-xl font-bold font-headline ${spent>tot?'text-tertiary':'text-primary'}`;
  // Insight
  const topCat=exC.reduce((acc,c)=>{const s=ptxs.filter(t=>t.category===c).reduce((a,t)=>a+t.amount,0);return s>acc[1]?[c,s]:acc;},['',0]);
  document.getElementById('b-insight').textContent=tot>0?`Based on current flow, you could save an additional ${RM(Math.max(rem,0))} this period by reviewing ${topCat[0]||'your top category'} expenses.`:'Set budget limits on the left to receive personalised insights.';
  // Burn rate
  renderBurnRate(p,spent,tot,ptxs,exC);
  // Budget form
  document.getElementById('b-form').innerHTML=exC.map(c=>{const b=budgets[c]||{amount:0,threshold:80};return`<div class="flex items-center gap-2.5 py-1.5">
    <div class="w-2 h-2 rounded-full flex-shrink-0" style="background:${PAL[exC.indexOf(c)%PAL.length]}"></div>
    <span class="flex-1 text-xs font-semibold text-slate-700 truncate">${c}</span>
    <input type="number" id="bg-${c}" value="${b.amount||''}" placeholder="0" min="0" step="0.01" class="w-24 bg-surface-container-low border border-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-bold text-on-surface text-right outline-none focus:ring-2 focus:ring-primary/20"/>
    <select id="bt-${c}" class="bg-surface-container-low border border-slate-100 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-500 outline-none">
      <option value="70" ${b.threshold==70?'selected':''}>70%</option>
      <option value="80" ${b.threshold==80?'selected':''}>80%</option>
      <option value="90" ${b.threshold==90?'selected':''}>90%</option>
      <option value="100" ${b.threshold==100?'selected':''}>100%</option>
    </select></div>`;}).join('');
  // Progress
  const bdgd=exC.filter(c=>budgets[c]&&budgets[c].amount>0);
  const unb=exC.filter(c=>!budgets[c]||!budgets[c].amount).filter(c=>ptxs.filter(t=>t.category===c).reduce((s,t)=>s+t.amount,0)>0);
  document.getElementById('b-prog').innerHTML=bdgd.length?bdgd.map(c=>{
    const sp=ptxs.filter(t=>t.category===c).reduce((s,t)=>s+t.amount,0);
    const bv=budgets[c].amount,thr=budgets[c].threshold||80;
    const pct=bv>0?Math.min(sp/bv*100,100):0,raw=bv>0?sp/bv*100:0;
    const st=raw>=100?'over':raw>=thr?'warning':'ok';
    if(st==='over'&&uref){const aid=`${c}-${p.start.slice(0,7)}`;if(!alerts.find(a=>a.category===c&&a.period===p.start.slice(0,7)))uref.collection('alerts').doc(aid).set({category:c,period:p.start.slice(0,7),status:'open',amount_over:sp-bv,createdAt:Date.now()});}
    const fc=st==='over'?'#7e3000':st==='warning'?'#b45309':'#3525cd';
    const clr=PAL[exC.indexOf(c)%PAL.length];
    return`<div class="bg-surface-container-lowest p-4 rounded-2xl amb-card">
      <div class="flex justify-between items-center mb-2.5">
        <div class="flex items-center gap-2.5">
          <div class="w-2 h-2 rounded-full" style="background:${clr}"></div>
          <span class="text-sm font-semibold text-slate-800">${c}</span>
        </div>
        <span class="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${st==='over'?'bg-error-container text-on-error-container':st==='warning'?'bg-tertiary-fixed text-on-tertiary-fixed':'bg-primary-fixed text-on-primary-fixed-variant'}">${st==='over'?'Over Budget':st==='warning'?thr+'% Alert':'On Track'}</span>
      </div>
      <div class="btrack"><div class="bfill" style="width:${pct}%;background:${fc}"></div></div>
      <div class="flex justify-between mt-1.5">
        <span class="text-[10px] text-slate-400 font-semibold">${RM(sp)} / ${RM(bv)}</span>
        <span class="text-[10px] font-bold" style="color:${fc}">${raw.toFixed(0)}%</span>
      </div>
    </div>`;}).join('')+(unb.length?`<div class="mt-1"><p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Unbudgeted spending</p>${unb.map(c=>{const sp=ptxs.filter(t=>t.category===c).reduce((s,t)=>s+t.amount,0);return`<div class="flex justify-between py-2 px-3.5 bg-surface-container-lowest rounded-xl mb-1.5 amb-card"><span class="text-xs text-slate-500">${c}</span><span class="text-xs font-bold text-slate-800">${RM(sp)}</span></div>`;}).join('')}</div>`:''):'<div class="p-8 text-center text-xs text-slate-400">Set budgets and click Save Allocations.</div>';
}
function renderBurnRate(p,spent,tot,ptxs,exC){
  const el=document.getElementById('b-burnrate');
  if(!el)return;

  const BASE='mb-6 px-5 py-3.5 rounded-2xl flex items-center gap-3 flex-wrap text-sm font-medium';
  const label=(txt,cls)=>`<span class="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex-shrink-0 ${cls}">${txt}</span>`;

  // Top 3 categories by spend this period
  const topCats=exC
    .map(c=>({c,s:ptxs.filter(t=>t.category===c).reduce((a,t)=>a+t.amount,0)}))
    .filter(x=>x.s>0).sort((a,b)=>b.s-a.s).slice(0,3);

  // Driver pills — always called when spent > 0, so spent is safe as divisor
  const drivers=()=>topCats.length?
    `<span class="w-full flex items-center gap-2 flex-wrap mt-2 pt-2 border-t border-current/10">
      <span class="text-[10px] font-bold uppercase tracking-wider opacity-60">Top drivers</span>
      ${topCats.map(x=>`<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/50 border border-current/10 text-[11px] font-bold">
        ${x.c} <span class="opacity-60">·</span> ${(x.s/spent*100).toFixed(0)}%
        ${budgets[x.c]&&budgets[x.c].amount&&x.s>budgets[x.c].amount?'<span class="text-[9px] font-black uppercase ml-0.5 opacity-75">over</span>':''}
      </span>`).join('')}
    </span>`:'';

  if(tot===0){
    el.className=BASE+' bg-surface-container text-slate-500';
    el.innerHTML=label('Burn Rate','bg-slate-200 text-slate-600')+'Set budget limits to see how long they\'ll last at your current spend rate.';
    return;
  }

  const MS=86400000,today=new Date();today.setHours(0,0,0,0);
  const start=new Date(p.start+'T00:00:00'),end=new Date(p.end+'T00:00:00');
  const elapsed=Math.max(Math.round((today-start)/MS)+1,1);
  const remaining=Math.max(Math.round((end-today)/MS),0);

  if(spent>tot){
    el.className=BASE+' bg-red-50 text-red-700 border border-red-100';
    el.innerHTML=label('Burn Rate','bg-red-600 text-white')+`Over budget by <strong>${RM(spent-tot)}</strong> — ${remaining} day${remaining!==1?'s':''} still remaining in the period.`+drivers();
    return;
  }
  if(spent===0){
    el.className=BASE+' bg-surface-container text-slate-500';
    el.innerHTML=label('Burn Rate','bg-slate-200 text-slate-600')+'No spending recorded yet this period.';
    return;
  }

  const rate=spent/elapsed;
  const daysLeft=(tot-spent)/rate;
  const proj=spent+rate*remaining;
  const rateStr=`${RM(rate)}/day`;

  if(daysLeft<remaining){
    const runsOut=new Date(today.getTime()+daysLeft*MS);
    const runsOutStr=runsOut.toLocaleDateString('en-MY',{day:'numeric',month:'short'});
    const projOver=RM(proj-tot);
    const crit=daysLeft<=3;
    el.className=BASE+` ${crit?'bg-red-50 text-red-700 border border-red-100':'bg-amber-50 text-amber-800 border border-amber-100'}`;
    el.innerHTML=label('Burn Rate',crit?'bg-red-600 text-white':'bg-amber-500 text-white')+`At <strong>${rateStr}</strong>, budget runs out around <strong>${runsOutStr}</strong> — projected to overspend by <strong>${projOver}</strong>.`+drivers();
  }else{
    const surplus=RM(tot-proj);
    el.className=BASE+' bg-green-50 text-green-800 border border-green-100';
    el.innerHTML=label('Burn Rate','bg-green-600 text-white')+`At <strong>${rateStr}</strong>, you\'ll finish the period with roughly <strong>${surplus}</strong> to spare.`+drivers();
  }
}
async function saveBudgets(){
  const nb={};Object.keys(CATS.expense||{}).forEach(c=>{const e=document.getElementById('bg-'+c),te=document.getElementById('bt-'+c);if(e)nb[c]={amount:parseFloat(e.value)||0,threshold:parseInt(te?.value)||80};});
  budgets=nb;if(uref){try{await uref.collection('budgets').doc('settings').set(nb);}catch(e){}}else localStorage.setItem('budgets',JSON.stringify(nb));
  const m=document.getElementById('b-save-msg');m.textContent='Allocations saved ✓';setTimeout(()=>m.textContent='',2500);renderBudgets();
}

// ── Forecast ─────────────────────────────────────────────────────
function renderForecast(){
  if(curScr!=='forecast')return;
  if(isLoading){document.getElementById('f-cats').innerHTML=LOADING_HTML;return;}
  if(!txs.length){
    if(fChart){fChart.destroy();fChart=null;}
    document.getElementById('f-cats').innerHTML='<p class="text-xs text-slate-400 text-center py-6">No transaction data yet — start logging entries to see your forecast.</p>';
    document.getElementById('f-ops').innerHTML='<p class="text-sm opacity-70">Add at least one pay period of transactions to unlock strategic insights.</p>';
    return;
  }
  // p3 = 3 PAST periods only (not current), oldest → newest
  const p3=PAY_PERIOD.lastNPeriods(4).slice(1).reverse();
  const mtt=(tp,ps)=>ps.map(p=>txs.filter(t=>t.type===tp&&t.date&&t.date>=p.start&&t.date<=p.end).reduce((s,t)=>s+t.amount,0));
  const aI=avg(mtt('income',p3)),aE=avg(mtt('expense',p3)),aS=avg(mtt('savings',p3));
  const tG=goals.reduce((s,g)=>s+(g.monthly||0),0),surp=aI-aE-tG;
  document.getElementById('f-inc').textContent=RM(aI);
  document.getElementById('f-exp').textContent=RM(aE);
  const se=document.getElementById('f-surp');se.textContent=RM(Math.abs(surp));se.className=`text-2xl font-bold font-headline ${surp>=0?'text-primary':'text-tertiary'}`;
  const oT=goals.filter(g=>(g.monthly||0)<=Math.max(surp,0)).length;
  document.getElementById('f-goals').textContent=goals.length?`${oT} / ${goals.length}`:'— / —';
  // Build 3 future period labels by advancing the current period key month-by-month
  const toLabel=p=>{const pts=p.label.split(' – ');return pts[pts.length-1];};
  const curP=PAY_PERIOD.currentPeriod();
  const futureLabels=(()=>{
    const labels=[];
    let [y,m]=curP.key.split('-').map(Number);
    for(let i=0;i<3;i++){
      m++;if(m>12){m=1;y++;}
      const key=`${y}-${String(m).padStart(2,'0')}`;
      const ps=PAY_PERIOD.getPeriodStart(key);
      const pe=PAY_PERIOD.getPeriodEnd(key);
      labels.push(PAY_PERIOD.toLabel(pe));
    }
    return labels;
  })();
  // Timeline: [3 past actual] + [3 future forecast] — no overlap, clean left→right
  const pastLabels=p3.map(toLabel);
  const allLabels=[...pastLabels,...futureLabels];
  const aInc=p3.map(p=>mtt('income',[p])[0]),aExp=p3.map(p=>mtt('expense',[p])[0]),aSav=p3.map(p=>mtt('savings',[p])[0]);
  const fcData=[aI,aI,aI],fcExp=[aE,aE,aE],fcSav=[tG||aS,tG||aS,tG||aS];
  if(fChart){fChart.destroy();fChart=null;}
  const fc=document.getElementById('f-chart')?.getContext('2d');
  if(fc)fChart=new Chart(fc,{type:'bar',data:{labels:allLabels,datasets:[
    {label:'Income',  data:[...aInc,...fcData],backgroundColor:['#3525cdcc','#3525cdcc','#3525cdcc','#3525cd44','#3525cd44','#3525cd44'],borderColor:['#3525cd','#3525cd','#3525cd','#3525cd66','#3525cd66','#3525cd66'],borderWidth:1.5,borderRadius:5},
    {label:'Expenses',data:[...aExp,...fcExp], backgroundColor:['#7e3000cc','#7e3000cc','#7e3000cc','#7e300044','#7e300044','#7e300044'],borderColor:['#7e3000','#7e3000','#7e3000','#7e300066','#7e300066','#7e300066'],borderWidth:1.5,borderRadius:5},
    {label:'Savings', data:[...aSav,...fcSav], backgroundColor:['#58579bcc','#58579bcc','#58579bcc','#58579b44','#58579b44','#58579b44'],borderColor:['#58579b','#58579b','#58579b','#58579b66','#58579b66','#58579b66'],borderWidth:1.5,borderRadius:5}
  ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{size:10,family:'Inter'},boxWidth:10,padding:10}}},scales:{x:{grid:{display:false},ticks:{font:{size:10}}},y:{ticks:{callback:v=>'RM'+v.toLocaleString(),font:{size:10}},grid:{color:'#f2f4f6'}}}}});
  const exC=Object.keys(CATS.expense||{});
  const cr=exC.map(c=>{const monthly=p3.map(p=>txs.filter(t=>t.type==='expense'&&t.category===c&&t.date>=p.start&&t.date<=p.end).reduce((s,t)=>s+t.amount,0));const av=avg(monthly);if(!av)return null;const rc=monthly[monthly.length-1],pr=avg(monthly.slice(0,-1)),df=pr>0?(rc-pr)/pr*100:0;const tc=Math.abs(df)<5?'text-slate-500':df>0?'text-tertiary':'text-primary',tt=Math.abs(df)<5?'Stable':df>0?`↑${df.toFixed(0)}%`:`↓${Math.abs(df).toFixed(0)}%`;return`<div class="flex items-center gap-3 py-2"><div class="w-2 h-2 rounded-full flex-shrink-0" style="background:${PAL[exC.indexOf(c)%PAL.length]}"></div><span class="flex-1 text-sm font-medium text-slate-700">${c}</span><span class="text-sm font-bold text-slate-800">${RM(av)}</span><span class="text-xs font-bold ${tc}">${tt}</span></div>`;}).filter(Boolean);
  document.getElementById('f-cats').innerHTML=cr.length?cr.join(''):'<p class="text-xs text-slate-400">Add more data for category forecast.</p>';
  const ops=[];
  if(surp<0)ops.push(`Your projected monthly shortfall is <strong>${RM(Math.abs(surp))}</strong>. Reviewing top expense categories could restore balance immediately.`);
  else ops.push(`Your projected surplus of <strong>${RM(surp)}</strong> per period provides a strong foundation. Directing this to savings goals would compound meaningfully over 12 months.`);
  const tpC=exC.reduce((acc,c)=>{acc[c]=avg(p3.map(p=>txs.filter(t=>t.type==='expense'&&t.category===c&&t.date>=p.start&&t.date<=p.end).reduce((s,t)=>s+t.amount,0)));return acc;},{});
  const tpE=Object.entries(tpC).sort((a,b)=>b[1]-a[1])[0];
  if(tpE&&tpE[1]>0)ops.push(`<strong>${tpE[0]}</strong> is your largest spending category at <strong>${RM(tpE[1])}</strong> per period. A 10% reduction would free up <strong>${RM(tpE[1]*.1)}</strong> monthly.`);
  if(aI>0)ops.push(`Your current savings rate is approximately <strong>${((aS/aI)*100).toFixed(1)}%</strong>. Financial benchmarks recommend 20–30% for accelerated wealth accumulation.`);
  document.getElementById('f-ops').innerHTML=ops.map(o=>`<p class="flex gap-2"><span class="opacity-60 mt-0.5 flex-shrink-0">·</span><span>${o}</span></p>`).join('');
}

// ── Settings ─────────────────────────────────────────────────────

// Month names used throughout the pay period UI
const MONTHS_SHORT=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL=['January','February','March','April','May','June','July','August','September','October','November','December'];

// Refresh preview label whenever default day or overrides change (no save yet)
function refreshPpPreview(){
  const day=parseInt(document.getElementById('s-day').value)||25;
  // Compute preview locally without writing to Firebase
  const origDay=PAY_PERIOD.getDefaultDay();
  const origOvrd=PAY_PERIOD.getOverrides();
  // Temporarily adjust internal state for preview only, then restore
  // We use the PAY_PERIOD helper directly to compute the period label
  const now=new Date();
  const curM=now.getMonth()+1; // 1-indexed
  const curY=now.getFullYear();
  const periodKey=(now.getDate()>=day)
    ? (curM===12?`${curY+1}-01`:`${curY}-${String(curM+1).padStart(2,'0')}`)
    : `${curY}-${String(curM).padStart(2,'0')}`;
  const [py,pm]=periodKey.split('-').map(Number);
  const ovKey=periodKey;
  let startDate;
  if(ppOvrd[ovKey]){
    startDate=new Date(ppOvrd[ovKey]);
  } else {
    const prevM=pm-2; const prevY=prevM<0?py-1:py; const adjM=((prevM%12)+12)%12;
    const last=new Date(prevY,adjM+1,0).getDate();
    startDate=new Date(prevY,adjM,Math.min(day,last));
  }
  const endD=new Date(py,pm-1,Math.min(day,new Date(py,pm,0).getDate()));
  endD.setDate(endD.getDate()-1);
  const fmt=d=>d.toLocaleDateString('en-MY',{day:'2-digit',month:'short',year:'numeric'});
  const label=`${fmt(startDate)} – ${fmt(endD)}`;
  document.getElementById('s-prev').textContent=label;
  document.getElementById('s-pp-badge').textContent='Preview: '+label;
}

function renderSettings(){
  if(curScr!=='settings')return;
  const p=PAY_PERIOD.currentPeriod();
  document.getElementById('s-prev').textContent=p.label;
  document.getElementById('s-pp-badge').textContent='Current: '+p.label;
  document.getElementById('s-accts').innerHTML=(ACCTS||[]).length
    ? (ACCTS||[]).map((a,i)=>`<span class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-low border border-slate-100 rounded-full text-xs font-semibold text-slate-700">${a}<button onclick="delAcct(${i})" class="text-slate-400 hover:text-error transition-colors ml-0.5">✕</button></span>`).join('')
    : '<p class="text-xs text-slate-400">No accounts added yet.</p>';
  renderPpGrid();
  renderCatS();
}

// Build the 12-month override grid
let ppEditKey=null; // which month tile is currently being edited inline

function renderPpGrid(){
  const now=new Date();
  const curYear=now.getFullYear();
  const curMonth=now.getMonth(); // 0-indexed

  // Show previous 2 months + current + next 9 (rolling 12 total)
  const cells=[];
  for(let i=-2;i<10;i++){
    const d=new Date(curYear, curMonth+i, 1);
    const y=d.getFullYear();
    const m=d.getMonth(); // 0-indexed
    const key=`${y}-${String(m+1).padStart(2,'0')}`;
    const label=MONTHS_SHORT[m]+' '+String(y).slice(2);
    const isCurrentMonth=(i===0);
    const override=ppOvrd[key];
    const isActive=override!=null;
    const isEditing=(ppEditKey===key);
    cells.push({key,label,isCurrentMonth,override,isActive,isEditing});
  }

  document.getElementById('s-pp-grid').innerHTML=cells.map(({key,label,isCurrentMonth,isActive,override,isEditing})=>{
    const defDay=parseInt(document.getElementById('s-day').value)||25;
    if(isEditing){
      return `<div class="flex flex-col gap-1.5 p-3 rounded-xl border-2 border-primary/40 bg-primary-fixed">
        <span class="text-xs font-bold text-on-primary-fixed-variant">${label}</span>
        <div class="flex items-center gap-1">
          <input id="pp-inp-${key}" type="number" min="1" max="28"
            value="${override||defDay}"
            class="w-full text-center bg-white border border-primary/30 rounded-lg py-1 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary/30"
            oninput="ppInlineChange('${key}',this.value)"
            onkeydown="if(event.key==='Enter')ppEditKey=null,renderPpGrid()"/>
          <button onclick="ppEditKey=null;renderPpGrid()" class="text-slate-400 hover:text-slate-700 text-base flex-shrink-0">✓</button>
        </div>
        ${isActive&&override!==null?`<button onclick="delPpOverride('${key}')" class="text-[10px] text-error hover:underline text-left">Remove override</button>`:''}
      </div>`;
    }
    return `<button onclick="ppEditKey='${key}';renderPpGrid()"
      class="flex flex-col items-start gap-1 p-3 rounded-xl border transition-all duration-200 w-full text-left
        ${isCurrentMonth?'ring-2 ring-primary/20':''}
        ${isActive
          ? 'bg-primary-fixed border-primary/20 hover:border-primary/40'
          : 'bg-surface-container-low border-slate-100 hover:bg-slate-100 hover:border-slate-200'}">
      <span class="text-xs font-bold ${isActive?'text-on-primary-fixed-variant':'text-slate-700'}">${label}</span>
      <span class="text-[10px] font-semibold ${isActive?'text-primary':'text-slate-400'}">
        ${isCurrentMonth?'<span class=\'text-[9px] uppercase tracking-wider opacity-60\'>current · </span>':''}${isActive?'Day '+override:'Day '+defDay}
      </span>
    </button>`;
  }).join('');

  // Focus the input if we just opened an edit tile
  if(ppEditKey){
    setTimeout(()=>{
      const inp=document.getElementById('pp-inp-'+ppEditKey);
      if(inp){inp.focus();inp.select();}
    },30);
  }

  // Active overrides summary
  const ovrdKeys=Object.keys(ppOvrd).sort();
  document.getElementById('s-pp-overrides').innerHTML=ovrdKeys.length
    ? `<div class="mt-1 p-4 bg-surface-container-low rounded-xl">
        <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
          Active overrides <span class="font-normal normal-case text-slate-300">· These months use a custom salary day</span>
        </p>
        <div class="space-y-2">${ovrdKeys.map(k=>{
          const [y,mo]=k.split('-');
          const lbl=MONTHS_FULL[parseInt(mo)-1]+' '+y;
          const defDay=parseInt(document.getElementById('s-day').value)||25;
          return `<div class="flex items-center justify-between">
            <span class="text-sm font-medium text-slate-700">${lbl}</span>
            <div class="flex items-center gap-3">
              <span class="text-xs text-slate-400 line-through">Day ${defDay}</span>
              <span class="text-sm font-bold text-primary">Day ${ppOvrd[k]}</span>
              <button onclick="delPpOverride('${k}')" class="w-5 h-5 rounded-full bg-slate-200 hover:bg-error-container flex items-center justify-center text-slate-400 hover:text-error transition-all text-xs">✕</button>
            </div>
          </div>`;
        }).join('')}
        </div>
      </div>`
    : `<p class="text-[10px] text-slate-300 text-center mt-2">No overrides set — all months use the default day above.</p>`;
}

// Called while user types in inline tile input — update ppOvrd live
function ppInlineChange(key, val){
  const day=parseInt(val);
  const defDay=parseInt(document.getElementById('s-day').value)||25;
  if(!isNaN(day)&&day>=1&&day<=28){
    if(day===defDay){ delete ppOvrd[key]; } // same as default = no override needed
    else { ppOvrd[key]=day; }
  }
  refreshPpPreview();
  // Re-render overrides list only (not the grid, to avoid killing the focused input)
  const ovrdKeys=Object.keys(ppOvrd).sort();
  document.getElementById('s-pp-overrides').innerHTML=ovrdKeys.length
    ? `<div class="mt-1 p-4 bg-surface-container-low rounded-xl">
        <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Active overrides</p>
        <div class="space-y-2">${ovrdKeys.map(k=>{
          const [y,mo]=k.split('-');
          const lbl=MONTHS_FULL[parseInt(mo)-1]+' '+y;
          const defD=parseInt(document.getElementById('s-day').value)||25;
          return `<div class="flex items-center justify-between">
            <span class="text-sm font-medium text-slate-700">${lbl}</span>
            <div class="flex items-center gap-3">
              <span class="text-xs text-slate-400 line-through">Day ${defD}</span>
              <span class="text-sm font-bold text-primary">Day ${ppOvrd[k]}</span>
              <button onclick="delPpOverride('${k}')" class="w-5 h-5 rounded-full bg-slate-200 hover:bg-error-container flex items-center justify-center text-slate-400 hover:text-error transition-all text-xs">✕</button>
            </div>
          </div>`;
        }).join('')}</div></div>`
    : `<p class="text-[10px] text-slate-300 text-center mt-2">No overrides set.</p>`;
}

function delPpOverride(key){
  delete ppOvrd[key];
  if(ppEditKey===key) ppEditKey=null;
  refreshPpPreview();
  renderPpGrid();
}

function sCatTab(t){sType=t;sCat=null;['expense','income','savings'].forEach(x=>{const b=document.getElementById('st-'+x);if(!b)return;b.className=x===t?'px-4 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-br from-primary to-primary-container text-white transition-all':'px-4 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-white transition-all';});renderCatS();}
function renderCatS(){
  const cats=Object.keys(CATS[sType]||{});
  document.getElementById('s-cats').innerHTML=cats.length
    ? cats.map(c=>`<span onclick="sSelCat('${c}')" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${c===sCat?'bg-primary-fixed text-on-primary-fixed-variant border border-primary/20':'bg-surface-container-low border border-slate-100 text-slate-700 hover:bg-slate-100'}">${c}<button onclick="event.stopPropagation();delCat('${c}')" class="text-slate-400 hover:text-error transition-colors">✕</button></span>`).join('')
    : `<p class="text-xs text-slate-400">No ${sType} categories yet — add one below.</p>`;
  document.getElementById('s-catsel').textContent=sCat||'—';
  const sbs=(sCat&&CATS[sType][sCat])||[];
  document.getElementById('s-subs').innerHTML=sbs.map((s,i)=>`<span class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-low border border-slate-100 rounded-full text-xs font-semibold text-slate-700">${s}<button onclick="delSub(${i})" class="text-slate-400 hover:text-error transition-colors">✕</button></span>`).join('');
  document.getElementById('s-subrow').style.visibility=sCat?'visible':'hidden';
}
function sSelCat(c){sCat=c;renderCatS();}
function addAcct(){const v=document.getElementById('s-nacct').value.trim();if(!v||ACCTS.includes(v))return;ACCTS.push(v);document.getElementById('s-nacct').value='';renderSettings();}
function delAcct(i){ACCTS.splice(i,1);renderSettings();}
function addCat(){const v=document.getElementById('s-ncat').value.trim();if(!v||CATS[sType][v]!==undefined)return;CATS[sType][v]=[];document.getElementById('s-ncat').value='';renderCatS();}
function delCat(c){if(!confirm(`Delete "${c}"?`))return;delete CATS[sType][c];if(sCat===c)sCat=null;renderCatS();}
function addSub(){if(!sCat)return;const v=document.getElementById('s-nsub').value.trim();if(!v)return;CATS[sType][sCat].push(v);document.getElementById('s-nsub').value='';renderCatS();}
function delSub(i){if(!sCat)return;CATS[sType][sCat].splice(i,1);renderCatS();}

async function saveSettings(){
  const day=parseInt(document.getElementById('s-day').value)||25;
  const ns={accounts:ACCTS,categories:CATS,payperiod:{defaultDay:day,overrides:ppOvrd}};

  if(db){
    try{
      await uref.collection('settings').doc('preferences').set(ns);
      await PAY_PERIOD.save(day,ppOvrd);
    }catch(e){}
  } else {
    localStorage.setItem('userSettings',JSON.stringify(ns));
  }

  // Re-render every screen that depends on pay period
  refreshPpPreview();
  renderPpGrid();
  renderDashboard();
  renderBudgets();
  if(anBar||anLine) applyAnalyticsPeriod();
  if(fChart) renderForecast();

  const m=document.getElementById('s-msg');
  m.textContent='Changes saved — all charts updated ✓';
  setTimeout(()=>m.textContent='',3000);
}

// ── Boot ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('e-date').value=new Date().toISOString().slice(0,10);
  initFirebase(); // defined in auth.js, loaded after this file
});
