import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {origin,pairs,validateSnapshot} from "./verify-public-crawlability.mjs";
const paths={"/":"index.html","/en/":"en/index.html","/community/":"community/index.html","/en/community/":"en/community/index.html","/sources/":"sources/index.html","/en/sources/":"en/sources/index.html","/heute/":"heute/index.html","/en/today/":"en/today/index.html","/berlin/":"berlin/index.html","/robots.txt":"robots.txt","/sitemap.xml":"sitemap.xml"};
const asMap=()=>new Map(Object.entries(paths).map(([route,path])=>[
 origin+route,{status:200,type:route.endsWith(".xml")?"application/xml":route.endsWith(".txt")?"text/plain; charset=utf-8":"text/html; charset=utf-8",body:readFileSync(path,"utf8")}
]));
const baseline=asMap();
const first=validateSnapshot(baseline);
assert.deepEqual(first.errors,[],"Actual source files must be crawlable with correct canonical, language alternates and sitemap");
assert.equal(first.checkedRoutes,8);
assert.ok(brokenBerlinFallbackCheck());
function brokenBerlinFallbackCheck(){const data=asMap();data.get(origin+"/berlin/").body=data.get(origin+"/").body;return validateSnapshot(data).errors.some(e=>/Berlin.*fallback|Berlin.*canonical|Berlin.*heading/.test(e));}
const broken=edit=>{const data=asMap();edit(data);return validateSnapshot(data).errors};
assert.ok(broken(data=>{const item=data.get(origin+"/heute/");item.body=data.get(origin+"/").body;}).some(x=>x.includes("fallback")||x.includes("canonical")||x.includes("language")),"HTTP 200 generic SPA fallback must fail");
assert.ok(broken(data=>{data.get(origin+"/en/today/").status=404}).some(x=>x.includes("not HTTP 200")),"Missing route must fail");
assert.ok(broken(data=>{data.get(origin+"/en/").body=data.get(origin+"/en/").body.replace('rel="canonical"','rel="other"')}).some(x=>x.includes("self-canonical")),"Missing canonical must fail");
assert.ok(broken(data=>{data.get(origin+"/robots.txt").body="User-agent: *\\nDisallow: /\\n"}).some(x=>x.includes("disallow")),"A globally blocked crawler must fail");
assert.ok(broken(data=>{data.get(origin+"/sitemap.xml").body="<html>Cloudflare fallback</html>"}).some(x=>x.includes("urlset")),"HTTP 200 sitemap fallback must fail");
assert.ok(broken(data=>{data.get(origin+"/community/").body=data.get(origin+"/community/").body.replace('hreflang="x-default"','hreflang="fr"')}).some(x=>x.includes("neutral")),"Missing neutral alternate must fail");
assert.equal(pairs.flat().length,8);
console.log("Crawler-safe offline audit passed: eight canonical paths, sitemap, robots, fallback and error regressions.");
