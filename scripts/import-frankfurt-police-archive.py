#!/usr/bin/env python3
"""Allowlisted original police announcement of two explicitly identified 14 Nov 2026 events.

Historical event facts only. A second unspecified rally is NOT imported.
Never interpret police deployment times as protest start/end times.
"""
import datetime as dt
import hashlib
import json
import re
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

URL="https://www.presseportal.de/blaulicht/pm/4970/6390267"
DAY=dt.date(2026,11,14)
EVENTS=Path("data/events.json")
STATUS=Path("data/frankfurt-police-archive-source.json")
class Text(HTMLParser):
 def __init__(self):super().__init__(convert_charrefs=True);self.parts=[];self.skip=0
 def handle_starttag(self,tag,attrs):
  if tag in ("script","style","noscript"):self.skip+=1
 def handle_endtag(self,tag):
  if tag in ("script","style","noscript"):self.skip=max(0,self.skip-1)
 def handle_data(self,v):
  if not self.skip:self.parts.append(v)
 @property
 def text(self):return re.sub(r"\s+"," "," ".join(self.parts)).strip()
def parse(html):
 doc=Text();doc.feed(html);s=doc.text
 if "Polizeipräsidium Frankfurt am Main" not in s or "13.11.2026" not in s:return []
 if not re.search(r"kommenden Samstag\s*\(14\.\s*November\s*2026\)",s):return []
 def event(title,start,end,place):
  return {"id":"police-frankfurt-archive-"+hashlib.sha256((URL+"|"+title).encode()).hexdigest()[:16],
   "country":"DE","state":"Hessen","city":"Frankfurt am Main","date":DAY.isoformat(),
   "start":start,"end":end,"title":title,"location":place,"route":"",
   "source":"Polizeipräsidium Frankfurt am Main – amtliche Originalmeldung","source_url":URL,
   "source_status":"Historische, ausdrücklich angekündigte Kundgebung; keine komplette Versammlungsliste"}
 out=[]
 if re.search(r"zwischen\s*12:30\s*Uhr\s*und\s*15:00\s*Uhr\s*an\s*der\s*Hauptwache",s) and "Gen Z regelt" in s:
  out.append(event("Gen Z regelt – Kundgebung an der Hauptwache","12:30","15:00","Hauptwache"))
 if re.search(r"Aufzug\s*mit\s*1000\s*erwarteten\s*Teilnehmenden\s*im\s*Zusammenhang\s*mit\s*dem\s*aktuellen\s*Irankonflikt",s) and re.search(r"beginnt\s*um\s*16:00\s*Uhr\s*am\s*Goetheplatz\s*und\s*endet\s*gegen\s*19:00\s*Uhr\s*wieder\s*dort",s):
  out.append(event("Aufzug im Zusammenhang mit dem Irankonflikt","16:00","19:00","Goetheplatz"))
 return out
def fetch():
 req=urllib.request.Request(URL,headers={"User-Agent":"DemoRadar/1.0 (+https://github.com/PuntaCanada/demoradar)","Accept":"text/html"})
 with urllib.request.urlopen(req,timeout=18) as r:
  if r.status!=200:raise ValueError("HTTP "+str(r.status))
  p=r.read(750_000)
  if len(p)<500:raise ValueError("Source too short")
  return p.decode("utf8","replace")
def main():
 today=dt.datetime.now(dt.timezone.utc).date()
 result={"source":URL,"mode":"verified_police_archival_facts","status":"outside_retention","count":0,
  "rights":"Only date, time, location, publisher and short factual subject; article content/images not republished"}
 found=[]
 if -90<=(today-DAY).days<=30:
  try:
   found=parse(fetch());result.update(status="verified_historical_notice" if found else "unverified_no_import",count=len(found))
  except Exception as e:result.update(status="unavailable_no_import",error=str(e)[:120])
 data=json.loads(EVENTS.read_text(encoding="utf8"))
 if not isinstance(data.get("events"),list):raise ValueError("Invalid events JSON")
 current={e["id"]:e for e in data["events"] if str(e.get("id","")).startswith("police-frankfurt-archive-") and e.get("date","")>=str(today-dt.timedelta(days=30))}
 for e in found:current[e["id"]]=e
 other=[e for e in data["events"] if not str(e.get("id","")).startswith("police-frankfurt-archive-")]
 combined=sorted(other+list(current.values()),key=lambda e:(e["date"],e.get("start",""),e["id"]))
 if combined!=data["events"]:
  data["events"]=combined;data["count"]=len(combined)
  EVENTS.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
 prev={}
 try:prev=json.loads(STATUS.read_text(encoding="utf8"))
 except (OSError,ValueError):pass
 if prev!=result:STATUS.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
 print("Frankfurt police history:",result["status"],len(found))
if __name__=="__main__":main()
