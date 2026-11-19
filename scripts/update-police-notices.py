#!/usr/bin/env python3
"""Import ONLY factual details from an explicitly allowlisted, official police press notice.

No general news scraping, invented police registrations, or copying of articles.
The police's verified original publication is linked; the final assembly location
for the 20 November Cologne event is NOT treated as settled by this notice.
"""
import datetime as dt
import hashlib
import json
import re
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

EVENTS=Path("data/events.json")
STATUS=Path("data/police-notices-source.json")
NOTICES=(
 {"url":"https://www.presseportal.de/blaulicht/pm/12415/6393559",
  "publisher":"Polizei Köln","city":"Köln","state":"Nordrhein-Westfalen",
  "notice_date":"2026-11-19","event_date":"2026-11-20",
  "status":"verified_police_original_19_nov_2026"},
)
class Text(HTMLParser):
 def __init__(self):super().__init__(convert_charrefs=True);self.parts=[];self.skip=0
 def handle_starttag(self,tag,attrs):
  if tag in ("script","style","noscript"):self.skip+=1
  if tag in ("p","div","h1","h2","h3","br","li"):self.parts.append("\n")
 def handle_endtag(self,tag):
  if tag in ("script","style","noscript"):self.skip=max(0,self.skip-1)
  if tag in ("p","div","h1","h2","h3","li"):self.parts.append("\n")
 def handle_data(self,data):
  if not self.skip:self.parts.append(data)
 @property
 def text(self):return re.sub(r"\s+"," "," ".join(self.parts)).strip()
def get(url):
 if not url.startswith("https://www.presseportal.de/blaulicht/pm/12415/"):
  raise ValueError("Only allowlisted original police publisher pages")
 req=urllib.request.Request(url,headers={"User-Agent":"DemoRadar/1.0 (+https://github.com/PuntaCanada/demoradar)","Accept":"text/html"})
 with urllib.request.urlopen(req,timeout=18) as r:
  if r.status!=200:raise RuntimeError("HTTP "+str(r.status))
  payload=r.read(600_000)
  if len(payload)<500:raise ValueError("Response unexpectedly short")
  return payload.decode("utf-8","replace")
def parse_notice(html,notice):
 text_reader=Text();text_reader.feed(html)
 s=text_reader.text
 # The source date and announcement must both be explicitly present.
 if not re.search(r"19\.11\.2026",s) or not re.search(r"Freitag\s*\(20\.\s*November\)",s,re.I):
  return []
 if "Polizei Köln" not in s or "Versammlungen am Freitag" not in s:return []
 # Verify each exact assembly separately; no inference from unrelated paragraphs.
 first=re.search(r'Für Freitag\s*\(20\.\s*November\).*?Gen Z regelt Köln.*?Unsere Zukunft liegt in unseren Händen',s,re.I)
 first_time=re.search(r'Die Veranstaltung ist von\s*(13)\s*bis\s*(19)\s*Uhr\s*angesetzt',s,re.I)
 second=re.search(r'Schulstreik gegen die Wehrpflicht',s,re.I)
 second_time=re.search(r'Für den Zeitraum von\s*(11)\s*bis\s*(16)\s*Uhr',s,re.I)
 confirmed=re.search(r'Die Versammlung ist bereits Ende Oktober bestätigt worden',s,re.I)
 events=[]
 def build(label,start,end,qualifier):
  idcode=hashlib.sha256((notice["url"]+"|"+label).encode()).hexdigest()[:16]
  return {"id":"police-cologne-"+idcode,"country":"DE","state":"Nordrhein-Westfalen",
   "city":"Köln","date":notice["event_date"],"start":start,"end":end,
   "title":label,"location":"","route":"",
   "source":"Polizei Köln – amtliche Pressemitteilung",
   "source_url":notice["url"],"source_status":qualifier}
 if first and first_time:
  events.append(build("Unsere Zukunft liegt in unseren Händen (Gen Z regelt Köln)",
   first_time[1]+":00",first_time[2]+":00",
   "Bei der Polizei angezeigt; Veranstaltungsort und Route in Abstimmung, keine abschließende Bestätigung aus dieser Quelle"))
 if second and second_time and confirmed:
  events.append(build("Schulstreik gegen die Wehrpflicht",
   second_time[1]+":00",second_time[2]+":00",
   "Laut Polizei bereits Ende Oktober bestätigt; Route kann sich ändern"))
 return events
def main():
 today=dt.datetime.now(dt.timezone.utc).date()
 report={"mode":"allowlisted_police_press_facts_only","checked_at":dt.datetime.now(dt.timezone.utc).isoformat(),
  "sources":[],"imported":0,"rights":"Only unprotected factual title/date/time/attribution extracted; no article text/images reused"}
 data=json.loads(EVENTS.read_text(encoding="utf-8"))
 if not isinstance(data.get("events"),list):raise ValueError("Invalid official events file")
 found=[]
 for notice in NOTICES:
  record={"url":notice["url"],"status":"not_checked","count":0}
  try:
   age=(today-dt.date.fromisoformat(notice["event_date"])).days
   if age>30 or age< -90:
    record["status"]="outside_retention_window"
   else:
    parsed=parse_notice(get(notice["url"]),notice)
    if not parsed:record["status"]="unverified_content_no_import"
    else:
     found.extend(parsed)
     record.update(status="verified_notice",count=len(parsed))
  except Exception as ex:
   record.update(status="unavailable_no_import",error=str(ex)[:130])
  report["sources"].append(record)
 existing={e["id"]:e for e in data["events"] if str(e.get("id","")).startswith("police-cologne-")}
 for e in found:existing[e["id"]]=e
 # On network failures retain previously verified entries temporarily; never
 # create a newly inferred record or call the lack of a page a cancellation.
 existing={k:e for k,e in existing.items()
  if e["date"]>=str(today-dt.timedelta(days=30))}
 others=[e for e in data["events"] if not str(e.get("id","")).startswith("police-cologne-")]
 combined=sorted(others+list(existing.values()),key=lambda e:(e["date"],e.get("start",""),e["id"]))
 if combined!=data["events"]:
  data["events"]=combined
  data["count"]=len(combined)
  EVENTS.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 report["imported"]=len(found)
 # Avoid producing a new commit on every run purely from a timestamp.
 prev={}
 try:prev=json.loads(STATUS.read_text(encoding="utf-8"))
 except (OSError,ValueError):pass
 if prev.get("sources")!=report["sources"] or prev.get("imported")!=report["imported"]:
  STATUS.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print("Official Cologne police notices:",report["imported"],"verified event facts")
if __name__=="__main__":main()
