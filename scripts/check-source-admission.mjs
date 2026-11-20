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
 if(new Set((licences.feeds||[]).map(x=>x.source)).size!==(licences.feeds||[]).length)problems.push("Duplicate source rights record");
 for(const x of health.feeds||[]){
  if(!x.source||!x.id){problems.push("Invalid feed identity");continue}
  if(identities.has(x.id)){problems.push("Duplicate feed identity: "+x.id);continue}
  identities.add(x.id);
  if(historical.get(x.id)===x.source)continue;
  if(historical.has(x.id)&&historical.get(x.id)!==x.source)problems.push("Original feed ID changed owner: "+x.id);
  const a=audits.get(x.source);
  if(!a){problems.push("Missing verified audit for new recurring feed: "+x.source);continue}
  if(a.classification!=="open_verified"||a.reuse_confirmed!==true||a.new_automated_import_allowed!==true)problems.push("New recurring feed not licensed and approved: "+x.source);
  if(!a.format||!/^https:\/\//.test(a.source_url||"")||!/^https:\/\//.test(a.licence_url||""))problems.push("New recurring feed missing format or direct primary licence evidence: "+x.source);
 }
 return problems;
}
const directRun=process.argv[1]&&import.meta.url===new URL("file://"+process.argv[1]).href;
if(directRun){
 const health=read("data/source-format-health.json"),audit=read("data/source-reuse-audit.json");
 assert.equal(health.version,1);assert.equal(audit.version,1);
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

 const mereReachability=checkAdmissions({feeds:[{id:"candidate",source:"Stadt Köln"}]},audit);
 assert.ok(mereReachability.length>0,"A live webpage or parser is not permission");
 console.log("Source admission: future recurring feeds require licence evidence and explicit approval; legacy feed scope unchanged");
}
