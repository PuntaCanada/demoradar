#!/usr/bin/env python3
"""Read-only source discovery monitor for undercovered federal states.
Reachability is NOT event availability, licensing permission, or completeness.
No speculative events are generated and no page text is republished.
"""
import json
from datetime import datetime, timezone
import urllib.error
import urllib.request
from pathlib import Path

OUTPUT=Path("data/expansion-sources.json")
SOURCES=[
 {"city":"Magdeburg","state":"Sachsen-Anhalt","type":"official_police_historical_notice","url":"https://polizei.sachsen-anhalt.de/das-sind-wir/presse/pi-magdeburg?tx_tsarssinclude_pi1%5Baction%5D=single&tx_tsarssinclude_pi1%5Bcontroller%5D=Base&tx_tsarssinclude_pi1%5Buid%5D=681821","parser":None,"data_rights":"Single police after-action report, no verified open event-data reuse licence; retain as original link only","scope":"Official police retrospective report from 4 September 2026 about assemblies in Magdeburg; not a future calendar or RSS/API event feed"},
 {"city":"Halle (Saale)","state":"Sachsen-Anhalt","type":"official_police_historical_notice","url":"https://polizei.sachsen-anhalt.de/bs/pressemitteilungen/polizei?tx_tsarssinclude_pi1%5Baction%5D=single&tx_tsarssinclude_pi1%5Bcontroller%5D=Base&tx_tsarssinclude_pi1%5Buid%5D=695807","parser":None,"data_rights":"Single police after-action report, no verified open event-data reuse licence; retain as original link only","scope":"Official police retrospective notice about November 2026 assemblies in Halle (Saale); dates must not be interpreted as upcoming"},
 {"city":"Schwerin","state":"Mecklenburg-Vorpommern","type":"official_assembly_authority_guidance","url":"https://www.schwerin.de/mein-schwerin/leben/ordnung-sicherheit-verkehr/ordnung-sicherheit/Versammlungsbehoerde/index.html","parser":None,"data_rights":"Official registration and authority information, not a public event calendar or a licence for event data reuse; monitor only","scope":"Schwerin municipal assembly registration service; no recurring event list or licensed data format confirmed"},
 {"city":"Kreis Unna","state":"Nordrhein-Westfalen","type":"official_assembly_authority_guidance","url":"https://www.kreis-unna.de/Serviceportal/Dienstleistungen/Darstellung-Dienstleistungen/Versammlungen.php?FID=3674.777.1&ModID=10&k_sub=1&kat=3674.43.1","parser":None,"data_rights":"Authority guidance only, no licensed machine-readable demonstration data feed; monitor only","scope":"Kreis Unna police jurisdiction and registration details, not a published event register"},
 {"city":"Rheinland-Pfalz","state":"Rheinland-Pfalz","type":"official_police_assembly_guidance","url":"https://www.polizei.rlp.de/service/gesetze-und-regelungen/demofibel","parser":None,"data_rights":"Official police explanatory material; no upcoming event data and no reuse permission for a database; link only","scope":"State police practical information on demonstration law; no confirmed regular assembly calendar"},
 {"city":"Schleswig-Holstein","state":"Schleswig-Holstein","type":"official_assembly_online_service","url":"https://shop-digitales.schleswig-holstein.de/Alle-Onlinedienste/","parser":None,"data_rights":"Official online registration service listing; not an open event feed and no event-data reuse permission; monitor only","scope":"State online service directory includes registering an assembly; no published calendar confirmed"},
 {"city":"Landsberg am Lech","state":"Bayern","type":"official_assembly_list_html","url":"https://www.landkreis-landsberg.de/versammlungen/","parser":None,"data_rights":"Published under Art. 13 BayVersG; factual listings are public but no verified open bulk reuse licence or maintained structured API; monitor and link only until rights and individual-date validation are confirmed","scope":"Landkreis Landsberg am Lech official HTML table of notified assemblies; can include recurring series and internally inconsistent weekday/date; not an automated import"},
 {"city":"Potsdam","state":"Brandenburg","type":"official_assembly_guidance","url":"https://www.potsdam.de/de/informationen-fuer-veranstalter","parser":None,"data_rights":"Assembly application guidance only; no current event data feed or reuse licence verified; monitor only","scope":"Potsdam points organizers to Brandenburg police; no published event list verified"},
 {"city":"Karlsruhe","state":"Baden-Württemberg","type":"official_city_press","url":"https://www.karlsruhe.de/stadt-rathaus/aktuelles/meldungen/versammlung-system-change-camp-2026-in-der-guenther-klotz-anlage","parser":None,"data_rights":"Individual city press notice, no recurring feed or blanket reuse permission; link only","scope":"Historical official notice from 2026; do not infer future scheduled assemblies"},
 {"city":"Braunschweig","state":"Niedersachsen","type":"official_consented_assembly_list","url":"https://www.braunschweig.de/politik_verwaltung/bekanntmachungen/versammlungen/index.php","parser":None,"data_rights":"Only assemblies whose applicants consent to publication; no explicit blanket reuse licence found; monitor only","scope":"Official list is conditional on publication consent and was empty in the verified 19 Nov 2026 snapshot"},
 {"city":"Köln","state":"Nordrhein-Westfalen","type":"official_city_traffic_calendar","url":"https://www.stadt-koeln.de/leben-in-koeln/verkehr/verkehrskalender/index.html","parser":"scripts/update-cologne.py","data_rights":"Only factual event details with original source and attribution; blanket open reuse licence for HTML not confirmed","scope":"Selected traffic-relevant demonstrations, not all registered assemblies"},
 {"city":"Nürnberg","state":"Bayern","type":"official_city_press","url":"https://www.nuernberg.de/presse/mitteilungen/","parser":None,"data_rights":"Press release reuse permission not verified; monitoring and linking only","scope":"Occasional ahead-of-time official protest notices, no complete public assembly list"},
 {"city":"Leipzig","state":"Sachsen","type":"official_police_press","url":"https://www.polizei.sachsen.de/de/42797.htm","parser":None,"data_rights":"No verified bulk reuse licence for press texts; monitoring and linking only","scope":"Event- and operation-specific police information, not complete calendar"},
 {"city":"Frankfurt am Main","state":"Hessen","type":"official_city_press","url":"https://frankfurt.de/de-de/aktuelle-meldung/meldungen/mehrere-versammlungen-angemeldet/","parser":None,"data_rights":"No verified bulk republication licence; official fact notices linked only","scope":"Detailed verified one-off municipal notice for 20 November 2026, not a rolling list"},
 {"city":"Leipzig","state":"Sachsen","type":"official_open_data_research","url":"https://opendata.leipzig.de/showcase/rallymap","parser":None,"data_rights":"A 2023 hackathon showcase, not a licensed current rolling event feed; monitoring only","scope":"Project goal mentions future open data; does not establish a 2026 import source"},
 {"city":"Dortmund","state":"Nordrhein-Westfalen","type":"official_municipal_publications","url":"https://www.dortmund.de/rathaus/publikationen/","parser":None,"data_rights":"Municipal notices are not automatically licensed as a current protest database; monitoring only","scope":"Official publications, no verified complete assembly calendar"},
 {"city":"Düsseldorf","state":"Nordrhein-Westfalen","type":"official_police_assembly_authority","url":"https://www.duesseldorf.de/veranstaltungsmanagement","parser":None,"data_rights":"Official city states demonstration/assembly authority belongs to police; not an event feed and no blanket licence","scope":"Authority-routing reference, not a calendar; check Polizeipräsidium Düsseldorf for a publicly reusable current data feed"},
 {"city":"Hamburg","state":"Hamburg","type":"official_police_assembly_authority","url":"https://www.polizei.hamburg/versammlungsbehoerde-kontakt-791244","parser":None,"data_rights":"Official authority contact and application guidance, not an event feed or reuse permission","scope":"Contact route to official assembly authority; do not import registrations without permission"},
 {"city":"Hamburg","state":"Hamburg","type":"official_police_operational_notice","url":"https://www.polizei.hamburg/polizeilicher-einsatzraum-hamburg-mit-drohnenflugbeschraenkung-1239648","parser":None,"data_rights":"Official notice used as a citation only; no confirmed complete licensed event calendar","scope":"Police confirms several assemblies on 20 Nov 2026 but not unique event titles/time/place; never import events from a drone restriction window"},
 {"city":"Bremen","state":"Bremen","type":"official_police_press_archive","url":"https://www.polizei.bremen.de/news/pressestelle/pressearchiv-5034","parser":None,"data_rights":"Public police press archive, no verified general event-data license; link and monitor only","scope":"Occasional press notices mention assemblies, but this is not an official upcoming-assemblies feed"},
 {"city":"Hamburg","state":"Hamburg","type":"official_registration_information","url":"https://www.hamburg.de/service/info/111097758/","parser":None,"data_rights":"Not an event feed; no bulk licence applicable","scope":"Registration rules and contacts only; not a future event source"},
]
def inspect(item):
 output={**item,"status":"unavailable","checked_on":datetime.now(timezone.utc).date().isoformat()}
 req=urllib.request.Request(item["url"],headers={"User-Agent":"DemoRadar/1.0 (+https://github.com/PuntaCanada/demoradar)","Accept":"text/html"})
 try:
  with urllib.request.urlopen(req,timeout=12) as response:
   payload=response.read(160_000)
   if response.status!=200 or len(payload)<400:raise ValueError("Empty or non-200 page")
   # A generic HTTP 200 is not enough to claim a working assembly register.
   if item["type"]=="official_assembly_list_html":
    decoded=payload.decode("utf-8",errors="replace").lower()
    if "versammlungen" not in decoded or "thema der versammlung" not in decoded:
     raise ValueError("Assembly-list content marker missing; page may have changed")
   output["status"]="reachable_archive_only" if item["type"]=="official_police_historical_notice" else ("reachable_parser_configured" if item["parser"] else "reachable_monitor_only_not_a_feed")
 except Exception as exc:output["error"]=str(exc)[:125]
 return output
def main():
 result={"version":1,"method":"read-only official-page check; reachability never establishes event coverage or reuse rights","sources":[inspect(x) for x in SOURCES]}
 previous={}
 try:previous=json.loads(OUTPUT.read_text(encoding="utf-8"))
 except Exception:pass
 if result!=previous:OUTPUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print("Expansion source monitor:",[(s["city"],s["status"]) for s in result["sources"]])
if __name__=="__main__":main()
