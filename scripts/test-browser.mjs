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
const debugPort=await freePort();
const profile=mkdtempSync(join(tmpdir(),"demoradar-chrome-"));
const chrome=spawn(chromeBin,["--headless=new","--no-sandbox","--disable-gpu","--disable-dev-shm-usage","--no-first-run","--no-default-browser-check","--disable-background-networking","--disable-extensions","--remote-debugging-port="+debugPort,"--user-data-dir="+profile,"about:blank"],{stdio:"ignore"});
let socket=null;
try{
 let target;
 for(let retry=0;retry<70;retry++){
  if(chrome.exitCode!==null)throw Error("Chrome exited before debugging became available");
  try{
   const response=await fetch("http://127.0.0.1:"+debugPort+"/json/list");
   const tabs=await response.json();
   target=tabs.find(t=>t.type==="page"&&t.webSocketDebuggerUrl);
   if(target)break;
  }catch{}
  await delay(150);
 }
 assert.ok(target,"Could not connect to Chrome DevTools");
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
 const stateCode='(()=>({language:document.documentElement.lang,cityCount:document.querySelector("#city")?.options.length||0,month:document.querySelector("#resultText")?.textContent||"",calendar:document.querySelector("#calendar")?.querySelectorAll(".day-events").length||0,width:window.innerWidth,scrollWidth:document.documentElement.scrollWidth,bodyScrollWidth:document.body.scrollWidth,toolbar:document.querySelector(".toolbar")?.getBoundingClientRect().width,heading:document.querySelector("h1")?.textContent||"",floating:getComputedStyle(document.querySelector(".floating-calendar-link")).position}))()';
 async function navigate(path,width){
  await send("Emulation.setDeviceMetricsOverride",{width,height:850,deviceScaleFactor:1,mobile:width<=430});
  await send("Page.navigate",{url:rootUrl+path});
  let state;
  for(let i=0;i<70;i++){
   try{state=await evaluate(stateCode);if(state.cityCount>1&&state.calendar>0)break}catch{}
   await delay(140);
  }
  assert.ok(state?.cityCount>1&&state.calendar>0,"Data/calendar did not render: "+path+" "+JSON.stringify(state));
  assert.equal(state.language,path.startsWith("/en/")?"en":"de","HTML route language");
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
 await navigate("/",375);
 await evaluate('(()=>{const r=document.getElementById("region");r.value="Sachsen";r.dispatchEvent(new Event("change",{bubbles:true}));return true})()');
 const saxony=await evaluate('(()=>({options:[...document.getElementById("city").options].map(e=>e.value),label:document.getElementById("resultText").textContent}))()');
 assert.ok(saxony.options.includes("Dresden")&&!saxony.options.includes("Berlin"),"State/city filter must be linked");
 await evaluate('document.querySelector("[data-language=en]").click();true');
 for(let i=0;i<50;i++){if(await evaluate("location.pathname")==="/en/")break;await delay(100)}
 assert.equal(await evaluate("location.pathname"),"/en/","DE/EN switch navigates to /en/");
 const sample=JSON.parse(readFileSync("data/events.json","utf8")).events[0];
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
 assert.equal(exceptions.length,0,"Browser runtime exceptions: "+exceptions.join(" | "));
 console.log("Chromium mobile/desktop, language switch, filters, calendar and no horizontal overflow: OK");
}finally{
 try{socket?.close()}catch{}
 chrome.kill("SIGKILL");
 await new Promise(r=>server.close(r));
 try{rmSync(profile,{recursive:true,force:true})}catch{}
}
