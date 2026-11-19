(()=>{"use strict";
const map=document.getElementById("heatmapSvg");
const ranking=document.getElementById("heatmapRanking");
const legend=document.getElementById("heatmapLegend");
const range=document.getElementById("heatmapRange");
if(!map||!ranking||!range)return;
const T=(k,p)=>window.DemoRadarI18n?.t(k,p)||k;
const palette=["#e2e8f0","#bfdbfe","#60a5fa","#2563eb","#1d4ed8","#1e3a8a"];
const labels=["0","1","2–4","5–14","15–49","50+"];
const tier=n=>n>=50?5:n>=15?4:n>=5?3:n>=2?2:n>=1?1:0;
let shapes=null,records=[],coverage=null;
const svgNS="http://www.w3.org/2000/svg";
const sourceFor=state=>coverage?.states?.find(s=>s.state===state)||null;
const sourceLabel=state=>{
 const s=sourceFor(state);
 return T(s?.status==="regional_partial"?"map.sourceRegional":s?.status==="local_partial"?"map.sourceLocal":"map.sourceMissing");
};
const sourceDetails=state=>{
 const s=sourceFor(state);
 if(!s)return T("map.sourceUnknown");
 return (s.scope||"")+" · "+T("map.sourceReviewed")+" "+(coverage.reviewed_on||"");
};
const zeroLabel=(state,count)=>count>0?String(count):T(sourceFor(state)?.status==="no_confirmed_regular_feed"||!sourceFor(state)?"map.zeroGap":"map.zeroReported");

function todayBerlin(){return new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Berlin",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}
function endDate(days){
 const d=new Date(todayBerlin()+"T12:00:00Z");
 d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)
}
function counts(){
 const min=todayBerlin(),max=endDate(Number(range.value)||7);
 const table={};
 for(const e of records){
  if(!e||!e.state||!e.date||e.date<min||e.date>=max)continue;
  if(["cancelled","withdrawn","stopped"].includes(e.status_code))continue;
  table[e.state]=(table[e.state]||0)+1;
 }
 return table
}
function selectState(name){
 const sel=document.getElementById("region");
 if(!sel||![...sel.options].some(o=>o.value===name))return;
 sel.value=name;
 sel.dispatchEvent(new Event("change",{bubbles:true}));
 document.getElementById("demo-kalender")?.scrollIntoView({behavior:"smooth",block:"start"});
 draw();
}
function draw(){
 if(!shapes)return;
 const cnt=counts();
 map.setAttribute("viewBox",shapes.viewBox||"0 0 480 615");
 map.replaceChildren();
 const title=document.createElementNS(svgNS,"title");title.textContent=T("map.title");map.append(title);
 const chosen=document.getElementById("region")?.value||"Alle Bundesländer";
 for(const item of shapes.states){
  const n=cnt[item.name]||0;
  const path=document.createElementNS(svgNS,"path");
  path.setAttribute("d",item.path);
  path.setAttribute("fill",palette[tier(n)]);
  if(n===0&&(sourceFor(item.name)?.status==="no_confirmed_regular_feed"||!sourceFor(item.name))){
   path.setAttribute("stroke-dasharray","3 3");
  }
  path.setAttribute("class","heatmap-state");
  path.setAttribute("role","button");
  path.setAttribute("tabindex","0");
  path.setAttribute("aria-pressed",String(chosen===item.name));
  path.setAttribute("aria-label",item.name+": "+(n===0?zeroLabel(item.name,n):T("map.events",{count:n}))+". "+sourceLabel(item.name)+". "+T("map.show"));
  const t=document.createElementNS(svgNS,"title");t.textContent=item.name+": "+(n===0?zeroLabel(item.name,n):T("map.events",{count:n}))+" · "+sourceLabel(item.name)+" · "+sourceDetails(item.name);path.append(t);
  path.addEventListener("click",()=>selectState(item.name));
  path.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();selectState(item.name)}});
  map.append(path);
 }
 legend.replaceChildren();
 for(let i=0;i<palette.length;i++){
  const sw=document.createElement("span");sw.className="heatmap-swatch";sw.style.background=palette[i];
  const label=document.createElement("span");label.textContent=labels[i];
  legend.append(sw,label);
 }
 const gapSw=document.createElement("span");gapSw.className="heatmap-swatch heatmap-swatch-gap";
 const gapLabel=document.createElement("span");gapLabel.textContent=T("map.legendGap");
 legend.append(gapSw,gapLabel);
 ranking.replaceChildren();
 const ordered=shapes.states.map(s=>({state:s.name,count:cnt[s.name]||0})).sort((a,b)=>b.count-a.count||a.state.localeCompare(b.state,"de"));
 for(const item of ordered){
  const btn=document.createElement("button");btn.type="button";btn.setAttribute("aria-pressed",String(chosen===item.state));
  const name=document.createElement("span");name.textContent=window.DemoRadarI18n?.t("state."+item.state)||item.state;
  const count=document.createElement("strong");
  count.textContent=item.count===0?zeroLabel(item.state,0):item.count.toLocaleString(window.DemoRadarI18n?.locale||"de-DE");
  count.className=item.count===0?"heatmap-count-zero":"";
  const caption=document.createElement("small");caption.className="heatmap-source-label";
  caption.textContent=sourceLabel(item.state);
  const detail=sourceDetails(item.state);
  btn.title=detail;
  btn.setAttribute("aria-label",item.state+": "+count.textContent+" · "+caption.textContent+" · "+detail);
  const lhs=document.createElement("span");lhs.className="heatmap-source-wrap";lhs.append(name,caption);
  btn.append(lhs,count);btn.addEventListener("click",()=>selectState(item.state));ranking.append(btn);
 }
}
range.addEventListener("change",draw);
document.getElementById("region")?.addEventListener("change",draw);
document.addEventListener("demoradar:languagechange",draw);
document.addEventListener("demoradar:dataupdated",e=>{records=Array.isArray(e.detail?.events)?e.detail.events:[];draw()});
Promise.all([
 fetch("/data/germany-states.json",{cache:"force-cache"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}),
 fetch("/data/state-source-coverage.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).catch(err=>{console.warn("State source coverage not available",err);return null})
]).then(([data,sourceData])=>{
 if(data.states?.length!==16)throw Error("Expected sixteen federal states");
 shapes=data;
 if(sourceData?.version===1&&Array.isArray(sourceData.states)&&sourceData.states.length===16)coverage=sourceData;
 draw();
}).catch(err=>{ranking.textContent=T("map.none");console.warn("Germany map unavailable",err)});
})();
