// Monitoring only. Never invent event records, page reachability, or cancellations.
import {readFileSync,writeFileSync} from "node:fs";
const read=p=>{try{return JSON.parse(readFileSync(p,"utf8"))}catch{return {}}};
export function alertsFromReport(report,formatHealth={}){
 const rows=Array.isArray(report?.sources)?report.sources:[];
 const alerts=rows.flatMap(s=>{
  if(!s||!s.city||!s.source)return [];
  const severity=s.status==="unavailable"?"unavailable":s.check_freshness==="outdated_check"?"outdated_check":null;
  return severity?[{city:s.city,source:s.source,condition:severity,last_checked:s.last_checked||null,
   note:"This is a monitoring warning, not evidence that demonstrations were cancelled or did not occur."}]:[];
 });
 const issues=(formatHealth?.feeds||[]).flatMap(feed=>{
  if(!feed?.id||!Array.isArray(feed.issues))return [];
  return feed.issues.filter(issue=>["format_change_suspected","large_count_drop","unexpected_empty","invalid_count"].includes(issue))
   .map(issue=>({city:feed.city,source:feed.source,condition:issue,last_checked:feed.last_checked||null,
    note:"Potential source format/data issue only. No assertion of cancellation, missing demonstrations or complete geographical coverage."}));
 });
 return {version:1,scope:"non-actionable warnings only; no events are generated or removed",
  checked_sources:rows.length,alerts:[...alerts,...issues]};
}
const next=alertsFromReport(read("data/source-quality.json"),read("data/source-format-health.json")),prev=read("data/source-health-alerts.json");
if(JSON.stringify(next)!==JSON.stringify(prev))writeFileSync("data/source-health-alerts.json",JSON.stringify(next,null,2)+"\n");
console.log("Source-monitor check:",next.checked_sources,"sources;",next.alerts.length,"availability/freshness warnings");
for(const a of next.alerts)console.log("::warning::"+a.city+" / "+a.source+": "+a.condition+" (not a protest cancellation)");
