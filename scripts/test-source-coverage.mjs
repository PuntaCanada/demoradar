import assert from "node:assert/strict";
import {analyzeCoverage} from "./source-coverage.mjs";
const now=new Date("2026-11-19T16:00:00Z");
const events=[
 {id:"official-1",title:"Klimastreik und Energiewende",city:"Berlin",date:"2026-11-19",source:"Amtlicher Kalender"},
 {id:"official-1",title:"Klimastreik und Energiewende",city:"Berlin",date:"2026-11-19",source:"duplicate"},
 {id:"community-1",title:"Gegendemo am Rathaus",city:"Köln",date:"2026-11-14",source:"Demos Berlin e.V."},
 {id:"bad-date",title:"X",city:"Leipzig",date:"tomorrow"},
 {id:"old",title:"Historisch",city:"Hamburg",date:"2020-01-01"}
];
const videos=[
 {title:"LIVE Demo Klimastreik Berlin 19.11.26",date:"2026-11-19T15:00:00Z",status:"live"},
 {title:"Naziaufmarsch Köln14.11.26",date:"2026-11-18T15:00:00Z",status:"recording"},
 {title:"Demo Leipzig 14.11.26",date:"2026-11-16T15:00:00Z",status:"recording"}
];
const sources=[{city:"Leipzig",type:"city_open_data_portal",status:"monitor_only",data_rights:"unverified"}];
const d=analyzeCoverage(events,videos,sources,{now});
assert.equal(d.event_records,2,"Deduplicate exact event IDs and reject invalid/old dates");
const berlin=d.cities.find(x=>x.city==="Berlin");
const cologne=d.cities.find(x=>x.city==="Köln");
const leipzig=d.cities.find(x=>x.city==="Leipzig");
assert.equal(berlin.event_count,1);
assert.equal(berlin.observed_city_and_date_samples,1);
assert.equal(cologne.event_count,1);
assert.equal(cologne.observed_city_and_date_samples,1);
assert.equal(leipzig.event_count,0);
assert.equal(leipzig.observed_video_title_samples,1);
assert.equal(leipzig.observed_city_and_date_samples,0);
assert.equal(leipzig.source_status[0].reuse_rights_verified,false);
assert.equal(d.cities.some(x=>"invented_events" in x),false);
const conflicting=analyzeCoverage(events,[
 {title:"LIVE Demo Klimastreik Berlin 19.11.26 und 20.11.26",date:"2026-11-19T15:00:00Z",status:"live"},
 {title:"LIVE Demo Klimastreik Berlin 31.02.2026",date:"2026-11-19T15:00:00Z",status:"live"},
 {title:"LIVE Demo Klimastreik Berlin 19.11.26",date:"2026-11-19T15:00:00Z",status:"live"}
],sources,{now});
assert.equal(conflicting.cities.find(x=>x.city==="Berlin").observed_city_and_date_samples,1,
 "Only a valid, unambiguous stream title should contribute to city-and-date diagnostics");
console.log("source-coverage: 11 integrity assertions passed");
