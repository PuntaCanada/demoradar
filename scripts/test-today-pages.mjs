import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
const source=JSON.parse(read("data/events.json"));
const day=new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Berlin",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const sitemap=read("sitemap.xml");
const robots=read("robots.txt");
assert.ok(robots.includes("Sitemap: https://demoradar.pages.dev/sitemap.xml"));
for(const [route,file,lang,heading] of [
 ["/heute/","heute/index.html","de","Demonstrationen heute"],
 ["/en/today/","en/today/index.html","en","Demonstrations today"]
]){
 const page=read(file);
 assert.ok(page.startsWith("<!doctype html>")&&page.includes('<html lang="'+lang+'">'));
 assert.ok(page.includes('<link rel="canonical" href="https://demoradar.pages.dev'+route+'">'));
 assert.ok(page.includes("<h1>"+heading+"</h1>"));
 assert.ok(page.includes(day),"Date must come from Berlin calendar and match regeneration day");
 assert.ok(page.includes("https://demoradar.pages.dev")||page.includes("Quellenabdeckung"));
 assert.ok(page.includes("nicht")||page.includes("incomplete"),"Coverage limitations required");
 assert.ok(!page.includes('application/ld+json'),"Never claim Google Event rich result from incomplete sources");
 assert.ok(sitemap.includes("<loc>https://demoradar.pages.dev"+route+"</loc>"));
 assert.ok(page.includes('href="'+(lang==="en"?"/en/":"/")+'"'),"Link back to interactive calendar");
 assert.ok(page.includes((lang==="en"?"/en/sources/":"/sources/")),"Explain 16-state gaps");
 const ids=[...page.matchAll(/\?event=([^"#]+)#eventDetail/g)].map(m=>decodeURIComponent(m[1]));
 const events=source.events||[];
 for(const id of ids){
  const e=events.find(x=>x.id===id);
  assert.ok(e&&e.date===day&&e.country==="DE","Only today's actual recorded official-source events may be linked");
  assert.ok(!["cancelled","withdrawn","stopped"].includes(e.status_code));
 }
 assert.ok(ids.length<=60,"Mobile and crawler page bounded");
 assert.equal(new Set(ids).size,ids.length,"Do not duplicate event links");
}
const de=read("index.html"),en=read("en/index.html");
assert.ok(de.includes('href="/heute/"'),"German primary navigation links to today's static page");
assert.ok(en.includes('href="/en/today/"'),"English navigation has localized today link");
assert.ok(!en.includes("Alle heutigen Meldungen"),"German-only text cannot appear on English homepage");
console.log("Static today pages: source-backed, bilingual, canonical, mobile links, sitemap, no invented events");
