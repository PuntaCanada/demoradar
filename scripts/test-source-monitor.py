#!/usr/bin/env python3
"""No network: source monitoring is observation-only and never imports an event."""
import importlib.util
import json
import urllib.error
import tempfile
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location("official_sources","scripts/monitor-official-sources.py")
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
assert any(s["city"]=="Weimar" and s["type"]=="official_assembly_upcoming_html" and s["parser"] is None for s in module.SOURCES)
assert {x["city"] for x in module.SOURCES if x["type"]=="official_police_historical_notice"}=={"Magdeburg","Halle (Saale)"}
assert all(x["parser"] is None and x["state"]=="Sachsen-Anhalt" for x in module.SOURCES if x["type"]=="official_police_historical_notice")
assert any(x["city"]=="Köln" and x["parser"] for x in module.SOURCES)
assert any(x["city"]=="Landsberg am Lech" and x["state"]=="Bayern" and x["type"]=="official_assembly_list_html" and x["parser"] is None for x in module.SOURCES)
assert any(x["state"]=="Rheinland-Pfalz" and x["parser"] is None for x in module.SOURCES)
assert any(x["city"]=="Schwerin" and x["parser"] is None for x in module.SOURCES)
assert any(x["city"]=="Kreis Unna" and x["parser"] is None for x in module.SOURCES)
assert any(x["state"]=="Schleswig-Holstein" and x["parser"] is None for x in module.SOURCES)
assert any(x["city"]=="Potsdam" and x["state"]=="Brandenburg" and x["parser"] is None for x in module.SOURCES)
assert any(x["city"]=="Karlsruhe" and x["state"]=="Baden-Württemberg" and x["parser"] is None for x in module.SOURCES)
assert sum(x["city"]=="Leipzig" for x in module.SOURCES)==2
assert any(x["city"]=="Bremen" and x["parser"] is None and x["type"]=="official_police_press_archive" for x in module.SOURCES)
assert any(x["city"]=="Hamburg" and x["type"]=="official_police_operational_notice" and x["parser"] is None for x in module.SOURCES)

assert module.validate_priority_registry()=={"Saarland":1,"Hessen":2,"Niedersachsen":1,"Rheinland-Pfalz":2}
assert all(s["parser"] is None for s in module.SOURCES if s["state"] in module.PRIORITY_STATES)
assert any(s["city"]=="Saarland Polizei-Presse" and s["type"]=="official_police_press_index" for s in module.SOURCES)
assert any(s["city"]=="Polizei Hessen Meldungen" and s["type"]=="official_police_press_index" for s in module.SOURCES)
assert any(s["city"]=="Polizei Rheinland-Pfalz Presse" and s["type"]=="official_police_press_index" for s in module.SOURCES)
from copy import deepcopy
for broken in ("parser","url","scope","data_rights"):
 sources=deepcopy(module.SOURCES)
 item=next(s for s in sources if s["city"]=="Saarland Polizei-Presse")
 item[broken]={"parser":"unlicensed-import.py","url":"http://insecure.example","scope":"","data_rights":""}[broken]
 try:module.validate_priority_registry(sources)
 except ValueError:pass
 else:raise AssertionError("Invalid research source accepted: "+broken)
with_duplicate=deepcopy(module.SOURCES)
with_duplicate.append(deepcopy(with_duplicate[0]))
try:module.validate_priority_registry(with_duplicate)
except ValueError:pass
else:raise AssertionError("Duplicate official source accepted")

assert all("url" in x and "data_rights" in x and "scope" in x for x in module.SOURCES)
class Response:
 status=200
 def __enter__(self):return self
 def __exit__(self,*_):return False
 def read(self,_):return b"Versammlungen Thema der Versammlung official notice"*30
with patch.object(module.urllib.request,"urlopen",return_value=Response()):
 for item in module.SOURCES:
  checked=module.inspect(item)
  assert checked["status"]==("content_unverified" if item["type"]=="official_assembly_upcoming_html" else ("reachable_archive_only" if item["type"]=="official_police_historical_notice" else ("reachable_parser_configured" if item["parser"] else "reachable_monitor_only_not_a_feed")))
  assert "events" not in checked
  assert len(checked["checked_on"])==10 and checked["checked_on"].count("-")==2
# The official Weimar calendar really contains future dated registrations, not just a generic URL.
weimar_html=b"""<html><body><h1>Versammlungsanmeldungen</h1><p>Best\xc3\xa4tigte Versammlungsanmeldungen in Weimar</p>
<div>So, 22.11.26 15:00 bis 18:00 Uhr</div>
<div>Mo, 23.11.26 19:00 bis 21:00 Uhr</div><div>Di, 24.11.26</div><div>Mi, 25.11.26</div>
<div>Mi, 16.11.26 contradiction</div></body></html>"""
weimar_html+=b"<p>Official city assembly calendar page content, not an event record.</p>"*8
dates,conflicts,rows=module.verify_weimar_dates(weimar_html,module.date(2026,11,20))
assert dates==["2026-11-22","2026-11-23","2026-11-24","2026-11-25"]
assert len(conflicts)==1 and "weekday mismatch" in conflicts[0]
assert rows==4
# A weekday inconsistency must fail closed rather than entering a calendar.
class WeimarResponse(Response):
 def read(self,_):return weimar_html
with patch.object(module.urllib.request,"urlopen",return_value=WeimarResponse()):
 checked=module.inspect(next(s for s in module.SOURCES if s["city"]=="Weimar"))
 assert checked["status"]=="content_unverified" and checked["future_date_count"]==4
good_html=weimar_html.replace(b"<div>Mi, 16.11.26 contradiction</div>",b"")
class ValidWeimar(Response):
 def read(self,_):return good_html
with patch.object(module.urllib.request,"urlopen",return_value=ValidWeimar()):
 checked=module.inspect(next(s for s in module.SOURCES if s["city"]=="Weimar"))
 assert checked["status"]=="reachable_upcoming_list_research_only"
 assert checked["future_date_count"]==4 and checked["future_announcement_rows_verified"]==4 and checked["future_dates_verified"][0]=="2026-11-22"
 assert "events" not in checked
# Two independent assembly notices on one date remain two notices but one day.
duplicate=good_html.replace(b"<div>Mo, 23.11.26",b"<div>So, 22.11.26 17:00 bis 19:00</div><div>Mo, 23.11.26")
duplicate_days,duplicate_errors,duplicate_rows=module.verify_weimar_dates(duplicate,module.date(2026,11,20))
assert len(duplicate_days)==4 and duplicate_rows==5 and duplicate_errors==[]
land_html=b"<h1>Versammlungen</h1><div>Mittwoch, 16.11.2026</div><div>Freitag, 13.11.2026</div>"
# Long municipal CMS navigation may put actual dates beyond the first 160 kB.
class LongWeimar(Response):
 def read(self,n):
  assert n>=300_000
  return b"<nav>"+b"Navigation links and official site sections. "*5000+b"</nav>"+good_html
with patch.object(module.urllib.request,"urlopen",return_value=LongWeimar()):
 long_check=module.inspect(next(s for s in module.SOURCES if s["city"]=="Weimar"))
 assert long_check["future_date_count"]==4 and long_check["future_announcement_rows_verified"]==4 and long_check["status"]=="reachable_upcoming_list_research_only"
class LongLandsberg(Response):
 def read(self,n):
  assert n>=300_000
  return b"<nav>"+b"County navigation and headers "*9000+b"</nav>"+land_html+b"<p>Thema der Versammlung</p>"
with patch.object(module.urllib.request,"urlopen",return_value=LongLandsberg()):
 lands=module.inspect(next(s for s in module.SOURCES if s["city"]=="Landsberg am Lech"))
 assert lands["date_conflicts"] and lands["status"]=="reachable_monitor_only_not_a_feed"
assert lands["documented_date_discrepancy"]["observed_on"]=="2026-11-20"
assert lands["documented_date_discrepancy"]["reproduced_in_latest_fetch"] is True
# Navigation/content changes may hide a documented discrepancy in later fetches.
class LandsbergWithoutConflict(Response):
 def read(self,n):
  return b"<h1>Versammlungen</h1><p>Thema der Versammlung</p>"*18
with patch.object(module.urllib.request,"urlopen",return_value=LandsbergWithoutConflict()):
 later=module.inspect(next(s for s in module.SOURCES if s["city"]=="Landsberg am Lech"))
 assert later["date_conflicts"]==[]
 assert later["documented_date_discrepancy"]["reproduced_in_latest_fetch"] is False
 assert later["documented_date_discrepancy"]["observed_on"]=="2026-11-20"
 assert "events" not in later
assert len(module.verify_landsberg_weekdays(land_html))==1
assert "weekday contradicts Mittwoch" in module.verify_landsberg_weekdays(land_html)[0]
class ReplacedPage(Response):
 def read(self,_):return b"<html>Login page instead of the actual assembly register</html>"*20
with patch.object(module.urllib.request,"urlopen",return_value=ReplacedPage()):
 broken=module.inspect(next(x for x in module.SOURCES if x["city"]=="Landsberg am Lech"))
 assert broken["status"]=="content_unverified" and "marker" in broken["error"],"Content changes must not count as verified source reachability"
# A reset, 403, 404 and replaced contents have different meanings.
with patch.object(module.urllib.request,"urlopen",side_effect=urllib.error.URLError(ConnectionResetError(104,"Connection reset"))):
 reset=module.inspect(next(x for x in module.SOURCES if x["city"]=="Magdeburg"))
 assert reset["status"]=="transport_unverified"
with patch.object(module.urllib.request,"urlopen",side_effect=urllib.error.HTTPError("https://example.org",403,"Forbidden",{},None)):
 blocked=module.inspect(module.SOURCES[0])
 assert blocked["status"]=="http_restricted"
with patch.object(module.urllib.request,"urlopen",side_effect=urllib.error.HTTPError("https://example.org",404,"Not Found",{},None)):
 missing=module.inspect(module.SOURCES[0])
 assert missing["status"]=="unavailable"
with tempfile.TemporaryDirectory() as tmp:
 p=Path(tmp)/"sources.json"
 with patch.object(module,"OUTPUT",p),patch.object(module.urllib.request,"urlopen",return_value=Response()):
  module.main()
  result=json.loads(p.read_text())
  assert len(result["sources"])==len(module.SOURCES)
  assert module.validate_monitor_report(result)==len(module.SOURCES)==25
  assert all("events" not in s for s in result["sources"])
  from copy import deepcopy
  for mutation in ("missing", "duplicate", "unknown", "event", "wrong_priority", "incomplete_status"):
   corrupt=deepcopy(result)
   if mutation=="missing":corrupt["sources"].pop()
   elif mutation=="duplicate":corrupt["sources"][1]=deepcopy(corrupt["sources"][0])
   elif mutation=="unknown":corrupt["sources"][0]["url"]="https://official.example/unknown"
   elif mutation=="event":corrupt["sources"][0]["events"]=[{"id":"fabricated"}]
   elif mutation=="wrong_priority":corrupt["priority_research_only"]["Saarland"]=99
   else:corrupt["sources"][0]["status"]="verified_fictitious_event"
   try:module.validate_monitor_report(corrupt)
   except ValueError:pass
   else:raise AssertionError("Unsafe source report passed: "+mutation)
print("official-source monitor: safe statuses and no fictitious events OK")
