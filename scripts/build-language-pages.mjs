import publicSourceUrl from "../public-source.js";
import {buildBerlin} from "./build-berlin-page.mjs";
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import vm from "node:vm";
import {selectTodayEntries} from "./today-selection.mjs";
const origin="https://demoradar.pages.dev";
const original=readFileSync("index.html","utf8");
const projectBlocks={"de":"<p id=\"project-network\" style=\"text-align:center;padding:12px;overflow-wrap:anywhere\">Eigenwerbung · Weitere Projekte unseres Netzwerks · <a href=\"https://gewinnradar.pages.dev/\">GewinnRadar</a> · <a href=\"https://handyfix.pages.dev/\">HandyFix</a> · <a href=\"https://dateiwerk.pages.dev/\">DateiWerk</a> · <a id=\"partners-link\" href=\"/partners/\">Unsere Projekte</a></p>","en":"<p id=\"project-network\" style=\"text-align:center;padding:12px;overflow-wrap:anywhere\">Self-promotion · Other projects in our network · <a href=\"https://gewinnradar.pages.dev/\">GewinnRadar</a> · <a href=\"https://handyfix.pages.dev/\">HandyFix</a> · <a href=\"https://dateiwerk.pages.dev/\">DateiWerk</a> · <a id=\"partners-link\" href=\"/en/partners/\">Our projects</a></p>"};
const partnerPages={"de":"<!doctype html><html lang=\"de\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Unsere Projekte | DemoRadar</title><meta name=\"description\" content=\"Eigenwerbung · Weitere Projekte unseres Netzwerks\"><link rel=\"canonical\" href=\"https://demoradar.pages.dev/partners/\"><link rel=\"alternate\" hreflang=\"de\" href=\"https://demoradar.pages.dev/partners/\"><link rel=\"alternate\" hreflang=\"en\" href=\"https://demoradar.pages.dev/en/partners/\"><link rel=\"alternate\" hreflang=\"x-default\" href=\"https://demoradar.pages.dev/partners/\"><link rel=\"stylesheet\" href=\"/partners.css\"></head><body><header><a href=\"/\">DemoRadar · Startseite</a><nav><a href=\"/partners/\" hreflang=\"de\" aria-current=\"page\">Deutsch</a> · <a href=\"/en/partners/\" hreflang=\"en\">English</a></nav></header><main><h1>Unsere Projekte</h1><p>Eigenwerbung · Weitere Projekte unseres Netzwerks</p><ul id=\"partner-cards\"><li><a href=\"https://comparanetrd.pages.dev/\"><strong>ComparaNet RD</strong><span>Internet und Mobilfunk vergleichen</span></a></li><li><a href=\"https://islaviva-rd.pages.dev/\"><strong>IslaViva RD</strong><span>Nachrichten, Wetter und Alltag</span></a></li><li><a href=\"https://vuelosrd.pages.dev/\"><strong>VuelosRD</strong><span>Flughäfen und Fluginformationen</span></a></li><li><a href=\"https://oficiord.pages.dev/\"><strong>OficioRD</strong><span>Handwerker und Dienstleistungen</span></a></li><li><a href=\"https://recarganet-rd.pages.dev/\"><strong>RecargaNet RD</strong><span>Prepaid-Aufladungen – Entwicklung und Simulation, keine Käufe</span></a></li><li><a href=\"https://by-maria-beauty-store.pages.dev/\"><strong>By María Beauty &amp; Store</strong><span>Beauty und Haarstyling in Higüey</span></a></li><li><a href=\"https://gewinnradar.pages.dev/\"><strong>GewinnRadar</strong><span>Gewinnspiele und Adventskalender</span></a></li><li><a href=\"https://ahorrord.pages.dev/\"><strong>AhorroRD</strong><span>Supermarktangebote und Preisvergleich</span></a></li><li><a href=\"https://hablard.pages.dev/\"><strong>HablaRD</strong><span>Dominikanisches Spanisch lernen</span></a></li><li><a href=\"https://transporterd.pages.dev/\"><strong>TransporteRD</strong><span>Öffentliche Verkehrsmittel in der Dominikanischen Republik</span></a></li><li><a href=\"https://aprenderd.pages.dev/\"><strong>AprendeRD</strong><span>Kurse und Weiterbildung</span></a></li><li><a href=\"https://handyfix.pages.dev/\"><strong>HandyFix</strong><span>Smartphone-Tipps und Hilfe</span></a></li><li><a href=\"https://dateiwerk.pages.dev/\"><strong>DateiWerk</strong><span>Dateiwerkzeuge im Browser</span></a></li><li><a href=\"https://voicefix.pages.dev/\"><strong>VoiceFix</strong><span>Hilfe bei Valorant-Sprachchatproblemen</span></a></li></ul></main><footer><a href=\"/\">Startseite</a></footer></body></html>\n","en":"<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Our projects | DemoRadar</title><meta name=\"description\" content=\"Self-promotion · Other projects in our network\"><link rel=\"canonical\" href=\"https://demoradar.pages.dev/en/partners/\"><link rel=\"alternate\" hreflang=\"de\" href=\"https://demoradar.pages.dev/partners/\"><link rel=\"alternate\" hreflang=\"en\" href=\"https://demoradar.pages.dev/en/partners/\"><link rel=\"alternate\" hreflang=\"x-default\" href=\"https://demoradar.pages.dev/partners/\"><link rel=\"stylesheet\" href=\"/partners.css\"></head><body><header><a href=\"/en/\">DemoRadar · Home</a><nav><a href=\"/partners/\" hreflang=\"de\">Deutsch</a> · <a href=\"/en/partners/\" hreflang=\"en\" aria-current=\"page\">English</a></nav></header><main><h1>Our projects</h1><p>Self-promotion · Other projects in our network</p><ul id=\"partner-cards\"><li><a href=\"https://comparanetrd.pages.dev/\"><strong>ComparaNet RD</strong><span>Compare internet and mobile plans</span></a></li><li><a href=\"https://islaviva-rd.pages.dev/\"><strong>IslaViva RD</strong><span>News, weather and daily life</span></a></li><li><a href=\"https://vuelosrd.pages.dev/\"><strong>VuelosRD</strong><span>Airports and flight information</span></a></li><li><a href=\"https://oficiord.pages.dev/\"><strong>OficioRD</strong><span>Tradespeople and services</span></a></li><li><a href=\"https://recarganet-rd.pages.dev/\"><strong>RecargaNet RD</strong><span>Prepaid top-ups – development and simulation, no purchases</span></a></li><li><a href=\"https://by-maria-beauty-store.pages.dev/\"><strong>By María Beauty &amp; Store</strong><span>Beauty and hairstyling in Higüey</span></a></li><li><a href=\"https://gewinnradar.pages.dev/\"><strong>GewinnRadar</strong><span>Giveaways and Advent calendars</span></a></li><li><a href=\"https://ahorrord.pages.dev/\"><strong>AhorroRD</strong><span>Supermarket offers and price comparisons</span></a></li><li><a href=\"https://hablard.pages.dev/\"><strong>HablaRD</strong><span>Learn Dominican Spanish</span></a></li><li><a href=\"https://transporterd.pages.dev/\"><strong>TransporteRD</strong><span>Public transport in the Dominican Republic</span></a></li><li><a href=\"https://aprenderd.pages.dev/\"><strong>AprendeRD</strong><span>Courses and training</span></a></li><li><a href=\"https://handyfix.pages.dev/\"><strong>HandyFix</strong><span>Smartphone tips and help</span></a></li><li><a href=\"https://dateiwerk.pages.dev/\"><strong>DateiWerk</strong><span>Browser-based file tools</span></a></li><li><a href=\"https://voicefix.pages.dev/\"><strong>VoiceFix</strong><span>Help with Valorant voice chat issues</span></a></li></ul></main><footer><a href=\"/en/\">Home</a></footer></body></html>\n"};
function projectBlock(html,lang){return html.replace(/<p id="project-network"[^>]*>[\s\S]*?<\/p>/g,"").replace('<div class="footer">',projectBlocks[lang]+'<div class="footer">');}
const file=readFileSync("i18n.js","utf8");
const begin=file.indexOf("const dictionary=");
const end=file.indexOf(";\n// Route",begin);
if(begin<0||end<0)throw Error("Dictionary not found");
const translations=vm.runInNewContext("("+file.slice(begin+"const dictionary=".length,end)+")");
if(!translations.en||!translations.de)throw Error("Missing languages");
const canonical=lang=>lang==="en"?origin+"/en/":origin+"/";
const links=lang=>'<link rel="canonical" href="'+canonical(lang)+'"><link rel="alternate" hreflang="de" href="'+origin+'/"><link rel="alternate" hreflang="en" href="'+origin+'/en/"><link rel="alternate" hreflang="x-default" href="'+origin+'/">';
function addSeo(html,lang){
 html=html.replace(/<link rel="canonical"[^>]*>/g,"").replace(/<link rel="alternate" hreflang="(?:de|en|x-default)"[^>]*>/g,"");
 html=html.replace(/<html lang="[^"]*">/,'<html lang="'+lang+'">');
 html=html.replace(/<title>[^<]*<\/title>/,"<title>"+translations[lang]["page.title"]+"</title>");
 html=html.replace(/<meta name="description" content="[^"]*">/,'<meta name="description" content="'+translations[lang]["page.description"]+'">');
 html=html.replace("</title>","</title>"+links(lang));
 return html;
}
const escapeHTML=s=>String(s).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
const escapeAttr=s=>escapeHTML(s).replace(/"/g,"&quot;");
function buildEnglish(){
 let html=addSeo(original,"en");
 html=html.replace(/<([a-z][\w-]*)\b([^>]*\bdata-i18n="([^"]+)"[^>]*)>([^<]*)<\/\1>/g,
  (whole,tag,attributes,key,content)=>{
   if(!(key in translations.en))throw Error("Missing English text: "+key);
   return "<"+tag+attributes+">"+escapeHTML(translations.en[key])+"</"+tag+">";
  });
 html=html.replace(/(<input\b[^>]*data-i18n-placeholder="([^"]+)"[^>]*\bplaceholder=")[^"]*(")/g,
  (_,prefix,key,end)=>prefix+escapeAttr(translations.en[key]||key)+end);
 html=html.replace(/(<[^>]*data-i18n-aria="([^"]+)"[^>]*\baria-label=")[^"]*(")/g,
  (_,prefix,key,end)=>prefix+escapeAttr(translations.en[key]||key)+end);
 html=html.replace("Diese Website befindet sich im Aufbau. Es sind noch keine Live-Daten verbunden. Das Fehlen eines Termins bedeutet nicht, dass keine Demonstration stattfindet.","This website is in beta. An event missing from our sources does not mean it will not take place.");
 html=html.replace('content="DemoRadar – Demonstrationen in Deutschland finden"','content="DemoRadar – Demonstrations in Germany"');
 html=html.replace('content="Heutige und kommende Demonstrationen nach Stadt und Bundesland entdecken – mit Quellen, Datenstand und Hinweisen zu Abdeckungslücken."','content="Find recorded demonstrations today and in the coming days by city and state, with source dates and transparent coverage gaps."');
 html=html.replace('content="https://demoradar.pages.dev/"','content="https://demoradar.pages.dev/en/"');
 html=html.replace("🚧 Vorschau:","🚧 Preview:");
 html=html.replace("Keine verifizierten Termine eingetragen","No verified events listed yet");
 html=html.replace("Live-Daten werden vorbereitet","Loading live event data");
 html=html.replace("Noch keine verifizierten Termine","No verified events yet");
 html=html.replace("Die Filter sind vorbereitet. Nach Anbindung geprüfter Quellen erscheinen hier automatisch Veranstaltungen mit Quellen- und Aktualisierungsangaben.","Events from checked sources will appear here with attribution and update details.");
 html=html.replace('<a href="/berlin/">Demos Berlin</a>','<a href="/berlin/">Berlin demonstrations</a>');
 html=html.replace(/href="\/community\/"/g,'href="/en/community/"');
 html=html.replace(/href="\/sources\/"/g,'href="/en/sources/"');
 html=html.replace('<a href="/heute/" aria-label="Heute gemeldete Demonstrationen als eigene Seite">Alle heutigen Meldungen</a>',
  '<a href="/en/today/" aria-label="Today\'s source-listed demonstrations on a separate page">All today\'s reports</a>');
 html=html.replace('<a class="quick-link" href="/heute/"><span aria-hidden="true">↗</span> <span>Alle heutigen Meldungen</span></a>',
  '<a class="quick-link" href="/en/today/"><span aria-hidden="true">↗</span> <span>All today\'s reports</span></a>');

 html=html.replace('data-language="de" aria-pressed="true"','data-language="de" aria-pressed="false"').replace('data-language="en" aria-pressed="false"','data-language="en" aria-pressed="true"');
 return projectBlock(html,"en");
}
const de=projectBlock(addSeo(original,"de"),"de");
if(de!==original)writeFileSync("index.html",de);
mkdirSync("en",{recursive:true});
writeFileSync("en/index.html",buildEnglish());

/* Search-indexable daily landing pages are generated from existing, dated
   source records only. They never assert that a listing is still LIVE or
   that uncovered regions have no demonstrations. No event-schema fabrication. */
const dayInBerlin=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Berlin",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const safeRecord=(e,today)=>e&&e.country==="DE"&&e.date===today&&
 typeof e.id==="string"&&e.id.length>0&&typeof e.title==="string"&&e.title.trim().length>0&&
 typeof e.city==="string"&&e.city.trim().length>0&&
 !["cancelled","canceled","withdrawn","stopped","abgesagt","zurückgezogen"].includes(String(e.status_code||"").toLocaleLowerCase("de"))&&
 !/abgesagt|zurückgezogen|zurueckgezogen|abgebrochen|cancelled/i.test(String(e.event_status||""));
const isRealDate=date=>/^20\d{2}-\d{2}-\d{2}$/.test(String(date||""))&&
 Number.isFinite(Date.parse(date+"T12:00:00Z"))&&new Date(date+"T12:00:00Z").toISOString().slice(0,10)===date;
function buildTodayPages(){
 const current=dayInBerlin();
 if(!isRealDate(current))throw Error("Invalid current Europe/Berlin day");
 const official=JSON.parse(readFileSync("data/events.json","utf8"));
 if(!Array.isArray(official.events))throw Error("Missing official event records for today page");
 const coverage=JSON.parse(readFileSync("data/state-source-coverage.json","utf8"));
 if(coverage.version!==1||!Array.isArray(coverage.states)||coverage.states.length!==16||
    new Set(coverage.states.map(x=>x.state)).size!==16)
  throw Error("The 16-state official-source coverage inventory is incomplete");
 const allowedCoverage=new Set(["regional_partial","local_partial","no_confirmed_regular_feed"]);
 if(!coverage.states.every(x=>typeof x.state==="string"&&allowedCoverage.has(x.status)))
  throw Error("Invalid 16-state source coverage classification");
 const unique=new Map();
 for(const e of official.events.filter(e=>safeRecord(e,current))){
  const norm=value=>String(value||"").normalize("NFKC").toLocaleLowerCase("de").replace(/\s+/g," ").trim();
  const key=[e.date,e.city,e.start||"",e.title].map(norm).join("|");
  if(!unique.has(key))unique.set(key,e);
 }
 const items=selectTodayEntries([...unique.values()],60);
 const representedCities=new Set(items.map(e=>e.city)).size;
 const timeText=(e,en)=>{
  const value=String(e.start||"");
  if(value==="00:00"&&String(e.end||"")==="23:59")return en?"All-day data entry; actual start unconfirmed":"Ganztägiger Zeiteintrag; tatsächlicher Beginn unbestätigt";
  if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value))return en?"Time unconfirmed":"Uhrzeit nicht bestätigt";
  return (en?"at ":"um ")+escapeHTML(value)+(en?"":" Uhr");
 };
 for(const [lang,dir,route] of [["de","heute","/heute/"],["en","en/today","/en/today/"]]){
  const en=lang==="en",pageTitle=en?"Demonstrations today in Germany | DemoRadar":"Demonstrationen heute in Deutschland | DemoRadar";
  const caveat=en?"Only existing dated source records are listed. The selection is incomplete; an unlisted demonstration may still take place. The appearance of an event does not establish that it is happening LIVE.":"Nur bereits vorhandene, datierte Quellenmeldungen werden aufgeführt. Die Übersicht ist unvollständig: Nicht aufgeführte Demonstrationen können trotzdem stattfinden. Ein Eintrag bestätigt keinen LIVE-Status.";
  const desc=en?"Demonstrations reported for today by source, location and time where known. Incomplete coverage; verify with the original publisher.":"Heute gemeldete Demonstrationen nach Ort und bekannter Uhrzeit. Unvollständige Abdeckung; Originalquelle beachten.";
  const nodes=items.map(e=>{
   const href=(en?"/en/":"/")+"?event="+encodeURIComponent(e.id)+"#eventDetail";
   const city=escapeHTML(e.city);
   const title=escapeHTML(e.title);
   const publisher=escapeHTML(e.source||(en?"Unspecified":"Nicht angegeben"));
   const direct=publicSourceUrl(e.source_url);
   const reference=direct?'<a href="'+escapeAttr(direct)+'" target="_blank" rel="noopener noreferrer">'+publisher+'</a>':publisher;
   return '<li class="item"><a class="event" href="'+escapeAttr(href)+'">'+title+'</a><p>'+city+' · '+timeText(e,en)+'</p><p class="evidence">'+(en?"Source listing: ":"Quelleneintrag: ")+reference+'</p></li>';
  }).join("\n");
  const empty=en?"No confirmed source listing for today is available here. That does not mean no demonstrations are taking place.":"Für heute liegt hier kein passender Quelleneintrag vor. Das bedeutet nicht, dass keine Demonstrationen stattfinden.";
  const coverageStatus=(state)=>{
   if(state.status==="regional_partial")return en?"Official city/territory feed only; not statewide coverage":"Amtlicher Stadt-/Gebietsfeed; keine landesweite Abdeckung";
   if(state.status==="local_partial")return en?"Only local sources or individual notices; not statewide coverage":"Nur lokale Quellen oder Einzelmeldungen; keine landesweite Abdeckung";
   return en?"No recurring official event feed confirmed for this project":"Kein regelmäßiger amtlicher Terminfeed für dieses Projekt bestätigt";
  };
  const stateItems=[...coverage.states].sort((a,b)=>a.state.localeCompare(b.state,"de")).map(state=>
   '<li><span class="state-name">'+escapeHTML(state.state)+'</span><span class="state-scope">'+escapeHTML(coverageStatus(state))+'</span></li>'
  ).join("");
  const sourceReview=typeof coverage.reviewed_on==="string"&&isRealDate(coverage.reviewed_on)?
   coverage.reviewed_on:(en?"date not documented":"Datum nicht dokumentiert");
  const stateDisclosure='<section aria-labelledby="stateCoverageHead" class="coverage">'+
   '<h2 id="stateCoverageHead">'+(en?"Coverage of the 16 German states":"Quellenabdeckung der 16 Bundesländer")+'</h2>'+
   '<p>'+(en?"The inventory summarizes sources available to DemoRadar, NOT the number of demonstrations. An unlisted state may still have protests. Source inventory last reviewed: ":"Die Übersicht beschreibt die für DemoRadar erfassten Quellen, NICHT die Anzahl stattfindender Demonstrationen. Auch in nicht abgedeckten Bundesländern können Proteste stattfinden. Letzte Quelleninventur: ")+escapeHTML(sourceReview)+'</p>'+
   '<details><summary>'+(en?"Show all 16 source-coverage assessments":"Alle 16 Bewertungen der Quellenlage anzeigen")+'</summary>'+
   '<ul class="state-list">'+stateItems+'</ul></details>'+
   '<p><a href="'+(en?"/en/sources/":"/sources/")+'">'+(en?"Read the full audit, freshness warnings and source links":"Vollständige Quellenprüfung, Frischewarnungen und Originalverweise")+'</a></p></section>';
  const canonical=origin+route,other=origin+(en?"/heute/":"/en/today/");
  const links=en?
   '<a href="/en/">Calendar</a><a href="/en/sources/">Official sources</a><a href="/en/community/">Community</a><a href="/heute/" hreflang="de">Deutsch</a>':
   '<a href="/">Kalender</a><a href="/sources/">Amtliche Quellen</a><a href="/community/">Community</a><a href="/en/today/" hreflang="en">English</a>';
  const html='<!doctype html><html lang="'+lang+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
   '<title>'+pageTitle+'</title><meta name="description" content="'+escapeAttr(desc)+'">'+
   '<meta name="robots" content="index,follow"><link rel="canonical" href="'+canonical+'">'+
   '<link rel="alternate" hreflang="'+lang+'" href="'+canonical+'"><link rel="alternate" hreflang="'+(en?"de":"en")+'" href="'+other+'">'+
   '<link rel="alternate" hreflang="x-default" href="'+origin+'/heute/">'+
   '<style>:root{font-family:system-ui,sans-serif;color:#192942;background:#f5f8fc}*{box-sizing:border-box}body{margin:0}header{background:#111e30;padding:16px max(20px,calc((100vw - 1050px)/2))}nav{display:flex;flex-wrap:wrap;gap:14px}nav a{color:white}main{max-width:980px;margin:auto;padding:26px 20px 70px}h1{font-size:clamp(27px,5vw,42px);line-height:1.2}p{line-height:1.55}.notice{border-left:4px solid #126b8a;background:white;padding:14px;border-radius:8px}ul{padding:0;list-style:none;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr));gap:12px}.item{border:1px solid #d9e2eb;background:white;border-radius:12px;padding:16px;min-width:0;overflow-wrap:anywhere}.event{font-weight:700;color:#115890;display:inline-block;padding:7px 0;min-height:44px}.item p{color:#526276;margin:4px 0}.evidence{font-size:14px;border-top:1px solid #e3eaf2;padding-top:8px;overflow-wrap:anywhere}.evidence a{color:#115890;display:inline-block;min-height:34px;padding:5px 0}.notice[hidden]{display:none}.coverage{background:#fff;border:1px solid #d9e2eb;border-radius:12px;padding:18px;margin:28px 0}.coverage h2{margin-top:0}.coverage summary{cursor:pointer;min-height:44px;padding:12px 4px;font-weight:750;color:#115890}.coverage summary:focus-visible{outline:3px solid #db9f19;outline-offset:3px}.state-list{grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:8px}.state-list li{padding:12px;border:1px solid #e3eaf2;border-radius:8px;display:flex;flex-direction:column;gap:5px}.state-name{font-weight:700}.state-scope{color:#526276;font-size:14px}a:focus-visible{outline:3px solid #db9f19;outline-offset:3px}.bottom{margin-top:24px}</style></head>'+
   '<body><header><nav aria-label="'+(en?"Navigation":"Navigation")+'">'+links+'</nav></header><main>'+
   '<h1>'+(en?"Demonstrations today":"Demonstrationen heute")+'</h1>'+
   '<p><strong>'+(en?"Date (Europe/Berlin): ":"Datum (Europe/Berlin): ")+current+'</strong></p><p class="notice">'+caveat+'</p>'+
   '<p class="notice" id="staleNotice" hidden role="status">'+(en?"This listing was generated for an earlier Berlin calendar day. Open the interactive calendar for current records.":"Diese Liste stammt von einem früheren Berliner Kalendertag. Für aktuelle Meldungen bitte den interaktiven Kalender öffnen.")+'</p>'+
   '<h2>'+(en?"Reported entries: ":"Gemeldete Einträge: ")+items.length+'</h2>'+
   '<p>'+(en?"Cities represented in these source records: ":"Städte mit Einträgen in diesen Quellen: ")+representedCities+'</p>'+
   (unique.size>items.length?'<p class="notice">'+(en?"Only 60 of "+unique.size+" distinct source records are shown; cities are sampled in balanced rounds. Open the interactive calendar for the full data.":"Nur 60 von "+unique.size+" verschiedenen Quelleneinträgen werden dargestellt; vertretene Städte werden bei der Auswahl ausgewogen berücksichtigt. Der interaktive Kalender enthält den gesamten Datenstand.")+'</p>':"")+
   (items.length?'<ul>'+nodes+'</ul>':'<p>'+empty+'</p>')+
   stateDisclosure+
   '<p class="bottom"><a href="'+(en?"/en/":"/")+'">'+(en?"Open interactive calendar and filters":"Interaktiven Kalender und Filter öffnen")+'</a></p>'+
   '<p><a href="'+(en?"/en/sources/":"/sources/")+'">'+(en?"Review source coverage for all 16 states":"Quellenabdeckung aller 16 Bundesländer prüfen")+'</a></p>'+
   '</main><script>(function(){const day=new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Berlin",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());if(day!=='+JSON.stringify(current)+')document.getElementById("staleNotice").hidden=false;})();</script></body></html>';
  mkdirSync(dir,{recursive:true});
  writeFileSync(dir+"/index.html",html);
 }
 return current;
}
const todayPageDate=buildTodayPages();
buildBerlin();

const alternate='<xhtml:link xmlns:xhtml="http://www.w3.org/1999/xhtml" rel="alternate" hreflang="de" href="'+origin+'/"/><xhtml:link xmlns:xhtml="http://www.w3.org/1999/xhtml" rel="alternate" hreflang="en" href="'+origin+'/en/"/>'+'<xhtml:link xmlns:xhtml="http://www.w3.org/1999/xhtml" rel="alternate" hreflang="x-default" href="'+origin+'/"/>';
const sourceAlternate='<xhtml:link xmlns:xhtml="http://www.w3.org/1999/xhtml" rel="alternate" hreflang="de" href="'+origin+'/sources/"/><xhtml:link xmlns:xhtml="http://www.w3.org/1999/xhtml" rel="alternate" hreflang="en" href="'+origin+'/en/sources/"/>'+'<xhtml:link xmlns:xhtml="http://www.w3.org/1999/xhtml" rel="alternate" hreflang="x-default" href="'+origin+'/sources/"/>';
const communityAlternate='<xhtml:link xmlns:xhtml="http://www.w3.org/1999/xhtml" rel="alternate" hreflang="de" href="'+origin+'/community/"/><xhtml:link xmlns:xhtml="http://www.w3.org/1999/xhtml" rel="alternate" hreflang="en" href="'+origin+'/en/community/"/>'+'<xhtml:link xmlns:xhtml="http://www.w3.org/1999/xhtml" rel="alternate" hreflang="x-default" href="'+origin+'/community/"/>';
const todayAlternate='<xhtml:link xmlns:xhtml="http://www.w3.org/1999/xhtml" rel="alternate" hreflang="de" href="'+origin+'/heute/"/><xhtml:link xmlns:xhtml="http://www.w3.org/1999/xhtml" rel="alternate" hreflang="en" href="'+origin+'/en/today/"/>'+'<xhtml:link xmlns:xhtml="http://www.w3.org/1999/xhtml" rel="alternate" hreflang="x-default" href="'+origin+'/heute/"/>';
const sourceUrls=[
 ["/",alternate],["/en/",alternate],["/community/",communityAlternate],["/en/community/",communityAlternate],
 ["/sources/",sourceAlternate],["/en/sources/",sourceAlternate],
 ["/heute/",todayAlternate],["/en/today/",todayAlternate],["/berlin/",""],["/partners/","<xhtml:link xmlns:xhtml=\"http://www.w3.org/1999/xhtml\" rel=\"alternate\" hreflang=\"de\" href=\"https://demoradar.pages.dev/partners/\"/><xhtml:link xmlns:xhtml=\"http://www.w3.org/1999/xhtml\" rel=\"alternate\" hreflang=\"en\" href=\"https://demoradar.pages.dev/en/partners/\"/><xhtml:link xmlns:xhtml=\"http://www.w3.org/1999/xhtml\" rel=\"alternate\" hreflang=\"x-default\" href=\"https://demoradar.pages.dev/partners/\"/>"],["/en/partners/","<xhtml:link xmlns:xhtml=\"http://www.w3.org/1999/xhtml\" rel=\"alternate\" hreflang=\"de\" href=\"https://demoradar.pages.dev/partners/\"/><xhtml:link xmlns:xhtml=\"http://www.w3.org/1999/xhtml\" rel=\"alternate\" hreflang=\"en\" href=\"https://demoradar.pages.dev/en/partners/\"/><xhtml:link xmlns:xhtml=\"http://www.w3.org/1999/xhtml\" rel=\"alternate\" hreflang=\"x-default\" href=\"https://demoradar.pages.dev/partners/\"/>"]
];
const sitemapLines=['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
 ...sourceUrls.map(([route,links])=>'<url><loc>'+origin+route+'</loc>'+links+'</url>'),'</urlset>',''];
writeFileSync("sitemap.xml",sitemapLines.join("\n"));
writeFileSync("robots.txt","User-agent: *\nAllow: /\nSitemap: "+origin+"/sitemap.xml\n");
console.log("Built German and English indexable routes and multilingual sitemap");

for(const [lang,dir] of [["de","partners"],["en","en/partners"]]){mkdirSync(dir,{recursive:true});writeFileSync(dir+"/index.html",partnerPages[lang]);}
