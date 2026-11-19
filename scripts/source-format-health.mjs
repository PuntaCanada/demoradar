// Conservative structural-drift monitoring for three verified, recurring official feeds.
// A warning is NOT a protest cancellation and never produces or removes an event.
import {readFileSync,writeFileSync} from "node:fs";
const read=p=>{try{return JSON.parse(readFileSync(p,"utf8"))}catch{return {}}};
const FEEDS=[
 {id:"berlin",city:"Berlin",name:"Polizei Berlin",path:"data/berlin-source.json"},
 {id:"dresden",city:"Dresden",name:"Stadt Dresden",path:"data/dresden-source.json"},
 {id:"rostock",city:"Rostock",name:"Stadt Rostock",path:"data/rostock-source.json"}
];
const DRIFT=/schema|format|parse|struktur|structure|unexpected|ungültig|invalid|json|empty|leer|start dates|titles/i;
const validDay=value=>typeof value==="string"&&/^20\d\d-\d\d-\d\d$/.test(value)&&Number.isFinite(Date.parse(value+"T12:00:00Z"))&&new Date(value+"T12:00:00Z").toISOString().slice(0,10)===value;
export function inspectFeedHealth(previous,feedStatuses,{today=new Date().toISOString().slice(0,10)}={}){
 if(!validDay(today))throw Error("Invalid inspection day");
 const existing=Object.fromEntries((previous?.feeds||[]).filter(f=>f&&FEEDS.some(x=>x.id===f.id)).map(f=>[f.id,f]));
 const feeds=FEEDS.map(feed=>{
  const item=feedStatuses[feed.id]||{},prior=existing[feed.id]||{};
  const count=Number.isInteger(item.count)&&item.count>=0?item.count:null;
  const currentDay=validDay(item.checked_on)?item.checked_on:null;
  const validCheck=currentDay===today;
  const imported=validCheck&&item.status==="ok"&&count!==null&&count>0;
  const lastGood=imported?{count,checked_on:today}:prior.last_success&&validDay(prior.last_success.checked_on)?prior.last_success:null;
  // Keep the reference count until the drop recovers or is explicitly investigated.
  // A single anomalous successful response must not silence its own warning on the next run.
  const priorReference=Number.isInteger(prior.baseline_count)&&prior.baseline_count>0?prior.baseline_count:
   Number.isInteger(prior.last_success?.count)&&prior.last_success.count>0?prior.last_success.count:null;
  const dropped=imported&&priorReference>=20&&count<Math.max(3,Math.floor(priorReference*.2));
  const baselineCount=dropped?priorReference:imported?count:priorReference;
  const issues=[];
  if(!validCheck)issues.push("not_checked_today");
  else if(item.status!=="ok"){
   const failure=String(item.error||"");
   issues.push(DRIFT.test(failure)?"format_change_suspected":"unavailable");
  }else if(count===null)issues.push("invalid_count");
  else if(count===0)issues.push("unexpected_empty");
  if(dropped)issues.push("large_count_drop");
  return {id:feed.id,city:feed.city,source:feed.name,status:imported?"ok":"unverified",
   last_checked:currentDay,last_success:lastGood,baseline_count:baselineCount,observed_count:count,issues,
   note:"Observation only. No conclusion about actual protests, cancellations or state-wide completeness."};
 });
 return {version:1,method:"Stable official feed status and structure-drift diagnostics only; not a calendar or licence for data reuse.",feeds,
  warning_count:feeds.filter(x=>x.issues.length).length};
}
if(process.argv[1]&&import.meta.url===new URL("file://"+process.argv[1]).href){
 const path="data/source-format-health.json";
 const prev=read(path);
 const inputs=Object.fromEntries(FEEDS.map(s=>[s.id,read(s.path)]));
 const next=inspectFeedHealth(prev,inputs);
 if(JSON.stringify(prev)!==JSON.stringify(next))writeFileSync(path,JSON.stringify(next,null,2)+"\n");
 for(const item of next.feeds)for(const issue of item.issues){
  console.log("::warning::"+item.source+" - "+issue+"; retaining verified data and checking original source.");
 }
 console.log("Official format monitoring:",next.feeds.length,"feeds;",next.warning_count,"feeds with warning");
}
