#!/usr/bin/env python3
"""Safely import only the 31 Oct 2026 Leipzig archive event from an original police notice.
The archived event is historical, never shown as a newly upcoming assembly.
"""
import datetime as dt
import hashlib
import json
import re
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

URL="https://www.polizei.sachsen.de/de/einsatz-zum-versammlungsgeschehen-am-31-oktober-in-leipzig-44215.html"
DAY=dt.date(2026,10,31)
EVENTS=Path("data/events.json")
STATUS=Path("data/leipzig-archive-source.json")
class Reader(HTMLParser):
 def __init__(self):super().__init__(convert_charrefs=True);self.words=[];self.skip=0
 def handle_starttag(self,tag,attrs):
  if tag in ("style","script","noscript"):self.skip+=1
 def handle_endtag(self,tag):
  if tag in ("style","script","noscript"):self.skip=max(0,self.skip-1)
 def handle_data(self,data):
  if not self.skip:self.words.append(data)
def parse(html):
 reader=Reader();reader.feed(html)
 text=re.sub(r"\s+"," "," ".join(reader.words))
 if "Polizeidirektion Leipzig" not in text or not re.search(r"31\. Oktober 2026",text):return []
 if not re.search(r"Gen Z regelt! Solidarität mit den Protestierenden in Frankreich!",text):return []
 # Narrow evidence to a sentence from the original published announcement.
 evidence=re.search(r"Unter dem Motto.{0,250}?Versammlungsbehörde der Stadt Leipzig eine Versammlung.{0,180}?31\. Oktober 2026 von 14:00 Uhr bis 17:00 Uhr",text,re.I)
 if not evidence or "Augustusplatz" not in text:return []
 event_id="police-leipzig-archive-"+hashlib.sha256(URL.encode()).hexdigest()[:16]
 return [{"id":event_id,"country":"DE","state":"Sachsen","city":"Leipzig","date":DAY.isoformat(),
  "start":"14:00","end":"17:00","title":"Gen Z regelt! Solidarität mit den Protestierenden in Frankreich!",
  "location":"Augustusplatz","route":"",
  "source":"Polizeidirektion Leipzig – amtliche Ankündigung vom 26. Oktober",
  "source_url":URL,"source_status":"Historische, von Polizei Leipzig dokumentierte Versammlung; nicht mehr bevorstehend"}]
def fetch():
 req=urllib.request.Request(URL,headers={"Accept":"text/html","User-Agent":"DemoRadar/1.0 (+https://github.com/PuntaCanada/demoradar)"})
 with urllib.request.urlopen(req,timeout=18) as response:
  if response.status!=200:raise RuntimeError("HTTP "+str(response.status))
  body=response.read(900_000)
  if len(body)<500:raise ValueError("Unexpectedly short official page")
  return body.decode("utf-8","replace")
def main():
 today=dt.datetime.now(dt.timezone.utc).date()
 status={"source":URL,"mode":"verified_historical_one_off","status":"outside_retention","count":0,
  "rights":"Short public facts and attribution only; no police article text/images"}
 found=[]
 if -90<=(today-DAY).days<=30:
  try:
   found=parse(fetch())
   status.update(status="verified_historical_notice" if found else "content_not_verified",count=len(found))
  except Exception as e:status.update(status="unavailable_no_import",error=str(e)[:120])
 data=json.loads(EVENTS.read_text(encoding="utf8"))
 if not isinstance(data.get("events"),list):raise ValueError("No event list")
 previous=[e for e in data["events"] if str(e.get("id","")).startswith("police-leipzig-archive-")]
 existing={e["id"]:e for e in previous if e["date"]>=str(today-dt.timedelta(days=30))}
 for e in found:existing[e["id"]]=e
 other=[e for e in data["events"] if not str(e.get("id","")).startswith("police-leipzig-archive-")]
 merged=sorted(other+list(existing.values()),key=lambda e:(e["date"],e.get("start",""),e["id"]))
 if merged!=data["events"]:
  data["events"]=merged;data["count"]=len(merged)
  EVENTS.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
 previous_status={}
 try:previous_status=json.loads(STATUS.read_text(encoding="utf8"))
 except (OSError,ValueError):pass
 if status!=previous_status:STATUS.write_text(json.dumps(status,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
 print("Leipzig historical official notice:",status["status"],len(found))
if __name__=="__main__":main()
