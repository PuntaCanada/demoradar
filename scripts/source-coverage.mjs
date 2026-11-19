// Source coverage audit: observations only. Never invent or import demonstrations.
// All city counts derive exclusively from previously published event records.
import {readFileSync,writeFileSync} from "node:fs";
import {cityMatches,explicitDateInTitle,nearbyDate} from "./stream-matcher.mjs";
const read=(path)=>{try{return JSON.parse(readFileSync(path,"utf8"))}catch{return {}}};
export function analyzeCoverage(events, samples, sources, options={}){
 const now=options.now||new Date();
 const day=(d)=>d.toISOString().slice(0,10);
 const from=day(new Date(now.getTime()-30*86400000)),to=day(new Date(now.getTime()+7*86400000));
 const rows=events.filter(e=>e&&e.id&&e.title&&e.city&&/^\d{4}-\d{2}-\d{2}$/.test(e.date)&&e.date>=from&&e.date<=to);
 const unique=new Map(rows.map(e=>[String(e.id),e]));
 const actual=[...unique.values()];
 const byCity=new Map();
 for(const e of actual){
  const key=String(e.city).trim();
  if(!key)continue;
  const item=byCity.get(key)||{city:key,event_count:0,dates:new Set(),event_sources:new Set()};
  item.event_count++;
  item.dates.add(e.date);
  if(e.source)item.event_sources.add(String(e.source).slice(0,100));
  byCity.set(key,item);
 }
 // Only cities present in official source research are named explicitly below.
 const studied=[...new Set(["Köln","Hamburg","Düsseldorf","Bonn","Bielefeld","Stuttgart","Jena","Nürnberg","Frankfurt am Main","Halle (Saale)","Berlin","Leipzig","Braunschweig",
 ...sources.map(s=>s.city).filter(Boolean)])];
 const cities=studied.map(city=>{
  const matching=[...byCity.entries()].filter(([key])=>key.toLocaleLowerCase("de")===city.toLocaleLowerCase("de"));
  const eventsInCity=matching.reduce((sum,[,x])=>sum+x.event_count,0);
  const dates=[...new Set(matching.flatMap(([,x])=>[...x.dates]))].sort();
  const videos=samples.filter(v=>v&&v.title&&cityMatches(v.title,city));
  const matchedDate=videos.filter(v=>{
   const named=explicitDateInTitle(v.title);
   return dates.some(date=>(!named||named===date)&&(
    nearbyDate(v.date,date,v.status)||
    (v.status==="recording"&&named===date&&
     Date.parse(v.date)>=Date.parse(date+"T12:00:00Z")-86400000&&
     Date.parse(v.date)<=Date.parse(date+"T12:00:00Z")+31*86400000)
   ));
  }).length;
  const known=sources.filter(s=>s.city===city);
  return {city,event_count:eventsInCity,days_with_events:dates.length,
   observed_video_title_samples:videos.length,observed_city_and_date_samples:matchedDate,
   source_count:known.length,
   source_status:known.map(s=>({type:s.type||"unknown",status:s.status||"unknown",reuse_rights_verified:/\blicen[cs]e\b|CC[- ]BY|DL[- ]BY/i.test(s.data_rights||"")&&!/not|no |unverified|not confirmed/i.test(s.data_rights||"")}))};
 }).sort((a,b)=>b.observed_video_title_samples-a.observed_video_title_samples||a.event_count-b.event_count||a.city.localeCompare(b.city,"de"));
 return {version:1,method:"Read-only diagnostic; only imported, attributable event IDs are counted. Title samples are not evidence of official registration.",
  window:{from,to},event_records:actual.length,diagnostic_video_samples:samples.length,
  cities,missing_official_feed_warning:"City count 0 does not prove no demonstrations. No stream-derived events are imported."};
}
if(process.argv[1]&&import.meta.url===new URL("file://"+process.argv[1]).href){
 const e=[...(read("data/events.json").events||[]),...(read("data/demos-events.json").events||[])];
 const samples=read("data/stream-discoveries.json").diagnostic_sample||[];
 const official=read("data/expansion-sources.json").sources||[];
 const obj=analyzeCoverage(e,samples,official);
 const previous=read("data/source-coverage.json");
 if(JSON.stringify(previous)===JSON.stringify(obj)){console.log("Coverage unchanged",obj.event_records);process.exit(0)}
 writeFileSync("data/source-coverage.json",JSON.stringify(obj,null,2)+"\n");
 console.log("Coverage audited",obj.event_records,"events",obj.diagnostic_video_samples,"videos","zero-event cities:",obj.cities.filter(x=>x.event_count===0).map(x=>x.city).join(", "));
}
