#!/usr/bin/env python3
"""Import only explicitly announced facts from one original Dortmund police notice.

Police press release is not a complete demonstration calendar. Never infer
exact start time, participants, route, or a final assembly authorization.
"""
import datetime as dt
import hashlib
import json
import re
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

URL="https://www.presseportal.de/blaulicht/pm/4971/6393424"
EVENT_DATE=dt.date(2026,11,20)
EVENTS=Path("data/events.json")
STATUS=Path("data/dortmund-police-source.json")

class Text(HTMLParser):
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
 doc=Text();doc.feed(html);text=doc.text
 required=[
  "18.11.2026", "Polizei Dortmund", "20. November",
  "Versammlungsanmeldung zum Thema", "GenZ regelt",
  "im nördlichen Bereich des Dortmunder Hauptbahnhofs starten",
  "auf dem Friedensplatz in der Innenstadt enden"
 ]
 if not all(term in text for term in required):return []
 if not re.search(r"Für den kommenden Freitag,\s*20\.\s*November",text):return []
 return [{
  "id":"police-dortmund-"+hashlib.sha256(URL.encode()).hexdigest()[:16],
  "country":"DE","state":"Nordrhein-Westfalen","city":"Dortmund",
  "date":EVENT_DATE.isoformat(),"start":"","end":"",
  "title":"GenZ regelt","location":"Nördlicher Bereich des Dortmunder Hauptbahnhofs",
  "route":"","source":"Polizei Dortmund – amtliche Pressemitteilung",
  "source_url":URL,
  "source_status":"Versammlung angemeldet; Zeitpunkt nur nachmittags angegeben, Route nicht abschließend übernommen"
 }]

def fetch():
 req=urllib.request.Request(URL,headers={"User-Agent":"DemoRadar/1.0 (+https://github.com/PuntaCanada/demoradar)","Accept":"text/html"})
 with urllib.request.urlopen(req,timeout=18) as resp:
  if resp.status!=200:raise ValueError("HTTP "+str(resp.status))
  data=resp.read(700_000)
  if len(data)<500:raise ValueError("Unexpectedly short police page")
  return data.decode("utf-8","replace")

def main():
 today=dt.datetime.now(dt.timezone.utc).date()
 status={"source":URL,"mode":"police_original_one_off","status":"outside_retention","count":0,
  "rights":"Short factual announcement, date, venue and publisher link only; no police press article reproduced"}
 found=[]
 if -90<=(today-EVENT_DATE).days<=30:
  status["checked_on"]=today.isoformat()
  try:
   found=parse(fetch())
   status.update(status="verified_one_off" if found else "unverified_content_no_import",count=len(found))
  except Exception as error:
   status.update(status="unavailable_no_import",error=str(error)[:120])
 data=json.loads(EVENTS.read_text(encoding="utf-8"))
 if not isinstance(data.get("events"),list):raise ValueError("Missing event records")
 current={e["id"]:e for e in data["events"] if str(e.get("id","")).startswith("police-dortmund-") and e.get("date","")>=str(today-dt.timedelta(days=30))}
 for event in found:current[event["id"]]=event
 other=[e for e in data["events"] if not str(e.get("id","")).startswith("police-dortmund-")]
 merged=sorted(other+list(current.values()),key=lambda e:(e["date"],e.get("start",""),e["id"]))
 if merged!=data["events"]:
  data["events"]=merged;data["count"]=len(merged)
  EVENTS.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 previous={}
 try:previous=json.loads(STATUS.read_text(encoding="utf-8"))
 except (OSError,ValueError):pass
 if previous!=status:STATUS.write_text(json.dumps(status,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print("Dortmund police event:",status["status"],len(found),"verified details")
if __name__=="__main__":main()
