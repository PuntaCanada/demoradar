import assert from "node:assert/strict";
import {sourceHealth} from "./audit-source-quality.mjs";
const files={
 berlinStatus:{status:"ok",count:2,checked_on:"2026-11-19"},
 rostockStatus:{status:"ok",count:3,checked_on:"2026-11-19"},
 dresden:{status:"ok",count:12},
 cologne:{status:"reachable_no_matching_detail_links",count:0},
 policeCologne:{sources:[{status:"verified_notice",count:2}]},
 policeLeipzig:{status:"verified_notice",count:2},
 sourceStatus:{sources:[{city:"Jena",status:"ok",imported:0}]},
 frankfurt:{status:"unavailable",count:0}
};
const rows=sourceHealth(files).sources;
assert.equal(rows.length,17);
const row=name=>rows.find(s=>s.source===name);
assert.equal(row("Polizei Berlin").status,"observed_data");
assert.equal(row("Polizei Berlin").count,2);
assert.equal(row("Stadt Köln").status,"no_matching_items");
assert.equal(row("Stadt Köln").count,0);
assert.equal(row("Polizei Köln").status,"verified_one_off");
assert.equal(row("Polizeidirektion Leipzig").status,"verified_one_off");
assert.equal(row("Polizei Bonn").status,"unknown");
assert.equal(row("Polizei Münster").status,"unknown");
assert.equal(row("Polizei Dortmund").status,"unknown");
assert.equal(row("Polizeipräsidium Frankfurt (Archiv)").status,"unknown");
assert.equal(row("Polizeidirektion Leipzig (Archiv)").status,"unknown");
assert.equal(row("Stadt Jena").status,"no_matching_items");
assert.equal(row("Stadt Frankfurt").status,"unavailable");
assert.equal(row("Stadt Freiburg").status,"unknown");
assert.equal(row("Landeshauptstadt Stuttgart (Einzeltermin)").status,"unknown");
const stuttgart=sourceHealth({...files,stuttgart:{status:"verified_city_event_one_off",count:1,checked_on:"2026-11-20"}},{today:"2026-11-20"}).sources.find(s=>s.city==="Stuttgart");
assert.equal(stuttgart.status,"verified_one_off");
assert.equal(stuttgart.count,1);
const manuallyReviewed=sourceHealth({...files,stuttgart:{status:"verified_manual_one_off_time_not_machine_confirmed",count:1,checked_on:"2026-11-20"}},{today:"2026-11-20"}).sources.find(s=>s.city==="Stuttgart");
assert.equal(manuallyReviewed.status,"verified_one_off");
assert.equal(manuallyReviewed.count,1);

assert.equal(stuttgart.check_freshness,"recent");
assert.equal(sourceHealth({...files,stuttgart:{status:"original_unavailable_no_new_import",count:0}}).sources.find(s=>s.city==="Stuttgart").status,"unavailable");

assert.equal(row("Polizeidirektion Ratzeburg").status,"unknown");
const badOldesloe=sourceHealth({...files,badOldesloe:{status:"verified_one_off",count:1,checked_on:"2026-11-20"}},{today:"2026-11-20"}).sources.find(x=>x.source==="Polizeidirektion Ratzeburg");
assert.equal(badOldesloe.status,"verified_one_off");
assert.equal(badOldesloe.count,1);
assert.equal(badOldesloe.check_freshness,"recent");
assert.equal(sourceHealth({...files,badOldesloe:{status:"unverified_original_no_import",count:0}},{today:"2026-11-20"}).sources.find(x=>x.source==="Polizeidirektion Ratzeburg").status,"no_matching_items");

assert.equal(row("Stadt Weimar (vier Einzelanmeldungen)").status,"unknown");
const weimar=sourceHealth({...files,weimarOneoffs:{status:"verified_individual_oneoffs",count:4,checked_on:"2026-11-20"}},{today:"2026-11-20"}).sources.find(x=>x.source==="Stadt Weimar (vier Einzelanmeldungen)");
assert.equal(weimar.status,"verified_one_off");
assert.equal(weimar.count,4);
assert.equal(weimar.check_freshness,"recent");
assert.equal(sourceHealth({...files,weimarOneoffs:{status:"incomplete_original_no_new_import",count:3}},{today:"2026-11-20"}).sources.find(x=>x.source==="Stadt Weimar (vier Einzelanmeldungen)").status,"no_matching_items");

const freiburg=sourceHealth({...files,freiburg:{status:"verified_one_off",count:3,checked_on:"2026-11-20"}},{today:"2026-11-20"}).sources.find(x=>x.source==="Stadt Freiburg");
assert.equal(freiburg.status,"verified_one_off");
assert.equal(freiburg.count,3);
assert.equal(freiburg.check_freshness,"recent");
assert.ok(rows.every(s=>s.scope&&!/complete coverage/.test(s.scope)));
assert.equal(sourceHealth({...files,policeLeipzig:{status:"unavailable_no_import"}}).sources.find(s=>s.source==="Polizeidirektion Leipzig").status,"unavailable");
assert.equal(sourceHealth({...files,policeCologne:{sources:[]}}).sources.find(s=>s.source==="Polizei Köln").status,"unknown");
const freshness=sourceHealth({...files,dresden:{status:"ok",count:12,checked_on:"2026-11-16"},
 berlinStatus:{status:"ok",count:2},
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
const nrw=sourceHealth({...files,nrwPolice:{sources:[
 {city:"Bonn",status:"verified_one_off",count:1},
 {city:"Münster",status:"not_verified_no_import",count:0}
]}},{today:"2026-11-19"}).sources;
assert.equal(nrw.find(s=>s.source==="Polizei Bonn").status,"verified_one_off");
assert.equal(nrw.find(s=>s.source==="Polizei Münster").status,"no_matching_items");
const extra=sourceHealth({...files,policeDortmund:{status:"verified_one_off",count:1},
 policeFrankfurtArchive:{status:"verified_historical_notice",count:2}},{today:"2026-11-19"}).sources;
assert.equal(extra.find(s=>s.source==="Polizei Dortmund").status,"verified_one_off");
assert.equal(extra.find(s=>s.source==="Polizeipräsidium Frankfurt (Archiv)").status,"verified_historical_one_off");
assert.equal(extra.find(s=>s.source==="Polizeipräsidium Frankfurt (Archiv)").count,2);
const realCheck=sourceHealth({...files,nrwPolice:{sources:[
 {city:"Bonn",status:"verified_one_off",count:1,checked_on:"2026-11-19"},
 {city:"Münster",status:"verified_one_off",count:2,checked_on:"2026-11-13"}
]},policeDortmund:{status:"verified_one_off",count:1,checked_on:"2026-11-19"},
 policeFrankfurtArchive:{status:"verified_historical_notice",count:2,checked_on:"2026-11-18"}
},{today:"2026-11-19"}).sources;
const checked=source=>realCheck.find(s=>s.source===source);
assert.equal(checked("Polizei Bonn").check_freshness,"recent");
assert.equal(checked("Polizei Münster").check_freshness,"outdated_check");
assert.equal(checked("Polizei Dortmund").last_checked,"2026-11-19");
assert.equal(checked("Polizeipräsidium Frankfurt (Archiv)").check_freshness,"recent");
assert.equal(checked("Polizeipräsidium Frankfurt (Archiv)").status,"verified_historical_one_off");
const missing=sourceHealth({...files,berlinStatus:{status:"unavailable",count:null,checked_on:"2026-11-19"},
 rostockStatus:{status:"unavailable",count:0,checked_on:"2026-11-19"}},{today:"2026-11-19"}).sources;
assert.equal(missing.find(s=>s.source==="Polizei Berlin").status,"unavailable");
assert.equal(missing.find(s=>s.source==="Polizei Berlin").count,null);
assert.equal(missing.find(s=>s.source==="Stadt Rostock").status,"unavailable");
assert.equal(sourceHealth({berlin:{events:[{state:"Berlin"}]}}).sources.find(s=>s.source==="Polizei Berlin").status,"unknown","Old events without fetch evidence cannot prove a live source");
console.log("source-quality: 37 explicit data-integrity assertions passed");
