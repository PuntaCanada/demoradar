import publicSourceUrl from "../public-source.js";
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
const origin="https://demoradar.pages.dev", route="/berlin/";
const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const datePattern=/^20\d{2}-\d{2}-\d{2}$/;
const berlinDay=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Berlin",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
export function eligible(e,day){
 const status=String(e.status_code||"")+" "+String(e.event_status||"");
 return e&&e.country==="DE"&&String(e.city||"").trim().toLocaleLowerCase("de-DE")==="berlin"&&
 typeof e.id==="string"&&e.id.length>0&&typeof e.title==="string"&&e.title.trim().length>0&&
 datePattern.test(e.date||"")&&e.date>=day&&
 !/cancelled|canceled|withdrawn|stopped|abgesagt|zurückgezogen|zurueckgezogen|abgebrochen/i.test(status);
}
function sourceLink(e){
 const url=publicSourceUrl(e.source_url);
 if(url)return '<a href="'+escape(url)+'" rel="noopener noreferrer">'+escape(e.source||"Originalquelle")+'</a>';
 return escape(e.source||"Quelle nicht verlinkt");
}
export function render(events,day){
 if(!datePattern.test(day))throw Error("Invalid Berlin date");
 const unique=new Map();
 for(const e of events.filter(e=>eligible(e,day))){
  const key=[e.date,e.city,e.start||"",e.title].map(s=>String(s).normalize("NFKC").toLocaleLowerCase("de-DE").trim()).join("|");
  if(!unique.has(key))unique.set(key,e);
 }
 const rows=[...unique.values()].sort((a,b)=>a.date.localeCompare(b.date)||String(a.start||"").localeCompare(String(b.start||""))||a.title.localeCompare(b.title,"de"));
 const items=rows.slice(0,100).map(e=>{
  const start=/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(e.start||"")&&!(e.start==="00:00"&&e.end==="23:59")?" · "+escape(e.start)+" Uhr":" · Uhrzeit nicht bestätigt";
  return '<li><h2><a href="/?event='+encodeURIComponent(e.id)+'#eventDetail">'+escape(e.title)+'</a></h2><p>'+escape(e.date)+start+' · Berlin</p><p>Quelle: '+sourceLink(e)+'</p></li>';
 }).join("\n");
 const html='<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<title>Demonstrationen in Berlin – kommende Termine | DemoRadar</title><meta name="description" content="Kommende Demonstrationen in Berlin: Termine, bekannte Uhrzeiten und Originalquellen. Unvollständige Quellenabdeckung; Angaben bitte prüfen.">'+
 '<meta name="robots" content="index,follow"><link rel="canonical" href="'+origin+route+'">'+
 '<style>body{font:16px/1.6 system-ui,sans-serif;max-width:900px;margin:auto;padding:24px;color:#17243a;background:#f5f8fc}nav{display:flex;gap:20px;flex-wrap:wrap}a{color:#075b85}li{background:white;border:1px solid #dce4ed;border-radius:12px;padding:12px 20px;margin:12px 0}ul{padding:0;list-style:none}h2{font-size:1.15rem}aside{background:#fff5d8;padding:16px;border-radius:10px}a:focus-visible{outline:3px solid #d38b00}</style></head><body>'+
 '<nav><a href="/">DemoRadar – alle Städte</a><a href="/heute/">Heute</a><a href="/sources/">Quellen und Abdeckung</a></nav>'+
 '<main><h1>Demonstrationen in Berlin</h1><p>Stand der Übersicht: '+escape(day)+' (Europe/Berlin). '+rows.length+' unterschiedliche kommende Quelleneinträge.</p>'+
 '<aside>Die Übersicht enthält nur bereits erfasste Quellenmeldungen und ist nicht vollständig. Ein fehlender Termin bedeutet nicht, dass keine Demonstration stattfindet. Termine können sich ändern oder abgesagt werden. Ein Eintrag bestätigt keinen LIVE-Status. Bitte Originalquellen prüfen.</aside>'+
 (rows.length?'<ul>'+items+'</ul>':'<p>Aktuell liegen keine passenden kommenden Quelleneinträge vor. Das bedeutet nicht, dass keine Demonstrationen stattfinden.</p>')+
 (rows.length>100?'<p>Es werden die ersten 100 von '+rows.length+' Einträgen angezeigt. Weitere Termine im <a href="/">Kalender</a>.</p>':'')+
 '<p><a href="/sources/">Quellenabdeckung und Warnungen prüfen</a> · <a href="/">Vollständiger Kalender und Filter</a></p>'+
 '</main><script>(function(){const day=new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Berlin",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());if(day!=='+JSON.stringify(day)+'){const p=document.createElement("p");p.textContent="Hinweis: Diese Seite wurde an einem früheren Tag erstellt. Aktuelle Daten im Kalender prüfen.";document.querySelector("main").prepend(p)}})();</script></body></html>';
 return html;
}
export function buildBerlin(){
 const data=JSON.parse(readFileSync("data/events.json","utf8"));
 if(!Array.isArray(data.events))throw Error("Missing official events array");
 mkdirSync("berlin",{recursive:true});
 writeFileSync("berlin/index.html",render(data.events,berlinDay()));
}
if(process.argv[1]&&import.meta.url===new URL("file://"+process.argv[1]).href)buildBerlin();
