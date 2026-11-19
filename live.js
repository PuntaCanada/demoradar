(()=>{"use strict";
let records=[],updated=null;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const topic=s=>{s=s.toLowerCase();if(/klima|umwelt|fridays for future|naturschutz/.test(s))return"Klima & Umwelt";if(/krieg|frieden|waffen|wehrpflicht|nato/.test(s))return"Frieden & Krieg";if(/miete|sozial|streik|gewerkschaft|tarif|arbeit/.test(s))return"Arbeit & Soziales";if(/migration|flüchtling|asyl/.test(s))return"Migration";if(/demokratie|afd|antifa|rechtsextrem|faschis/.test(s))return"Demokratie";return"Sonstiges"};
function political(s){s=s.toLowerCase();if(/(gegen.{0,55}(afd|alternative für deutschland)|kein.{0,30}afd|stoppt.{0,30}afd)/.test(s))return"Gegen AfD";if(/antifa|antifaschis/.test(s))return"Antifaschistisch";return"Andere / unbekannt"}
const matches=e=>{let q=document.getElementById("search").value.toLocaleLowerCase("de"),r=document.getElementById("region").value,t=document.getElementById("topic").value,p=document.getElementById("position").value;if(r!=="Alle Bundesländer"&&e.state!==r)return false;if(t!=="Alle Themen"&&topic(e.title)!==t)return false;if(p!=="Alle Positionen"){const org=(e.organizer||"").toLowerCase();const isAfD=/\bafd\b|alternative für deutschland/.test(org);const isCDU=/\bcdu\b|christlich demokratische union/.test(org);const label=political(e.title);if(p==="AfD organisiert"&&!isAfD)return false;if(p==="CDU organisiert"&&!isCDU)return false;if(p==="Gegen AfD"&&label!=="Gegen AfD")return false;if(p==="Antifaschistisch"&&label!=="Antifaschistisch")return false;if(p==="Gegen CDU"&&!/gegen.{0,55}\bcdu\b/i.test(e.title))return false;if(p==="Andere / unbekannt"&&(isAfD||isCDU||label!=="Andere / unbekannt"))return false;}return (e.title+" "+e.city+" "+e.state+" "+(e.organizer||"")+" "+e.location+" "+e.route).toLocaleLowerCase("de").includes(q)};
let sel=new Date(new Date().getFullYear(),new Date().getMonth(),1), listMode=false;
function render(){const y=sel.getFullYear(),m=sel.getMonth(),start=(new Date(y,m,1).getDay()+6)%7,days=new Date(y,m+1,0).getDate();document.getElementById("monthLabel").textContent=new Intl.DateTimeFormat("de-DE",{month:"long",year:"numeric"}).format(sel);const bydate=new Map();for(const e of records.filter(matches)){if(e.date.slice(0,7)!==y+"-"+String(m+1).padStart(2,"0"))continue;const a=bydate.get(e.date)||[];a.push(e);bydate.set(e.date,a)}let html="";for(let i=0;i<42;i++){const d=i-start+1,dt=new Date(y,m,d),off=d<1||d>days,k=dt.getFullYear()+"-"+String(dt.getMonth()+1).padStart(2,"0")+"-"+String(dt.getDate()).padStart(2,"0"),a=off?[]:bydate.get(k)||[],today=dt.toDateString()===new Date().toDateString();html+='<div class="day '+(off?"muted ":"")+(today?"today":"")+'"><span class="daynum">'+dt.getDate()+'</span>'+(a.length?'<button class="day-events" data-date="'+k+'" style="display:block;border:0;background:#def7f0;color:#076957;border-radius:5px;margin-top:6px;padding:3px 5px;font-size:11px;font-weight:750;max-width:100%">'+a.length+' Demo'+(a.length!==1?"s":"")+"</button>":"")+"</div>"}document.getElementById("calendar").innerHTML=html;const filtered=records.filter(matches).filter(e=>e.date.slice(0,7)===y+"-"+String(m+1).padStart(2,"0"));document.getElementById("resultText").textContent=filtered.length+" gemeldete Veranstaltungen in diesem Monat";document.getElementById("list").innerHTML=filtered.length?'<div style="display:grid;gap:12px">'+filtered.slice(0,300).map(e=>card(e)).join("")+"</div>":'<div class="empty"><h3>Keine passenden Termine gefunden</h3><p>Suche oder Filter anpassen. Die Abdeckung ist noch unvollständig.</p></div>';}

let articleMatches={};
function renderFeatured(){
 const parts=new Intl.DateTimeFormat("de-DE",{timeZone:"Europe/Berlin",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
 const get=k=>parts.find(p=>p.type===k)?.value||"";
 const today=get("year")+"-"+get("month")+"-"+get("day");
 function offset(days){const d=new Date(today+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}
 const dateLabel=date=>new Intl.DateTimeFormat("de-DE",{timeZone:"UTC",weekday:"long",day:"numeric",month:"long"}).format(new Date(date+"T12:00:00Z"));
 const selected=[
  {id:"today",from:today,to:today,max:6},
  {id:"tomorrow",from:offset(1),to:offset(1),max:6},
  {id:"week",from:today,to:offset(6),max:9}
 ];
 document.getElementById("todayDate").textContent=dateLabel(today)+" · Aktuelle und angekündigte Versammlungen";
 document.getElementById("tomorrowDate").textContent=dateLabel(offset(1))+" · Angekündigte Versammlungen";
 document.getElementById("weekDate").textContent=dateLabel(today)+" bis "+dateLabel(offset(6))+" · Einschließlich heute";
 const crowd=e=>{const v=String(e.registered_participants||"");const m=v.replace(/\./g,"").match(/(\d[\d ]*)/);return m?Number(m[1].replace(/\s/g,"")):null};
 const score=e=>{const n=crowd(e),rec=/täglich|jeweils mo|dauerhaft|vom \d\d\.\d\d\. bis/i.test(e.title);return (n!==null?Math.min(n,100000)/10:0)+(e.route?35:0)+(e.organizer?10:0)-(rec?55:0)};
 const search=e=>{const title=e.title.replace(/\([^)]{25,}\)/g,"").replace(/\s+/g," ").slice(0,115);return "https://news.google.com/search?q="+encodeURIComponent('"'+title+'" '+e.city)+"&hl=de&gl=DE&ceid=DE%3Ade"};
 for(const x of selected){
  const holder=document.getElementById(x.id+"Items");if(!holder)continue;
  const matching=records.filter(e=>e.date>=x.from&&e.date<=x.to);
  document.getElementById(x.id+"Count").textContent=matching.length+" Meldungen";
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
  if(!items.length){holder.className="featured-empty";holder.textContent="Für diesen Zeitraum liegen in unseren bislang angebundenen Quellen keine Meldungen vor. Das ist keine vollständige Übersicht aller Demonstrationen.";continue}
  holder.className="featured-grid";
  holder.innerHTML=items.map(e=>{
   const articles=Array.isArray(articleMatches[e.id])?articleMatches[e.id].slice(0,2):[];
   const links=articles.map(n=>'<a href="'+esc(n.url)+'" target="_blank" rel="noopener noreferrer" title="Automatisch zugeordneter, redaktionell nicht geprüfter Artikel">'+esc(n.source)+": "+esc(n.title)+'</a>').join("");
   const meta=(x.id==="week"?esc(e.date.split("-").reverse().join("."))+" · ":"")+esc(e.start||"Zeit offen")+" Uhr · "+esc(e.city)+(e.location?" · "+esc(e.location):"")+(e.organizer?" · "+esc(e.organizer):"")+(e.registered_participants?" · angemeldet: "+esc(e.registered_participants):"");
   return '<article class="featured-item"><span class="featured-badge">'+esc(topic(e.title))+'</span><h3>'+esc(e.title)+'</h3><div class="featured-meta">'+meta+'</div><div class="featured-links"><a href="'+esc(e.source_url)+'" target="_blank" rel="noopener noreferrer">Amtliche Quelle</a><a href="'+esc(search(e))+'" target="_blank" rel="noopener noreferrer" title="Nachrichten-Suche, keine bestätigten Berichte">Nachrichten suchen</a></div>'+(links?'<div class="featured-meta"><strong>Möglicherweise zugehörige Presseartikel (automatisch, ungeprüft):</strong></div><div class="featured-links">'+links+"</div>":"")+"</article>"
  }).join("");
 }
}

function card(e){
const fields=[e.location,e.route?"Route: "+e.route:"",e.organizer?"Anmelder/Organisation: "+e.organizer:"",e.registered_participants?"Angemeldete Teilnehmer: "+e.registered_participants:""].filter(Boolean);
return '<article style="padding:15px;border:1px solid #e6eaf0;border-radius:10px"><div class="small">'+esc(e.date.split("-").reverse().join("."))+" · "+esc(e.start)+" Uhr · "+esc(e.city)+"</div><strong>"+esc(e.title)+'</strong><div class="small">'+fields.map(esc).join(" · ")+'</div><div class="small" style="margin-top:8px">Quelle: <a href="'+esc(e.source_url)+'" target="_blank" rel="noopener noreferrer">'+esc(e.source||"Amtliche Quelle")+'</a> · behördlich veröffentlicht (nicht zwingend durchgeführt)</div></article>';
}
document.getElementById("calendar").addEventListener("click",ev=>{let btn=ev.target.closest("[data-date]");if(!btn)return;const a=records.filter(matches).filter(e=>e.date===btn.dataset.date);document.getElementById("list").innerHTML='<button id="backToCalendar" class="secondary" style="margin-bottom:12px">← Zurück zum Kalender</button><div style="display:grid;gap:12px">'+a.map(card).join("")+"</div>";document.getElementById("calendarWrap").classList.add("hidden");document.getElementById("list").classList.add("visible");document.getElementById("backToCalendar").onclick=()=>toggle(false)});
function toggle(l){listMode=l;document.getElementById("calendarWrap").classList.toggle("hidden",l);document.getElementById("list").classList.toggle("visible",l);document.getElementById("calendarBtn").classList.toggle("active",!l);document.getElementById("listBtn").classList.toggle("active",l);render()}
document.getElementById("prev").onclick=()=>{sel=new Date(sel.getFullYear(),sel.getMonth()-1,1);render()};document.getElementById("next").onclick=()=>{sel=new Date(sel.getFullYear(),sel.getMonth()+1,1);render()};document.getElementById("calendarBtn").onclick=()=>toggle(false);document.getElementById("listBtn").onclick=()=>toggle(true);["search","region","topic","position"].forEach(id=>document.getElementById(id).addEventListener(id==="search"?"input":"change",render));
fetch("/data/source-status.json",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(info=>{if(!info||!Array.isArray(info.sources))return;const note=document.createElement("p");note.className="small";note.style.margin="12px 0";note.textContent="Weitere geprüfte Quellen: "+info.sources.map(x=>x.city+" ("+(x.status==="ok"?"abrufbar":x.status==="reachable_unverified_format"?"Website erreichbar, Import ausstehend":"derzeit nicht erreichbar")+")").join(", ")+". Die Abdeckung bleibt unvollständig.";const box=document.querySelector(".notice");if(box)box.insertAdjacentElement("afterend",note)}).catch(()=>{});
fetch("/data/events.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error(r.status);return r.json()}).then(d=>{if(!Array.isArray(d.events))throw Error("Invalid data");records=d.events;updated=d.updated_at;
const officialCount=records.length;
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
 const notice=document.querySelector(".notice");
 if(notice)notice.innerHTML="<strong>ℹ️ Veranstaltungsdaten:</strong> "+officialCount+" amtliche Meldungen und "+appended+" ergänzende Community-/Quellenmeldungen von <a href='https://demonstrations.org/en/data' target='_blank' rel='noopener noreferrer'>Demos Berlin e. V.</a> (CC BY-SA 4.0). Überschneidungen wurden anhand von Datum, Stadt, Beginn und identischem bzw. eindeutig gekürztem Titel entfernt. Die Abdeckung bleibt unvollständig; gemeldet bedeutet nicht durchgeführt.";
 const stat=document.querySelectorAll(".stat")[0];
 if(stat)stat.innerHTML="<span>AKTUELLE DATENQUELLEN</span><strong>"+records.length+" Meldungen</strong><span>Amtliche Stellen + Demos Berlin e. V. (CC BY-SA 4.0)</span>";
 render();renderFeatured();
}).catch(err=>console.warn("Optional Demos data unavailable",err));const n=document.querySelector(".notice");if(n)n.innerHTML="<strong>ℹ️ Live-Daten:</strong> "+records.length+" behördlich veröffentlichte Veranstaltungen aus "+[...new Set(records.map(e=>e.city))].join(" und ")+". Bundesweite Abdeckung im Aufbau. Letzte Datenaktualisierung: "+esc(updated?new Date(updated).toLocaleString("de-DE"):"unbekannt")+". Nicht alle angezeigten Veranstaltungen finden tatsächlich statt.";document.querySelectorAll(".stat")[0].innerHTML="<span>VERIFIZIERTE QUELLE</span><strong>"+records.length+" Meldungen</strong><span>Amtliche Versammlungsbehörden</span>";render();renderFeatured();fetch("/data/news-matches.json",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(n=>{if(n&&n.matches&&typeof n.matches==="object"){articleMatches=n.matches;renderFeatured()}}).catch(()=>{})}).catch(()=>{render();renderFeatured();console.info("No live data file deployed yet")});})();
