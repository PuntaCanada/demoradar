import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import publicSourceUrl from "../public-source.js";

const berlin="https://www.berlin.de/polizei/service/versammlungsbehoerde/versammlungen-aufzuege/";
const dresden="https://www.dresden.de/de/rathaus/dienstleistungen/versammlungsuebersicht.php";
assert.equal(publicSourceUrl(berlin+"index.php/index/all.json?q=history"),berlin);
assert.equal(publicSourceUrl("https://www.dresden.de/data_ext/versammlungsuebersicht/Versammlungen.json"),dresden);
assert.equal(publicSourceUrl("https://api.demonstrations.org/v1/event/123"),"https://demonstrations.org/en/data");

for(const url of [
 "https://www.presseportal.de/blaulicht/pm/4970/6390267",
 "https://stadt.weimar.de/de/versammlungen/event/109819/frieden-schaffen-ohne-waffen-24-11-2026.html",
 "https://www.berlin.de/polizei/polizeimeldungen/2026/index.php?notice=1#meldung",
 "https://rathaus.rostock.de/de/versammlungen/343356?r=artikellink",
 berlin,
 dresden
])assert.equal(publicSourceUrl(url),url);

for(const url of [
 undefined,"","//www.berlin.de/","/relative","http://example.org/","javascript:alert(1)",
 "data:text/html,unsafe","https://user:pass@www.berlin.de/","https://example.org:8080/",
 "https://www.berlin.de.evil.example"+new URL(berlin).pathname+"index.php/index/all.json?q=",
 "https://example.org/events%2Ejson","https://api.example.org/event/42","https://api.demonstrations.org/v1/internal"
])assert.equal(publicSourceUrl(url),"",String(url));

for(const dataset of ["events","demos-events"]){
 const {events}=JSON.parse(readFileSync("data/"+dataset+".json","utf8"));
 for(const {id,source_url} of events)assert.ok(publicSourceUrl(source_url),id+" has no public source link");
}
console.log("Public event sources: known feeds, individual notices and unsafe URLs verified");
