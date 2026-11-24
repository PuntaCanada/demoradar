import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
const origin="https://demoradar.pages.dev";
const routes=["/","/en/","/community/","/en/community/","/sources/","/en/sources/","/heute/","/en/today/"];
const groups=[["/","/en/"],["/community/","/en/community/"],["/sources/","/en/sources/"],["/heute/","/en/today/"]];
const sitemap=read("sitemap.xml");
const xmlUrls=[...sitemap.matchAll(/<url><loc>([^<]+)<\/loc>([\s\S]*?)<\/url>/g)];
assert.equal(xmlUrls.length,routes.length+1,"Sitemap should list eight multilingual routes and Berlin");
assert.deepEqual(new Set(xmlUrls.map(m=>m[1])),new Set([...routes.map(r=>origin+r),origin+"/berlin/"]));
assert.ok(sitemap.includes("<loc>"+origin+"/berlin/</loc>"));
for(const [de,en] of groups){
 for(const route of [de,en]){
  const record=xmlUrls.find(m=>m[1]===origin+route);
  assert.ok(record);
  const alternates=[...record[2].matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)];
  assert.equal(alternates.length,3,"Each canonical must have reciprocal DE/EN and x-default");
  const actual=new Map(alternates.map(x=>[x[1],x[2]]));
  assert.deepEqual([...actual.keys()].sort(),["de","en","x-default"]);
  assert.equal(actual.get("de"),origin+de);
  assert.equal(actual.get("en"),origin+en);
  assert.equal(actual.get("x-default"),origin+de);
 }
}
for(const [route,file,lang,other,fallback] of [
 ["/","index.html","de","/en/","/"],["/en/","en/index.html","en","/","/"],
 ["/sources/","sources/index.html","de","/en/sources/","/sources/"],
 ["/en/sources/","en/sources/index.html","en","/sources/","/sources/"],
 ["/community/","community/index.html","de","/en/community/","/community/"],
 ["/en/community/","en/community/index.html","en","/community/","/community/"],
 ["/heute/","heute/index.html","de","/en/today/","/heute/"],
 ["/en/today/","en/today/index.html","en","/heute/","/heute/"]
]){
 const html=read(file);
 assert.ok(html.includes('<html lang="'+lang+'">'),"Correct document language: "+route);
 assert.ok(html.includes('<link rel="canonical" href="'+origin+route+'">'),"Self-canonical route: "+route);
 assert.ok(html.includes('hreflang="'+(lang==="en"?"de":"en")+'" href="'+origin+other+'">'),"Reciprocal language variant: "+route);
 assert.ok(html.includes('hreflang="x-default" href="'+origin+fallback+'">'),"HTML x-default must match sitemap: "+route);
 assert.ok(!/<meta[^>]*name="robots"[^>]*noindex/.test(html),"Indexable routes must not be noindex: "+route);
}
assert.ok(!/<lastmod>/.test(sitemap),"No invented lastmod timestamps in sitemap");
console.log("SEO: 8 exact indexable routes, self-canonicals, reciprocal bilingual and x-default alternates");
