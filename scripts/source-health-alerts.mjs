// Monitoring only. Never invent event records, page reachability, or cancellations.
import {readFileSync,writeFileSync} from "node:fs";
const read=p=>{try{return JSON.parse(readFileSync(p,"utf8"))}catch{return {}}};
export function alertsFromReport(report,formatHealth={},monitorReport={},{today=new Date().toISOString().slice(0,10)}={}){
 const rows=Array.isArray(report?.sources)?report.sources:[];
 const alerts=rows.flatMap(s=>{
  if(!s||!s.city||!s.source)return [];
  // Data quality can say "unknown" while an automatic check actually has no
  // valid date. Do not silently treat undated imported/one-off observations as
  // fresh simply because the importer emitted an event.
  const requiresCheck=["observed_data","verified_one_off","no_matching_items"].includes(s.status);
  const stamp=typeof s.last_checked==="string"&&/^20\d{2}-\d{2}-\d{2}$/.test(s.last_checked)?s.last_checked:null;
  const date=stamp?new Date(stamp+"T12:00:00Z"):null;
  const valid=!!date&&Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===stamp;
  const age=valid?Math.round((Date.parse(today+"T12:00:00Z")-date.getTime())/86400000):null;
  const severity=s.status==="unavailable"?"unavailable":
   s.check_freshness==="outdated_check"||requiresCheck&&age!==null&&(age<0||age>2)?"outdated_check":
   requiresCheck&&age===null?"missing_check_date":null;
  return severity?[{city:s.city,state:s.state||null,source:s.source,condition:severity,last_checked:valid?stamp:null,
   note:"This is a monitoring warning, not evidence that demonstrations were cancelled or did not occur. A missing or stale audit date is not proof of no demonstrations."}]:[];
 });
 const issues=(formatHealth?.feeds||[]).flatMap(feed=>{
  if(!feed?.id||!Array.isArray(feed.issues))return [];
  return feed.issues.filter(issue=>["format_change_suspected","large_count_drop","unexpected_empty","invalid_count"].includes(issue))
   .map(issue=>({city:feed.city,source:feed.source,condition:issue,last_checked:feed.last_checked||null,
    note:"Potential source format/data issue only. No assertion of cancellation, missing demonstrations or complete geographical coverage."}));
 });
 if(!/^20\d{2}-\d{2}-\d{2}$/.test(today)||new Date(today+"T12:00:00Z").toISOString().slice(0,10)!==today)throw Error("Invalid audit day");
 const monitored=(Array.isArray(monitorReport?.sources)?monitorReport.sources:[]).flatMap(item=>{
  if(!item||!item.city||!item.state||!item.url)return [];
  const checked=typeof item.checked_on==="string"&&/^20\d{2}-\d{2}-\d{2}$/.test(item.checked_on)?item.checked_on:"";
  const date=checked?new Date(checked+"T12:00:00Z"):null;
  const valid=date&&Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===checked;
  const age=valid?Math.round((Date.parse(today+"T12:00:00Z")-date.getTime())/86400000):null;
  const condition=item.status==="unavailable"?"monitor_unavailable":
   age===null||age<0||age>2?"monitor_outdated":null;
  return condition?[{city:item.city,state:item.state,source:"Research-only official page",condition,last_checked:checked||null,
   url:item.url,note:"Read-only research source, not an event feed. Reachability or age never establishes whether a demonstration happens."}]:[];
 });
 return {version:1,scope:"non-actionable warnings only; no events are generated or removed",
  checked_sources:rows.length,checked_research_pages:Array.isArray(monitorReport?.sources)?monitorReport.sources.length:0,alerts:[...alerts,...issues,...monitored]};
}
const next=alertsFromReport(read("data/source-quality.json"),read("data/source-format-health.json"),read("data/expansion-sources.json")),prev=read("data/source-health-alerts.json");
if(JSON.stringify(next)!==JSON.stringify(prev))writeFileSync("data/source-health-alerts.json",JSON.stringify(next,null,2)+"\n");
console.log("Source-monitor check:",next.checked_sources,"sources;",next.alerts.length,"availability/freshness warnings");
for(const a of next.alerts)console.log("::warning::"+a.city+" / "+a.source+": "+a.condition+" (not a protest cancellation)");
