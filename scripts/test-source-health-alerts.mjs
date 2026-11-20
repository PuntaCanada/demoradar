import assert from "node:assert/strict";
import {alertsFromReport} from "./source-health-alerts.mjs";
const r=alertsFromReport({sources:[
 {city:"Frankfurt",source:"Amt",status:"unavailable",check_freshness:"unknown"},
 {city:"Leipzig",source:"Polizei",status:"verified_one_off",check_freshness:"outdated_check",last_checked:"2026-11-05"},
 {city:"Berlin",source:"Polizei",status:"observed_data",check_freshness:"recent"}
]});
assert.equal(r.checked_sources,3);
assert.deepEqual(r.alerts.map(x=>x.condition),["unavailable","outdated_check"]);
assert.equal(r.alerts[1].last_checked,"2026-11-05");
assert.ok(r.alerts.every(x=>x.note.includes("not evidence")));
assert.equal(alertsFromReport({sources:[]}).alerts.length,0);
assert.equal(alertsFromReport({}).alerts.length,0);
assert.equal(alertsFromReport({sources:[{city:"X",source:"Y",status:"no_matching_items"}]}).alerts.length,0);
const drift=alertsFromReport({sources:[]},{feeds:[
 {id:"berlin",city:"Berlin",source:"Polizei Berlin",issues:["format_change_suspected"],last_checked:"2026-11-19"},
 {id:"dresden",city:"Dresden",source:"Stadt Dresden",issues:["large_count_drop"],last_checked:"2026-11-19"},
 {id:"rostock",city:"Rostock",source:"Stadt Rostock",issues:["not_checked_today"]}
]});
assert.equal(drift.alerts.length,2);
assert.deepEqual(drift.alerts.map(x=>x.condition),["format_change_suspected","large_count_drop"]);
assert.equal(drift.alerts[0].last_checked,"2026-11-19");
assert.equal(drift.alerts.every(x=>/No assertion/.test(x.note)),true);
assert.equal(alertsFromReport({sources:[]},{feeds:[{id:"berlin",city:"Berlin",source:"Polizei Berlin",issues:[]}]}).alerts.length,0);
const monitors={sources:[
 {city:"Potsdam",state:"Brandenburg",url:"https://www.potsdam.de/",status:"unavailable",checked_on:"2026-11-20"},
 {city:"Kiel",state:"Schleswig-Holstein",url:"https://www.kiel.de/",status:"reachable_monitor_only_not_a_feed",checked_on:"2026-11-10"}
]};
const observed=alertsFromReport({sources:[]},{},monitors);
assert.equal(observed.checked_research_pages,2);
assert.deepEqual(observed.alerts.map(a=>a.condition),["monitor_unavailable","monitor_outdated"]);
assert.ok(observed.alerts.every(a=>a.source==="Research-only official page"&&a.note.includes("not an event feed")));
assert.ok(observed.alerts.every(a=>!Object.hasOwn(a,"events")));
const future=alertsFromReport({sources:[]},{},{sources:[{city:"X",state:"Bayern",url:"https://example.org",status:"reachable_monitor_only_not_a_feed",checked_on:"2099-01-01"}]});
assert.equal(future.alerts[0].condition,"monitor_outdated","Future checks cannot imply fresh source data");
const broken=alertsFromReport({sources:[]},{},{sources:[{city:"X",state:"Bayern",url:"https://example.org",status:"reachable_monitor_only_not_a_feed",checked_on:"2026-02-30"}]});
assert.equal(broken.alerts[0].condition,"monitor_outdated","Invalid dates cannot imply valid monitoring");
console.log("source health alerts: research-only source safeguards and 12 existing safety checks passed");
