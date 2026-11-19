// Evidence-only source health. Never equate a reachable website with a full state feed.
import {readFileSync,writeFileSync} from "node:fs";
const read=p=>{try{return JSON.parse(readFileSync(p,"utf8"))}catch{return {}}};
export function sourceHealth(files,{today=new Date().toISOString().slice(0,10)}={}){
 const out=[];
 const add=(city,state,source,status,count,scope,checkedAt=null)=>{
  const d=String(checkedAt||"").slice(0,10);
  const isValid=/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+"T12:00:00Z"));
  const delta=isValid?Math.round((Date.parse(today+"T12:00:00Z")-Date.parse(d+"T12:00:00Z"))/86400000):null;
  const freshness=delta===null||delta<0?"unknown":delta<=2?"recent":"outdated_check";
  out.push({city,state,source,status,count:Number.isFinite(count)&&count>=0?count:null,scope,
   last_checked:isValid?d:null,check_freshness:freshness});
 };
 const berlin=files.berlin||{};
 const berlinEvents=(berlin.events||[]).filter(e=>e.state==="Berlin");
 add("Berlin","Berlin","Polizei Berlin",berlinEvents.length?"observed_data":"unknown",berlinEvents.length,"Official city-wide reporting feed; completeness not guaranteed");
 const d=files.dresden||{};
 add("Dresden","Sachsen","Stadt Dresden",d.status==="ok"?"observed_data":d.status==="unavailable"?"unavailable":"unknown",d.count,"Dresden city JSON, not all of Saxony",d.source_date);
 const r=files.rostock||{};
 add("Rostock","Mecklenburg-Vorpommern","Stadt Rostock",(r.events||[]).some(e=>String(e.id).startsWith("rostock-"))?"observed_data":"unknown",null,"Rostock-only list");
 const col=files.cologne||{};
 add("Köln","Nordrhein-Westfalen","Stadt Köln",col.status==="ok"?"observed_data":col.status==="reachable_no_matching_detail_links"?"no_matching_items":col.status==="unavailable"?"unavailable":"unknown",col.count,"Traffic calendar only; not the assembly register");
 const notice=files.policeCologne||{};
 add("Köln","Nordrhein-Westfalen","Polizei Köln",notice.sources?.[0]?.status==="verified_notice"?"verified_one_off":notice.sources?.[0]?.status==="unavailable_no_import"?"unavailable":"unknown",notice.sources?.[0]?.count,"One dated police notice, not rolling event coverage",notice.checked_at);
 const leipzig=files.policeLeipzig||{};
 add("Leipzig","Sachsen","Polizeidirektion Leipzig",leipzig.status==="verified_notice"?"verified_one_off":leipzig.status==="unavailable_no_import"?"unavailable":"unknown",leipzig.count,"One dated police notice, not a rolling feed");
 const archive=files.leipzigArchive||{};
 add("Leipzig","Sachsen","Polizeidirektion Leipzig (Archiv)",
  archive.status==="verified_historical_notice"?"verified_historical_one_off":
  archive.status==="unavailable_no_import"?"unavailable":"unknown",
  archive.count,"Archived notice for 31 Oct 2026 only; not an upcoming assembly feed");
 const jena=(files.sourceStatus?.sources||[]).find(x=>x.city==="Jena")||{};
 add("Jena","Thüringen","Stadt Jena",jena.status==="ok"?(jena.imported>0?"observed_data":"no_matching_items"):jena.status==="unavailable"?"unavailable":"unknown",jena.imported,"City source, only explicitly marked assemblies",files.sourceStatus?.checked_at);
 const frankfurt=files.frankfurt||{};
 add("Frankfurt am Main","Hessen","Stadt Frankfurt",frankfurt.status==="ok"?"verified_one_off":frankfurt.status==="unavailable"?"unavailable":"unknown",frankfurt.count,"Single notice, not complete state or city coverage");
 return {version:1,method:"Observed importer outcomes only; neither state completeness nor actual number of protests can be inferred.",sources:out};
}
if(process.argv[1]&&import.meta.url===new URL("file://"+process.argv[1]).href){
 const next=sourceHealth({berlin:read("data/events.json"),dresden:read("data/dresden-source.json"),
  rostock:read("data/events.json"),cologne:read("data/cologne-source.json"),
  policeCologne:read("data/police-notices-source.json"),
  policeLeipzig:read("data/leipzig-police-source.json"),
  leipzigArchive:read("data/leipzig-archive-source.json"),
  sourceStatus:read("data/source-status.json"),frankfurt:read("data/frankfurt-source.json")});
 const prev=read("data/source-quality.json");
 if(JSON.stringify(next)===JSON.stringify(prev)){console.log("Source quality unchanged");process.exit(0)}
 writeFileSync("data/source-quality.json",JSON.stringify(next,null,2)+"\n");
 console.log("Source quality audit:",next.sources.map(s=>s.city+":"+s.status).join(", "));
}
