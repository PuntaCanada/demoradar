// Fail-closed admission for new recurring official feeds.
// Existing Berlin/Dresden/Rostock are historical integrations; this check is NOT a claim
// that their historical ingestion has been legally cleared for unrestricted redistribution.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>JSON.parse(readFileSync(p,"utf8"));
export const historical=new Map([["berlin","Polizei Berlin"],["dresden","Stadt Dresden"],["rostock","Stadt Rostock"]]);
export function checkAdmissions(health,licences){
 const problems=[];
 const audits=new Map((licences.feeds||[]).map(x=>[x.source,x]));
 const identities=new Set();
 const mapped=new Set();
 if(new Set((licences.feeds||[]).map(x=>x.source)).size!==(licences.feeds||[]).length)problems.push("Duplicate source rights record");
 for(const x of health.feeds||[]){
  if(!x.source||!x.id){problems.push("Invalid feed identity");continue}
  if(identities.has(x.id)){problems.push("Duplicate feed identity: "+x.id);continue}
  identities.add(x.id);
  if(mapped.has(x.source)){problems.push("Multiple recurring feed IDs for the same source: "+x.source);continue}
  mapped.add(x.source);
  if(historical.get(x.id)===x.source){
   if(!audits.has(x.source))problems.push("Historical importer missing transparent licence audit: "+x.source);
   continue;
  }
  if(historical.has(x.id)&&historical.get(x.id)!==x.source)problems.push("Original feed ID changed owner: "+x.id);
  const a=audits.get(x.source);
  if(!a){problems.push("Missing verified audit for new recurring feed: "+x.source);continue}
  if(a.classification!=="open_verified"||a.reuse_confirmed!==true||a.new_automated_import_allowed!==true)problems.push("New recurring feed not licensed and approved: "+x.source);
  if(!a.format||!/^https:\/\//.test(a.source_url||"")||!/^https:\/\//.test(a.licence_url||""))problems.push("New recurring feed missing format or direct primary licence evidence: "+x.source);
  // An auditor's approval alone is not proof that a current, machine-readable
  // list of future assemblies exists. Require independent, dated verification.
  const v=a.verification;
  const isDate=d=>typeof d==="string"&&/^20\d{2}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d))&&new Date(d+"T12:00:00Z").toISOString().slice(0,10)===d;
  const allowedFormat=new Set(["json","csv","rss","api-json","api-csv","api-rss"]);
  if(!v||!allowedFormat.has(v.format)||!/^https:\/\//.test(v.endpoint_url||"")||
     v.reachable!==true||v.schema_valid!==true||v.has_future_event_dates!==true||
     !Array.isArray(v.event_fields)||!["title","date","location"].every(field=>v.event_fields.includes(field))||
     !isDate(v.checked_on)||!isDate(v.latest_future_event_date)||
     v.latest_future_event_date<v.checked_on||
     !isDate(a.reviewed_on)||!isDate(v.licence_checked_on)||
     v.licence_checked_on!==a.reviewed_on||
     v.checked_on<a.reviewed_on)
    problems.push("New recurring feed lacks dated, reachable, schema-valid future event and licence verification: "+x.source);

 }
 return problems;
}
const directRun=process.argv[1]&&import.meta.url===new URL("file://"+process.argv[1]).href;
if(directRun){
 const health=read("data/source-format-health.json"),audit=read("data/source-reuse-audit.json");
 assert.equal(health.version,1);assert.equal(audit.version,1);
 // The six-hour production job must call this gate before any official fetch.
 const workflow=readFileSync(".github/workflows/update-events.yml","utf8");
 // An unfamiliar one-line import step is not permitted to bypass the source registry.
 const approvedSteps=new Set([
  "update-events.mjs","update-rostock.py","update-cologne.py","update-nrw-police.py",
  "update-police-notices.py","update-leipzig-police.py","import-leipzig-archive.py",
  "update-frankfurt.py","update-dortmund-police.py","import-frankfurt-police-archive.py",
  "monitor-official-sources.py","update-dresden.py","update-dresden-jena.py",
  "dedupe-events.py","check-demos-api.py","probe-demos-events.py","update-demos.py",
  "source-format-health.mjs","audit-source-quality.mjs","source-health-alerts.mjs",
  "track-event-updates.py","update-news.py","build-language-pages.mjs"
 ]);
 const declared=[...workflow.matchAll(/^        run: (?:python3|node) scripts\/([a-zA-Z0-9_.-]+)\s*$/gm)].map(m=>m[1]);
 assert.ok(declared.includes("update-events.mjs")&&declared.includes("update-dresden.py"),"Known official import steps missing from approved scheduler");
 assert.deepEqual(declared.filter(name=>!approvedSteps.has(name)),[],"Unexpected import script: independently review rights, scope and parser before adding an updater");
 const gate=workflow.indexOf("node scripts/check-source-admission.mjs");
 const firstImport=workflow.indexOf("run: node scripts/update-events.mjs");
 assert.ok(gate>=0&&firstImport>gate,"Scheduled official imports must run admission checks first");
 const actual=checkAdmissions(health,audit);
 assert.deepEqual(actual,[],"Do not add new official recurring importers without source-specific open licence and admission review");
 const unlicensed=checkAdmissions({feeds:[...health.feeds,{id:"unreviewed",source:"Unlicensed City"}]},audit);
 assert.ok(unlicensed.length>0,"Unknown new feed must fail closed");
 const masquerade=checkAdmissions({feeds:[...health.feeds,{id:"berlin-new",source:"Polizei Berlin"}]},audit);
 assert.ok(masquerade.length>0,"An unapproved new feed cannot borrow an existing authority name");
 const idSwap=checkAdmissions({feeds:[{id:"berlin",source:"Unlicensed City"}]},audit);
 assert.ok(idSwap.length>0,"An existing feed ID must not be reassigned to a new source");
 const duplicated=checkAdmissions({feeds:[...health.feeds,health.feeds[0]]},audit);
 assert.ok(duplicated.length>0,"Duplicate IDs cannot hide a second feed");

 const approved={source:"Teststadt",classification:"open_verified",reuse_confirmed:true,new_automated_import_allowed:true,
  format:"JSON",source_url:"https://example.org/events.json",licence_url:"https://example.org/licence",
  reviewed_on:"2026-11-20",verification:{format:"json",endpoint_url:"https://example.org/events.json",
   reachable:true,schema_valid:true,has_future_event_dates:true,event_fields:["title","date","location"],
   checked_on:"2026-11-20",licence_checked_on:"2026-11-20",latest_future_event_date:"2026-12-01"}};
 const future={feeds:[{id:"teststadt",source:"Teststadt"}]};
 assert.deepEqual(checkAdmissions(future,{feeds:[approved]}),[],"Fully evidenced candidate should pass");
 for(const [field,value] of [["reachable",false],["schema_valid",false],["has_future_event_dates",false],
  ["format","html"],["latest_future_event_date","2026-11-01"],["checked_on","2026-13-01"],
  ["event_fields",["title","date"]]]){
  const broken={...approved,verification:{...approved.verification,[field]:value}};
  assert.ok(checkAdmissions(future,{feeds:[broken]}).length>0,"Unverified "+field+" must fail closed");
 }
 assert.ok(checkAdmissions(future,{feeds:[{...approved,licence_url:""}]}).length>0);
 assert.ok(checkAdmissions(future,{feeds:[{...approved,verification:{...approved.verification,licence_checked_on:"2026-11-19"}}]}).length>0);

 const mereReachability=checkAdmissions({feeds:[{id:"candidate",source:"Stadt Köln"}]},audit);
 assert.ok(mereReachability.length>0,"A live webpage or parser is not permission");
 console.log("Source admission: future recurring feeds require licence evidence and explicit approval; legacy feed scope unchanged");
}
