#!/usr/bin/env node
// Explicit Cloudflare data publication proof, separate from HTTP availability.
// On branches GitHub and Cloudflare will normally differ; never falsely claim
// the branch SHA is deployed. No full dataset or proprietary data is logged.
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
const url="https://demoradar.pages.dev/data/events.json";
const local=readFileSync("data/events.json");
const hash=v=>createHash("sha256").update(v).digest("hex");
const localHash=hash(local);
const localCount=JSON.parse(local.toString("utf8")).events.length;
let status="not_verified",remoteCount=null,remoteHash=null,error=null;
try{
 const response=await fetch(url,{headers:{"User-Agent":"DemoRadar-Publication-Proof/1.0","Cache-Control":"no-cache"},
  signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error("Cloudflare returned HTTP "+response.status);
 const remote=Buffer.from(await response.arrayBuffer());
 if(remote.length>8_000_000)throw Error("Unexpectedly large production dataset");
 const decoded=JSON.parse(remote.toString("utf8"));
 if(!Array.isArray(decoded.events))throw Error("Public dataset missing events array");
 remoteCount=decoded.events.length;
 remoteHash=hash(remote);
 // Byte differences from harmless whitespace are reported honestly:
 // this is a bytewise sha256, NOT a claim about the deployed code commit.
 status=remoteHash===localHash?"exact_dataset_match":"dataset_differs";
}catch(e){error=String(e.message||e)}
console.log(JSON.stringify({status,local_count:localCount,public_count:remoteCount,
 local_sha256:localHash,public_sha256:remoteHash,
 checked_code_sha:process.env.GITHUB_SHA||null,source_url:url,error,
 caveat:"Even an exact data-file match does not prove all Cloudflare assets use the same Git commit."},null,2));
if(status==="exact_dataset_match")console.log("PROVEN: public Cloudflare events.json matches checked-out GitHub events.json byte-for-byte");
else console.log("NOT PROVEN: the public deployed dataset is identical; deployment may lag or content may differ");
// Do not fail PR on expected deploy lag; leave precise auditable result in CI logs.
