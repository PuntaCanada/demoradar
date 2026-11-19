(()=>{
"use strict";
const dictionary={
de:{
"header.subtitle":"Demonstrationen transparent entdecken","nav.calendar":"Kalender","nav.today":"Heute","nav.week":"Diese Woche",
"hero.eyebrow":"Unabhängig · Quellenbasiert · Offen","hero.title":"Was bewegt Deutschland?","hero.description":"Demonstrationen und Kundgebungen entdecken – unabhängig von der politischen Richtung.","hero.beta":"🇩🇪 Deutschland · Beta",
"jump.calendar":"Kalenderübersicht","jump.today":"Wichtig heute","jump.tomorrow":"Morgen wichtig","jump.week":"Diese Woche wichtig",
"calendar.eyebrow":"Die große Terminübersicht","calendar.title":"Demonstrationskalender Deutschland","calendar.description":"Alle verfügbaren Termine nach Datum, Bundesland, Thema und politischem Bezug durchsuchen.","calendar.jump":"Kalender ansehen ↓","calendar.subtitle":"Veranstaltungskalender",
"filter.search":"SUCHE","filter.region":"BUNDESLAND","filter.city":"STADT","filter.topic":"THEMA","filter.position":"POLITISCHER BEZUG","filter.searchPlaceholder":"Thema, Veranstalter oder Ort suchen …",
"filter.allRegions":"Alle Bundesländer","filter.allCities":"Alle Städte","filter.allTopics":"Alle Themen","filter.allPositions":"Alle Positionen","filter.unknown":"Andere / unbekannt",
"filter.migration":"Migration","filter.climate":"Klima & Umwelt","filter.peace":"Frieden & Krieg","filter.social":"Arbeit & Soziales","filter.democracy":"Demokratie","filter.other":"Sonstiges","filter.afd":"AfD organisiert","filter.antiAfd":"Gegen AfD","filter.antifa":"Antifaschistisch","filter.cdu":"CDU organisiert","filter.antiCdu":"Gegen CDU","state.Berlin":"Berlin","state.Brandenburg":"Brandenburg","state.Baden-Württemberg":"Baden-Württemberg","state.Bayern":"Bayern","state.Bremen":"Bremen","state.Hamburg":"Hamburg","state.Hessen":"Hessen","state.Mecklenburg-Vorpommern":"Mecklenburg-Vorpommern","state.Niedersachsen":"Niedersachsen","state.Nordrhein-Westfalen":"Nordrhein-Westfalen","state.Rheinland-Pfalz":"Rheinland-Pfalz","state.Saarland":"Saarland","state.Sachsen":"Sachsen","state.Sachsen-Anhalt":"Sachsen-Anhalt","state.Schleswig-Holstein":"Schleswig-Holstein","state.Thüringen":"Thüringen",
"view.calendar":"Kalender","view.list":"Liste","view.previous":"Vorheriger Monat","view.next":"Nächster Monat","view.monday":"MO","view.tuesday":"DI","view.wednesday":"MI","view.thursday":"DO","view.friday":"FR","view.saturday":"SA","view.sunday":"SO",
"intro.eyebrow":"Automatisch ausgewählte Meldungen","intro.title":"Aktuelle Demonstrationen im Überblick","intro.description":"Auswahl aus bisher angebundenen Quellen, keine politische Empfehlung.",
"today.eyebrow":"Tagesüberblick","today.title":"Wichtig heute","today.description":"Öffentliche Demonstrationen und Kundgebungen","tomorrow.eyebrow":"Ausblick","tomorrow.title":"Morgen wichtig","tomorrow.description":"Angekündigte Kundgebungen und Demonstrationen","week.eyebrow":"Die nächsten sieben Tage","week.title":"Diese Woche","week.description":"Kommende Veranstaltungen inklusive heute",
"today.explain":"Auswahl aus verfügbaren Quellen, keine redaktionelle Bewertung oder vollständige bundesweite Übersicht. Nachrichtensuchen sind keine bestätigten Berichte.",
"tomorrow.explain":"Auswahl nach verfügbaren Daten, keine politische Empfehlung und keine bestätigte Größenrangliste.",
"week.explain":"Auswahl aus angebundenen Quellen. Presseberichte werden nur bei ausreichend konkreter Übereinstimmung verlinkt.",
"stat.status":"DATENSTATUS","stat.statusValue":"Im Aufbau","stat.statusDesc":"Amtliche und öffentliche Datenquellen folgen","stat.coverage":"ABDECKUNG","stat.coverageValue":"Deutschland","stat.coverageDesc":"Später auf weitere Länder erweiterbar","stat.principle":"UNSER PRINZIP","stat.principleValue":"Quellen statt Gerüchte","stat.principleDesc":"Keine unbelegten politischen Zuordnungen",
"footer.project":"Unabhängiges Informationsprojekt","footer.beta":"Beta · Keine vollständige Versammlungsübersicht","floating.calendar":"Zum Kalender","floating.aria":"Zur Kalenderübersicht springen",
"common.loading":"Lade Termine …","common.loadingRecords":"Die Meldungen werden geladen …","common.ready":"Live-Daten werden vorbereitet",
"topic.climate":"Klima & Umwelt","topic.peace":"Frieden & Krieg","topic.social":"Arbeit & Soziales","topic.migration":"Migration","topic.democracy":"Demokratie","topic.other":"Sonstiges",
"calendar.count":"{count} gemeldete Veranstaltungen in diesem Monat","calendar.dayCount":"{count} Demo{suffix}","calendar.noMatches":"Keine passenden Termine gefunden","calendar.adjust":"Suche oder Filter anpassen. Die Abdeckung ist noch unvollständig.",
"calendar.back":"← Zurück zum Kalender","calendar.timeUnknown":"Zeit offen","calendar.officialSource":"Amtliche Quelle","calendar.source":"Quelle","calendar.notConfirmed":"gemeldet, nicht zwingend durchgeführt",
"feature.count":"{count} Meldungen","feature.empty":"Für diesen Zeitraum liegen in unseren bislang angebundenen Quellen keine Meldungen vor. Das ist keine vollständige Übersicht aller Demonstrationen.",
"feature.today":"Aktuelle und angekündigte Versammlungen","feature.tomorrow":"Angekündigte Versammlungen","feature.week":"Einschließlich heute",
"feature.registered":"angemeldet","feature.source":"Originalquelle","feature.newsSearch":"Nachrichten suchen","feature.candidate":"Möglicherweise zugehörige Presseartikel (automatisch, ungeprüft):","feature.candidateTitle":"Automatisch zugeordneter, redaktionell nicht geprüfter Artikel","feature.searchTitle":"Nachrichtensuche, keine bestätigten Berichte",
"source.summary":"Veranstaltungsdaten","source.officialCount":"{count} amtliche Meldungen","source.additionalCount":"{count} ergänzende Community-/Quellenmeldungen von","source.license":"(CC BY-SA 4.0).","source.dedup":"Überschneidungen wurden anhand von Datum, Stadt, Uhrzeit, Veranstaltungsort und Titel geprüft.","source.disclaimer":"Die Abdeckung bleibt unvollständig; gemeldet bedeutet nicht durchgeführt.","source.live":"Live-Daten","source.official":"{count} behördlich veröffentlichte Meldungen.","source.updated":"Letzte Datenaktualisierung: {updated}.","source.officialLabel":"Amtliche Versammlungsbehörden","source.mixed":"Amtliche Stellen + Demos Berlin e. V. (CC BY-SA 4.0)","source.status":"Weitere geprüfte Quellen: {sources}. Die Abdeckung bleibt unvollständig.","source.available":"abrufbar","source.waiting":"Website erreichbar, Import ausstehend","source.unavailable":"derzeit nicht erreichbar",
"event.route":"Route","event.organizer":"Anmelder/Organisation","event.participants":"Angemeldete Teilnehmer","event.official":"behördlich veröffentlicht (nicht zwingend durchgeführt)","event.community":"Community-/Quellenmeldung (nicht behördlich bestätigt)",
"page.title":"DemoRadar — Demonstrationen im Überblick","page.description":"DemoRadar – Demonstrationen, Kundgebungen und Proteste finden. Transparenter Kalender für Deutschland."
},
en:{
"header.subtitle":"Discover demonstrations and protests","nav.calendar":"Calendar","nav.today":"Today","nav.week":"This week",
"hero.eyebrow":"Independent · Source-based · Open","hero.title":"What's happening in Germany?","hero.description":"Explore demonstrations, rallies and protests across the political spectrum.","hero.beta":"🇩🇪 Germany · Beta",
"jump.calendar":"Demonstration calendar","jump.today":"Important today","jump.tomorrow":"Important tomorrow","jump.week":"Important this week",
"calendar.eyebrow":"Browse upcoming events","calendar.title":"Germany demonstration calendar","calendar.description":"Find available events by date, federal state, topic and political context.","calendar.jump":"View calendar ↓","calendar.subtitle":"Event calendar",
"filter.search":"SEARCH","filter.region":"FEDERAL STATE","filter.city":"CITY","filter.topic":"TOPIC","filter.position":"POLITICAL CONTEXT","filter.searchPlaceholder":"Search by topic, organiser or location …",
"filter.allRegions":"All federal states","filter.allCities":"All cities","filter.allTopics":"All topics","filter.allPositions":"All positions","filter.unknown":"Other / unknown",
"filter.migration":"Migration","filter.climate":"Climate & environment","filter.peace":"Peace & war","filter.social":"Work & society","filter.democracy":"Democracy","filter.other":"Other","filter.afd":"Organised by AfD","filter.antiAfd":"Opposing AfD","filter.antifa":"Anti-fascist","filter.cdu":"Organised by CDU","filter.antiCdu":"Opposing CDU","state.Berlin":"Berlin","state.Brandenburg":"Brandenburg","state.Baden-Württemberg":"Baden-Württemberg","state.Bayern":"Bavaria","state.Bremen":"Bremen","state.Hamburg":"Hamburg","state.Hessen":"Hesse","state.Mecklenburg-Vorpommern":"Mecklenburg-Western Pomerania","state.Niedersachsen":"Lower Saxony","state.Nordrhein-Westfalen":"North Rhine-Westphalia","state.Rheinland-Pfalz":"Rhineland-Palatinate","state.Saarland":"Saarland","state.Sachsen":"Saxony","state.Sachsen-Anhalt":"Saxony-Anhalt","state.Schleswig-Holstein":"Schleswig-Holstein","state.Thüringen":"Thuringia",
"view.calendar":"Calendar","view.list":"List","view.previous":"Previous month","view.next":"Next month","view.monday":"MON","view.tuesday":"TUE","view.wednesday":"WED","view.thursday":"THU","view.friday":"FRI","view.saturday":"SAT","view.sunday":"SUN",
"intro.eyebrow":"Automatically selected listings","intro.title":"Demonstrations at a glance","intro.description":"Selected from currently connected sources. No political endorsements.",
"today.eyebrow":"Daily overview","today.title":"Important today","today.description":"Public demonstrations and rallies","tomorrow.eyebrow":"Coming up","tomorrow.title":"Important tomorrow","tomorrow.description":"Announced demonstrations and rallies","week.eyebrow":"The next seven days","week.title":"This week","week.description":"Upcoming events, including today",
"today.explain":"Selected from available sources, not an editorial ranking or a complete nationwide listing. News searches are not confirmed coverage.",
"tomorrow.explain":"Selected from available data, not a political recommendation or verified ranking by crowd size.",
"week.explain":"Selected from connected sources. News articles are linked only when the subject and location match closely enough.",
"stat.status":"DATA STATUS","stat.statusValue":"Under development","stat.statusDesc":"Public and official data sources being connected","stat.coverage":"COVERAGE","stat.coverageValue":"Germany","stat.coverageDesc":"Other countries may be added later","stat.principle":"OUR APPROACH","stat.principleValue":"Sources, not rumours","stat.principleDesc":"No unsubstantiated political affiliations",
"footer.project":"Independent information project","footer.beta":"Beta · Not a complete list of demonstrations","floating.calendar":"Back to calendar","floating.aria":"Jump to the demonstration calendar",
"common.loading":"Loading events …","common.loadingRecords":"Loading event listings …","common.ready":"Live data is being prepared",
"topic.climate":"Climate & environment","topic.peace":"Peace & war","topic.social":"Work & society","topic.migration":"Migration","topic.democracy":"Democracy","topic.other":"Other",
"calendar.count":"{count} reported events this month","calendar.dayCount":"{count} event{suffix}","calendar.noMatches":"No matching events","calendar.adjust":"Adjust your search or filters. Coverage is still incomplete.",
"calendar.back":"← Back to calendar","calendar.timeUnknown":"Time unknown","calendar.officialSource":"Official source","calendar.source":"Source","calendar.notConfirmed":"reported, not necessarily held",
"feature.count":"{count} listings","feature.empty":"No listings are currently available from our connected sources for this period. This does not mean there are no demonstrations.",
"feature.today":"Current and announced demonstrations","feature.tomorrow":"Announced demonstrations","feature.week":"Including today",
"feature.registered":"registered","feature.source":"Original source","feature.newsSearch":"Search news","feature.candidate":"Possibly related news articles (automatically matched, not verified):","feature.candidateTitle":"Automatically matched article, not editorially verified","feature.searchTitle":"News search, not confirmed coverage",
"source.summary":"Event data","source.officialCount":"{count} official listings","source.additionalCount":"{count} additional community/source listings from","source.license":"(CC BY-SA 4.0).","source.dedup":"Possible duplicates were checked by date, city, time, location and title.","source.disclaimer":"Coverage is incomplete; a listing does not confirm an event took place.","source.live":"Live data","source.official":"{count} listings published by public authorities.","source.updated":"Last dataset update: {updated}.","source.officialLabel":"Public assembly authorities","source.mixed":"Public authorities + Demos Berlin e. V. (CC BY-SA 4.0)","source.status":"Other checked sources: {sources}. Coverage remains incomplete.","source.available":"available","source.waiting":"website available, import pending","source.unavailable":"currently unavailable",
"event.route":"Route","event.organizer":"Applicant/organiser","event.participants":"Registered participants","event.official":"published by authorities (not necessarily held)","event.community":"Community/source listing (not officially confirmed)",
"page.title":"DemoRadar — Demonstrations and protests in Germany","page.description":"DemoRadar: Browse demonstrations, rallies and protests in Germany. A source-based event calendar."
}
};
let language="de";
try{const saved=localStorage.getItem("demoradar-language");if(saved==="de"||saved==="en")language=saved;else if(!/^de\b/i.test(navigator.language||"de"))language="en"}catch{}
function t(key,params){let str=dictionary[language]?.[key]??dictionary.de[key]??key;for(const [k,v] of Object.entries(params||{}))str=str.replaceAll("{"+k+"}",String(v));return str}
function apply(){
 document.documentElement.lang=language;
 document.querySelectorAll("[data-i18n]").forEach(el=>el.textContent=t(el.dataset.i18n));
 document.querySelectorAll("[data-i18n-placeholder]").forEach(el=>el.setAttribute("placeholder",t(el.dataset.i18nPlaceholder)));
 document.querySelectorAll("[data-i18n-aria]").forEach(el=>el.setAttribute("aria-label",t(el.dataset.i18nAria)));
 document.title=t("page.title");
 const description=document.querySelector('meta[name="description"]');if(description)description.content=t("page.description");
 document.querySelectorAll("[data-language]").forEach(el=>{
  const active=el.dataset.language===language;
  el.setAttribute("aria-pressed",String(active));
  el.classList.toggle("active",active);
 });
}
function setLanguage(code){
 if(!dictionary[code]||code===language)return;
 language=code;try{localStorage.setItem("demoradar-language",code)}catch{}
 apply();document.dispatchEvent(new CustomEvent("demoradar:languagechange",{detail:{language:code}}));
}
window.DemoRadarI18n={t,setLanguage,apply,get language(){return language},get locale(){return language==="en"?"en-GB":"de-DE"}};
document.querySelectorAll("[data-language]").forEach(el=>el.addEventListener("click",()=>setLanguage(el.dataset.language)));
apply();
})();
