#!/usr/bin/env node
// Check the publication of the exact post-refresh checkout, without spawning workflows.
import {spawnSync} from "node:child_process";
import {setTimeout as sleep} from "node:timers/promises";
import {fileURLToPath} from "node:url";
export function classify(output){
 const event=output.match(/"status":\s*"(exact_dataset_match|dataset_differs|not_verified)"/)?.[1];
 const line=output.split("\n").find(x=>x.startsWith("PUBLIC FUTURE PROVENANCE REPORT: "));
 let future;
 try{future=JSON.parse(line?.slice("PUBLIC FUTURE PROVENANCE REPORT: ".length)||"null")?.status}catch{}
 if(!event||!["exact_future_report_match","future_report_differs","not_verified"].includes(future))
  return "unavailable";
 if(event==="exact_dataset_match"&&future==="exact_future_report_match")return "matched";
 if(event==="not_verified"||future==="not_verified")return "unavailable";
 return "mismatch";
}
export async function verify({run,wait,attempts=4}){
 let state="unavailable";
 for(let i=1;i<=attempts;i++){
  const result=await run();
  state=result.ok?classify(result.output):"unavailable";
  console.log("Production publication attempt "+i+"/"+attempts+": "+state);
  if(state==="matched")return state;
  if(i<attempts)await wait();
 }
 return state;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const state=await verify({
  run:()=>{const p=spawnSync(process.execPath,["scripts/check-cloudflare-dataset.mjs"],{encoding:"utf8",timeout:45000});
   if(p.error)console.warn("Publication probe error: "+p.error.message);
   return {ok:p.status===0,output:p.stdout||""};},
  wait:()=>sleep(15000)
 });
 if(state!=="matched")console.log("::warning::Cloudflare production "+state+
  "; this is not proof of publication or a full deployment SHA. Recheck after deployment.");
 else console.log("PROVEN: both public JSON files match the post-refresh checkout; full deployment SHA unverified.");
}
