#!/usr/bin/env python3
"""One independently documented municipal press notice, NOT a rolling official feed.
Facts only; do not copy creative article prose, photos, or third-party content.
"""
from __future__ import annotations
import datetime as dt
import hashlib
import json
import re
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

URL="https://www.freiburg.de/pb/2670264.html"
EVENT_DATE=dt.date(2026,11,20)
EVENTS=Path("data/events.json")
STATUS=Path("data/freiburg-source.json")

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

# These three distinct registration facts were checked against the city's
# original 19 November 2026 announcement. Start/end and venue may change.
# Do not infer a continuous official calendar from this one-off press notice.
ANNOUNCEMENTS=[
 {"title":"Schulstreik gegen Wehrpflicht","start":"10:00","end":"13:45","location":"Platz der Universität",
  "must":["Um 10 Uhr beginnt auf dem Platz der Universität","Schulstreik gegen Wehrpflicht","Die Aktion endet um 13.45 Uhr"]},
 {"title":"Jugenddemo gegen Krieg","start":"11:00","end":"14:30","location":"Platz der Alten Synagoge",
  "must":["Um 11 Uhr startet auf dem Platz der Alten Synagoge","Jugenddemo gegen Krieg","Die Versammlung wird um 14.30 Uhr beendet"]},
 {"title":"GenZ regelt das!","start":"19:00","end":"21:00","location":"Platz der Alten Synagoge",
  "must":["von 19 bis 21 Uhr","GenZ regelt das!","Platz der Alten Synagoge"]}
]
def parse(html,day=EVENT_DATE):
 reader=Text();reader.feed(html)
 body=reader.text
 required=["Verkehrseinschränkungen in der Innenstadt","Angemeldete Versammlungen in der Innenstadt",
  "Am Freitag, 20. November","Veröffentlicht am 19. November 2026"]
 if day!=EVENT_DATE or not all(value in body for value in required):return []
 result=[]
 for row in ANNOUNCEMENTS:
  if not all(value in body for value in row["must"]):continue
  # Group-specific original language must be present; only short factual
  # subject/time/place is reused, never the full police or city article.
  key=URL+"|"+EVENT_DATE.isoformat()+"|"+row["title"]
  result.append({"id":"freiburg-"+hashlib.sha256(key.encode()).hexdigest()[:16],
   "country":"DE","state":"Baden-Württemberg","city":"Freiburg im Breisgau",
   "date":EVENT_DATE.isoformat(),"start":row["start"],"end":row["end"],
   "title":row["title"],"location":row["location"],"route":"",
   "source":"Stadt Freiburg – amtliche Einzelmitteilung","source_url":URL,
   "source_status":"Amtlich angekündigte Einzelversammlung; keine vollständige Stadt- oder Landesübersicht"})
 return result

def fetch():
 req=urllib.request.Request(URL,headers={"User-Agent":"DemoRadar/1.0 (+https://github.com/PuntaCanada/demoradar)","Accept":"text/html"})
 with urllib.request.urlopen(req,timeout=18) as response:
  if response.status!=200:raise ValueError("HTTP "+str(response.status))
  data=response.read(1_100_000)
  if len(data)<500:raise ValueError("Unexpectedly small official source page")
  return data.decode("utf-8","replace")

def update(found,today):
 data=json.loads(EVENTS.read_text(encoding="utf8"))
 if not isinstance(data.get("events"),list):raise ValueError("Missing current official event list")
 old=[e for e in data["events"] if not str(e.get("id","")).startswith("freiburg-")]
 existing={e["id"]:e for e in data["events"] if str(e.get("id","")).startswith("freiburg-") and
  e.get("date","")>=str(today-dt.timedelta(days=30))}
 for row in found:existing[row["id"]]=row
 merged=sorted(old+list(existing.values()),key=lambda e:(e["date"],e.get("start",""),e["id"]))
 if merged!=data["events"]:
  data["events"]=merged;data["count"]=len(merged)
  EVENTS.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
 return len(existing)

def main():
 today=dt.datetime.now(dt.timezone.utc).date()
 report={"source":URL,"type":"official_city_press_one_off","checked_on":today.isoformat(),"status":"outside_retention",
  "count":0,"source_date":EVENT_DATE.isoformat(),
  "rights":"Short independently verified factual dates, times, locations and subjects only; no article, photo, bulk licence or new official feed claimed."}
 found=[]
 if -2<=(today-EVENT_DATE).days<=30:
  try:
   found=parse(fetch())
   report.update(status="verified_one_off" if len(found)==len(ANNOUNCEMENTS) else "incomplete_notice_no_new_import",count=len(found))
   if len(found)!=len(ANNOUNCEMENTS):found=[]
  except Exception as exc:report.update(status="source_unavailable_no_new_import",error=str(exc)[:140])
 update(found,today)
 before={}
 try:before=json.loads(STATUS.read_text(encoding="utf8"))
 except (OSError,ValueError):pass
 if before!=report:STATUS.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
 print("Freiburg one-off official city notice:",report["status"],report["count"])

if __name__=="__main__":main()
