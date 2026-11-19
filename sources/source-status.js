(()=>{"use strict";
const root=document.querySelector("[data-sources-root]");if(!root)return;
const en=document.documentElement.lang==="en";
const t=(de,english)=>en?english:de;
const fmt=date=>/^20\d{2}-\d\d-\d\d$/.test(String(date||""))?new Intl.DateTimeFormat(en?"en-GB":"de-DE",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"UTC"}).format(new Date(date+"T12:00:00Z")):t("Nicht bekannt","Unknown");
const validDay=date=>/^20\d{2}-\d\d-\d\d$/.test(String(date||""))&&Number.isFinite(Date.parse(date+"T12:00:00Z"))&&new Date(date+"T12:00:00Z").toISOString().slice(0,10)===date;
const daysSince=date=>validDay(date)?Math.floor((Date.now()-new Date(date+"T00:00:00Z").getTime())/86400000):null;
const $=(tag,className,txt)=>{const node=document.createElement(tag);if(className)node.className=className;if(txt!==undefined)node.textContent=txt;return node};
const statusText=status=>({
 observed_data:t("Amtliche Daten geliefert","Official data returned"),
 verified_one_off:t("Amtliche Einzelmeldung","Official one-off notice"),
 verified_historical_one_off:t("Historische Einzelmeldung","Historical one-off notice"),
 no_matching_items:t("Keine passenden Einträge","No matching items"),
 unavailable:t("Quelle derzeit nicht erreichbar","Source unavailable"),
 unknown:t("Prüfstatus unbekannt","Status unknown")
})[status]||t("Unbekannt","Unknown");
const coverageText=status=>({
 regional_partial:t("Amtliche Orts-/Teilquelle","Official city/partial source"),
 local_partial:t("Einzelne lokale Quellen","Individual local sources"),
 no_confirmed_regular_feed:t("Kein regelmäßiger Feed bestätigt","No regular feed confirmed")
})[status]||t("Nicht eingestuft","Not assessed");
const classification=s=>{
 const diff=daysSince(s.last_checked);
 if(s.status==="unavailable")return "warning";
 if(diff===null||diff<0)return "muted";
 if(diff>2)return "warning";
 if(s.status==="observed_data")return "good";
 return "muted";
};
const filter=document.querySelector("#sourceFilter");
const search=document.querySelector("#sourceSearch");
let states=[],quality=[],health=[],issues=[];
let initialized=false;
const render=()=>{
 if(!initialized)return;
 const phrase=(search.value||"").toLocaleLowerCase(en?"en":"de").trim(),choice=filter.value;
 const target=document.querySelector("#stateGrid");target.replaceChildren();
 let visible=0;
 for(const state of states){
  const entries=quality.filter(s=>s.state===state.state);
  const text=[state.state,state.scope,...entries.map(e=>[e.city,e.source,e.scope].join(" "))].join(" ").toLocaleLowerCase(en?"en":"de");
  if((choice!=="all"&&state.status!==choice)||(phrase&&!text.includes(phrase)))continue;
  visible++;
  const article=$("article","source-card");
  article.setAttribute("aria-label",state.state);
  const top=$("div","source-card-head");
  top.append($("h2","",state.state));
  const pill=$("span","source-chip "+(state.status==="no_confirmed_regular_feed"?"muted":"partial"),coverageText(state.status));
  top.append(pill);article.append(top);
  article.append($("p","source-scope",state.scope));
  const list=$("div","source-list");
  if(!entries.length)list.append($("p","source-empty",t("Keine konkret geprüfte Importquelle für dieses Bundesland aufgeführt. Das bedeutet nicht, dass dort keine Demos stattfinden.","No specifically audited importer listed for this state. This does not mean there are no demonstrations.")));
  for(const s of entries){
   const item=$("div","source-item");
   const heading=$("div","source-item-head");heading.append($("strong","",s.source));
   heading.append($("span","source-chip "+classification(s),statusText(s.status)));
   item.append(heading);
   item.append($("p","source-detail",s.city+" · "+t("Letzte belegte Prüfung: ","Last evidenced check: ")+fmt(s.last_checked)));
   if(s.status==="observed_data"&&Number.isInteger(s.count))item.append($("p","source-detail",t("Beim Abruf gelieferte Einträge: ","Items in last fetch: ")+s.count.toLocaleString(en?"en-GB":"de-DE")));
   const affected=health.filter(h=>h.city===s.city&&h.source===s.source);
   for(const h of affected)for(const issue of h.issues||[]){
    if(!["format_change_suspected","large_count_drop","unexpected_empty","invalid_count","unavailable","not_checked_today"].includes(issue))continue;
    const issueNames={format_change_suspected:t("Mögliche Strukturänderung","Possible format change"),large_count_drop:t("Auffälliger Datenrückgang","Unusual drop in records"),unexpected_empty:t("Unerwartet leere Quelle","Unexpectedly empty source"),invalid_count:t("Ungültige Mengenauskunft","Invalid count"),unavailable:t("Quelle nicht verfügbar","Unavailable source"),not_checked_today:t("Heute noch nicht geprüft","Not checked today")};
    item.append($("p","source-warning",issueNames[issue]));
   }
   list.append(item);
  }
  article.append(list);
  if(state.url&&/^https:\/\//.test(state.url)){
   const link=$("a","source-link",t("Offizielle Quelle öffnen","Open official source"));link.href=state.url;link.target="_blank";link.rel="noopener noreferrer";article.append(link);
  }
  target.append(article);
 }
 document.querySelector("#sourceResults").textContent=t(visible+" von 16 Bundesländern",""+visible+" of 16 federal states");
 if(!visible)target.append($("p","source-empty",t("Keine Treffer für diese Auswahl.","No matches for this selection.")));
};
const load=async path=>{
 const response=await fetch(path,{cache:"no-store"});
 if(!response.ok)throw Error("HTTP "+response.status+" "+path);
 return response.json();
};
Promise.all([
 load("/data/state-source-coverage.json"),
 load("/data/source-quality.json"),
 load("/data/source-format-health.json")
]).then(([coverage,data,format])=>{
 if(coverage.version!==1||coverage.states?.length!==16||!Array.isArray(data.sources)||!Array.isArray(format.feeds))throw Error("Unexpected source schema");
 const keys=new Set(coverage.states.map(s=>s.state));
 if(keys.size!==16)throw Error("Duplicate or incomplete state coverage");
 states=coverage.states;quality=data.sources;health=format.feeds;
 const latest=quality.map(s=>s.last_checked).filter(validDay).sort().at(-1);
 document.querySelector("#lastCheck").textContent=t("Letzte belegte Quellenprüfung: ","Last evidenced source check: ")+fmt(latest);
 document.querySelector("#feedCount").textContent=String(health.length);
 document.querySelector("#partialCount").textContent=String(states.filter(s=>s.status!=="no_confirmed_regular_feed").length);
 document.querySelector("#reviewedCount").textContent=String(quality.length);
 initialized=true;render();
}).catch(err=>{
 document.querySelector("#sourceResults").textContent=t("Quellenstatus derzeit nicht abrufbar.","Source status is currently unavailable.");
 document.querySelector("#stateGrid").replaceChildren($("p","source-warning",t("Die amtlichen Daten können vorübergehend nicht geladen werden. Ausfall der Anzeige bedeutet nicht, dass keine Versammlungen stattfinden.","The source report could not be loaded. This does not imply there are no demonstrations.")));
 console.warn("Official source dashboard unavailable",err);
});
filter.addEventListener("change",render);search.addEventListener("input",render);
})();