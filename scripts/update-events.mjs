import {mkdir,readFile,writeFile} from "node:fs/promises";
const SOURCE="https://www.berlin.de/polizei/service/versammlungsbehoerde/versammlungen-aufzuege/index.php/index/all.json?q=";
const target="data/events.json";
const STATUS="data/berlin-source.json";
async function report(status,count,error=""){
 const value={source_url:SOURCE,status,checked_on:new Date().toISOString().slice(0,10),count,
  scope:"Official Berlin state assembly JSON; not a federal protest feed"};
 if(error)value.error=String(error).slice(0,150);
 let old={};try{old=JSON.parse(await readFile(STATUS,"utf8"))}catch{}
 if(JSON.stringify(old)!==JSON.stringify(value))await writeFile(STATUS,JSON.stringify(value,null,2)+"\n");
}
const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),25000);
let response;try{response=await fetch(SOURCE,{signal:controller.signal,headers:{"User-Agent":"DemoRadar/0.1 (public source attribution; research project)","Accept":"application/json"}})}catch(error){await report("unavailable",null,error);let saved;try{saved=JSON.parse(await readFile(target,"utf8"))}catch{}if(Array.isArray(saved?.events)&&saved.events.length>0){console.warn("Berlin source temporarily unreachable; preserving",saved.events.length,"stored events:",String(error));process.exit(0)}throw error}finally{clearTimeout(timer)}
if(!response.ok){await report("unavailable",null,"HTTP "+response.status);let saved;try{saved=JSON.parse(await readFile(target,"utf8"))}catch{}
 if(Array.isArray(saved?.events)&&saved.events.length){console.warn("Berlin source HTTP",response.status,"; preserving verified events");process.exit(0)}
 throw Error("Source HTTP "+response.status)}
let payload;
try{payload=await response.json()}catch(error){
 await report("unavailable",null,"Invalid JSON: "+error);let saved;try{saved=JSON.parse(await readFile(target,"utf8"))}catch{}
 if(Array.isArray(saved?.events)&&saved.events.length){console.warn("Berlin returned invalid JSON; preserving verified events");process.exit(0)}
 throw error
}
if(!Array.isArray(payload.index)||payload.index.length===0||payload.index.length>10000){
 await report("unavailable",null,"Unexpected or empty index");let saved;try{saved=JSON.parse(await readFile(target,"utf8"))}catch{}
 if(Array.isArray(saved?.events)&&saved.events.length){console.warn("Berlin returned invalid index; preserving verified events");process.exit(0)}
 throw Error("Unexpected index / refusing empty overwrite")
}
const parseDate=s=>{const m=/^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(s||""));return m?m[3]+"-"+m[2]+"-"+m[1]:null};
const events=payload.index.map(item=>({id:"berlin-"+String(item.id),country:"DE",state:"Berlin",city:"Berlin",date:parseDate(item.datum),start:String(item.von||""),end:String(item.bis||""),title:String(item.thema||"").replace(/\s+/g," ").trim(),postal_code:String(item.plz||""),location:String(item.strasse_nr||"").replace(/\s+/g," ").trim(),route:String(item.aufzugsstrecke||"").replace(/\s+/g," ").trim(),source:"Polizei Berlin – Versammlungsbehörde",source_url:SOURCE,source_status:"behördlich angezeigt"})).filter(e=>e.date&&e.title);
if(events.length===0)throw Error("No valid dated items");
await report("ok",events.length);
events.sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start)||a.id.localeCompare(b.id));
let old;try{old=JSON.parse(await readFile(target,"utf8"))}catch{}
const previousOther=(old?.events||[]).filter(e=>e.country==="DE"&&e.state!=="Berlin");
const combined=[...events,...previousOther].sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start)||a.id.localeCompare(b.id));
const snapshot={source_url:SOURCE,source_name:"Polizei Berlin – Versammlungsbehörde",license_note:"Lizenzbedingungen der Originalquelle prüfen; keine CC-Freigabe behaupten",updated_at:new Date().toISOString(),count:combined.length,events:combined};
if(old&&JSON.stringify(old.events)===JSON.stringify(combined)){console.log("No changes");process.exit(0)}
await mkdir("data",{recursive:true});await writeFile(target,JSON.stringify(snapshot,null,2)+"\n");
console.log("Saved "+events.length+" event records");
