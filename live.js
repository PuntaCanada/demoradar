(()=>{"use strict";
let records=[],updated=null,officialCount=0,communityCount=0,loadFailed=false,selectedDay=null,communityReady=false,detailFocus=null;
const T=(key,args)=>window.DemoRadarI18n?.t(key,args)||key;
const locale=()=>window.DemoRadarI18n?.locale||"de-DE";
const formatDate=date=>new Intl.DateTimeFormat(locale(),{timeZone:"UTC",day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(date+"T12:00:00Z"));
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const topic=s=>{s=s.toLowerCase();if(/klima|umwelt|fridays for future|naturschutz/.test(s))return"Klima & Umwelt";if(/krieg|frieden|waffen|wehrpflicht|nato/.test(s))return"Frieden & Krieg";if(/miete|sozial|streik|gewerkschaft|tarif|arbeit/.test(s))return"Arbeit & Soziales";if(/migration|flüchtling|asyl/.test(s))return"Migration";if(/demokratie|afd|antifa|rechtsextrem|faschis/.test(s))return"Demokratie";return"Sonstiges"};
const topicSlug=title=>({"Klima & Umwelt":"climate","Frieden & Krieg":"peace","Arbeit & Soziales":"social","Migration":"migration","Demokratie":"democracy","Sonstiges":"other"})[topic(title)]||"other";
const classifyStatus=status=>{
 const v=String(status||"").toLocaleLowerCase("de");
 if(/\b(abgesagt|annulliert|storniert|fällt aus|faellt aus)\b/.test(v))return "cancelled";
 if(/\b(abgemeldet|zurückgezogen|zurueckgezogen)\b/.test(v))return "withdrawn";
 if(/\b(abgebrochen|vorzeitig beendet|aufgelöst|aufgeloest)\b/.test(v))return "stopped";
 return "";
};
const statusLabel=code=>code?T("status."+code):"";
const statusPills=e=>{
 const code=e.status_code||classifyStatus(e.event_status);
 const changes=Array.isArray(e.event_changes)?e.event_changes:[];
 let tags=code?'<span class="status-pill critical">'+esc(statusLabel(code))+'</span>':"";
 if(changes.length){
  let kind="status.otherChange";
  if(changes.some(c=>c.field==="route"))kind="status.routeChange";
  else if(changes.some(c=>["start","end"].includes(c.field)))kind="status.timeChange";
  else if(changes.some(c=>c.field==="location"))kind="status.placeChange";
  else if(changes.some(c=>c.field==="date"))kind="status.dateChange";
  else if(changes.some(c=>c.field==="event_status"))kind="status.statusChange";
  tags+='<span class="status-pill caution">'+esc(T(kind))+'</span>';
 }
 return tags?'<div class="status-badges">'+tags+'</div>':"";
};
const notifyMap=()=>document.dispatchEvent(new CustomEvent("demoradar:dataupdated",{detail:{events:records}}));

let statusSnapshot=null;
function applyUpdateMetadata(){
 const statuses=statusSnapshot?.statuses||{};
 const log=Array.isArray(statusSnapshot?.changes)?statusSnapshot.changes:[];
 const latest=new Map();
 for(const update of log){
  if(!latest.has(update.id))latest.set(update.id,update);
 }
 for(const event of records){
  const explicit=statuses[event.id]?.status;
  event.status_code=explicit||classifyStatus(event.event_status);
  event.event_changes=latest.get(event.id)?.changes||[];
 }
 render();renderFeatured();renderDetail();notifyMap();
}
function fetchEventUpdates(){
 fetch("/data/event-updates.json",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(data=>{
  if(data&&data.version===1&&data.previous&&data.statuses){statusSnapshot=data;applyUpdateMetadata()}
 }).catch(()=>{});
}

let reviewedStreams=[],reviewedContacts=[],streamCandidates=[];
const permittedStreamHost={"youtube.com":"YouTube","youtu.be":"YouTube","twitch.tv":"Twitch","tiktok.com":"TikTok","instagram.com":"Instagram"};
function trustedStreamUrl(value){
 try{
  const u=new URL(value);
  if(u.protocol!=="https:"||u.username||u.password)return null;
  const host=u.hostname.toLowerCase().replace(/^www\./,"").replace(/^m\./,"");
  const platform=permittedStreamHost[host];
  if(!platform||!u.pathname||u.pathname==="/")return null;
  return {url:u.href,platform};
 }catch{return null}
}
function reviewedLinks(event){
 const now=Date.now();
 const streams=reviewedStreams.filter(item=>{
  if(item.event_id!==event.id||item.reviewed!==true||!item.evidence_url||!safeSourceUrl(item.evidence_url))return false;
  const u=trustedStreamUrl(item.url);
  if(!u)return false;
  const until=Date.parse(item.valid_until||"");
  return Number.isFinite(until)&&until>now&&until<now+90*86400000;
 }).slice(0,5);
 const contacts=reviewedContacts.filter(item=>
  item.event_id===event.id&&item.reviewed===true&&item.organizer&&
  item.source_url&&safeSourceUrl(item.source_url)&&item.url&&safeSourceUrl(item.url)&&
  /^https:\/\//i.test(item.url)
 ).slice(0,3);
 return {streams,contacts};
}
// Only reviewed links explicitly attached to a demonstration are shown as matches.
// Live status expires after 15 minutes unless a fresh verified check is recorded.
function eventStreams(event){
 const now=Date.now();
 return reviewedStreams.filter(item=>{
  if(!item||item.event_id!==event.id||item.reviewed!==true)return false;
  if(!item.evidence_url||!safeSourceUrl(item.evidence_url)||!trustedStreamUrl(item.url))return false;
  const expiry=Date.parse(item.valid_until||"");
  return Number.isFinite(expiry)&&expiry>now;
 }).slice(0,5).map(item=>{
  const main=trustedStreamUrl(item.url);
  const playback=trustedStreamUrl(item.recording_url);
  const checked=Date.parse(item.live_checked_at||"");
  const isLive=item.live_status==="live"&&Number.isFinite(checked)&&checked<=now&&now-checked<15*60000;
  const recording=Boolean(playback&&item.recording_reviewed===true);
  return {...item,platform:main.platform,isLive,recording,playbackUrl:recording?playback.url:""};
 });
}
function streamSearchUrl(event){
 return "https://www.youtube.com/results?search_query="+encodeURIComponent([event.title,event.city,event.date,"Demo Livestream"].filter(Boolean).join(" ").slice(0,220));
}
function provisionalEventStreams(event){
 const now=Date.now();
 return streamCandidates.filter(s=>{
  if(!s||s.event_id!==event.id||s.reviewed===true||s.auto_match!==true)return false;
  const u=trustedStreamUrl(s.url);if(!u)return false;
  const when=Date.parse(s.checked_at||"");
  if(!Number.isFinite(when)||when>now||now-when>14*86400000)return false;
  // LIVE is only labelled current when checked at the platform within 15 minutes.
  return s.status==="recording"||s.status==="live"&&now-when<15*60000;
 }).slice(0,3);
}
function streamTeaser(event){
 const german=locale().startsWith("de"),streams=eventStreams(event);
 if(streams.length){
  return '<div class="event-stream-teaser">'+streams.map(item=>{
   const label=item.isLive?"🔴 LIVE · ":item.recording?(german?"▶ Aufzeichnung · ":"▶ Recording · "):(german?"🎥 Stream-Link · ":"🎥 Stream link · ");
   return '<a href="'+esc(item.recording?item.playbackUrl:item.url)+'" target="_blank" rel="noopener noreferrer">'+esc(label+String(item.channel||item.label||item.platform))+'</a>';
  }).join("")+'</div>';
 }
 const twitch="https://www.twitch.tv/search?term="+encodeURIComponent([event.title,event.city,event.date].filter(Boolean).join(" ").slice(0,180));
 const provisional=provisionalEventStreams(event);
 const possible=provisional.length?'<div class="event-stream-teaser tentative">'+provisional.map(s=>{
  const status=s.status==="live"?(german?"🔴 Möglicher LIVE-Bezug":"🔴 Possible LIVE match"):(german?"▶ Mögliche Aufzeichnung":"▶ Possible recording");
  return '<a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer" title="'+esc(german?"Automatischer, noch ungeprüfter Veranstaltungsbezug":"Automatically matched; event association not confirmed")+'">'+esc(status+" · "+String(s.channel||s.platform))+'</a>';
 }).join("")+'</div>':"";
 return possible+'<div class="event-stream-teaser"><a href="'+esc(streamSearchUrl(event))+'" target="_blank" rel="noopener noreferrer">'+esc(german?"🎥 YouTube-Streams / Aufzeichnungen suchen":"🎥 Search YouTube streams / replays")+'</a><a href="'+esc(twitch)+'" target="_blank" rel="noopener noreferrer">'+esc(german?"Twitch durchsuchen":"Search Twitch")+'</a></div>';
}
function communityExtra(event){
 const {streams,contacts}=reviewedLinks(event);
 const eventLink=(window.location.origin||"https://demoradar.pages.dev")+(locale()==="de-DE"?"/":"/en/")+detailHref(event);
 const idSearch="https://github.com/PuntaCanada/demoradar/issues?q="+encodeURIComponent("is:issue "+event.id);
 const suggestionLink=(name)=>"https://github.com/PuntaCanada/demoradar/issues/new?template="+name;
 const searchPhrase=[event.title,event.city,event.date,"Livestream"].filter(Boolean).join(" ").slice(0,220);
 const searching=[
  [T("detail.searchYouTube"),"https://www.youtube.com/results?search_query="+encodeURIComponent(searchPhrase)],
  [T("detail.searchTwitch"),"https://www.twitch.tv/search?term="+encodeURIComponent(searchPhrase)],
  [T("detail.searchTikTok"),"https://www.tiktok.com/search?q="+encodeURIComponent(searchPhrase)]
 ].map(([label,url])=>'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+'</a>').join("");
 const german=locale().startsWith("de");
 const streamList=eventStreams(event).map(s=>{
  const label=s.isLive?"🔴 LIVE":s.recording?(german?"▶ Aufzeichnung":"▶ Recording"):(german?"Stream-Link · Live-Status ungeprüft":"Stream link · Live status unverified");
  const url=s.recording?s.playbackUrl:s.url;
  return '<li><a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(label+" · "+String(s.channel||s.label||s.platform))+'</a></li>';
 }).join("");
 const possible=provisionalEventStreams(event).map(s=>'<li><a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc((s.status==="live"?"🔴 ":"▶ ")+(german?"Möglicher Treffer (ungeprüft)":"Possible match (unverified)")+" · "+String(s.channel||s.platform))+'</a></li>').join("");
 const contactList=contacts.map(c=>'<li><a href="'+esc(safeSourceUrl(c.url))+'" target="_blank" rel="noopener noreferrer">'+esc(c.organizer)+'</a></li>').join("");
 return '<section class="detail-community-actions">'+
  '<h3>'+esc(T("detail.streams"))+'</h3>'+
  (streamList?'<ul>'+streamList+'</ul>':possible?'<p>'+esc(german?"Automatisch gefundene, noch ungeprüfte mögliche Treffer:":"Automatically discovered, unverified possible matches:")+'</p><ul>'+possible+'</ul>':'<p>'+esc(T("detail.streamEmpty"))+'</p>')+
  '<p>'+esc(T("detail.streamNotice"))+'</p>'+
  '<a href="'+esc(suggestionLink("livestream.yml"))+'" target="_blank" rel="noopener noreferrer">'+esc(T("detail.streamSuggest"))+'</a>'+
  '<p><strong>'+esc(T("detail.streamSearch"))+'</strong></p>'+searching+'<p>'+esc(T("detail.searchDisclaimer"))+'</p>'+
  '<h3>'+esc(T("detail.contact"))+'</h3>'+
  (contactList?'<ul>'+contactList+'</ul>':'<p>'+esc(T("detail.contactEmpty"))+'</p>')+
  '<a href="'+esc(suggestionLink("organizer.yml"))+'" target="_blank" rel="noopener noreferrer">'+esc(T("detail.contactSuggest"))+'</a>'+
  '<h3>'+esc(T("nav.community"))+'</h3>'+
  '<a href="'+esc(idSearch)+'" target="_blank" rel="noopener noreferrer">'+esc(T("detail.community"))+'</a>'+
  '</section>';
}
function loadCommunityLinks(){
 Promise.all([
  fetch("/data/live-streams.json",{cache:"no-store"}).then(r=>r.ok?r.json():null),
  fetch("/data/organizer-contacts.json",{cache:"no-store"}).then(r=>r.ok?r.json():null),
  fetch("/data/stream-discoveries.json",{cache:"no-store"}).then(r=>r.ok?r.json():null).catch(()=>null)
 ]).then(([streams,contacts,discoveries])=>{
  reviewedStreams=Array.isArray(streams?.streams)?streams.streams:[];
  reviewedContacts=Array.isArray(contacts?.contacts)?contacts.contacts:[];
  streamCandidates=discoveries?.version===1&&Array.isArray(discoveries.candidates)?discoveries.candidates:[];
  renderDetail();render();renderFeatured();
 }).catch(()=>{});
}
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
 const isGerman=locale().startsWith("de");
 const title=isGerman?"Amtliche Datenquellen: letzter Import":"Official data sources: last import";
 const checked=sourceStatus.checked_at?new Date(sourceStatus.checked_at):null;
 const checkedLabel=checked&&!Number.isNaN(checked.getTime())
  ?new Intl.DateTimeFormat(locale(),{dateStyle:"medium",timeStyle:"short",timeZone:"Europe/Berlin"}).format(checked)
  :(isGerman?"Zeitpunkt unbekannt":"Time unknown");
 const container=document.getElementById("source-status-note")||document.createElement("section");
 container.id="source-status-note";
 container.className="source-status-note";
 container.setAttribute("aria-label",title);
 const heading=document.createElement("strong");heading.textContent=title;
 const timestamp=document.createElement("p");timestamp.className="small";
 timestamp.textContent=(isGerman?"Letzter Quellencheck: ":"Last source check: ")+checkedLabel;
 const list=document.createElement("ul");
 for(const entry of sourceStatus.sources){
  const row=document.createElement("li");
  const city=document.createElement("strong");city.textContent=String(entry.city||"—");
  row.append(city,document.createTextNode(" · "));
  const count=Number.isInteger(entry.imported)&&entry.imported>=0?entry.imported:null;
  let status;
  if(entry.status==="ok"&&count>0){
   status=isGerman?count+" Termine importiert":count+" events imported";
  }else if(entry.status==="ok"&&count===0){
   status=isGerman?"Quelle erreichbar, 0 Termine importiert":"Source reachable, 0 events imported";
  }else if(entry.status==="ok"){
   status=isGerman?"Quelle erreichbar, Importanzahl unbekannt":"Source reachable, import count unknown";
  }else if(entry.status==="reachable_unverified_format"){
   status=isGerman?"Erreichbar, Format noch nicht bestätigt":"Reachable, format not yet verified";
  }else{
   status=isGerman?"Keine bestätigte erfolgreiche Abfrage":"No confirmed successful fetch";
  }
  row.append(document.createTextNode(status));
  try{
   const url=new URL(String(entry.url||""));
   if(url.protocol==="https:"&&!url.username&&!url.password){
    const anchor=document.createElement("a");anchor.href=url.href;anchor.target="_blank";anchor.rel="noopener noreferrer";
    anchor.textContent=isGerman?"Amtliche Quelle":"Official source";
    row.append(document.createTextNode(" · "),anchor);
   }
  }catch{}
  list.append(row);
 }
 const caveat=document.createElement("p");caveat.className="small";
 caveat.textContent=isGerman
  ?"Ein erfolgreicher Abruf oder 0 importierte Einträge beweist weder Vollständigkeit noch, dass keine Demonstrationen stattfinden."
  :"A successful fetch or zero imported entries does not establish complete coverage or the absence of demonstrations.";
 container.replaceChildren(heading,timestamp,list,caveat);
 if(!container.isConnected){
  const note=document.querySelector(".notice");
  if(note)note.insertAdjacentElement("afterend",container);
 }
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
   return '<article class="featured-item topic-card topic-'+topicSlug(e.title)+'"><span class="featured-badge topic-badge topic-'+topicSlug(e.title)+'">'+esc(localTopic(e.title))+'</span><h3><a class="event-card-link" href="'+esc(detailHref(e))+'">'+esc(e.title)+'</a></h3>'+statusPills(e)+'<div class="featured-meta">'+meta+'</div><div class="featured-links"><a href="'+esc(e.source_url)+'" target="_blank" rel="noopener noreferrer">'+esc(T("feature.source"))+'</a><a href="'+esc(search(e))+'" target="_blank" rel="noopener noreferrer" title="'+esc(T("feature.searchTitle"))+'" >'+esc(T("feature.newsSearch"))+'</a></div>'+streamTeaser(e)+(links?'<div class="featured-meta"><strong>'+esc(T("feature.candidate"))+'</strong></div><div class="featured-links">'+links+"</div>":"")+"</article>"
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
 if(!id){overlay.hidden=true;document.body?.classList?.remove("detail-open");return}
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
  const changes=Array.isArray(event.event_changes)?event.event_changes:[];
  const updates=changes.length?'<section class="detail-updates"><h3>'+esc(T("status.updated"))+'</h3><ul>'+changes.map(c=>'<li><strong>'+esc(T(({"route":"status.routeChange","start":"status.timeChange","end":"status.timeChange","location":"status.placeChange","date":"status.dateChange","event_status":"status.statusChange"})[c.field]||"status.otherChange"))+'</strong>: '+esc(T("status.previous"))+' '+esc(c.previous||"—")+' → '+esc(T("status.current"))+' '+esc(c.current||"—")+'</li>').join("")+'</ul><p class="small">'+esc(T("status.uncertain"))+'</p></section>':"";
  const reports=Array.isArray(articleMatches[event.id])?articleMatches[event.id].slice(0,3):[];
  const newsQuery="https://news.google.com/search?q="+encodeURIComponent('"'+event.title.slice(0,120)+'" '+event.city)+"&hl="+(locale()==="de-DE"?"de":"en")+"&gl=DE";
    const news=reports.length?'<section class="detail-press"><h3>'+esc(T("news.title"))+'</h3><p class="small">'+esc(T("news.candidate"))+'</p><ul>'+reports.filter(n=>safeSourceUrl(n.url)).map(n=>'<li><a href="'+esc(safeSourceUrl(n.url))+'" target="_blank" rel="noopener noreferrer">'+esc(n.source)+': '+esc(n.title)+'</a></li>').join("")+'</ul></section>':'<section class="detail-press"><h3>'+esc(T("news.title"))+'</h3><p class="small">'+esc(T("news.none"))+'</p></section>';
  const newsSearch='<a href="'+esc(newsQuery)+'" target="_blank" rel="noopener noreferrer">'+esc(T("news.find"))+'</a>';
  const source=safeSourceUrl(event.source_url);
  const license=event.license?'<p class="small">'+esc(T("detail.license"))+': '+esc(event.license)+'</p>':"";
  holder.innerHTML='<span class="topic-badge topic-'+topicSlug(event.title)+'">'+esc(localTopic(event.title))+'</span><h2 id="eventDetailTitle">'+esc(event.title)+'</h2>'+statusPills(event)+'<div class="event-detail-grid">'+metadata+'</div><p class="small">'+esc(T("calendar.source"))+': '+esc(event.source||T("calendar.officialSource"))+'</p>'+license+updates+news+newsSearch+communityExtra(event)+'<p class="small">'+esc(T("detail.note"))+'</p><div class="event-detail-actions">'+(source?'<a href="'+esc(source)+'" target="_blank" rel="noopener noreferrer">'+esc(T("detail.source"))+'</a>':"")+'<button id="eventShare" type="button">'+esc(T("detail.share"))+'</button><button id="eventBack" type="button">'+esc(T("detail.back"))+'</button></div>';
 }else holder.innerHTML='<h2 id="eventDetailTitle">'+esc(T("detail.title"))+'</h2><p>'+esc(T("detail.missing"))+'</p><div class="event-detail-actions"><button id="eventBack" type="button">'+esc(T("detail.back"))+'</button></div>';
 overlay.hidden=false;document.body?.classList?.add("detail-open");
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
return '<article class="event-list-card topic-card topic-'+topicSlug(e.title)+'"><div class="event-card-top"><span class="topic-badge topic-'+topicSlug(e.title)+'">'+esc(localTopic(e.title))+'</span><span class="small">'+esc(formatDate(e.date))+" · "+esc(e.start)+(e.start&&locale()==="de-DE"?" Uhr":"")+" · "+esc(e.city)+"</span></div>"+statusPills(e)+"<strong>"+esc(e.title)+'</strong><a class="event-card-link" href="'+esc(detailHref(e))+'">'+esc(T("detail.open"))+'</a><div class="small">'+fields.map(esc).join(" · ")+'</div><div class="small" style="margin-top:8px">'+esc(T("calendar.source"))+': <a href="'+esc(e.source_url)+'" target="_blank" rel="noopener noreferrer">'+esc(e.source||T("calendar.officialSource"))+'</a> · '+esc(e.id.startsWith("demos-")?T("event.community"):T("event.official"))+'</div>'+streamTeaser(e)+'</article>';
}
document.getElementById("calendar").addEventListener("click",ev=>{const btn=ev.target.closest("[data-date]");if(!btn)return;selectedDay=btn.dataset.date;toggle(true)});
function toggle(l){listMode=l;if(!l)selectedDay=null;document.getElementById("calendarWrap").classList.toggle("hidden",l);document.getElementById("list").classList.toggle("visible",l);document.getElementById("calendarBtn").classList.toggle("active",!l);document.getElementById("listBtn").classList.toggle("active",l);render()}
document.getElementById("prev").onclick=()=>{sel=new Date(sel.getFullYear(),sel.getMonth()-1,1);render()};document.getElementById("next").onclick=()=>{sel=new Date(sel.getFullYear(),sel.getMonth()+1,1);render()};document.getElementById("calendarBtn").onclick=()=>toggle(false);document.getElementById("listBtn").onclick=()=>{selectedDay=null;toggle(true)};["search","topic","position","city"].forEach(id=>document.getElementById(id).addEventListener(id==="search"?"input":"change",()=>{render();renderFeatured()}));document.getElementById("region").addEventListener("change",()=>{updateCityChoices();render();renderFeatured()});
document.addEventListener("demoradar:languagechange",()=>{updateCityChoices();render();renderFeatured();renderSourceInfo();renderMonitoredSources();renderDetail()});
loadCommunityLinks();
// A LIVE suggestion must disappear when its 15-minute verification window expires,
// even if a visitor keeps the page open.
setInterval(()=>{if(streamCandidates.some(s=>s.status==="live")){render();renderFeatured();renderDetail()}},60000);
fetch("/data/source-status.json",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(info=>{sourceStatus=info;renderMonitoredSources()}).catch(()=>{});
fetch("/data/events.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error(r.status);return r.json()}).then(d=>{if(!Array.isArray(d.events))throw Error("Invalid data");records=d.events;updated=d.updated_at;for(const e of records){if(!e.state&&knownStates[e.city])e.state=knownStates[e.city]}updateCityChoices();
officialCount=records.length;notifyMap();fetchEventUpdates();
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
 communityCount=appended;communityReady=true;updateCityChoices();render();renderFeatured();renderSourceInfo();renderDetail();notifyMap();if(statusSnapshot)applyUpdateMetadata();
}).catch(err=>console.warn("Optional Demos data unavailable",err)).finally(()=>{communityReady=true;renderDetail()});renderSourceInfo();render();renderFeatured();fetch("/data/news-matches.json",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(n=>{if(n&&n.matches&&typeof n.matches==="object"){articleMatches=n.matches;renderFeatured();renderDetail()}}).catch(()=>{})}).catch(error=>{loadFailed=true;render();renderFeatured();renderSourceInfo();renderDetail();console.warn("Could not load official event data",error)});})();
