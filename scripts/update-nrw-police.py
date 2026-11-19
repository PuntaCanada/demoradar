#!/usr/bin/env python3
"""Allowlisted factual police announcements only; no generic scraping or inferred events."""
import datetime as dt
import hashlib
import json
import re
import urllib.request
from html.parser import HTMLParser
from pathlib import Path
EVENTS=Path("data/events.json")
STATUS=Path("data/nrw-police-source.json")
SOURCES={
 "Bonn":"https://www.presseportal.de/blaulicht/pm/7304/6393705",
 "Münster":"https://www.presseportal.de/blaulicht/pm/11187/6394182"
}
DAY=dt.date(2026,11,20)
class Reader(HTMLParser):
 def __init__(self):super().__init__(convert_charrefs=True);self.chunks=[];self.skip=0
 def handle_starttag(self,t,a):
  if t in ("script","style","noscript"):self.skip+=1
 def handle_endtag(self,t):
  if t in ("script","style","noscript"):self.skip=max(0,self.skip-1)
 def handle_data(self,data):
  if not self.skip:self.chunks.append(data)
def parse(html,city):
 if city not in SOURCES:return []
 r=Reader();r.feed(html);body=re.sub(r"\s+"," "," ".join(r.chunks))
 if "19.11.2026" not in body:return []
 # Münster uses an abbreviated 20.11. in its original notice. The explicitly
 # dated 19 Nov 2026 publication provides the year, not an inferred event date.
 if city=="Bonn" and "20.11.2026" not in body:return []
 if city=="Münster" and not re.search(r"Freitag\s*\(20\.11\.\)",body):return []
 if "Polizei "+city not in body:return []
 def make(title,start,end,place):
  return {"id":"police-nrw-"+hashlib.sha256((SOURCES[city]+"|"+title).encode()).hexdigest()[:16],
   "country":"DE","state":"Nordrhein-Westfalen","city":city,"date":DAY.isoformat(),
   "start":start,"end":end,"title":title,"location":place,"route":"",
   "source":"Polizei "+city+" – amtliche Pressemitteilung","source_url":SOURCES[city],
   "source_status":"Ausdrücklich angekündigt; aktuelle Veranstaltungsdetails bei der Behörde prüfen"}
 if city=="Bonn":
  checks=["Protestkundgebung gegen die Wiedereinführung der Wehrpflicht",
   "Versammlung beginnt um 10:00 Uhr an der Poppelsdorfer Allee",
   "Versammlung endet gegen 14:00 Uhr im Bonner Hofgarten"]
  return [make(checks[0],"10:00","14:00","Poppelsdorfer Allee")] if all(x in body for x in checks) else []
 checks=['"Schulstreik gegen die Wehrpflicht"','"Nein zur Wehrpflicht"',
         "zwei Aufzüge mit insgesamt rund 500 Personen in der Zeit von 10-13 Uhr",
         "vom Hauptbahnhof","vom Schlossplatz"]
 if not all(x in body for x in checks):return []
 # The authority gives the same overall window, not two individually confirmed
 # start/end times; do not guess precise times for either event.
 return [make("Schulstreik gegen die Wehrpflicht","","","Hauptbahnhof"),
         make("Nein zur Wehrpflicht","","","Schlossplatz")]
def fetch(city):
 url=SOURCES[city]
 req=urllib.request.Request(url,headers={"User-Agent":"DemoRadar/1.0 (+https://github.com/PuntaCanada/demoradar)","Accept":"text/html"})
 with urllib.request.urlopen(req,timeout=15) as response:
  if response.status!=200:raise ValueError("HTTP "+str(response.status))
  page=response.read(700000)
  if len(page)<500:raise ValueError("Page too short")
  return page.decode("utf8","replace")
def main():
 today=dt.datetime.now(dt.timezone.utc).date()
 before={}
 try:before=json.loads(STATUS.read_text(encoding="utf8"))
 except (OSError,ValueError):pass
 report={"version":1,"mode":"original_police_announcement_facts_only","sources":[],
  "rights":"Short factual date, subject and announced places only; original police articles/images not reproduced"}
 found=[]
 for city,url in SOURCES.items():
  row={"city":city,"source":url,"status":"out_of_retention","count":0}
  if -90<=(today-DAY).days<=30:
   row["checked_on"]=today.isoformat()
   try:
    records=parse(fetch(city),city)
    row.update(status="verified_one_off" if records else "not_verified_no_import",count=len(records))
    found+=records
   except Exception as error:row.update(status="unavailable_no_import",error=str(error)[:110])
  report["sources"].append(row)
 data=json.loads(EVENTS.read_text(encoding="utf8"))
 if not isinstance(data.get("events"),list):raise ValueError("Invalid official event list")
 existing={e["id"]:e for e in data["events"] if str(e.get("id","")).startswith("police-nrw-")}
 for e in found:existing[e["id"]]=e
 existing={k:e for k,e in existing.items() if e["date"]>=str(today-dt.timedelta(days=30))}
 others=[e for e in data["events"] if not str(e.get("id","")).startswith("police-nrw-")]
 combined=sorted(others+list(existing.values()),key=lambda e:(e["date"],e.get("start",""),e["id"]))
 if combined!=data["events"]:
  data["events"]=combined;data["count"]=len(combined)
  EVENTS.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
 if report!=before:STATUS.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
 print("Official NRW police notices",[(x["city"],x["status"],x["count"]) for x in report["sources"]])
if __name__=="__main__":main()
