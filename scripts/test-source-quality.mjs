import assert from "node:assert/strict";
import {sourceHealth} from "./audit-source-quality.mjs";
const files={
 berlin:{events:[{state:"Berlin"},{state:"Berlin"},{state:"Sachsen"}]},
 dresden:{status:"ok",count:12},
 cologne:{status:"reachable_no_matching_detail_links",count:0},
 policeCologne:{sources:[{status:"verified_notice",count:2}]},
 policeLeipzig:{status:"verified_notice",count:2},
 sourceStatus:{sources:[{city:"Jena",status:"ok",imported:0}]},
 frankfurt:{status:"unavailable",count:0}
};
const rows=sourceHealth(files).sources;
assert.equal(rows.length,9);
const row=name=>rows.find(s=>s.source===name);
assert.equal(row("Polizei Berlin").status,"observed_data");
assert.equal(row("Polizei Berlin").count,2);
assert.equal(row("Stadt Köln").status,"no_matching_items");
assert.equal(row("Stadt Köln").count,0);
assert.equal(row("Polizei Köln").status,"verified_one_off");
assert.equal(row("Polizeidirektion Leipzig").status,"verified_one_off");
assert.equal(row("Polizeidirektion Leipzig (Archiv)").status,"unknown");
assert.equal(row("Stadt Jena").status,"no_matching_items");
assert.equal(row("Stadt Frankfurt").status,"unavailable");
assert.ok(rows.every(s=>s.scope&&!/complete coverage/.test(s.scope)));
assert.equal(sourceHealth({...files,policeLeipzig:{status:"unavailable_no_import"}}).sources.find(s=>s.source==="Polizeidirektion Leipzig").status,"unavailable");
assert.equal(sourceHealth({...files,policeCologne:{sources:[]}}).sources.find(s=>s.source==="Polizei Köln").status,"unknown");
const freshness=sourceHealth({...files,dresden:{status:"ok",count:12,source_date:"2026-11-16"},
 sourceStatus:{checked_at:"2026-11-19T10:00:00Z",sources:[{city:"Jena",status:"ok",imported:0}]},
 policeCologne:{checked_at:"2026-11-10T12:00:00Z",sources:[{status:"verified_notice",count:2}]}
},{today:"2026-11-19"}).sources;
const item=name=>freshness.find(s=>s.source===name);
assert.equal(item("Stadt Dresden").check_freshness,"outdated_check");
assert.equal(item("Stadt Jena").check_freshness,"recent");
assert.equal(item("Polizei Köln").check_freshness,"outdated_check");
assert.equal(item("Polizei Köln").status,"verified_one_off","old check does not cancel historical notice");
assert.equal(item("Polizei Berlin").check_freshness,"unknown","do not invent a check date from stale event records");
const archived=sourceHealth({...files,leipzigArchive:{status:"verified_historical_notice",count:1}},{today:"2026-11-19"}).sources;
assert.equal(archived.find(s=>s.source==="Polizeidirektion Leipzig (Archiv)").status,"verified_historical_one_off");
assert.equal(archived.find(s=>s.source==="Polizeidirektion Leipzig (Archiv)").count,1);
console.log("source-quality: 19 explicit data-integrity assertions passed");
