import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(path,"utf8");
const data=JSON.parse(read("data/rejected-official-candidates.json"));
const coverage=JSON.parse(read("data/state-source-coverage.json"));
assert.equal(data.version,1);
assert.ok(data.candidates.length>=2);
for(const c of data.candidates){
 assert.ok(coverage.states.some(s=>s.state===c.state));
 assert.equal(c.recurring_demo_dates,false,"Excluded data never represents future assemblies");
 assert.ok(c.decision.startsWith("rejected_"));
 assert.ok(c.reason.length>60&&c.rights&&c.format&&c.title);
 assert.ok(/^https:\/\//.test(c.url),"Use a public primary-source record");
}
assert.ok(data.candidates.some(c=>c.title==="Eventlotse Daten Hamburg"&&/Veranstaltungs|event-space/.test(c.format)));
const sources=read("sources/source-status.js"),heatmap=read("heatmap.js");
assert.ok(sources.includes('load("/data/rejected-official-candidates.json")'));
assert.ok(sources.includes('rejectedCandidates.filter('));
assert.ok(sources.includes("do not provide evidenced protest dates"));
assert.ok(heatmap.includes('fetch("/data/rejected-official-candidates.json"'));
assert.ok(heatmap.includes("excludedInfo(state)"));
console.log("Research: official but unrelated licensed data expressly excluded from assembly imports and mapped");
