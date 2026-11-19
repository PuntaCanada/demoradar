(()=>{"use strict";
let records=[],updated=null,officialCount=0,communityCount=0,loadFailed=false,selectedDay=null,communityReady=false,detailFocus=null;
const T=(key,args)=>window.DemoRadarI18n?.t(key,args)||key;
const locale=()=>window.DemoRadarI18n?.locale||"de-DE";
const formatDate=date=>new Intl.DateTimeFormat(locale(),{timeZone:"UTC",day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(date+"T12:00:00Z"));
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const topic=s=>{s=s.toLowerCase();if(/klima|umwelt|fridays for future|naturschutz/.test(s))return"Klima & Umwelt";if(/krieg|frieden|waffen|wehrpflicht|nato/.test(s))return"Frieden & Krieg";if(/miete|sozial|streik|gewerkschaft|tarif|arbeit/.test(s))return"Arbeit & Soziales";if(/migration|flüchtling|asyl/.test(s))return"Migration";if(/demokratie|afd|antifa|rechtsextrem|faschis/.test(s))return"Demokratie";return"Sonstiges"};
const topicSlug=title=>({"Klima & Umwelt":"climate","Frieden & Krieg":"peace","Arbeit & Soziales":"social","Migration":"migration","Demokratie":"democracy","Sonstiges":"other"})[topic(title)]||"other";
const detailHref=e=>"?event="+encodeURIComponent(e.id)+"#eventDetail";
const safeSourceUrl=url=>{try{const u=new URL(String(url||""),window.location?.origin||"https://demoradar.pages.dev");return u.protocol==="https:"||u.protocol==="http:"?u.href:""}catch{return""}};
const localTopic=title=>{const label=topic(title);return T(({"Klima & Umwelt":"topic.climate","Frieden & Krieg":"topic.peace","Arbeit & Soziales":"topic.social","Migration":"topic.migration","Demokratie":"topic.democracy","Sonstiges":"topic.other"})[label]||"topic.other")};
function political(s){s=s.toLowerCase();if(/(gegen.{0,55}(afd|alternative für deutschland)|kein.{0,30}afd|stoppt.{0,30}afd)/.test(s))return"Gegen AfD";if(/antifa|antifaschis/.test(s))return"Antifaschistisch";return"Andere / unbekannt"}
const matches=e=>{let q=document.getElementById("search").value.toLocaleLowerCase("de"),r=document.getElementById("region").value,c=document.getElementById("city").value,t=document.getElementById("topic").value,p=document.getElementById("position").value;if(r!=="Alle Bundesländer"&&e.state!==r)return false;if(c&&e.city!==c)return false;if(t!=="Alle Themen"&&topic(e.title)!==t)return false;if(p!=="Alle Positionen"){const org=(e.organizer||"").toLowerCase();const isAfD=/\bafd\b|alternative für deutschland/.test(org);const isCDU=/\bcdu\b|christlich demokratische union/.test(org);const label=political(e.title);if(p==="AfD organisiert"&&!isAfD)return false;if(p==="CDU organisiert"&&!isCDU)return false;if(p==="Gegen AfD"&&label!=="Gegen AfD")return false;if(p==="Antifaschistisch"&&label!=="Antifaschistisch")return false;if(p==="Gegen CDU"&&!/gegen.{0,55}\bcdu\b/i.test(e.title))return false;if(p==="Andere / unbekannt"&&(isAfD||isCDU||label!=="Andere / unbekannt"))return false;}return (e.title+" "+e.city+" "+e.state+" "+(e.organizer||"")+" "+e.location+" "+e.route).toLocaleLowerCase("de").includes(q)};
const knownStates={"Berlin":"Berlin","Dresden":"Sachsen","Rostock":"Mecklenburg-Vorpommern","Würzburg":"Bayern","Münster":"Nordrhein-Westfalen","Weimar":"Thüringen","Lüneburg":"Niedersachsen","Papenburg":"Niedersachsen","Bielefeld":"Nordrhein-Westfalen"};
function updateCityChoices(){
 const filter=document.getElementById("city");if(!filter)return;
 const old=filter.value;
 const region=document.getElementById("region").value;
 const cities=[...new Set(records.filter(e=>region==="Alle Bundesländer"||e.state===region).map(e=>e.city).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"de"));
 filter.replaceChildren(new Option(T("filter.allCities"),""),...cities.map(c=>new Option(c,c)));
 filter.value=cities.includes(old)?old:"";
 filter.disabled=!cities.length;
}
let sel=new Date(new Date().getFullYear(),new Date().getMonth(),1), listMode=false;
function render(){const y=sel.getFullYear(),m=sel.getMonth(),start=(new Date(y,m,1).getDay()+6)%7,days=new Date(y,m+1,0).getDate();document.getElementById("monthLabel").textContent=new Intl.DateTimeFormat(locale(),{month:"long",year:"numeric"}).format(sel);const bydate=new Map();for(const e of records.filter(matches)){if(e.date.slice(0,7)!==y+"-"+String(m+1).padStart(2,"0"))continue;const a=bydate.get(e.date)||[];a.push(e);bydate.set(e.date,a)}let html="";for(let i=0;i<42;i++){const d=i-start+1,dt=new Date(y,m,d),off=d<1||d>days,k=dt.getFullYear()+"-"+String(dt.getMonth()+1).padStart(2,"0")+"-"+String(dt.getDate()).padStart(2,"0"),a=off?[]:bydate.get(k)||[],today=dt.toDateString()===new Date().toDateString();html+='<div class="day '+(off?"muted ":"")+(today?"today":"")+'"><span class="daynum">'+dt.getDate()+'</span>'+(a.length?'<button class="day-events" data-date="'+k+'" style="display:block;border:0;background:#def7f0;color:#076957;border-radius:5px;margin-top:6px;padding:3px 5px;font-size:11px;font-weight:750;max-width:100%">'+esc(T("calendar.dayCount",{count:a.length,suffix:a.length!==1?"s":""}))+"</button>":"")+"</div>"}document.getElementById("calendar").innerHTML=html;const filtered=records.filter(matches).filter(e=>e.date.slice(0,7)===y+"-"+String(m+1).padStart(2,"0"));
document.getElementById("resultText").textContent=T("calendar.count",{count:filtered.length});
const visible=selectedDay?filtered.filter(e=>e.date===selectedDay):filtered;
const back=selectedDay?'<button id="backToCalendar" class="secondary" style="margin-bottom:12px">'+esc(T("calendar.back"))+'</button>':"";
document.getElementById("list").innerHTML=back+(visible.length?'<div style="display:grid;gap:12px">'+visible.slice(0,300).map(e=>card(e)).join("")+"</div>":'<div class="empty"><h3>'+esc(T("calendar.noMatches"))+'</h3><p>'+esc(T("calendar.adjust"))+"</p></div>");
if(selectedDay){const backButton=document.getElementById("backToCalendar");if(backButton)backButton.onclick=()=>toggle(false)}
}

function renderSourceInfo(){
 const notice=document.querySelector(".notice"),stats=document.querySelectorAll(".stat")[0];
 if(notice){
  if(!records.length)notice.textContent=T(loadFailed?"source.loadFailed":"source.loadingNotice");
  else if(communityCount){
   notice.innerHTML="<strong>ℹ️ "+esc(T("source.summary"))+":</strong> "+esc(T("source.officialCount",{count:officialCount}))+" · "+esc(T("source.additionalCount",{count:communityCount}))+" <a href='https://demonstrations.org/en/data' target='_blank' rel='noopener noreferrer'>Demos Berlin e. V.</a> "+esc(T("source.license"))+" "+esc(T("source.dedup"))+" "+esc(T("source.disclaimer"));
  }else{
   notice.innerHTML="<strong>ℹ️ "+esc(T("source.live"))+":</strong> "+esc(T("source.official",{count:officialCount}))+" "+esc(T("source.updated",{updated:updated?new Date(updated).toLocaleString(locale()):"—"}))+" "+esc(T("source.disclaimer"));
  }
 }
 if(stats&&records.length){
  stats.innerHTML="<span>"+esc(T("stat.status"))+"</span><strong>"+records.length+" "+esc(T("feature.count",{count:""}).trim())+"</strong><span>"+esc(communityCount?T("source.mixed"):T("source.officialLabel"))+"</span>";
 }
}

let sourceStatus=null;
function renderMonitoredSources(){
 if(!sourceStatus||!Array.isArray(sourceStatus.sources))return;
 const note=document.getElementById("source-status-note")||document.createElement("p");
 note.id="source-status-note";note.className="small";note.style.margin="12px 0";
 const sources=sourceStatus.sources.map(x=>x.city+" ("+(x.status==="ok"?T("source.available"):x.status==="reachable_unverified_format"?T("source.waiting"):T("source.unavailable"))+")").join(", ");
 note.textContent=T("source.status",{sources});
 if(!note.isConnected){const box=document.querySelector(".notice");if(box)box.insertAdjacentElement("afterend",note)}
}

let articleMatches={};
function renderFeatured(){
 const parts=new Intl.DateTimeFormat("de-DE",{timeZone:"Europe/Berlin",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
 const get=k=>parts.find(p=>p.type===k)?.value||"";
 const today=get("year")+"-"+get("month")+"-"+get("day");
 function offset(days){const d=new Date(today+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}
 const dateLabel=date=>new Intl.DateTimeFormat(locale(),{timeZone:"UTC",weekday:"long",day:"numeric",month:"long"}).format(new Date(date+"T12:00:00Z"));
 const selected=[
  {id:"today",from:today,to:today,max:6},
  {id:"tomorrow",from:offset(1),to:offset(1),max:6},
  {id:"week",from:today,to:offset(6),max:9}
 ];
 document.getElementById("todayDate").textContent=dateLabel(today)+" · "+T("feature.today");
 document.getElementById("tomorrowDate").textContent=dateLabel(offset(1))+" · "+T("feature.tomorrow");
 document.getElementById("weekDate").textContent=dateLabel(today)+" – "+dateLabel(offset(6))+" · "+T("feature.week");
 const crowd=e=>{const v=String(e.registered_participants||"");const m=v.replace(/\./g,"").match(/(\d[\d ]*)/);return m?Number(m[1].replace(/\s/g,"")):null};
 const score=e=>{const n=crowd(e),rec=/täglich|jeweils mo|dauerhaft|vom \d\d\.\d\d\. bis/i.test(e.title);return (n!==null?Math.min(n,100000)/10:0)+(e.route?35:0)+(e.organizer?10:0)-(rec?55:0)};
 const search=e=>{const title=e.title.replace(/\([^)]{25,}\)/g,"").replace(/\s+/g," ").slice(0,115);const lang=locale()==="de-DE"?"de":"en";return "https://news.google.com/search?q="+encodeURIComponent('"'+title+'" '+e.city)+"&hl="+lang+"&gl=DE&ceid=DE%3A"+lang};
 for(const x of selected){
  const holder=document.getElementById(x.id+"Items");if(!holder)continue;
  const selectedRegion=document.getElementById("region").value,selectedCity=document.getElementById("city").value;
  const matching=records.filter(e=>e.date>=x.from&&e.date<=x.to&&matches(e));
  document.getElementById(x.id+"Count").textContent=T("feature.count",{count:matching.length});
  const unique=new Map();
  for(const e of matching){const k=(e.date+"-"+e.city+"-"+e.start+"-"+e.title).toLowerCase().replace(/\s+/g," ");if(!unique.has(k))unique.set(k,e)}
  let sorted=[...unique.values()];
  if(x.id==="week"){
   // Balance dates: first pick up to two per day, then fill open places by score.
   const days=new Map();for(const e of sorted){const a=days.get(e.date)||[];a.push(e);days.set(e.date,a)}
   const chosen=[];for(const [day,items] of [...days.entries()].sort((a,b)=>a[0].localeCompare(b[0]))){items.sort((a,b)=>score(b)-score(a));chosen.push(...items.slice(0,2))}
   sorted=chosen.slice(0,x.max);
  }else sorted.sort((a,b)=>score(b)-score(a)||a.start.localeCompare(b.start)||a.title.localeCompare(b.title));
  const items=sorted.slice(0,x.max);
  if(!items.length){holder.className="featured-empty";holder.textContent=T("feature.empty");continue}
  holder.className="featured-grid";
  holder.innerHTML=items.map(e=>{
   const articles=Array.isArray(articleMatches[e.id])?articleMatches[e.id].slice(0,2):[];
   const links=articles.map(n=>'<a href="'+esc(n.url)+'" target="_blank" rel="noopener noreferrer" title="'+esc(T("feature.candidateTitle"))+'" >'+esc(n.source)+": "+esc(n.title)+'</a>').join("");
   const meta=(x.id==="week"?esc(formatDate(e.date))+" · ":"")+esc(e.start||T("calendar.timeUnknown"))+(e.start?" ":"")+" · "+esc(e.city)+(e.location?" · "+esc(e.location):"")+(e.organizer?" · "+esc(e.organizer):"")+(e.registered_participants?" · "+esc(T("feature.registered"))+": "+esc(e.registered_participants):"");
   return '<article class="featured-item topic-card topic-'+topicSlug(e.title)+'"><span class="featured-badge topic-badge topic-'+topicSlug(e.title)+'">'+esc(localTopic(e.title))+'</span><h3><a class="event-card-link" href="'+esc(detailHref(e))+'">'+esc(e.title)+'</a></h3><div class="featured-meta"'+meta+'</div><div class="featured-links"><a href="'+esc(e.source_url)+'" target="_blank" rel="noopener noreferrer">'+esc(T("feature.source"))+'</a><a href="'+esc(search(e))+'" target="_blank" rel="noopener noreferrer" title="'+esc(T("feature.searchTitle"))+'" >'+esc(T("feature.newsSearch"))+'</a></div>'+(links?'<div class="featured-meta"><strong>'+esc(T("feature.candidate"))+'</strong></div><div class="featured-links">'+links+"</div>":"")+"</article>"
  }).join("");
 }
}

function requestedEventId(){
 try{return new URLSearchParams(window.location.search).get("event")}catch{return null}
}
function detailField(label,value){
 return value?'<div class="event-detail-field"><strong>'+esc(label)+'</strong><span>'+esc(value)+'</span></div>':"";
}
function renderDetail(){
 const overlay=document.getElementById("eventDetail");
 const holder=document.getElementById("eventDetailContent");
 if(!overlay||!holder)return;
 const id=requestedEventId();
 if(!id){overlay.hidden=true;document.body.classList.remove("detail-open");return}
 const event=records.find(e=>String(e.id)===id);
 // Community records load after official records. Avoid a premature "not found".
 if(!event&&!communityReady&&!loadFailed)return;
 if(event){
  const metadata=[
   detailField(T("detail.date"),formatDate(event.date)),
   detailField(T("detail.time"),event.start||T("calendar.timeUnknown")),
   detailField(T("detail.end"),event.end),
   detailField(T("detail.city"),event.city),
   detailField(T("detail.state"),event.state),
   detailField(T("detail.location"),event.location),
   detailField(T("event.route"),event.route),
   detailField(T("event.organizer"),event.organizer),
   detailField(T("event.participants"),event.registered_participants),
   detailField(T("detail.status"),event.event_status||T(String(event.id).startsWith("demos-")?"event.community":"event.official"))
  ].join("");
  const source=safeSourceUrl(event.source_url);
  const license=event.license?'<p class="small">'+esc(T("detail.license"))+': '+esc(event.license)+'</p>':"";
  holder.innerHTML='<span class="topic-badge topic-'+topicSlug(event.title)+'">'+esc(localTopic(event.title))+'</span><h2 id="eventDetailTitle">'+esc(event.title)+'</h2><div class="event-detail-grid">'+metadata+'</div><p class="small">'+esc(T("calendar.source"))+': '+esc(event.source||T("calendar.officialSource"))+'</p>'+license+'<p class="small">'+esc(T("detail.note"))+'</p><div class="event-detail-actions">'+(source?'<a href="'+esc(source)+'" target="_blank" rel="noopener noreferrer">'+esc(T("detail.source"))+'</a>':"")+'<button id="eventShare" type="button">'+esc(T("detail.share"))+'</button><button id="eventBack" type="button">'+esc(T("detail.back"))+'</button></div>';
 }else holder.innerHTML='<h2 id="eventDetailTitle">'+esc(T("detail.title"))+'</h2><p>'+esc(T("detail.missing"))+'</p><div class="event-detail-actions"><button id="eventBack" type="button">'+esc(T("detail.back"))+'</button></div>';
 overlay.hidden=false;document.body.classList.add("detail-open");
 const back=document.getElementById("eventBack");if(back)back.onclick=closeDetail;
 const share=document.getElementById("eventShare");
 if(share)share.onclick=async()=>{
  const url=window.location.href;
  try{await navigator.clipboard.writeText(url);share.textContent=T("detail.copied")}
  catch{share.textContent=url;share.setAttribute("aria-label",url)}
 };
 if(!detailFocus){detailFocus=document.activeElement;const close=document.getElementById("eventDetailClose");if(close&&close.focus)close.focus()}
}
function closeDetail(){
 const overlay=document.getElementById("eventDetail");if(overlay)overlay.hidden=true;
 document.body.classList.remove("detail-open");
 try{
  const u=new URL(window.location.href);
  u.searchParams.delete("event");
  if(u.hash==="#eventDetail")u.hash="#demo-kalender";
  if(window.history?.replaceState)window.history.replaceState(null,"",u.pathname+u.search+u.hash);
  else window.location.assign(u.pathname+u.search+u.hash);
 }catch{}
 if(detailFocus&&detailFocus.focus)detailFocus.focus();
 detailFocus=null;
}
document.getElementById("eventDetailClose")?.addEventListener("click",closeDetail);
document.getElementById("eventDetail")?.addEventListener("click",e=>{if(e.target===e.currentTarget)closeDetail()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!document.getElementById("eventDetail")?.hidden)closeDetail()});
window.addEventListener?.("popstate",renderDetail);

function card(e){
const fields=[e.location,e.route?T("event.route")+": "+e.route:"",e.organizer?T("event.organizer")+": "+e.organizer:"",e.registered_participants?T("event.participants")+": "+e.registered_participants:""].filter(Boolean);
return '<article class="event-list-card topic-card topic-'+topicSlug(e.title)+'"><div class="event-card-top"><span class="topic-badge topic-'+topicSlug(e.title)+'">'+esc(localTopic(e.title))+'</span><span class="small">'+esc(formatDate(e.date))+" · "+esc(e.start)+(e.start&&locale()==="de-DE"?" Uhr":"")+" · "+esc(e.city)+"</span></div><strong>"+esc(e.title)+'</strong><a class="event-card-link" href="'+esc(detailHref(e))+'">'+esc(T("detail.open"))+'</a><div class="small">'+fields.map(esc).join(" · ")+'</div><div class="small" style="margin-top:8px">'+esc(T("calendar.source"))+': <a href="'+esc(e.source_url)+'" target="_blank" rel="noopener noreferrer">'+esc(e.source||T("calendar.officialSource"))+'</a> · '+esc(e.id.startsWith("demos-")?T("event.community"):T("event.official"))+'</div></article>';
}
document.getElementById("calendar").addEventListener("click",ev=>{const btn=ev.target.closest("[data-date]");if(!btn)return;selectedDay=btn.dataset.date;toggle(true)});
function toggle(l){listMode=l;if(!l)selectedDay=null;document.getElementById("calendarWrap").classList.toggle("hidden",l);document.getElementById("list").classList.toggle("visible",l);document.getElementById("calendarBtn").classList.toggle("active",!l);document.getElementById("listBtn").classList.toggle("active",l);render()}
document.getElementById("prev").onclick=()=>{sel=new Date(sel.getFullYear(),sel.getMonth()-1,1);render()};document.getElementById("next").onclick=()=>{sel=new Date(sel.getFullYear(),sel.getMonth()+1,1);render()};document.getElementById("calendarBtn").onclick=()=>toggle(false);document.getElementById("listBtn").onclick=()=>{selectedDay=null;toggle(true)};["search","topic","position","city"].forEach(id=>document.getElementById(id).addEventListener(id==="search"?"input":"change",()=>{render();renderFeatured()}));document.getElementById("region").addEventListener("change",()=>{updateCityChoices();render();renderFeatured()});
document.addEventListener("demoradar:languagechange",()=>{updateCityChoices();render();renderFeatured();renderSourceInfo();renderMonitoredSources();renderDetail()});
fetch("/data/source-status.json",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(info=>{sourceStatus=info;renderMonitoredSources()}).catch(()=>{});
fetch("/data/events.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error(r.status);return r.json()}).then(d=>{if(!Array.isArray(d.events))throw Error("Invalid data");records=d.events;updated=d.updated_at;for(const e of records){if(!e.state&&knownStates[e.city])e.state=knownStates[e.city]}updateCityChoices();
officialCount=records.length;
fetch("/data/demos-events.json",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(extra=>{
 if(!extra||!Array.isArray(extra.events)||extra.license!=="CC BY-SA 4.0")return;
 const normalized=s=>String(s||"").toLocaleLowerCase("de").normalize("NFKD").replace(/\p{M}/gu,"").replace(/[^a-z0-9]+/g," ").trim();
 const buckets=new Map();
 const bucketKey=e=>[e.date,normalized(e.city)].join("|");
 const add=e=>{const key=bucketKey(e),a=buckets.get(key)||[];a.push(e);buckets.set(key,a)};
 for(const e of records)add(e);
 const sameTitle=(a,b)=>a===b||(Math.min(a.length,b.length)>=45&&(a.startsWith(b)||b.startsWith(a)));
 const sameEvent=(a,b)=>{
  const x=normalized(a.title),y=normalized(b.title);
  if(!sameTitle(x,y))return false;
  const la=normalized(a.location),lb=normalized(b.location);
  if(la&&lb&&la!==lb)return false;
  return a.start===b.start||(la&&lb&&la===lb)||Math.min(x.length,y.length)>=60;
 };
 const states={"berlin":"Berlin","dresden":"Sachsen","rostock":"Mecklenburg-Vorpommern","wur zburg":"Bayern","wurzburg":"Bayern","munster":"Nordrhein-Westfalen","bielefeld":"Nordrhein-Westfalen","weimar":"Thüringen","luneburg":"Niedersachsen","papenburg":"Niedersachsen"};
 let appended=0;
 for(const e of extra.events){
  if(!e||e.country!=="DE"||!e.date||!e.city||!e.title||!String(e.id).startsWith("demos-"))continue;
  const key=bucketKey(e);
  if((buckets.get(key)||[]).some(other=>sameEvent(other,e)))continue;
  if(!e.state)e.state=states[normalized(e.city)]||"";
  add(e);records.push(e);appended++;
 }
 records.sort((a,b)=>a.date.localeCompare(b.date)||(a.start||"").localeCompare(b.start||"")||a.id.localeCompare(b.id));
 communityCount=appended;communityReady=true;updateCityChoices();render();renderFeatured();renderSourceInfo();renderDetail();
}).catch(err=>console.warn("Optional Demos data unavailable",err)).finally(()=>{communityReady=true;renderDetail()});renderSourceInfo();render();renderFeatured();fetch("/data/news-matches.json",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(n=>{if(n&&n.matches&&typeof n.matches==="object"){articleMatches=n.matches;renderFeatured()}}).catch(()=>{})}).catch(error=>{loadFailed=true;render();renderFeatured();renderSourceInfo();renderDetail();console.warn("Could not load official event data",error)});})();
