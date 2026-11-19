// Conservative, deterministic candidate matching. Never grants human-reviewed status.
const STOP=new Set("gegen fuer fur mit ohne die der das den dem eine einer einem aus von und zur zum pro demonstration kundgebung demo veranstaltung live livestream stream protest demonstrationen deutschland germany heute morgen bericht fuer gegen und bei für sowie oder zum fuer den deutschland aktion aktuelle aktuell demos proteste aktionstag berichterstattung".split(" "));
export function normalize(value){
 return String(value||"").toLocaleLowerCase("de").normalize("NFKD")
  .replace(/[\u0300-\u036f]/g,"").replace(/ß/g,"ss").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
}
export function words(text){return normalize(text).split(" ").filter(Boolean)}
const MEANINGFUL_SHORT=new Set(["afd","cdu","csu","bsw","spd","fdp","nato","nsu","g20","g7"]);
export function topics(text){return [...new Set(words(text).filter(w=>(w.length>=4||MEANINGFUL_SHORT.has(w))&&!STOP.has(w)))]}
export function cityMatches(title,city){
 const titleWords=words(title),parts=words(city);
 if(!parts.length)return false;
 // Require contiguous word boundaries, never substring "Essen" inside "Interessen".
 const contains=needle=>titleWords.some((_,i)=>needle.every((word,j)=>titleWords[i+j]===word));
 if(contains(parts))return true;
 // Administrative city suffix: Frankfurt am Main -> Frankfurt; Halle (Saale) -> Halle.
 // Single prefix still requires at least one additional topic match below.
 return parts.length>=2&&contains([parts[0]])&&parts[0].length>=6;
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
export function matchEvents(video,events){
 if(!video||!video.title||!video.date||!video.status)return [];
 if(!/(?:^|\W)(?:demo|demonstration|kundgebung|protest|mahnwache|streik|aufzug|versammlung|kundgebungen|demos)(?:\W|$)/i.test(video.title))return [];
 const tokens=new Set(topics(video.title));
 const options=[];
 for(const event of events){
  if(!event?.id||!event?.title||!event?.city||!event?.date)continue;
  if(!cityMatches(video.title,event.city)||!nearbyDate(video.date,event.date,video.status))continue;
  const matching=topics(event.title).filter(t=>tokens.has(t));
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
