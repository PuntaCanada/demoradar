// Offline integration test of the actual Berlin official JSON importer.
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {resolve,join} from "node:path";
import {spawnSync} from "node:child_process";
const program=resolve("scripts/update-events.mjs");
const bootstrap=`const scenario=process.env.TEST_SCENARIO;
globalThis.fetch=async()=>{
 if(scenario==="network")throw Error("offline test network failure");
 if(scenario==="http")return {ok:false,status:503};
 if(scenario==="invalid")return {ok:true,json:async()=>{throw Error("bad JSON")}};
 if(scenario==="empty")return {ok:true,json:async()=>({index:[]})};
 if(scenario==="schema")return {ok:true,json:async()=>({index:[{id:1,datum:"31.02.2026",thema:"Impossible date"},{id:2,datum:"21.11.2026",thema:"Valid event"}]})};
 if(scenario==="missingid")return {ok:true,json:async()=>({index:[{datum:"21.11.2026",thema:"No identity"},{id:2,datum:"21.11.2026",thema:"Valid event"}]})};
 return {ok:true,json:async()=>({index:[{id:"valid-1",datum:"20.11.2026",von:"10:00",bis:"12:00",thema:"Amtlich angezeigte Kundgebung",plz:"10115",strasse_nr:"Beispielplatz"}]})};
};
`;
for(const scenario of ["success","network","http","invalid","empty","schema","missingid"]){
 const folder=mkdtempSync(join(tmpdir(),"demoradar-berlin-"));
 try{
  mkdirSync(join(folder,"data"));
  const previous={events:[{id:"previous-verified",country:"DE",state:"Berlin",date:"2026-11-18",title:"Previously verified event"}]};
  writeFileSync(join(folder,"data/events.json"),JSON.stringify(previous));
  const bootstrapPath=join(folder,"bootstrap.mjs");
  writeFileSync(bootstrapPath,bootstrap);
  const result=spawnSync(process.execPath,["--import",bootstrapPath,program],{
   cwd:folder,env:{...process.env,TEST_SCENARIO:scenario},encoding:"utf8",timeout:10000
  });
  assert.equal(result.status,0,scenario+": "+result.stderr+" "+result.stdout);
  const file=JSON.parse(readFileSync(join(folder,"data/events.json"),"utf8"));
  const check=JSON.parse(readFileSync(join(folder,"data/berlin-source.json"),"utf8"));
  if(scenario==="success"){
   assert.equal(check.status,"ok");
   assert.equal(check.count,1);
   assert.ok(file.events.some(e=>e.id==="berlin-valid-1"));
  }else{
   assert.equal(check.status,"unavailable",scenario);
   assert.deepEqual(file,previous,scenario+": cached real events must not be overwritten");
  }
  assert.match(check.checked_on,/^\d{4}-\d{2}-\d{2}$/);
 }finally{rmSync(folder,{recursive:true,force:true})}
}
console.log("Berlin official feed: 7 real-importer offline scenarios passed");
