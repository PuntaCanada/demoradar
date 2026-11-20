(()=>{"use strict";
const root=document.querySelector("[data-sources-root]");if(!root)return;
const en=document.documentElement.lang==="en";
const t=(de,english)=>en?english:de;
const fmt=date=>/^20\d{2}-\d\d-\d\d$/.test(String(date||""))?new Intl.DateTimeFormat(en?"en-GB":"de-DE",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"UTC"}).format(new Date(date+"T12:00:00Z")):t("Nicht bekannt","Unknown");
const validDay=date=>/^20\d{2}-\d\d-\d\d$/.test(String(date||""))&&Number.isFinite(Date.parse(date+"T12:00:00Z"))&&new Date(date+"T12:00:00Z").toISOString().slice(0,10)===date;
const daysSince=date=>{if(!validDay(date))return null;const berlinDay=new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Berlin",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());return Math.round((Date.parse(berlinDay+"T12:00:00Z")-Date.parse(date+"T12:00:00Z"))/86400000)};
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
const freshnessDescription=s=>{
 const age=daysSince(s.last_checked);
 if(age===null)return t("Kein überprüfbares Prüfdatum vorhanden; Status nicht als aktuell interpretieren.","No verifiable check date; do not interpret this status as current.");
 if(age<0)return t("Prüfdatum liegt in der Zukunft; Zeitangabe prüfen.","Check date is in the future; verify the timestamp.");
 if(age===0)return t("Heute geprüft (Kalendertag, nicht Live-Status).","Checked today (calendar day, not live status).");
 if(age<=2)return t("Vor "+age+" Tag(en) geprüft; keine Live-Garantie.","Checked "+age+" day(s) ago; not a live guarantee.");
 return t("Prüfung "+age+" Tage alt; Quelle erneut kontrollieren.","Check is "+age+" days old; source needs rechecking.");
};
const isRolling=s=>s.status==="observed_data"&&["Polizei Berlin","Stadt Dresden","Stadt Rostock"].includes(s.source);
const filter=document.querySelector("#sourceFilter");
const search=document.querySelector("#sourceSearch");
let states=[],quality=[],health=[],issues=[],monitors=[],reuseAudits=[];
let initialized=false;
const render=()=>{
 if(!initialized)return;
 const phrase=(search.value||"").toLocaleLowerCase(en?"en":"de").trim(),choice=filter.value;
 const target=document.querySelector("#stateGrid");target.replaceChildren();
 let visible=0;
 for(const state of states){
  const entries=quality.filter(s=>s.state===state.state);
  const candidateSources=monitors.filter(s=>s.state===state.state);
  const text=[state.state,state.scope,...entries.map(e=>[e.city,e.source,e.scope].join(" ")),...candidateSources.map(s=>[s.city,s.scope,s.type].join(" "))].join(" ").toLocaleLowerCase(en?"en":"de");
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
   item.append($("p","source-detail",freshnessDescription(s)));
   item.append($("p","source-detail",t("Quellentyp: ","Source type: ")+(isRolling(s)?t("regelmäßig beobachteter Terminfeed","monitored recurring event feed"):s.status==="verified_historical_one_off"?t("historische Einzelmeldung (kein aktueller Feed)","historical one-off (not a current feed)"):s.status==="verified_one_off"?t("amtliche Einzelmeldung (kein regelmäßiger Feed)","official one-off notice (not a recurring feed)"):t("kein bestätigter regelmäßiger Terminfeed","no confirmed recurring event feed"))));
   item.append($("p","source-scope",s.scope||t("Reichweite nicht dokumentiert","Scope not documented")));
   const reuse=reuseAudits.find(a=>a.source===s.source&&a.state===s.state);
   if(reuse){
    item.append($("p","source-detail",t("Technisches Format: ","Technical format: ")+reuse.format));
    item.append($("p","source-warning",reuse.classification==="restricted_metadata"?
      t("Nachnutzung laut amtlichem Metadatensatz eingeschränkt oder nicht offen bestätigt.","Official metadata marks reuse as restricted or not confirmed open."):
      t("Keine eindeutige offene Nachnutzungslizenz für diese Quelle bestätigt.","No unambiguous open reuse licence confirmed for this source.")));
    item.append($("p","source-detail",t("Beleg: ","Evidence: ")+reuse.evidence));
    const link=$("a","source-link",t("Amtliche Lizenz-/Quellenangaben prüfen","Review official licence/source details"));
    link.href=reuse.source_url;link.target="_blank";link.rel="noopener noreferrer";item.append(link);
   }
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
  if(candidateSources.length){
   const details=$("details","source-candidates");
   const summary=$("summary","",t("Weitere amtliche Seiten in Beobachtung ("+candidateSources.length+")","Additional official pages under review ("+candidateSources.length+")"));
   details.append(summary);
   details.append($("p","source-empty",t("Nur Recherche: erreichbar bedeutet weder Terminfeed noch Nachnutzungserlaubnis. Hieraus werden keine Termine erzeugt.","Research only: reachability proves neither an event feed nor a reuse licence. No events are generated from these links.")));
   for(const candidate of candidateSources){
    const el=$("div","source-item");
    el.append($("strong","",candidate.city+" · "+t("Nur Beobachtung","Monitoring only")));
    el.append($("p","source-detail",candidate.scope||""));
    const checkAge=daysSince(candidate.checked_on);
    const checked=checkAge===null?t("Letzte Prüfung nicht dokumentiert","Last check not documented"):checkAge<0?t("Ungültiges Prüfdatum","Invalid check date"):t("Zuletzt geprüft: ","Last checked: ")+fmt(candidate.checked_on)+(checkAge>2?t(" · Prüfung veraltet"," · check is outdated"):"");
    el.append($("p","source-detail",checked));
    if(checkAge===null||checkAge<0||checkAge>2)el.append($("p","source-warning",t("Erreichbarkeitsstatus nicht aktuell bestätigt","Reachability status not recently confirmed")));
    el.append($("p","source-detail",t("Nachnutzungsstatus: ","Reuse assessment: ")+(candidate.data_rights||t("Nicht bestätigt","Not verified"))));
    if(candidate.status==="unavailable")el.append($("p","source-warning",t("Bei der letzten automatischen Prüfung nicht erreichbar","Unavailable during last automated check")));
    if(/^https:\/\//.test(candidate.url||"")){
     const a=$("a","source-link",t("Amtliche Recherchequelle öffnen","Open official research source"));
     a.href=candidate.url;a.target="_blank";a.rel="noopener noreferrer";el.append(a);
    }
    details.append(el);
   }
   article.append(details);
  }
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
 load("/data/source-format-health.json"),
 load("/data/expansion-sources.json").catch(()=>({sources:[]})),
 load("/data/source-reuse-audit.json")
]).then(([coverage,data,format,expansion,reuse])=>{
 if(coverage.version!==1||coverage.states?.length!==16||!Array.isArray(data.sources)||!Array.isArray(format.feeds))throw Error("Unexpected source schema");
 const keys=new Set(coverage.states.map(s=>s.state));
 if(keys.size!==16)throw Error("Duplicate or incomplete state coverage");
 if(reuse.version!==1||!Array.isArray(reuse.feeds))throw Error("Unexpected source reuse audit schema");
 reuseAudits=reuse.feeds;
 states=coverage.states;quality=data.sources;health=format.feeds;monitors=Array.isArray(expansion.sources)?expansion.sources.filter(s=>coverage.states.some(x=>x.state===s.state)&&typeof s.url==="string"):[];
 const latest=quality.map(s=>s.last_checked).filter(validDay).sort().at(-1);
 document.querySelector("#lastCheck").textContent=t("Letzte belegte Quellenprüfung: ","Last evidenced source check: ")+fmt(latest);
 const stale=quality.filter(s=>{const d=daysSince(s.last_checked);return d===null||d<0||d>2}).length;
 document.querySelector("#lastCheck").textContent+=" · "+t(stale+" von "+quality.length+" Importquellen ohne Prüfung in den letzten 48–72 Stunden (Kalendertage).",stale+" of "+quality.length+" import sources without a check in the last 2 calendar days.")+" "+t("Prüfdatum ist nicht Veranstaltungsdatum und keine LIVE-Bestätigung.","Check date is not event date and not confirmation of LIVE status.");
 document.querySelector("#feedCount").textContent=String(quality.filter(isRolling).length);
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