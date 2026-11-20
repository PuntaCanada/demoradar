import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
const live=read("live.js");
const updater=read("scripts/update-news.py");
const dict=read("i18n.js");
assert.ok(live.includes("const editorialHosts=new Set("),"Only audited news publisher hosts may be used");
assert.ok(live.includes("safeNewsUrl(n.url)"),"All displayed editorial URLs must be filtered");
assert.ok(live.includes("pressLinkNote(n)"),"Differentiates verified publisher URLs from inconclusive tool access");
assert.ok(live.includes('class="editorial-link"'),"Editorial links need distinct accessible styling");
assert.ok(updater.includes("EDITORIAL_MAX_AGE_DAYS=7"),"Editorial evidence requires bounded review freshness");
assert.ok(updater.includes("reviewed_on=reviewed_on"),"Never replace actual human review with current refresh date");
assert.ok(updater.includes("berlin_day()"),"Publication window should use Berlin local day");
assert.ok(read("index.html").includes("min-height:44px"),"Mobile report links must be touch friendly");

assert.ok(!updater.includes("urllib.request"),"No RSS feed syndication/downloads in news updater");
assert.ok(updater.includes('EDITORIAL=ROOT/"editorial-link-candidates.json"'));
assert.ok(updater.includes("len(matching)!=1"),"Only uniquely matched event gets a news context link");
for(const [file,language,canonical,headline] of [
 ["index.html","de","https://demoradar.pages.dev/","Demonstrationen heute und kommende Termine"],
 ["en/index.html","en","https://demoradar.pages.dev/en/","Demonstrations today and upcoming dates"]
]){
 const h=read(file);
 assert.ok(h.includes('<html lang="'+language+'">'));
 assert.ok(h.includes('data-i18n="hero.title">'+headline));
 for(const p of ["og:type","og:site_name","og:title","og:description","og:url"])
  assert.ok(h.includes('property="'+p+'"'),"Missing social sharing metadata "+file+" "+p);
 assert.ok(h.includes('property="og:url" content="'+canonical+'"'));
 assert.ok(h.includes('name="twitter:card" content="summary"'));
 assert.ok(h.includes('href="#todaySection"'),"Today shortcut must remain on homepage");
}
assert.ok(dict.includes('"hero.title":"Demonstrationen heute und kommende Termine"'));
assert.ok(dict.includes('"hero.title":"Demonstrations today and upcoming dates"'));
console.log("Editorial trust policy, conservative event link display, bilingual SEO sharing and today navigation OK");
