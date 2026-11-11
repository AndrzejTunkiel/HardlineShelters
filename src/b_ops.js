/* ================= operations: model ================= */
const ids=()=>S.ids;
const st=id=>S.sites[id];
function opsSite(id,name,warden,o){return Object.assign({id,name,warden,staff:12,pop:12,cap:0,assigned:0,civ:0,water:0,wcap:0,air:96,fuel:0,fcap:0,gcap:0,baseKw:15,
  scrubCap:0,scrubBays:0,plantCap:0,filterBays:0,food:0,foodCap:0,gen:100,scrub:100,plant:100,hull:100,morale:75,spares:1,lioh:0,leak:0,dry:0,hungry:0,dead:0,busy:null,repair:null,lost:false,evac:false,prot:.3,d0:12,depth:40,x:0,y:0},o);}
function commission(){
  const sites={},q=v=>R0(clamp(v,0,100));
  sites.CC=opsSite('CC','SHELTER CTRL','YOU',{staff:60,pop:60,cap:80,assigned:15,scrubCap:600,scrubBays:1,plantCap:400,filterBays:1,gcap:200,baseKw:40,wcap:40000,water:40000,fcap:8000,fuel:8000,foodCap:3000,food:3000,prot:.7,depth:40,d0:10,spares:2,lioh:2,morale:80,x:WD.cc.x,y:WD.cc.y,sandM:0});
  for(const b of G.build.sites){const s=siteStats(b),m=b.mods;
    sites[b.id]=opsSite(b.id,b.name,'WARDEN '+b.warden,{cap:s.beds,assigned:s.roster,scrubCap:s.scrub,scrubBays:m.AIR,plantCap:m.FILTER*600,filterBays:m.FILTER,gcap:s.gcap,
      wcap:s.wcap,water:s.wcap,fcap:s.fcap,fuel:s.fcap,foodCap:s.food,food:s.food,prot:s.prot,depth:s.depth,d0:b.d0,sandM:s.sandM,
      gen:q(70+rnd()*30),scrub:q(68+rnd()*32),plant:q(60+rnd()*40),spares:1+m.STORE+(rnd()<.4?1:0),lioh:m.STORE?m.STORE+(rnd()<.5?1:0):0,x:b.x,y:b.y});}
  const order=['CC',...G.build.sites.map(s=>s.id)];
  const links=G.build.tunnels.map(t=>{const ts=tunnelStats(t);return {a:t.a,b:t.b,cap:{W:t.W?2000:0,A:t.A?600:0,P:t.P?60:0},hp:100,ok:true,rel:ts.rel,depth:t.depth,rock:ts.rockFrac,len:ts.len};});
  S=G.S={v:3,ids:order,shift:0,defcon:1,grid:true,relief:missionRelief(),tier:G.mission!=null?MISSIONS[G.mission].tier:5,wear:G.mission!=null?MISSIONS[G.mission].wear:1,evRate:G.mission!=null?MISSIONS[G.mission].ev:[.08,.5,.86],pmoved:{},over:null,sites,links,flows:[],orders:[],mails:[],log:[],events:[],flags:{},queue:[],deck:{},hist:[],stats:{cause:{},overhauls:0,lioh:0,repairs:0,events:0,flowsSet:0,taken:0,evacs:0,moved:{W:0,A:0,P:0},cuts:0},nextMail:1,nextOrder:1,nextFlow:1};
  G.phase='ops';UI.sel='CC';UI.selLink=null;UI.tab='shelter';UI.pick=null;
  ev('Shelters commissioned. Tanks full, staff of twelve at each site.',true);
  closeModal();fadeToWar();
}
let fadeT=[],warStarted=false;
function startWar(){if(warStarted)return;warStarted=true;S.events=[];attack();S.stats.cuts=S.links.filter(l=>!l.ok).length;record();for(const [at,k] of SCHED)if(at===0)scheduled(k);refresh();}
function fadeToWar(){
  const f=$('#fade'),sp=reduced?.35:1;warStarted=false;f.innerHTML='';f.hidden=false;void f.offsetWidth;f.classList.add('on');
  const at=(ms,fn)=>fadeT.push(setTimeout(fn,ms*sp));
  const line=(txt,cls)=>{const d=document.createElement('div');d.className='fl '+(cls||'');d.textContent=txt;f.appendChild(d);};
  const finish=()=>{fadeT.forEach(clearTimeout);fadeT=[];startWar();f.classList.remove('on');setTimeout(()=>{f.hidden=true;f.innerHTML='';openReport();},reduced?50:900);};
  at(1100,()=>line('12 NOV 1986 · SHELTERS COMMISSIONED'));
  at(2300,()=>line('TANKS FULL. STAFF ON STATION. THE DOORS STAY OPEN.','dim'));
  at(3800,()=>line('14 NOV 1986 · 05:52'));
  at(4800,()=>{line('SIRENS','red');alarm();});
  at(5600,startWar);
  at(7000,finish);
  f.onclick=finish;
}
const linkName=l=>l.a+'-'+l.b;
const passable=l=>l.ok&&!l.collapsed;
function findLink(x,y){return S.links.find(l=>(l.a===x&&l.b===y)||(l.a===y&&l.b===x));}
function bfs(from,to,ok){if(from===to)return null;const prev={[from]:null},q=[from];
  while(q.length){const n=q.shift();if(n===to)break;S.links.forEach((l,i)=>{if(!ok(i))return;const m=l.a===n?l.b:l.b===n?l.a:null;if(m&&!(m in prev)){prev[m]=[n,i];q.push(m);}});}
  if(!(to in prev))return null;const nodes=[to],links=[];for(let n=to;prev[n];n=prev[n][0]){links.unshift(prev[n][1]);nodes.unshift(prev[n][0]);}return {nodes,links};}
const staticRoute=(t,a,b)=>bfs(a,b,i=>S.links[i].ok&&S.links[i].hp>0&&S.links[i].cap[t]>0);
function dtg(sh){const h=6+sh*6,d=Math.floor(h/24),hh=h%24;return `D${d+1} ${14+d}NOV86 ${String(hh).padStart(2,'0')}00Z`;}
function shortT(sh){const h=6+sh*6,d=Math.floor(h/24),hh=h%24;return `D${d+1} ${String(hh).padStart(2,'0')}00`;}
const war=()=>S.shift>=WAR;
function loads(s){return {base:s.baseKw+.06*s.pop,scrub:s.scrubBays*7,plant:4+s.filterBays*6};}
function compute(){
  const N={},R=S.links.map(l=>{const h=l.ok?l.hp/100:0;const c={W:l.cap.W*h,A:l.cap.A*h,P:l.cap.P*h};return {cap:{...c},left:{...c}};});
  for(const id of ids()){const s=st(id),dead=s.lost||s.evac,L=loads(s);const gen=dead||S.grid?0:(s.fuel>0&&s.gen>0?s.gcap*s.gen/100:0);
    N[id]={s,dead,L,load:L.base+L.scrub+L.plant,gen,pin:0,pout:0,ain:0,aout:0,win:0,wout:0};}
  const run=(t,f,availFn,extraCap)=>{f.actual=0;f.got=0;f.via='';f.note='';const a=N[f.from],b=N[f.to];
    if(!a||!b||a.dead||b.dead){f.note='SITE DARK';return 0;}
    if(S.grid&&t!=='W'){f.note='STANDBY';const r=staticRoute(t,f.from,f.to);f.via=r?r.nodes.join('-'):'';return 0;}
    const r=bfs(f.from,f.to,i=>R[i].left[t]>=1);if(!r){f.note=staticRoute(t,f.from,f.to)?'LINES FULL':'NO ROUTE';return 0;}
    const neck=Math.min(...r.links.map(i=>R[i].left[t])),amt=Math.floor(Math.min(f.amt,neck,Math.max(0,availFn(a)),extraCap(a,neck)));f.via=r.nodes.join('-');
    if(amt<=0){f.note='NO SUPPLY';return 0;}
    r.links.forEach((i,k)=>{R[i].left[t]-=amt;const fwd=S.links[i].a===r.nodes[k];R[i][(fwd?'fw':'bw')+t]=true;});
    f.actual=amt;f.got=Math.floor(amt*Math.pow(LOSS[t],r.links.length));f.note=amt<f.amt?(amt>=neck?'CAPPED BY LINE':'PARTIAL'):'LIVE';return f.got;};
  for(const f of S.flows.filter(f=>f.type==='P')){const got=run('P',f,a=>a.gen-a.pout,()=>1e9);if(N[f.from])N[f.from].pout+=f.actual;if(N[f.to])N[f.to].pin+=got;}
  for(const id of ids()){const n=N[id],s=n.s,L=n.L;
    if(n.dead)Object.assign(n,{avail:0,baseF:0,scrubF:0,plantF:0,used:0,burn:0,bal:0,genUsed:0});
    else if(S.grid)Object.assign(n,{avail:n.load,baseF:1,scrubF:1,plantF:1,used:n.load,burn:0,bal:0,genUsed:0});
    else{let a=Math.max(0,n.gen-n.pout)+n.pin;n.avail=a;n.baseF=Math.min(1,a/L.base);a=Math.max(0,a-L.base);
      n.scrubF=L.scrub?Math.min(1,a/L.scrub):0;a=Math.max(0,a-L.scrub*n.scrubF);n.plantF=Math.min(1,a/L.plant);
      n.used=n.baseF*L.base+n.scrubF*L.scrub+n.plantF*L.plant;n.genUsed=Math.max(0,Math.min(n.gen,n.used+n.pout-n.pin));n.burn=R0(2*n.genUsed);n.bal=n.avail-n.load;}
    n.scrubOut=s.scrubCap*s.scrub/100*n.scrubF;n.need=s.pop*CFM_PER_PERSON;}
  for(const f of S.flows.filter(f=>f.type==='A')){const got=run('A',f,a=>a.scrubOut-a.aout,()=>1e9);if(N[f.from])N[f.from].aout+=f.actual;if(N[f.to])N[f.to].ain+=got;}
  for(const id of ids()){const n=N[id],s=n.s;n.supply=n.scrubOut-n.aout+n.ain;const r=n.need>0?(n.supply-n.need)/n.need:1;
    n.airDelta=war()?clamp(r*40,-25,6)-(s.hull<50?3:0):(96-s.air)*.5;
    n.use=war()?s.pop*WATER_PER_PERSON:0;n.rec=Math.min(n.use,s.plantCap)*.5*s.plant/100*n.plantF;n.recPct=n.use?n.rec/n.use:0;
    n.foodUse=war()?s.pop*FOOD_PER_PERSON:0;}
  for(const f of S.flows.filter(f=>f.type==='W')){const got=run('W',f,a=>a.s.water-a.wout,(a,neck)=>neck*a.plantF);if(N[f.from])N[f.from].wout+=f.actual;if(N[f.to])N[f.to].win+=got;}
  for(const id of ids()){const n=N[id],s=n.s;n.wnet=n.win-n.wout-(war()?n.use-n.rec+s.leak:0);}
  N._R=R;return N;
}
function siteStatus(s,n){if(s.evac)return 'EVAC';if(s.lost)return 'DARK';n=n||compute()[s.id];
  const sh=n.wnet<0?s.water/-n.wnet:99;
  if(s.air<50||(war()&&sh<2)||n.baseF<1||s.hull<40||(war()&&s.food<=0))return 'CRIT';
  if(s.air<72||(war()&&sh<5)||n.scrubF<1||n.plantF<1||s.hull<70||s.gen<30||s.scrub<30||s.plant<30||s.pop>s.cap||(war()&&n.supply<n.need)||(war()&&s.food<n.foodUse*4))return 'WARN';
  return 'OK';}

/* ---------------- mail ---------------- */
const FROM={HQ:['REGION 7 CIVIL DEFENSE','DIR. T. HOLLIS'],DEPOT:['DEPOT 12 LOGISTICS','SGT. P. ABARA'],WIRE:['PRESS WIRE (RELAY)',''],SYS:['SHELTERNET AUTO',''],ENG:['CC ENGINEERING','CHIEF ENG. K. DOSS']};
function fromName(f){return S.sites[f]?`${f} ${S.sites[f].name}`:FROM[f][0];}
function fromFull(f){return S.sites[f]?`${f} ${S.sites[f].name} / ${S.sites[f].warden}`:FROM[f][0]+(FROM[f][1]?' / '+FROM[f][1]:'');}
function send(m){const mail={id:S.nextMail++,shift:S.shift,from:m.from,subj:m.subj,body:m.body,key:m.key||null,p:m.p||{},opts:m.opts||null,read:false,resolved:null,reply:null,flash:!!m.flash};S.mails.push(mail);return mail;}
const shelters=()=>ids().filter(i=>i!=='CC');
const liveShelters=()=>shelters().filter(i=>!st(i).lost&&!st(i).evac);
const neighbors=id=>S.links.filter(l=>l.a===id||l.b===id).map(l=>l.a===id?l.b:l.a);
const sig=id=>`- ${st(id).warden}, ${st(id).name}`;
const kits=n=>`${n} kit${n===1?'':'s'}`;
function sealedProj(id){const s=st(id),p=s.staff+s.assigned,L=15+.06*p+s.scrubBays*7+4+s.filterBays*6,use=p*WATER_PER_PERSON,rec=Math.min(use,s.plantCap)*.5*s.plant/100;
  return {p,air:s.scrubCap*s.scrub/100/(p*CFM_PER_PERSON),pow:s.gcap*s.gen/100-L,water:(use-rec)>0?s.water/(use-rec):99,fuel:s.fuel/(2*Math.min(L,s.gcap*s.gen/100)||1),food:s.food/(p*FOOD_PER_PERSON)};}
const MAILS={
  welcome:()=>{const beds=shelters().reduce((a,i)=>a+st(i).cap,0),ros=ids().reduce((a,i)=>a+st(i).assigned+st(i).staff,0);return {from:'HQ',subj:'SHELTERS COMMISSIONED',body:`Controller,

The Region 7 shelter network is commissioned: ${shelters().length} shelter${shelters().length===1?'':'s'} with ${num(beds)} beds and ${S.links.length} tunnel${S.links.length===1?'':'s'}. Each site has a staff of twelve. If the sirens sound, about ${num(ros)} people from ${WD.towns.map(t=>cap1(t.name)).join(', ')} will come down the elevators and stay until relief comes.

Tanks are about half full. Use the time you have:
  - Order fuel, water, food and parts from Depot 12 in each shelter's panel.
  - Overhaul anything that came out of commissioning in poor shape.
  - Drag from one shelter to another to set up water, air or power flows.
  - End the shift when the board is squared away. Six hours pass.
- DIR. T. HOLLIS, REGION 7 CIVIL DEFENSE`};},
  defgen:p=>{const s=st(p.s);return {from:p.s,subj:'GENERATOR RUNNING ROUGH',opts:[`Order a spares kit for ${cap1(s.name)} ($3,200)`,'Deny. Nurse it along'],body:`Control,

Our new genset surges under load and throws soot. Commissioning left it at ${R0(s.gen)}%, about ${R0(s.gcap*s.gen/100)} kW. We hold ${kits(s.spares)}, and I would rather keep it for the day something else breaks.

Requesting one more maintenance kit.
${sig(p.s)}`};},
  defscrub:p=>{const s=st(p.s),pr=sealedProj(p.s);return {from:p.s,subj:'SCRUBBERS UNDER RATING',opts:[`Order a spares kit for ${cap1(s.name)} ($3,200)`,`Order LiOH canisters for ${cap1(s.name)} ($1,800)`,'Tell them to wait'],body:`Control,

The scrubber bank came in at ${R0(s.scrub)}% on acceptance test. It delivers ${num(s.scrubCap*s.scrub/100)} CFM. Sealed, with ${pr.p} people on our roster, we will need ${num(pr.p*CFM_PER_PERSON)}.

Send a kit or send LiOH. Something, before the snow does.
${sig(p.s)}`};},
  defplant:p=>{const s=st(p.s);return {from:p.s,subj:'WATER PLANT AT '+R0(s.plant)+'%',body:`Control,

Our water filtration plant tested at ${R0(s.plant)}%. A healthy plant gets half of the used water back; ours would recover a fraction of that. We have ${kits(s.spares)} and can overhaul it ourselves; it takes the staff a full shift.
${sig(p.s)}`};},
  review:()=>{const lines=shelters().map(id=>{const s=st(id),r=sealedProj(id);return `${id} ${s.name}: air ${R0(r.air*100)}% of need, power ${r.pow>=0?'+':''}${R0(r.pow)} kW, water ${r.water>=99?'plenty':Math.floor(r.water)+' shifts'}, fuel ${Math.floor(r.fuel)} shifts, food ${Math.floor(r.food)} shifts.`;});
    const weak=shelters().map(id=>[id,sealedProj(id)]).sort((a,b)=>Math.min(a[1].water,a[1].fuel,a[1].food)-Math.min(b[1].water,b[1].fuel,b[1].food))[0];
    return {from:'ENG',subj:'COMMISSIONING REVIEW',body:`Controller,

Here is how each shelter stands if it sealed tonight with its whole roster inside and the tanks as they are now:

${lines.join('\n')}

Relief is planned for twelve shifts after the sirens.${weak?` ${weak[0]} is the thinnest. Orders arrive in two or three shifts; a standing flow through the tunnels works from today.`:''}

Every tunnel line has a rated capacity: 2,000 L of water a shift, 600 CFM of air, 60 kW of power. Flows share it.
- CHIEF ENG. K. DOSS`};},
  depot:()=>({from:'DEPOT',subj:'CONVOY SCHEDULE',body:`SHELTER CONTROL,

Depot 12 runs a convoy every shift while the roads are open.

  DSL   diesel fuel, 2,000 L ............ $2,400   2 shifts
  H2O   water tanker, 10,000 L .......... $1,500   2 shifts
  FOOD  rations, 3,000 person-days ....... $2,000   2 shifts
  KIT   maintenance spares kit .......... $3,200   3 shifts
  LIOH  lithium hydroxide pallet ........ $1,800   2 shifts

Order from the Depot 12 section of each shelter's panel. Tanks cannot hold more than they were built for. Anything still on the road at DEFCON 1 gets recalled.
- SGT. P. ABARA, DEPOT 12`}),
  wire1:()=>({from:'WIRE',subj:'GENEVA TALKS SUSPENDED',body:`GENEVA (AP) -- Arms talks were suspended tonight after both delegations walked out of the morning session. Each side blamed the other for a collision between naval vessels on Tuesday.\n\nMarkets in Tokyo opened sharply lower.`}),
  defcon4:()=>({from:'HQ',subj:'DEFCON 4',body:`ALL SHELTERS,\n\nNational readiness is at DEFCON 4. No change to routine. Clear your maintenance backlog while it is quiet.\n- DIR. T. HOLLIS`}),
  fuel:p=>{const s=st(p.s),r=sealedProj(p.s);return {from:p.s,subj:'FUEL, OR LACK THEREOF',opts:[`Order 2 x diesel for ${cap1(s.name)} ($4,800)`,`Order 1 x diesel ($2,400)`,'Hold. The grid will stay up'],body:`Control,

${cap1(s.name)} holds ${num(s.fuel)} L of diesel in ${num(s.fcap)} L of tankage. Off grid, with our roster inside, that is about ${Math.floor(r.fuel)} shifts of generator time.

Please order us fuel while the depot still answers.
${sig(p.s)}`};},
  defcon3:()=>({from:'HQ',subj:'DEFCON 3',body:`ALL SHELTERS,\n\nDEFCON 3. Top off consumables. Bring all plant to full serviceability. Depot 12 stops taking orders at DEFCON 2.\n\nOnce the depot closes, the tunnels are all you have.\n- DIR. T. HOLLIS`}),
  drill:p=>({from:p.a,subj:'INTAKE DRILL',opts:['Approve the joint intake drill','Deny. Keep staff on maintenance'],body:`Control,

${st(p.b).warden} at ${cap1(st(p.b).name)} has never run an intake for real, and neither has most of my staff.

Request permission to run a joint intake drill with ${p.b}: volunteers from town, down the elevators, blast doors shut. It costs both sites their work slot this shift. If the day comes, doors that close fast are worth more than anything in a parts bin.
${sig(p.a)}`}),
  defcon2:()=>({from:'HQ',subj:'DEFCON 2 - DEPOT CLOSED',body:`ALL SHELTERS,\n\nDEFCON 2. Depot 12 is closed to new orders. Convoys already on the road will try to finish their runs.\n\nIntake rosters are posted in every town. If the sirens sound, open the doors and take your people in.\n- DIR. T. HOLLIS`}),
  wire2:()=>({from:'WIRE',subj:'CIVIL DEFENSE',body:`WASHINGTON (AP) -- Civil defense sirens sounded in several states today. Officials described it as a test. Traffic leaving three cities was reported heavy into the evening.`}),
  flash:()=>({from:'HQ',subj:'FLASH - DEFCON 1',flash:true,body:`FLASH FLASH FLASH

ALL SHELTERS. DEFCON 1. SIRENS SOUNDING REGIONWIDE.
DETONATIONS REPORTED IN SECTOR. COMMERCIAL POWER LOST. ALL SITES ON GENERATOR.

OPEN YOUR DOORS. TAKE IN YOUR ROSTERS. SEAL WHEN FULL OR WHEN ORDERED.
RELIEF WILL BE SENT WHEN THE ROADS ARE PASSABLE.
- REGION 7`}),
  hit:p=>{const s=st(p.s),cut=S.links.filter(l=>!l.ok&&(l.a===p.s||l.b===p.s)).map(linkName);return {from:p.s,subj:'WE GOT HIT',body:`Control,

Near miss topside during intake. ${p.drill?'The doors were shut in forty seconds; the drill paid for itself.':'It took four minutes to get the doors shut with people still on the stairs.'} Hull integrity ${R0(s.hull)}%. ${s.prot<.4?'The shaft is mostly in sand and the lining cracked in two places.':'The rock held; the lining did not.'}

The main water tank split along a weld. We are at ${num(s.water)} L and losing it to the floor.${cut.length?` Tunnel${cut.length>1?'s':''} ${cut.join(', ')} severed.`:''}

We have ${s.pop} people inside.
${sig(p.s)}`};},
  fire:p=>({from:p.s,subj:'FIRE IN CABLE VAULT - OUT',body:`Control,\n\nCable vault fire, now out. Air took a beating: ${R0(st(p.s).air)}%. If anyone has scrubbed air to spare, we would take it.\n${sig(p.s)}`}),
  survey:()=>{const cut=S.links.filter(l=>!l.ok),dmg=S.links.filter(l=>l.ok&&l.hp<100);return {from:'ENG',subj:'TUNNEL SURVEY',body:`Controller,

Survey of the tunnels after the shock.
Severed: ${cut.map(l=>`${linkName(l)} (${R0(l.rock*100)}% rock, ${l.depth} m deep)`).join(', ')||'none'}.
Damaged: ${dmg.map(l=>`${linkName(l)} at ${l.hp}%`).join(', ')||'none'}.
Intact: ${S.links.filter(l=>l.ok&&l.hp>=100).map(linkName).join(', ')||'none'}.

${cut.length||dmg.length?'A crew from either end can repair a line with a spares kit: two shifts for a cut, one for damage. Click the line on the map.':'Every line came through. Whoever chose those depths earned their pay.'}
- CHIEF ENG. K. DOSS`};},
  depotcancel:()=>({from:'DEPOT',subj:'CONVOYS RECALLED',body:`SHELTER CONTROL,\n\nAll convoys recalled at DEFCON 1. These orders will not arrive:\n\n${S.flags.cancelled||''}\nCharges reversed.\n- SGT. P. ABARA, DEPOT 12`}),
  intake:()=>({from:'SYS',subj:'INTAKE COMPLETE',body:`Intake complete. Shelter population:\n\n${ids().map(i=>`  ${i} ${st(i).name}: ${st(i).pop} on ${st(i).cap} beds${st(i).pop>st(i).cap?' (OVER CAPACITY)':''}`).join('\n')}\n\n  TOTAL ${num(ids().reduce((a,i)=>a+st(i).pop,0))}`}),
  vent:p=>{const s=st(p.s);return {from:p.s,subj:'SCRUBBER DAMAGE / VENT PURGE',opts:['Authorize a vent purge','Deny. Stay sealed'],body:`Control,

The shock cracked the scrubber housing; it runs at ${R0(s.scrub)}%. ${s.pop} people in here.

I can run a vent purge: ten minutes of surface air through the HEPA bank. About 20 points of air quality. It also pulls fallout into the intake room, and everyone in here knows it.

Alternatives: overhaul the scrubbers with a kit, or an air flow from a neighbor.
${sig(p.s)}`};},
  genloss:p=>{const s=st(p.s);return {from:p.s,subj:'LOST PRIMARY GEN',body:`Control,

Second shock. Our generator plant is at ${R0(s.gen)}%: ${R0(s.gcap*s.gen/100)} kW against ${R0(loads(s).base+loads(s).scrub+loads(s).plant)} kW of load.${p.cut?` The ${p.cut} line went with it.`:''}

We hold ${kits(s.spares)} and ${s.lioh} LiOH pallet${s.lioh===1?'':'s'}. A power flow from a neighbor would carry us.
${sig(p.s)}`};},
  relief:()=>({from:'HQ',subj:'RELIEF CONVOY',body:`ALL SHELTERS,\n\nA relief convoy is forming at Depot 12 under armored escort. ETA ${dtg(S.relief)}.\n\nThat is ${(S.relief-S.shift)*6} hours, if the roads hold. Hold until then.\n- DIR. T. HOLLIS`}),
  evac:p=>{const s=st(p.s),t=st(p.to);return {from:p.s,subj:'REQUEST TO EVACUATE',opts:[`Approve. Move everyone to ${cap1(t.name)}`,`Deny. Hold ${cap1(s.name)}`],body:`Control,

Air is ${R0(s.air)}% and water ${num(s.water)} L. We have ${s.pop} people and the old ones are struggling.

The ${p.s}-${p.to} tunnel still holds. Request permission to move everyone through to ${cap1(t.name)}. They have ${t.pop} people on ${t.cap} beds and would be taking ${s.pop} more.

I know what I am asking.
${sig(p.s)}`};},
  hold:p=>({from:p.s,subj:'HOLDING',body:`Control,\n\n${cap1(st(p.s).name)} is holding. Water ${num(st(p.s).water)} L, air ${R0(st(p.s).air)}%. The kids are running a card tournament by flashlight.\n\nThank you for not forgetting us.\n${sig(p.s)}`}),
  guests:p=>({from:p.to,subj:'GUESTS',body:`Control,\n\n${cap1(st(p.s).name)} came through the tunnel at 0340. We are ${st(p.to).pop} people on ${st(p.to).cap} beds. Air and water will drain faster now. Plan for it.\n${sig(p.to)}`}),
  hatch:p=>{const s=st(p.s);return {from:p.s,subj:'SURFACE HATCH',opts:[`Open the hatch (+${p.n} people)`,'Keep the hatch sealed'],body:`Control,

There are about ${p.n} people at the surface hatch. A school bus from ${cap1(p.town)}, two teachers, a road crew. They are not on our roster. They walked the last six miles.

We have ${s.pop} people on ${s.cap} beds. Opening means a decon cycle, fallout in the entry, and ${num(p.n*CFM_PER_PERSON)} more CFM of air and ${num(p.n*WATER_PER_PERSON)} more litres of water every shift.

I need an answer, Control. They can see the camera.
${sig(p.s)}`};},
  hatchopen:p=>({from:p.s,subj:'RE: SURFACE HATCH',body:`Control,\n\nThey are inside and through decon. The children are sleeping in the generator gallery because it is warm. One of the teachers asked me who decides who comes in. I said you did.\n${sig(p.s)}`}),
  hatchshut:p=>({from:p.s,subj:'RE: SURFACE HATCH',body:`Control,\n\nHatch stays sealed. They stayed at the camera for two hours, then walked north.\n\nThe people in here watched it on the monitor. It is very quiet.\n${sig(p.s)}`}),
  update18:()=>({from:'HQ',subj:'CONVOY POSITION',body:`ALL SHELTERS,\n\nRelief convoy is at the river crossing. ${(S.relief-S.shift)*6} hours out.\n- DIR. T. HOLLIS`}),
};
function sendKey(k,p={}){const m=MAILS[k](p);return send({...m,key:k,p});}
const SCHED=[[0,'flash'],[0,'hit'],[0,'fire'],[1,'intake'],[1,'survey'],[3,'relief']];
const SCHED_OLD=[
  [9,'flash'],[9,'hit'],[9,'fire'],[10,'intake'],[10,'survey'],[10,'vent'],[11,'genloss'],[12,'relief'],[14,'evac'],[15,'hatch'],[18,'update18']];
function scheduled(k){const D=S.flags.defects||[],F=S.flags;
  const ok=id=>id&&st(id)&&!st(id).lost&&!st(id).evac;
  switch(k){
    case 'defgen':if(ok(D[0]))sendKey(k,{s:D[0]});return;
    case 'defscrub':if(ok(D[1])&&st(D[1]).scrub<100)sendKey(k,{s:D[1]});return;
    case 'defplant':if(ok(D[2])&&st(D[2]).plant<100)sendKey(k,{s:D[2]});return;
    case 'review':if(shelters().length)sendKey(k);return;
    case 'fuel':{const c=liveShelters().filter(i=>st(i).gcap).sort((a,b)=>sealedProj(a).fuel-sealedProj(b).fuel)[0];if(c)sendKey(k,{s:c});return;}
    case 'drill':{const l=S.links.find(l=>l.a!=='CC'&&l.b!=='CC');if(l)sendKey(k,{a:l.a,b:l.b});return;}
    case 'hit':if(ok(F.hit))sendKey(k,{s:F.hit,drill:F.drill&&F.drill.includes(F.hit)});return;
    case 'fire':if(ok(F.fire))sendKey(k,{s:F.fire});return;
    case 'survey':if(S.links.length)sendKey(k);return;
    case 'vent':if(ok(F.shock))sendKey(k,{s:F.shock});return;
    case 'genloss':if(ok(F.genloss))sendKey(k,{s:F.genloss,cut:F.genlossCut});return;
    case 'evac':{const c=liveShelters().map(id=>{const n=compute()[id];return [id,st(id).air+(n.wnet<0?Math.min(40,st(id).water/-n.wnet*4):40)];}).sort((a,b)=>a[1]-b[1]);
      for(const [id,score] of c){if(score>110)break;const to=neighbors(id).find(x=>{const l=findLink(id,x);return passable(l)&&x!=='CC'&&!st(x).lost&&!st(x).evac&&st(x).pop<st(x).cap*1.25;});
        if(to){sendKey('evac',{s:id,to});return;}}
      const h=liveShelters()[0];if(h)sendKey('hold',{s:h});return;}
    case 'hatch':{const c=liveShelters().map(id=>{const [t,d]=nearestTown(st(id).x,st(id).y);return [id,t,d];}).sort((a,b)=>a[2]-b[2])[0];if(c)sendKey(k,{s:c[0],town:c[1].name,n:80+Math.floor(rnd()*7)*10});return;}
    default:sendKey(k);
  }
}
const EFFECTS={
  defgen:[m=>order('KIT',m.p.s,1),m=>{st(m.p.s).morale-=6;return [true,'Acknowledged. Morale dips.'];}],
  defscrub:[m=>order('KIT',m.p.s,1),m=>order('LIOH',m.p.s,1),m=>{st(m.p.s).morale-=10;return [true,"'Understood.' It was not understood."];}],
  fuel:[m=>order('DSL',m.p.s,2),m=>order('DSL',m.p.s,1),m=>{st(m.p.s).morale-=5;return [true,"'Copy. Hoping.'"];}],
  drill:[m=>{const a=st(m.p.a),b=st(m.p.b);if(a.busy||b.busy)return [false,'One of those sites already has a task this shift.'];a.busy=b.busy='INTAKE DRILL';a.morale+=10;b.morale+=15;S.flags.drill=[m.p.a,m.p.b];return [true,'Drill approved. Both sites run intake this shift.'];},
    ()=>[true,"'Understood, Control.'"]],
  vent:[m=>{const s=st(m.p.s);s.air=clamp(s.air+20,0,100);s.morale-=12;s.hull-=4;ev(`${m.p.s} vent purge: air +20, fallout in the intake room.`);return [true,'Purge authorized. Air +20.'];},()=>[true,'They stay sealed.']],
  evac:[m=>{const a=st(m.p.s),b=st(m.p.to);if(a.lost||a.evac)return [false,'That shelter is already dark.'];const l=findLink(m.p.s,m.p.to);if(!l||!passable(l))return [false,'The tunnel is severed. Nobody can get through.'];
      const n=a.pop;b.pop+=n;a.pop=0;a.evac=true;S.stats.evacs++;b.morale-=8;S.flows=S.flows.filter(f=>f.from!==m.p.s&&f.to!==m.p.s);S.queue.push([S.shift+1,'guests',m.p]);ev(`${m.p.s} evacuated: ${n} people moved to ${m.p.to}.`);return [true,`Evacuation approved. ${n} people moving.`];},
    m=>{st(m.p.s).morale-=10;S.queue.push([S.shift+1,'hold',m.p]);return [true,"'Holding.'"];}],
  hatch:[m=>{const s=st(m.p.s);s.pop+=m.p.n;s.civ+=m.p.n;s.air-=4;s.morale+=6;S.flags.hatch=m.p.n;S.stats.taken+=m.p.n;S.queue.push([S.shift+1,'hatchopen',m.p]);ev(`${m.p.s} took in ${m.p.n} people from the surface.`);return [true,`Hatch opened. ${m.p.n} people in decon.`];},
    m=>{st(m.p.s).morale-=25;S.queue.push([S.shift+1,'hatchshut',m.p]);return [true,'Hatch stays sealed.'];}],
};

/* ---------------- actions ---------------- */
const CAT={DSL:{name:'Diesel fuel',unit:'2,000 L',cost:2400,lead:2},H2O:{name:'Water tanker',unit:'10,000 L',cost:1500,lead:2},FOOD:{name:'Rations',unit:'3,000 person-days',cost:2000,lead:2},KIT:{name:'Spares kit',unit:'1 kit',cost:3200,lead:3},LIOH:{name:'LiOH pallet',unit:'1 pallet',cost:1800,lead:2}};
function order(code,id,q){const c=CAT[code];if(!c)return [false,'Unknown item.'];
  if(S.shift>=WAR)return [false,'Depot 12 is not answering. There will be no more convoys.'];if(S.shift>=7)return [false,'Depot 12 closed at DEFCON 2.'];
  const cost=c.cost*q;if(cost>S.budget)return [false,`That costs ${money(cost)}; the budget has ${money(S.budget)} left.`];
  S.budget-=cost;S.orders.push({id:S.nextOrder++,code,site:id,q,eta:S.shift+c.lead});ev(`Ordered ${q} x ${code} for ${id} (${money(cost)}).`,true);
  return [true,`Ordered ${q} × ${c.name.toLowerCase()} for ${id}. Arrives ${shortT(S.shift+c.lead)}. Budget left ${money(S.budget)}.`];}
function setFlow(t,from,to,amt){const a=st(from),b=st(to),old=S.flows.find(f=>f.type===t&&f.from===from&&f.to===to);
  if(amt<=0){if(!old)return [false,'There is no such flow to stop.'];S.flows=S.flows.filter(f=>f!==old);ev(`Stopped ${RNAME[t]} flow ${from}>${to}.`,true);return [true,`${cap1(RNAME[t])} flow ${from} → ${to} stopped.`];}
  if(a.lost||a.evac||b.lost||b.evac)return [false,'One of those shelters is dark.'];
  if(!staticRoute(t,from,to))return [false,`No working ${t==='W'?'water main':t==='A'?'air duct':'power cable'} connects ${from} and ${to}.`];
  if(S.stats)S.stats.flowsSet++;if(old)old.amt=amt;else S.flows.push({id:S.nextFlow++,type:t,from,to,amt});const f=old||S.flows[S.flows.length-1];compute();
  ev(`Set ${RNAME[t]} flow ${from}>${to} ${amt} ${UNIT[t]}.`,true);
  return [true,`${cap1(RNAME[t])} ${from} → ${to}: ${num(amt)} ${UNIT[t]}. ${f.note==='STANDBY'?'Standby until the grid fails.':`Moving ${num(f.actual)}, ${num(f.got)} arrives (${f.note.toLowerCase()}).`}`];}
const SYSNAME={gen:'generator',scrub:'scrubbers',plant:'water plant'};
function fix(id,sys){const s=st(id);if(s.lost||s.evac)return [false,`${id} is dark.`];if(s.busy)return [false,`${id} staff are busy: ${s.busy.toLowerCase()}.`];
  if(sys==='scrub'&&!s.scrubCap||sys==='plant'&&!s.plantCap||sys==='gen'&&!s.gcap)return [false,`${id} has no ${SYSNAME[sys]} to overhaul.`];
  if(s.spares<1)return [false,`${id} has no spare kits.`];
  if(S.stats)S.stats.overhauls++;const amt=R0(25+15*clamp(s.morale,0,100)/100),before=R0(s[sys]);s.spares--;s[sys]=clamp(s[sys]+amt,0,100);s.busy='OVERHAUL '+SYSNAME[sys].toUpperCase();
  let extra='';if(sys==='plant'&&s.leak){s.leak=0;extra=' Tank leak sealed.';}ev(`${id} overhauled ${SYSNAME[sys]}: ${before}% > ${R0(s[sys])}%.${extra}`,true);
  return [true,`${id} ${SYSNAME[sys]} ${before}% → ${R0(s[sys])}%. Kit used; staff busy this shift.${extra}`];}
function useLioh(id){const s=st(id);if(s.lioh<1)return [false,`${id} has no LiOH.`];s.lioh--;if(S.stats)S.stats.lioh++;const b=R0(s.air);s.air=clamp(s.air+15,0,100);ev(`${id} opened a LiOH pallet: air ${b}% > ${R0(s.air)}%.`,true);return [true,`${id} opened a LiOH pallet. Air ${b}% → ${R0(s.air)}%.`];}
function repair(x,y,who){const l=findLink(x,y);if(!l)return [false,'No such tunnel.'];if(l.collapsed&&!l.ok)return [false,'That tunnel has collapsed. It cannot be reopened.'];if(l.ok&&l.hp>=100)return [false,'That tunnel is in full working order.'];
  if(ids().some(i=>st(i).repair?.link===linkName(l)))return [false,'A crew is already on it.'];
  const s=st(who);if(!s||s.lost||s.evac)return [false,`${who} is dark.`];if(s.busy)return [false,`${who} staff are busy.`];if(s.spares<1)return [false,`${who} has no spare kit.`];
  const n=l.ok?1:2;s.spares--;if(S.stats)S.stats.repairs++;s.repair={link:linkName(l),left:n};s.busy='REPAIR '+linkName(l);ev(`${who} sent a crew to repair ${linkName(l)}.`,true);
  return [true,`${who} crew heading into the ${linkName(l)} tunnel with a kit. ${n} shift${n>1?'s':''}.`];}

/* ---------------- shift ---------------- */
function ev(t,quiet){S.log.push([S.shift,t]);if(!quiet)S.events.push(t);if(S.log.length>300)S.log.shift();}
function casualties(s,n,cause){n=Math.min(Math.max(1,R0(n)),s.pop);if(n<=0)return;if(S.stats)S.stats.cause[cause]=(S.stats.cause[cause]||0)+n;s.pop-=n;s.dead+=n;s.morale-=6;ev(`${s.id} lost ${n} ${n===1?'person':'people'} (${cause}).`);
  (S.flags.cas=S.flags.cas||[]).push(`${s.id} ${s.name}: ${n} dead (${cause}). ${s.pop} left; air ${R0(s.air)}%, water ${num(s.water)} L.`);
  if(s.pop<=0){s.lost=true;ev(`${s.id} ${s.name} has gone silent.`);send({from:'SYS',subj:`CARRIER LOST ${s.id}`,body:`SHELTERNET has no carrier from ${s.name}.\nListening watch maintained.`});S.flows=S.flows.filter(f=>f.from!==s.id&&f.to!==s.id);}}
function endShift(){
  if(S.over)return;S.events=[];const N=compute(),W_=war();
  for(const id of ids()){const s=st(id),n=N[id];if(s.lost||s.evac)continue;
    if(!S.grid)s.fuel=Math.max(0,R0(s.fuel-n.burn));
    s.water=R0(clamp(s.water+n.wnet,0,s.wcap));s.air=clamp(s.air+n.airDelta,0,100);
    if(!W_){s.gen-=.3;s.scrub-=.4+rnd()*.6;s.plant-=.3+rnd()*.5;}
    else{s.food=Math.max(0,s.food-n.foodUse);
      const wr=S.wear||1;if(n.genUsed>0)s.gen-=(1+rnd()*1.6)*wr;s.scrub-=(.8+rnd()*1.4)*n.scrubF*wr;s.plant-=(.6+rnd()*1.1)*n.plantF*wr;
      if(s.leak)s.leak=R0(s.leak*1.12+15);
      if(s.hull<40&&rnd()<.25){s.leak+=100;ev(`${id}: the cracked lining is letting water through.`);}
      if(s.morale<20&&rnd()<.35)unrest(s);
      s.morale-=1;if(s.air<60)s.morale-=4;if(n.wnet<0&&s.water<-n.wnet*3)s.morale-=4;if(n.baseF<1)s.morale-=5;if(s.pop>s.cap)s.morale-=3;if(s.hull<50)s.morale-=3;
      if(s.fuel<=0&&s.gcap&&!S.flags['nofuel'+id]){S.flags['nofuel'+id]=1;ev(`${id} generator stopped: fuel exhausted.`);}
      for(const k of ['gen','scrub','plant'])if(s[k]>0&&s[k]<35&&rnd()<.22){s[k]=0;ev(`${id} ${SYSNAME[k]} failed outright.`);}
      if(s.air<30)casualties(s,s.pop*.04,'hypoxia');else if(s.air<45)casualties(s,s.pop*.015,'CO2 poisoning');else if(s.air<55&&rnd()<.4)casualties(s,s.pop*.005,'CO2 poisoning');
      if(s.water<=0){s.dry++;if(s.dry>=1)casualties(s,s.pop*.035,'dehydration');}else s.dry=0;
      if(s.food<=0){s.hungry++;s.morale-=6;if(s.hungry>=3)casualties(s,s.pop*.02,'starvation');}else s.hungry=0;}
    for(const k of ['gen','scrub','plant','morale','hull'])s[k]=clamp(s[k],0,100);
    if(s.repair){s.repair.left--;if(s.repair.left<=0){const [x,y]=s.repair.link.split('-');const l=findLink(x,y);l.ok=true;l.hp=100;ev(`${s.repair.link} repaired by ${id} crew.`);s.repair=null;s.busy=null;}}else s.busy=s.ill>0?(s.ill--,'STAFF DOWN WITH FEVER'):null;}
  for(const o of S.orders.filter(o=>o.eta<=S.shift+1)){const s=st(o.site);
    if(o.code==='DSL')s.fuel=Math.min(s.fcap,s.fuel+2000*o.q);if(o.code==='H2O')s.water=Math.min(s.wcap,s.water+10000*o.q);if(o.code==='FOOD')s.food=Math.min(s.foodCap,s.food+3000*o.q);
    if(o.code==='KIT')s.spares+=o.q;if(o.code==='LIOH')s.lioh+=o.q;ev(`Delivered: ${o.q} x ${o.code} to ${o.site}.`);}
  S.orders=S.orders.filter(o=>o.eta>S.shift+1);
  S.shift++;const t=S.shift;S.pmoved={};
  if(t===1)intake(1);
  if(t===2||t===3)stragglers();
  if(t>=2&&t<S.relief)drawEvents();
  if(t===S.relief-3)sendKey('update18');
  if(t>=3)checkEvac();
  for(const [at,k] of SCHED)if(at===t)scheduled(k);
  S.queue=S.queue.filter(([at,k,p])=>{if(at<=t){sendKey(k,p);return false;}return true;});
  alerts();
  if(S.flags.cas&&S.flags.cas.length){send({from:'SYS',subj:`CASUALTY REPORT · ${S.flags.cas.length} SHELTER${S.flags.cas.length>1?'S':''}`,body:S.flags.cas.join('\n')});S.flags.cas=[];}
  if(st('CC').lost||(t>WAR&&shelters().length&&shelters().every(i=>st(i).lost||st(i).evac)))S.over='lost';else if(t>=S.relief)S.over='won';
  const nm=S.mails.filter(m=>m.shift===t).length;
  for(const f of S.flows)if(f.actual)S.stats.moved[f.type]+=f.got||0;
  record();
  S.over?openEnd():openReport();if(t===WAR)alarm();else if(nm)chime();
}
function intake(wave){for(const id of ids()){const s=st(id);if(s.lost)continue;
  const first=R0(s.assigned*.75),n=wave===0?first:s.assigned-first;s.pop+=n;}
  ev(wave===0?'Sirens. Shelters opening; first wave of people inside.':'Intake complete. Doors sealed region-wide.');}
function attack(){
  S.grid=false;S.defcon=1;
  if(S.orders.length){S.flags.cancelled=S.orders.map(o=>`  ${o.q} x ${o.code} for ${o.site}`).join('\n')+'\n';S.budget+=S.orders.reduce((a,o)=>a+CAT[o.code].cost*o.q,0);S.orders=[];sendKey('depotcancel');}
  intake(0);
  const drill=S.flags.drill||[];let worst=null,wd=-1;
  for(const id of ids()){const s=st(id),dmg=(18+rnd()*42)*(1-s.prot)*Math.sqrt(s.d0/12)*(drill.includes(id)?.6:1);s.hull=R0(100-dmg);if(id!=='CC'&&dmg>wd){wd=dmg;worst=id;}}
  if(worst){const s=st(worst);s.water=R0(s.water*.45);s.leak=R0(120+250*(1-s.prot));s.gen=Math.max(0,s.gen-25);s.morale-=drill.includes(worst)?4:14;S.flags.hit=worst;}
  const others=liveShelters().filter(i=>i!==worst).sort(()=>rnd()-.5);
  if(others[0]&&rnd()<.65){st(others[0]).air-=20;st(others[0]).morale-=5;S.flags.fire=others[0];}
  let cuts=0;for(const l of S.links){const roll=rnd(),f=1-l.rel;if(roll<f*.75){l.ok=false;l.hp=0;cuts++;}else if(roll<f*1.6){l.hp=R0(35+rnd()*45);}}
  if(!cuts&&S.links.length){const l=S.links.slice().sort((a,b)=>a.rel-b.rel)[0];if(rnd()<1-l.rel+.2){l.ok=false;l.hp=0;}}
  ev('DEFCON 1. Detonations in sector. Commercial power lost.');
  if(worst)ev(`${worst} hit hardest: hull ${st(worst).hull}%, main tank ruptured.`);
  const cl=S.links.filter(l=>!l.ok).map(linkName);if(cl.length)ev(`Tunnels severed: ${cl.join(', ')}.`);
}
function secondShock(){const c=liveShelters().filter(i=>i!==S.flags.hit&&st(i).gcap).sort((a,b)=>st(a).prot-st(b).prot)[0];if(!c)return;
  const s=st(c);s.gen=Math.max(0,s.gen-45);S.flags.genloss=c;
  const l=S.links.filter(l=>l.ok&&(l.a===c||l.b===c)).sort((a,b)=>a.rel-b.rel)[0];if(l&&rnd()<1-l.rel+.15){l.ok=false;l.hp=0;S.flags.genlossCut=linkName(l);}
  ev(`Second shock: ${c} generator damaged${S.flags.genlossCut?`, ${S.flags.genlossCut} severed`:''}.`);}
function randomEvent(){if(rnd()>.4)return;const live=liveShelters();if(!live.length)return;const id=live[Math.floor(rnd()*live.length)],s=st(id),r=rnd();
  if(r<.22){s.air=clamp(s.air-10,0,100);s.morale-=5;ev(`Electrical fire at ${id}, put out. Air -10.`);}
  else if(r<.42){s.leak+=120;s.water=Math.max(0,s.water-700);ev(`${id} tank seam split: -700 L, still leaking.`);}
  else if(r<.58&&s.gcap){s.gen=Math.max(0,s.gen-15);ev(`${id} generator tripped and restarted rough.`);}
  else if(r<.72&&s.scrubCap){s.scrub=Math.max(0,s.scrub-15);ev(`${id} scrubber fan bearing failing.`);}
  else{const ok=S.links.filter(l=>l.ok&&l.hp>40);if(ok.length){const w=ok.map(l=>1-l.rel+.05),tot=w.reduce((a,b)=>a+b,0);let x=rnd()*tot,k=0;while(x>w[k]){x-=w[k];k++;}const l=ok[Math.min(k,ok.length-1)];
    l.hp=Math.max(20,l.hp-R0(30+rnd()*30));ev(`Ground settling in the ${linkName(l)} tunnel (${R0(l.rock*100)}% rock): now ${l.hp}% capacity.`);}}}
function alerts(){if(!war())return;const N=compute();
  for(const id of liveShelters()){const s=st(id),n=N[id],F=S.flags,sh=n.wnet<0?Math.floor(s.water/-n.wnet):99;
    if(sh<4&&!F['w'+id]){F['w'+id]=1;send({from:id,subj:`WATER: ${sh} SHIFTS LEFT`,body:`Control,\n\n${cap1(s.name)} holds ${num(s.water)} L. ${s.pop} people use ${num(n.use)} L a shift; filtration recovers ${num(n.rec)}.${s.leak?` A leak costs ${s.leak} L a shift; a water plant overhaul would seal it.`:''} Net ${sgn(R0(n.wnet))} L a shift.\n\nRequesting a water flow by any line that still holds.\n${sig(id)}`});}
    if(sh>8)F['w'+id]=0;
    if(s.air<62&&!F['a'+id]){F['a'+id]=1;send({from:id,subj:`AIR QUALITY ${R0(s.air)}%`,body:`Control,\n\nAir is ${R0(s.air)}%. ${s.pop} people need ${num(n.need)} CFM; we are getting ${num(n.supply)}. Below 40% people start dying.\n\nOptions: an air flow by duct, LiOH (we hold ${s.lioh}), power for the scrubbers, or an overhaul.\n${sig(id)}`});}
    if(s.air>78)F['a'+id]=0;
    if(n.scrubF<1&&s.scrubCap&&!F['p'+id]){F['p'+id]=1;send({from:id,subj:'POWER SHORTFALL',body:`Control,\n\nWe have ${R0(n.avail)} kW against ${R0(n.load)} kW of load. Scrubbers at ${R0(n.scrubF*100)}%, water plant at ${R0(n.plantF*100)}%. Generator ${R0(s.gen)}%, fuel ${num(s.fuel)} L.\n${sig(id)}`});}
    if(n.scrubF>=1&&n.plantF>=1)F['p'+id]=0;
    if(s.gcap&&s.fuel<n.burn*3&&s.fuel>0&&!F['f'+id]){F['f'+id]=1;send({from:id,subj:`FUEL ${num(s.fuel)} L`,body:`Control,\n\nDiesel is down to ${num(s.fuel)} L. We burn ${num(n.burn)} L a shift.\n${sig(id)}`});}
    if(s.food<n.foodUse*4&&!F['r'+id]){F['r'+id]=1;send({from:id,subj:'FOOD RUNNING OUT',body:`Control,\n\n${num(s.food)} person-days of rations left for ${s.pop} people. We have cut portions.\n${sig(id)}`});}}}

/* ================= operations: map ================= */
const CW=58,CH=64;
/* camera: frame the shelters in play. Positions are spread by the zoom; cards and badges keep their size. */
let CAM={cx:320,cy:180,z:1};
function updateCam(){const pts=ids().map(id=>[st(id).x*4+2,st(id).y*4+2]);
  let x0=Math.min(...pts.map(p=>p[0]))-40,x1=Math.max(...pts.map(p=>p[0]))+40,y0=Math.min(...pts.map(p=>p[1]))-46,y1=Math.max(...pts.map(p=>p[1]))+38;
  const zMin=Math.max(TG.w/640,TG.h/360),z=clamp(Math.min(TG.w/(x1-x0),TG.h/(y1-y0)),zMin,2.6),hw=TG.w/2/z,hh=TG.h/2/z;
  CAM={z,cx:clamp((x0+x1)/2,hw,640-hw),cy:clamp((y0+y1)/2,hh,360-hh)};}
const W2S=(x,y)=>[(x-CAM.cx)*CAM.z+TG.w/2,(y-CAM.cy)*CAM.z+TG.h/2];
function blitCam(img,alpha=1){const c=TG.c,sw=TG.w/CAM.z,sh=TG.h/CAM.z;c.globalAlpha=alpha;c.drawImage(img,CAM.cx-sw/2,CAM.cy-sh/2,sw,sh,0,0,c.canvas.width,c.canvas.height);c.globalAlpha=1;}
function cardPos(id){const s=st(id),[px,py]=W2S(s.x*4+2,s.y*4+2);return [clamp(px-29,1,TG.w-CW-1),clamp(py-36,1,TG.h-CH-1),px,py];}
function gauge(x,y,v,c,blink,t){F(x,y,6,42,'#0f0b15');F(x+1,y+1,4,40,'#15111d');const h=R0(clamp(v,0,1)*40);const cc=blink&&!reduced&&(t/400|0)%2?'#ec4b3f':c;if(h>0){F(x+1,y+41-h,4,h,cc);F(x+1,y+41-h,4,1,'#ffffff66');}}
function arrow(x,y,up,c){if(up){F(x+2,y,1,1,c);F(x+1,y+1,3,1,c);}else{F(x+1,y,3,1,c);F(x+2,y+1,1,1,c);}}
function fitText(str,maxW){const c=TG.c,k=TG.k;c.font=`600 ${Math.max(10,Math.round(9.5*k))}px 'IBM Plex Sans Condensed','Arial Narrow',sans-serif`;if(c.measureText(str).width<=maxW*k)return str;while(str.length>3&&c.measureText(str+'.').width>maxW*k)str=str.slice(0,-1);return str.trimEnd()+'.';}
function drawCard(id,t){
  const s=st(id),n=UI.N[id],[x0,y0]=cardPos(id),stt=siteStatus(s,n),dark=s.lost||s.evac;
  const sel=UI.sel===id&&UI.selLink===null,hov=UI.hover===id||(UI.drag&&UI.drag.over===id&&UI.drag.from!==id);
  F(x0+2,y0+2,CW,CH,'#0c091088');
  if(sel||hov||UI.pick===id){F(x0-2,y0-2,CW+4,CH+4,UI.drag&&UI.drag.over===id?'#ffffff':sel||UI.pick===id?'#f2b33d':'#6d6290');}
  F(x0,y0,CW,CH,'#0f0b15');F(x0+1,y0+1,CW-2,CH-2,dark?'#201b28':'#2b2438');F(x0+1,y0+1,CW-2,1,'#4a4060');F(x0+1,y0+1,1,CH-2,'#4a4060');
  F(x0+1,y0+1,CW-2,10,dark?'#2a2433':'#3a3050');txt(fitText(`${id} ${s.name}`,CW-12),x0+3,y0+1,dark?'#7d7490':'#efe6cf');
  const lc=stt==='OK'?'#77d65b':stt==='WARN'?'#f2b33d':stt==='CRIT'?((t/350|0)%2&&!reduced?'#5a1d1a':'#ec4b3f'):'#5c5470';F(x0+CW-7,y0+3,5,5,'#0f0b15');F(x0+CW-6,y0+4,3,3,lc);
  const sx=x0+3,sy=y0+13;F(sx-1,sy,22,2,'#5d5e6b');F(sx,sy+2,20,40,'#8b8c99');
  let bg=s.air>=80?'#24494f':s.air>=60?'#4d5228':'#5a2626';if(dark)bg='#141019';else if(!S.grid&&n.baseF<1)bg=(t/300|0)%3===0&&!reduced?'#0e0b13':'#1a1520';
  F(sx+2,sy+2,16,38,bg);for(const fy of [sy+11,sy+20,sy+29])F(sx+2,fy,16,1,'#8b8c99');
  if(!dark){const lit=S.grid||n.baseF>=1;for(const fy of [sy+2,sy+12,sy+21])F(sx+9,fy,2,1,lit?'#ffe08a':'#3a3050');
    const slots=63,cap=Math.max(1,s.cap),fill=R0(Math.min(s.pop,cap)/cap*slots),over=Math.min(slots-fill,R0(Math.max(0,s.pop-cap)/cap*slots));
    for(let k=0;k<fill+over;k++){const fl=2-Math.floor(k/21),sl=k%21,row=Math.floor(sl/7),col=sl%7;F(sx+3+col*2,sy+4+fl*9+row*2,1,1,k>=fill?'#ec4b3f':['#efe6cf','#e8c48a','#d99a6c'][k%3]);}}
  // storeroom: food against storage capacity (water has its own gauge)
  F(sx+2,sy+31,16,9,'#15111d');const fl=R0(clamp(s.foodCap?s.food/s.foodCap:0,0,1)*8),fBl=!dark&&war()&&n.foodUse>0&&s.food<n.foodUse*4&&!reduced&&(t/400|0)%2;
  if(fl){F(sx+2,sy+40-fl,16,fl,fBl?'#ec4b3f':COL.FOOD);F(sx+2,sy+40-fl,16,1,'#ffffff55');for(const cx of [sx+7,sx+12])F(cx,sy+40-fl,1,fl,'#15111d88');}
  else if(!dark&&war()&&(t/400|0)%2&&!reduced)F(sx+2,sy+39,16,1,'#ec4b3f');
  const W_=war(),wsh=n.wnet<0?s.water/-n.wnet:99;
  const vals=[[s.air/100,COL.A,W_&&s.air<50,W_?n.airDelta:0],[s.wcap?s.water/s.wcap:0,COL.W,W_&&wsh<3,W_?n.wnet:0],[S.grid?1:(n.load?n.avail/n.load:1),COL.P,!S.grid&&n.baseF<1,!S.grid&&n.bal<0?-1:0],[s.fcap?s.fuel/s.fcap:0,COL.F,!S.grid&&s.gcap&&s.fuel<n.burn*3,0]];
  vals.forEach(([v,c,bl,tr],k)=>{const gx=x0+27+k*7;gauge(gx,y0+13,dark?0:v,c,bl,t);if(k===1&&s.leak>0&&!dark){const dy=reduced?0:(t/140|0)%7;F(gx+6,y0+44+dy,1,2,'#7cc0ff');}if(!dark&&Math.abs(tr)>=1)arrow(gx,y0+10,tr>0,tr>0?'#77d65b':'#ec4b3f');});
  txt(dark?(s.evac?'EVACUATED':'NO CARRIER'):`${s.pop}/${s.cap}`,x0+3,y0+55,dark?'#a197b4':s.pop>s.cap?'#ec4b3f':'#efe6cf');
}
function linkPts(i){const l=S.links[i],A=st(l.a),B=st(l.b);return [...W2S(A.x*4+2,A.y*4+2),...W2S(B.x*4+2,B.y*4+2)];}
function drawTunnel(i,t){
  const l=S.links[i],[ax,ay,bx,by]=linkPts(i),cut=!l.ok||l.hp<=0,hurt=!cut&&l.hp<100,dx=bx-ax,dy=by-ay,L=Math.hypot(dx,dy),nx=-dy/L,ny=dx/L;
  if(UI.selLink===i||UI.hoverLink===i)lineThick(ax,ay,bx,by,13,UI.selLink===i?'#f2b33d':'#6d6290');
  lineThick(ax,ay,bx,by,11,'#0f0b15');lineThick(ax,ay,bx,by,9,cut?'#191420':'#2c2438');
  if(l.collapsed){const r=mul(300+i);for(let k=0;k<26;k++){const u=.35+r()*.3,o=(r()-.5)*12;F(ax+dx*u+nx*o,ay+dy*u+ny*o,2,2,r()<.5?'#5d5e6b':'#0f0b15');}}
  const OFF={W:-3,A:0,P:3},R=UI.N._R[i];
  for(const k of ['W','A','P'])if(l.cap[k])lineThick(ax+nx*OFF[k],ay+ny*OFF[k],bx+nx*OFF[k],by+ny*OFF[k],2,cut?'#2a2433':DIM[k]);
  if(cut||hurt){const r=mul(100+i),n=cut?50:R0((100-l.hp)/3);for(let k=0;k<n;k++){const u=r(),o=(r()-.5)*10;F(ax+dx*u+nx*o,ay+dy*u+ny*o,r()<.5?2:1,1,'#0f0b15');}}
  if(!cut)for(const k of ['W','A','P']){const fw=R['fw'+k],bw=R['bw'+k];if(!fw&&!bw)continue;const ph=reduced?0:(t*.018)%9;
    for(let d=ph;d<L;d+=9){if(fw){const u=d/L;F(ax+dx*u+nx*OFF[k]-1,ay+dy*u+ny*OFF[k]-1,2,2,COL[k]);}if(bw){const u=1-d/L;F(ax+dx*u+nx*OFF[k]-1,ay+dy*u+ny*OFF[k]-1,2,2,COL[k]);}}}
}
function drawChip(i,t){const l=S.links[i],[x,y]=UI.chips[i],cut=!l.ok||l.hp<=0,hurt=!cut&&l.hp<100,R=UI.N._R[i];
  const rep=ids().some(id=>st(id).repair?.link===linkName(l));
  F(x-14,y-8,28,16,cut?(rep?'#f2b33d':((t/500|0)%2&&!reduced?'#5a1d1a':'#ec4b3f')):hurt||UI.selLink===i?'#f2b33d':'#4a4060');F(x-13,y-7,26,14,'#1b1624');
  if(cut){txt(l.collapsed?'GONE':rep?'FIX':'CUT',x,y-4,rep?'#f2b33d':'#ec4b3f','center');return;}
  if(l.collapsed){F(x+8,y-7,5,5,'#ec4b3f');F(x+9,y-6,3,3,'#1b1624');}
  ['W','A','P'].forEach((k,j)=>{const yy=y-5+j*4;if(!l.cap[k]){F(x-10,yy,20,2,'#2a2433');return;}const c=R.cap[k],u=c-R.left[k];F(x-10,yy,20,2,DIM[k]);if(u>0)F(x-10,yy,Math.max(1,R0(20*u/c)),2,u>=c-1?'#ffffff':COL[k]);});}
function drawOps(t){
  updateCam();blitCam(TER);F(0,0,TG.w,TG.h,'rgba(16,11,26,.6)');blitCam(ROADS,.45);
  for(const tw of WD.towns){const [x,y]=W2S(tw.x*4,tw.y*4);txtS(tw.name,x,y+10,'#8a8099','center');}
  for(let i=0;i<S.links.length;i++)drawTunnel(i,t);
  UI.chips=placeOnSegments(S.links.map((l,i)=>linkPts(i)),ids().map(id=>{const [x0,y0]=cardPos(id);return [x0-5,y0-5,CW+10,CH+10];}),28,16);
  for(const id of ids())drawCard(id,t);
  for(let i=0;i<S.links.length;i++)drawChip(i,t);
  const d=UI.drag;if(d&&d.moved&&d.from){const s=st(d.from),[ax,ay]=W2S(s.x*4+2,s.y*4+2),L=Math.hypot(d.x-ax,d.y-ay),ph=reduced?0:(t*.03)%6;
    for(let k=ph;k<L;k+=6){const x=ax+(d.x-ax)*k/L,y=ay+(d.y-ay)*k/L;F(x-1,y-1,3,3,'#0f0b15');F(x,y,2,2,'#f2b33d');}}
  txtS(war()?'SEALED':'VENTED - ON GRID',TG.w-6,TG.h-11,war()?((t/600|0)%2||reduced?'#ec4b3f':'#5a1d1a'):'#8a8099','right');
}
function opsNodeAt(x,y){for(const id of ids().slice().reverse()){const [x0,y0]=cardPos(id);if(x>=x0&&x<=x0+CW&&y>=y0&&y<=y0+CH)return id;}return null;}
function opsLinkAt(x,y){if(UI.chips)for(let i=0;i<UI.chips.length;i++){const [cx,cy]=UI.chips[i];if(Math.abs(x-cx)<=14&&Math.abs(y-cy)<=8)return i;}let best=null,bd=7;S.links.forEach((l,i)=>{const [ax,ay,bx,by]=linkPts(i),dx=bx-ax,dy=by-ay,u=clamp(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy),0,1),d=Math.hypot(ax+dx*u-x,ay+dy*u-y);if(d<bd){bd=d;best=i;}});return best;}
function opsDown(x,y){UI.drag={from:opsNodeAt(x,y),x,y,sx:x,sy:y,moved:false,over:null};}
function opsMove(e,x,y){const d=UI.drag;if(d){d.x=x;d.y=y;if(d.from&&Math.hypot(x-d.sx,y-d.sy)>6)d.moved=true;d.over=opsNodeAt(x,y);}
  UI.hover=opsNodeAt(x,y);UI.hoverLink=UI.hover?null:opsLinkAt(x,y);cv.style.cursor=UI.hover?(d&&d.moved?'copy':'grab'):UI.hoverLink!=null?'pointer':'default';
  let h=null;
  if(d&&d.moved)h=d.over&&d.over!==d.from?`Release to send from <b>${d.from}</b> to <b>${d.over}</b>`:'Drag to the shelter that should receive';
  else if(UI.hover){const s=st(UI.hover),n=UI.N[UI.hover];h=`<b>${s.id} ${esc(s.name)}</b><br>${s.pop} / ${s.cap} people · air ${R0(s.air)}%${war()?` (${sgn(R0(n.airDelta))})`:''}<br>water ${num(s.water)} L${war()?` (${sgn(R0(n.wnet))}/shift)`:''}<br>${S.grid?'on grid':`power ${R0(n.avail)} of ${R0(n.load)} kW`} · fuel ${num(s.fuel)} L · food ${num(s.food)}<br><span class="dim">Click for detail · drag to another shelter to send</span>`;}
  else if(UI.hoverLink!=null){const l=S.links[UI.hoverLink],R=UI.N._R[UI.hoverLink];h=`<b>${linkName(l)} tunnel</b> · ${!l.ok||l.hp<=0?'<span class="neg">severed</span>':l.hp+'%'} · ${l.depth} m, ${R0(l.rock*100)}% rock<br>`+['W','A','P'].map(k=>l.cap[k]?`${RNAME[k].toLowerCase()} ${num(R.cap[k]-R.left[k])} / ${num(R.cap[k])} ${UNIT[k]}`:`no ${RNAME[k].toLowerCase()}`).join('<br>');}
  placeTip(e,h);}
function opsUp(x,y){const d=UI.drag;UI.drag=null;if(!d)return;
  if(d.moved){const to=opsNodeAt(x,y);if(to&&to!==d.from)openTransfer(d.from,to);return;}
  const id=opsNodeAt(x,y);
  if(UI.pick){if(id&&id!==UI.pick){const f=UI.pick;setPick(null);openTransfer(f,id);}else if(!id)setPick(null);return;}
  if(id){UI.sel=id;UI.selLink=null;UI.tab='shelter';blip();refresh();return;}
  const li=opsLinkAt(x,y);if(li!=null){UI.selLink=li;UI.tab='shelter';blip();refresh();}}

/* ================= operations: panels ================= */
function opsSide(){
  if(UI.tab==='log')return `<div class="sect"><span class="lbl">Event log</span><ul class="evlist">${S.log.slice().reverse().map(([sh,t])=>`<li><span class="dim">${shortT(sh)}</span> ${esc(t)}</li>`).join('')||'<li>Nothing yet.</li>'}</ul></div>`;
  if(UI.tab==='flows')return flowsPanel();
  return UI.selLink!=null&&S.links[UI.selLink]?linePanel(UI.selLink):shelterPanel(UI.sel&&st(UI.sel)?UI.sel:'CC');
}
function shelterPanel(id){
  const s=st(id),n=UI.N[id],stt=siteStatus(s,n),dark=s.lost||s.evac,L=n.L,W_=war();
  let h=`<div class="phead"><span class="big">${id} ${esc(s.name)}</span><span class="chip ${stt}">${stt}</span></div>
    <div class="row dim small"><span>${esc(s.warden==='YOU'?'Your post':s.warden)} · ${s.depth} m · hull ${R0(s.hull)}%</span><span>${s.busy?esc(s.busy.toLowerCase()):'staff idle'}</span></div>
    ${dark?'':`<div class="actions"><button class="btn small" data-act="send" type="button">Send supplies or people…</button></div>`}`;
  if(dark)return h+`<div class="dim">${s.evac?'Evacuated.':'No carrier.'} ${s.dead} dead.</div>`;
  const tile=(lab,col,val,sub,meterHtml,detail,lvl='',tip='')=>`<div class="tile ${lvl}" title="${esc(tip)}"><div class="t"><span class="lbl" style="color:${col}">${lab}</span><span class="v num">${val}${sub?` <small class="${sub[1]}">${sub[0]}</small>`:''}</span></div>${meterHtml}<div class="d">${detail}</div></div>`;
  const tr=(v,u='')=>[`${sgn(R0(v))}${u}`,v<0?'neg':'pos'];
  const sh=n.wnet<0?Math.floor(s.water/-n.wnet):null,fsh=n.burn?Math.floor(s.fuel/n.burn):null,fdsh=n.foodUse?Math.floor(s.food/n.foodUse):null;
  const total=Math.max(n.load,S.grid?0:n.avail,1),seg=(v,f,c)=>`<span style="width:${v*f/total*100}%;--c:${c}"></span>${f<1?`<span class="off" style="width:${v*(1-f)/total*100}%"></span>`:''}`;
  h+=`<div class="tiles">
  ${tile('People','var(--paper)',`${s.pop}<small class="dim">/${s.cap}</small>`,null,meter(s.pop,Math.max(s.cap,s.pop),s.pop>s.cap?'var(--bad)':'var(--paper)',s.pop>s.cap?s.cap/s.pop*100:null),`${s.dead} dead · morale ${R0(s.morale)}%`,s.pop>s.cap?'warn':'')}
  ${tile('Air','var(--air)',`${R0(s.air)}%`,W_?tr(n.airDelta,'/sh'):null,meter(s.air,100,s.air<50?'var(--bad)':'var(--air)',40),W_?`${num(n.supply)} of ${num(n.need)} CFM needed`:'vented to surface',s.air<50?'crit':s.air<72||n.supply<n.need?'warn':'',`Scrubbed ${num(n.scrubOut)} (${R0(s.scrub)}% condition, ${R0(n.scrubF*100)}% powered), duct in ${num(n.ain)}, out ${num(n.aout)}`)}
  ${tile('Water','var(--water)',`${(s.water/1000).toFixed(1)}k L`,W_?tr(n.wnet):null,meter(s.water,s.wcap,'var(--water)'),W_?`${sh!=null?sh+' shifts left · ':''}recycling ${R0(n.recPct*100)}%${s.leak?` · <span class="neg">leak ${s.leak}</span>`:''}`:'city water until sealed',sh!=null&&sh<3?'crit':sh!=null&&sh<6?'warn':'',`Use ${num(n.use)}, recycled ${num(n.rec)}, in ${num(n.win)}, out ${num(n.wout)}, leak ${s.leak} L per shift`)}
  ${tile('Power','var(--amber)',S.grid?'Grid':`${R0(n.avail)}<small class="dim">/${R0(n.load)} kW</small>`,S.grid?null:tr(n.bal),`<div class="stack mini">${seg(L.base,n.baseF,'var(--paper)')}${seg(L.scrub,n.scrubF,'var(--air)')}${seg(L.plant,n.plantF,'var(--water)')}</div>`,S.grid?'generators on standby':`gen ${R0(n.gen)}${n.pin?` +${R0(n.pin)} in`:''}${n.pout?` −${R0(n.pout)} out`:''} · scrub ${R0(n.scrubF*100)}% · plant ${R0(n.plantF*100)}%`,n.baseF<1?'crit':n.bal<0?'warn':'',`Loads: lights and medical ${R0(L.base)}, scrubbers ${R0(L.scrub)}, pumps and filtration ${R0(L.plant)} kW`)}
  ${tile('Diesel','var(--fuel)',`${num(s.fuel)} L`,null,meter(s.fuel,s.fcap||1,'var(--fuel)'),S.grid?`of ${num(s.fcap)} L`:`burns ${num(n.burn)}/sh${fsh!=null?` · ${fsh} shifts`:''}`,fsh!=null&&fsh<3?'crit':fsh!=null&&fsh<6?'warn':'')}
  ${tile('Food',COL.FOOD,`${num(s.food)}`,null,meter(s.food,s.foodCap||1,COL.FOOD),`person-days${fdsh!=null?` · ${fdsh} shifts`:''}`,W_&&s.food<=0?'crit':fdsh!=null&&fdsh<6?'warn':'')}
  </div>`;
  const can=!s.busy&&s.spares>0;
  h+=`<div class="eq">`;
  for(const [k,nm,has] of [['gen','Generators',s.gcap],['scrub','Scrubbers',s.scrubCap],['plant','Water plant',s.plantCap]])h+=has?`<span>${nm}</span>${meter(s[k],100,s[k]<35?'var(--bad)':s[k]<60?'var(--warn)':'var(--ok)')}<span class="num">${R0(s[k])}%</span><button class="btn small" data-act="fix" data-sys="${k}" type="button" ${can?'':'disabled'} title="Uses a spare kit and the staff's shift">Overhaul</button>`:`<span class="dim">${nm}</span><span class="dim">none</span><span></span><span></span>`;
  h+=`</div><div class="row small"><span class="dim">${kits(s.spares)} · ${s.lioh} LiOH</span><button class="btn small" data-act="lioh" type="button" ${s.lioh?'':'disabled'}>Open LiOH (+15 air)</button></div>`;
  const tl=S.links.map((l,i)=>[l,i]).filter(([l])=>l.a===id||l.b===id);
  h+=`<div class="tchips">${tl.map(([l,i])=>{const cut=!l.ok||l.hp<=0;return `<button class="tchip ${l.collapsed?'col':cut?'cut':l.hp<100?'hurt':''}" data-line="${i}" type="button">${linkName(l)} <small>${l.collapsed?'collapsed':cut?'cut':l.hp<100?l.hp+'%':'ok'}</small></button>`;}).join('')||'<span class="dim small">No tunnels.</span>'}</div>`;
  h+=`<details class="more"><summary>Full breakdown</summary><div class="ledger">
    ${L_('Air scrubbed',num(n.scrubOut)+' CFM')}${L_('Air in / out by duct',`+${num(n.ain)} / −${num(n.aout)}`)}${L_(`Air needed by ${s.pop}`,num(n.need)+' CFM')}
    ${L_('Water used',num(n.use)+' L')}${L_('Water recycled',num(n.rec)+' L')}${L_('Water in / out',`+${num(n.win)} / −${num(n.wout)}`)}${L_('Tank leak',num(s.leak)+' L')}
    ${L_(`Generators (${R0(s.gen)}% of ${s.gcap} kW)`,R0(n.gen)+' kW')}${L_('Power in / out',`+${R0(n.pin)} / −${R0(n.pout)}`)}${L_('Lights + medical',R0(L.base)+' kW')}${L_('Scrubbers',R0(L.scrub)+' kW')}${L_('Pumps + filtration',R0(L.plant)+' kW')}
  </div></details>`;
  return h;}
function lineItem(l,i){const R=UI.N._R[i],cut=!l.ok||l.hp<=0,rep=ids().some(x=>st(x).repair?.link===linkName(l));
  return `<div class="lineitem" data-line="${i}"><b>${linkName(l)}</b><div class="minibars">${['W','A','P'].map(k=>l.cap[k]?`<div class="mb"><i style="width:${R.cap[k]?(R.cap[k]-R.left[k])/R.cap[k]*100:0}%;--c:${COL[k]}"></i></div>`:'<div class="mb" style="opacity:.3"></div>').join('')}</div><span class="${cut?'neg':l.hp<100?'':'dim'}" style="font-size:13px">${l.collapsed?'collapsed':cut?(rep?'repairing':'severed'):l.hp<100?l.hp+'%':'ok'}</span></div>`;}
function routeMax(t,a,b){const r=staticRoute(t,a,b);if(!r)return 0;return Math.floor(Math.min(...r.links.map(i=>S.links[i].cap[t]*S.links[i].hp/100)));}
function linePanel(i){const l=S.links[i],R=UI.N._R[i],cut=!l.ok||l.hp<=0,rep=ids().find(x=>st(x).repair?.link===linkName(l));
  let h=`<div class="sect"><div class="row"><span class="big">${linkName(l)} tunnel</span><span class="chip ${cut?'CRIT':l.hp<100?'WARN':'OK'}">${cut?'SEVERED':l.hp+'%'}</span></div>
    <div class="dim">${num(l.len)} m at ${l.depth} m deep, ${R0(l.rock*100)}% through rock. Built reliability ${R0(l.rel*100)}%.${l.collapsed?` <span class="neg">Collapsed: no passage for people${l.ok?'; the surviving lines still work':''}.</span>`:''}${cut?' Carries nothing until repaired.':l.hp<100?` Damaged: carries ${l.hp}% of its rating.`:''}</div>
    <div class="actions"><button class="btn small" data-act="xf" data-a="${l.a}" data-b="${l.b}" type="button">Send ${l.a} → ${l.b}</button><button class="btn small" data-act="xf" data-a="${l.b}" data-b="${l.a}" type="button">Send ${l.b} → ${l.a}</button></div></div><div class="sect"><span class="lbl">Capacity in use this shift</span>`;
  for(const k of ['W','A','P']){if(!l.cap[k]){h+=`<div class="row dim"><span>${cap1(RNAME[k])}</span><span>no line laid</span></div>`;continue;}const u=R.cap[k]-R.left[k];
    h+=`<div class="row"><span style="color:${COL[k]}">${cap1(RNAME[k])}</span><span class="num">${num(u)} / ${num(R.cap[k])} ${UNIT[k]}</span></div>${meter(u,R.cap[k]||1,COL[k])}`;}
  h+='</div>';
  if(cut||l.hp<100){h+=`<div class="sect"><span class="lbl">Repair</span>`;
    h+=rep?`<div>${rep} crew is on it: ${st(rep).repair.left} shift${st(rep).repair.left>1?'s':''} left.</div>`:`<div class="dim" style="font-size:14px">Takes a spare kit and the crew's work for ${cut?'2 shifts':'1 shift'}.</div><div class="actions">${[l.a,l.b].map(x=>{const s=st(x),ok=!s.lost&&!s.evac&&!s.busy&&s.spares>0;return `<button class="btn small" data-act="repair" data-from="${x}" type="button" ${ok?'':'disabled'}>Crew from ${x} (${kits(s.spares)})</button>`;}).join('')}</div>`;h+='</div>';}
  return h;}
function flowsPanel(){let h=`<div class="sect"><div class="row"><span class="lbl">Active flows</span><button class="btn small" data-act="newx" type="button">New transfer…</button></div>`;
  if(!S.flows.length)h+='<div class="dim">No flows yet. Drag from one shelter to another on the map.</div>';
  for(const f of S.flows){const mx=Math.max(f.amt,routeMax(f.type,f.from,f.to)),step={W:100,A:10,P:5}[f.type];
    h+=`<div class="flow" style="border-left:6px solid ${COL[f.type]}"><b>${cap1(RNAME[f.type])} ${f.from} → ${f.to}</b><button class="btn small danger" data-act="stop" data-id="${f.id}" type="button">Stop</button>
      <input type="range" id="fr${f.id}" data-fid="${f.id}" min="0" max="${mx}" step="${step}" value="${f.amt}" style="--c:${COL[f.type]}" aria-label="Flow amount">
      <span class="num">Set ${num(f.amt)} ${UNIT[f.type]} · moving ${num(f.actual)}, ${num(f.got)} arrives</span><span class="${f.note==='LIVE'||f.note==='STANDBY'?'dim':'neg'}" style="font-size:13px">${(f.note||'').toLowerCase()}</span>
      <span class="dim" style="grid-column:1/-1;font-size:13px">${f.via?'via '+f.via.replace(/-/g,' → '):''}</span></div>`;}
  return h+`</div><div class="sect"><span class="lbl">All tunnels</span><div class="lines">${S.links.map((l,i)=>lineItem(l,i)).join('')||'<span class="dim">No tunnels were built.</span>'}</div></div>`;}
function opsSideClick(e){const b=e.target.closest('[data-act]'),li=e.target.closest('[data-line]');
  if(b&&!b.disabled){const a=b.dataset.act,id=UI.sel||'CC';
    if(a==='send')openTransfer(id,null);if(a==='fix')act(fix(id,b.dataset.sys));if(a==='lioh')act(useLioh(id));if(a==='order')act(order(b.dataset.code,id,1));
    if(a==='xf')openTransfer(b.dataset.a,b.dataset.b);if(a==='repair'){const l=S.links[UI.selLink];act(repair(l.a,l.b,b.dataset.from));}
    if(a==='stop'){const f=S.flows.find(x=>x.id===+b.dataset.id);act(setFlow(f.type,f.from,f.to,0));}if(a==='newx')openTransfer(id,null);return;}
  if(li){UI.selLink=+li.dataset.line;UI.tab='shelter';blip();refresh();}}
function bindFlows(){document.querySelectorAll('#side input[data-fid]').forEach(inp=>{
  inp.addEventListener('input',()=>{const f=S.flows.find(x=>x.id===+inp.dataset.fid);inp.nextElementSibling.textContent=`Set ${num(+inp.value)} ${UNIT[f.type]} · release to apply`;});
  inp.addEventListener('change',()=>{const f=S.flows.find(x=>x.id===+inp.dataset.fid);act(setFlow(f.type,f.from,f.to,+inp.value));});});}

/* ---------------- people ---------------- */
const CRAWL=80;
function peopleRoute(a,b){const r=bfs(a,b,i=>passable(S.links[i])&&((S.pmoved||{})[i]||0)<CRAWL);if(!r)return null;r.cap=Math.min(...r.links.map(i=>CRAWL-((S.pmoved||{})[i]||0)));return r;}
function movePeople(a,b,n){const A=st(a),B=st(b);if(!A||!B||A.lost||A.evac||B.lost||B.evac)return [false,'One of those shelters is dark.'];
  const r=peopleRoute(a,b);if(!r)return [false,`No open crawlway connects ${a} and ${b}, or this shift's capacity is used up.`];
  n=Math.min(n,r.cap,Math.max(0,A.pop-A.staff));if(n<=0)return [false,`${a} has nobody it can send.`];
  A.pop-=n;B.pop+=n;B.morale=clamp(B.morale-n/40,0,100);A.morale=clamp(A.morale+n/60,0,100);S.pmoved=S.pmoved||{};for(const i of r.links)S.pmoved[i]=(S.pmoved[i]||0)+n;
  if(S.stats)S.stats.people=(S.stats.people||0)+n;ev(`${n} people walked from ${a} to ${b} via ${r.nodes.join('-')}.`,true);
  return [true,`${n} people are walking from ${a} to ${b} through ${r.nodes.join(' → ')}.`];}
/* ---------------- transfer dialog ---------------- */
function openTransfer(from,to){
  if(!to){to=neighbors(from).find(x=>!st(x).lost&&!st(x).evac)||ids().find(x=>x!==from);}
  if(!to||to===from){toast('There is no other shelter to send to.',true);return;}
  const cur=t=>(S.flows.find(f=>f.type===t&&f.from===from&&f.to===to)||{}).amt||0;
  UI.modal={type:'xfer',from,to,vals:{W:cur('W'),A:cur('A'),P:cur('P')},orig:{W:cur('W'),A:cur('A'),P:cur('P')}};setPick(null);renderTransfer();}
function preview(m){const save=S.flows.map(f=>({...f}));
  for(const t of ['W','A','P']){const ex=S.flows.find(f=>f.type===t&&f.from===m.from&&f.to===m.to);if(ex)ex.amt=m.vals[t];else if(m.vals[t]>0)S.flows.push({id:-1,type:t,from:m.from,to:m.to,amt:m.vals[t]});}
  S.flows=S.flows.filter(f=>f.amt>0);const N=compute(),res={};for(const t of ['W','A','P']){const f=S.flows.find(f=>f.type===t&&f.from===m.from&&f.to===m.to);res[t]=f?{actual:f.actual,got:f.got,note:f.note}:null;}
  S.flows=save;compute();return {N,res};}
function renderTransfer(){const m=UI.modal;
  const opt=sel=>ids().filter(i=>!st(i).lost&&!st(i).evac).map(i=>`<option value="${i}" ${i===sel?'selected':''}>${i} ${esc(st(i).name)}</option>`).join('');
  let h=`<h2>Send between shelters</h2><div class="row" style="justify-content:flex-start;gap:10px"><label class="lbl" for="xFrom">From</label><select id="xFrom" class="btn">${opt(m.from)}</select><button class="btn small" id="xSwap" type="button" title="Swap">⇄</button><label class="lbl" for="xTo">To</label><select id="xTo" class="btn">${opt(m.to)}</select></div>`;
  for(const t of ['W','A','P']){const r=staticRoute(t,m.from,m.to),mx=r?Math.max(m.vals[t],routeMax(t,m.from,m.to)):0,step={W:100,A:10,P:5}[t],nm=cap1(RNAME[t]);
    if(!r){h+=`<div class="xres na"><div class="top"><i class="ico" style="--c:${COL[t]}"></i><h3>${nm}</h3></div><div class="dim">No working ${t==='W'?'water main':t==='A'?'air duct':'power cable'} connects these shelters.</div></div>`;continue;}
    h+=`<div class="xres"><div class="top"><i class="ico" style="--c:${COL[t]}"></i><h3>${nm}</h3><input type="number" id="xn${t}" min="0" max="${mx}" step="${step}" value="${m.vals[t]}" aria-label="${nm} amount"><span class="dim">${UNIT[t]}</span></div>
      <input type="range" id="xr${t}" min="0" max="${mx}" step="${step}" value="${m.vals[t]}" style="--c:${COL[t]}" aria-label="${nm} slider"><div class="row dim" style="font-size:14px"><span>Route ${r.nodes.join(' → ')} · line limit ${num(mx)} ${UNIT[t]}</span><span>${spare(t,m.from)}</span></div><div id="xp${t}" style="font-size:14px"></div></div>`;}
  {const pr=peopleRoute(m.from,m.to),A=st(m.from),avail=Math.max(0,A.pop-A.staff),mx=pr?Math.min(pr.cap,avail):0;
   h+=`<div class="xres${pr&&mx?'':' na'}"><div class="top"><i class="ico" style="--c:var(--paper)"></i><h3>People</h3>${pr&&mx?`<input type="number" id="xnH" min="0" max="${mx}" step="5" value="${Math.min(mx,40)}" aria-label="People to move"><button class="btn small" id="xMove" type="button">Move now</button>`:''}</div>
     ${pr&&mx?`<input type="range" id="xrH" min="0" max="${mx}" step="5" value="${Math.min(mx,40)}" style="--c:var(--paper)" aria-label="People slider"><div class="row dim" style="font-size:14px"><span>Crawlway ${pr.nodes.join(' → ')} · ${pr.cap} more can pass this shift</span><span>${m.to} has ${st(m.to).pop} on ${st(m.to).cap} beds</span></div>`
     :`<div class="dim">${pr?`${m.from} has nobody it can send.`:'No open crawlway between these shelters, or this shift\'s capacity is used up. Collapsed and severed tunnels cannot be walked.'}</div>`}</div>`;}
  h+=`<div class="fx" id="xfx"></div><div class="dim" style="font-size:13px">A flow repeats every shift until you change it.${S.grid?' Before the grid fails, air and power flows wait on standby; water flows run now.':''}</div>
    <div class="foot"><button class="btn" id="xCancel" type="button">Cancel</button><button class="btn primary" id="xApply" type="button">Apply flows</button></div>`;
  modal(h,760);
  const re=()=>{const f=$('#xFrom').value,t=$('#xTo').value;openTransfer(f,t===f?null:t);};$('#xFrom').onchange=re;$('#xTo').onchange=re;
  $('#xSwap').onclick=()=>openTransfer(m.to,m.from);$('#xCancel').onclick=closeModal;$('#xApply').onclick=applyTransfer;
  for(const t of ['W','A','P']){const r=$('#xr'+t),n=$('#xn'+t);if(!r)continue;r.oninput=()=>{m.vals[t]=+r.value;n.value=r.value;updatePreview();};n.oninput=()=>{m.vals[t]=clamp(+n.value||0,0,+n.max);r.value=m.vals[t];updatePreview();};}
  if($('#xMove')){const r=$('#xrH'),n=$('#xnH');r.oninput=()=>{n.value=r.value;};n.oninput=()=>{r.value=n.value;};$('#xMove').onclick=()=>{const res=movePeople(m.from,m.to,+n.value);toast(res[1],!res[0]);res[0]?blip():buzz();UI.N=compute();refresh();openTransfer(m.from,m.to);};}
  updatePreview();}
function spare(t,id){const s=st(id),n=UI.N[id];if(t==='W')return `${id} holds ${num(s.water)} L`;if(S.grid)return 'standby until the grid fails';
  if(t==='A'){const sp=R0(n.scrubOut-n.need);return sp>0?`${id} has ${num(sp)} CFM spare`:`<span class="neg">${id} has no spare air</span>`;}
  const sp=R0(n.gen-n.load);return sp>0?`${id} has ${sp} kW spare`:`<span class="neg">${id} has no spare power</span>`;}
function updatePreview(){const m=UI.modal,p=preview(m),N0=UI.N,N1=p.N;
  for(const t of ['W','A','P']){const el=$('#xp'+t);if(!el)continue;const r=p.res[t];
    el.innerHTML=!m.vals[t]?`<span class="dim">${m.orig[t]?'This will stop the current flow.':'No flow.'}</span>`:r?`Moves <b class="num">${num(r.actual)}</b> ${UNIT[t]}, <b class="num">${num(r.got)}</b> arrives after line losses. <span class="${r.note==='LIVE'||r.note==='STANDBY'?'pos':'neg'}">${r.note.toLowerCase()}</span>`:'';}
  const side=id=>{const a=N0[id],b=N1[id],row=(lab,x,y,u)=>`<div class="row"><span>${lab}</span><span class="num">${x} → <b class="${y<x?'neg':y>x?'pos':''}">${y}</b>${u}</span></div>`;
    return `<b>${id} ${esc(st(id).name)}</b>${war()?row('Air trend',R0(a.airDelta),R0(b.airDelta),'/sh'):''}${row('Water net',R0(a.wnet),R0(b.wnet),' L')}${S.grid?'':row('Power balance',R0(a.bal),R0(b.bal),' kW')}`;};
  $('#xfx').innerHTML=`<div>${side(m.from)}</div><div>${side(m.to)}</div>`;}
function applyTransfer(){const m=UI.modal,msgs=[];let ok=true;for(const t of ['W','A','P'])if(m.vals[t]!==m.orig[t]&&$('#xr'+t)){const [o,msg]=setFlow(t,m.from,m.to,m.vals[t]);ok=ok&&o;msgs.push(msg);}
  closeModal();if(msgs.length){toast(msgs.join(' '),!ok);ok?blip():buzz();}else toast('No changes.');}

/* ---------------- mail, report, end ---------------- */
function openMail(id){if(!S||!S.mails.length){toast('No mail yet.');return;}if(id==null){const un=S.mails.find(x=>!x.read);id=un?un.id:S.mails[S.mails.length-1].id;}UI.modal={type:'mail',id};renderMail();}
function renderMail(){const m=S.mails.find(x=>x.id===UI.modal.id);m.read=true;const list=[...S.mails].reverse();
  let h=`<div class="row"><h2>Mail · ${S.mails.length} messages</h2><button class="btn small" id="mClose" type="button">Close</button></div>
  <div class="mail"><div class="mlist" id="mlist" role="listbox" aria-label="Messages">${list.map(x=>`<div class="mitem${x.id===m.id?' sel':''}${!x.read?' unread':''}${x.flash?' flash':''}" data-mid="${x.id}" role="option" aria-selected="${x.id===m.id}"><span class="s">${esc(x.subj)}${x.opts&&x.resolved===null?' <span style="color:var(--amber)">?</span>':''}</span><span class="f">${esc(fromName(x.from))} · ${shortT(x.shift)}</span></div>`).join('')}</div>
  <div class="reader"><div class="hd"><span class="lbl">From</span><span>${esc(fromFull(m.from))}</span><span class="lbl">Sent</span><span class="num">${dtg(m.shift)}</span><span class="lbl">Subject</span><b>${esc(m.subj)}</b></div><pre class="${m.flash?'flash':''}">${esc(m.body)}</pre>`;
  if(m.opts){if(m.resolved===null)h+=`<div class="opts">${m.opts.map((o,i)=>`<button class="btn" data-ans="${i}" type="button">${i+1}. ${esc(o)}</button>`).join('')}</div>`;else h+=`<div><span class="lbl">You replied</span><div><b>${esc(m.opts[m.resolved])}</b></div><div class="dim">${esc(m.reply)}</div></div>`;}
  h+=`<div class="actions">${S.sites[m.from]?`<button class="btn small" data-show="${m.from}" type="button">Show ${m.from} on the map</button>`:''}</div><div class="dim" style="font-size:13px">Up / Down: next message · ${m.opts&&m.resolved===null?'1–'+m.opts.length+': answer · ':''}Esc: close</div></div></div>`;
  modal(h,1000);$('#mClose').onclick=closeModal;
  $('#mlist').onclick=e=>{const it=e.target.closest('[data-mid]');if(it){UI.modal.id=+it.dataset.mid;blip();renderMail();}};
  document.querySelectorAll('[data-ans]').forEach(b=>b.onclick=()=>answerMail(m,+b.dataset.ans));
  const sb=document.querySelector('[data-show]');if(sb)sb.onclick=()=>{const id=sb.dataset.show;closeModal();UI.sel=id;UI.selLink=null;UI.tab='shelter';refresh();};
  const sel=document.querySelector('.mitem.sel');if(sel)sel.scrollIntoView({block:'nearest'});renderBar();}
function answerMail(m,i){if(m.resolved!==null)return;const fx=EFFECTS[m.key]?.[i];if(!fx)return;const [ok,msg]=fx(m);if(!ok){toast(msg,true);buzz();return;}
  m.resolved=i;m.reply=msg;ev(`Answered ${m.from} "${m.subj}": ${m.opts[i]}.`,true);toast('Reply sent. '+msg);blip();UI.N=compute();renderMail();}
function stepMail(d){const list=[...S.mails].reverse(),k=list.findIndex(x=>x.id===UI.modal.id),n=clamp(k+d,0,list.length-1);if(n!==k){UI.modal.id=list[n].id;tone(1500,.01,.015);renderMail();}}
function openReport(){UI.modal={type:'report'};const nm=S.mails.filter(m=>m.shift===S.shift),ws=S.shift===WAR;
  modal(`<h2 style="${ws?'color:var(--bad)':''}">${ws?'DEFCON 1 · Sirens':'Shift report'} · ${dtg(S.shift)}</h2><ul class="evlist">${S.events.map(e=>`<li>${esc(e)}</li>`).join('')||'<li class="dim">Quiet shift.</li>'}</ul>
  ${nm.length?`<div class="sect"><span class="lbl">New mail</span><div class="opts">${nm.map(m=>`<button class="btn" data-open="${m.id}" type="button" style="${m.flash?'color:#ffb4a8':''}">${esc(fromName(m.from))}: ${esc(m.subj)}</button>`).join('')}</div></div>`:''}
  <div class="foot"><button class="btn" id="rClose" type="button">Back to the board</button>${nm.length?'<button class="btn primary" id="rMail" type="button">Read mail</button>':''}</div>`);
  $('#rClose').onclick=closeModal;if($('#rMail'))$('#rMail').onclick=()=>openMail(nm[0].id);document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openMail(+b.dataset.open));}
function record(){if(!S.hist)return;const pop={},air={},water={};let alive=0,dead=0,w=0,f=0,fd=0;
  for(const id of ids()){const s=st(id);pop[id]=s.pop;air[id]=R0(s.air);water[id]=s.water;alive+=s.pop;dead+=s.dead;w+=s.water;f+=s.fuel;fd+=s.food;}
  S.hist.push({t:S.shift,pop,air,water,alive,dead,water_t:w,fuel_t:f,food_t:fd,links:S.links.filter(l=>l.ok).length});}
function niceMax(v){if(v<=0)return 1;const p=Math.pow(10,Math.floor(Math.log10(v))),m=v/p;return (m<=1?1:m<=2?2:m<=2.5?2.5:m<=5?5:10)*p;}
const shiftLabel=t=>{const h=6+t*6,d=Math.floor(h/24);return `Day ${d+1} ${String(h%24).padStart(2,'0')}:00`;};
function chartSVG(vals,{w=640,h=150,color='var(--amber)',unit='',mini=false,max=null}={}){
  const n=vals.length,top=niceMax(max??Math.max(1,...vals)),pl=mini?2:52,pr=mini?2:10,pt=mini?4:10,pb=mini?4:22,iw=w-pl-pr,ih=h-pt-pb;
  const X=i=>pl+(n>1?i/(n-1):0)*iw,Y=v=>pt+ih-clamp(v/top,0,1)*ih;
  const pts=vals.map((v,i)=>`${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  let g='';
  if(!mini){for(const f of [0,.5,1]){const yy=Y(top*f);g+=`<line x1="${pl}" x2="${w-pr}" y1="${yy}" y2="${yy}" stroke="#3a3050" stroke-width="1"/><text x="${pl-6}" y="${yy+4}" text-anchor="end" class="ax">${num(top*f)}</text>`;}
    g+=`<text x="${pl}" y="${h-6}" class="ax">${shiftLabel(S.hist[0].t)}</text><text x="${w-pr}" y="${h-6}" text-anchor="end" class="ax">${shiftLabel(S.hist[n-1].t)}</text>`;}
  const last=vals[n-1];
  return `<svg class="chart${mini?' mini':''}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="${unit}" data-vals="${vals.join(',')}" data-pl="${pl}" data-iw="${iw}" data-pt="${pt}" data-ih="${ih}" data-top="${top}" data-unit="${unit}">${g}
    <polygon points="${X(0)},${pt+ih} ${pts} ${X(n-1)},${pt+ih}" fill="${color}" fill-opacity=".16"/>
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
    <circle cx="${X(n-1)}" cy="${Y(last)}" r="${mini?2.5:4}" fill="${color}" stroke="var(--panel)" stroke-width="2" vector-effect="non-scaling-stroke"/>
    <line class="xh" x1="0" x2="0" y1="${pt}" y2="${pt+ih}" stroke="var(--paper)" stroke-width="1" vector-effect="non-scaling-stroke" visibility="hidden"/>
    <rect x="0" y="0" width="${w}" height="${h}" fill="transparent"/></svg>`;}
function bindCharts(root){root.querySelectorAll('svg.chart').forEach(sv=>{
  const vals=sv.dataset.vals.split(',').map(Number),pl=+sv.dataset.pl,iw=+sv.dataset.iw,xh=sv.querySelector('.xh'),out=sv.parentElement.querySelector('.readout');
  const show=e=>{const r=sv.getBoundingClientRect(),vb=sv.viewBox.baseVal,px=(e.clientX-r.left)*vb.width/r.width,i=clamp(Math.round((px-pl)/Math.max(1,iw)*(vals.length-1)),0,vals.length-1),x=pl+(vals.length>1?i/(vals.length-1):0)*iw;
    xh.setAttribute('x1',x);xh.setAttribute('x2',x);xh.setAttribute('visibility','visible');if(out)out.textContent=`${shiftLabel(S.hist[i].t)}: ${num(vals[i])} ${sv.dataset.unit}`;};
  sv.addEventListener('pointermove',show);sv.addEventListener('pointerdown',show);
  sv.addEventListener('pointerleave',()=>{xh.setAttribute('visibility','hidden');if(out)out.textContent=out.dataset.rest;});});}
function openEnd(){UI.modal={type:'end'};const won=S.over==='won',H=S.hist.length?S.hist:[{t:S.shift,pop:{},air:{},water:{},alive:0,dead:0,water_t:0,fuel_t:0,food_t:0}];
  let alive=0,dead=0;for(const id of ids()){alive+=st(id).pop;dead+=st(id).dead;}
  const total=alive+dead,pct=total?alive/total:0,b=buildTotals(),spent=b.sites+b.tun,days=(S.shift*6/24);
  const rating=!won?'The board went dark before relief arrived.':pct>.95?'Nearly every shelter held. Hollis will want to know how.':pct>.8?'The region held. Not everyone came up the elevators.':pct>.55?'Most came home. The tunnels remember the rest.':pct>.3?'Relief found the shelters half empty.':'Relief found more silence than voices.';
  const M=G.mission!=null?MISSIONS[G.mission]:null,passed=!!(M&&won&&pct>=M.pass);if(M&&!UI.saved){UI.saved=true;saveResult(G.mission,won?pct:0,passed);}
  const tile=(l,v,sub='',cls='')=>`<div><span class="lbl">${l}</span><span class="v ${cls}">${v}</span>${sub?`<span class="dim" style="font-size:13px">${sub}</span>`:''}</div>`;
  const ro=(txt)=>`<div class="readout dim" data-rest="${esc(txt)}">${esc(txt)}</div>`;
  const rows=ids().map(id=>{const s=st(id),pv=H.map(h=>h.pop[id]||0),minAir=Math.min(...H.map(h=>h.air[id]??100)),dry=H.filter(h=>h.water[id]===0).length,start=Math.max(...pv,1);
    return `<tr><td>${id} ${esc(s.name.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()))}</td><td class="spark">${chartSVG(pv,{w:160,h:34,mini:true,unit:'people',max:start})}</td><td class="num">${s.pop}</td><td class="num ${s.dead?'neg':''}">${s.dead}</td><td class="num ${minAir<45?'neg':''}">${minAir}%</td><td class="num ${dry?'neg':''}">${dry}</td><td>${s.evac?'Evacuated':s.lost?'<span class="neg">Lost</span>':'Holding'}</td></tr>`;}).join('');
  const causes=Object.entries(S.stats?.cause||{}).sort((a,b)=>b[1]-a[1]),cmax=Math.max(1,...causes.map(c=>c[1]));
  const st_=S.stats||{moved:{}};
  modal(`<div class="row"><h2>${won?`Relief convoy at Shelter Control · ${dtg(S.shift)}`:'Shelter Control has stopped transmitting'}</h2></div>
${M?`<div class="mresult ${passed?'pass':'fail'}"><span class="lbl">Mission ${G.mission+1} · ${esc(M.title)}</span><b>${passed?'Passed':'Failed'}</b> ${starsFor(G.mission,pct,won)} <span class="dim">Needed ${R0(M.pass*100)}% alive at relief.</span></div>`:''}
  <div class="big">${rating}</div>
  <div class="kv">${tile('People alive',`${num(alive)} / ${num(total)}`,`${R0(pct*100)}% of everyone sheltered`,pct<.5?'neg':pct>.85?'pos':'')}${tile('Dead',num(dead),'',dead?'neg':'')}${tile('Sealed',`${days.toFixed(1)} days`,`${S.shift} shifts`)}${tile('Construction',mil(spent),`${money(spent/Math.max(1,alive))} per survivor`)}</div>
  <div class="sect"><span class="lbl">People alive across the region</span>${chartSVG(H.map(h=>h.alive),{unit:'people alive'})}${ro('Hover the chart to read any shift.')}</div>
  <div class="sect"><span class="lbl">Shelter by shelter</span><div style="overflow-x:auto"><table class="res"><thead><tr><th>Shelter</th><th>People over time</th><th>Alive</th><th>Dead</th><th>Lowest air</th><th>Shifts dry</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div></div>
  <div class="endcols">
    <div class="sect"><span class="lbl">Causes of death</span>${causes.length?`<div class="cause">${causes.map(([c,v])=>`<span>${esc(cap1(c).replace('Co2','CO₂'))}</span><div class="meter"><i style="width:${v/cmax*100}%;--c:var(--amber)"></i></div><span class="num">${num(v)}</span>`).join('')}</div>`:'<div class="pos">Nobody died.</div>'}</div>
    <div class="sect"><span class="lbl">What you did</span><div class="kv">${tile('Overhauls',st_.overhauls||0)}${tile('LiOH opened',st_.lioh||0)}${tile('Tunnel repairs',st_.repairs||0)}${tile('Flows set',st_.flowsSet||0)}${tile('Water moved',`${num(st_.moved.W||0)} L`)}${tile('Power moved',`${num((st_.moved.P||0)*6)} kWh`)}${tile('Taken in at hatches',st_.taken||0)}${tile('Evacuations',st_.evacs||0)}${tile('People walked',st_.people||0)}${tile('Events survived',st_.events||0)}${tile('Tunnels cut',st_.cuts||0)}</div></div>
  </div>
  <div class="sect"><span class="lbl">Stores across the network</span><div class="endcols three">
    <div><div class="dim" style="font-size:13px">Water, L</div>${chartSVG(H.map(h=>h.water_t),{w:320,h:120,color:'var(--water)',unit:'L of water'})}${ro(`End: ${num(H[H.length-1].water_t)} L`)}</div>
    <div><div class="dim" style="font-size:13px">Diesel, L</div>${chartSVG(H.map(h=>h.fuel_t),{w:320,h:120,color:'var(--fuel)',unit:'L of diesel'})}${ro(`End: ${num(H[H.length-1].fuel_t)} L`)}</div>
    <div><div class="dim" style="font-size:13px">Food, person-days</div>${chartSVG(H.map(h=>h.food_t),{w:320,h:120,color:'#c9a46a',unit:'person-days of food'})}${ro(`End: ${num(H[H.length-1].food_t)} person-days`)}</div>
  </div></div>
  <div class="foot"><button class="btn" id="eBoard" type="button">Look at the board</button><button class="btn" id="eMenu" type="button">Main menu</button>${M?`<button class="btn" id="eRetry" type="button">Retry mission</button>${passed&&G.mission<MISSIONS.length-1?'<button class="btn primary" id="eNext" type="button">Next mission ▸</button>':''}`:'<button class="btn" id="eSame" type="button">Rebuild on this map</button><button class="btn primary" id="eNew" type="button">New region</button>'}</div>`,1100);
  bindCharts($('#modalRoot'));
  $('#eBoard').onclick=closeModal;$('#eMenu').onclick=()=>{closeModal();openMenu();};
  if($('#eRetry'))$('#eRetry').onclick=()=>{closeModal();startMission(G.mission);};
  if($('#eNext'))$('#eNext').onclick=()=>{closeModal();startMission(G.mission+1);};
  if($('#eNew'))$('#eNew').onclick=()=>{closeModal();startFreeBuild();};
  if($('#eSame'))$('#eSame').onclick=()=>{G.phase='build';S=G.S=null;UI.sel=null;UI.selLink=null;UI.tab='site';recomputeRoads();closeModal();};}


/* ---------------- random event deck ---------------- */
function pickW(items,wf){const w=items.map(wf),tot=w.reduce((a,b)=>a+b,0);if(tot<=0)return null;let x=rnd()*tot;for(let i=0;i<items.length;i++){x-=w[i];if(x<=0)return items[i];}return items[items.length-1];}
const DECK=[
  {k:'leak',w:3,max:6,tier:1},{k:'fire',w:2.5,max:5,tier:1},{k:'scrubfault',w:2.5,max:5,tier:1},{k:'birth',w:1.2,max:2,tier:1},{k:'rats',w:1.4,max:2,tier:1},{k:'volunteer',w:1.2,max:2,tier:1},
  {k:'aftershock',w:3,max:5,tier:2},{k:'genloss',w:2.5,max:4,tier:2},{k:'hatch',w:2.5,max:4,tier:2},{k:'radio',w:1,max:1,tier:2},{k:'crowding',w:1.6,max:2,tier:2},
  {k:'flood',w:2,max:3,tier:3},{k:'fuelbad',w:1.5,max:2,tier:3},{k:'collapse',w:1.7,max:2,tier:3},{k:'breach',w:1.5,max:2,tier:3},{k:'coleak',w:1.5,max:2,tier:3},
  {k:'sick',w:2,max:3,tier:4},{k:'vent',w:2,max:2,tier:4},{k:'fever',w:1.5,max:2,tier:4},{k:'badfood',w:1.3,max:2,tier:4},{k:'stairs',w:1.3,max:2,tier:4},
  {k:'plume',w:1.5,max:2,tier:5},{k:'delay',w:1.2,max:2,tier:5}];
function drawEvents(){const e=S.evRate||[.08,.5,.86],r=rnd(),n=r<e[0]?0:r<e[1]?1:r<e[2]?2:3;
  for(let i=0;i<n;i++){const pool=DECK.filter(d=>(d.tier||1)<=(S.tier||5)&&(S.deck[d.k]||0)<d.max);const d=pickW(pool,x=>x.w);if(!d)return;if(runEvent(d.k)&&S.stats.events++>=0)S.deck[d.k]=(S.deck[d.k]||0)+1;}}
function runEvent(k){const live=liveShelters();if(!live.length)return false;const any=()=>live[Math.floor(rnd()*live.length)];
  switch(k){
    case 'aftershock':{const ch=[];for(const l of S.links){if(!l.ok)continue;const r=rnd(),f=1-l.rel;if(r<f*.35){l.ok=false;l.hp=0;S.stats.cuts++;ch.push(`${linkName(l)} severed`);}else if(r<f*.9){l.hp=Math.max(20,l.hp-R0(25+rnd()*30));ch.push(`${linkName(l)} down to ${l.hp}%`);}}
      for(const id of live){const s=st(id);s.hull=Math.max(0,R0(s.hull-(1-s.prot)*12*rnd()));}
      ev(`Aftershock.${ch.length?' '+ch.join(', ')+'.':' The tunnels held.'}`);sendKey('aftershock',{ch});return true;}
    case 'genloss':{const c=pickW(live.filter(i=>st(i).gcap&&st(i).gen>20),i=>1.1-st(i).prot);if(!c)return false;st(c).gen=Math.max(0,st(c).gen-40);ev(`${c} generator plant damaged.`);sendKey('genloss',{s:c});return true;}
    case 'vent':{const c=pickW(live.filter(i=>st(i).scrubCap&&st(i).scrub>30),()=>1);if(!c)return false;st(c).scrub=Math.max(0,st(c).scrub-35);ev(`${c} scrubber housing cracked.`);sendKey('vent',{s:c});return true;}
    case 'fire':{const c=any();st(c).air=clamp(st(c).air-15,0,100);st(c).morale-=5;ev(`Cable vault fire at ${c}. Air -15.`);sendKey('fire',{s:c});return true;}
    case 'leak':{const c=pickW(live.filter(i=>st(i).water>500),()=>1);if(!c)return false;const s=st(c),lost=R0(s.water*.12);s.water-=lost;s.leak+=120;ev(`${c} tank seam split: -${num(lost)} L, still leaking.`);sendKey('leak',{s:c,lost});return true;}
    case 'flood':{const c=pickW(live.filter(i=>st(i).sandM>6),i=>st(i).sandM);if(!c)return false;const s=st(c);s.hull=Math.max(0,s.hull-12);s.plant=Math.max(0,s.plant-30);const lost=R0(s.water*.25);s.water-=lost;ev(`${c}: groundwater through the sand lining. Water plant -30%, ${num(lost)} L contaminated.`);sendKey('flood',{s:c,lost});return true;}
    case 'fuelbad':{const c=pickW(live.filter(i=>st(i).gcap&&st(i).fuel>500),()=>1);if(!c)return false;const s=st(c),lost=R0(s.fuel*.35);s.fuel-=lost;ev(`${c}: contaminated diesel, ${num(lost)} L drained.`);sendKey('fuelbad',{s:c,lost});return true;}
    case 'sick':{const c=pickW(live,i=>st(i).pop/Math.max(1,st(i).cap));if(!c)return false;const s=st(c);s.morale-=15;casualties(s,s.pop*.01,'dysentery');sendKey('sick',{s:c});return true;}
    case 'hatch':{const done=S.flags.hatchDone||[];const cand=live.filter(i=>!done.includes(i));if(!cand.length)return false;
      const c=pickW(cand,i=>{const [t,d]=nearestTown(st(i).x,st(i).y);return 1/(1+d/20);});const [t]=nearestTown(st(c).x,st(c).y);
      S.flags.hatchDone=[...done,c];sendKey('hatch',{s:c,town:t.name,n:40+Math.floor(rnd()*10)*10});return true;}
    case 'delay':{const d=1+(rnd()<.35?1:0);S.relief+=d;ev(`Relief convoy delayed ${d*6} hours.`);sendKey('delay',{d});return true;}
    case 'scrubfault':{const c=pickW(live.filter(i=>st(i).scrubCap),()=>1);if(!c)return false;st(c).scrub=Math.max(0,st(c).scrub-15);ev(`${c} scrubber fan bearing failing. -15%.`);return true;}
    case 'birth':{const c=any(),s=st(c);s.pop+=1;s.morale=clamp(s.morale+10,0,100);ev(`A baby was born at ${c}.`);sendKey('birth',{s:c});return true;}
    case 'rats':{const c=pickW(live.filter(i=>st(i).food>300),()=>1);if(!c)return false;const s=st(c),lost=R0(s.food*.12);s.food-=lost;ev(`Rats in the ${c} storeroom: ${num(lost)} rations spoiled.`);sendKey('rats',{s:c,lost});return true;}
    case 'volunteer':{const c=any();st(c).spares++;ev(`${c}: a machinist from town rebuilt a spare kit from salvage.`);sendKey('volunteer',{s:c});return true;}
    case 'radio':{for(const i of live)st(i).morale=clamp(st(i).morale+6,0,100);ev('A radio broadcast from the capital: the government is functioning. Morale up everywhere.');sendKey('radio');return true;}
    case 'crowding':{const c=pickW(live,i=>{const [t,d]=nearestTown(st(i).x,st(i).y);return 1/(1+d/20);});const s=st(c),n=R0(s.cap*(.08+rnd()*.08));s.pop+=n;ev(`${n} more people from town reached ${c} through a service adit.`);sendKey('crowding',{s:c,n});return true;}
    case 'collapse':{const cand=S.links.filter(l=>!l.collapsed&&l.ok);if(!cand.length)return false;const l=pickW(cand,x=>1.05-x.rel);l.collapsed=true;S.stats&&S.stats.cuts++;const kept=[],lost=[];
      for(const k of ['W','A','P'])if(l.cap[k]>0){if(rnd()<.5){l.cap[k]=0;lost.push(RNAME[k].toLowerCase());}else kept.push(RNAME[k].toLowerCase());}
      if(!kept.length){l.ok=false;l.hp=0;}
      ev(`The ${linkName(l)} tunnel collapsed. No passage for people.${kept.length?` Still carrying ${kept.join(' and ')}.`:' Every line in it is gone.'}`);sendKey('collapse',{l:linkName(l),kept,lost});return true;}
    case 'breach':{const c=pickW(live,i=>1.1-st(i).prot);if(!c)return false;const s=st(c);s.hull=Math.max(0,s.hull-12);s.air=clamp(s.air-8,0,100);s.morale-=8;ev(`${c}: the outer blast door seal failed. Fallout in the entry, hull -12.`);sendKey('breach',{s:c});return true;}
    case 'coleak':{const c=pickW(live.filter(i=>st(i).gcap),()=>1);if(!c)return false;const s=st(c);s.air=clamp(s.air-10,0,100);s.gen=Math.max(0,s.gen-10);ev(`${c}: generator exhaust leaking into the gallery. Air -10.`);sendKey('coleak',{s:c});return true;}
    case 'fever':{const c=pickW(live.filter(i=>!st(i).busy),()=>1);if(!c)return false;const s=st(c);s.ill=2;s.busy='STAFF DOWN WITH FEVER';ev(`${c}: half the staff are down with fever. No repairs there for a while.`);sendKey('fever',{s:c});return true;}
    case 'badfood':{const c=pickW(live.filter(i=>st(i).food>300),()=>1);if(!c)return false;const s=st(c),lost=R0(s.food*.2);s.food-=lost;s.morale-=5;ev(`${c}: a batch of rations went bad. ${num(lost)} thrown out.`);sendKey('badfood',{s:c,lost});return true;}
    case 'stairs':{const c=pickW(live,i=>st(i).pop/Math.max(1,st(i).cap));const s=st(c);s.morale-=10;casualties(s,s.pop*.005,'crush on the stairs');sendKey('stairs',{s:c});return true;}
    case 'plume':{const hit=live.filter(i=>st(i).hull<80);if(!hit.length)return false;for(const i of hit)st(i).air=clamp(st(i).air-8,0,100);ev(`Heavy fallout plume over the region. Air -8 at ${hit.join(', ')}.`);sendKey('plume',{hit});return true;}
  }return false;}
function checkEvac(){const N=compute();
  for(const id of liveShelters()){if(S.flags['ev'+id])continue;const s=st(id),n=N[id],sh=n.wnet<0?s.water/-n.wnet:99;
    if(!(s.air<55||sh<2||(s.food<=0&&s.hungry>1)))continue;
    const to=neighbors(id).find(x=>{const l=findLink(id,x);return passable(l)&&x!=='CC'&&!st(x).lost&&!st(x).evac&&st(x).pop<st(x).cap*1.2;});
    if(to){S.flags['ev'+id]=1;sendKey('evac',{s:id,to});return;}}}
Object.assign(MAILS,{
  birth:p=>({from:p.s,subj:'A GIRL, 3.1 KG',body:`Control,\n\nA baby girl was born in the bunk bays at ${shortT(S.shift)}. Mother and child are fine. The staff gave her the last of the oranges.\n\nPeople are smiling for the first time since the doors shut.\n${sig(p.s)}`}),
  rats:p=>({from:p.s,subj:'RATS',body:`Control,\n\nRats got into the storeroom through a cable duct. ${num(p.lost)} rations are spoiled. We have sealed the duct with grout and a mattress.\n${sig(p.s)}`}),
  volunteer:p=>({from:p.s,subj:'A MACHINIST',body:`Control,\n\nOne of the people from town ran a machine shop. He took apart a dead fan motor and a bunk frame and made us a working spares kit. We hold ${kits(st(p.s).spares)} now.\n${sig(p.s)}`}),
  radio:()=>({from:'SYS',subj:'BROADCAST RECEIVED',body:`Emergency broadcast received on the national band:\n\n"THE GOVERNMENT IS FUNCTIONING. STAY IN YOUR SHELTERS. RELIEF IS BEING ORGANIZED REGION BY REGION."\n\nRelayed to all shelters.`}),
  crowding:p=>({from:p.s,subj:'MORE PEOPLE',body:`Control,\n\n${p.n} more people from town found the service adit and came in before we could seal it. We are ${st(p.s).pop} on ${st(p.s).cap} beds.\n\nIf a neighbour has room, we can walk people through the tunnel. Use the transfer panel and choose People.\n${sig(p.s)}`}),
  collapse:p=>({from:'ENG',subj:`TUNNEL ${p.l} COLLAPSED`,body:`Controller,\n\nThe ${p.l} tunnel has collapsed along a stretch of about thirty metres. The crawlway is gone; nobody will walk through it again.\n\n${p.kept.length?`The ${p.kept.join(' and ')} line${p.kept.length>1?'s are':' is'} still live inside the rubble.`:'Every line in it is cut.'}${p.lost.length?` Lost: ${p.lost.join(', ')}.`:''} This cannot be repaired from inside.\n- CHIEF ENG. K. DOSS`}),
  breach:p=>({from:p.s,subj:'OUTER DOOR SEAL',body:`Control,\n\nThe seal on the outer blast door failed under the last shock. Fallout dust in the entry and the intake room. We have closed the inner door and taped the frame. Hull integrity ${R0(st(p.s).hull)}%.\n${sig(p.s)}`}),
  coleak:p=>({from:p.s,subj:'EXHAUST LEAK',body:`Control,\n\nThe generator exhaust stack cracked where it passes the gallery. People were getting headaches before anyone understood why. Air ${R0(st(p.s).air)}%. We have wrapped it, but the genset needs an overhaul.\n${sig(p.s)}`}),
  fever:p=>({from:p.s,subj:'STAFF SICK',body:`Control,\n\nHalf my staff are down with fever. The rest are running the bunk bays and the kitchen. No overhauls or tunnel work from us for the next two shifts.\n${sig(p.s)}`}),
  badfood:p=>({from:p.s,subj:'RATIONS SPOILED',body:`Control,\n\nA pallet of rations was stored against the warm generator wall. ${num(p.lost)} person-days of food are spoiled and thrown out.\n${sig(p.s)}`}),
  stairs:p=>({from:p.s,subj:'CRUSH ON THE STAIRS',body:`Control,\n\nA rumour went round that the elevator was running to the surface. People rushed the stairwell. We lost people in the crush before the staff got between them and the door.\n\nWe are too crowded, Control.\n${sig(p.s)}`}),
  plume:p=>({from:'HQ',subj:'FALLOUT PLUME',body:`ALL SHELTERS,\n\nA heavy fallout plume is passing over the region. Shelters with damaged shells will take some of it in: ${p.hit.join(', ')}.\n- DIR. T. HOLLIS`}),
  aftershock:p=>({from:'ENG',subj:'AFTERSHOCK',body:`Controller,\n\nAftershock through the region.${p.ch.length?`\n\n${p.ch.map(x=>'  '+x).join('\n')}\n\nShallow tunnels in sand take it worst. A crew from either end can repair a line with a spares kit.`:'\n\nEvery tunnel held this time.'}\n- CHIEF ENG. K. DOSS`}),
  leak:p=>({from:p.s,subj:'TANK SEAM SPLIT',body:`Control,\n\nA seam on our main water tank split. We lost ${num(p.lost)} L before we got a clamp on it, and it still weeps about ${st(p.s).leak} L a shift. A water plant overhaul would seal it properly.\n${sig(p.s)}`}),
  flood:p=>({from:p.s,subj:'WATER IN THE SUMP',body:`Control,\n\nGroundwater is coming through the lining where the shaft passes through sand. The sump pumps are holding, but it got into the filtration room and the lower tank. ${num(p.lost)} L contaminated and dumped; the water plant is at ${R0(st(p.s).plant)}%.\n${sig(p.s)}`}),
  fuelbad:p=>({from:p.s,subj:'BAD DIESEL',body:`Control,\n\nThe generator started hunting at 0300. Water in the day tank: the main bunker is contaminated. We drained ${num(p.lost)} L. ${num(st(p.s).fuel)} L left that we trust.\n${sig(p.s)}`}),
  sick:p=>({from:p.s,subj:'SICKNESS',body:`Control,\n\nDysentery. It started in the bunk bays two days in and it is moving fast in the crowding. ${st(p.s).pop} people on ${st(p.s).cap} beds. We have lost people already. Clean water is the only medicine we have plenty of, and not for long.\n${sig(p.s)}`}),
  delay:p=>({from:'HQ',subj:'CONVOY DELAYED',body:`ALL SHELTERS,\n\nThe relief convoy lost a bridge and is rerouting. Add ${p.d*6} hours. New ETA ${dtg(S.relief)}.\n\nI am sorry.\n- DIR. T. HOLLIS`}),
});

function stragglers(){const live=liveShelters();if(!live.length)return;const id=pickW(live,i=>{const [t,d]=nearestTown(st(i).x,st(i).y);return 1/(1+d/25);});const s=st(id),n=R0(s.cap*(.06+rnd()*.1));
  s.pop+=n;ev(`${n} stragglers forced the outer door at ${id} before it resealed.`);}
function unrest(s){const fl=R0(s.food*.12),wl=R0(s.water*.08);s.food-=fl;s.water-=wl;s.morale+=8;ev(`Unrest at ${s.id}: stores broken into. ${num(fl)} rations and ${num(wl)} L lost.`);
  if(rnd()<.4)casualties(s,s.pop*.006,'violence');
  if(!S.flags['unrest'+s.id]){S.flags['unrest'+s.id]=1;send({from:s.id,subj:'TROUBLE IN THE BUNK BAYS',body:`Control,\n\nPeople broke into the storeroom last night. We lost ${num(fl)} rations and ${num(wl)} L of water before the staff got it back under control. Morale is ${R0(s.morale)}%. People need to see that someone is doing something.\n${sig(s.id)}`});}}
