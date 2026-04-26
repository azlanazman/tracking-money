// ══════════════════════════════════════════════════════
//  app.js — Lumina Financial
//  State, navigation, Firebase data, and all screen logic
//  Depends on: payperiod.js (loaded before this file)
//  Auth functions are in auth.js (loaded after this file)
// ══════════════════════════════════════════════════════

// ── State ──────────────────────────────────────────────────────
let db=null,uref=null,txs=[],budgets={},goals=[],alerts=[],annotations=[],healthHistory={};
let DEMO_MODE=false;
let _lockChecked=false;
let curScr='home',editId=null;
let lastUsedCat=null;
let insTab='spend',_hmMonthOffset=0;
let anBar=null,anLine=null,anWaterfall=null,fChart=null,_whereChart=null;
let _rhRaf=null;
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

// ── Malaysia context helpers ─────────────────────────
function gregorianToHijri(gy,gm,gd){
  const jd=Math.floor((1461*(gy+4800+Math.floor((gm-14)/12)))/4)+
           Math.floor((367*(gm-2-12*Math.floor((gm-14)/12)))/12)-
           Math.floor((3*Math.floor((gy+4900+Math.floor((gm-14)/12))/100))/4)+gd-32075;
  let l=jd-1948440+10632;
  const n=Math.floor((l-1)/10631);
  l=l-10631*n+354;
  const j=Math.floor((10985-l)/5316)*Math.floor((50*l)/17719)+Math.floor(l/5670)*Math.floor((43*l)/15238);
  l=l-Math.floor((30-j)/15)*Math.floor((17719*j)/50)-Math.floor(j/16)*Math.floor((15238*j)/43)+29;
  return{year:30*n+j-30,month:Math.floor((24*l)/709),day:l-Math.floor((709*Math.floor((24*l)/709))/24)};
}

function getMalaysiaContext(date){
  const h=gregorianToHijri(date.getFullYear(),date.getMonth()+1,date.getDate());
  if(h.month===9) return 'Ramadan — expect higher food and charity spend this month';
  if(h.month===10&&h.day<=7) return 'Hari Raya Aidilfitri — festive spending period; food, travel, and clothing typically spike';
  const m={1:'New Year — spending spike typical this month',2:'Chinese New Year — expect 1.5–2× food and shopping spend',
    4:'School holidays — travel and entertainment may rise',6:'School holidays + mid-year sales season',
    8:'Merdeka / National Day — sales period',10:'Deepavali — festive spending period',
    11:'Singles Day and year-end sales (Shopee, Lazada)',12:'Year-end bonus season — typically a high spend month'};
  return m[date.getMonth()+1]||null;
}

function showDemoToast(){
  const existing=document.getElementById('demo-toast');if(existing)return;
  const t=document.createElement('div');
  t.id='demo-toast';
  t.style.cssText='position:fixed;bottom:28px;left:50%;transform:translateX(-50%);z-index:9999;padding:10px 20px;background:#1e293b;color:#fff;font-size:13px;font-weight:600;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.2);white-space:nowrap;font-family:Inter,sans-serif';
  t.textContent='Demo mode — changes are disabled';
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),2500);
}

if(window.ChartAnnotation)Chart.register(window.ChartAnnotation);

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
  ppEditKey=null;
  if(scr==='home')renderDashboard();
  if(scr==='activity')renderTx();
  if(scr==='insights'){renderInsightsHub();switchInsightsTab(insTab);}
  if(scr==='settings'){if(!editId){resetEntry();closeEntrySection();}renderSettings();}
  window.scrollTo(0,0);
}
function renderInsightsHub(){
  const el=document.getElementById('ins-hub');
  if(!el)return;
  if(isLoading){el.innerHTML='';return;}

  const p=PAY_PERIOD.currentPeriod();
  const inP=PAY_PERIOD.filterToPeriod(txs,p);
  const inc=inP.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const exp=inP.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const sav=inP.filter(t=>t.type==='savings').reduce((s,t)=>s+t.amount,0);
  const surplus=inc-exp-sav;
  const srPct=inc>0?Math.round(sav/inc*100):0;
  const exC=Object.keys(CATS.expense||{});
  const budgetTotEarly=exC.reduce((s,c)=>s+((budgets[c]&&budgets[c].amount)||0),0);
  const onTrack=budgetTotEarly===0||exp<=budgetTotEarly;

  const pStart=new Date(p.start);
  const periodLabel=pStart.toLocaleDateString('en-MY',{month:'short',year:'numeric'});

  // Health score via pure helper
  const hs=scoreForPeriod(inP,p);
  const {score:healthScore,ba,baDesc,srScore,srDesc,rwScore,rwDesc,svScore,svDesc,spent,incAmt,savAmt,budgetTot,daysLeft,meanDailySpend}=hs;

  // Delta vs last period
  const prevPeriods=PAY_PERIOD.lastNPeriods(2);
  let deltaHTML='';
  if(prevPeriods.length>=2){
    const prevInP=PAY_PERIOD.filterToPeriod(txs,prevPeriods[1]);
    const prevScore=scoreForPeriod(prevInP,prevPeriods[1]).score;
    const delta=healthScore-prevScore;
    const col=delta>=0?'var(--accent)':'var(--warn)';
    deltaHTML=`<span style="font-size:12px;color:${col};font-weight:500">${delta>=0?'↑ +':'↓ '}${Math.abs(delta)} pts from last period</span>`;
  }

  // Priority signal — first match wins
  let signal='';
  let breachedCat=null,breachPct=0;
  for(const c of exC){
    const limit=(budgets[c]&&budgets[c].amount)||0;if(!limit)continue;
    const catSpent=inP.filter(t=>t.type==='expense'&&t.category===c).reduce((s,t)=>s+t.amount,0);
    if(catSpent>limit){breachedCat=c;breachPct=Math.round(catSpent/limit*100);break;}
  }
  if(breachedCat) signal=`${breachedCat} budget is ${breachPct}% used with ${daysLeft} day${daysLeft!==1?'s':''} left.`;
  else if(srPct<10) signal=`Savings rate is below target — you have ${RM(Math.max(0,surplus))} surplus available.`;
  else if(healthScore<60) signal=`Health score is ${healthScore} — review the breakdown below.`;
  else signal=`Finances look stable. ${daysLeft} day${daysLeft!==1?'s':''} to payday.`;

  // Per-signal tips
  const dailyLeft=budgetTot>0&&daysLeft>0?Math.max(0,(budgetTot-spent)/daysLeft):0;
  const srGap=Math.max(0,Math.round(incAmt*0.2-savAmt));
  const varianceCap=meanDailySpend>0?Math.round(meanDailySpend*1.3):0;
  const signals=[
    {label:'Budget adherence',score:ba,desc:baDesc,tip:budgetTot>0?`Spend ${RM(dailyLeft)}/day or less to finish on track`:'Set a budget to track adherence'},
    {label:'Savings rate',score:srScore,desc:srDesc,tip:srGap>0?`Transfer ${RM(srGap)} more this period to hit 20%`:'You\'re at or above your 20% savings target'},
    {label:'Runway',score:rwScore,desc:rwDesc,tip:`${daysLeft} day${daysLeft!==1?'s':''} left — ${RM(dailyLeft)}/day remaining in budget`},
    {label:'Spend variance',score:svScore,desc:svDesc,tip:varianceCap>0?`Keep daily spend within ${RM(varianceCap)} to reduce variance`:'Not enough daily data yet to assess variance'},
  ];

  const surplusCol=surplus>=0?'var(--accent)':'var(--warn)';
  const budgetCol=onTrack?'var(--accent)':'var(--warn)';
  const scoreCol=healthScore>=60?'var(--accent)':'var(--warn)';

  el.innerHTML=`
    <div style="background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:24px 28px;margin-bottom:24px">
      <h2 style="font-family:var(--serif);font-size:22px;color:var(--ink);margin:0 0 16px">Your finances, ${periodLabel}</h2>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px">
        <div style="display:flex;flex-direction:column;gap:3px;background:var(--bg-2);border-radius:var(--r-sm);padding:10px 16px;min-width:120px">
          <span style="font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--ink-3)">Net Surplus</span>
          <span style="font-family:var(--mono);font-size:16px;font-weight:600;color:${surplusCol}">${surplus<0?'−':''}${RM(Math.abs(surplus))}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:3px;background:var(--bg-2);border-radius:var(--r-sm);padding:10px 16px;min-width:120px">
          <span style="font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--ink-3)">Savings Rate</span>
          <span style="font-family:var(--mono);font-size:16px;font-weight:600;color:var(--ink)">${srPct}%</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:3px;background:var(--bg-2);border-radius:var(--r-sm);padding:10px 16px;min-width:120px">
          <span style="font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--ink-3)">Budget</span>
          <span style="font-family:var(--mono);font-size:16px;font-weight:600;color:${budgetCol}">${onTrack?'On track':'Over budget'}</span>
        </div>
      </div>
      <div style="border-top:1px solid var(--line);padding-top:14px;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:20px">
        <span style="font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--ink-4);flex-shrink:0">Most important right now</span>
        <span style="font-size:14px;color:var(--ink-2)">${signal}</span>
      </div>
      <div style="border-top:1px solid var(--line);padding-top:16px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
          <span style="font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--ink-4)">Financial Health</span>
          <span style="font-family:var(--mono);font-size:18px;font-weight:600;color:${scoreCol}">${healthScore}<span style="font-size:12px;color:var(--ink-3)">/100</span></span>
          ${deltaHTML}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid var(--line);border-radius:var(--r-md);overflow:hidden">
          ${signals.map((s,i)=>{
            const isRight=i%2===1,isBottom=i<2;
            const border=`${isRight?'':'border-right:1px solid var(--line);'}${isBottom?'border-bottom:1px solid var(--line);':''}`;
            const col=s.score>=60?'var(--accent)':'var(--warn)';
            return `<div style="padding:12px 14px;${border}">
              <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">
                <span style="font-size:11px;font-weight:500;color:var(--ink)">${s.label}</span>
                <span style="font-family:var(--mono);font-size:16px;color:${col}">${s.score}</span>
              </div>
              <p style="font-size:11px;color:var(--ink-3);margin:0 0 4px">${s.desc}</p>
              <p style="font-size:11px;color:var(--ink-4);margin:0;font-style:italic">${s.tip}</p>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
}

function switchInsightsTab(tab){
  insTab=tab;
  ['spend','budgets','forecast'].forEach(t=>{
    const pane=document.getElementById('ins-'+t);if(pane)pane.style.display=t===tab?'':'none';
    const btn=document.getElementById('ins-tab-'+t);if(!btn)return;
    const active=t===tab;
    btn.style.borderBottom=active?'2px solid var(--accent)':'2px solid transparent';
    btn.style.color=active?'var(--ink)':'var(--ink-3)';
    btn.style.fontWeight=active?'600':'400';
  });
  if(tab==='spend')applyAnalyticsPeriod();
  if(tab==='budgets')renderBudgets();
  if(tab==='forecast')renderForecast();
}

// ── Firebase data ────────────────────────────────────────────────

async function initDB(){
  isLoading=true;
  _lockChecked=false;
  healthHistory={};
  try{
    setDB('connecting');
    const uid=currentUser.uid;
    DEMO_MODE=currentUser.email==='demo@lumina.app';
    const demoBanner=document.getElementById('demo-banner');if(demoBanner)demoBanner.classList.toggle('hidden',!DEMO_MODE);
    uref=db.collection('users').doc(uid);
    PAY_PERIOD.init(db,uid);
    PAY_PERIOD.onChange(()=>{ renderDashboard(); renderBudgets(); if(curScr==='insights') switchInsightsTab(insTab); });
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
      refreshEntry();refreshQuickLog();renderSettings();
    });
    uref.collection('budgets').doc('settings').get().then(doc=>{if(doc.exists)budgets=doc.data();renderBudgets();});
    uref.collection('goals').doc('list').get().then(doc=>{if(doc.exists)goals=(doc.data().goals||[]);});
    uref.collection('alerts').onSnapshot(snap=>{alerts=snap.docs.map(d=>({id:d.id,...d.data()}));renderAlerts();});
    uref.collection('annotations').orderBy('date','asc').onSnapshot(snap=>{annotations=snap.docs.map(d=>({id:d.id,...d.data()}));if(curScr==='insights')renderAnalytics();if(curScr==='settings')renderSettings();});
    uref.collection('health').doc('history').onSnapshot(doc=>{
      healthHistory=doc.exists?(doc.data().periods||{}):{};
      if(!isLoading)checkAndLockPeriod();
      if(curScr==='insights'&&insTab==='forecast')renderBudgetTrackRecord();
    });
    uref.collection('transactions').orderBy('createdAt','desc').onSnapshot(snap=>{
      txs=snap.docs.map(d=>({id:d.id,...d.data()}));
      isLoading=false;
      setDB('connected',txs.length+' RECORDS');
      checkAndLockPeriod();
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
  if(isLoading) return;
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

  // Period subheader
  const start=new Date(p.start),end=new Date(p.end);
  const today=new Date(); today.setHours(0,0,0,0);
  const daysLeft=Math.max(Math.ceil((end-today)/86400000),0);
  const fmt=d=>d.toLocaleDateString('en-MY',{day:'numeric',month:'short'});
  document.getElementById('d-period-sub').textContent=`${fmt(start)} – ${fmt(end)} · ${daysLeft} day${daysLeft!==1?'s':''} left`;

  // Budget metrics (shared by RunwayHero, Coach, HealthScore)
  const exC=Object.keys(CATS.expense||{});
  const budgetTot=exC.reduce((s,c)=>s+((budgets[c]&&budgets[c].amount)||0),0);
  const totalDays=Math.max(Math.round((end-start)/86400000)+1,1);
  const elapsed=Math.min(Math.max(Math.round((today-start)/86400000)+1,1),totalDays);
  const daily=elapsed>0?exp/elapsed:0;

  renderRunwayHero(daysLeft,totalDays,inc,exp,sav,budgetTot,daily,p.end);
  updateSidebarRunway();
  calculateHealthScore();
  // Delta vs last period for hs-delta on Home card
  const _periods=PAY_PERIOD.lastNPeriods(2);
  if(_periods.length>=2){
    const _curr=scoreForPeriod(PAY_PERIOD.filterToPeriod(txs,_periods[0]),_periods[0]);
    const _prev=scoreForPeriod(PAY_PERIOD.filterToPeriod(txs,_periods[1]),_periods[1]);
    const _delta=_curr.score-_prev.score;
    const _deltaEl=document.getElementById('hs-delta');
    if(_deltaEl){
      _deltaEl.textContent=(_delta>=0?'↑ +':' ↓ ')+Math.abs(_delta)+' pts from last period';
      _deltaEl.style.color=_delta>=0?'var(--accent)':'var(--warn)';
    }
  }
  renderCoach();
  renderSpendRhythm();
  renderWhereItWent();
  renderHomeCats();
  refreshQuickLog();
}

function renderRunwayHero(daysLeft,daysTotal,inc,exp,sav,budgetTot,dailyActual,periodEnd){
  if(_rhRaf){cancelAnimationFrame(_rhRaf);_rhRaf=null;}
  const el=document.getElementById('d-runway-hero');
  if(!el)return;

  const dailySafe=daysLeft>0?Math.max(0,(budgetTot-exp)/daysLeft):0;
  const pacing=budgetTot===0||dailyActual<=dailySafe;
  const pacingDiff=Math.abs(dailySafe-dailyActual);
  const pct=daysTotal>0?daysLeft/daysTotal:0;
  const endFmt=new Date(periodEnd).toLocaleDateString('en-MY',{day:'numeric',month:'short'});

  // SVG ring geometry
  const sz=220,stroke=11,r=(sz-stroke)/2;
  const circ=2*Math.PI*r;
  const elapsed=daysTotal-daysLeft;

  // Day tick marks
  const ticks=Array.from({length:daysTotal},(_,i)=>{
    const a=(i/daysTotal)*2*Math.PI-Math.PI/2;
    const past=i<elapsed;
    const x1=(sz/2+Math.cos(a)*(r-stroke/2-5)).toFixed(1);
    const y1=(sz/2+Math.sin(a)*(r-stroke/2-5)).toFixed(1);
    const x2=(sz/2+Math.cos(a)*(r-stroke/2-1)).toFixed(1);
    const y2=(sz/2+Math.sin(a)*(r-stroke/2-1)).toFixed(1);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${past?'var(--ink-4)':'var(--line)'}" stroke-width="1" stroke-linecap="round" ${past?'opacity="0.55"':''}/>`;
  }).join('');

  const sentenceHTML=pacing
    ?`You can spend <span style="color:var(--accent);font-style:italic">${RM(dailySafe)}</span> a day and finish green.`
    :`Slow down <span style="font-style:italic">${RM(pacingDiff)}</span> a day to recover the period.`;

  el.innerHTML=`
    <div style="background:var(--bg-2);border:1px solid var(--line);border-radius:var(--r-lg);padding:36px 40px;position:relative;overflow:hidden">
      <div style="position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 85% 15%,var(--accent-soft),transparent 55%);opacity:0.7"></div>
      <div style="position:relative;display:flex;align-items:center;gap:40px;flex-wrap:wrap">
        <div style="position:relative;width:${sz}px;height:${sz}px;flex-shrink:0">
          <svg width="${sz}" height="${sz}">
            <circle cx="${sz/2}" cy="${sz/2}" r="${r}" fill="none" stroke="var(--line)" stroke-width="${stroke}"/>
            ${ticks}
            <circle id="rh-arc" cx="${sz/2}" cy="${sz/2}" r="${r}" fill="none"
              stroke="var(--accent)" stroke-width="${stroke}" stroke-linecap="round"
              stroke-dasharray="${circ.toFixed(2)}"
              stroke-dashoffset="${circ.toFixed(2)}"
              transform="rotate(-90 ${sz/2} ${sz/2})"/>
          </svg>
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
            <div style="font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:var(--ink-3);margin-bottom:4px">Runway</div>
            <div id="rh-days" style="font-family:var(--serif);font-style:italic;font-size:96px;line-height:0.85;letter-spacing:-0.04em;color:var(--ink)">0</div>
            <div style="font-size:12px;color:var(--ink-3);margin-top:10px">days to <span style="color:var(--ink)">${endFmt}</span></div>
          </div>
        </div>
        <div style="flex:1;min-width:200px">
          <div style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:var(--ink-3);margin-bottom:12px">${pacing?'On track':'Pacing hot'}</div>
          <div style="font-family:var(--serif);font-size:28px;line-height:1.25;color:var(--ink);margin-bottom:20px;letter-spacing:-0.01em">${sentenceHTML}</div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--line);padding-top:16px">
            <div>
              <div style="font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:var(--ink-3);margin-bottom:6px">Spent</div>
              <div style="font-family:var(--mono);font-size:18px;font-weight:500;color:var(--ink)">${RM(exp)}</div>
            </div>
            <div style="padding-left:16px;border-left:1px solid var(--line)">
              <div style="font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:var(--ink-3);margin-bottom:6px">Income</div>
              <div style="font-family:var(--mono);font-size:18px;font-weight:500;color:var(--ink)">${RM(inc)}</div>
            </div>
            <div style="padding-left:16px;border-left:1px solid var(--line)">
              <div style="font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:var(--ink-3);margin-bottom:6px">Saved</div>
              <div style="font-family:var(--mono);font-size:18px;font-weight:500;color:var(--ink)">${RM(sav)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  // Animate arc + count-up
  const targetOffset=circ*(1-pct);
  const arcEl=document.getElementById('rh-arc');
  const daysEl=document.getElementById('rh-days');
  const duration=1600;
  let startTs=null;
  function easeOut(t){return t===1?1:1-Math.pow(2,-10*t);}
  function tick(ts){
    if(!startTs)startTs=ts;
    const progress=Math.min((ts-startTs)/duration,1);
    const e=easeOut(progress);
    if(arcEl)arcEl.setAttribute('stroke-dashoffset',(circ-(circ-targetOffset)*e).toFixed(2));
    if(daysEl)daysEl.textContent=Math.round(daysLeft*e);
    if(progress<1){_rhRaf=requestAnimationFrame(tick);}else{_rhRaf=null;}
  }
  _rhRaf=requestAnimationFrame(tick);
}

function updateSidebarRunway(){
  const p=PAY_PERIOD.currentPeriod();
  const today=new Date(); today.setHours(0,0,0,0);
  const end=new Date(p.end);
  const start=new Date(p.start);
  const daysLeft=Math.max(Math.ceil((end-today)/86400000),0);
  const total=Math.round((end-start)/86400000)+1;
  const elapsed=total-daysLeft;
  const pct=Math.min(100,Math.round((elapsed/total)*100));
  const fmt=d=>new Date(d).toLocaleDateString('en-MY',{day:'numeric',month:'short'});
  const daysEl=document.getElementById('sb-runway-days');
  const barEl=document.getElementById('sb-runway-bar-fill');
  const datesEl=document.getElementById('sb-runway-dates');
  if(daysEl) daysEl.textContent=daysLeft+' day'+(daysLeft!==1?'s':'');
  if(barEl) barEl.style.width=pct+'%';
  if(datesEl) datesEl.innerHTML=`<span>${fmt(p.start)}</span><span>${fmt(p.end)}</span>`;
}

// Pure helper — same math as calculateHealthScore but no DOM writes; works on any period slice
function scoreForPeriod(filteredTxs, period){
  const expTxs=filteredTxs.filter(t=>t.type==='expense');
  const incAmt=filteredTxs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const savAmt=filteredTxs.filter(t=>t.type==='savings').reduce((s,t)=>s+t.amount,0);
  const spent=expTxs.reduce((s,t)=>s+t.amount,0);
  const exC=Object.keys(CATS.expense||{});
  const budgetTot=exC.reduce((s,c)=>s+((budgets[c]&&budgets[c].amount)||0),0);

  const start=new Date(period.start),end=new Date(period.end);
  const today=new Date();today.setHours(0,0,0,0);
  const totalDays=Math.max(Math.round((end-start)/86400000)+1,1);
  const elapsed=Math.min(Math.max(Math.round((today-start)/86400000)+1,1),totalDays);
  const daysLeft=Math.max(Math.ceil((end-today)/86400000),0);

  let ba=75,baDesc='No budget set';
  if(budgetTot>0){
    const pctUsed=spent/budgetTot,pctElapsed=elapsed/totalDays;
    ba=Math.max(0,Math.min(100,Math.round(100-(Math.max(0,pctUsed-pctElapsed)/Math.max(pctElapsed,0.01))*100)));
    baDesc=`${Math.round(pctUsed*100)}% used at day ${elapsed} of ${totalDays}`;
  }

  const srRate=incAmt>0?savAmt/incAmt:0;
  const srScore=Math.round(Math.min(srRate/0.20,1)*100);
  const srDesc=`${(srRate*100).toFixed(1)}% of income · target 20%`;

  const rwScore=Math.round(Math.min(daysLeft/7,1)*100);
  const rwDesc=`${daysLeft} day${daysLeft!==1?'s':''} — ${daysLeft>=7?'safely ahead of':'close to'} payday`;

  let svScore=75,svDesc='Steady — consistent daily spend';
  const dayMap={};
  expTxs.forEach(t=>{dayMap[t.date]=(dayMap[t.date]||0)+t.amount;});
  const dayVals=Object.values(dayMap);
  let meanDailySpend=0;
  if(dayVals.length>=3){
    meanDailySpend=dayVals.reduce((a,b)=>a+b,0)/dayVals.length;
    const cv=meanDailySpend>0?Math.sqrt(dayVals.reduce((a,b)=>a+(b-meanDailySpend)**2,0)/dayVals.length)/meanDailySpend:0;
    svScore=Math.max(0,Math.round((1-Math.min(cv,1))*100));
    svDesc=cv<0.4?'Steady — consistent daily spend':cv<0.8?'Moderate — some daily swings':'Variable — weekend or event spikes';
  }

  const score=Math.round(ba*0.30+srScore*0.25+rwScore*0.25+svScore*0.20);
  return{score,ba,baDesc,srScore,srDesc,rwScore,rwDesc,svScore,svDesc,spent,incAmt,savAmt,budgetTot,daysLeft,totalDays,meanDailySpend};
}

function calculateHealthScore(){
  const p=PAY_PERIOD.currentPeriod();
  const inP=PAY_PERIOD.filterToPeriod(txs,p);
  const expTxs=inP.filter(t=>t.type==='expense');
  const exC=Object.keys(CATS.expense||{});
  const spent=expTxs.reduce((s,t)=>s+t.amount,0);
  const incAmt=inP.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const savAmt=inP.filter(t=>t.type==='savings').reduce((s,t)=>s+t.amount,0);
  const budgetTot=exC.reduce((s,c)=>s+((budgets[c]&&budgets[c].amount)||0),0);

  const start=new Date(p.start),end=new Date(p.end);
  const today=new Date();today.setHours(0,0,0,0);
  const totalDays=Math.max(Math.round((end-start)/86400000)+1,1);
  const elapsed=Math.min(Math.max(Math.round((today-start)/86400000)+1,1),totalDays);
  const daysLeft=Math.max(Math.ceil((end-today)/86400000),0);

  // Signal 1 — Budget adherence (0–100)
  let ba=75,baDesc='No budget set';
  if(budgetTot>0){
    const pctUsed=spent/budgetTot;
    const pctElapsed=elapsed/totalDays;
    ba=Math.max(0,Math.min(100,Math.round(100-(Math.max(0,pctUsed-pctElapsed)/Math.max(pctElapsed,0.01))*100)));
    baDesc=`${Math.round(pctUsed*100)}% used at day ${elapsed} of ${totalDays}`;
  }

  // Signal 2 — Savings rate (0–100)
  const srRate=incAmt>0?savAmt/incAmt:0;
  const srScore=Math.round(Math.min(srRate/0.20,1)*100);
  const srDesc=`${(srRate*100).toFixed(1)}% of income · target 20%`;

  // Signal 3 — Runway (0–100)
  const rwScore=Math.round(Math.min(daysLeft/7,1)*100);
  const rwDesc=`${daysLeft} day${daysLeft!==1?'s':''} — ${daysLeft>=7?'safely ahead of':'close to'} payday`;

  // Signal 4 — Spend variance (0–100): coefficient of variation of daily spend
  let svScore=75,svDesc='Steady — consistent daily spend';
  const dayMap={};
  expTxs.forEach(t=>{dayMap[t.date]=(dayMap[t.date]||0)+t.amount;});
  const dayVals=Object.values(dayMap);
  if(dayVals.length>=3){
    const mean=dayVals.reduce((a,b)=>a+b,0)/dayVals.length;
    const cv=mean>0?Math.sqrt(dayVals.reduce((a,b)=>a+(b-mean)**2,0)/dayVals.length)/mean:0;
    svScore=Math.max(0,Math.round((1-Math.min(cv,1))*100));
    svDesc=cv<0.4?'Steady — consistent daily spend':cv<0.8?'Moderate — some daily swings':'Variable — weekend or event spikes';
  }

  // Composite (weighted)
  const score=Math.round(ba*0.30+srScore*0.25+rwScore*0.25+svScore*0.20);

  // Zone + badge colours
  const zone=score>=80?'Excellent':score>=60?'Healthy':score>=40?'Watch':'At Risk';
  const badgeBg=score>=80?'var(--accent)':score>=60?'var(--accent-soft)':score>=40?'rgba(184,87,43,0.12)':'var(--warn)';
  const badgeColor=score>=80?'var(--bg)':score>=60?'var(--accent)':score>=40?'var(--warn)':'#fff';

  // DOM — composite
  const sc=document.getElementById('hs-score');
  const badge=document.getElementById('hs-badge');
  const zoneBar=document.getElementById('hs-zone-bar');
  if(!sc||!badge||!zoneBar)return;
  sc.textContent=score;
  badge.textContent=zone;
  badge.style.background=badgeBg;
  badge.style.color=badgeColor;

  // Segmented zone bar (28 segments; AT RISK 0–10, WATCH 11–15, HEALTHY 16–21, EXCELLENT 22–27)
  const lit=Math.round(score/100*28);
  zoneBar.innerHTML=Array.from({length:28},(_,i)=>{
    const bg=i>=lit?'var(--line)':i<11?'var(--warn)':i<16?'rgba(184,87,43,0.55)':'var(--accent)';
    return `<div style="flex:1;height:20px;border-radius:3px;background:${bg}"></div>`;
  }).join('');

  // DOM — sub-signals
  function setSig(prefix,sigScore,desc){
    const s=document.getElementById(`hs-${prefix}-score`);
    const b=document.getElementById(`hs-${prefix}-bar`);
    const d=document.getElementById(`hs-${prefix}-desc`);
    if(!s||!b||!d)return;
    s.textContent=sigScore;
    const c=sigScore>=60?'var(--accent)':'var(--warn)';
    s.style.color=c;
    b.style.width=sigScore+'%';
    b.style.background=c;
    d.textContent=desc;
  }
  setSig('ba',ba,baDesc);
  setSig('sr',srScore,srDesc);
  setSig('rw',rwScore,rwDesc);
  setSig('sv',svScore,svDesc);

  // Persist to Firestore (non-blocking)
  if(uref){
    const entry={period:p.start,score,zone,breakdown:{budgetAdherence:ba,savingsRate:srScore,runway:rwScore,spendVariance:svScore},calculatedAt:firebase.firestore.FieldValue.serverTimestamp()};
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

// ── Coach card ───────────────────────────────────────────────────
function renderCoach(){
  const el=document.getElementById('d-coach');
  if(!el) return;
  if(isLoading){
    el.innerHTML=`<div style="background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:24px"><span style="color:var(--ink-3)">–</span></div>`;
    return;
  }
  const p=PAY_PERIOD.currentPeriod();
  const inP=PAY_PERIOD.filterToPeriod(txs,p);
  const exp=inP.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const sav=inP.filter(t=>t.type==='savings').reduce((s,t)=>s+t.amount,0);
  const start=new Date(p.start),end=new Date(p.end);
  const today=new Date();today.setHours(0,0,0,0);
  const daysLeft=Math.max(Math.ceil((end-today)/86400000),0);
  const totalDays=Math.max(Math.round((end-start)/86400000)+1,1);
  const elapsed=Math.min(Math.max(Math.round((today-start)/86400000)+1,1),totalDays);
  const budgetTot=Object.keys(CATS.expense||{}).reduce((s,c)=>s+((budgets[c]&&budgets[c].amount)||0),0);
  const daily=elapsed>0?exp/elapsed:0;
  const remaining=Math.max((end-today)/86400000,0);
  const projected=exp+daily*remaining;
  const dailySafe=daysLeft>0&&budgetTot>0?(budgetTot-exp)/daysLeft:0;
  const catSpend={};
  inP.filter(t=>t.type==='expense'&&t.category).forEach(t=>{catSpend[t.category]=(catSpend[t.category]||0)+t.amount;});
  const topEntry=Object.entries(catSpend).sort((a,b)=>b[1]-a[1])[0];
  const topCat=topEntry?topEntry[0]:'spending';
  const savGoal=(goals||[]).reduce((s,g)=>s+(g.monthly||0),0);

  let headline,sub,dotColor;
  if(exp>budgetTot&&budgetTot>0){
    headline=`You've gone ${RM(exp-budgetTot)} over budget.`;
    sub=`Cut ${RM(Math.max(0,(exp-budgetTot)/Math.max(daysLeft,1)))} a day to recover.`;
    dotColor='var(--warn)';
  } else if(projected>budgetTot&&budgetTot>0&&daysLeft>3){
    headline=`At this rate you'll exceed budget by ${RM(projected-budgetTot)}.`;
    sub=`Ease up on ${topCat} this week.`;
    dotColor='var(--warn)';
  } else if(daily>dailySafe*1.1&&dailySafe>0){
    headline=`You're spending ${RM(daily)}/day. Safe limit is ${RM(dailySafe)}.`;
    sub=`Watch ${topCat} this week.`;
    dotColor='var(--warn)';
  } else if(daily<=dailySafe&&daysLeft>5&&budgetTot>0){
    headline=`You're pacing ${RM(dailySafe-daily)} under your daily safe-spend.`;
    sub=`Keep this rhythm and you'll finish +${RM((dailySafe-daily)*daysLeft)}.`;
    dotColor='var(--accent)';
  } else if(daysLeft<=3&&(budgetTot===0||exp<=budgetTot)){
    headline=`${RM(Math.max(0,budgetTot-exp))} left. ${daysLeft} day${daysLeft!==1?'s':''} to payday.`;
    sub=`You're going to land this one.`;
    dotColor='var(--accent)';
  } else if(savGoal>0&&sav<savGoal*0.5&&daysLeft>10){
    headline=`Savings at ${Math.round(sav/savGoal*100)}% of your goal.`;
    sub=`${RM(savGoal-sav)} still needed this period.`;
    dotColor='var(--ink-3)';
  } else {
    headline=`Period day ${elapsed} of ${totalDays}.`;
    sub=`${RM(exp)} spent so far.`;
    dotColor='var(--ink-3)';
  }

  const isDark=document.body.getAttribute('data-theme')==='dark';
  const cardBg=isDark?'#F4F1EA':'var(--surface)';
  const cardBorder=isDark?'none':'1px solid var(--line)';
  const headColor=isDark?'#14120F':'var(--ink)';
  const subColor=isDark?'rgba(20,18,15,0.55)':'var(--ink-3)';
  const labelColor=isDark?'rgba(20,18,15,0.45)':'var(--ink-3)';

  el.innerHTML=`<div style="background:${cardBg};border:${cardBorder};border-radius:var(--r-lg);padding:24px">
    <div style="display:flex;align-items:center;gap:7px;margin-bottom:14px">
      <div style="width:8px;height:8px;border-radius:50%;background:${dotColor};flex-shrink:0"></div>
      <span style="font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:${labelColor};font-weight:600">Coach</span>
    </div>
    <div style="font-family:var(--serif);font-size:22px;line-height:1.3;color:${headColor};margin-bottom:8px">${headline}</div>
    <div style="font-size:13px;color:${subColor}">${sub}</div>
  </div>`;
}

// ── Spend Rhythm ─────────────────────────────────────────────────
function renderSpendRhythm(){
  const el=document.getElementById('d-spend-rhythm');
  if(!el)return;

  // Monday of the current week
  const today=new Date();today.setHours(0,0,0,0);
  const dow=today.getDay();
  const mondayOffset=dow===0?6:dow-1;
  const w4Mon=new Date(today);w4Mon.setDate(today.getDate()-mondayOffset);
  const w1Mon=new Date(w4Mon);w1Mon.setDate(w4Mon.getDate()-21);

  // Daily spend lookup
  const byDay={};
  txs.filter(t=>t.type==='expense'&&t.date).forEach(t=>{byDay[t.date]=(byDay[t.date]||0)+t.amount;});

  // 4×7 matrix: rows=weeks (W1 oldest), cols=Mon–Sun
  const weeks=[];
  for(let w=0;w<4;w++){
    const row=[];
    for(let d=0;d<7;d++){
      const dt=new Date(w1Mon);dt.setDate(w1Mon.getDate()+w*7+d);
      const ymd=dt.toISOString().slice(0,10);
      row.push({ymd,amt:dt>today?null:(byDay[ymd]||0)});
    }
    weeks.push(row);
  }

  // 4-week daily average (non-zero, non-future)
  const nonZero=weeks.flat().filter(c=>c.amt!==null&&c.amt>0).map(c=>c.amt);
  const avg4=nonZero.length?nonZero.reduce((s,v)=>s+v,0)/nonZero.length:0;

  // Day-of-week averages for pattern label
  const dowAvgs=Array.from({length:7},(_,d)=>{
    const vals=weeks.map(w=>w[d]).filter(c=>c.amt!==null&&c.amt>0).map(c=>c.amt);
    return vals.length?vals.reduce((s,v)=>s+v,0)/vals.length:0;
  });
  const activeDowAvgs=dowAvgs.filter(v=>v>0);
  const overallMean=activeDowAvgs.length?activeDowAvgs.reduce((s,v)=>s+v,0)/activeDowAvgs.length:0;
  let patternLabel=null;
  if(overallMean>0){
    const ranked=[...dowAvgs.entries()].sort((a,b)=>b[1]-a[1]);
    const [top,topV]=ranked[0];
    const [sec]=ranked[1]||[0];
    const NAMES=['Mondays','Tuesdays','Wednesdays','Thursdays','Fridays','Saturdays','Sundays'];
    if(topV>1.5*overallMean){
      patternLabel=((top===5||top===6)&&(sec===5||sec===6))
        ?'Weekends run hot':NAMES[top]+' run hot';
    }
  }

  // Cell colour (opacity-based so it works across light/dark/warm themes)
  function cellBg(amt){
    if(amt===null||amt===0)return'background:var(--bg-2);color:var(--ink-4)';
    if(avg4===0||amt<=avg4*0.75)return'background:rgba(201,245,96,0.12);color:var(--ink-3)';
    if(amt<=avg4*1.5)return'background:rgba(201,245,96,0.55);color:#1A2810';
    return'background:rgba(245,161,95,0.70);color:#2A1500';
  }

  const fmtAvg='RM '+Math.round(avg4);
  const DAY_H=['M','T','W','T','F','S','S'];

  el.innerHTML=`
    <div style="background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:24px;height:100%">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <div style="font-family:var(--serif);font-size:20px;color:var(--ink)">Spend rhythm</div>
        <div style="font-size:11px;color:var(--ink-3);font-family:var(--mono);background:var(--bg-2);padding:4px 10px;border-radius:var(--r-sm)">4-wk avg ${fmtAvg}</div>
      </div>
      <div style="font-size:11px;color:var(--ink-3);margin-bottom:16px">Last 4 weeks${patternLabel?' · <span style="color:var(--ink-2)">'+patternLabel+'</span>':''}</div>
      <div style="display:grid;grid-template-columns:24px repeat(7,1fr);gap:4px;align-items:center">
        <div></div>
        ${DAY_H.map(d=>`<div style="text-align:center;font-size:10px;color:var(--ink-4);font-weight:600;padding-bottom:2px">${d}</div>`).join('')}
        ${weeks.map((row,wi)=>`
          <div style="font-size:10px;color:var(--ink-4);font-weight:600;padding-right:4px">W${wi+1}</div>
          ${row.map(c=>`<div style="${cellBg(c.amt)};border-radius:8px;padding:9px 3px;text-align:center;font-family:var(--mono);font-size:11px;font-weight:500;min-height:36px;display:flex;align-items:center;justify-content:center">${c.amt===null||c.amt===0?'–':Math.round(c.amt)}</div>`).join('')}
        `).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px">
        <div style="font-size:10px;color:var(--ink-4)">Avg daily spend in RM</div>
        <div style="display:flex;align-items:center;gap:5px;font-size:10px;color:var(--ink-4)">
          LOW
          <div style="width:12px;height:12px;border-radius:3px;background:var(--bg-2);border:1px solid var(--line)"></div>
          <div style="width:12px;height:12px;border-radius:3px;background:rgba(201,245,96,0.12)"></div>
          <div style="width:12px;height:12px;border-radius:3px;background:rgba(201,245,96,0.55)"></div>
          <div style="width:12px;height:12px;border-radius:3px;background:rgba(245,161,95,0.70)"></div>
          HIGH
        </div>
      </div>
    </div>`;
}

// ── Categories budget progress ────────────────────────────────────
function renderHomeCats(){
  const el=document.getElementById('d-home-cats');
  if(!el) return;
  const cats=Object.keys(budgets||{});
  if(!cats.length){ el.innerHTML=''; return; }
  const p=PAY_PERIOD.currentPeriod();
  const spent={};
  PAY_PERIOD.filterToPeriod(txs,p).filter(t=>t.type==='expense').forEach(t=>{
    spent[t.category]=(spent[t.category]||0)+t.amount;
  });
  const rows=cats
    .map(c=>({ cat:c, amt:spent[c]||0, budget:(budgets[c]&&budgets[c].amount)||0 }))
    .filter(r=>r.budget>0)
    .sort((a,b)=>(b.amt/b.budget)-(a.amt/a.budget))
    .slice(0,5);
  if(!rows.length){ el.innerHTML=''; return; }
  const fmt=n=>'RM '+Math.round(n).toLocaleString('en-MY');
  const items=rows.map(r=>{
    const pct=Math.min(r.amt/r.budget*100,100);
    const barColor=pct>=85?'var(--warn)':'var(--accent)';
    return `<div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">
        <div style="font-size:14px;color:var(--ink)">${r.cat}</div>
        <div style="font-family:var(--mono);font-size:13px;color:var(--ink-3)">${fmt(r.amt)} / ${fmt(r.budget)}</div>
      </div>
      <div style="height:8px;border-radius:4px;overflow:hidden;background:var(--line)">
        <div style="height:100%;border-radius:4px;width:${pct.toFixed(1)}%;background:${barColor};transition:width 0.4s ease"></div>
      </div>
    </div>`;
  }).join('');
  el.innerHTML=`<div style="background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:24px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div style="font-family:var(--serif);font-size:26px;color:var(--ink)">Categories</div>
      <button onclick="nav('insights')" style="font-size:13px;color:var(--ink-3);background:none;border:none;cursor:pointer">Adjust →</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:18px">${items}</div>
  </div>`;
}

// ── Where It Went ────────────────────────────────────────────────
// Colour palette matches the dark-theme mockup: lime → gray → orange → dark grays
const WHERE_PAL=['#C9F560','#8A847A','#F5A15F','#56524B','#3A3835','#2A2825'];

function renderWhereItWent(){
  const el=document.getElementById('d-where-it-went');
  if(!el)return;

  const p=PAY_PERIOD.currentPeriod();
  const currCats={};
  PAY_PERIOD.filterToPeriod(txs,p).filter(t=>t.type==='expense').forEach(t=>{
    currCats[t.category]=(currCats[t.category]||0)+t.amount;
  });

  const prevP=PAY_PERIOD.lastNPeriods(2)[1];
  const prevCats={};
  if(prevP){
    PAY_PERIOD.filterToPeriod(txs,prevP).filter(t=>t.type==='expense').forEach(t=>{
      prevCats[t.category]=(prevCats[t.category]||0)+t.amount;
    });
  }

  const sorted=Object.entries(currCats).sort((a,b)=>b[1]-a[1]).slice(0,6);
  if(!sorted.length){el.innerHTML='';return;}

  const total=sorted.reduce((s,[,v])=>s+v,0);
  const fmtTotal=total>=1000?'RM '+(total/1000).toFixed(1)+'k':RM(total);

  el.innerHTML=`
    <div style="background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:24px;height:100%">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:20px">
        <div style="font-family:var(--serif);font-size:20px;color:var(--ink)">Where it went</div>
        <div style="font-size:11px;color:var(--ink-3)">Period breakdown · vs last</div>
      </div>
      <div style="display:flex;gap:20px;align-items:center">
        <div style="position:relative;flex-shrink:0;width:180px;height:180px">
          <canvas id="where-chart" width="180" height="180"></canvas>
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;text-align:center">
            <div style="font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:var(--ink-3);margin-bottom:4px">Total</div>
            <div style="font-family:var(--mono);font-size:18px;font-weight:500;color:var(--ink);letter-spacing:-0.02em">${fmtTotal}</div>
          </div>
        </div>
        <div style="flex:1;display:flex;flex-direction:column;gap:12px">
          ${sorted.map(([cat,amt],i)=>{
            const prev=prevCats[cat];
            const delta=prev?Math.round((amt-prev)/prev*100):null;
            const shortCat=cat.length>11?cat.slice(0,11)+'…':cat;
            const deltaHtml=delta===null
              ?`<span style="color:var(--ink-4);font-size:12px;font-family:var(--mono)">—</span>`
              :delta>0
                ?`<span style="color:var(--warn);font-size:13px;font-family:var(--mono);font-weight:600">+${delta}%</span>`
                :`<span style="color:var(--accent);font-size:13px;font-family:var(--mono);font-weight:600">${delta}%</span>`;
            return`<div style="display:flex;align-items:center;gap:8px">
              <div style="width:10px;height:10px;border-radius:3px;flex-shrink:0;background:${WHERE_PAL[i]}"></div>
              <span style="flex:1;font-size:13px;color:var(--ink-2)">${shortCat}</span>
              ${deltaHtml}
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;

  if(_whereChart){_whereChart.destroy();_whereChart=null;}
  const surfaceBg=getComputedStyle(document.body).getPropertyValue('--surface').trim()||'#ffffff';
  const ctx=document.getElementById('where-chart').getContext('2d');
  _whereChart=new Chart(ctx,{
    type:'doughnut',
    data:{
      labels:sorted.map(([c])=>c),
      datasets:[{
        data:sorted.map(([,v])=>v),
        backgroundColor:WHERE_PAL.slice(0,sorted.length),
        borderWidth:2,
        borderColor:surfaceBg,
        hoverOffset:4
      }]
    },
    options:{
      cutout:'68%',
      plugins:{
        legend:{display:false},
        tooltip:{callbacks:{title:()=>'',label:c=>' '+RM(c.raw)}}
      }
    }
  });
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

function detectAnomalies(){
  // Find most recent period with expense data (demo data may end before current period)
  const periods=PAY_PERIOD.lastNPeriods(5);
  let currIdx=-1;
  for(let i=0;i<periods.length;i++){
    if(txs.some(t=>t.type==='expense'&&t.date>=periods[i].start&&t.date<=periods[i].end)){currIdx=i;break;}
  }
  if(currIdx===-1||currIdx+3>=periods.length)return[];
  const p=periods[currIdx];
  const histPeriods=periods.slice(currIdx+1,currIdx+4);
  // Current period totals by category
  const currTotals={};
  txs.filter(t=>t.type==='expense'&&t.date>=p.start&&t.date<=p.end).forEach(t=>currTotals[t.category]=(currTotals[t.category]||0)+t.amount);
  // History averages: average period total per category across 3 prior periods
  const hTotals={};
  histPeriods.forEach(hp=>{
    const pt={};
    txs.filter(t=>t.type==='expense'&&t.date>=hp.start&&t.date<=hp.end).forEach(t=>pt[t.category]=(pt[t.category]||0)+t.amount);
    Object.keys(pt).forEach(c=>{if(!hTotals[c])hTotals[c]=[];hTotals[c].push(pt[c]);});
  });
  const hAvg={};Object.keys(hTotals).forEach(c=>hAvg[c]=hTotals[c].reduce((s,v)=>s+v,0)/hTotals[c].length);
  // Days elapsed for budget pace
  const start=new Date(p.start+'T00:00:00');
  const end=new Date(p.end+'T00:00:00');
  const today=new Date();
  const totalDays=Math.round((end-start)/(864e5))+1;
  const daysElapsed=Math.min(Math.max(Math.round((today-start)/(864e5))+1,1),totalDays);
  const pctElapsed=daysElapsed/totalDays;
  const anomalies=[];
  // Spike: current-period category total > 2× 3-period average
  for(const cat of Object.keys(currTotals)){
    const curr=currTotals[cat];
    const ha=hAvg[cat];
    if(ha>0&&curr>2*ha){
      anomalies.push({type:'spike',category:cat,message:`${cat} is ${(curr/ha).toFixed(1)}× your usual — ${RM(curr)} vs avg ${RM(ha)}`,action:{label:'Review',fn:`navActivityCat('${cat}')`}});
    }
  }
  // Budget pace: spending outpacing time elapsed by >25%
  for(const cat of Object.keys(budgets)){
    const b=budgets[cat];
    if(!b||!b.amount||b.amount<=0)continue;
    const spent=currTotals[cat]||0;
    if(spent===0)continue;
    const pctSpent=spent/b.amount;
    if(pctSpent>pctElapsed+0.25){
      const daysLeft=totalDays-daysElapsed;
      anomalies.push({type:'budget_pace',category:cat,message:`${cat} is ${Math.round((pctSpent-pctElapsed)*100)}% ahead of budget pace — ${daysLeft} day${daysLeft!==1?'s':''} left`,action:{label:'See budget',fn:"switchInsightsTab('budgets')"}});
    }
  }
  return anomalies;
}

function renderAnomalyBanner(){
  const el=document.getElementById('ins-anomaly-banner');
  if(!el)return;
  if(isLoading){el.innerHTML='';return;}
  const anomalies=detectAnomalies();
  if(!anomalies.length){el.innerHTML='';return;}
  el.innerHTML=anomalies.map(a=>`
    <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:rgba(184,87,43,0.08);border-left:3px solid var(--warn);border-radius:var(--r-sm);margin-bottom:8px">
      <span style="color:var(--warn);font-size:16px;flex-shrink:0">⚠</span>
      <span style="font-size:13px;color:var(--ink-2);flex:1">${a.message}</span>
      <button onclick="${a.action.fn}" style="font-size:12px;font-weight:500;color:var(--warn);background:none;border:none;cursor:pointer;white-space:nowrap;flex-shrink:0">${a.action.label} →</button>
    </div>`).join('');
}

function navActivityCat(cat){
  const tSel=document.getElementById('tf-type');const cSel=document.getElementById('tf-cat');
  if(tSel)tSel.value='expense';
  if(cSel)cSel.value=cat;
  nav('activity');
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
    const arrowSymbol=t.type==='income'?'↑':t.type==='savings'?'→':'↓';
    const arrowBg=t.type==='income'?'background:var(--accent-soft);color:var(--accent)':'background:var(--line-2);color:var(--ink-3)';
    return`
    <div class="group bg-surface-container-lowest hover:bg-surface-container-low transition-all duration-200 p-4 rounded-2xl flex items-center gap-4">
      <div class="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0" style="${arrowBg}">${arrowSymbol}</div>
      <div class="flex-1 min-w-0">
        <p class="font-bold text-slate-900 text-sm truncate">${t.category}${t.subcategory?' · '+t.subcategory:''}</p>
        <p class="text-xs text-slate-400 mt-0.5">${fd(t.date)} · ${t.account||''}</p>
        ${t.description?`<p class="text-[11px] text-slate-400 truncate">${t.description}</p>`:''}
      </div>
      ${unusual?'<span class="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 flex-shrink-0">Unusual</span>':''}
      <p class="font-bold text-sm ${TCLR[t.type]} whitespace-nowrap flex-shrink-0" style="font-family:var(--mono)">${t.type==='income'?'+':'-'}${RM(t.amount)}</p>
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
function refreshQuickLog(){
  const catSel=document.getElementById('ql-cat');
  if(!catSel) return;
  const cats=Object.keys(CATS.expense||{});
  if(!cats.length){ catSel.innerHTML='<option value="">No categories</option>'; return; }
  const prevCat=catSel.value;
  catSel.innerHTML=cats.map(c=>`<option value="${c}">${c}</option>`).join('');
  const target=lastUsedCat&&cats.includes(lastUsedCat)?lastUsedCat:prevCat&&cats.includes(prevCat)?prevCat:cats[0];
  catSel.value=target;
}
async function quickLog(){
  const amtEl=document.getElementById('ql-amt');
  const amt=parseFloat(amtEl.value);
  if(!amt||amt<=0){ amtEl.focus(); return; }
  if(DEMO_MODE){ showDemoToast(); return; }
  const cat=document.getElementById('ql-cat').value;
  const memo=document.getElementById('ql-memo')?.value.trim()||'';
  const acct=ACCTS[0]||'';
  lastUsedCat=cat;
  const tx={type:'expense',amount:amt,category:cat,subcategory:'',account:acct,
    date:new Date().toISOString().slice(0,10),description:memo,
    createdAt:firebase.firestore.FieldValue.serverTimestamp()};
  uref.collection('transactions').add(tx).then(()=>{ amtEl.value=''; const m=document.getElementById('ql-memo');if(m)m.value=''; }).catch(err=>console.error(err));
}
document.addEventListener('DOMContentLoaded',()=>{
  ['ql-amt','ql-memo'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.addEventListener('keydown',e=>{ if(e.key==='Enter') quickLog(); });
  });
});

function setType(t){eType=t;eCat=null;['expense','income','savings'].forEach(x=>{const b=document.getElementById('tb-'+x);if(!b)return;b.className=x===t?'px-5 py-2 rounded-lg text-sm font-semibold bg-gradient-to-br from-primary to-primary-container text-white transition-all duration-200 shadow-sm shadow-indigo-200':'px-5 py-2 rounded-lg text-sm font-semibold text-slate-500 hover:text-slate-800 hover:bg-white transition-all duration-200';});refreshEntry();}
function refreshEntry(){
  const as=document.getElementById('e-acct');if(as){const c=as.value;as.innerHTML=ACCTS.map(a=>`<option value="${a}"${a===c?' selected':''}>${a}</option>`).join('');}
  const cats=Object.keys(CATS[eType]||{});
  document.getElementById('e-cat-grid').innerHTML=cats.map(cat=>{
    const sel=cat===eCat;
    return `<button onclick="selCat('${cat}')" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 8px;border-radius:var(--r-md);border:1px solid ${sel?'var(--accent)':'var(--line)'};background:${sel?'var(--accent-soft)':'var(--surface)'};cursor:pointer;transition:all .2s;width:100%;box-shadow:${sel?'none':'var(--shadow-sm)'}">
      <span class="material-symbols-outlined msym" style="font-size:22px;color:${sel?'var(--accent)':'var(--ink-3)'}">${ICONS[cat]||'category'}</span>
      <span style="font-size:11px;font-weight:600;color:${sel?'var(--ink)':'var(--ink-2)'};font-family:var(--sans);line-height:1.2;text-align:center">${cat}</span>
    </button>`;
  }).join('');
  updSub();
}
function selCat(c){eCat=c;document.getElementById('e-cat-sel').textContent=c;refreshEntry();}
function updSub(){const subs=(CATS[eType]&&eCat&&CATS[eType][eCat])||[];const ss=document.getElementById('e-sub');if(ss)ss.innerHTML=subs.length?subs.map(s=>`<option value="${s}">${s}</option>`).join(''):'<option value="">— none —</option>';}
async function submitEntry(){
  if(DEMO_MODE){showDemoToast();return;}
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
  resetEntry();closeEntrySection();nav('home');
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
  nav('settings');
  setTimeout(()=>openEntrySection(),50);
}
function cancelEdit(){editId=null;resetEntry();closeEntrySection();nav('activity');}
function setEntrySection(open){
  const body=document.getElementById('entry-section-body');
  const chev=document.getElementById('entry-section-chevron');
  const sub=document.getElementById('entry-section-header')?.querySelector('div > div:last-child');
  if(!body)return;
  body.style.display=open?'block':'none';
  if(chev)chev.style.transform=open?'rotate(180deg)':'';
  if(sub)sub.textContent=open?'':'Tap to expand';
}
function toggleEntrySection(){const b=document.getElementById('entry-section-body');setEntrySection(!b||b.style.display==='none');}
function openEntrySection(){setEntrySection(true);}
function closeEntrySection(){setEntrySection(false);}
async function delTx(id){if(DEMO_MODE){showDemoToast();return;}if(!confirm('Delete this transaction?'))return;if(uref)await uref.collection('transactions').doc(String(id)).delete();else{txs=txs.filter(t=>String(t.id)!==String(id));renderTx();renderDashboard();}}

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
  document.getElementById('an-tab-heatmap').className=tab==='heatmap'?active:inactive;
  document.getElementById('an-trends').classList.toggle('hidden',tab!=='trends');
  document.getElementById('an-waterfall').classList.toggle('hidden',tab!=='waterfall');
  document.getElementById('an-heatmap').classList.toggle('hidden',tab!=='heatmap');
  // Hide period + type selectors for heatmap (fixed 3-month window, expenses only)
  document.getElementById('an-type').classList.toggle('hidden',tab==='waterfall'||tab==='heatmap');
  document.getElementById('an-period').classList.toggle('hidden',tab==='heatmap');
  if(tab==='heatmap'){_hmMonthOffset=0;renderHeatmap();}
  else renderAnalytics();
}

function renderHeatmap(){
  const grid=document.getElementById('an-hm-grid');
  const detail=document.getElementById('an-hm-detail');
  if(!grid)return;
  if(isLoading){grid.innerHTML=LOADING_HTML;return;}

  // Build day→amount map for expenses only (all time — used for colour thresholds)
  const dayMap={};
  txs.filter(t=>t.type==='expense').forEach(t=>{
    dayMap[t.date]=(dayMap[t.date]||0)+t.amount;
  });

  // Percentile thresholds across all non-zero days
  const nonZero=Object.values(dayMap).filter(v=>v>0).sort((a,b)=>a-b);
  const p25=nonZero[Math.floor(nonZero.length*0.25)]||0;
  const p75=nonZero[Math.floor(nonZero.length*0.75)]||0;

  function cellColor(amt){
    if(!amt) return 'var(--bg-2)';
    if(amt<=p25) return 'rgba(43,95,62,0.15)';
    if(amt<=p75) return 'rgba(43,95,62,0.42)';
    return 'rgba(43,95,62,0.82)';
  }
  function textColor(amt){
    if(!amt||amt<=p25) return 'var(--ink-4)';
    if(amt<=p75) return 'var(--ink-2)';
    return 'var(--surface)';
  }

  const DAY_LABELS=['M','T','W','T','F','S','S'];
  const now=new Date();
  const todayStr=now.toISOString().slice(0,10);
  const MAX_OFFSET=2; // how far back user can page (3 months total)

  // Current page: month at offset 0 = this month, 1 = last month, 2 = two months ago
  const d=new Date(now.getFullYear(),now.getMonth()-_hmMonthOffset,1);
  const year=d.getFullYear(),month=d.getMonth();
  const monthName=d.toLocaleDateString('en-MY',{month:'long',year:'numeric'});

  // Month total for the header
  const mm0=String(month+1).padStart(2,'0');
  const monthTotal=txs.filter(t=>t.type==='expense'&&t.date.startsWith(`${year}-${mm0}`)).reduce((s,t)=>s+t.amount,0);

  // Nav buttons
  const canPrev=_hmMonthOffset<MAX_OFFSET;
  const canNext=_hmMonthOffset>0;
  const navBtn=(label,fn,enabled)=>`<button onclick="${fn}()" style="width:32px;height:32px;border-radius:50%;border:1px solid var(--line);background:var(--surface);color:${enabled?'var(--ink)':'var(--ink-4)'};cursor:${enabled?'pointer':'default'};font-size:16px;display:flex;align-items:center;justify-content:center" ${enabled?'':'disabled'}>${label}</button>`;

  let html=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
    <div>
      <span style="font-size:15px;font-weight:600;color:var(--ink)">${monthName}</span>
      <span style="font-size:12px;color:var(--ink-4);margin-left:10px;font-family:var(--mono)">${RM(monthTotal)}</span>
    </div>
    <div style="display:flex;gap:8px;align-items:center">
      <span style="font-size:11px;color:var(--ink-4)">${_hmMonthOffset===0?'Current month':_hmMonthOffset===1?'1 month ago':'2 months ago'}</span>
      ${navBtn('←','hmPrev',canPrev)}
      ${navBtn('→','hmNext',canNext)}
    </div>
  </div>`;

  // Day-of-week header
  html+=`<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin-bottom:5px">`;
  DAY_LABELS.forEach(lbl=>{
    html+=`<div style="text-align:center;font-size:10px;color:var(--ink-4);font-weight:500;padding-bottom:2px">${lbl}</div>`;
  });
  html+=`</div>`;

  // Calendar grid
  const daysInMonth=new Date(year,month+1,0).getDate();
  let startDow=new Date(year,month,1).getDay();
  startDow=(startDow+6)%7; // Mon=0
  html+=`<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px">`;
  for(let i=0;i<startDow;i++) html+=`<div></div>`;
  for(let day=1;day<=daysInMonth;day++){
    const dd=String(day).padStart(2,'0');
    const dateStr=`${year}-${mm0}-${dd}`;
    const amt=dayMap[dateStr]||0;
    const isFuture=dateStr>todayStr;
    const isToday=dateStr===todayStr;
    const bg=isFuture?'transparent':cellColor(amt);
    const fg=isFuture?'var(--ink-4)':textColor(amt);
    const border=isToday?`2px solid var(--accent)`:`2px solid transparent`;
    html+=`<div onclick="hmSelectDay('${dateStr}',${amt})" data-hm="${dateStr}"
      style="aspect-ratio:1;border-radius:8px;background:${bg};border:${border};display:flex;align-items:center;justify-content:center;font-size:12px;color:${fg};cursor:${isFuture?'default':'pointer'};font-family:var(--mono);${isFuture?'opacity:0.25':''}">
      ${day}
    </div>`;
  }
  html+=`</div>`;

  // Legend
  html+=`<div style="display:flex;align-items:center;gap:8px;margin-top:16px">
    <span style="font-size:11px;color:var(--ink-4)">No spend</span>
    <div style="display:flex;gap:3px">
      <div style="width:14px;height:14px;border-radius:3px;background:var(--bg-2);border:1px solid var(--line)"></div>
      <div style="width:14px;height:14px;border-radius:3px;background:rgba(43,95,62,0.15)"></div>
      <div style="width:14px;height:14px;border-radius:3px;background:rgba(43,95,62,0.42)"></div>
      <div style="width:14px;height:14px;border-radius:3px;background:rgba(43,95,62,0.82)"></div>
    </div>
    <span style="font-size:11px;color:var(--ink-4)">High spend</span>
  </div>`;

  grid.innerHTML=html;
  detail.style.display='none';

  window.hmPrev=function(){if(_hmMonthOffset<MAX_OFFSET){_hmMonthOffset++;renderHeatmap();}};
  window.hmNext=function(){if(_hmMonthOffset>0){_hmMonthOffset--;renderHeatmap();}};

  window.hmSelectDay=function(dateStr,amt){
    if(dateStr>todayStr) return;
    document.querySelectorAll('[data-hm]').forEach(el=>{
      el.style.outline=el.dataset.hm===dateStr?'2px solid var(--accent)':'none';
      el.style.outlineOffset='2px';
    });
    const dayTxs=txs.filter(t=>t.type==='expense'&&t.date===dateStr).sort((a,b)=>b.amount-a.amount);
    const label=new Date(dateStr+'T00:00:00').toLocaleDateString('en-MY',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
    if(!dayTxs.length){
      detail.style.display='block';
      detail.innerHTML=`<p style="font-size:13px;color:var(--ink-3);margin:0">${label} — no expenses recorded</p>`;
      return;
    }
    const rows=dayTxs.map(t=>`<div style="display:flex;justify-content:space-between;align-items:baseline;padding:6px 0;border-bottom:1px solid var(--line)">
      <span style="font-size:13px;color:var(--ink-2)">${t.category}${t.description?` · <span style="color:var(--ink-4)">${t.description}</span>`:''}</span>
      <span style="font-size:13px;font-family:var(--mono);color:var(--ink);font-weight:500">${RM(t.amount)}</span>
    </div>`).join('');
    detail.style.display='block';
    detail.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">
        <span style="font-size:13px;font-weight:600;color:var(--ink)">${label}</span>
        <span style="font-size:13px;font-family:var(--mono);color:var(--warn);font-weight:600">${RM(amt)} total</span>
      </div>${rows}`;
  };
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

function renderPeriodNarrative(){
  const el=document.getElementById('ins-narrative');
  if(!el)return;
  const periods=PAY_PERIOD.lastNPeriods(4);
  if(periods.length<2){el.innerHTML='';return;}
  // Use the most recent period that has expense data, so the card is useful
  // even at the start of a new pay cycle when the current period is empty
  let currIdx=-1;
  for(let i=0;i<periods.length-1;i++){
    if(txs.some(t=>t.type==='expense'&&t.date>=periods[i].start&&t.date<=periods[i].end)){currIdx=i;break;}
  }
  if(currIdx===-1){el.innerHTML='';return;}
  const [curr,prev]=[periods[currIdx],periods[currIdx+1]];
  const sumByCat=p=>{const m={};txs.filter(t=>t.type==='expense'&&t.date>=p.start&&t.date<=p.end).forEach(t=>m[t.category]=(m[t.category]||0)+t.amount);return m;};
  const c=sumByCat(curr),p=sumByCat(prev);
  if(!Object.keys(p).length){el.innerHTML='';return;}

  const rows=[];
  // Increases and decreases
  const deltas=Object.keys(c).filter(cat=>p[cat]>0).map(cat=>({cat,delta:c[cat]-p[cat],curr:c[cat],prev:p[cat]}));
  deltas.sort((a,b)=>b.delta-a.delta);
  if(deltas.length){
    const top=deltas[0];
    if(top.delta>0) rows.push(`<span style="color:var(--warn);font-weight:600">↑</span> <strong>${top.cat}</strong> up ${RM(top.delta)} (${RM(top.prev)} → ${RM(top.curr)})`);
    const bot=deltas[deltas.length-1];
    if(bot.delta<0) rows.push(`<span style="color:var(--accent);font-weight:600">↓</span> <strong>${bot.cat}</strong> down ${RM(Math.abs(bot.delta))} (${RM(bot.prev)} → ${RM(bot.curr)})`);
  }
  // New categories (in current, not in previous)
  Object.keys(c).filter(cat=>!p[cat]).forEach(cat=>{
    if(rows.length<4) rows.push(`<span style="color:var(--ink-3);font-weight:600">★</span> New: <strong>${cat}</strong> (${RM(c[cat])} — first time this period)`);
  });

  if(!rows.length){el.innerHTML='';return;}

  // Malaysia calendar context + upcoming user annotations
  const ctx=getMalaysiaContext(new Date());
  const today=new Date().toISOString().slice(0,10);
  const in30=new Date(Date.now()+30*24*60*60*1000).toISOString().slice(0,10);
  const upcoming=annotations.filter(a=>a.date>today&&a.date<=in30).sort((a,b)=>a.date<b.date?-1:1).slice(0,3);
  const footerLines=[];
  if(ctx) footerLines.push(`📍 ${ctx}`);
  upcoming.forEach(a=>{
    const label=new Date(a.date+'T00:00:00').toLocaleDateString('en-MY',{day:'numeric',month:'short'});
    footerLines.push(`📌 ${a.label} (${label})`);
  });
  const footer=footerLines.length
    ?`<p style="font-size:12px;color:var(--ink-4);margin:8px 0 0;border-top:1px solid var(--line);padding-top:8px;line-height:1.8">${footerLines.join('<br>')}</p>`
    :'';

  el.innerHTML=`
    <div style="background:var(--bg-2);border-radius:var(--r-md);padding:16px 20px;margin-bottom:24px">
      <p style="font-family:var(--serif);font-size:16px;color:var(--ink);margin:0 0 10px">vs last period</p>
      ${rows.slice(0,4).map(r=>`<p style="font-size:13px;color:var(--ink-2);margin:0 0 6px;line-height:1.5">${r}</p>`).join('')}
      ${footer}
    </div>`;
}

function renderAnalytics(){
  renderAnomalyBanner();
  renderPeriodNarrative();
  if(document.getElementById('an-heatmap')&&!document.getElementById('an-heatmap').classList.contains('hidden')){renderHeatmap();return;}
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
  const MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const ml=ms.map(m=>{const[y,mo]=m.split('-');return MN[parseInt(mo)-1]+' '+y;});
  const data={};ms.forEach(m=>{data[m]={};cats.forEach(c=>data[m][c]=0);});fil.forEach(t=>{const m=t.date.slice(0,7);data[m][t.category]=(data[m][t.category]||0)+t.amount;});
  const ds=cats.map((c,i)=>({label:c,data:ms.map(m=>data[m][c]||0),backgroundColor:PAL[i%PAL.length]+'cc',borderColor:PAL[i%PAL.length],borderWidth:1.5,borderRadius:4}));
  if(anBar){anBar.destroy();anBar=null;}if(anLine){anLine.destroy();anLine=null;}
  const anCfg={};
  annotations.forEach((a,i)=>{
    const[y,mo]=a.date.slice(0,7).split('-');
    const lbl=MN[parseInt(mo)-1]+' '+y;
    if(!ml.includes(lbl))return;
    anCfg['ev'+i]={type:'line',scaleID:'x',value:lbl,borderColor:'#6366f1',borderWidth:1,borderDash:[4,4],label:{display:true,content:a.label,position:'start',backgroundColor:'#6366f1',color:'#fff',font:{size:9,family:'Inter'},padding:{x:5,y:3}}};
  });
  const anPlugin={annotation:{annotations:anCfg}};
  const bOpts={responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{size:10,family:'Inter'},boxWidth:10,padding:10}},...anPlugin},scales:{x:{stacked:true,grid:{display:false},ticks:{font:{size:10,family:'Inter'}}},y:{stacked:true,ticks:{callback:v=>'RM'+v.toLocaleString(),font:{size:10,family:'Inter'}},grid:{color:'#f2f4f6'}}}};
  const bc=document.getElementById('an-bar')?.getContext('2d');if(bc)anBar=new Chart(bc,{type:'bar',data:{labels:ml,datasets:ds},options:bOpts});
  const lOpts={responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{size:10,family:'Inter'},boxWidth:10,padding:10}},...anPlugin},scales:{x:{grid:{color:'#f2f4f6'},ticks:{font:{size:10}}},y:{ticks:{callback:v=>'RM'+v.toLocaleString(),font:{size:10}},grid:{color:'#f2f4f6'}}}};
  const lc=document.getElementById('an-line')?.getContext('2d');
  if(lc)anLine=new Chart(lc,{type:'line',data:{labels:ml,datasets:cats.map((c,i)=>({label:c,data:ms.map(m=>data[m][c]||0),borderColor:PAL[i%PAL.length],backgroundColor:PAL[i%PAL.length]+'18',borderWidth:2,pointRadius:3.5,pointHoverRadius:5,tension:.4,fill:false}))},options:lOpts});
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
  if(DEMO_MODE){showDemoToast();return;}
  if(uref)uref.collection('alerts').doc(id).update({status:'acknowledged'});
  else{const a=alerts.find(x=>x.id===id);if(a)a.status='acknowledged';renderAlerts();}
}

function getPTxs(){const p=PAY_PERIOD.currentPeriod();return txs.filter(t=>t.type==='expense'&&t.date&&t.date>=p.start&&t.date<=p.end);}
function renderBudgets(){
  if(curScr!=='insights')return;
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
  if(DEMO_MODE){showDemoToast();return;}
  const nb={};Object.keys(CATS.expense||{}).forEach(c=>{const e=document.getElementById('bg-'+c),te=document.getElementById('bt-'+c);if(e)nb[c]={amount:parseFloat(e.value)||0,threshold:parseInt(te?.value)||80};});
  budgets=nb;if(uref){try{await uref.collection('budgets').doc('settings').set(nb);}catch(e){}}else localStorage.setItem('budgets',JSON.stringify(nb));
  const m=document.getElementById('b-save-msg');m.textContent='Allocations saved ✓';setTimeout(()=>m.textContent='',2500);renderBudgets();
}

// ── Forecast ─────────────────────────────────────────────────────
function renderRecurringUnbudgeted(){
  const el=document.getElementById('f-recurring');
  if(!el)return;
  // Need at least 3 past periods to detect a pattern
  const periods=PAY_PERIOD.lastNPeriods(4).slice(1).reverse();
  if(periods.length<3){el.innerHTML='';return;}

  const exC=Object.keys(CATS.expense||{});
  const hits=[];
  for(const cat of exC){
    if(budgets[cat]&&budgets[cat].amount>0)continue; // already budgeted
    const amts=periods.map(p=>
      txs.filter(t=>t.type==='expense'&&t.category===cat&&t.date>=p.start&&t.date<=p.end)
         .reduce((s,t)=>s+t.amount,0)
    );
    if(amts.every(a=>a>0)) hits.push({cat,avg:amts.reduce((a,b)=>a+b,0)/amts.length});
  }

  if(!hits.length){el.innerHTML='';return;}

  hits.sort((a,b)=>b.avg-a.avg);
  const rows=hits.map(h=>`
    <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--line)">
      <div style="flex:1">
        <span style="font-size:14px;font-weight:500;color:var(--ink)">${h.cat}</span>
        <span style="font-size:12px;color:var(--ink-3);margin-left:8px">~${RM(h.avg)}/period</span>
      </div>
      <button onclick="switchInsightsTab('budgets')" style="font-size:12px;font-weight:600;color:var(--accent);background:var(--accent-soft);border:none;border-radius:var(--r-sm);padding:6px 12px;cursor:pointer;white-space:nowrap">Add to budget</button>
    </div>`).join('');

  el.innerHTML=`
    <div style="background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:24px 28px;margin-bottom:28px">
      <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:4px">
        <h3 style="font-family:var(--serif);font-size:18px;color:var(--ink);margin:0">Recurring but unbudgeted</h3>
        <span style="font-size:11px;color:var(--ink-3)">${hits.length} categor${hits.length===1?'y':'ies'} · last 3 periods</span>
      </div>
      <p style="font-size:13px;color:var(--ink-3);margin:0 0 16px">These categories appear every period but have no budget set — silent leaks.</p>
      <div style="border-top:1px solid var(--line)">${rows}</div>
    </div>`;
}

async function checkAndLockPeriod(){
  if(DEMO_MODE||_lockChecked)return;
  _lockChecked=true;
  const periods=PAY_PERIOD.lastNPeriods(2);
  if(periods.length<2)return;
  const justClosed=periods[1];
  const key=justClosed.key;
  if(healthHistory[key]?.isLocked)return;
  const periodTxs=PAY_PERIOD.filterToPeriod(txs,justClosed);
  if(!periodTxs.length)return;
  const totalSpent=periodTxs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const totalBudget=Object.values(budgets).reduce((s,b)=>s+(b.amount||0),0);
  const status=totalBudget>0?(totalSpent<=totalBudget?'green':'red'):'grey';
  const record={status,totalSpent,totalBudget,lockedAt:new Date().toISOString(),isLocked:true};
  try{
    await uref.collection('health').doc('history').set({periods:{[key]:record}},{merge:true});
    healthHistory[key]=record;
  }catch(e){console.error('[Lumina] checkAndLockPeriod',e);}
}

function renderBudgetTrackRecord(){
  const el=document.getElementById('ins-track-record');
  if(!el)return;
  if(isLoading){el.innerHTML='';return;}
  const allPeriods=PAY_PERIOD.lastNPeriods(13).slice(1).reverse();
  const hasData=p=>healthHistory[p.key]||PAY_PERIOD.filterToPeriod(txs,p).length>0;
  const periods=[...allPeriods.filter(hasData),...allPeriods.filter(p=>!hasData(p))];
  const curBudgetTot=Object.values(budgets).reduce((s,b)=>s+(b.amount||0),0);
  let lockedCount=0,greenCount=0;
  const badges=periods.map(p=>{
    const stored=healthHistory[p.key];
    let status,showTilde=false;
    if(stored){
      status=stored.status;
      lockedCount++;
      if(status==='green')greenCount++;
      if(stored.totalBudget>0&&curBudgetTot>0){
        const diff=Math.abs(stored.totalBudget-curBudgetTot)/stored.totalBudget;
        if(diff>0.1)showTilde=true;
      }
    }else{
      const pTxs=PAY_PERIOD.filterToPeriod(txs,p);
      if(!pTxs.length){status='grey';}
      else{
        const spent=pTxs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
        status=curBudgetTot>0?(spent<=curBudgetTot?'green':'red'):'grey';
      }
      showTilde=true;
    }
    const [y,m]=p.key.split('-').map(Number);
    const label=`${MONTHS_SHORT[m-1]} '${String(y).slice(2)}`;
    const C={
      green:{bg:'rgba(43,95,62,0.1)',border:'var(--accent)',text:'var(--accent)',sym:'✓'},
      red:  {bg:'rgba(184,87,43,0.1)',border:'var(--warn)',text:'var(--warn)',sym:'✗'},
      grey: {bg:'var(--bg-2)',border:'var(--line)',text:'var(--ink-4)',sym:'—'}
    }[status];
    return `<div style="background:${C.bg};border:1px solid ${C.border};border-radius:var(--r-sm);padding:8px 10px;text-align:center;min-width:52px">
      <div style="font-size:10px;font-family:var(--mono);color:${C.text};font-weight:600;white-space:nowrap">${showTilde?'~':''}${label}</div>
      <div style="font-size:14px;color:${C.text};margin-top:2px;line-height:1">${C.sym}</div>
    </div>`;
  });
  let streak=0;
  for(const p of [...periods].reverse()){if(healthHistory[p.key]?.status==='green')streak++;else break;}
  const subText=lockedCount===0?'Compliance tracked from this period forward':
    streak>0?`${streak} period${streak!==1?'s':''} on track in a row`:
    `${greenCount} of ${lockedCount} period${lockedCount!==1?'s':''} within budget`;
  el.innerHTML=`<div style="background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:24px">
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px">
      <h3 style="font-family:var(--serif);font-size:18px;color:var(--ink)">Budget Track Record</h3>
      <span style="font-size:11px;color:var(--ink-4)">Last 12 periods</span>
    </div>
    <p style="font-size:12px;color:var(--ink-3);margin-bottom:16px">${subText} &nbsp;·&nbsp; <span style="opacity:0.7">~ = estimated against current budget</span></p>
    <div style="display:flex;flex-wrap:wrap;gap:8px">${badges.join('')}</div>
  </div>`;
}

function renderForecast(){
  if(curScr!=='insights')return;
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
  // All available past periods with data (up to 12) — used for quality + stdDev
  const allP=PAY_PERIOD.lastNPeriods(13).slice(1).reverse();
  const allPWithData=allP.filter(p=>txs.some(t=>t.date&&t.date>=p.start&&t.date<=p.end));
  const N=allPWithData.length;
  const allExpAmts=allPWithData.map(p=>txs.filter(t=>t.type==='expense'&&t.date>=p.start&&t.date<=p.end).reduce((s,t)=>s+t.amount,0));
  const meanExp=N?allExpAmts.reduce((s,v)=>s+v,0)/N:aE;
  const stdDevExp=N>=2?Math.sqrt(allExpAmts.reduce((s,v)=>s+Math.pow(v-meanExp,2),0)/N):0;
  const tG=goals.reduce((s,g)=>s+(g.monthly||0),0),surp=aI-aE-tG;
  document.getElementById('f-inc').textContent=RM(aI);
  document.getElementById('f-exp').textContent=RM(aE);
  const se=document.getElementById('f-surp');se.textContent=RM(Math.abs(surp));se.className=`text-2xl font-bold font-headline ${surp>=0?'text-primary':'text-tertiary'}`;
  const oT=goals.filter(g=>(g.monthly||0)<=Math.max(surp,0)).length;
  document.getElementById('f-goals').textContent=goals.length?`${oT} / ${goals.length}`:'— / —';
  // Quality pill
  const qEl=document.getElementById('ins-forecast-quality');
  if(qEl){
    let qColor,qBg,qText;
    if(N<3){qColor='var(--warn)';qBg='rgba(184,87,43,0.1)';qText=`Low confidence — ${N} period${N!==1?'s':''} of data. Forecasts improve after 3+.`;}
    else if(N<6){qColor='var(--ink-3)';qBg='rgba(107,101,89,0.1)';qText=`Moderate confidence — ${N} periods of data`;}
    else{qColor='var(--accent)';qBg='rgba(43,95,62,0.1)';qText=`High confidence — ${N} periods of data`;}
    qEl.innerHTML=`<span style="display:inline-flex;align-items:center;gap:6px;background:${qBg};color:${qColor};border-radius:99px;padding:4px 12px;font-size:12px;font-weight:500">${qText}</span>`;
  }
  // Range annotation
  const rangeEl=document.getElementById('f-range');
  if(rangeEl){
    if(N>=2&&stdDevExp>0){rangeEl.textContent=`Forecast range: ${RM(Math.max(0,aE-stdDevExp))} – ${RM(aE+stdDevExp)} / period`;rangeEl.style.display='';}
    else{rangeEl.style.display='none';}
  }
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
  // Open circles for forecast points, filled for actuals
  const ptBg=(col)=>[...Array(3).fill(col),...Array(3).fill('#fff')];
  if(fc)fChart=new Chart(fc,{type:'line',data:{labels:allLabels,datasets:[
    {label:'Income',  data:[...aInc,...fcData],borderColor:'#3525cd',backgroundColor:'rgba(53,37,205,0.07)',fill:true,tension:0.35,borderWidth:2,pointRadius:4,pointBackgroundColor:ptBg('#3525cd'),pointBorderColor:'#3525cd',pointBorderWidth:2,segment:{borderDash:ctx=>ctx.p0DataIndex>=2?[6,3]:undefined}},
    {label:'Expenses',data:[...aExp,...fcExp], borderColor:'#B8572B',backgroundColor:'rgba(184,87,43,0.07)',fill:true,tension:0.35,borderWidth:2,pointRadius:4,pointBackgroundColor:ptBg('#B8572B'),pointBorderColor:'#B8572B',pointBorderWidth:2,segment:{borderDash:ctx=>ctx.p0DataIndex>=2?[6,3]:undefined}},
    {label:'Savings', data:[...aSav,...fcSav], borderColor:'#58579b',backgroundColor:'transparent',fill:false,tension:0.35,borderWidth:2,pointRadius:4,pointBackgroundColor:ptBg('#58579b'),pointBorderColor:'#58579b',pointBorderWidth:2,segment:{borderDash:ctx=>ctx.p0DataIndex>=2?[6,3]:undefined}}
  ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{size:10,family:'Inter'},boxWidth:10,padding:10}},tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ${RM(ctx.parsed.y)}`}}},scales:{x:{grid:{display:false},ticks:{font:{size:10}}},y:{ticks:{callback:v=>'RM'+v.toLocaleString(),font:{size:10}},grid:{color:'rgba(0,0,0,0.04)'}}}}});
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
  renderRecurringUnbudgeted();
  renderBudgetTrackRecord();
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
  const el=document.getElementById('s-annotations');
  if(el){
    el.innerHTML=annotations.length
      ? annotations.map(a=>`<div class="flex items-center gap-3 px-4 py-3 bg-surface-container-low rounded-xl">
          <span class="material-symbols-outlined msym text-base text-primary">${a.icon||'more_horiz'}</span>
          <span class="text-xs text-slate-400 font-semibold flex-shrink-0">${fd(a.date)}</span>
          <span class="flex-1 text-sm font-medium text-slate-700 truncate">${a.label}</span>
          <button onclick="deleteAnnotation('${a.id}')" class="text-slate-300 hover:text-error transition-colors flex-shrink-0"><span class="material-symbols-outlined msym text-base">delete</span></button>
        </div>`).join('')
      : '<p class="text-xs text-slate-400">No life events added yet.</p>';
  }
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
  if(DEMO_MODE){showDemoToast();return;}
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
  if(DEMO_MODE){showDemoToast();return;}
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
function addAcct(){if(DEMO_MODE){showDemoToast();return;}const v=document.getElementById('s-nacct').value.trim();if(!v||ACCTS.includes(v))return;ACCTS.push(v);document.getElementById('s-nacct').value='';renderSettings();}
function delAcct(i){if(DEMO_MODE){showDemoToast();return;}ACCTS.splice(i,1);renderSettings();}
function addCat(){if(DEMO_MODE){showDemoToast();return;}const v=document.getElementById('s-ncat').value.trim();if(!v||CATS[sType][v]!==undefined)return;CATS[sType][v]=[];document.getElementById('s-ncat').value='';renderCatS();}
function delCat(c){if(DEMO_MODE){showDemoToast();return;}if(!confirm(`Delete "${c}"?`))return;delete CATS[sType][c];if(sCat===c)sCat=null;renderCatS();}
function addSub(){if(DEMO_MODE){showDemoToast();return;}if(!sCat)return;const v=document.getElementById('s-nsub').value.trim();if(!v)return;CATS[sType][sCat].push(v);document.getElementById('s-nsub').value='';renderCatS();}
function delSub(i){if(DEMO_MODE){showDemoToast();return;}if(!sCat)return;CATS[sType][sCat].splice(i,1);renderCatS();}

// ── Life Events ──────────────────────────────────────────────────
const LE_ICONS=['celebration','warning','work','favorite','flight','more_horiz'];
function selectLeIcon(icon){
  document.getElementById('le-icon').value=icon;
  LE_ICONS.forEach(ic=>{
    const btn=document.getElementById('le-ic-'+ic);
    if(!btn)return;
    if(ic===icon){btn.classList.add('border-2','border-primary','bg-primary-fixed','text-primary');btn.classList.remove('border','border-slate-200','bg-surface-container-low','text-slate-400');}
    else{btn.classList.remove('border-2','border-primary','bg-primary-fixed','text-primary');btn.classList.add('border','border-slate-200','bg-surface-container-low','text-slate-400');}
  });
}
async function saveAnnotation(){
  if(DEMO_MODE){showDemoToast();return;}
  const date=document.getElementById('le-date').value;
  const label=document.getElementById('le-label').value.trim();
  const icon=document.getElementById('le-icon').value||'celebration';
  if(!date||!label)return;
  if(uref){
    await uref.collection('annotations').add({date,label,icon,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
  }
  document.getElementById('le-date').value='';
  document.getElementById('le-label').value='';
  selectLeIcon('celebration');
}
async function deleteAnnotation(id){
  if(DEMO_MODE){showDemoToast();return;}
  if(uref)await uref.collection('annotations').doc(id).delete();
}

async function saveSettings(){
  if(DEMO_MODE){showDemoToast();return;}
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
// ── Theme ─────────────────────────────────────────────────────────
function initTheme(){
  const saved=localStorage.getItem('lumina-theme')||'';
  document.body.setAttribute('data-theme',saved);
  syncThemeBtns(saved);
}
function setTheme(val){
  document.body.setAttribute('data-theme',val);
  localStorage.setItem('lumina-theme',val);
  syncThemeBtns(val);
}
function syncThemeBtns(val){
  document.querySelectorAll('.theme-btn').forEach(b=>{
    const active=b.dataset.theme===val;
    b.style.background=active?'var(--accent)':'transparent';
    b.style.color=active?'#fff':'var(--ink-2)';
    b.style.borderColor=active?'var(--accent)':'var(--line)';
  });
}

document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('e-date').value=new Date().toISOString().slice(0,10);
  initTheme();
  initFirebase(); // defined in auth.js, loaded after this file
});
