import assert from "node:assert/strict";
import {alertsFromReport} from "./source-health-alerts.mjs";
const r=alertsFromReport({sources:[
 {city:"Frankfurt",source:"Amt",status:"unavailable",check_freshness:"unknown"},
 {city:"Leipzig",source:"Polizei",status:"verified_one_off",check_freshness:"outdated_check",last_checked:"2026-11-05"},
 {city:"Berlin",state:"Berlin",source:"Polizei",status:"observed_data",last_checked:"2026-11-20",check_freshness:"recent"}
]},{},{},{today:"2026-11-20"});
assert.equal(r.checked_sources,3);
assert.deepEqual(r.alerts.map(x=>x.condition),["unavailable","outdated_check"]);
assert.equal(r.alerts[1].last_checked,"2026-11-05");
assert.ok(r.alerts.every(x=>x.note.includes("not evidence")));
assert.equal(alertsFromReport({sources:[]}).alerts.length,0);
assert.equal(alertsFromReport({}).alerts.length,0);
assert.equal(alertsFromReport({sources:[{city:"X",source:"Y",status:"no_matching_items",last_checked:"2026-11-20"}]},{},{},{today:"2026-11-20"}).alerts.length,0);
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
const observed=alertsFromReport({sources:[]},{},monitors,{today:"2026-11-20"});
assert.equal(observed.checked_research_pages,2);
assert.deepEqual(observed.alerts.map(a=>a.condition),["monitor_unavailable","monitor_outdated"]);
assert.ok(observed.alerts.every(a=>a.source==="Research-only official page"&&a.note.includes("not an event feed")));
assert.ok(observed.alerts.every(a=>!Object.hasOwn(a,"events")));
const future=alertsFromReport({sources:[]},{},{sources:[{city:"X",state:"Bayern",url:"https://example.org",status:"reachable_monitor_only_not_a_feed",checked_on:"2099-01-01"}]},{today:"2026-11-20"});
assert.equal(future.alerts[0].condition,"monitor_outdated","Future checks cannot imply fresh source data");
const broken=alertsFromReport({sources:[]},{},{sources:[{city:"X",state:"Bayern",url:"https://example.org",status:"reachable_monitor_only_not_a_feed",checked_on:"2026-02-30"}]},{today:"2026-11-20"});
assert.equal(broken.alerts[0].condition,"monitor_outdated","Invalid dates cannot imply valid monitoring");
const provenance=alertsFromReport({sources:[
 {city:"Köln",state:"Nordrhein-Westfalen",source:"Stadt Köln",status:"observed_data",last_checked:null,check_freshness:"unknown"},
 {city:"Leipzig",state:"Sachsen",source:"Polizei Leipzig",status:"verified_one_off",last_checked:"2026-11-01"},
 {city:"Dresden",state:"Sachsen",source:"Stadt Dresden",status:"observed_data",last_checked:"2026-11-20"},
 {city:"Frankfurt",state:"Hessen",source:"Stadt Frankfurt",status:"unavailable",last_checked:null},
 {city:"Archivstadt",state:"Hessen",source:"Historische Quelle",status:"verified_historical_one_off",last_checked:null},
 {city:"Zukunft",state:"Berlin",source:"Amt",status:"verified_one_off",last_checked:"2026-11-21"},
 {city:"Ungueltig",state:"Berlin",source:"Amt",status:"observed_data",last_checked:"2026-02-30"}
]},{},{},{today:"2026-11-20"});
assert.deepEqual(provenance.alerts.map(x=>x.condition),[
 "missing_check_date","outdated_check","unavailable","outdated_check","missing_check_date"]);
assert.ok(provenance.alerts.every(x=>x.state),"Every automatic alert should carry the matching state for accurate coverage");
assert.ok(provenance.alerts.every(x=>!Object.hasOwn(x,"events")),"Source warnings may never invent events");
assert.equal(provenance.alerts.filter(x=>x.city==="Archivstadt").length,0,"Archive is not an automatically fresh-updating source");
console.log("source health alerts: invalid/missing/future check dates, historical exclusions, state attribution and existing checks passed");
