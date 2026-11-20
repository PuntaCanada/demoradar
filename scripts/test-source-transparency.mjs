import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
const coverage=JSON.parse(read("data/state-source-coverage.json"));
const quality=JSON.parse(read("data/source-quality.json"));
const format=JSON.parse(read("data/source-format-health.json"));
assert.equal(coverage.version,1);
assert.equal(coverage.states.length,16);
assert.equal(new Set(coverage.states.map(x=>x.state)).size,16);
assert.ok(quality.sources.every(x=>coverage.states.some(y=>y.state===x.state)));
const rolling=new Set(["Polizei Berlin","Stadt Dresden","Stadt Rostock"]);
assert.equal(format.feeds.length,3,"Changes to recurring feed inventory need explicit review");
assert.deepEqual(new Set(format.feeds.map(x=>x.source)),rolling);
const feedObservations=quality.sources.filter(x=>rolling.has(x.source));
assert.equal(feedObservations.length,3,"All three monitored authority feeds must remain visible, even during outages");
assert.ok(feedObservations.every(x=>["observed_data","unavailable","no_matching_items","unknown"].includes(x.status)),
 "A temporary missing feed is a source warning, never a fake successful import");
assert.ok(feedObservations.every(x=>x.status==="observed_data"||x.check_freshness!=="recent"||x.status==="unavailable"),
 "A failed importer must not be presented as successfully returned data");
assert.ok(quality.sources.filter(x=>x.status==="verified_one_off"||x.status==="verified_historical_one_off").every(x=>!rolling.has(x.source)));
const js=read("sources/source-status.js");
assert.ok(js.includes("daysSince(s.last_checked)")&&js.includes("freshnessDescription(s)"));
assert.ok(js.includes("quality.filter(isRolling).length"),"Metric must count feeds rather than observations");
assert.ok(js.includes("verified_historical_one_off")&&js.includes("no confirmed recurring event feed"));
const html=read("sources/index.html");
assert.ok(html.includes("id=\"stateGrid\"")&&html.includes("/sources/source-status.js"));
console.log("Source transparency: 16 states, 3 audited recurring feeds, status semantics and freshness checks OK");
