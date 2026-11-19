import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const home=readFileSync("index.html","utf8");
const eng=readFileSync("en/community/index.html","utf8");
const de=readFileSync("community/index.html","utf8");
const js=readFileSync("live.js","utf8");
const streams=JSON.parse(readFileSync("data/live-streams.json","utf8"));
const contacts=JSON.parse(readFileSync("data/organizer-contacts.json","utf8"));
const sitemap=readFileSync("sitemap.xml","utf8");
assert.ok(home.includes('href="/community/"'),"Homepage should link to forum");
assert.ok(de.includes('<html lang="de">')&&eng.includes('<html lang="en">'),"Forum bilingual");
for(const route of ["/community/","/en/community/"])assert.ok(sitemap.includes("https://demoradar.pages.dev"+route),"Community in sitemap: "+route);
for(const page of [de,eng]){
 for(const template of ["livestream.yml","organizer.yml"])assert.ok(page.includes("template="+template),"Community submission form reachable: "+template);
 assert.ok(page.includes("https://demoradar.forumieren.de/"),"Forumieren forum linked");
}
assert.ok(Array.isArray(streams.streams)&&Array.isArray(contacts.contacts),"Reviewed-only lists exist");
assert.ok(js.includes("trustedStreamUrl")&&js.includes("reviewedLinks"),"Strict public stream link filter");
assert.ok(js.includes("item.reviewed===true")&&js.includes("valid_until"),"Manual stream validation and expiry");
assert.ok(js.includes("item.event_id===event.id"),"Links must be event matched");
assert.ok(js.includes("communityExtra(event)"),"Event details include public contact and stream slots");
for(const template of ["community-topic","livestream","organizer"]){
 const y=readFileSync(".github/ISSUE_TEMPLATE/"+template+".yml","utf8");
 assert.ok(y.includes("body:"),"Template must have form");
 assert.ok(y.includes("required: true"),"Template requires supporting info");
}
console.log("Bilingual community pages, forum, event links, approved public stream/contact policy: OK");
