/* ================= frame & routing ================= */
function frame(t){if(G&&WD){fitMap();if(G.phase==='build')drawBuild(t);else if(S&&UI.N)drawOps(t);}requestAnimationFrame(frame);}
cv.addEventListener('pointerdown',e=>{if(!G||UI.modal)return;const [x,y]=toMap(e);try{cv.setPointerCapture(e.pointerId);}catch(_){}G.phase==='build'?buildDown(x,y):opsDown(x,y);});
cv.addEventListener('pointermove',e=>{if(!G)return;const [x,y]=toMap(e);UI.mouse=[x,y];G.phase==='build'?buildMove(e,x,y):opsMove(e,x,y);});
cv.addEventListener('pointerup',e=>{if(!G)return;const [x,y]=toMap(e);G.phase==='build'?buildUp(x,y):opsUp(x,y);});
cv.addEventListener('pointerleave',()=>{UI.hover=null;UI.hoverLink=null;UI.hoverCell=null;$('#tip').hidden=true;});
$('#side').addEventListener('click',e=>G.phase==='build'?buildSideClick(e):opsSideClick(e));
$('#tabs').addEventListener('click',e=>{const t=e.target.closest('[data-tab]');if(!t)return;if(UI.tab===t.dataset.tab&&(t.dataset.tab==='shelter'||t.dataset.tab==='site'))UI.selLink=null;UI.tab=t.dataset.tab;refresh();});
$('#mailBtn').onclick=()=>openMail();
$('#menuBtn').onclick=()=>{UI.modal={type:'confirm'};modal(`<h2>Leave this watch?</h2><p>${G.phase==='ops'&&!S.over?'The current mission will be abandoned.':'Return to the main menu.'}</p><div class="foot"><button class="btn" id="cNo" type="button">Stay</button><button class="btn primary" id="cYes" type="button">Main menu</button></div>`);$('#cNo').onclick=closeModal;$('#cYes').onclick=()=>{closeModal();openMenu();};};
$('#mainBtn').onclick=()=>{if(G.phase==='build'){openCommission();return;}if(S.over){openEnd();return;}endShift();refresh();};
document.addEventListener('keydown',e=>{
  if(!G||e.ctrlKey||e.metaKey||e.altKey)return;const m=UI.modal,tag=(e.target.tagName||'').toLowerCase();
  if(m&&m.type==='mail'){if(['ArrowDown','ArrowRight'].includes(e.key)){e.preventDefault();stepMail(1);return;}if(['ArrowUp','ArrowLeft'].includes(e.key)){e.preventDefault();stepMail(-1);return;}
    if(/^[1-3]$/.test(e.key)){const ms=S.mails.find(x=>x.id===m.id);if(ms.opts&&ms.resolved===null&&+e.key<=ms.opts.length){e.preventDefault();answerMail(ms,+e.key-1);}return;}}
  if(e.key==='Escape'){if(m&&!['end','title'].includes(m.type)){closeModal();return;}if(UI.pick){setPick(null);return;}if(UI.selLink!=null){UI.selLink=null;refresh();}return;}
  if(m||tag==='input'||tag==='select')return;
  if(G.phase==='ops'){if(e.key==='m'||e.key==='M')openMail();if(/^[0-6]$/.test(e.key)){const id=e.key==='0'?'CC':'S'+e.key;if(st(id)){UI.sel=id;UI.selLink=null;UI.tab='shelter';refresh();}}if(e.key==='t'||e.key==='T')openTransfer(UI.sel||'CC',null);}
  else{if(e.key==='g'||e.key==='G'){UI.geo=!UI.geo;renderHint();}if(e.key==='d'&&UI.sel&&UI.sel!=='CC')openDesigner(UI.sel);}
});

/* ================= chrome ================= */
function stat(n,lab,val){const el=$('#st'+n);el.hidden=!lab;if(lab){el.querySelector('.lbl').textContent=lab;el.querySelector('strong').innerHTML=val;}}
function renderBar(){
  const ph=$('#phase');
  if(G.phase==='build'){const b=buildTotals();let beds=0;for(const s of G.build.sites)beds+=siteStats(s).beds;
    ph.textContent='CONSTRUCTION';ph.className='phase';
    stat(1,'Program budget left',`<span class="${b.left<0?'neg':''}">${mil(b.left)}</span>`);stat(2,'Shelters',`${G.build.sites.length} / ${MAXSITES}`);stat(3,'Beds',num(beds));stat(4,'Tunnels',G.build.tunnels.length);
    $('#mailBtn').hidden=true;$('#mainBtn').textContent='Commission ▸';$('#mainBtn').disabled=false;return;}
  const h=6+S.shift*6;ph.textContent='SEALED';ph.className='phase war';
  stat(1,'Time',`${14+Math.floor(h/24)} NOV 86 · ${String(h%24).padStart(2,'0')}:00`);
  stat(2,'Relief convoy',S.over?'arrived':S.shift<3?'not yet sent':`in ${(S.relief-S.shift)*6} h`);
  const alive=ids().reduce((a,i)=>a+st(i).pop,0),dead=ids().reduce((a,i)=>a+st(i).dead,0);
  stat(3,'In the shelters',`${num(alive)}${dead?` <span class="neg">· ${num(dead)} dead</span>`:''}`);
  stat(4,'Tunnels working',`${S.links.filter(l=>l.ok).length} / ${S.links.length}`);
  const un=S.mails.filter(m=>!m.read),b=$('#mailBadge');$('#mailBtn').hidden=false;b.hidden=!un.length;b.textContent=un.length;b.className='badge'+(un.some(m=>m.flash)?' flash':'');
  $('#mainBtn').textContent=S.over?'Results':'End shift ▸';
}
function renderTabs(){const tabs=G.phase==='build'?buildTabs():[['shelter','Shelter'],['flows','Tunnels & flows'],['log','Log']];
  if(!tabs.some(([k])=>k===UI.tab))UI.tab=tabs[0][0];
  $('#tabs').innerHTML=tabs.map(([k,l])=>`<button class="tab" role="tab" data-tab="${k}" type="button" aria-selected="${k===UI.tab}">${l}</button>`).join('');}
function renderTicker(){const l=G.phase==='ops'?S.log.slice(-3).reverse():[];
  $('#ticker').innerHTML=G.phase==='build'?`<span class="dim">Program budget ${mil(G.build.budget)}. Excavation: sand ${money(COST.sandDig)}/m³ + lining ${money(COST.sandLine)}/m², rock ${money(COST.rockDig)}/m³ + ${money(COST.rockLine)}/m². Tunnels ${money(COST.tunSand)}/m in sand, ${money(COST.tunRock)}/m in rock.</span>`
    :l.length?l.map(([sh,t])=>`<span class="dim">${shortT(sh)}</span> ${esc(t)}`).join(' &nbsp;·&nbsp; '):'<span class="dim">Nothing logged yet.</span>';}
function refresh(){if(!G)return;if(G.phase==='ops')UI.N=compute();renderTabs();renderBar();renderHint();
  const sc=$('#side').scrollTop;$('#side').innerHTML=G.phase==='build'?buildSide():opsSide();$('#side').scrollTop=sc;if(G.phase==='ops'&&UI.tab==='flows')bindFlows();renderTicker();}

/* ================= game lifecycle ================= */
function newGame(seed,opts){seed=seed||((Math.random()*1e9)|0);G={v:3,seed,worldOpts:opts||null,phase:'build',build:{budget:18e6,sites:[],tunnels:[]},S:null};S=null;
  UI.sel=null;UI.selLink=null;UI.tab='site';UI.pick=null;genWorld(seed,opts);refresh();}
/* ---------------- campaign ----------------
   One hand-made region (SCENARIO) and a campaign that opens it shelter by
   shelter. Later missions add more shelters, a longer wait for relief, faster
   wear, more events per shift and new kinds of trouble (DECK tiers). */
const SCENARIO={seed:11,world:{cc:{x:80,y:45},towns:[{name:'HARLAN',x:31,y:21,pop:600},{name:'TESKE',x:91,y:18,pop:500},{name:'DUNMORE',x:128,y:66,pop:700},{name:'OSWIN',x:19,y:69,pop:500}]},
  sites:[
    {x:42,y:38,d0:16,floors:[16,16,16,16],mods:{BUNK:42,STORE:3,AIR:4,WATER:4,FILTER:2,FUEL:3,GEN:1},note:'Wide and shallow, sunk in 31 m of sand beside the Harlan lake. Roomy, close to town, and the weakest shaft in the region. One generator short.'},
    {x:62,y:13,d0:10,floors:[10,10,10,10,10,10,10,10,10,10],mods:{BUNK:23,STORE:4,AIR:2,WATER:1,FILTER:2,FUEL:3,GEN:2},note:'A narrow shaft blasted 44 m into the bare rock of the north ridge. Very hard to hurt. Only one water tank, but good filtration.'},
    {x:56,y:57,d0:14,floors:[14,14,14,14,14,14],mods:{BUNK:33,STORE:3,AIR:3,WATER:4,FILTER:1,FUEL:3,GEN:2},note:'On the shore of the big lake, in sand right down to the water table. Expect water where you do not want it.'},
    {x:120,y:42,d0:12,floors:[12,12,12,12,12,12,12],mods:{BUNK:30,STORE:3,AIR:3,WATER:3,FILTER:2,FUEL:3,GEN:2},note:'Sand over rock in the east woods. Middle of the road in every way.'},
    {x:113,y:59,d0:14,floors:[14,14,14,12,12,12,12],mods:{BUNK:38,STORE:3,AIR:3,WATER:3,FILTER:2,FUEL:1,GEN:2},note:'Thin soil over rock, next to Dunmore and its 700 people. It will fill first. The fuel bunker is smaller than it should be.'},
    {x:32,y:66,d0:12,floors:[12,12,12,12,12,12,10,10],mods:{BUNK:28,STORE:5,AIR:3,WATER:3,FILTER:1,FUEL:2,GEN:2},note:'Out past Oswin. Extra stores on hand, but every tunnel to it runs through sand.'},
  ],
  tunnels:[['CC','S2',24,'WAP'],['CC','S4',20,'WAP'],['CC','S5',20,'WAP'],['CC','S3',12,'WAP'],['CC','S1',16,'WP'],['S1','S6',12,'WA'],['S3','S6',16,'AP'],['S4','S5',24,'WA']]};
const MISSIONS=[
  {title:'First Watch',sites:['S5'],relief:[8,10],tier:1,wear:.6,ev:[.35,.85,1],pass:.8,
   brief:'Meridian, beside Dunmore, is the only shelter open tonight. One deep tunnel runs from it to you at Shelter Control. Learn the board: keep the air clean, the water flowing and the generator fed until relief comes.',
   learn:['Click Meridian to read its people, air, water, power, fuel and food.','Spend spare kits on overhauls before equipment fails.','Drag from Control to Meridian to send water, air or power down the tunnel.']},
  {title:'Two Doors',sites:['S4','S5'],relief:[12,15],tier:2,wear:.75,ev:[.25,.75,.97],pass:.8,
   brief:'Cedar Flats opens beside Meridian. Dunmore will crowd Meridian while Cedar Flats has room to spare. The tunnels between you are deep in rock.',
   learn:['New: aftershocks, generator damage, people at the hatch, more arrivals from town.','Move people: open a transfer, choose People, and walk them through the crawlway. Up to 80 a shift per tunnel.']},
  {title:'The Lake',sites:['S1','S3','S6'],relief:[15,18],tier:3,wear:.85,ev:[.15,.65,.93],pass:.75,
   brief:'The three western shelters were sunk in sand: cheap, crowded and fragile. The tunnels between them run through the same sand. Hollow Creek is a generator short.',
   learn:['New: groundwater floods, bad diesel, door seal failures, exhaust leaks.','New: total tunnel collapse. The crawlway is gone for good; some of the lines inside may survive.']},
  {title:'North Ridge',sites:['S1','S2','S4','S5'],relief:[18,22],tier:4,wear:.95,ev:[.1,.55,.88],pass:.7,
   brief:'Iron Ridge, 44 m down in rock, joins Hollow Creek, Cedar Flats and Meridian. The strong shelters will have to carry the weak ones.',
   learn:['New: dysentery, staff down with fever, spoiled rations, crushes on the stairs.']},
  {title:'Five Lights',sites:['S1','S2','S3','S4','S5'],relief:[20,25],tier:5,wear:1,ev:[.08,.5,.86],pass:.65,
   brief:'Five shelters and a long wait. Blackwater rejoins the net on its fragile lakeshore tunnel.',
   learn:['New: fallout plumes and convoy delays.']},
  {title:'Region 7',sites:['S1','S2','S3','S4','S5','S6'],relief:[22,30],tier:5,wear:1,ev:[.08,.5,.86],pass:.6,
   brief:'Every shelter in the region and everything that can go wrong. This is the watch the program was built for.',
   learn:['Everything from the earlier missions, all at once.']},
];
const SKIP_BUILD=true;
const PKEY='hardline.campaign.v1';let PROG_MEM={unlocked:0,best:{}};
function loadProg(){try{const v=JSON.parse(localStorage.getItem(PKEY)||'null');if(v&&typeof v==='object')return v;}catch(e){}return PROG_MEM;}
function saveResult(i,pct,passed){const p=loadProg();p.best=p.best||{};p.best[i]=Math.max(p.best[i]||0,pct);if(passed)p.unlocked=Math.max(p.unlocked||0,i+1);PROG_MEM=p;try{localStorage.setItem(PKEY,JSON.stringify(p));}catch(e){}}
function starsFor(i,pct,won=true){const M=MISSIONS[i];if(!won||pct<M.pass)return '<span class="stars">☆☆☆</span>';const n=pct>=.95?3:pct>=(M.pass+1)/2?2:1;return `<span class="stars">${'★'.repeat(n)}${'☆'.repeat(3-n)}</span>`;}
function missionRelief(){const r=G.mission!=null?MISSIONS[G.mission].relief:[22,30];return r[0]+Math.floor(rnd()*(r[1]-r[0]+1));}
function buildMission(sites){
  newGame(SCENARIO.seed,SCENARIO.world);
  SCENARIO.sites.forEach((d,slot)=>{const id='S'+(slot+1);if(!sites.includes(id))return;const s=newSite(d.x,d.y);
    s.slot=slot;s.id=id;s.name=SITE_NAMES[slot];s.warden=WARDENS[slot];s.d0=d.d0;s.floors=d.floors.slice();s.mods={...d.mods};s.note=d.note;G.build.sites.push(s);});
  G.build.sites.sort((a,b)=>a.slot-b.slot);recomputeRoads();
  const has=new Set(['CC',...sites]);
  for(const [a,b,depth,lines] of SCENARIO.tunnels)if(has.has(a)&&has.has(b))G.build.tunnels.push({a,b,depth,W:lines.includes('W'),A:lines.includes('A'),P:lines.includes('P')});
  clampTunnels();
}
function newScenario(){buildMission(MISSIONS[MISSIONS.length-1].sites);G.mission=MISSIONS.length-1;refresh();}
function startMission(i){buildMission(MISSIONS[i].sites);G.mission=i;UI.saved=false;refresh();openBriefing(i);}
function startFreeBuild(){newGame();G.mission=null;UI.saved=false;refresh();
  modal(`<div class="title-screen"><span class="lbl">Free build · random region</span><h1>HARDLINE</h1><p>${mil(18e6)} to build and stock up to six shelters. Click open ground to place one, then design its shaft, furnish it and dig tunnels. Commission when ready; the war starts at once.</p><button class="btn primary" id="tGo" type="button">Survey the region</button></div>`,720);
  UI.modal={type:'title'};$('#tGo').onclick=closeModal;}
function openMenu(){
  if(!G||G.phase!=='build'||G.build.sites.length){buildMission([]);G.mission=null;refresh();}
  UI.modal={type:'title'};const p=loadProg(),un=Math.min(p.unlocked||0,MISSIONS.length-1);
  const cards=MISSIONS.map((M,i)=>{const locked=i>un,best=p.best&&p.best[i]!=null?p.best[i]:null;
    return `<button class="mcard${locked?' locked':''}" data-m="${i}" type="button" ${locked?'disabled':''}>
      <span class="lbl">Mission ${i+1}${locked?' · locked':''}</span><b>${esc(M.title)}</b>
      <span class="dim">${M.sites.length} shelter${M.sites.length>1?'s':''} · relief in ${M.relief[0]*6/24<2?`${M.relief[0]*6}–${M.relief[1]*6} h`:`${(M.relief[0]*6/24).toFixed(1)}–${(M.relief[1]*6/24).toFixed(1)} days`}</span>
      <span class="mstat">${best!=null?`Best ${R0(best*100)}% ${starsFor(i,best)}`:locked?'Pass the mission before':'Not played'}</span></button>`;}).join('');
  modal(`<div class="title-screen"><span class="lbl">Region 7 Civil Defense · Shelter Control · November 1986</span><h1>HARDLINE</h1>
    <p>Six old missile silos around Shelter Control have been rebuilt as public fallout shelters. The campaign opens them one by one. Each mission is a single war: keep enough people alive until the relief convoy arrives.</p>
    <div class="mgrid">${cards}</div>
    <div class="row"><button class="btn" id="mFree" type="button">Free build on a random region</button><span class="dim" style="font-size:13px">Progress is saved in this browser.</span></div></div>`,920);
  document.querySelectorAll('.mcard[data-m]').forEach(b=>b.onclick=()=>{if(!b.disabled){closeModal();startMission(+b.dataset.m);}});
  $('#mFree').onclick=()=>{closeModal();startFreeBuild();};
}
function openBriefing(i){const M=MISSIONS[i];UI.modal={type:'title'};
  const rows=G.build.sites.map(s=>{const st=siteStats(s);return `<tr><td><b>${s.id} ${esc(s.name.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()))}</b><div class="dim" style="font-size:13px;max-width:52ch">${esc(s.note||'')}</div></td><td class="num">${st.beds}</td><td class="num">${st.roster}</td><td class="num">${st.depth} m</td><td class="num">${R0(st.prot*100)}%</td></tr>`;}).join('');
  modal(`<div class="title-screen"><span class="lbl">Mission ${i+1} of ${MISSIONS.length}</span><h2 style="font-size:28px">${esc(M.title)}</h2>
  <p>${esc(M.brief)}</p>
  <div class="kv" style="width:100%"><div><span class="lbl">Relief arrives</span><span class="v">after ${M.relief[0]}–${M.relief[1]} shifts</span></div><div><span class="lbl">To pass</span><span class="v">${R0(M.pass*100)}% alive</span></div><div><span class="lbl">Tunnels</span><span class="v">${G.build.tunnels.length}</span></div></div>
  <div style="overflow-x:auto;width:100%"><table class="res"><thead><tr><th>Shelter</th><th>Beds</th><th>Roster</th><th>Depth</th><th>Protection</th></tr></thead><tbody>${rows}</tbody></table></div>
  <ul class="evlist">${M.learn.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
  <div class="row" style="width:100%"><button class="btn" id="bBack" type="button">Main menu</button><button class="btn primary" id="tGo" type="button">Take the watch</button></div></div>`,820);
  $('#tGo').onclick=()=>commission();$('#bBack').onclick=()=>{closeModal();openMenu();};}
function openTitle(){openMenu();}
function start(data){
  if(data&&data.G&&data.G.v===3){G=data.G;S=G.S;genWorld(G.seed,G.worldOpts);if(G.phase==='build')recomputeRoads();if(data.ui)Object.assign(UI,data.ui);refresh();}
  else openMenu();
  requestAnimationFrame(frame);if(document.fonts)document.fonts.load("600 12px 'IBM Plex Sans Condensed'").then(()=>{}).catch(()=>{});
}
window.claude?.hot?.snapshot?.(()=>({G,ui:{sel:UI.sel,tab:UI.tab,geo:UI.geo}}));
window.claude?.hot?.ready?window.claude.hot.ready(start):start(window.claude?.hot?.data??{});
