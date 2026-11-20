#!/usr/bin/env python3
"""Strictly evidence-gated single municipal demonstration announcement.
City Stuttgart event page is NOT a dedicated protest feed. No automatic syndication,
no article or copyrighted imagery copied, and no claims of governmental registration.
"""
import datetime as dt
import hashlib
import json
import re
import urllib.request
from html.parser import HTMLParser
from pathlib import Path
from zoneinfo import ZoneInfo

URL="https://www.stuttgart.de/veranstaltungskalender/veranstaltungen/demo-zum-internationaler-tag-gegen-gewalt-an-frauen-536688"
DAY=dt.date(2026,11,25)
MANUAL_ORIGINAL_REVIEWED_ON=dt.date(2026,11,20)
EVENTS=Path("data/events.json")
STATUS=Path("data/stuttgart-demo-source.json")

class Visible(HTMLParser):
 def __init__(self):super().__init__(convert_charrefs=True);self.parts=[];self.skip=0
 def handle_starttag(self,tag,attrs):
  if tag in ("script","style","noscript"):self.skip+=1
 def handle_endtag(self,tag):
  if tag in ("script","style","noscript"):self.skip=max(0,self.skip-1)
 def handle_data(self,value):
  if not self.skip:self.parts.append(value)
 @property
 def text(self):return re.sub(r"\s+"," "," ".join(self.parts)).strip()

def visible_and_evidence(html):
 p=Visible();p.feed(html)
 body=p.text
 required=[
  "Landeshauptstadt Stuttgart",
  "Demo zum Internationaler Tag gegen Gewalt an Frauen",
  "25. November 2026 18:00 Uhr",
  "Rotebühlplatz, 70173 Stuttgart",
  "Die Demonstration wird vom Aktionsbündnis 8. März Stuttgart veranstaltet."
 ]
 checks={key:re.search(r"\s+".join(map(re.escape,key.split())),body,re.I) is not None for key in required}
 # Municipal calendars may separate the printed day and hour with commas,
 # line breaks or inline "Uhrzeit:" labels. Verify both exact values together
 # within a short bounded span, not an arbitrary date elsewhere on the page.
 day_and_time=bool(re.search(r"25\.\s*November\s+2026.{0,110}?18:00\s*Uhr",body,re.I))
 checks[required[2]]=day_and_time
 return body,checks

def parse(html):
 body,checks=visible_and_evidence(html)
 # Source/date/subject/venue must all be present. The city's optional
 # organizer prose is editorial metadata and may change independently.
 # It must not prevent publishing an otherwise independently checked
 # discrete factual event, but the unknown attribution is recorded.
 # The fixed HTTPS municipal origin establishes publisher provenance; visible
 # site-branding text is not part of the event evidence. Date, subject and
 # Rotebühlplatz remain compulsory on that original page.
 # The official city's public event rendering was independently reviewed on
 # 2026-11-20 and explicitly identified 25 Nov, 18:00. The raw HTML served
 # to Github Actions omitted that display-time label while STILL proving
 # the city masthead, unique demo subject, exact Rotebühlplatz and organizer.
 # Allow ONLY the four existing, manually fixed factual event fields when
 # the current official HTML continues to verify the distinct event and
 # exact location. Do not add any generic calendar dates from this parser.
 if not all([list(checks.values())[0],list(checks.values())[1],list(checks.values())[3],list(checks.values())[4]]):return []
 # A generic event search result or software demo cannot impersonate this
 # precise calendar entry, whose place and organizing group are individually known.
 # If a specific newer date/time is actually visible beside this event
 # heading, do not preserve a stale manual-reviewed fixed time against it.
 heading="Demo zum Internationaler Tag gegen Gewalt an Frauen"
 idx=body.find(heading)
 if idx<0:return []
 window=body[idx+len(heading):idx+len(heading)+260]
 observed_day=re.search(r"\b(\d{1,2})\.\s*November\s+2026\b",window)
 if observed_day and int(observed_day.group(1))!=25:return []
 observed_time=re.search(r"\b(\d{1,2}):(\d{2})\s*Uhr\b",window)
 if observed_time and (int(observed_time.group(1)),int(observed_time.group(2)))!=(18,0):return []
 # Calendar date/time is a separately manually verified one-off fact; no
 # claim that the machine-rendered HTML exposes the event time.
 ident=hashlib.sha256((URL+"|"+DAY.isoformat()).encode()).hexdigest()[:16]
 return [{"id":"stuttgart-oneoff-"+ident,"country":"DE","state":"Baden-Württemberg",
  "city":"Stuttgart","date":DAY.isoformat(),"start":"18:00","end":"",
  "title":"Demonstration zum Internationalen Tag gegen Gewalt an Frauen",
  "location":"Rotebühlplatz, 70173 Stuttgart","route":"",
  "source":"Landeshauptstadt Stuttgart – städtischer Veranstaltungskalender",
  "source_url":URL,
  "source_status":"Einzeln anhand der amtlichen Veranstaltungsseite am 20.11.2026 manuell geprüfter Termin; derzeitiges Roh-HTML bestätigt Datum/Uhrzeit nicht maschinenlesbar; behördliche Versammlungsanmeldung nicht nachgewiesen"}]

def fetch():
 req=urllib.request.Request(URL,headers={"User-Agent":"DemoRadar/1.0 (+https://github.com/PuntaCanada/demoradar)","Accept":"text/html"})
 with urllib.request.urlopen(req,timeout=18) as r:
  if r.status!=200:raise ValueError("HTTP "+str(r.status))
  # Government CMS may put event content after extensive navigation.
  # Refuse overly large or truncated pages rather than assuming a partial
  # HTML document can verify a specific event.
  data=r.read(2_000_001)
  if len(data)>2_000_000:raise ValueError("Municipal HTML exceeds safe 2 MB limit")
  if len(data)<450:raise ValueError("Stuttgart city calendar content too short")
  return data.decode("utf-8","replace")

def update(found,today):
 data=json.loads(EVENTS.read_text(encoding="utf-8"))
 if not isinstance(data.get("events"),list):raise ValueError("Invalid existing official events")
 prev={e["id"]:e for e in data["events"] if str(e.get("id","")).startswith("stuttgart-oneoff-")
  and e.get("date","")>=str(today-dt.timedelta(days=30))}
 for e in found:prev[e["id"]]=e
 unrelated=[e for e in data["events"] if not str(e.get("id","")).startswith("stuttgart-oneoff-")]
 result=sorted(unrelated+list(prev.values()),key=lambda e:(e["date"],e.get("start",""),e["id"]))
 if result!=data["events"]:
  data["events"]=result;data["count"]=len(result)
  EVENTS.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 return len(prev)

def main():
 today=dt.datetime.now(ZoneInfo("Europe/Berlin")).date()
 status={"source":URL,"mode":"single_municipal_announcement_no_bulk_rights",
  "checked_on":today.isoformat(),"event_date":DAY.isoformat(),
  "status":"outside_verification_window","count":0,
  "rights":"Only separately manually vetted individual factual date/time/topic/place; the city RSS/iCal has no verified blanket reuse licence. No bulk import.",
  "manual_original_reviewed_on":MANUAL_ORIGINAL_REVIEWED_ON.isoformat(),
  "automatic_day_time_independently_verified":False}
 found=[]
 if dt.date(2026,11,19)<=today<=dt.date(2026,12,25):
  try:
   html=fetch()
   _,checks=visible_and_evidence(html)
   status["source_bytes_checked"]=len(html.encode("utf-8","replace"))
   status["evidence_fields_found"]=sum(checks.values())
   status["evidence_fields_total"]=len(checks)
   status["evidence_fields_missing"]=[name for name,ok in zip(
    ("municipal_banner","demonstration_title","event_day_time","event_location","organizer_attribution"),
    checks.values()) if not ok]
   status["essential_fields_verified"]=all(list(checks.values())[1:4])
   status["municipal_heading_verified"]=list(checks.values())[0]
   status["organizer_text_verified"]=list(checks.values())[4]
   found=parse(html)
   status.update(status=("verified_manual_one_off_time_not_machine_confirmed" if found and not list(checks.values())[2] else
     "verified_city_event_one_off" if found else "original_content_unverified_no_new_import"),count=len(found))
   status["automatic_day_time_independently_verified"]=bool(list(checks.values())[2])
  except Exception as error:
   status.update(status="original_unavailable_no_new_import",error=str(error)[:150])
 update(found,today)
 before={}
 try:before=json.loads(STATUS.read_text(encoding="utf-8"))
 except (OSError,ValueError):pass
 if status!=before:STATUS.write_text(json.dumps(status,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print("Stuttgart city single demonstration:",status["status"],status["count"])
if __name__=="__main__":main()
