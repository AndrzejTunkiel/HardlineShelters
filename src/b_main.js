/* ================= frame & routing ================= */
function frame(t){if(G&&WD){fitMap();if(G.phase==='build')drawBuild(t);else if(S&&UI.N)drawOps(t);}requestAnimationFrame(frame);}
cv.addEventListener('pointerdown',e=>{if(!G||UI.modal)return;const [x,y]=toMap(e);try{cv.setPointerCapture(e.pointerId);}catch(_){}G.phase==='build'?buildDown(x,y):opsDown(x,y);});
cv.addEventListener('pointermove',e=>{if(!G)return;const [x,y]=toMap(e);UI.mouse=[x,y];G.phase==='build'?buildMove(e,x,y):opsMove(e,x,y);});
cv.addEventListener('pointerup',e=>{if(!G)return;const [x,y]=toMap(e);G.phase==='build'?buildUp(x,y):opsUp(x,y);});
cv.addEventListener('pointerleave',()=>{UI.hover=null;UI.hoverLink=null;UI.hoverCell=null;$('#tip').hidden=true;});
$('#side').addEventListener('click',e=>G.phase==='build'?buildSideClick(e):opsSideClick(e));
$('#tabs').addEventListener('click',e=>{const t=e.target.closest('[data-tab]');if(!t)return;if(UI.tab===t.dataset.tab&&(t.dataset.tab==='shelter'||t.dataset.tab==='site'))UI.selLink=null;UI.tab=t.dataset.tab;refresh();});
$('#mailBtn').onclick=()=>openMail();
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
function newGame(seed){seed=seed||((Math.random()*1e9)|0);G={v:3,seed,phase:'build',build:{budget:18e6,sites:[],tunnels:[]},S:null};S=null;
  UI.sel=null;UI.selLink=null;UI.tab='site';UI.pick=null;genWorld(seed);refresh();}
function openTitle(){UI.modal={type:'title'};
  modal(`<div class="title-screen"><span class="lbl">Region 7 Civil Defense · Shelter Program · 1986</span><h1>HARDLINE</h1>
  <p>Region 7 has ${mil(18e6)} to build and stock fallout shelters for the towns on this map. You choose the sites, dig the shafts, furnish them and tunnel them together. Then you run them, through a war.</p>
  <ul class="evlist"><li>Click open ground to place up to six shelters. Roads appear automatically.</li><li>Sand is cheap to dig but needs heavy lining and protects poorly. Rock is expensive and strong. Press G or use the geology button to see where the sand is deep.</li>
  <li>In the designer, pick a top diameter. Lower floors can be narrower, never wider. Fill the bays with quarters, storage, tanks, filtration, scrubbers and generators.</li>
  <li>Dig tunnels between shelters and to Shelter Control. Deeper tunnels in rock survive the shock.</li><li>Commission when you are ready. Supplies go in with construction; what you build is what they will have.</li></ul>
  <button class="btn primary" id="tGo" type="button">Survey the region</button></div>`,720);
  $('#tGo').onclick=closeModal;}
function start(data){
  if(data&&data.G&&data.G.v===3){G=data.G;S=G.S;genWorld(G.seed);if(G.phase==='build')recomputeRoads();if(data.ui)Object.assign(UI,data.ui);refresh();}
  else{newGame();openTitle();}
  requestAnimationFrame(frame);if(document.fonts)document.fonts.load("600 12px 'IBM Plex Sans Condensed'").then(()=>{}).catch(()=>{});
}
window.claude?.hot?.snapshot?.(()=>({G,ui:{sel:UI.sel,tab:UI.tab,geo:UI.geo}}));
window.claude?.hot?.ready?window.claude.hot.ready(start):start(window.claude?.hot?.data??{});
