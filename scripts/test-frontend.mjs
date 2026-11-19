import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";

const js=readFileSync("live.js","utf8");
const i18n=readFileSync("i18n.js","utf8");
const html=readFileSync("index.html","utf8");
const english=readFileSync("en/index.html","utf8");
const iso=(date)=>{const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,"0"),d=String(date.getDate()).padStart(2,"0");return y+"-"+m+"-"+d};
const now=new Date();
const today=iso(now);
const tomorrow=iso(new Date(now.getFullYear(),now.getMonth(),now.getDate()+1));
const official=[
 {id:"berlin-1",country:"DE",state:"Berlin",city:"Berlin",date:today,start:"12:00",title:"Kundgebung für Frieden",location:"Alexanderplatz",source:"Berlin",source_url:"https://www.berlin.de/"},
 {id:"dresden-1",country:"DE",state:"Sachsen",city:"Dresden",date:today,start:"16:00",title:"Mahnwache für Demokratie",location:"Altmarkt",source:"Dresden",source_url:"https://www.dresden.de/"},
 {id:"berlin-2",country:"DE",state:"Berlin",city:"Berlin",date:tomorrow,start:"14:00",title:"Klimastreik am Rathaus",location:"Rathaus",source:"Berlin",source_url:"https://www.berlin.de/"}
];
const community=[
 {id:"demos-1",country:"DE",state:"",city:"Dresden",date:today,start:"18:00",title:"Mahnwache für Demokratie",location:"Altmarkt",source:"Demos Berlin e.V.",source_url:"https://api.demonstrations.org/v1/event/1"},
 {id:"demos-2",country:"DE",state:"",city:"Münster",date:today,start:"10:00",title:"Schulstreik für Demokratie",location:"Zentrum",source:"Demos Berlin e.V.",source_url:"https://api.demonstrations.org/v1/event/2"}
];
const dataMap={
 "/data/events.json":{events:official,updated_at:new Date().toISOString()},
 "/data/demos-events.json":{events:community,license:"CC BY-SA 4.0"},
 "/data/source-status.json":{sources:[{city:"Dresden",status:"ok"}]},
 "/data/news-matches.json":{matches:{}},
 "/data/stream-discoveries.json":{version:1,candidates:[{
  event_id:"berlin-1",reviewed:false,auto_match:true,status:"recording",channel:"Testkanal",
  title:"Demo Berlin Frieden <img src=x onerror=alert(1)>",url:"https://www.youtube.com/watch?v=TEST123",
  checked_at:new Date().toISOString()
 }]}
};
async function mount(path,{failed=false,withReviewed=false,detail=false}={}){
 const all=new Map();
 function el(id){
  if(all.has(id))return all.get(id);
  const item={
   id,value:"",textContent:"",innerHTML:"",className:"",style:{},dataset:{},options:[],disabled:false,
   isConnected:false,listeners:{},attributes:{},
   classList:{add(){},remove(){},toggle(){}},
   addEventListener(event,cb){this.listeners[event]=cb},
   fire(event,argument={}){const cb=this.listeners[event];if(!cb)throw Error("No listener: "+id+" "+event);return cb(argument)},
   replaceChildren(...options){this.options=options;this.value=options[0]?.value??""},
   setAttribute(name,value){this.attributes[name]=value},
   insertAdjacentElement(pos,item){item.isConnected=true;all.set(item.id,item)}
  };
  all.set(id,item);return item;
 }
 el("region").value="Alle Bundesländer";el("topic").value="Alle Themen";el("position").value="Alle Positionen";
 el("search").value="";el("city").value="";
 const switches=["de","en"].map(lang=>{const b=el("language-"+lang);b.dataset.language=lang;return b});
 const translations=Array.from(html.matchAll(/data-i18n="([^"]+)"/g),m=>{const e=el("i18n:"+m[1]);e.dataset.i18n=m[1];return e});
 const doc={
  documentElement:{lang:""},title:"",listeners:{},
  querySelectorAll(sel){return sel==="[data-language]"?switches:sel==="[data-i18n]"?translations:sel===".stat"?[el("stat1"),el("stat2"),el("stat3")]:[]},
  querySelector(sel){if(sel===".notice")return el("notice");if(sel==='meta[name="description"]')return el("description");return null},
  getElementById:el,
  createElement(tag){return el("created-"+tag)},
  addEventListener(event,cb){this.listeners[event]=cb},
  dispatchEvent(event){this.listeners[event.type]?.(event)}
 };
 const location={pathname:path,search:detail?"?event=berlin-1":"",hash:"#demo-kalender",assigned:null,assign(url){this.assigned=url}};
 const window={location};
 const localStorage={getItem(){return null},setItem(){}};
 const reviewed={streams:[{
 event_id:"berlin-1",reviewed:true,evidence_url:"https://www.youtube.com/watch?v=LIVE123",
 url:"https://www.youtube.com/watch?v=LIVE123",channel:"Geprüfter Kanal",
 valid_until:new Date(Date.now()+86400000).toISOString(),live_status:"live",
 live_checked_at:new Date().toISOString(),
 recording_url:"https://www.youtube.com/watch?v=REPLAY123",recording_reviewed:true
}]};
 const fetch=url=>failed&&url==="/data/events.json"?Promise.reject(new Error("network failure")):Promise.resolve({
 ok:(withReviewed&&url==="/data/live-streams.json")||dataMap[url]!==undefined,
 status:(withReviewed&&url==="/data/live-streams.json")||dataMap[url]!==undefined?200:404,
 json:async()=>structuredClone(withReviewed&&url==="/data/live-streams.json"?reviewed:dataMap[url])
 });
 const Option=class{constructor(text,value){this.text=text;this.value=value}};
 const ctx={window,document:doc,location,navigator:{language:path.startsWith("/en/")?"en-GB":"de-DE"},localStorage,Option,fetch,Date,Intl,URL,URLSearchParams,console,CustomEvent:class{constructor(type,config){this.type=type;this.detail=config?.detail}}};
 runInNewContext(i18n,ctx,{filename:"i18n.js"});
 runInNewContext(js,ctx,{filename:"live.js"});
 for(let i=0;i<12;i++)await new Promise(resolve=>setImmediate(resolve));
 return {doc,el,location,i18n:window.DemoRadarI18n};
}
for(const path of ["/","/en/"]){
 const {doc,el,location,i18n:translator}=await mount(path);
 const en=path==="/en/";
 assert.equal(doc.documentElement.lang,en?"en":"de");
 assert.ok(el("calendar").innerHTML.includes("data-date="),"Calendar populated with real events");
 assert.equal(el("city").options.length,4,"Three cities plus All cities after dedupe");
 assert.equal(el("todayCount").textContent,en?"3 listings":"3 Meldungen","Official duplicate is suppressed");
 assert.ok(el("todayItems").innerHTML.includes('topic-badge topic-peace'),"Featured peace label is visible");
 assert.ok(el("todayItems").innerHTML.includes('topic-badge topic-democracy'),"Featured democracy label is visible");
 assert.ok(el("list").innerHTML.includes('topic-badge topic-peace'),"Calendar list displays a category label");
 assert.ok(el("list").innerHTML.includes('topic-badge topic-democracy'),"Calendar list uses distinct category styling");
 assert.ok(el("list").innerHTML.includes(en?"Possible recording":"Mögliche Aufzeichnung"),"Unverified archive visible in event card");
 assert.ok(el("list").innerHTML.includes("&lt;img"),"Archive title escaped to prevent injected HTML");
 assert.ok(!el("list").innerHTML.includes("<img src=x"),"No untrusted HTML rendered");
 assert.ok(el("todayItems").innerHTML.includes(en?"Peace &amp; war":"Frieden &amp; Krieg"),"Topic labels are translated");
 assert.ok(el("notice").innerHTML.includes("Demos Berlin"),"Community provenance displayed: "+path+" "+el("notice").innerHTML);
 el("region").value="Sachsen";el("region").fire("change");
 assert.equal(el("city").options.length,2,"State filter limits city choices");
 assert.equal(el("city").options[1].value,"Dresden");
 assert.equal(el("resultText").textContent,en?"1 reported events this month":"1 gemeldete Veranstaltungen in diesem Monat");
 assert.equal(el("todayCount").textContent,en?"1 listings":"1 Meldungen");
 el("city").value="Dresden";el("city").fire("change");
 assert.equal(el("resultText").textContent,en?"1 reported events this month":"1 gemeldete Veranstaltungen in diesem Monat");
 el("search").value="nonsense";el("search").fire("input");
 assert.equal(el("resultText").textContent,en?"0 reported events this month":"0 gemeldete Veranstaltungen in diesem Monat");
 assert.equal(el("todayCount").textContent,en?"0 listings":"0 Meldungen","Highlights respect text search");
 el("search").value="";el("search").fire("input");
 el("calendar").fire("click",{target:{closest(){return{dataset:{date:today}}}}});
 assert.ok(el("list").innerHTML.includes("Mahnwache für Demokratie"));
 assert.ok(el("list").innerHTML.includes("dresden.de"));
 el("backToCalendar").onclick();
 assert.equal(translator.language,en?"en":"de");
 translator.setLanguage(en?"de":"en");
 assert.equal(location.assigned,(en?"/":"/en/")+"#demo-kalender","Switch navigates and preserves section");
 const failedPage=await mount(path,{failed:true});
 assert.equal(failedPage.el("notice").textContent,failedPage.i18n.t("source.loadFailed"),"Failed fetch is disclosed");
}
for(const path of ["/","/en/"]){
 const mixed=await mount(path,{withReviewed:true,detail:true});
 const rendered=mixed.el("eventDetailContent").innerHTML;
 assert.ok(rendered.includes("LIVE123"),"Fresh reviewed LIVE link displayed");
 assert.ok(rendered.includes("REPLAY123")===false,"LIVE must link to actual live playback, not old archive");
 assert.ok(rendered.includes(path==="/en/"?"Additional automated suggestions":"Weitere automatisch gefundene Vorschläge"),"Possible recording remains visible beside reviewed LIVE");
 assert.ok(rendered.includes("TEST123"),"Unverified archive retained separately");
}
assert.ok(html.includes('name="viewport"'));
assert.ok(english.includes('name="viewport"'));
assert.ok(html.includes("max-width:440px")&&html.includes(".quick-links")&&html.includes("floating-calendar-link"));
assert.ok(html.includes("grid-template-columns:repeat(2,minmax(0,1fr))"),"Mobile two-column navigation");
for(const category of ["climate","peace","social","migration","democracy","other"]){
 assert.ok(html.includes(".topic-"+category+"{"),"Each topic has a distinct CSS palette: "+category);
}
assert.ok(html.includes("font-size:14px"),"Category labels have enlarged text");
console.log("DE and EN: calendar, cities/states, text filters, highlights, dates, dedupe, language routes, data errors, mobile CSS smoke tests passed.");
