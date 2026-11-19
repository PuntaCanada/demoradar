#!/usr/bin/env python3
"""Only explicitly dated, sourced event facts from one verified Leipzig police notice.

Never treat a press page as an exhaustive assembly register. The original
publisher retains its text/images: DemoRadar stores only the public date,
time, subject, place, attribution and original-source URL.
"""
import datetime as dt
import hashlib
import json
import re
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

URL="https://www.polizei.sachsen.de/de/einsatz-anlaesslich-des-schuelerstreiks-und-des-protestes-der-generation-z-am-20-november-2026-44497.html"
EVENTS=Path("data/events.json")
STATUS=Path("data/leipzig-police-source.json")
EVENT_DAY=dt.date(2026,11,20)
class Text(HTMLParser):
 def __init__(self):super().__init__(convert_charrefs=True);self.parts=[];self.skip=0
 def handle_starttag(self,tag,attrs):
  if tag in ("script","style","noscript"):self.skip+=1
  if tag in ("p","h1","h2","h3","li","div","br"):self.parts.append("\n")
 def handle_endtag(self,tag):
  if tag in ("script","style","noscript"):self.skip=max(0,self.skip-1)
  if tag in ("p","h1","h2","h3","li","div"):self.parts.append("\n")
 def handle_data(self,data):
  if not self.skip:self.parts.append(data)
 @property
 def text(self):return re.sub(r"\s+"," "," ".join(self.parts)).strip()
def fetch():
 req=urllib.request.Request(URL,headers={"Accept":"text/html","User-Agent":"DemoRadar/1.0 (+https://github.com/PuntaCanada/demoradar)"})
 with urllib.request.urlopen(req,timeout=18) as res:
  if res.status!=200:raise ValueError("HTTP "+str(res.status))
  body=res.read(700_000)
  if len(body)<600:raise ValueError("Unexpectedly short official police page")
  return body.decode("utf-8","replace")
def parse(html):
 p=Text();p.feed(html);s=p.text
 # Both source/publisher and event date must appear in the actual downloaded
 # original notice, not solely in our preconfigured record.
 if "Polizeidirektion Leipzig" not in s or not re.search(r"20\. November 2026",s):
  return []
 if "17. November" not in s or "Versammlungsbehörde" not in s:return []
 first=re.search(r'Internationaler Schulstreik gegen die Wehrpflicht.{0,170}?10:00 Uhr bis 16:45 Uhr',s,re.I)
 second=re.search(r'17:00 Uhr bis 21:00 Uhr.{0,170}?Gen Z regelt',s,re.I)
 if not first and not second:return []
 def record(title,start,end,location):
  identifier=hashlib.sha256((URL+"|"+title).encode()).hexdigest()[:16]
  return {"id":"police-leipzig-"+identifier,"country":"DE","state":"Sachsen","city":"Leipzig",
   "date":EVENT_DAY.isoformat(),"start":start,"end":end,"title":title,
   "location":location,"route":"","source":"Polizeidirektion Leipzig – amtliche Ankündigung",
   "source_url":URL,"source_status":"Bei der Versammlungsbehörde angezeigt; keine Vollständigkeitsgarantie"}
 out=[]
 if first and "kleinen Wilhelm-Leuschner-Platz" in s:
  out.append(record("Internationaler Schulstreik gegen die Wehrpflicht","10:00","16:45","Kleiner Wilhelm-Leuschner-Platz"))
 if second and "kleinen Wilhelm-Leuschner-Platz" in s:
  out.append(record("Gen Z regelt","17:00","21:00","Kleiner Wilhelm-Leuschner-Platz"))
 return out
def main():
 now=dt.datetime.now(dt.timezone.utc)
 age=(now.date()-EVENT_DAY).days
 report={"source":URL,"mode":"strict_original_police_notice","status":"unavailable_or_not_checked",
  "count":0,"rights":"Factual event fields with citation only; no press article/images republished"}
 try:
  if age>30 or age < -90:
   report["status"]="outside_retention_window"
  else:
   found=parse(fetch())
   if not found:report["status"]="unverified_format_no_import"
   else:report.update(status="verified_notice",count=len(found))
 except Exception as exc:
  found=[]
  report.update(status="unavailable_no_import",error=str(exc)[:130])
 else:
  if age>30 or age < -90:found=[]
 data=json.loads(EVENTS.read_text(encoding="utf8"))
 if not isinstance(data.get("events"),list):raise ValueError("Official events data unavailable")
 existing={e["id"]:e for e in data["events"] if str(e.get("id","")).startswith("police-leipzig-")}
 for e in found:existing[e["id"]]=e
 existing={key:e for key,e in existing.items() if e["date"]>=str(now.date()-dt.timedelta(days=30))}
 other=[e for e in data["events"] if not str(e.get("id","")).startswith("police-leipzig-")]
 merged=sorted(other+list(existing.values()),key=lambda e:(e["date"],e.get("start",""),e["id"]))
 if merged!=data["events"]:
  data["events"]=merged;data["count"]=len(merged)
  EVENTS.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
 previous={}
 try:previous=json.loads(STATUS.read_text(encoding="utf8"))
 except (OSError,ValueError):pass
 if report!=previous:STATUS.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
 print("Leipzig official notice:",report["status"],report["count"],"verified facts")
if __name__=="__main__":main()
