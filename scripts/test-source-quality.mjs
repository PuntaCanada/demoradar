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
assert.equal(rows.length,8);
const row=name=>rows.find(s=>s.source===name);
assert.equal(row("Polizei Berlin").status,"observed_data");
assert.equal(row("Polizei Berlin").count,2);
assert.equal(row("Stadt Köln").status,"no_matching_items");
assert.equal(row("Stadt Köln").count,0);
assert.equal(row("Polizei Köln").status,"verified_one_off");
assert.equal(row("Polizeidirektion Leipzig").status,"verified_one_off");
assert.equal(row("Stadt Jena").status,"no_matching_items");
assert.equal(row("Stadt Frankfurt").status,"unavailable");
assert.ok(rows.every(s=>s.scope&&!/complete coverage/.test(s.scope)));
assert.equal(sourceHealth({...files,policeLeipzig:{status:"unavailable_no_import"}}).sources.find(s=>s.source==="Polizeidirektion Leipzig").status,"unavailable");
assert.equal(sourceHealth({...files,policeCologne:{sources:[]}}).sources.find(s=>s.source==="Polizei Köln").status,"unknown");
console.log("source-quality: 11 explicit data-integrity assertions passed");
