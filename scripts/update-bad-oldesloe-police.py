#!/usr/bin/env python3
"""One explicitly announced 21 Nov 2026 Bad Oldesloe protest from the original
Polizeidirektion Ratzeburg notice. Factual single-event attribution, not a feed.
Never infer an exact start, protest title, organizer, headcount or route.
"""
import datetime as dt
import hashlib
import json
import re
import urllib.request
from html.parser import HTMLParser
from pathlib import Path
from zoneinfo import ZoneInfo

URL="https://www.presseportal.de/blaulicht/pm/43735/6394590"
DAY=dt.date(2026,11,21)
EVENTS=Path("data/events.json")
STATUS=Path("data/bad-oldesloe-police-source.json")

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

def parse(html):
 p=Visible();p.feed(html)
 body=p.text
 required=[
  "Polizeidirektion Ratzeburg",
  "Bad Oldesloe",
  "21. und 22. November 2026",
  "Gegenversammlungen angemeldet",
  "Aufgrund einer angemeldeten Demonstration",
  "21. November 2026 (Samstag)",
  "in den Morgenstunden",
  "Käthe-Kollwitz-Straße",
  "Bahnhofsvorplatz",
  "Bangertstraße",
 ]
 if not all(phrase in body for phrase in required):return []
 if not re.search(r"20\.11\.2026\s*[–-]\s*10:56",body):return []
 return [{
  "id":"police-bad-oldesloe-"+hashlib.sha256((URL+"|"+DAY.isoformat()).encode()).hexdigest()[:16],
  "country":"DE","state":"Schleswig-Holstein","city":"Bad Oldesloe",
  "date":DAY.isoformat(),"start":"","end":"",
  "title":"Angemeldete Demonstration im Umfeld des AfD-Parteitags",
  "location":"Bad Oldesloe (Bereich Bahnhofsvorplatz / Käthe-Kollwitz-Straße; genauer Versammlungsort nicht amtlich bestätigt)",
  "route":"",
  "source":"Polizeidirektion Ratzeburg – amtliche Mitteilung",
  "source_url":URL,
  "source_status":"Angemeldete Demonstration am Vormittag laut Polizei; exakte Startzeit, offizieller Titel, Veranstaltungsort und Route nicht bestätigt"
 }]

def fetch():
 req=urllib.request.Request(URL,headers={"User-Agent":"DemoRadar/1.0 (+https://github.com/PuntaCanada/demoradar)","Accept":"text/html"})
 with urllib.request.urlopen(req,timeout=18) as r:
  if r.status!=200:raise ValueError("HTTP "+str(r.status))
  data=r.read(800_000)
  if len(data)<500:raise ValueError("Unusually small press source")
  return data.decode("utf-8","replace")

def update(found,today):
 data=json.loads(EVENTS.read_text(encoding="utf-8"))
 if not isinstance(data.get("events"),list):raise ValueError("Missing existing official events")
 old={e["id"]:e for e in data["events"] if str(e.get("id","")).startswith("police-bad-oldesloe-") and e.get("date","")>=str(today-dt.timedelta(days=30))}
 for e in found:old[e["id"]]=e
 rest=[e for e in data["events"] if not str(e.get("id","")).startswith("police-bad-oldesloe-")]
 merged=sorted(rest+list(old.values()),key=lambda e:(e["date"],e.get("start",""),e["id"]))
 if merged!=data["events"]:
  data["events"]=merged;data["count"]=len(merged)
  EVENTS.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 return len(old)

def main():
 today=dt.datetime.now(ZoneInfo("Europe/Berlin")).date()
 report={"source":URL,"type":"one_off_original_police_notice","checked_on":today.isoformat(),
  "event_day":DAY.isoformat(),"status":"out_of_retention","count":0,
  "rights":"Short factual police-announced date, city and affected area only. No article text/images, bulk rights, route or exact time inferred."}
 found=[]
 if dt.date(2026,11,19)<=today<=dt.date(2026,12,21):
  try:
   found=parse(fetch())
   report.update(status="verified_one_off" if len(found)==1 else "unverified_original_no_import",count=len(found))
  except Exception as error:report.update(status="source_unavailable_no_import",error=str(error)[:160])
 update(found,today)
 previous={}
 try:previous=json.loads(STATUS.read_text(encoding="utf-8"))
 except (OSError,ValueError):pass
 if previous!=report:STATUS.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print("Bad Oldesloe confirmed original police notice:",report["status"],report["count"])

if __name__=="__main__":main()
