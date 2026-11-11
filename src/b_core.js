/* ================= core ================= */
const $=s=>document.querySelector(s);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const R0=v=>Math.round(v);
const pad=(v,n)=>String(v).padStart(n);
const num=n=>Math.round(n).toLocaleString('en-US');
const money=n=>'$'+num(n);
const mil=n=>(n<0?'−':'')+'$'+(Math.abs(n)/1e6).toFixed(2)+'M';
const sgn=n=>(n>=0?'+':'−')+num(Math.abs(n));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const cap1=s=>s.charAt(0).toUpperCase()+s.slice(1).toLowerCase();
const rnd=()=>Math.random();
function mul(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const MW=160,MH=90,MPC=25,MAXSITES=6;
const WAR=0,RELIEF=12;
const UNIT={W:'L/shift',A:'CFM',P:'kW'},RNAME={W:'WATER',A:'AIR',P:'POWER'},LOSS={W:.98,A:.95,P:.97};
const CFM_PER_PERSON=5,WATER_PER_PERSON=3.5,FOOD_PER_PERSON=.25;
const COL={W:'#4a9be8',A:'#9df0e4',P:'#f2b33d',F:'#e8793c',FOOD:'#c9a46a'};
const DIM={W:'#24456b',A:'#3a6560',P:'#6a5222'};
const SITE_NAMES=['HOLLOW CREEK','IRON RIDGE','BLACKWATER','CEDAR FLATS','MERIDIAN','KESTREL'];
const WARDENS=['R. OKAFOR','M. VARGA','D. BRANDT','J. LINDQVIST','A. RUIZ','E. HADDAD'];
const TOWN_NAMES=['HARLAN','DUNMORE','ASHBY','CORVIN','PELL','MARROW','TESKE','OSWIN'];
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let G=null,WD=null,S=null;
const UI={sel:null,selLink:null,tab:'site',modal:null,drag:null,pick:null,hover:null,hoverLink:null,hoverCell:null,N:null,geo:false,mouse:null};

/* ================= world ================= */
const idx=(x,y)=>y*MW+x;
function makeNoise(seed){const r=mul(seed),P=new Float32Array(65536);for(let i=0;i<65536;i++)P[i]=r();const s=t=>t*t*(3-2*t);
  return (x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),u=s(x-xi),v=s(y-yi),h=(i,j)=>P[((i&255)<<8)|(j&255)];const a=h(xi,yi),b=h(xi+1,yi),c=h(xi,yi+1),d=h(xi+1,yi+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;};}
function fbm(n,x,y,o){let s=0,a=1,f=1,t=0;for(let i=0;i<o;i++){s+=a*n(x*f+i*17.3,y*f+i*9.1);t+=a;a*=.5;f*=2;}return s/t;}
class Heap{constructor(){this.a=[];}get size(){return this.a.length;}
  push(k,v){const a=this.a;a.push([k,v]);let i=a.length-1;while(i>0){const p=(i-1)>>1;if(a[p][0]<=a[i][0])break;[a[p],a[i]]=[a[i],a[p]];i=p;}}
  pop(){const a=this.a,top=a[0],last=a.pop();if(a.length){a[0]=last;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<a.length&&a[l][0]<a[m][0])m=l;if(r<a.length&&a[r][0]<a[m][0])m=r;if(m===i)break;[a[m],a[i]]=[a[i],a[m]];i=m;}}return top;}}
const D4=[[1,0],[-1,0],[0,1],[0,-1]];
const cellCost=i=>[14,1,2.2,3.5][WD.type[i]];
function dijkstra(start,isTarget){
  const N=MW*MH,dist=new Float64Array(N).fill(1e9),prev=new Int32Array(N).fill(-1),h=new Heap();dist[start]=0;h.push(0,start);
  while(h.size){const [d,i]=h.pop();if(d>dist[i])continue;
    if(i!==start&&isTarget(i)){const p=[];for(let k=i;k!==-1;k=prev[k])p.push(k);return p.reverse();}
    const x=i%MW,y=(i/MW)|0;
    for(const [dx,dy] of D4){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=MW||ny>=MH)continue;const j=idx(nx,ny);const nd=d+(WD.road[j]?.35:cellCost(j));if(nd<dist[j]){dist[j]=nd;prev[j]=i;h.push(nd,j);}}}
  return [start];
}
function genWorld(seed){
  const r=mul(seed),n1=makeNoise(seed+11),n2=makeNoise(seed+23),n3=makeNoise(seed+37);
  const N=MW*MH,elev=new Float32Array(N),moist=new Float32Array(N),sn=new Float32Array(N),sand=new Float32Array(N),type=new Uint8Array(N);
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const i=idx(x,y);elev[i]=fbm(n1,x/34,y/34,4);moist[i]=fbm(n2,x/20,y/20,3);sn[i]=fbm(n3,x/26,y/26,3);}
  const se=Array.from(elev).sort((a,b)=>a-b),wl=se[Math.floor(N*.14)],hl=se[Math.floor(N*.86)],emax=se[N-1];
  const ss=Array.from(sn).sort((a,b)=>a-b),s0=ss[Math.floor(N*.04)],s1=ss[Math.floor(N*.96)];
  for(let i=0;i<N;i++){const e=elev[i];type[i]=e<wl?0:e>hl?3:moist[i]>.56?2:1;
    let m=3+clamp((sn[i]-s0)/(s1-s0),0,1)*37;if(e>hl)m-=(e-hl)/(emax-hl)*34;sand[i]=type[i]===0?0:clamp(m,0,42);}
  const names=TOWN_NAMES.slice().sort(()=>r()-.5),towns=[];
  for(let k=0;k<6000&&towns.length<4;k++){const x=9+Math.floor(r()*(MW-18)),y=9+Math.floor(r()*(MH-18)),i=idx(x,y);
    if(type[i]===0||type[i]===3)continue;if(towns.some(t=>Math.hypot(t.x-x,t.y-y)<40))continue;
    towns.push({x,y,name:names[towns.length],pop:(3+Math.floor(r()*6))*100});}
  let cc=null;
  for(let rad=0;rad<70&&!cc;rad++)for(let dy=-rad;dy<=rad&&!cc;dy++)for(let dx=-rad;dx<=rad&&!cc;dx++){if(Math.max(Math.abs(dx),Math.abs(dy))!==rad)continue;
    const x=80+dx,y=45+dy;if(x<10||y<10||x>MW-11||y>MH-11)continue;const i=idx(x,y);if(type[i]===0||type[i]===3)continue;if(towns.some(t=>Math.hypot(t.x-x,t.y-y)<14))continue;cc={x,y};}
  WD={seed,elev,sand,type,towns,cc,wl,hl,road:new Uint8Array(N),base:null};
  WD.road[idx(cc.x,cc.y)]=1;
  const order=towns.slice().sort((a,b)=>Math.hypot(a.x-cc.x,a.y-cc.y)-Math.hypot(b.x-cc.x,b.y-cc.y));
  for(const t of order)dijkstra(idx(t.x,t.y),i=>WD.road[i]===1).forEach(i=>WD.road[i]=1);
  const far=order[order.length-1];
  dijkstra(idx(far.x,far.y),i=>{const x=i%MW,y=(i/MW)|0;return x===0||y===0||x===MW-1||y===MH-1;}).forEach(i=>WD.road[i]=1);
  WD.base=WD.road.slice();
  renderTerrain();recomputeRoads();
}
const sandAt=(x,y)=>WD.sand[idx(clamp(Math.round(x),0,MW-1),clamp(Math.round(y),0,MH-1))];
const TYPE_NAME=['Water','Grassland','Forest','Hills'];
function nearestTown(x,y){let best=null,bd=1e9;for(const t of WD.towns){const d=Math.hypot(t.x-x,t.y-y);if(d<bd){bd=d;best=t;}}return [best,bd];}

/* ---------------- terrain render ---------------- */
let TER=null,GEO=null,ROADS=null;
function renderTerrain(){
  const r=mul(WD.seed+99);
  TER=document.createElement('canvas');TER.width=640;TER.height=360;const t=TER.getContext('2d');
  GEO=document.createElement('canvas');GEO.width=640;GEO.height=360;const g2=GEO.getContext('2d');
  const P=(c,x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h);};
  const grass=['#4d7a3c','#52803f','#497537'];
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const i=idx(x,y),ty=WD.type[i],px=x*4,py=y*4,e=WD.elev[i];
    if(ty===0){P(t,px,py,4,4,'#2c5b97');const shore=D4.some(([dx,dy])=>{const nx=x+dx,ny=y+dy;return nx>=0&&ny>=0&&nx<MW&&ny<MH&&WD.type[idx(nx,ny)]!==0;});
      if(shore)P(t,px,py,4,4,'#36689f');if(r()<.12)P(t,px+((r()*3)|0),py+((r()*4)|0),2,1,'#5a8fcc');}
    else if(ty===1){P(t,px,py,4,4,grass[(r()*3)|0]);if(r()<.06)P(t,px+((r()*4)|0),py+((r()*4)|0),1,1,'#7aa556');}
    else if(ty===2){P(t,px,py,4,4,'#2f5530');P(t,px+((r()*2)|0),py,3,2,'#3f6e3a');P(t,px+1,py+2,1,2,'#1f3b23');}
    else{const band=Math.floor((e-WD.hl)*60)%2;P(t,px,py,4,4,band?'#7b6d4c':'#857655');if(WD.sand[i]<5&&r()<.5)P(t,px+((r()*3)|0),py+((r()*3)|0),2,2,'#9a9284');}
    // geology
    const sd=WD.sand[i];
    if(ty===0)P(g2,px,py,4,4,'#1d3352');
    else{const k=sd/42,c=sd<2?'#6a6874':`rgb(${R0(120+k*120)},${R0(118+k*96)},${R0(126-k*40)})`;P(g2,px,py,4,4,c);
      const b=Math.floor(sd/10);for(const [dx,dy] of [[1,0],[0,1]]){const nx=x+dx,ny=y+dy;if(nx<MW&&ny<MH&&WD.type[idx(nx,ny)]!==0&&Math.floor(WD.sand[idx(nx,ny)]/10)!==b)P(g2,dx?px+3:px,dy?py+3:py,dx?1:4,dy?1:4,'#3b3346');}}
  }
  for(const tw of WD.towns){const rr=mul(tw.x*131+tw.y);for(let k=0;k<14;k++){const hx=tw.x*4+R0((rr()-.5)*22),hy=tw.y*4+R0((rr()-.5)*16);
    for(const c of [t,g2]){P(c,hx,hy,4,3,'#d8c6a0');P(c,hx,hy,4,1,'#a2483a');P(c,hx+1,hy+2,1,1,'#3b2f2a');}}}
}
function renderRoads(){
  ROADS=document.createElement('canvas');ROADS.width=640;ROADS.height=360;const c=ROADS.getContext('2d');
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const i=idx(x,y);if(!WD.road[i])continue;const px=x*4,py=y*4;
    c.fillStyle=WD.type[i]===0?'#6e5c45':'#5e594f';c.fillRect(px,py,4,4);}
  c.fillStyle='#a39c8c';
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const i=idx(x,y);if(!WD.road[i])continue;const px=x*4,py=y*4;c.fillRect(px+1,py+1,2,2);
    if(x+1<MW&&WD.road[idx(x+1,y)])c.fillRect(px+2,py+1,4,2);if(y+1<MH&&WD.road[idx(x,y+1)])c.fillRect(px+1,py+2,2,4);}
}

/* ================= construction model ================= */
const MODS={
  BUNK:{name:'Living quarters',cost:4000,color:'#e8c48a',desc:'8 beds in triple bunks'},
  STORE:{name:'Storage',cost:6000,color:'#a0805a',desc:'1,500 person-days of food, 1 spares kit, 1 LiOH pallet'},
  AIR:{name:'Air scrubbers',cost:35000,color:'#9df0e4',desc:'700 CFM, enough for 140 people · 7 kW'},
  WATER:{name:'Water tank',cost:14000,color:'#4a9be8',desc:'8,000 L'},
  FILTER:{name:'Water filtration',cost:30000,color:'#2fb8c9',desc:'recycles 600 L a shift at half recovery · 6 kW'},
  FUEL:{name:'Fuel tank',cost:12000,color:'#e8793c',desc:'2,000 L diesel'},
  GEN:{name:'Generator',cost:45000,color:'#f2b33d',desc:'60 kW diesel genset'},
};
const MOD_ORDER=['BUNK','STORE','AIR','WATER','FILTER','FUEL','GEN'];
const DIAMS=[8,10,12,14,16,18,20];
const MAXFLOORS=20;
const baysFor=d=>Math.max(0,Math.floor((Math.PI*d*d/4-10)/10));
const floorTop=i=>4+4*i;
const shaftDepth=s=>s.id==='CC'?40:4+4*s.floors.length;
const COST={sandDig:60,rockDig:300,sandLine:450,rockLine:60,road:{0:48000,1:8000,2:12000,3:16000},tunSand:250,tunRock:520,conduit:60,portal:40000};
function sectionCost(d,top,sand){
  const hs=clamp(sand-top,0,4),hr=4-hs,area=Math.PI*d*d/4,per=Math.PI*d;
  const dig=area*(hs*COST.sandDig+hr*COST.rockDig),line=per*(hs*COST.sandLine+hr*COST.rockLine);
  return {dig:dig*(1+(top+2)/60),line:line*(1+(top+2)/60),hs,hr};
}
function siteSand(s){return s.id==='CC'?6:sandAt(s.x,s.y);}
function rosterFor(s,beds){let p=0;for(const t of WD.towns){const d=Math.hypot(t.x-s.x,t.y-s.y);p+=t.pop*Math.max(0,1-d/50);}
  const fill=clamp(.72+p/1400,.72,1.14);return {roster:R0(beds*fill),fill};}
function siteStats(s){
  const sand=siteSand(s),depth=shaftDepth(s);
  let bays=0,dig=0,line=0,sandM=0,rockM=0;
  const hc=sectionCost(s.d0,0,sand);dig+=hc.dig;line+=hc.line;
  s.floors.forEach((d,i)=>{bays+=baysFor(d);const c=sectionCost(d,floorTop(i),sand);dig+=c.dig;line+=c.line;sandM+=c.hs;rockM+=c.hr;});
  sandM+=hc.hs;rockM+=hc.hr;
  const m=s.mods,used=MOD_ORDER.reduce((a,k)=>a+m[k],0);
  const fit=MOD_ORDER.reduce((a,k)=>a+m[k]*MODS[k].cost,0),head=200000+s.d0*10000;
  const beds=m.BUNK*8,{roster,fill}=rosterFor(s,beds);
  const prot=clamp((rockM*1.4+sandM*.45)/70,0,.9);
  const load=15+.06*(roster+12)+m.AIR*7+4+m.FILTER*6,gcap=m.GEN*60;
  const people=roster+12,use=people*WATER_PER_PERSON,rec=Math.min(use,m.FILTER*600)*.5;
  const wcap=m.WATER*8000,fcap=m.FUEL*2000,food=m.STORE*1500;
  const burn=2*Math.min(load,gcap);
  const stock=wcap*.12+fcap*1.1+food*.8;
  return {sand,depth,bays,used,dig,line,fit,head,road:s.roadCost||0,stock,total:dig+line+fit+head+stock+(s.roadCost||0),beds,roster,fill,prot,
    scrub:m.AIR*700,need:people*CFM_PER_PERSON,load,gcap,use,rec,wcap,fcap,food,
    waterSh:(use-rec)>0?wcap/(use-rec):99,fuelSh:burn?fcap/burn:0,foodSh:people?food/(people*FOOD_PER_PERSON):0,sandM,rockM};
}
function tunnelStats(t){
  const A=siteById(t.a),B=siteById(t.b),dx=B.x-A.x,dy=B.y-A.y,cells=Math.hypot(dx,dy),len=cells*MPC;
  const n=Math.max(2,Math.ceil(cells*2));let inSand=0;const prof=[];
  for(let k=0;k<=n;k++){const sd=sandAt(A.x+dx*k/n,A.y+dy*k/n);prof.push(sd);if(t.depth<=sd)inSand++;}
  const sandFrac=inSand/(n+1),rockFrac=1-sandFrac;
  const per=(sandFrac*COST.tunSand+rockFrac*COST.tunRock)*(1+t.depth/100)+(t.W+t.A+t.P)*COST.conduit;
  const cost=len*per+2*COST.portal;
  const rel=clamp(.3+rockFrac*.45+t.depth/150,.2,.97);
  return {len,cost,rockFrac,sandFrac,rel,prof,maxDepth:Math.min(shaftDepth(A),shaftDepth(B))};
}
function siteById(id){return id==='CC'?{id:'CC',x:WD.cc.x,y:WD.cc.y,name:'SHELTER CONTROL',floors:[],d0:10}:G.build.sites.find(s=>s.id===id);}
function suggestMods(s,target){
  const m={BUNK:0,STORE:0,AIR:0,WATER:0,FILTER:0,FUEL:0,GEN:0};
  const bays=s.floors.reduce((a,d)=>a+baysFor(d),0);if(!bays)return m;
  for(let beds=Math.max(8,(target||9999));beds>=8;beds-=8){
    m.BUNK=Math.ceil(beds/8);const {roster}=rosterFor(s,m.BUNK*8),p=roster+12;
    m.AIR=Math.ceil(p*CFM_PER_PERSON*1.3/700);m.FILTER=Math.max(1,Math.round(p*WATER_PER_PERSON/600/2));
    m.WATER=Math.ceil(p*WATER_PER_PERSON*.6*20/8000);m.STORE=Math.ceil(p*FOOD_PER_PERSON*22/1500);
    const load=15+.06*p+m.AIR*7+4+m.FILTER*6;m.GEN=Math.ceil(load*1.15/60);m.FUEL=Math.ceil(2*load*16/2000);
    const used=MOD_ORDER.reduce((a,k)=>a+m[k],0);if(used<=bays)return m;
    if(target)target=0;
  }
  return m;
}
function recomputeRoads(){
  WD.road=WD.base.slice();
  if(G)for(const s of G.build.sites){const p=dijkstra(idx(s.x,s.y),i=>WD.road[i]===1);let c=0;
    p.forEach((i,k)=>{if(k<p.length-1)c+=COST.road[WD.type[i]];WD.road[i]=1;});s.roadCost=c;s.roadCells=p.length-1;}
  renderRoads();
}
function placeOk(x,y,ignore){
  if(x<7||y<9||x>MW-8||y>MH-9)return 'Too close to the edge of the survey area.';
  const i=idx(x,y);if(WD.type[i]===0)return 'You cannot sink a shaft in a lake.';
  for(const t of WD.towns)if(Math.hypot(t.x-x,t.y-y)<5)return `That is inside ${cap1(t.name)}.`;
  const others=[{x:WD.cc.x,y:WD.cc.y,id:'CC'},...G.build.sites.filter(s=>s.id!==ignore)];
  for(const o of others)if(Math.hypot(o.x-x,o.y-y)<17)return `Too close to ${o.id}. Shelters need about 400 m between them.`;
  return null;
}
function buildTotals(){let sites=0,tun=0;for(const s of G.build.sites)sites+=siteStats(s).total;for(const t of G.build.tunnels)tun+=tunnelStats(t).cost;return {sites,tun,total:sites+tun,left:G.build.budget-sites-tun};}
function clampTunnels(){for(const t of G.build.tunnels){const mx=tunnelStats(t).maxDepth;if(t.depth>mx)t.depth=Math.max(8,mx-(mx%4));}}
function siteWarnings(s){const st=siteStats(s),w=[];
  if(st.used>st.bays)w.push(['err',`${s.id}: ${st.used} modules need ${st.used-st.bays} more bays than the shaft has.`]);
  if(!s.mods.BUNK)w.push(['err',`${s.id}: no living quarters.`]);
  if(!s.mods.GEN)w.push(['err',`${s.id}: no generator. Nothing runs when the grid fails.`]);
  else if(st.gcap<st.load)w.push(['warn',`${s.id}: generators give ${st.gcap} kW for a ${R0(st.load)} kW load.`]);
  if(st.scrub<st.need)w.push(['warn',`${s.id}: scrubbers cover ${R0(st.scrub/st.need*100)}% of the air ${st.roster+12} people need.`]);
  if(!s.mods.FUEL)w.push(['warn',`${s.id}: no fuel tank.`]);
  if(!s.mods.WATER)w.push(['warn',`${s.id}: no water tank.`]);
  if(!s.mods.FILTER)w.push(['warn',`${s.id}: no water filtration; nothing is recycled.`]);
  if(!s.mods.STORE)w.push(['warn',`${s.id}: no storage; no food or spare parts on site.`]);
  if(!G.build.tunnels.some(t=>t.a===s.id||t.b===s.id))w.push(['warn',`${s.id}: no tunnel. It will be on its own.`]);
  return w;}
function allWarnings(){const w=[];if(!G.build.sites.length)w.push(['err','Place at least one shelter.']);
  for(const s of G.build.sites)w.push(...siteWarnings(s));
  const b=buildTotals();if(b.left<0)w.unshift(['err',`Over budget by ${mil(-b.left)}.`]);return w;}
function newSite(x,y){
  const n=G.build.sites.length,used=new Set(G.build.sites.map(s=>s.slot));let slot=0;while(used.has(slot))slot++;
  const s={id:'S'+(slot+1),slot,x,y,name:SITE_NAMES[slot],warden:WARDENS[slot],d0:12,floors:Array(6).fill(12),mods:null,roadCost:0};
  const sand=sandAt(x,y);if(sand>20){s.d0=14;s.floors=Array(4).fill(14).concat([12,12]);}
  s.mods=suggestMods(s,260);return s;
}
