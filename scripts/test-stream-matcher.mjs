import assert from "node:assert/strict";
import {cityMatches,localDay,nearbyDate,matchEvents,explicitDateInTitle,normalize,ambiguousOrInvalidTitleDates,platformAccount,candidateStillMatches} from "./stream-matcher.mjs";
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
const saved={event_id:"berlin-climate",title:"Demo Berlin Klimaschutz Energiewende",date:iso,status:"recording"};
assert.equal(candidateStillMatches(saved,[events[0]]),true,"Unchanged verified event preserves review-only proposal");
assert.equal(candidateStillMatches(saved,[{...events[0],status_code:"cancelled"}]),false,"Withdrawn event invalidates a cached proposal");
assert.equal(candidateStillMatches(saved,[{...events[0],title:"Kundgebung für öffentliche Bibliotheken"}]),false,"Event title changes cannot preserve obsolete matches");
assert.equal(candidateStillMatches({...saved,event_id:"missing"},[events[0]]),false,"Missing event invalidates cached suggestion");
assert.equal(candidateStillMatches(saved,[events[0],{...events[0],id:"clone"}]),false,"Ambiguous competing event prevents cached suggestion");

for(const code of ["cancelled","CANCELLED","canceled","withdrawn","stopped","abgesagt","zurückgezogen"])assert.equal(find("Demo Berlin Klimaschutz Energiewende",iso,"recording",[{...events[0],status_code:code}]).length,0,"Blocked archive match to "+code+" assembly");
assert.equal(find("Demo Berlin Klimaschutz Energiewende",iso,"premiere").length,0,"premiere status is not automatically an archive or live event");
assert.equal(find("Demo Berlin Klimaschutz Energiewende",iso,"unknown").length,0,"unknown platform status cannot match");
assert.equal(find("Demo Berlin Klimaschutz Energiewende","2026-11-21T10:00:00Z","recording").length,1);
assert.equal(find("Demo Berlin Klimaschutz Energiewende","2026-11-25T12:00:00Z","recording",[events[0]]).length,0);
assert.equal(find("Demo Berlin Klimaschutz Energiewende",iso,"live",[events[0],{...events[0],id:"clone"}]).length,0,"ambiguous matches must be withheld");
assert.equal(cityMatches("Demo Frankfurt Klimaschutz Energiewende","Frankfurt am Main"),true);
assert.equal(cityMatches("Demo Frankfurt Klimaschutz Energiewende","Frankfurt (Oder)"),true);
assert.equal(cityMatches("Demonstration Berliner Alexanderplatz","Berlin"),false);
assert.equal(localDay("invalid"),"");
assert.equal(nearbyDate("invalid",date,"live"),false);
assert.equal(nearbyDate("2026-11-19T23:30:00Z",date,"live"),false,"Berlin local date after midnight");
const brief=[{id:"short-afd",city:"Berlin",date,title:"Kundgebung gegen AfD",location:"Alexanderplatz"}];
assert.equal(find("Live Demo Berlin AfD Alexanderplatz",iso,"live",brief).length,1,"short topic plus exact named venue accepted");
assert.equal(find("Live Demo Berlin AfD",iso,"live",brief).length,0,"acronym plus city alone insufficient");
assert.equal(find("Live Demo Berlin AfD Rathaus",iso,"live",brief).length,0,"wrong venue rejected");
assert.equal(find("Live Demo Berlin AfD Alexanderplatz","2026-11-20T12:00:00Z","live",brief).length,0,"live date must match");
assert.equal(explicitDateInTitle("Demo am 19.11.2026"),date);
assert.equal(explicitDateInTitle("Demo 2026-11-19 Berlin"),date);
assert.equal(explicitDateInTitle("Demo am 31.02.2026"),"","invalid dates cannot be used");
assert.equal(find("Demo Berlin Klimaschutz Energiewende 18.11.2026",iso,"recording").length,0,"explicit wrong date invalidates an otherwise plausible archive");
assert.equal(find("Demo Berlin Klimaschutz Energiewende 19.11.2026",iso,"recording").length,1,"matching explicit date accepted");
assert.equal(cityMatches("Demo Frankfurt (Oder) Klimaschutz","Frankfurt am Main"),false);
assert.equal(cityMatches("Demo Frankfurt am Main Klimaschutz","Frankfurt (Oder)"),false);
const frankfurtMain=[{id:"ffm-demo",city:"Frankfurt am Main",date,title:"Demo Klimaschutz Energiewende"}];
const frankfurtOder=[{id:"ffo-demo",city:"Frankfurt (Oder)",date,title:"Demo Klimaschutz Energiewende"}];
assert.equal(find("Demo Frankfurt Klimaschutz Energiewende",iso,"recording",frankfurtMain).length,0,"generic Frankfurt must not imply Main");
assert.equal(find("Demo Frankfurt Klimaschutz Energiewende",iso,"recording",frankfurtOder).length,0,"generic Frankfurt must not imply Oder");
assert.equal(find("Demo Frankfurt am Main Klimaschutz Energiewende",iso,"recording",frankfurtMain).length,1,"explicit Main accepted as review candidate");
assert.equal(find("Demo Frankfurt Oder Klimaschutz Energiewende",iso,"recording",frankfurtOder).length,1,"explicit Oder accepted as review candidate");

assert.equal(explicitDateInTitle("Antifa Gegendemo Köln14.11.26"),"2026-11-14","day.month.year shorthand");
assert.equal(normalize("Köln14.11.26").includes("koln 14"),true,"city/date without whitespace");
const late=[{id:"demo-k",city:"Köln",date:"2026-11-14",title:"Antifa Naziaufmarsch Gegendemonstration",location:"Neumarkt"}];
const lateVideo={title:"Naziaufmarsch Antifa Gegendemo Köln14.11.26",status:"recording",date:"2026-11-19T10:00:00Z",published_at:"2026-11-19T10:00:00Z"};
assert.equal(matchEvents(lateVideo,late).length,1,"late excerpt matched using explicit event date and two topic words");
assert.equal(matchEvents({...lateVideo,broadcast_started_at:"2026-11-13T16:00:00Z"},late).length,0,"conflicting platform-confirmed broadcast date must block title-derived archive match");
assert.equal(matchEvents({...lateVideo,broadcast_started_at:"2026-11-14T16:00:00Z"},late).length,1,"matching platform start preserves review-only candidate");
assert.equal(matchEvents({...lateVideo,broadcast_started_at:"not-a-date"},late).length,0,"invalid broadcast metadata must not be silently discarded");

assert.equal(matchEvents({...lateVideo,title:"Naziaufmarsch Antifa Gegendemo Köln13.11.26"},late).length,0,"wrong explicit date rejected");
assert.equal(matchEvents({...lateVideo,published_at:"2027-01-19T10:00:00Z",date:"2027-01-19T10:00:00Z"},late).length,0,"late uploads beyond thirty days rejected");
assert.equal(matchEvents({...lateVideo,title:"Nur Antifa Gegendemo Köln14.11.26"},late).length,0,"generic demo term and city do not count twice");
assert.equal(ambiguousOrInvalidTitleDates("Demo Berlin 19.11.2026 und 20.11.2026"),true,"multi-day compilation not a unique match");
assert.equal(ambiguousOrInvalidTitleDates("Demo Berlin 31.02.2026"),true,"impossible explicit day");
assert.equal(ambiguousOrInvalidTitleDates("Demo Berlin 19.11.2026"),false);
assert.equal(find("Demo Berlin Klimaschutz Energiewende 31.02.2026",iso).length,0,"invalid title date must not fall through");
assert.equal(find("Demo Berlin Klimaschutz Energiewende 19.11.2026 und 20.11.2026",iso).length,0,"multiple dates must not imply one event");
assert.equal(platformAccount("https://www.youtube.com/@Eskalabe","youtube"),"@Eskalabe");
assert.equal(platformAccount("https://www.twitch.tv/Some_Channel","twitch"),"some_channel");
assert.equal(platformAccount("https://youtube.com.evil.example/@Eskalabe","youtube"),"");
assert.equal(platformAccount("http://www.youtube.com/@Eskalabe","youtube"),"");
assert.equal(platformAccount("https://www.youtube.com/@Eskalabe/extra","youtube"),"");
assert.equal(platformAccount("https://user:pass@www.youtube.com/@Eskalabe","youtube"),"");
assert.equal(platformAccount("not a URL","youtube"),"");
assert.equal(platformAccount("https://www.twitch.tv/../../../foo","twitch"),"");
assert.equal(platformAccount("https://www.youtube.com/@aa","youtube"),"");
console.log("stream-matcher: 47 safety checks passed");
