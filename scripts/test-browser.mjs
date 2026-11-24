import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFileSync,mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join,resolve,extname} from "node:path";
import {spawn,spawnSync} from "node:child_process";
import {createServer as makeTcp} from "node:net";
import {setTimeout as delay} from "node:timers/promises";
const binaries=[process.env.CHROME_BIN,"google-chrome","google-chrome-stable","chromium","chromium-browser"].filter(Boolean);
const chromeBin=binaries.find(p=>spawnSync(p,["--version"],{stdio:"ignore"}).status===0);
if(!chromeBin&&process.env.CI)throw Error("Chrome/Chromium is required in CI");
if(!chromeBin){console.log("SKIP: Chrome/Chromium not installed on this runner");process.exit(0)}
const root=resolve(".");
const server=createServer((req,res)=>{
 try{
  const url=new URL(req.url,"http://127.0.0.1");
  const key=url.pathname==="/"?"/index.html":url.pathname.endsWith("/")?url.pathname+"index.html":url.pathname;
  const file=resolve(root,"."+decodeURIComponent(key));
  if(!file.startsWith(root+"/"))throw Error("Outside root");
  const buffer=readFileSync(file);
  const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json; charset=utf-8",".xml":"application/xml; charset=utf-8"};
  res.writeHead(200,{"Content-Type":mime[extname(file)]||"text/plain"});res.end(buffer);
 }catch{res.writeHead(404);res.end("Not found")}
});
await new Promise(r=>server.listen(0,"127.0.0.1",r));
const port=server.address().port;
const freePort=()=>new Promise(resolve=>{const t=makeTcp();t.listen(0,"127.0.0.1",()=>{const p=t.address().port;t.close(()=>resolve(p))})});
// GitHub-hosted runners occasionally start Chromium without exposing DevTools.
// A fresh profile and debug port for each attempt avoids colliding with an
// orphaned prior launch; the test still FAILS if no real browser starts.
const startupAttempts=3;
let chrome=null,profile=null,socket=null,target=null;
const startupDiagnostics=[];
try{
 for(let attempt=1;attempt<=startupAttempts;attempt++){
  const debugPort=await freePort();
  profile=mkdtempSync(join(tmpdir(),"demoradar-chrome-"));
  const stderr=[];
  chrome=spawn(chromeBin,["--headless=new","--no-sandbox","--disable-gpu","--disable-dev-shm-usage",
   "--no-first-run","--no-default-browser-check","--disable-background-networking","--disable-extensions",
   "--remote-debugging-address=127.0.0.1","--remote-debugging-port="+debugPort,
   "--user-data-dir="+profile,"about:blank"],{stdio:["ignore","ignore","pipe"]});
  chrome.stderr?.on("data",chunk=>{
   if(stderr.join("").length<3000)stderr.push(String(chunk).slice(0,500));
  });
  let spawnError=null;
  chrome.on("error",error=>{spawnError=error});
  let connected=false;
  for(let retry=0;retry<75;retry++){
   if(chrome.exitCode!==null||spawnError)break;
   try{
    const response=await fetch("http://127.0.0.1:"+debugPort+"/json/list",{
     signal:AbortSignal.timeout(350)});
    if(response.ok){
     const tabs=await response.json();
     target=tabs.find(t=>t.type==="page"&&t.webSocketDebuggerUrl);
     if(target){connected=true;break}
    }
   }catch{}
   await delay(120);
  }
  if(connected){
   console.log("Real Chromium DevTools connected (attempt "+attempt+"/"+startupAttempts+")");
   break;
  }
  startupDiagnostics.push("attempt "+attempt+": exit="+chrome.exitCode+
   (spawnError?", spawn="+spawnError.message:"")+", stderr="+stderr.join("").slice(-500));
  chrome.kill("SIGKILL");
  try{rmSync(profile,{recursive:true,force:true})}catch{}
  chrome=null;profile=null;target=null;
  if(attempt<startupAttempts)await delay(400);
 }
 assert.ok(target,"Could not connect to Chrome DevTools after "+startupAttempts+
  " fresh real-Chromium launches: "+startupDiagnostics.join(" | "));
 socket=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true})});
 let id=0;
 const pending=new Map(),exceptions=[];
 socket.addEventListener("message",ev=>{
  const x=JSON.parse(ev.data);
  if(x.method==="Runtime.exceptionThrown")exceptions.push(x.params.exceptionDetails.text);
  if(x.id&&pending.has(x.id)){
   const {resolve,reject}=pending.get(x.id);pending.delete(x.id);
   if(x.error)reject(Error(JSON.stringify(x.error)));else resolve(x.result);
  }
 });
 const send=(method,params={})=>new Promise((resolve,reject)=>{
  const seq=++id;pending.set(seq,{resolve,reject});
  socket.send(JSON.stringify({id:seq,method,params}));
 });
 const evaluate=async expression=>{
  const response=await send("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});
  if(response.exceptionDetails)throw Error("Browser JS exception: "+response.exceptionDetails.text);
  return response.result.value;
 };
 await send("Page.enable");await send("Runtime.enable");
 const rootUrl="http://127.0.0.1:"+port;
 const stateCode='(()=>({language:document.documentElement.lang,cityCount:document.querySelector("#city")?.options.length||0,month:document.querySelector("#resultText")?.textContent||"",calendar:document.querySelector("#calendar")?.querySelectorAll(".day-events").length||0,width:window.innerWidth,scrollWidth:document.documentElement.scrollWidth,bodyScrollWidth:document.body.scrollWidth,toolbar:document.querySelector(".toolbar")?.getBoundingClientRect().width,heading:document.querySelector("h1")?.textContent||"",mapStates:document.querySelectorAll("#heatmapSvg .heatmap-state").length,sourceRows:document.querySelectorAll("#heatmapRanking .heatmap-source-label").length,healthRows:document.querySelectorAll("#heatmapRanking .heatmap-health-label").length,healthWarnings:document.querySelectorAll("#heatmapRanking .heatmap-health-label.is-warning").length,gapNote:!!document.querySelector(".heatmap-coverage-note"),gapStates:document.querySelectorAll("#heatmapSvg [stroke-dasharray]").length,floating:getComputedStyle(document.querySelector(".floating-calendar-link")).position}))()';
 async function navigate(path,width){
  await send("Emulation.setDeviceMetricsOverride",{width,height:850,deviceScaleFactor:1,mobile:width<=430});
  await send("Page.navigate",{url:rootUrl+path});
  let state;
  for(let i=0;i<70;i++){
   try{state=await evaluate(stateCode);if(state.cityCount>1&&state.calendar>0&&state.mapStates===16)break}catch{}
   await delay(140);
  }
  assert.ok(state?.cityCount>1&&state.calendar>0&&state.mapStates===16,"Data/calendar did not render: "+path+" "+JSON.stringify(state));
  assert.equal(state.language,path.startsWith("/en/")?"en":"de","HTML route language");
  assert.equal(state.sourceRows,16,"Every state lists an auditable source coverage status");
  assert.ok(state.healthRows>=3,"Observed importer health is visible in the state list");
  assert.ok(state.healthWarnings>=1,"Unavailable government source must have a visible non-green warning");
  assert.equal(state.gapNote,true,"Coverage caveat rendered on desktop and mobile");
  assert.ok(state.gapStates>0,"No-source zero states shown distinctly with dashed borders");
  assert.equal(state.floating,"fixed","Floating calendar link remains visible");
  assert.ok(state.scrollWidth<=width+2&&state.bodyScrollWidth<=width+2,"Horizontal overflow at "+width+"px: "+JSON.stringify(state));
  return state;
 }
 for(const width of [320,375,1280]){
  for(const path of ["/","/en/"]){
   const state=await navigate(path,width);
   console.log(path,width+"px",state.calendar+" day markers; scrollWidth "+state.scrollWidth);
  }
 }
 // Real Chromium navigation of crawlable pages in both languages and breakpoints.
 for(const [route,lang] of [["/heute/","de"],["/en/today/","en"]]){
  for(const width of [320,1280]){
   await send("Emulation.setDeviceMetricsOverride",{width,height:850,deviceScaleFactor:1,mobile:width<=430});
   await send("Page.navigate",{url:rootUrl+route});
   let info;
   for(let attempt=0;attempt<60;attempt++){
    try{info=await evaluate('(()=>({lang:document.documentElement.lang,heading:document.querySelector("h1")?.textContent||"",robots:document.querySelector("meta[name=robots]")?.content||"",canonical:document.querySelector("link[rel=canonical]")?.href||"",scroll:document.documentElement.scrollWidth}))()');if(info?.heading)break}catch{}
    await delay(120);
   }
   assert.equal(info?.lang,lang,"Today's route must have matching document language");
   assert.ok(info.heading.includes(lang==="de"?"Demonstrationen heute":"Demonstrations today"),"Localized heading");
   assert.ok(info.robots.includes("index"),"Crawlable today page");
   assert.ok(info.canonical.endsWith(route),"Canonical route must match");
   assert.ok(info.scroll<=width+2,"No horizontal overflow on daily page");
   const provenance=await evaluate('(()=>({cards:document.querySelectorAll("li.item").length,sourceLabels:document.querySelectorAll("li.item .evidence").length,staleHidden:document.querySelector("#staleNotice")?.hidden===true,firstLinkHeight:document.querySelector("li.item a.event")?.getBoundingClientRect().height||0,badSourceLinks:[...document.querySelectorAll("li.item .evidence a")].filter(a=>a.protocol!=="https:"||a.rel!=="noopener noreferrer").length}))()');
   assert.equal(provenance.sourceLabels,provenance.cards,"Every reported demonstration needs a readable publisher name");
   assert.ok(provenance.firstLinkHeight>=43||provenance.cards===0,"Event links need a readable mobile tap target");
   assert.equal(provenance.badSourceLinks,0,"Do not expose unsafe original-source URLs");
   assert.equal(provenance.staleHidden,true,"Today's current generated page must not show a stale-date warning");
   const coverage=await evaluate('(()=>{const d=document.querySelector(".coverage details"),s=d?.querySelector("summary");if(!d||!s)return null;const before=d.open;s.click();return {before,after:d.open,count:d.querySelectorAll(".state-list li").length,scroll:document.documentElement.scrollWidth,summaryHeight:s.getBoundingClientRect().height}})()');
   assert.ok(coverage&&!coverage.before&&coverage.after,"Coverage disclosure must open in real Chromium");
   assert.equal(coverage.count,16,"All 16 states must render after expanding the disclosure");
   assert.ok(coverage.summaryHeight>=43,"Disclosure must be easy to tap on smartphones");
   assert.ok(coverage.scroll<=width+2,"Expanded state coverage causes horizontal overflow");
   console.log(route,width+"px today landing page; scrollWidth "+info.scroll);
  }
 }
 for(const languageRoute of ["/","/en/"]){
  await navigate(languageRoute,320);
  const tap=await evaluate('(()=>{const host=document.createElement("div");host.className="detail-press";const a=document.createElement("a");a.className="editorial-link";a.textContent="MDR: Weiterführender redaktioneller Medienbericht zum Demo-Termin";a.href="https://www.mdr.de/";host.append(a);document.querySelector("main").append(host);const h=a.getBoundingClientRect().height;const w=document.documentElement.scrollWidth;host.remove();return {h,w}})()');
  assert.ok(tap.h>=43,"Editorial links require smartphone-sized touch targets: "+languageRoute+" "+JSON.stringify(tap));
  assert.ok(tap.w<=322,"Editorial link must not cause horizontal scroll at 320px: "+languageRoute+" "+JSON.stringify(tap));
 }
 await navigate("/",375);
 await evaluate('document.querySelector("#heatmapSvg [aria-label^=\\\"Sachsen:\\\"]").dispatchEvent(new MouseEvent("click",{bubbles:true}));true');
 assert.equal(await evaluate('document.getElementById("region").value'),"Sachsen","Clickable state heatmap filters calendar");
 await evaluate('(()=>{const r=document.getElementById("region");r.value="Sachsen";r.dispatchEvent(new Event("change",{bubbles:true}));return true})()');
 const saxony=await evaluate('(()=>({options:[...document.getElementById("city").options].map(e=>e.value),label:document.getElementById("resultText").textContent}))()');
 assert.ok(saxony.options.includes("Dresden")&&!saxony.options.includes("Berlin"),"State/city filter must be linked");
 await evaluate('document.querySelector("[data-language=en]").click();true');
 for(let i=0;i<50;i++){if(await evaluate("location.pathname")==="/en/")break;await delay(100)}
 assert.equal(await evaluate("location.pathname"),"/en/","DE/EN switch navigates to /en/");
 const storedEvents=JSON.parse(readFileSync("data/events.json","utf8")).events;
 const berlin=storedEvents.find(e=>e.source_url?.includes("/versammlungen-aufzuege/index.php/index/all.json"));
 assert.ok(berlin?.id,"Fixture needs a Berlin feed event");
 for(const route of ["/","/en/"]){
  await navigate(route+"?event="+encodeURIComponent(berlin.id)+"#eventDetail",375);
  let source;
  for(let attempt=0;attempt<50;attempt++){
   source=await evaluate('document.querySelector(".event-detail-actions a")?.href');
   if(source)break;
   await delay(100);
  }
  assert.equal(source,"https://www.berlin.de/polizei/service/versammlungsbehoerde/versammlungen-aufzuege/");
 }
 const sample=storedEvents.find(e=>e.source_url==="https://www.presseportal.de/blaulicht/pm/4970/6390267");
 assert.ok(sample?.id,"Fixture needs an event ID");
 const query="?event="+encodeURIComponent(sample.id)+"#eventDetail";
 await navigate("/"+query,375);
 let details;
 for(let i=0;i<50;i++){
  details=await evaluate('(()=>({visible:!document.getElementById("eventDetail").hidden,title:document.getElementById("eventDetailTitle")?.textContent||"",copy:!!document.getElementById("eventShare"),source:!!document.querySelector("#eventDetailContent a[target=_blank]")}))()');
  if(details.visible&&details.title===sample.title)break;
  await delay(110);
 }
 assert.ok(details.visible&&details.title===sample.title,"Direct event link shows title and overlay: "+JSON.stringify(details));
 assert.ok(details.copy&&details.source,"Details expose sharing and original source");
 assert.equal(await evaluate('document.querySelector(".event-detail-actions a")?.href'),sample.source_url,"Historical individual notice remains linked");
 await evaluate('document.querySelector("[data-language=en]").click();true');
 for(let i=0;i<50;i++){if(await evaluate("location.pathname")==="/en/")break;await delay(100)}
 assert.ok((await evaluate("location.search")).includes(encodeURIComponent(sample.id)),"Language switch preserves shared event ID");
 let englishDetail=false;
 for(let i=0;i<50;i++){
  try{englishDetail=await evaluate('!document.getElementById("eventDetail").hidden && !!document.getElementById("eventDetailTitle")?.textContent')}catch{}
  if(englishDetail)break;
  await delay(120);
 }
 assert.ok(englishDetail,"English event detail can be opened from shared link");
 await evaluate('document.getElementById("eventDetailClose").click();true');
 assert.equal(await evaluate('document.getElementById("eventDetail").hidden'),true,"Detail close button hides overlay");
 assert.ok(!(await evaluate("location.search")).includes("event="),"Closing event detail removes query parameter");
 for(const width of [320,375,1280]){
  for(const route of ["/sources/","/en/sources/"]){
   await send("Emulation.setDeviceMetricsOverride",{width,height:850,deviceScaleFactor:1,mobile:width<=430});
   await send("Page.navigate",{url:rootUrl+route});
   let dashboard;
   for(let attempt=0;attempt<70;attempt++){
    // During Page.navigate Chromium can temporarily invalidate the old execution context.
    try{dashboard=await evaluate('(()=>({lang:document.documentElement.lang,states:document.querySelectorAll("#stateGrid .source-card").length,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth,feed:document.querySelector("#feedCount")?.textContent,errors:document.querySelector("#sourceResults")?.textContent}))()')}catch{await delay(140);continue}
    if(dashboard.states===16)break;
    await delay(140);
   }
   assert.equal(dashboard.states,16,"All 16 source cards load in "+route+" at "+width+"px: "+JSON.stringify(dashboard));
   assert.equal(dashboard.lang,route.startsWith("/en/")?"en":"de");
   const expectedObserved=JSON.parse(readFileSync("data/source-quality.json","utf8")).sources.filter(x=>x.status==="observed_data"&&["Polizei Berlin","Stadt Dresden","Stadt Rostock"].includes(x.source)).length;
   assert.equal(Number(dashboard.feed),expectedObserved,"Display only actually observed recurring city feeds; outages must not be disguised");
   assert.ok(dashboard.scroll<=width+2&&dashboard.body<=width+2,"Source registry horizontal overflow at "+width+"px: "+JSON.stringify(dashboard));
   const filtered=await evaluate('(()=>{const s=document.querySelector("#sourceFilter");s.value="no_confirmed_regular_feed";s.dispatchEvent(new Event("change",{bubbles:true}));return {visible:document.querySelectorAll("#stateGrid .source-card").length,badges:[...document.querySelectorAll("#stateGrid .source-chip")].map(x=>x.textContent)}})()');
   assert.ok(filtered.visible>0&&filtered.visible<16,"Missing-source filter must narrow results");
   const searchResult=await evaluate('(()=>{document.querySelector("#sourceFilter").value="all";const el=document.querySelector("#sourceSearch");el.value="Berlin";el.dispatchEvent(new Event("input",{bubbles:true}));return [...document.querySelectorAll("#stateGrid .source-card h2")].map(x=>x.textContent)})()');
   assert.deepEqual(searchResult,["Berlin"],"Source search filters to a single state");
   console.log("Source registry",route,width+"px",dashboard.states,"states; search and filter OK");
  }
 }
 assert.equal(exceptions.length,0,"Browser runtime exceptions: "+exceptions.join(" | "));
 console.log("Chromium mobile/desktop, language switch, filters, calendar and no horizontal overflow: OK");
}finally{
 try{socket?.close()}catch{}
 chrome?.kill("SIGKILL");
 await new Promise(r=>server.close(r));
 if(profile)try{rmSync(profile,{recursive:true,force:true})}catch{}
}
