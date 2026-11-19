import {mkdir,readFile,writeFile} from "node:fs/promises";
const SOURCE="https://www.berlin.de/polizei/service/versammlungsbehoerde/versammlungen-aufzuege/index.php/index/all.json?q=";
const target="data/events.json";
const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),25000);
let response;try{response=await fetch(SOURCE,{signal:controller.signal,headers:{"User-Agent":"DemoRadar/0.1 (public source attribution; research project)","Accept":"application/json"}})}finally{clearTimeout(timer)}
if(!response.ok)throw Error("Source HTTP "+response.status);
const payload=await response.json();
if(!Array.isArray(payload.index)||payload.index.length===0||payload.index.length>10000)throw Error("Unexpected index / refusing empty overwrite");
const parseDate=s=>{const m=/^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(s||""));return m?m[3]+"-"+m[2]+"-"+m[1]:null};
const events=payload.index.map(item=>({id:"berlin-"+String(item.id),country:"DE",state:"Berlin",city:"Berlin",date:parseDate(item.datum),start:String(item.von||""),end:String(item.bis||""),title:String(item.thema||"").replace(/\s+/g," ").trim(),postal_code:String(item.plz||""),location:String(item.strasse_nr||"").replace(/\s+/g," ").trim(),route:String(item.aufzugsstrecke||"").replace(/\s+/g," ").trim(),source:"Polizei Berlin – Versammlungsbehörde",source_url:SOURCE,source_status:"behördlich angezeigt"})).filter(e=>e.date&&e.title);
if(events.length===0)throw Error("No valid dated items");
events.sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start)||a.id.localeCompare(b.id));
let old;try{old=JSON.parse(await readFile(target,"utf8"))}catch{}
const snapshot={source_url:SOURCE,source_name:"Polizei Berlin – Versammlungsbehörde",license_note:"Lizenzbedingungen der Originalquelle prüfen; keine CC-Freigabe behaupten",updated_at:new Date().toISOString(),count:events.length,events};
if(old&&JSON.stringify(old.events)===JSON.stringify(events)){console.log("No changes");process.exit(0)}
await mkdir("data",{recursive:true});await writeFile(target,JSON.stringify(snapshot,null,2)+"\n");
console.log("Saved "+events.length+" event records");
