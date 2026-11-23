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

const futureFile="data/future-source-evidence.json";
const futureUrl="https://demoradar.pages.dev/"+futureFile;
let futureProof={source_url:futureUrl,status:"not_verified",local_sha256:null,public_sha256:null,
 checked_day:null,public_day:null,error:null};
try{
 const localFuture=readFileSync(futureFile);
 const localDecoded=JSON.parse(localFuture.toString("utf8"));
 if(localDecoded.version!==1||!Array.isArray(localDecoded.by_state)||localDecoded.by_state.length!==16)
  throw Error("Invalid local 16-state future provenance audit");
 futureProof.local_sha256=hash(localFuture);
 futureProof.checked_day=localDecoded.reviewed_on;
 const response=await fetch(futureUrl,{headers:{"User-Agent":"DemoRadar-Publication-Proof/1.0","Cache-Control":"no-cache"},
  signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error("Cloudflare returned HTTP "+response.status);
 const bytes=Buffer.from(await response.arrayBuffer());
 if(bytes.length>500_000)throw Error("Unexpected future report size");
 const published=JSON.parse(bytes.toString("utf8"));
 if(published.version!==1||!Array.isArray(published.by_state)||published.by_state.length!==16)
  throw Error("Public future provenance report missing 16-state evidence");
 futureProof.public_day=published.reviewed_on;
 futureProof.public_sha256=hash(bytes);
 futureProof.status=futureProof.public_sha256===futureProof.local_sha256?
  "exact_future_report_match":"future_report_differs";
}catch(err){futureProof.error=String(err.message||err)}
console.log("PUBLIC FUTURE PROVENANCE REPORT: "+JSON.stringify(futureProof));
if(futureProof.status==="exact_future_report_match")
 console.log("PROVEN: public Cloudflare future-source-evidence.json matches GitHub exact bytes");
else console.log("NOT PROVEN: public future provenance report may lag or differ; do not claim publication");


// Independent public JavaScript byte proof. This proves one deployed asset,
// not the Cloudflare deployment ID or the complete production release.
const liveJsUrl="https://demoradar.pages.dev/live.js";
const localLiveJs=readFileSync("live.js");
const liveJsProof={source_url:liveJsUrl,status:"not_verified",
 local_sha256:hash(localLiveJs),public_sha256:null,checked_code_sha:process.env.GITHUB_SHA||null,error:null,
 caveat:"An exact live.js byte match does not identify the full Cloudflare deployment."};
try{
 const response=await fetch(liveJsUrl,{headers:{"User-Agent":"DemoRadar-Publication-Proof/1.0","Cache-Control":"no-cache"},
  signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error("Cloudflare returned HTTP "+response.status);
 const bytes=Buffer.from(await response.arrayBuffer());
 if(bytes.length>2_000_000)throw Error("Unexpectedly large production live.js");
 liveJsProof.public_sha256=hash(bytes);
 liveJsProof.status=liveJsProof.public_sha256===liveJsProof.local_sha256?
  "exact_live_js_match":"live_js_differs";
}catch(err){liveJsProof.error=String(err.message||err)}
console.log("PUBLIC LIVE.JS BYTE PROOF: "+JSON.stringify(liveJsProof));
if(liveJsProof.status==="exact_live_js_match")
 console.log("PROVEN: public Cloudflare live.js matches checked-out GitHub live.js byte-for-byte");
else console.log("NOT PROVEN: public live.js matches this GitHub commit; deployment may lag or differ");
console.log("FULL CLOUDFLARE DEPLOYMENT ID: NOT VERIFIED (requires Cloudflare deployment metadata or authenticated API).");
