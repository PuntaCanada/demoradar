// Conservative, deterministic candidate matching. Never grants human-reviewed status.
const STOP=new Set("gegen fuer fur mit ohne die der das den dem eine einer einem aus von und zur zum pro demonstration kundgebung demo veranstaltung live livestream stream protest demonstrationen deutschland germany heute morgen bericht fuer gegen und bei für sowie oder zum fuer den deutschland aktion aktuelle aktuell demos proteste aktionstag berichterstattung gegendemo gegendemos montagsdemo montagsprotest livebericht".split(" "));
export function normalize(value){
 return String(value||"").toLocaleLowerCase("de").normalize("NFKD")
  .replace(/[\u0300-\u036f]/g,"").replace(/ß/g,"ss").replace(/([a-zäöü])(?=\d{1,2}[.\/-]\d{1,2})/g,"$1 ").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
}
export function words(text){return normalize(text).split(" ").filter(Boolean)}
const MEANINGFUL_SHORT=new Set(["afd","cdu","csu","bsw","spd","fdp","nato","nsu","g20","g7"]);
export function topics(text){return [...new Set(words(text).filter(w=>(w.length>=4||MEANINGFUL_SHORT.has(w))&&!STOP.has(w)))]}
export function cityMatches(title,city){
 const titleWords=words(title),parts=words(city);
 if(!parts.length)return false;
 // Require contiguous word boundaries, never substring "Essen" inside "Interessen".
 const contains=needle=>titleWords.some((_,i)=>needle.every((word,j)=>titleWords[i+j]===word));
 // If the title explicitly says the other Frankfurt, reject the conflicting district.
 const titleParts=titleWords.join(" ");
 const normalizedCity=parts.join(" ");
 if(normalizedCity==="frankfurt am main"&&/\bfrankfurt oder\b/.test(titleParts))return false;
 if(normalizedCity==="frankfurt oder"&&/\bfrankfurt am main\b/.test(titleParts))return false;
 if(contains(parts))return true;
 // Administrative city suffix: Frankfurt am Main -> Frankfurt; Halle (Saale) -> Halle.
 // Single prefix still requires at least one additional topic match below.
 return parts.length>=2&&contains([parts[0]])&&parts[0].length>=6;
}
export function explicitDateInTitle(title){
 const text=String(title||"");
 const iso=text.match(/(?:^|[^0-9])(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})(?:[^0-9]|$)/);
 const euro=text.match(/(?:^|[^0-9])(\d{1,2})[.\-/](\d{1,2})[.\-/](20\d{2})(?:[^0-9]|$)/);
 const short=text.match(/(?:^|[^0-9])(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2})(?:[^0-9]|$)/);
 const candidate=iso?[iso[1],iso[2],iso[3]]:euro?[euro[3],euro[2],euro[1]]:short?["20"+short[3],short[2],short[1]]:null;
 if(!candidate)return "";
 const value=candidate.map((part,index)=>index===0?part:part.padStart(2,"0")).join("-");
 const dt=new Date(value+"T12:00:00Z");
 return Number.isFinite(dt.getTime())&&dt.toISOString().slice(0,10)===value?value:"";
}
export function ambiguousOrInvalidTitleDates(title){
 const text=String(title||"");
 const matches=[
  ...text.matchAll(/(?:^|[^0-9])(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})(?=[^0-9]|$)/g),
  ...text.matchAll(/(?:^|[^0-9])(\d{1,2})[.\/-](\d{1,2})[.\/-](20\d{2}|\d{2})(?=[^0-9]|$)/g)
 ];
 const dates=new Set();
 for(const m of matches){
  let y,mo,day;
  if(m[1]?.startsWith("20")&&m[1].length===4&&Number(m[2])<=12){[y,mo,day]=[m[1],m[2],m[3]]}
  else{[day,mo,y]=[m[1],m[2],m[3]];if(y.length===2)y="20"+y}
  const date=[y,String(mo).padStart(2,"0"),String(day).padStart(2,"0")].join("-");
  const dt=new Date(date+"T12:00:00Z");
  if(!Number.isFinite(dt.getTime())||dt.toISOString().slice(0,10)!==date)return true;
  dates.add(date);
 }
 return dates.size>1;
}
// Only known public platform hosts; malformed or malicious account links are ignored.
export function platformAccount(raw,platform){
 if(/(?:^|\/)(?:\.|%2e){1,2}(?=\/|$)/i.test(String(raw||"")))return "";
 let url;
 try{url=new URL(String(raw||""))}catch{return ""}
 if(url.protocol!=="https:"||url.username||url.password||url.port)return "";
 if(platform==="youtube"){
  if(!["youtube.com","www.youtube.com"].includes(url.hostname.toLowerCase()))return "";
  const parts=url.pathname.split("/").filter(Boolean);
  if(parts.length!==1||!/^@[A-Za-z0-9._-]{3,80}$/.test(parts[0]))return "";
  return parts[0];
 }
 if(platform==="twitch"){
  if(!["twitch.tv","www.twitch.tv"].includes(url.hostname.toLowerCase()))return "";
  const parts=url.pathname.split("/").filter(Boolean);
  if(parts.length!==1||!/^[a-zA-Z0-9_]{3,25}$/.test(parts[0]))return "";
  return parts[0].toLowerCase();
 }
 return "";
}
export function localDay(timestamp){
 const dt=new Date(timestamp);
 if(!Number.isFinite(dt.getTime()))return "";
 return new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Berlin",year:"numeric",month:"2-digit",day:"2-digit"}).format(dt);
}
export function nearbyDate(timestamp,eventDay,status){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(eventDay||"")))return false;
 const videoDay=localDay(timestamp);
 if(!videoDay)return false;
 const delta=Math.round((Date.parse(videoDay+"T12:00:00Z")-Date.parse(eventDay+"T12:00:00Z"))/86400000);
 // Livestream takes place on event day; recordings may be published the day after.
 return status==="recording"?delta>=-1&&delta<=2:delta===0;
}
// Shared city names must be explicitly disambiguated in an archive title.
// A generic "Frankfurt" recording can otherwise falsely attach to Frankfurt (Oder) or Main.
export function unambiguousCity(title,city){
 const c=normalize(city),v=normalize(title);
 if(c==="frankfurt am main")return /\bfrankfurt (?:am )?main\b/.test(v);
 if(c==="frankfurt oder")return /\bfrankfurt (?:an der )?oder\b/.test(v);
 return true;
}
export function matchEvents(video,events){
 if(!video||!video.title||!video.date||!["live","recording"].includes(video.status))return [];
 // Historical uploads and live broadcasts are proposals only; unknown platform status must never be paired.
 if(!/(?:^|\W)(?:demo|demonstration|kundgebung|protest|mahnwache|streik|aufzug|versammlung|kundgebungen|demos|gegendemo|gegendemos|montagsdemo|aufmarsch|naziaufmarsch)(?:\W|$)/i.test(video.title))return [];
 if(ambiguousOrInvalidTitleDates(video.title))return [];
 // If the platform supplies the actual broadcast start, do not override that evidence with a title date or later upload date.
 if(video.broadcast_started_at&&!localDay(video.broadcast_started_at))return [];
 const tokens=new Set(topics(video.title));
 const options=[];
 for(const event of events){
  if(!event?.id||!event?.title||!event?.city||!event?.date)continue;
  if(["cancelled","canceled","withdrawn","stopped","abgesagt","zurueckgezogen"].includes(normalize(event.status_code)))continue;
  if(!cityMatches(video.title,event.city))continue;
  if(!unambiguousCity(video.title,event.city))continue;
  // Explicit broadcast date in a recording title can identify the event even
  // when an edited excerpt was uploaded days later. Keep it a proposal only.
  const namedDay=explicitDateInTitle(video.title);
  if(namedDay&&namedDay!==event.date)continue;
  if(video.broadcast_started_at&&localDay(video.broadcast_started_at)!==event.date)continue;
  const posted=new Date(video.published_at||video.date);
  const eventDay=new Date(event.date+"T12:00:00Z");
  const retrospect=video.status==="recording"&&namedDay===event.date&&
    Number.isFinite(posted.getTime())&&posted>=new Date(eventDay.getTime()-86400000)&&
    posted<=new Date(eventDay.getTime()+31*86400000);
  if(!retrospect&&!nearbyDate(video.date,event.date,video.status))continue;
  const cityTerms=new Set(topics(event.city));
  const matching=topics(event.title).filter(t=>!cityTerms.has(t)&&tokens.has(t));
  // Short event titles ("Gegen AfD") can match only when the stream explicitly
  // names a distinctive location as a second independent piece of evidence.
  const place=topics(event.location||"").filter(t=>t.length>=6&&tokens.has(t)&&!topics(event.city).includes(t));
  const enough=matching.length>=2||(matching.length===1&&place.length>=1);
  if(!enough)continue;
  const evidence=[...matching,...place.filter(t=>!matching.includes(t))];
  options.push({event_id:event.id,city:event.city,date:event.date,matched_terms:evidence,
   confidence_terms:matching.length*2+place.length});
 }
 // Never show one stream under multiple ambiguously similar event titles.
 const max=Math.max(0,...options.map(x=>x.confidence_terms));
 const best=options.filter(x=>x.confidence_terms===max);
 if(best.length!==1)return [];
 return [{...best[0],matched_terms:best[0].matched_terms.slice(0,6)}];
}
