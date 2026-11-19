import assert from "node:assert/strict";
import {cityMatches,localDay,nearbyDate,matchEvents} from "./stream-matcher.mjs";
const date="2026-11-19",iso="2026-11-19T12:00:00Z";
const events=[
 {id:"berlin-climate",city:"Berlin",date,title:"Kundgebung Klimaschutz und Energiewende"},
 {id:"essen-climate",city:"Essen",date,title:"Kundgebung Klimaschutz und Energiewende"},
 {id:"berlin-other",city:"Berlin",date,title:"Mahnwache Demokratie und Menschenrechte"},
 {id:"later",city:"Berlin",date:"2026-11-23",title:"Kundgebung Klimaschutz und Energiewende"}
];
const find=(title,date=iso,status="live",list=events)=>matchEvents({title,date,status},list);
assert.equal(find("LIVE Demo Berlin Klimaschutz Energiewende").length,1);
assert.equal(find("LIVE Demo Berlin Klimaschutz Energiewende")[0].event_id,"berlin-climate");
assert.equal(find("Demo: Interessen Klimaschutz Energiewende").length,0,"Essen must not match as substring");
assert.equal(cityMatches("Demo Interessen Klimaschutz","Essen"),false);
assert.equal(find("LIVE Demo Berlin Klimaschutz").length,0,"one theme word is not enough");
assert.equal(find("Demo Berlin Energiewende Klimaschutz","2026-11-24T12:00:00Z").length,0,"wrong date");
assert.equal(find("Mein Gaming Stream Berlin Klimaschutz Energiewende").length,0,"demo context missing");
assert.equal(find("Demo Berlin Klimaschutz Energiewende",iso,"recording").length,1);
assert.equal(find("Demo Berlin Klimaschutz Energiewende","2026-11-21T10:00:00Z","recording").length,1);
assert.equal(find("Demo Berlin Klimaschutz Energiewende","2026-11-25T12:00:00Z","recording",[events[0]]).length,0);
assert.equal(find("Demo Berlin Klimaschutz Energiewende",iso,"live",[events[0],{...events[0],id:"clone"}]).length,0,"ambiguous matches must be withheld");
assert.equal(cityMatches("Demo Frankfurt Klimaschutz Energiewende","Frankfurt am Main"),true);
assert.equal(cityMatches("Demo Frankfurt Klimaschutz Energiewende","Frankfurt (Oder)"),true);
assert.equal(cityMatches("Demonstration Berliner Alexanderplatz","Berlin"),false);
assert.equal(localDay("invalid"),"");
assert.equal(nearbyDate("invalid",date,"live"),false);
assert.equal(nearbyDate("2026-11-19T23:30:00Z",date,"live"),false,"Berlin local date after midnight");
console.log("stream-matcher: 16 safety checks passed");
