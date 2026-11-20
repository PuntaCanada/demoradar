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
const sourceKind=document.querySelector("#sourceKind");
const sourceSort=document.querySelector("#sourceSort");
const sourceReset=document.querySelector("#sourceReset");
let coverageReviewDay=null,states=[],quality=[],health=[],issues=[],monitors=[],reuseAudits=[],rejectedCandidates=[],sourceAlerts=[];
let initialized=false;
const render=()=>{
 if(!initialized)return;
 const phrase=(search.value||"").toLocaleLowerCase(en?"en":"de").trim(),choice=filter.value;
 const target=document.querySelector("#stateGrid");target.replaceChildren();
 const warningCount=state=>sourceAlerts.filter(a=>a.state===state.state||quality.some(s=>s.state===state.state&&s.city===a.city&&s.source===a.source)).length+
  quality.filter(s=>s.state===state.state&&(s.status==="unavailable"||daysSince(s.last_checked)===null||daysSince(s.last_checked)<0||daysSince(s.last_checked)>2)).length;
 const orderedStates=[...states].sort((a,b)=>sourceSort.value==="warnings"?warningCount(b)-warningCount(a)||a.state.localeCompare(b.state,"de"):a.state.localeCompare(b.state,"de"));
 let visible=0;
 for(const state of orderedStates){
  const entries=quality.filter(s=>s.state===state.state);
  const candidateSources=monitors.filter(s=>s.state===state.state);
  const stateAlerts=sourceAlerts.filter(a=>a.state===state.state||entries.some(s=>s.city===a.city&&s.source===a.source));
  const rejected=rejectedCandidates.filter(s=>s.state===state.state);
  const text=[state.state,state.scope,...entries.map(e=>[e.city,e.source,e.scope].join(" ")),...candidateSources.map(s=>[s.city,s.scope,s.type].join(" ")) ,...rejected.map(s=>[s.city,s.title,s.reason].join(" "))].join(" ").toLocaleLowerCase(en?"en":"de");
  const kind=sourceKind.value;
  const hasFeed=entries.some(isRolling);
  const hasOneOff=entries.some(s=>s.status==="verified_one_off");
  const hasUpcomingList=candidateSources.some(s=>s.type==="official_assembly_upcoming_html"&&Array.isArray(s.future_dates_verified)&&s.future_dates_verified.some(validDay));
  const hasArchive=entries.some(s=>s.status==="verified_historical_one_off")||candidateSources.some(s=>s.type==="official_police_historical_notice");
  const hasWarnings=warningCount(state)>0;
  const kindMatches=kind==="all"||
   kind==="feed"&&hasFeed||
   kind==="oneoff"&&hasOneOff||
   kind==="archive"&&hasArchive||
   kind==="upcoming"&&hasUpcomingList||
   kind==="warnings"&&hasWarnings||
   kind==="unverified"&&!hasFeed;
  if(!kindMatches||(choice!=="all"&&state.status!==choice)||(phrase&&!text.includes(phrase)))continue;
  visible++;
  const article=$("article","source-card");
  article.setAttribute("aria-label",state.state);
  const top=$("div","source-card-head");
  top.append($("h2","",state.state));
  const pill=$("span","source-chip "+(state.status==="no_confirmed_regular_feed"?"muted":"partial"),coverageText(state.status));
  top.append(pill);article.append(top);
  article.append($("p","source-scope",state.scope));
  const recent=new Set(entries.filter(x=>x.status==="observed_data"&&daysSince(x.last_checked)!==null&&daysSince(x.last_checked)>=0&&daysSince(x.last_checked)<=2).map(x=>x.city));
  const oneOff=new Set(entries.filter(x=>x.status==="verified_one_off"&&daysSince(x.last_checked)!==null&&daysSince(x.last_checked)>=0&&daysSince(x.last_checked)<=2).map(x=>x.city));
  const archive=new Set(entries.filter(x=>x.status==="verified_historical_one_off").map(x=>x.city));
  const outdated=entries.filter(x=>x.status==="unavailable"||daysSince(x.last_checked)===null||daysSince(x.last_checked)<0||daysSince(x.last_checked)>2).length;
  article.append($("p","source-detail",t("Aktuell geprüfte amtliche Ortsquellen: ","Recently checked official local-source cities: ")+recent.size+
   t(" · Orte mit aktuell geprüften Einzelmeldungen: "," · Cities with recently checked one-off notices: ")+oneOff.size+
   t(" · Orte mit Archivmeldungen: "," · Cities with historical notices: ")+archive.size+
   (outdated?t(" · Ausgefallene/veraltete Prüfungen: "," · Unavailable/outdated checks: ")+outdated:"")+
   t(" · keine landesweite Vollständigkeit"," · no full statewide coverage")));

  if(stateAlerts.length){
   const incidentCount=stateAlerts.filter(x=>x.condition==="unavailable"||x.condition==="monitor_unavailable").length;
   const researchCount=stateAlerts.filter(x=>x.condition.startsWith("monitor_")).length;
   article.append($("p","source-warning",
    t("Quellenhinweise: ","Source warnings: ")+stateAlerts.length+
    (incidentCount?t(" · nicht erreichbar: "," · unavailable: ")+incidentCount:"")+
    (researchCount?t(" · davon reine Recherche-Seiten: "," · research-only pages: ")+researchCount:"")+
    t(". Kein Nachweis über Absagen oder fehlende Demos.",". Not evidence of cancelled or missing demonstrations.")));
  }

  const assessmentAge=daysSince(coverageReviewDay);
  const assessmentDescription=assessmentAge===null||assessmentAge<0?
    t("Bundesweite Quelleninventur ohne gültiges Prüfdatum.","State source coverage audit has no valid review date."):
    assessmentAge>30?
    t("Bundesweite Quelleninventur "+assessmentAge+" Tage alt – Abdeckung erneut prüfen.","State source inventory is "+assessmentAge+" days old – recheck source coverage."):
    t("Quelleninventur geprüft am ","Coverage inventory reviewed on ")+fmt(coverageReviewDay);
  article.append($("p",assessmentAge===null||assessmentAge<0||assessmentAge>30?"source-warning":"source-detail",assessmentDescription));
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
    item.append($("p","source-warning",reuse.new_automated_import_allowed?t("Neue automatisierte Nutzung gesondert freigegeben.","New automated use separately approved."):t("Kein neuer automatischer Import freigegeben – Rechte und Format vor Aktivierung einzeln prüfen.","No new automated import approved – verify reuse rights and format before activation.")));
    item.append($("p","source-detail",t("Freigabeprüfung: ","Admission review: ")+fmt(reuse.reviewed_on)));
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
    el.append($("strong","",candidate.city+" · "+(candidate.type==="official_police_historical_notice"?t("Historischer Polizeibericht · kein Zukunftstermin","Historical police notice · not an upcoming event"):candidate.type==="official_assembly_upcoming_html"?t("Amtliche Zukunftsliste · Nachnutzung offen","Official future list · reuse rights pending"):t("Nur Beobachtung","Monitoring only"))));
    el.append($("p","source-detail",candidate.scope||""));
    const checkAge=daysSince(candidate.checked_on);
    const checked=checkAge===null?t("Letzte Prüfung nicht dokumentiert","Last check not documented"):checkAge<0?t("Ungültiges Prüfdatum","Invalid check date"):t("Zuletzt geprüft: ","Last checked: ")+fmt(candidate.checked_on)+(checkAge>2?t(" · Prüfung veraltet"," · check is outdated"):"");
    el.append($("p","source-detail",checked));
    if(checkAge===null||checkAge<0||checkAge>2)el.append($("p","source-warning",t("Erreichbarkeitsstatus nicht aktuell bestätigt","Reachability status not recently confirmed")));
    el.append($("p","source-detail",t("Nachnutzungsstatus: ","Reuse assessment: ")+(candidate.data_rights||t("Nicht bestätigt","Not verified"))));
    if(candidate.type==="official_police_historical_notice")el.append($("p","source-warning",t("Archivbeleg: keine automatische Terminübernahme und keine Aussage über zukünftige Demos.","Archive evidence: no automatic import and no statement about upcoming demonstrations.")));
    if(candidate.type==="official_assembly_upcoming_html"){
     const verified=Array.isArray(candidate.future_dates_verified)?candidate.future_dates_verified.filter(validDay):[];
     el.append($("p","source-detail",t("Amtliche Zukunftsterminliste · belegte Veranstaltungstage: ","Official upcoming-assembly list · evidenced event dates: ")+verified.length));
     if(verified.length)el.append($("p","source-detail",verified.map(fmt).join(" · ")));
     el.append($("p","source-warning",t("Keine bestätigte offene Bulk-Nachnutzungslizenz: Originaltermine bitte beim Amt nachsehen; kein automatischer Eventimport.","No verified open bulk reuse licence: consult the original schedule; no automatic event import.")));
    }
    if(Array.isArray(candidate.date_conflicts)&&candidate.date_conflicts.length)el.append($("p","source-warning",t("Datum/Wochentag-Konflikte: ","Date/weekday inconsistencies: ")+candidate.date_conflicts.join("; ")+t(" · keine automatische Korrektur."," · no automatic correction.")));
    if(candidate.documented_date_discrepancy){
     const d=candidate.documented_date_discrepancy;
     el.append($("p","source-warning",t("Amtlich dokumentierter Datumswiderspruch (belegt am ","Official documented date discrepancy (evidenced on ")+fmt(d.observed_on)+"): "+d.published_weekday+", "+fmt(d.published_date)+" ≠ "+d.actual_weekday+
      (d.reproduced_in_latest_fetch?t(" · beim letzten Abruf erneut erkannt."," · reproduced in latest fetch."):t(" · beim letzten Abruf nicht erneut erkannt; historischer Beleg bleibt bestehen."," · not reproduced in latest fetch; past evidence retained."))));
    }


    const monitoringMessage={
      unavailable:t("HTTP 404/410 oder bestätigter Ausfall beim letzten Abruf – kein Beweis für abgesagte Demos.","HTTP 404/410 or observed retrieval failure – not evidence of cancellations."),
      http_restricted:t("HTTP-Zugriff eingeschränkt (401/403/429) – kein Beweis, dass die Seite gelöscht ist.","HTTP access restricted (401/403/429) – does not mean the page was deleted."),
      transport_unverified:t("Netzwerk-/Verbindungsfehler; Erreichbarkeit ungeklärt. Original-Link bleibt erhalten.","Network/connection error; reachability inconclusive. Original link retained."),
      content_unverified:t("Inhaltsstruktur nicht bestätigt; möglicherweise geänderte Quellenseite.","Source contents could not be validated; structure may have changed.")
    }[candidate.status];
    if(monitoringMessage)el.append($("p","source-warning",monitoringMessage));
    if(/^https:\/\//.test(candidate.url||"")){
     const a=$("a","source-link",t("Amtliche Recherchequelle öffnen","Open official research source"));
     a.href=candidate.url;a.target="_blank";a.rel="noopener noreferrer";el.append(a);
    }
    details.append(el);
   }
   article.append(details);
  }
  if(rejected.length){
   const details=$("details","source-candidates");
   details.append($("summary","",t("Geprüfte, ausgeschlossene amtliche Datensätze ("+rejected.length+")","Audited official datasets excluded from imports ("+rejected.length+")")));
   details.append($("p","source-empty",t("Offene Lizenz allein reicht nicht: Diese Datensätze enthalten keine nachweislichen Demotermine.","An open licence alone is insufficient: these datasets do not provide evidenced protest dates.")));
   for(const record of rejected){
    const el=$("div","source-item");
    el.append($("strong","",record.title));
    el.append($("p","source-detail",t("Format: ","Format: ")+record.format+" · "+t("Lizenz: ","Licence: ")+record.rights));
    el.append($("p","source-warning",t("Kein Import: ","Not imported: ")+record.reason));
    if(/^https:\/\//.test(record.url||"")){
     const a=$("a","source-link",t("Amtlichen Datensatz ansehen","View official dataset"));a.href=record.url;a.target="_blank";a.rel="noopener noreferrer";el.append(a);
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
 document.querySelector("#sourceResults").textContent=t(visible+" von 16 Bundesländern angezeigt","Showing "+visible+" of 16 federal states");
 sourceReset.disabled=!search.value&&filter.value==="all"&&sourceKind.value==="all"&&sourceSort.value==="name";
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
 load("/data/source-reuse-audit.json"),
 load("/data/rejected-official-candidates.json"),
 load("/data/source-health-alerts.json")
]).then(([coverage,data,format,expansion,reuse,rejections,alertReport])=>{
 if(coverage.version!==1||coverage.states?.length!==16||!Array.isArray(data.sources)||!Array.isArray(format.feeds))throw Error("Unexpected source schema");
 const keys=new Set(coverage.states.map(s=>s.state));
 if(keys.size!==16)throw Error("Duplicate or incomplete state coverage");
 if(reuse.version!==1||!Array.isArray(reuse.feeds))throw Error("Unexpected source reuse audit schema");
 if(rejections.version!==1||!Array.isArray(rejections.candidates))throw Error("Unexpected official candidate assessment schema");
 if(alertReport.version!==1||!Array.isArray(alertReport.alerts))throw Error("Unexpected official source alerts schema");
 sourceAlerts=alertReport.alerts.filter(a=>typeof a.condition==="string"&&typeof a.city==="string");
 rejectedCandidates=rejections.candidates.filter(x=>x.recurring_demo_dates===false&&x.decision?.startsWith("rejected_"));
 reuseAudits=reuse.feeds;
 coverageReviewDay=coverage.reviewed_on;
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
// Channel discovery is a read-only directory. Never merge a channel identity
// or platform-level LIVE state into the public event-stream approval registry.
Promise.all([load("/data/streamer-candidates.json"),load("/data/stream-discoveries.json"),load("/data/live-streams.json")])
 .then(([directory,discoveries,approved])=>{
  if(directory.schema_version!==1||!Array.isArray(directory.channels)||!Array.isArray(discoveries.candidates)||!Array.isArray(approved.streams))throw Error("Invalid streamer directory schema");
  const list=document.querySelector("#streamDirectory");
  const known=directory.channels.filter(c=>c&&typeof c.name==="string"&&Array.isArray(c.platforms));
  const monitored=known.filter(c=>c.monitoring==="automatic_candidate_only").length;
  const approvedEvents=approved.streams.filter(s=>s.reviewed===true&&s.event_id&&s.evidence_url).length;
  document.querySelector("#streamSummary").textContent=t(
   known.length+" Kanalkandidaten · "+monitored+" zur automatischen Kandidatensuche vorgesehen · "+approvedEvents+" gesondert geprüfte Event-Verweise im Register. Keine LIVE-Behauptung.",
   known.length+" channel candidates · "+monitored+" enabled for automatic candidate discovery · "+approvedEvents+" separately reviewed event links in the registry. No LIVE claim."
  );
  list.replaceChildren();
  for(const channel of known){
   const card=$("article","source-card stream-directory-card");
   card.append($("h3","",channel.name));
   card.append($("p","source-detail",channel.monitoring==="automatic_candidate_only"?
    t("Automatische Kandidatensuche (keine Eventfreigabe)","Automated candidate discovery (not event approval)"):
    t("Keine automatische Kanalüberwachung","Channel monitoring not enabled")));
   const links=$("div","stream-directory-links");
   for(const platform of channel.platforms){
    let url;try{url=new URL(platform.url)}catch{continue}
    const hostname=url.hostname.toLowerCase();
    const allowed=platform.platform==="youtube"&&["youtube.com","www.youtube.com"].includes(hostname)||
     platform.platform==="twitch"&&["twitch.tv","www.twitch.tv"].includes(hostname);
    if(!allowed||url.protocol!=="https:"||url.username||url.password||url.port||url.search||url.hash)continue;
    const link=$("a","source-link",platform.platform==="youtube"?"YouTube":"Twitch");
    link.href=url.href;link.target="_blank";link.rel="noopener noreferrer";links.append(link);
   }
   if(!links.childElementCount)card.append($("p","source-empty",t("Kein bestätigter YouTube-/Twitch-Kanal-Link hinterlegt.","No supported YouTube/Twitch channel URL on record.")));
   else card.append(links);
   list.append(card);
  }
 }).catch(()=>{
  document.querySelector("#streamSummary").textContent=t("Kanaldaten derzeit nicht abrufbar; keine LIVE-Aussage.","Channel directory unavailable; no LIVE status implied.");
 });

filter.addEventListener("change",render);search.addEventListener("input",render);
sourceKind.addEventListener("change",render);sourceSort.addEventListener("change",render);
sourceReset.addEventListener("click",()=>{search.value="";filter.value="all";sourceKind.value="all";sourceSort.value="name";render();search.focus()});
})();