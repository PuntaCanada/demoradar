// Read-only diagnostic: reasons why recent public broadcast titles are not event matches.
import {readFileSync} from "node:fs";
import {cityMatches,explicitDateInTitle,matchEvents,nearbyDate} from "./stream-matcher.mjs";
const read=p=>{try{return JSON.parse(readFileSync(p,"utf8"))}catch{return {}}};
const events=[...(read("data/events.json").events||[]),...(read("data/demos-events.json").events||[])];
const report=read("data/stream-discoveries.json");
const samples=report.diagnostic_sample||[];
const observed={samples:samples.length,event_count:events.length,city_matches:0,city_date_matches:0,auto_matched:0,
 no_city:0,wrong_date:0,insufficient_topic_or_ambiguous:0};
for(const sample of samples){
 const sameCity=events.filter(e=>e?.city&&cityMatches(sample.title,e.city));
 if(!sameCity.length){observed.no_city++;continue}
 observed.city_matches++;
 const named=explicitDateInTitle(sample.title);
 const dateMatches=sameCity.filter(e=>!named||named===e.date).filter(e=>{
  if(nearbyDate(sample.date,e.date,sample.status))return true;
  if(sample.status!=="recording"||!named||named!==e.date)return false;
  const delta=Date.parse(sample.date)-Date.parse(e.date+"T12:00:00Z");
  return Number.isFinite(delta)&&delta>=-86400000&&delta<=31*86400000;
 });
 if(!dateMatches.length){observed.wrong_date++;continue}
 observed.city_date_matches++;
 if(matchEvents(sample,events).length)observed.auto_matched++;
 else observed.insufficient_topic_or_ambiguous++;
}
console.log("Stream coverage diagnostic (real titles, no unverified public match):",JSON.stringify(observed));
