// Monitoring only. Never invent event records, page reachability, or cancellations.
import {readFileSync,writeFileSync} from "node:fs";
const read=p=>{try{return JSON.parse(readFileSync(p,"utf8"))}catch{return {}}};
export function alertsFromReport(report){
 const rows=Array.isArray(report?.sources)?report.sources:[];
 const alerts=rows.flatMap(s=>{
  if(!s||!s.city||!s.source)return [];
  const severity=s.status==="unavailable"?"unavailable":s.check_freshness==="outdated_check"?"outdated_check":null;
  return severity?[{city:s.city,source:s.source,condition:severity,last_checked:s.last_checked||null,
   note:"This is a monitoring warning, not evidence that demonstrations were cancelled or did not occur."}]:[];
 });
 return {version:1,scope:"non-actionable warnings only; no events are generated or removed",checked_sources:rows.length,alerts};
}
const next=alertsFromReport(read("data/source-quality.json")),prev=read("data/source-health-alerts.json");
if(JSON.stringify(next)!==JSON.stringify(prev))writeFileSync("data/source-health-alerts.json",JSON.stringify(next,null,2)+"\n");
console.log("Source-monitor check:",next.checked_sources,"sources;",next.alerts.length,"availability/freshness warnings");
for(const a of next.alerts)console.log("::warning::"+a.city+" / "+a.source+": "+a.condition+" (not a protest cancellation)");
