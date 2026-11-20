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
 const berlinFeed=files.berlinStatus||{};
 add("Berlin","Berlin","Polizei Berlin",
  berlinFeed.status==="ok"?"observed_data":berlinFeed.status==="unavailable"?"unavailable":"unknown",
  berlinFeed.count,"Official city-wide reporting feed; completeness not guaranteed",berlinFeed.checked_on);
 const d=files.dresden||{};
 add("Dresden","Sachsen","Stadt Dresden",d.status==="ok"?"observed_data":d.status==="unavailable"?"unavailable":"unknown",d.count,"Dresden city JSON, not all of Saxony",d.checked_on);
 const rostockFeed=files.rostockStatus||{};
 add("Rostock","Mecklenburg-Vorpommern","Stadt Rostock",
  rostockFeed.status==="ok"?"observed_data":rostockFeed.status==="unavailable"?"unavailable":"unknown",
  rostockFeed.count,"Rostock-only list, not Mecklenburg-Vorpommern coverage",rostockFeed.checked_on);
 const col=files.cologne||{};
 add("Köln","Nordrhein-Westfalen","Stadt Köln",col.status==="ok"?"observed_data":col.status==="reachable_no_matching_detail_links"?"no_matching_items":col.status==="unavailable"?"unavailable":"unknown",col.count,"Traffic calendar only; not the assembly register");
 const notice=files.policeCologne||{};
 add("Köln","Nordrhein-Westfalen","Polizei Köln",notice.sources?.[0]?.status==="verified_notice"?"verified_one_off":notice.sources?.[0]?.status==="unavailable_no_import"?"unavailable":"unknown",notice.sources?.[0]?.count,"One dated police notice, not rolling event coverage",notice.checked_at);
 const nrw=files.nrwPolice||{};
 for(const city of ["Bonn","Münster"]){
  const item=(nrw.sources||[]).find(s=>s.city===city)||{};
  add(city,"Nordrhein-Westfalen","Polizei "+city,
    item.status==="verified_one_off"?"verified_one_off":
    item.status==="unavailable_no_import"?"unavailable":
    item.status==="not_verified_no_import"?"no_matching_items":"unknown",
    item.count,"One specific police press announcement, not a regularly updated assembly feed",item.checked_on);
 }
 const dortmund=files.policeDortmund||{};
 add("Dortmund","Nordrhein-Westfalen","Polizei Dortmund",
  dortmund.status==="verified_one_off"?"verified_one_off":
  dortmund.status==="unavailable_no_import"?"unavailable":
  dortmund.status==="unverified_content_no_import"?"no_matching_items":"unknown",
  dortmund.count,"Single dated police assembly announcement, not a rolling register",dortmund.checked_on);
 const frankfurtArchive=files.policeFrankfurtArchive||{};
 add("Frankfurt am Main","Hessen","Polizeipräsidium Frankfurt (Archiv)",
  frankfurtArchive.status==="verified_historical_notice"?"verified_historical_one_off":
  frankfurtArchive.status==="unavailable_no_import"?"unavailable":
  frankfurtArchive.status==="unverified_no_import"?"no_matching_items":"unknown",
  frankfurtArchive.count,"Two individually evidenced historical assembly records, not an ongoing feed",frankfurtArchive.checked_on);
 const leipzig=files.policeLeipzig||{};
 add("Leipzig","Sachsen","Polizeidirektion Leipzig",leipzig.status==="verified_notice"?"verified_one_off":leipzig.status==="unavailable_no_import"?"unavailable":"unknown",leipzig.count,"One dated police notice, not a rolling feed");
 const archive=files.leipzigArchive||{};
 add("Leipzig","Sachsen","Polizeidirektion Leipzig (Archiv)",
  archive.status==="verified_historical_notice"?"verified_historical_one_off":
  archive.status==="unavailable_no_import"?"unavailable":"unknown",
  archive.count,"Archived notice for 31 Oct 2026 only; not an upcoming assembly feed");
 const jena=(files.sourceStatus?.sources||[]).find(x=>x.city==="Jena")||{};
 add("Jena","Thüringen","Stadt Jena",jena.status==="ok"?(jena.imported>0?"observed_data":"no_matching_items"):jena.status==="unavailable"?"unavailable":"unknown",jena.imported,"City source, only explicitly marked assemblies",files.sourceStatus?.checked_at);
 const freiburg=files.freiburg||{};
 add("Freiburg im Breisgau","Baden-Württemberg","Stadt Freiburg",
  freiburg.status==="verified_one_off"?"verified_one_off":
  freiburg.status==="source_unavailable_no_new_import"?"unavailable":
  freiburg.status==="incomplete_notice_no_new_import"?"no_matching_items":"unknown",
  freiburg.count,"Single city announcement about three dated assemblies on 20 Nov 2026; not a recurring feed",
  freiburg.checked_on);
 const weimar=files.weimarOneoffs||{};
 add("Weimar","Thüringen","Stadt Weimar (vier Einzelanmeldungen)",
  weimar.status==="verified_individual_oneoffs"?"verified_one_off":
  weimar.status==="source_unavailable_no_new_import"?"unavailable":
  weimar.status==="incomplete_original_no_new_import"?"no_matching_items":"unknown",
  weimar.count,"Four individually reviewed factual assembly notices on 22-25 Nov; no recurring import licence",weimar.checked_on);
 const oldesloe=files.badOldesloe||{};
 add("Bad Oldesloe","Schleswig-Holstein","Polizeidirektion Ratzeburg",
  oldesloe.status==="verified_one_off"?"verified_one_off":
  oldesloe.status==="source_unavailable_no_import"?"unavailable":
  oldesloe.status==="unverified_original_no_import"?"no_matching_items":"unknown",
  oldesloe.count,"Single police-announced assembly on 21 November 2026; time and exact venue unconfirmed; not a recurring source",
  oldesloe.checked_on);
 const stuttgart=files.stuttgart||{};
 add("Stuttgart","Baden-Württemberg","Landeshauptstadt Stuttgart (Einzeltermin)",
  ["verified_city_event_one_off","verified_manual_one_off_time_not_machine_confirmed"].includes(stuttgart.status)?"verified_one_off":
  stuttgart.status==="original_unavailable_no_new_import"?"unavailable":
  stuttgart.status==="original_content_unverified_no_new_import"?"no_matching_items":"unknown",
  stuttgart.count,"Specific city-calendar demonstration on 25 November; not a licensed assembly feed or official registration confirmation",stuttgart.checked_on);
 const organizerNotices=files.organizerNotices||{};
 for(const [city,state,publisher] of [
  ["Potsdam","Brandenburg","Netzwerk der brandenburgischen Frauenhäuser (Einzelankündigung)"],
  ["Lindenberg im Allgäu","Bayern","Grüne Landkreis Lindau (Einzelankündigung)"]]){
  const item=(organizerNotices.checks||[]).find(x=>x.city===city)||{};
  add(city,state,publisher,
   item.status==="verified_organizer_one_off"?"verified_one_off":
   item.status==="original_unreachable_no_import"?"unavailable":
   item.status==="original_content_unverified_no_import"?"no_matching_items":"unknown",
   item.count,"One non-government original event notice, no police registration confirmed and no licensed machine-readable feed",
   item.checked_on);
 }
 const regionalFuture=files.threeRegionalOneoffs||{};
 for(const [city,state,publisher] of [
  ["Hannover","Niedersachsen","Interventionistische Linke Hannover (Einzeltermin)"],
  ["Ludwigshafen","Rheinland-Pfalz","DGB Rheinland-Pfalz/Saarland (Ludwigshafen-Einzeltermin)"],
  ["Wiesbaden","Hessen","DGB/GEW – Wiesbaden-Einzeltermin"]]){
  const item=(regionalFuture.checks||[]).find(x=>x.city===city)||{};
  add(city,state,publisher,
   item.status==="verified_non_government_one_off"?"verified_one_off":
   item.status==="source_unavailable_no_import"?"unavailable":
   item.status==="original_content_not_verified_no_import"?"no_matching_items":"unknown",
   item.count,"One organizer/union original protest notice; no police registration or licensed official feed proven",item.checked_on);
 }
 const frankfurt=files.frankfurt||{};
 add("Frankfurt am Main","Hessen","Stadt Frankfurt",frankfurt.status==="ok"?"verified_one_off":frankfurt.status==="unavailable"?"unavailable":"unknown",frankfurt.count,"Single notice, not complete state or city coverage");
 return {version:1,method:"Observed importer outcomes only; neither state completeness nor actual number of protests can be inferred.",sources:out};
}
if(process.argv[1]&&import.meta.url===new URL("file://"+process.argv[1]).href){
 const next=sourceHealth({berlinStatus:read("data/berlin-source.json"),dresden:read("data/dresden-source.json"),
  rostockStatus:read("data/rostock-source.json"),cologne:read("data/cologne-source.json"),
  policeCologne:read("data/police-notices-source.json"),
  nrwPolice:read("data/nrw-police-source.json"),
  policeDortmund:read("data/dortmund-police-source.json"),
  policeFrankfurtArchive:read("data/frankfurt-police-archive-source.json"),
  policeLeipzig:read("data/leipzig-police-source.json"),
  leipzigArchive:read("data/leipzig-archive-source.json"),
  sourceStatus:read("data/source-status.json"),freiburg:read("data/freiburg-source.json"),stuttgart:read("data/stuttgart-demo-source.json"),organizerNotices:read("data/potsdam-lindenberg-source.json"),threeRegionalOneoffs:read("data/three-regional-oneoffs-source.json"),badOldesloe:read("data/bad-oldesloe-police-source.json"),weimarOneoffs:read("data/weimar-oneoffs-source.json"),frankfurt:read("data/frankfurt-source.json")});
 const prev=read("data/source-quality.json");
 if(JSON.stringify(next)===JSON.stringify(prev)){console.log("Source quality unchanged");process.exit(0)}
 writeFileSync("data/source-quality.json",JSON.stringify(next,null,2)+"\n");
 console.log("Source quality audit:",next.sources.map(s=>s.city+":"+s.status).join(", "));
}
