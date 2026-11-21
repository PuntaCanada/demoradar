#!/usr/bin/env python3
"""Read-only source discovery monitor for undercovered federal states.
Reachability is NOT event availability, licensing permission, or completeness.
No speculative events are generated and no page text is republished.
"""
import json
import re
from html.parser import HTMLParser
from datetime import date
import socket
from datetime import datetime, timezone
import urllib.error
import urllib.request
from pathlib import Path

OUTPUT=Path("data/expansion-sources.json")
EVIDENCE=Path("data/source-date-evidence.json")
SOURCES=[
 {"city":"Saarland Polizei-Presse","state":"Saarland","type":"official_police_press_index","url":"https://www.saarland.de/polizei/DE/aktuelles/rss-feed","parser":None,"data_rights":"Official police RSS press overview; RSS publication alone does not license recurring re-publication of demonstration data. Never import automatically.","scope":"Press communications including unrelated crime and traffic; no assembly-only calendar and no verified future rally in the review on 2026-11-21."},
 {"city":"Polizei Hessen Meldungen","state":"Hessen","type":"official_police_press_index","url":"https://www.polizei.hessen.de/meldungen","parser":None,"data_rights":"Government press page, not an expressly licensed structured assembly-event feed; links and research only.","scope":"General police releases including the 19 Nov notice of 20 Nov assemblies, now historical; does not establish a future event calendar."},
 {"city":"Polizei Rheinland-Pfalz Presse","state":"Rheinland-Pfalz","type":"official_police_press_index","url":"https://www.polizei.rlp.de/service/presse","parser":None,"data_rights":"Official police press listing without verified dataset-specific open event reuse licence; links and research only.","scope":"General police press, including unrelated topics; no verified upcoming assembly-specific machine-readable collection."},
 {"city":"Weimar","state":"Thüringen","type":"official_assembly_upcoming_html","url":"https://stadt.weimar.de/de/versammlungsanmeldungen.html","parser":None,"data_rights":"Official listing of confirmed upcoming assembly registrations; no source-specific open machine reuse licence or structured JSON/CSV/RSS endpoint verified. Research and link only, never automated import.","scope":"Weimar city official list of confirmed assembly registrations. Actual dated forthcoming entries are checked in the page body; not a statewide register."},
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

# These are research endpoints only. A general press RSS landing page is not an
# assembly event feed and cannot silently be promoted to automatic ingestion.
PRIORITY_STATES=("Saarland","Hessen","Niedersachsen","Rheinland-Pfalz")
def validate_priority_registry(sources=SOURCES):
 for state in PRIORITY_STATES:
  items=[s for s in sources if s.get("state")==state]
  if not items:raise ValueError("Missing monitored priority state: "+state)
  for item in items:
   if not item.get("url","").startswith("https://"):
    raise ValueError("Official candidate requires HTTPS URL: "+state)
   if not item.get("scope") or not item.get("data_rights"):
    raise ValueError("Missing source limitations: "+state)
   if item.get("parser") is not None:
    raise ValueError("Priority research candidate unexpectedly enabled for import: "+state)
 if len({s["url"] for s in sources})!=len(sources):
  raise ValueError("Duplicate research source URL")
 return {state:sum(s["state"]==state for s in sources) for state in PRIORITY_STATES}

class BodyText(HTMLParser):
 def __init__(self):
  super().__init__()
  self.parts=[]
  self.skip=0
 def handle_starttag(self,tag,attrs):
  if tag in ("script","style"):self.skip+=1
 def handle_endtag(self,tag):
  if tag in ("script","style") and self.skip:self.skip-=1
 def handle_data(self,data):
  if not self.skip:self.parts.append(data)

GERMAN_WEEKDAYS=("Mo","Di","Mi","Do","Fr","Sa","So")
def verify_weimar_dates(raw,today=None):
 """Validate genuine dated rows in a visible official list; no title/content import."""
 today=today or datetime.now(timezone.utc).date()
 parser=BodyText()
 parser.feed(raw.decode("utf-8",errors="replace"))
 text=" ".join(parser.parts)
 if "Bestätigte Versammlungsanmeldungen in Weimar" not in text:
  raise ValueError("Weimar confirmed-assembly heading missing")
 # Page uses 'So, 22.11.26' before each row; count only calendar-valid weekday matches.
 hits=re.findall(r"\b(Mo|Di|Mi|Do|Fr|Sa|So),\s*(\d{1,2})\.(\d{1,2})\.(20\d{2}|\d{2})\b",text)
 valid=set()
 valid_rows=0
 inconsistent=[]
 for wd,day,month,year in hits:
  year=int(year) if len(year)==4 else 2000+int(year)
  try:d=date(year,int(month),int(day))
  except ValueError:
   inconsistent.append(f"{day}.{month}.{year} invalid")
   continue
  if GERMAN_WEEKDAYS[d.weekday()]!=wd:
   inconsistent.append(f"{day}.{month}.{year} weekday mismatch")
   continue
  if d>=today:
   valid.add(d.isoformat())
   valid_rows+=1
 return sorted(valid),inconsistent,valid_rows

def verify_landsberg_weekdays(raw):
 """Report contradictions, never silently invent a corrected date."""
 parser=BodyText()
 parser.feed(raw.decode("utf-8",errors="replace"))
 text=" ".join(parser.parts)
 names={"Montag":0,"Dienstag":1,"Mittwoch":2,"Donnerstag":3,"Freitag":4,"Samstag":5,"Sonntag":6}
 issues=[]
 for name,day,month,year in re.findall(r"\b(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag),?\s*(\d{1,2})\.(\d{1,2})\.(20\d{2})\b",text):
  try:d=date(int(year),int(month),int(day))
  except ValueError:
   issues.append(f"{day}.{month}.{year}: invalid date")
   continue
  if d.weekday()!=names[name]:issues.append(f"{day}.{month}.{year}: weekday contradicts {name}")
 return issues

def inspect(item):
 output={**item,"status":"unavailable","checked_on":datetime.now(timezone.utc).date().isoformat()}
 req=urllib.request.Request(item["url"],headers={"User-Agent":"DemoRadar/1.0 (+https://github.com/PuntaCanada/demoradar)","Accept":"text/html"})
 try:
  with urllib.request.urlopen(req,timeout=12) as response:
   # Municipal CMS pages can place the event list after extensive navigation.
   # Bound the read but do not assume the relevant content is inside 160 kB.
   max_bytes=900_000 if item["type"] in ("official_assembly_upcoming_html","official_assembly_list_html") else 160_000
   payload=response.read(max_bytes)
   if item["type"] in ("official_assembly_upcoming_html","official_assembly_list_html"):
    output["bytes_checked"]=len(payload)
   if response.status!=200 or len(payload)<400:raise ValueError("Empty or non-200 page")
   if item["type"]=="official_assembly_upcoming_html":
    dates,conflicts,rows=verify_weimar_dates(payload)
    output["future_announcement_rows_verified"]=rows
    output["future_dates_verified"]=dates
    output["future_date_count"]=len(dates)
    output["date_conflicts"]=conflicts
    output["status"]="reachable_upcoming_list_research_only" if dates and not conflicts else ("content_unverified" if conflicts else "reachable_without_upcoming_dates")
    return output
   if item["type"]=="official_assembly_list_html":
    output["date_conflicts"]=verify_landsberg_weekdays(payload)
    # A dated, independently verified original-page contradiction is not erased
    # just because the current parser did not reproduce it. Keep both statuses.
    try:record=next(r for r in json.loads(EVIDENCE.read_text(encoding="utf-8"))["records"] if r["source_url"]==item["url"])
    except (OSError,KeyError,ValueError,StopIteration):record=None
    if record:
     published=date.fromisoformat(record["published_date"])
     if GERMAN_WEEKDAYS[published.weekday()] == "Mi" or record["published_weekday"]!="Mittwoch" or record["actual_weekday"]!="Montag":
      raise ValueError("Official weekday/date evidence is internally inconsistent")
     output["documented_date_discrepancy"]={
      "observed_on":record["observed_on"],
      "published_date":record["published_date"],
      "published_weekday":record["published_weekday"],
      "actual_weekday":record["actual_weekday"],
      "reproduced_in_latest_fetch":any(published.strftime("%d.%m.%Y") in x for x in output["date_conflicts"])
     }
   # A generic HTTP 200 is not enough to claim a working assembly register.
   if item["type"]=="official_assembly_list_html":
    decoded=payload.decode("utf-8",errors="replace").lower()
    if "versammlungen" not in decoded or "thema der versammlung" not in decoded:
     raise ValueError("Assembly-list content marker missing; page may have changed")
   output["status"]="reachable_archive_only" if item["type"]=="official_police_historical_notice" else ("reachable_parser_configured" if item["parser"] else "reachable_monitor_only_not_a_feed")
 except urllib.error.HTTPError as exc:
  output["status"]="http_restricted" if exc.code in (401,403,429) else ("unavailable" if exc.code in (404,410) else "transport_unverified")
  output["error"]="HTTP "+str(exc.code)
 except (urllib.error.URLError,ConnectionError,TimeoutError,socket.timeout) as exc:
  # Network denial, connection reset and bot filtering do not establish that an
  # official announcement was removed. Never turn that ambiguity into an event.
  output["status"]="transport_unverified"
  output["error"]=type(exc).__name__+": "+str(exc)[:100]
 except ValueError as exc:
  output["status"]="content_unverified"
  output["error"]=str(exc)[:125]
 except Exception as exc:
  output["status"]="transport_unverified"
  output["error"]=type(exc).__name__+": "+str(exc)[:100]
 return output

def validate_monitor_report(report, sources=SOURCES):
 """Fail closed on partial/stale registry output before any publication."""
 expected={s["url"] for s in sources}
 if len(expected)!=len(sources):
  raise ValueError("Duplicate URLs in the configured official-source registry")
 rows=report.get("sources")
 if not isinstance(rows,list) or len(rows)!=len(expected):
  raise ValueError("Monitor report must include every configured official source exactly once")
 if {r.get("url") for r in rows}!=expected or len({r.get("url") for r in rows})!=len(rows):
  raise ValueError("Report has missing, duplicate, or unexpected official sources")
 allowed={"unavailable","http_restricted","transport_unverified","content_unverified",
          "reachable_upcoming_list_research_only","reachable_without_upcoming_dates",
          "reachable_archive_only","reachable_parser_configured","reachable_monitor_only_not_a_feed"}
 for row in rows:
  if row.get("status") not in allowed or not row.get("checked_on"):
   raise ValueError("Unverified status or missing check date")
  if "events" in row:
   raise ValueError("Read-only research monitor must never generate demonstration events")
  if row.get("parser") is not None and row.get("state") in PRIORITY_STATES:
   raise ValueError("Unlicensed priority source enabled for import")
 counts=validate_priority_registry(sources)
 if report.get("priority_research_only")!=counts:
  raise ValueError("Priority source counts do not match configured registry")
 return len(rows)

def main():
 priority_counts=validate_priority_registry()
 result={"version":1,"method":"read-only official-page check; reachability never establishes event coverage or reuse rights","priority_research_only":priority_counts,"sources":[inspect(x) for x in SOURCES]}
 validate_monitor_report(result)
 previous={}
 try:previous=json.loads(OUTPUT.read_text(encoding="utf-8"))
 except Exception:pass
 if result!=previous:OUTPUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print("Expansion source monitor:",[(s["city"],s["status"]) for s in result["sources"]])
if __name__=="__main__":main()
