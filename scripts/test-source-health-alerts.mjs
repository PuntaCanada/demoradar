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
console.log("source health alerts: 12 safety checks passed");
