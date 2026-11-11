/* ================= shared UI helpers ================= */
/* All canvases draw in logical pixels; TG.k maps them onto real device pixels so blocks stay square and text stays sharp. */
const cv=$('#map'),g=cv.getContext('2d');
let TG={c:g,k:1,w:640,h:360};
function fitCanvas(c,lw,lh){const r=c.getBoundingClientRect(),dpr=window.devicePixelRatio||1;let k=Math.max(1,r.width*dpr/lw);
  const W=Math.round(lw*k),H=Math.round(lh*k);if(c.width!==W||c.height!==H){c.width=W;c.height=H;}const x=c.getContext('2d');x.imageSmoothingEnabled=false;return {c:x,k:W/lw,w:lw,h:lh};}
function fitMap(){TG=fitCanvas(cv,640,360);}
function useTarget(t){const prev=TG;TG=t;return prev;}
const F=(x,y,w,h,col)=>{const k=TG.k,X=Math.round(x*k),Y=Math.round(y*k);TG.c.fillStyle=col;TG.c.fillRect(X,Y,Math.max(1,Math.round((x+w)*k)-X),Math.max(1,Math.round((y+h)*k)-Y));};
function blit(img,alpha=1){const c=TG.c;c.globalAlpha=alpha;c.drawImage(img,0,0,TG.c.canvas.width,TG.c.canvas.height);c.globalAlpha=1;}
function txt(s,x,y,col,align='left'){const c=TG.c,k=TG.k;c.font=`600 ${Math.max(10,Math.round(9.5*k))}px 'IBM Plex Sans Condensed','Arial Narrow',sans-serif`;c.textBaseline='top';c.textAlign=align;c.fillStyle=col;c.fillText(s,Math.round(x*k),Math.round(y*k));}
function txtS(s,x,y,c,align='left'){txt(s,x+1,y+1,'#0f0b15',align);txt(s,x,y,c,align);}
let AC=null,SOUND=true;
function tone(f,d,v=.03,type='square',when=0){if(!SOUND)return;try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();
  const o=AC.createOscillator(),gn=AC.createGain(),t=AC.currentTime+when;o.type=type;o.frequency.value=f;gn.gain.setValueAtTime(v,t);gn.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(gn);gn.connect(AC.destination);o.start(t);o.stop(t+d+.03);}catch(e){}}
const chime=()=>{tone(880,.1,.035);tone(1320,.14,.035,'square',.11);};
const buzz=()=>tone(140,.16,.045,'sawtooth');
const blip=()=>tone(1200,.035,.025);
const thud=()=>{tone(90,.2,.06,'triangle');tone(60,.3,.05,'triangle',.05);};
const alarm=()=>{for(let i=0;i<6;i++)tone(i%2?620:880,.22,.045,'square',i*.25);};
addEventListener('pointerdown',()=>{try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();}catch(e){}});
let toastT=0;
function toast(t,err){const el=$('#toast');el.textContent=t;el.className='toast px'+(err?' err':'');el.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>el.hidden=true,err?6000:4500);}
function act(res){const [ok,msg]=res;toast(msg,!ok);ok?blip():buzz();refresh();return ok;}
function modal(html,wide){$('#modalRoot').innerHTML=`<div class="veil" id="veil"><div class="modal px" role="dialog" aria-modal="true" style="${wide?`width:min(${wide}px,100%)`:''}">${html}</div></div>`;
  $('#veil').addEventListener('click',e=>{if(e.target.id==='veil'&&UI.modal&&!['boot','end','title'].includes(UI.modal.type))closeModal();});}
function closeModal(){UI.modal=null;$('#modalRoot').innerHTML='';refresh();}
const meter=(v,max,c,mark)=>`<div class="meter"><i style="width:${clamp(max?v/max:0,0,1)*100}%;--c:${c}"></i>${mark!=null?`<b style="left:${mark}%"></b>`:''}</div>`;
const L_=(a,b,cls='')=>`<span>${a}</span><span class="num ${cls}">${b}</span>`;
function toMap(e){const r=cv.getBoundingClientRect();return [(e.clientX-r.left)*640/r.width,(e.clientY-r.top)*360/r.height];}
function placeTip(e,html){const tip=$('#tip');if(!html){tip.hidden=true;return;}tip.hidden=false;tip.innerHTML=html;
  const w=tip.offsetWidth,h=tip.offsetHeight;let x=e.clientX+16,y=e.clientY+16;if(x+w>innerWidth-8)x=e.clientX-w-12;if(y+h>innerHeight-8)y=e.clientY-h-12;tip.style.left=x+'px';tip.style.top=y+'px';}
function lineThick(ax,ay,bx,by,w,c){const dx=bx-ax,dy=by-ay,n=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))));
  for(let k=0;k<=n;k++)F(Math.round(ax+dx*k/n-w/2),Math.round(ay+dy*k/n-w/2),w,w,c);}
const sitePx=s=>[s.x*4+2,s.y*4+2];

/* ================= build: map ================= */
function headframe(px,py,sel,col='#8b8c99'){
  if(sel){F(px-9,py-14,19,22,'#f2b33d');F(px-8,py-13,17,20,'#1b162480');}
  F(px-6,py+2,13,4,'#0f0b15');F(px-5,py+2,11,3,col);
  F(px-4,py-9,1,11,'#5d5e6b');F(px+4,py-9,1,11,'#5d5e6b');F(px-4,py-5,9,1,'#5d5e6b');F(px-4,py-1,9,1,'#5d5e6b');
  F(px-2,py-11,5,3,'#c9c9d6');F(px-1,py-10,3,1,'#5d5e6b');
}
function drawBuild(t){
  blit(UI.geo?GEO:TER);blit(ROADS);
  for(const tw of WD.towns){txtS(tw.name,tw.x*4,tw.y*4+12,'#efe6cf','center');txtS(`${tw.pop} PEOPLE`,tw.x*4,tw.y*4+21,'#c9bfa6','center');}
  // tunnels
  G.build.tunnels.forEach((tn,i)=>{const A=siteById(tn.a),B=siteById(tn.b),[ax,ay]=sitePx(A),[bx,by]=sitePx(B),ts=tunnelStats(tn);
    if(UI.selLink===i)lineThick(ax,ay,bx,by,9,'#f2b33d');
    lineThick(ax,ay,bx,by,7,'#120e19');
    const dx=bx-ax,dy=by-ay,L=Math.hypot(dx,dy),nx=-dy/L,ny=dx/L;
    for(const [k,o] of [['W',-2],['A',0],['P',2]])if(tn[k])lineThick(ax+nx*o,ay+ny*o,bx+nx*o,by+ny*o,1,COL[k]);
    const mx=(ax+bx)/2,my=(ay+by)/2;F(mx-16,my-6,32,11,'#0f0b15');F(mx-15,my-5,30,9,'#272033');txt(`${R0(ts.rel*100)}%`,mx,my-4,ts.rel<.5?'#ec4b3f':ts.rel<.75?'#f2b33d':'#77d65b','center');
  });
  // control
  const [cx_,cy_]=sitePx(siteById('CC'));
  F(cx_-8,cy_-3,17,7,'#0f0b15');F(cx_-7,cy_-2,15,5,'#9a9aa6');F(cx_-4,cy_-5,9,3,'#9a9aa6');F(cx_,cy_-12,1,7,'#c9c9d6');F(cx_-1,cy_-13,3,1,'#ec4b3f');
  if(UI.sel==='CC')F(cx_-10,cy_+6,21,1,'#f2b33d');
  txtS('CC CONTROL',cx_,cy_+8,'#f2b33d','center');
  // sites
  for(const s of G.build.sites){const [px,py]=sitePx(s),w=siteWarnings(s);
    headframe(px,py,UI.sel===s.id);
    txtS(`${s.id} ${s.name}`,px,py+8,UI.sel===s.id?'#f2b33d':'#efe6cf','center');
    if(w.some(x=>x[0]==='err')){F(px+6,py-14,7,8,'#0f0b15');F(px+7,py-13,5,6,(t/400|0)%2&&!reduced?'#ec4b3f':'#f2b33d');txt('!',px+9,py-13,'#0f0b15','center');}}
  // drag/move/ghost
  const d=UI.drag,h=UI.hoverCell;
  if(UI.pick&&UI.mouse){const A=siteById(UI.pick),[ax,ay]=sitePx(A);const [mx,my]=UI.mouse;const L=Math.hypot(mx-ax,my-ay),ph=reduced?0:(t*.03)%6;
    for(let s=ph;s<L;s+=6){const x=ax+(mx-ax)*s/L,y=ay+(my-ay)*s/L;F(x-1,y-1,3,3,'#0f0b15');F(x,y,2,2,'#f2b33d');}}
  else if(d&&d.moved&&d.site){const bad=placeOk(d.cx,d.cy,d.site);headframe(d.cx*4+2,d.cy*4+2,false,bad?'#ec4b3f':'#77d65b');}
  else if(h&&!UI.hover&&!UI.modal&&G.build.sites.length<MAXSITES){const bad=placeOk(h[0],h[1]);
    if(!bad&&!reduced?(t/500|0)%2:!bad){TG.c.globalAlpha=.55;headframe(h[0]*4+2,h[1]*4+2,false,'#77d65b');TG.c.globalAlpha=1;}}
  txtS(UI.geo?'GEOLOGY: SAND DEPTH  (YELLOW = DEEP SAND, GREY = ROCK AT SURFACE)':'REGION 7 SURVEY  -  1 SQUARE = 25 M',6,349,'#efe6cf');
}
function buildNodeAt(x,y){for(const s of G.build.sites){const [px,py]=sitePx(s);if(Math.abs(x-px)<=8&&y>=py-14&&y<=py+8)return s.id;}
  const [cx_,cy_]=sitePx(siteById('CC'));if(Math.abs(x-cx_)<=9&&Math.abs(y-cy_)<=8)return 'CC';return null;}
function buildLinkAt(x,y){let best=null,bd=6;G.build.tunnels.forEach((tn,i)=>{const [ax,ay]=sitePx(siteById(tn.a)),[bx,by]=sitePx(siteById(tn.b));
  const dx=bx-ax,dy=by-ay,L2=dx*dx+dy*dy,u=clamp(((x-ax)*dx+(y-ay)*dy)/L2,0,1),d=Math.hypot(ax+dx*u-x,ay+dy*u-y);if(d<bd){bd=d;best=i;}});return best;}
function buildDown(x,y){const id=buildNodeAt(x,y);UI.drag={site:id&&id!=='CC'?id:null,node:id,sx:x,sy:y,moved:false,cx:0,cy:0};}
function buildMove(e,x,y){
  const d=UI.drag;if(d&&d.site&&Math.hypot(x-d.sx,y-d.sy)>5){d.moved=true;d.cx=clamp(Math.floor(x/4),0,MW-1);d.cy=clamp(Math.floor(y/4),0,MH-1);}
  UI.hover=buildNodeAt(x,y);UI.hoverLink=UI.hover?null:buildLinkAt(x,y);
  const cx=clamp(Math.floor(x/4),0,MW-1),cy=clamp(Math.floor(y/4),0,MH-1);UI.hoverCell=[cx,cy];
  cv.style.cursor=UI.hover?(UI.pick?'copy':'grab'):UI.pick?'crosshair':'pointer';
  let h;
  if(UI.hover){const s=siteById(UI.hover);if(UI.hover==='CC')h=`<b>CC Shelter Control</b><br>The old wing command post, 40 m down in rock. Already built.`;
    else{const st=siteStats(s);h=`<b>${s.id} ${esc(s.name)}</b><br>${st.beds} beds · ${st.depth} m deep · ${mil(st.total)}<br><span class="dim">Click to select · drag to move</span>`;}}
  else if(UI.hoverLink!=null){const tn=G.build.tunnels[UI.hoverLink],ts=tunnelStats(tn);h=`<b>${tn.a}–${tn.b} tunnel</b><br>${num(ts.len)} m at ${tn.depth} m deep · ${R0(ts.rockFrac*100)}% in rock<br>Reliability ${R0(ts.rel*100)}% · ${mil(ts.cost)}`;}
  else{const i=idx(cx,cy),sd=WD.sand[i],[tw,dist]=nearestTown(cx,cy);
    h=`<b>${TYPE_NAME[WD.type[i]]}</b>${WD.type[i]?`<br>Sand ${R0(sd)} m, then rock`:''}<br>${num(dist*MPC)} m from ${cap1(tw.name)}`;
    const bad=WD.type[i]===0?null:placeOk(cx,cy);
    if(UI.pick)h+='<br><span class="dim">Click a shelter to tunnel to</span>';
    else if(G.build.sites.length<MAXSITES&&WD.type[i])h+=bad?`<br><span class="neg">${bad}</span>`:'<br><span class="pos">Click to place a shelter here</span>';}
  placeTip(e,h);
}
function buildUp(x,y){const d=UI.drag;UI.drag=null;if(!d)return;
  if(d.moved&&d.site){const bad=placeOk(d.cx,d.cy,d.site);if(bad){toast(bad,true);buzz();return;}const s=siteById(d.site);s.x=d.cx;s.y=d.cy;recomputeRoads();clampTunnels();thud();refresh();return;}
  const id=buildNodeAt(x,y);
  if(UI.pick){if(id&&id!==UI.pick){const a=UI.pick;setPick(null);openTunnel(a,id);}else if(!id)setPick(null);return;}
  if(id){UI.sel=id;UI.selLink=null;UI.tab='site';blip();refresh();return;}
  const li=buildLinkAt(x,y);if(li!=null){UI.selLink=li;UI.tab='tunnels';blip();refresh();return;}
  const cx=clamp(Math.floor(x/4),0,MW-1),cy=clamp(Math.floor(y/4),0,MH-1);
  if(G.build.sites.length>=MAXSITES){toast(`The program funds at most ${MAXSITES} shelters.`,true);buzz();return;}
  const bad=placeOk(cx,cy);if(bad){toast(bad,true);buzz();return;}
  const s=newSite(cx,cy);G.build.sites.push(s);G.build.sites.sort((a,b)=>a.slot-b.slot);recomputeRoads();UI.sel=s.id;UI.tab='site';thud();
  toast(`${s.id} ${cap1(s.name)} placed. Sand here is ${R0(sandAt(cx,cy))} m deep. Open the designer to shape the shaft.`);refresh();
}
function setPick(id){UI.pick=id;renderHint();}
function renderHint(){const h=$('#hint');
  if(G.phase==='build'){if(UI.pick){h.textContent=`Click the shelter to tunnel to from ${UI.pick}. Esc cancels.`;h.className='pick';}
    else{h.textContent=G.build.sites.length<MAXSITES?'Click open ground to place a shelter. Drag a shelter to move it. Roads are laid automatically.':'All six shelters placed. Select one to design it or dig tunnels.';h.className='';}
    $('#legend').innerHTML=`<button class="btn small" id="geoBtn" type="button">${UI.geo?'Show terrain':'Show geology (sand depth)'}</button><span class="dim">Sand is cheap to dig but needs heavy lining and gives weak protection. Rock costs more to blast but holds.</span>`;
    $('#geoBtn').onclick=()=>{UI.geo=!UI.geo;renderHint();};}
  else{if(UI.pick){h.textContent=`Click the shelter that should receive from ${UI.pick}. Esc cancels.`;h.className='pick';}
    else{h.textContent='Drag from one shelter to another to send water, air or power. Click a tunnel for its load.';h.className='';}
    $('#legend').innerHTML=`<span class="key"><i class="sw" style="background:var(--water)"></i>Water</span><span class="key"><i class="sw" style="background:var(--air)"></i>Air</span><span class="key"><i class="sw" style="background:var(--amber)"></i>Power</span><span class="key"><i class="sw" style="background:var(--fuel)"></i>Fuel</span><span class="dim">Gauges: air · water · power · fuel. Moving dots are active flows.</span>`;}
}

/* ================= build: panels ================= */
function buildTabs(){return [['site','Shelter'],['tunnels','Tunnels'],['plan','Budget']];}
function buildSide(){
  if(UI.tab==='tunnels')return tunnelsPanel();
  if(UI.tab==='plan')return planPanel();
  if(!UI.sel||!siteById(UI.sel))return `<div class="sect"><span class="big">Choose sites</span><p>Click open ground on the map to place up to six shelters. Each one gets a road to the nearest highway automatically.</p>
    <p class="dim">Hover the map to see what is under it. Shallow sand is cheap to dig but needs a concrete lining and gives poor blast protection. Rock is expensive to blast and strong. Shelters near towns fill up fast; remote ones fill slowly.</p>
    <p class="dim">Shelter Control (CC) already exists in the old command post, 40 m down in rock. Tunnel your shelters to it and to each other.</p></div>${planSummary()}`;
  if(UI.sel==='CC')return `<div class="sect"><span class="big">CC Shelter Control</span><div class="dim">The old wing command post. 40 m deep in rock, 80 beds, a 200 kW generator plant and a 40,000 L cistern. Already built.</div>
    <div class="actions"><button class="btn" data-act="tunnel" type="button">Dig a tunnel from here…</button></div></div>`;
  const s=siteById(UI.sel),st=siteStats(s),w=siteWarnings(s),[tw,td]=nearestTown(s.x,s.y);
  return `<div class="sect"><div class="row"><span class="big">${s.id} ${esc(s.name)}</span><span class="chip ${w.some(x=>x[0]==='err')?'CRIT':w.length?'WARN':'OK'}">${w.some(x=>x[0]==='err')?'INCOMPLETE':w.length?'CHECK':'READY'}</span></div>
    <div class="dim">${TYPE_NAME[WD.type[idx(s.x,s.y)]]} · ${num(td*MPC)} m from ${cap1(tw.name)} · warden ${esc(s.warden)}</div>
    <div class="actions"><button class="btn primary" data-act="design" type="button">Design silo…</button><button class="btn" data-act="tunnel" type="button">Dig tunnel…</button><button class="btn danger small" data-act="remove" type="button">Remove</button></div></div>
  <div class="sect"><span class="lbl">Ground</span>${groundBar(st.sand,st.depth)}<div class="dim" style="font-size:14px">Sand ${R0(st.sand)} m, then rock. Shaft ${st.depth} m: ${R0(st.sandM)} m in sand, ${R0(st.rockM)} m in rock.</div>
    <div class="row"><span>Blast protection</span><span class="num">${R0(st.prot*100)}%</span></div>${meter(st.prot,.9,st.prot<.35?'var(--bad)':st.prot<.6?'var(--warn)':'var(--ok)')}</div>
  <div class="sect"><span class="lbl">What it holds</span>${capGrid(st)}</div>
  <div class="sect"><span class="lbl">Cost</span><div class="ledger">${L_('Excavation','  '+mil(st.dig))}${L_('Shaft lining',mil(st.line))}${L_(`Head works and blast door (Ø${s.d0} m)`,mil(st.head))}${L_('Fit-out',mil(st.fit))}${L_('First fill of water, fuel and food',mil(st.stock))}${L_(`Road, ${num((s.roadCells||0)*MPC)} m`,mil(st.road))}<span class="tot">Total</span><span class="tot num">${mil(st.total)}</span></div></div>
  ${w.length?`<div class="sect"><span class="lbl">Check</span><ul class="warns">${w.map(([k,m])=>`<li class="${k}">${esc(m.replace(/^S\d: /,''))}</li>`).join('')}</ul></div>`:''}`;
}
function groundBar(sand,depth){const max=Math.max(depth,sand,40)+4;return `<div class="stack" style="height:18px">
  <span style="width:${Math.min(sand,max)/max*100}%;--c:#c9a85e"></span><span style="width:${(max-Math.min(sand,max))/max*100}%;--c:#77757f"></span><b style="left:calc(${depth/max*100}% - 2px)" title="Shaft bottom"></b></div>
  <div class="row dim" style="font-size:12px"><span>0 m</span><span>shaft bottom ${depth} m</span><span>${R0(max)} m</span></div>`;}
function capGrid(st){const c=(lab,v,cls='')=>`<div><span class="lbl">${lab}</span><span class="v ${cls}">${v}</span></div>`;
  return `<div class="kv">${c('Beds',`${st.beds}`)}${c('Expected intake',`${st.roster}`,st.roster>st.beds?'neg':'')}${c('Air',`${R0(st.scrub/Math.max(1,st.need)*100)}%`,st.scrub<st.need?'neg':'pos')}
    ${c('Power',`${st.gcap} / ${R0(st.load)} kW`,st.gcap<st.load?'neg':'pos')}${c('Water',st.waterSh>=99?'—':`${Math.floor(st.waterSh)} shifts`,st.waterSh<12?'neg':'')}
    ${c('Fuel',st.fuelSh?`${Math.floor(st.fuelSh)} shifts`:'none',st.fuelSh<12?'neg':'')}${c('Food',st.foodSh?`${Math.floor(st.foodSh)} shifts`:'none',st.foodSh<12?'neg':'')}
    ${c('Bays',`${st.used} / ${st.bays}`,st.used>st.bays?'neg':'')}</div><div class="dim" style="font-size:13px">Water, fuel and food are for full tanks with a full house. A shift is 6 hours; relief comes 22 to 30 shifts after the sirens.</div>`;}
function planSummary(){const b=buildTotals();return `<div class="sect"><span class="lbl">Budget</span><div class="ledger">${L_('Program budget',mil(G.build.budget))}${L_(`Shelters (${G.build.sites.length})`,'−'+mil(b.sites))}${L_(`Tunnels (${G.build.tunnels.length})`,'−'+mil(b.tun))}<span class="tot">Left</span><span class="tot num ${b.left<0?'neg':'pos'}">${mil(b.left)}</span></div></div>`;}
function planPanel(){const w=allWarnings();let beds=0,roster=0;for(const s of G.build.sites){const st=siteStats(s);beds+=st.beds;roster+=st.roster;}
  return `${planSummary()}<div class="sect"><span class="lbl">Shelters</span><table class="res"><thead><tr><th>Site</th><th>Beds</th><th>Depth</th><th>Cost</th></tr></thead><tbody>${G.build.sites.map(s=>{const st=siteStats(s);return `<tr><td><a href="#" data-sel="${s.id}" style="color:inherit">${s.id} ${esc(cap1(s.name))}</a></td><td class="num">${st.beds}</td><td class="num">${st.depth} m</td><td class="num">${mil(st.total)}</td></tr>`;}).join('')||'<tr><td colspan="4" class="dim">None yet</td></tr>'}</tbody></table>
    <div class="row"><span>Beds ${num(beds)}</span><span>Expected intake ${num(roster)}</span></div></div>
    <div class="sect"><span class="lbl">Before you commission</span><ul class="warns">${w.map(([k,m])=>`<li class="${k}">${esc(m)}</li>`).join('')||'<li class="pos">Everything checks out.</li>'}</ul>
    <div class="actions"><button class="btn primary" data-act="commission" type="button">Commission the shelters ▸</button><button class="btn small" data-act="reterrain" type="button">New terrain</button></div></div>`;}
function tunnelsPanel(){
  let h=`<div class="sect"><span class="lbl">Tunnels</span><div class="dim" style="font-size:14px">Select a shelter and choose Dig tunnel, then click the other end. Depth decides how much of the route runs through sand or rock. Rock tunnels cost more and survive the shock much better.</div></div>`;
  if(!G.build.tunnels.length)h+='<div class="dim">No tunnels yet.</div>';
  G.build.tunnels.forEach((tn,i)=>{const ts=tunnelStats(tn);h+=`<div class="flow" style="${UI.selLink===i?'border-color:var(--amber)':''}"><b>${tn.a} – ${tn.b}</b><button class="btn small" data-act="edittun" data-i="${i}" type="button">Edit</button>
    <span class="num">${num(ts.len)} m · ${tn.depth} m deep · ${R0(ts.rockFrac*100)}% rock · carries ${['W','A','P'].filter(k=>tn[k]).map(k=>cap1(RNAME[k])).join(', ')||'nothing'}</span><span class="num">${mil(ts.cost)}</span>
    <span style="grid-column:1/-1">${meter(ts.rel,1,ts.rel<.5?'var(--bad)':ts.rel<.75?'var(--warn)':'var(--ok)')}<span class="dim" style="font-size:13px">Reliability ${R0(ts.rel*100)}%: chance it stays intact through the shock.</span></span></div>`;});
  return h;}
function buildSideClick(e){
  const b=e.target.closest('[data-act]'),a2=e.target.closest('[data-sel]');
  if(a2){e.preventDefault();UI.sel=a2.dataset.sel;UI.tab='site';refresh();return;}
  if(!b||b.disabled)return;const a=b.dataset.act;
  if(a==='design')openDesigner(UI.sel);
  if(a==='tunnel'){setPick(UI.sel);toast(`Click the shelter to connect to ${UI.sel}.`);}
  if(a==='remove'){const id=UI.sel;G.build.sites=G.build.sites.filter(s=>s.id!==id);G.build.tunnels=G.build.tunnels.filter(t=>t.a!==id&&t.b!==id);UI.sel=null;recomputeRoads();toast(`${id} removed.`);refresh();}
  if(a==='edittun'){const tn=G.build.tunnels[+b.dataset.i];openTunnel(tn.a,tn.b);}
  if(a==='commission')openCommission();
  if(a==='reterrain'){UI.modal={type:'confirm'};modal(`<h2>New terrain?</h2><p>This throws away the map and every shelter and tunnel you have placed.</p><div class="foot"><button class="btn" id="cNo" type="button">Keep this map</button><button class="btn danger" id="cYes" type="button">Generate new terrain</button></div>`);
    $('#cNo').onclick=closeModal;$('#cYes').onclick=()=>{newGame();closeModal();};}
}

/* ================= designer ================= */
const XW=240,XH=380,XS=4,XH0=22;
function openDesigner(id){UI.modal={type:'designer',id};renderDesigner();}
function renderDesigner(){
  const s=siteById(UI.modal.id),st=siteStats(s);
  const fl=s.floors.map((d,i)=>{const top=floorTop(i),hs=clamp(st.sand-top,0,4),mat=hs>=4?'sand':hs<=0?'rock':'mix',prev=i?s.floors[i-1]:s.d0;
    return `<div class="floor"><span class="dim">F${i+1}</span><span class="num">${top}–${top+4} m</span><span class="mat ${mat}">${mat==='mix'?'SAND/ROCK':mat.toUpperCase()}</span>
      <select data-floor="${i}" aria-label="Floor ${i+1} diameter">${DIAMS.filter(x=>x<=prev).map(x=>`<option value="${x}" ${x===d?'selected':''}>Ø ${x} m</option>`).join('')}</select><span class="num dim bays">${baysFor(d)} bays</span></div>`;}).join('');
  const mods=MOD_ORDER.map(k=>`<i class="sw" style="background:${MODS[k].color}"></i><span><b>${MODS[k].name}</b> <span class="dim">· ${MODS[k].desc} · ${money(MODS[k].cost)}</span></span>
    <span class="cnt"><button class="btn small" data-mod="${k}" data-d="-1" type="button" aria-label="Fewer">−</button><b>${s.mods[k]}</b><button class="btn small" data-mod="${k}" data-d="1" type="button" aria-label="More">+</button></span><span class="num dim">${mil(s.mods[k]*MODS[k].cost)}</span>`).join('');
  modal(`<div class="row"><h2>Design ${s.id} ${esc(s.name)}</h2><button class="btn small" id="dDone" type="button">Done</button></div>
  <div class="designer"><canvas id="xsec" width="${XW}" height="${XH}" aria-label="Shaft cross-section"></canvas>
  <div class="dctl">
    <div class="dim" style="font-size:14px">Ground here: ${R0(st.sand)} m of sand, then rock. Every floor is 4 m tall. A floor can be as wide as the one above it or narrower, never wider.</div>
    <div><span class="lbl">Top diameter (head works and blast door)</span><div class="seg">${DIAMS.map(d=>`<button class="btn small ${d===s.d0?'on':''}" data-d0="${d}" type="button">${d} m</button>`).join('')}</div></div>
    <div><div class="row"><span class="lbl">Shaft · ${s.floors.length} floors · ${st.depth} m deep · ${st.bays} bays</span><span class="actions"><button class="btn small" id="dAdd" type="button" ${s.floors.length>=MAXFLOORS?'disabled':''}>+ Floor</button><button class="btn small" id="dDel" type="button" ${s.floors.length<=1?'disabled':''}>− Bottom floor</button></span></div><div class="floors">${fl}</div></div>
    <div><div class="row"><span class="lbl">Furnishing · ${st.used} of ${st.bays} bays used</span><button class="btn small" id="dAuto" type="button">Auto-furnish</button></div>${meter(st.used,Math.max(st.bays,st.used),st.used>st.bays?'var(--bad)':'var(--amber)')}<div class="mods" style="margin-top:8px">${mods}</div></div>
    ${capGrid(st)}
    <div class="ledger">${L_('Excavation and lining',mil(st.dig+st.line))}${L_('Head works',mil(st.head))}${L_('Fit-out',mil(st.fit))}${L_('First fill',mil(st.stock))}${L_('Road',mil(st.road))}<span class="tot">Shelter total · program left</span><span class="tot num ${buildTotals().left<0?'neg':''}">${mil(st.total)} · ${mil(buildTotals().left)}</span></div>
  </div></div>`,1080);
  drawXsec(s,st);
  $('#dDone').onclick=closeModal;
  document.querySelectorAll('[data-d0]').forEach(b=>b.onclick=()=>{s.d0=+b.dataset.d0;for(let i=0;i<s.floors.length;i++)s.floors[i]=Math.min(s.floors[i],i?s.floors[i-1]:s.d0);afterDesign();});
  document.querySelectorAll('[data-floor]').forEach(sel=>sel.onchange=()=>{const i=+sel.dataset.floor;s.floors[i]=+sel.value;for(let k=i+1;k<s.floors.length;k++)s.floors[k]=Math.min(s.floors[k],s.floors[k-1]);afterDesign();});
  $('#dAdd').onclick=()=>{s.floors.push(s.floors.length?s.floors[s.floors.length-1]:s.d0);thud();afterDesign();};
  $('#dDel').onclick=()=>{s.floors.pop();afterDesign();};
  $('#dAuto').onclick=()=>{s.mods=suggestMods(s);blip();afterDesign();};
  document.querySelectorAll('[data-mod]').forEach(b=>b.onclick=()=>{const k=b.dataset.mod;s.mods[k]=Math.max(0,s.mods[k]+ +b.dataset.d);tone(1500,.01,.015);afterDesign();});
}
function afterDesign(){clampTunnels();const sc=document.querySelector('.floors')?.scrollTop;renderDesigner();const f=document.querySelector('.floors');if(f&&sc!=null)f.scrollTop=sc;}
function packMods(s){const seq=[];for(const k of MOD_ORDER)for(let n=0;n<s.mods[k];n++)seq.push(k);const out=[];let p=0;
  s.floors.forEach(d=>{const b=baysFor(d),row=[];for(let k=0;k<b;k++)row.push(seq[p++]||null);out.push(row);});return {rows:out,over:Math.max(0,seq.length-p)};}
function drawXsec(s,st){
  const prevT=useTarget(fitCanvas($('#xsec'),XW,XH)),c=null,P=F;
  const r=mul(s.x*31+s.y),cx=140,sandY=XH0+st.sand*XS;
  P(0,0,XW,XH0,'#2b2240');for(let k=0;k<12;k++)P(r()*XW,r()*XH0*.7,1,1,'#6d6290');
  P(0,XH0-3,XW,3,'#4d7a3c');
  P(0,XH0,XW,Math.max(0,sandY-XH0),'#c9a85e');for(let k=0;k<500;k++){const y=XH0+r()*(sandY-XH0);P(r()*XW,y,1,1,r()<.5?'#b8964f':'#dcbd73');}
  P(0,sandY,XW,XH-sandY,'#6d6a74');for(let k=0;k<160;k++){const x=r()*XW,y=sandY+r()*(XH-sandY);P(x,y,r()*6+2,1,'#5c5963');}
  // ruler
  for(let m=0;m*XS+XH0<XH;m+=4){const y=XH0+m*XS;P(0,y,m%20===0?8:4,1,'#efe6cf');if(m%20===0&&m)txt(`${m}M`,10,y-3,'#efe6cf','left',c);}
  txt(`SAND ${R0(st.sand)}M`,XW-4,XH0+4,'#5a4520','right',c);if(sandY<XH-12)txt('ROCK',XW-4,sandY+4,'#d8d6de','right',c);
  // head works
  const hw=s.d0*XS*1.2;P(cx-hw/2-4,XH0-10,hw+8,10,'#9a9aa6');P(cx-hw/2-4,XH0-10,hw+8,2,'#c9c9d6');P(cx-6,XH0-14,12,4,'#5d5e6b');
  P(cx-hw/2,XH0,hw,16,'#3a3050');P(cx-hw/2,XH0,hw,2,'#9a9aa6');txt('ENTRY',cx,XH0+5,'#a197b4','center',c);
  const {rows,over}=packMods(s);
  s.floors.forEach((d,i)=>{const top=XH0+floorTop(i)*XS,w=d*XS*1.2,x=cx-w/2,inSand=top<sandY,wall=inSand?3:1;
    P(x-wall,top,w+wall*2,16,inSand?'#8b8c99':'#a3a3ad');P(x,top,w,16,'#1b1624');P(x,top+15,w,1,'#5d5e6b');
    const row=rows[i],n=row.length;if(n){const bw=(w-4)/n;row.forEach((k,j)=>{P(x+2+j*bw,top+3,Math.max(1,bw-1),10,k?MODS[k].color:'#2b2438');});}});
  if(over)txt(`${over} MODULES DO NOT FIT`,cx,XH-12,'#ec4b3f','center',c);
  // tunnels at depth
  G.build.tunnels.filter(t=>t.a===s.id||t.b===s.id).forEach((t,k)=>{const y=XH0+t.depth*XS-6,side=k%2?1:-1,fw=(s.floors[Math.min(s.floors.length-1,Math.floor((t.depth-4)/4))]||s.d0)*XS*1.2/2;
    const x0=side>0?cx+fw:0+ (cx-fw-40>0?cx-fw-40:0);P(side>0?cx+fw:cx-fw-40,y,40,6,'#0f0b15');P(side>0?cx+fw:cx-fw-40,y+1,40,4,'#3a3050');txt(t.a===s.id?t.b:t.a,side>0?cx+fw+20:cx-fw-20,y-9,'#f2b33d','center',c);});
  useTarget(prevT);
}

/* ================= tunnel dialog ================= */
function openTunnel(a,b){
  const ex=G.build.tunnels.find(t=>(t.a===a&&t.b===b)||(t.a===b&&t.b===a));
  const draft=ex?{...ex}:{a,b,depth:0,W:true,A:true,P:true};
  const mx=tunnelStats(draft).maxDepth;if(!ex)draft.depth=Math.max(8,Math.min(mx,Math.floor(mx*.7/4)*4));
  UI.modal={type:'tunnel',draft,ex};renderTunnel();}
function renderTunnel(){
  const m=UI.modal,t=m.draft,ts=tunnelStats(t);
  const deps=[];for(let d=8;d<=ts.maxDepth;d+=4)deps.push(d);
  const conduit=(k,cap)=>`<label><input type="checkbox" id="tc${k}" ${t[k]?'checked':''}> <i class="sw" style="background:${COL[k]};width:10px;height:10px;display:inline-block"></i> ${cap1(RNAME[k])} <span class="dim">${cap}</span></label>`;
  modal(`<h2>Tunnel ${t.a} – ${t.b}</h2>
  <div class="dim" style="font-size:14px">${num(ts.len)} m. The tunnel leaves each shaft at the depth you pick; it cannot be deeper than the shallower shaft (${ts.maxDepth} m).</div>
  <canvas id="prof" width="360" height="120" aria-label="Tunnel route profile"></canvas>
  <div><div class="row"><span class="lbl" id="tdl">Depth ${t.depth} m</span><span class="dim">${deps.length?'':'Both shafts need at least two floors.'}</span></div>
    <input type="range" id="tDepth" min="8" max="${Math.max(8,ts.maxDepth)}" step="4" value="${t.depth}" ${deps.length?'':'disabled'} aria-label="Tunnel depth"></div>
  <div><span class="lbl">Lines laid in the tunnel</span><div class="check">${conduit('W','2,000 L/shift')}${conduit('A','600 CFM')}${conduit('P','60 kW')}</div></div>
  <div class="kv" id="tStats"></div>
  <div class="foot">${m.ex?'<button class="btn danger" id="tDel" type="button">Fill in tunnel</button>':''}<button class="btn" id="tCancel" type="button">Cancel</button><button class="btn primary" id="tOk" type="button" ${deps.length?'':'disabled'}>${m.ex?'Save tunnel':'Dig tunnel'}</button></div>`,640);
  const upd=()=>{const s2=tunnelStats(t);$('#tdl').textContent=`Depth ${t.depth} m`;
    const c=(l,v,cls='')=>`<div><span class="lbl">${l}</span><span class="v ${cls}">${v}</span></div>`;
    $('#tStats').innerHTML=c('In rock',`${R0(s2.rockFrac*100)}%`)+c('Reliability',`${R0(s2.rel*100)}%`,s2.rel<.5?'neg':s2.rel>.75?'pos':'')+c('Cost',mil(s2.cost))+c('Program left',mil(buildTotals().left-(s2.cost-(m.ex?tunnelStats(m.ex).cost:0))),'');
    drawProfile(t,s2);};
  $('#tDepth').oninput=e=>{t.depth=+e.target.value;upd();};
  for(const k of ['W','A','P'])$('#tc'+k).onchange=e=>{t[k]=e.target.checked;upd();};
  $('#tCancel').onclick=closeModal;
  $('#tOk').onclick=()=>{if(!t.W&&!t.A&&!t.P){toast('Lay at least one line, or the tunnel is just a crawlway.',true);return;}
    if(m.ex)Object.assign(m.ex,t);else G.build.tunnels.push(t);thud();toast(`Tunnel ${t.a}–${t.b} ${m.ex?'saved':'dug'}: ${mil(tunnelStats(t).cost)}.`);UI.tab='tunnels';UI.selLink=G.build.tunnels.indexOf(m.ex||t);closeModal();};
  if(m.ex)$('#tDel').onclick=()=>{G.build.tunnels=G.build.tunnels.filter(x=>x!==m.ex);UI.selLink=null;closeModal();};
  upd();
}
function drawProfile(t,ts){const prevT=useTarget(fitCanvas($('#prof'),360,120)),c=null,P=F;
  const W=360,H=120,top=14,maxD=Math.max(60,t.depth+12),sy=d=>top+d/maxD*(H-top-4),n=ts.prof.length;
  P(0,0,W,H,'#6d6a74');P(0,0,W,top,'#2b2240');P(0,top-2,W,2,'#4d7a3c');
  for(let k=0;k<n;k++){const x0=k/(n)*W,w=W/n+1;P(x0,top,w,sy(ts.prof[k])-top,'#c9a85e');}
  const A=siteById(t.a),B=siteById(t.b);const da=shaftDepth(A),db=shaftDepth(B);
  P(0,top,8,sy(da)-top,'#1b1624');P(W-8,top,8,sy(db)-top,'#1b1624');
  for(let k=0;k<n;k++){const x0=k/n*W,w=W/n+1,inS=t.depth<=ts.prof[k];P(x0,sy(t.depth)-2,w,4,inS?'#e8793c':'#efe6cf');}
  txt(t.a,10,2,'#efe6cf','left',c);txt(t.b,W-10,2,'#efe6cf','right',c);txt('SAND',W/2,top+2,'#5a4520','center',c);
  txt('ORANGE = TUNNEL IN SAND  ·  WHITE = IN ROCK',W/2,H-10,'#efe6cf','center',c);
  useTarget(prevT);
}

/* ================= commission ================= */
function openCommission(){const w=allWarnings(),errs=w.filter(x=>x[0]==='err');UI.modal={type:'confirm'};
  modal(`<h2>Commission the shelters</h2>${errs.length?`<p>Fix these first:</p><ul class="warns">${errs.map(([k,m])=>`<li class="err">${esc(m)}</li>`).join('')}</ul><div class="foot"><button class="btn" id="cNo" type="button">Back to the plans</button></div>`
  :`<p>Construction is final once commissioned. The tanks, fuel bunkers and storerooms are filled and each site gets a staff of twelve. Then you wait for the call.</p>${w.length?`<ul class="warns">${w.map(([k,m])=>`<li class="${k}">${esc(m)}</li>`).join('')}</ul>`:''}
  <div class="foot"><button class="btn" id="cNo" type="button">Keep building</button><button class="btn primary" id="cYes" type="button">Commission and take the watch</button></div>`}`);
  $('#cNo').onclick=closeModal;if($('#cYes'))$('#cYes').onclick=()=>{commission();};}
