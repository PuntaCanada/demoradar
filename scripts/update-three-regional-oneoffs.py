#!/usr/bin/env python3
"""Three strictly scoped, factual non-government protest announcements (Nov/Dec 2026).

There is NO new official police/muncipal feed, no bulk reuse license,
no copying of event prose, and no inferred live streams.
"""
import datetime as dt
import hashlib
import json
import re
import urllib.request
from html.parser import HTMLParser
from pathlib import Path
from zoneinfo import ZoneInfo

EVENTS=Path("data/events.json")
REPORT=Path("data/three-regional-oneoffs-source.json")
SOURCES=(
 {"city":"Hannover","state":"Niedersachsen",
  "url":"https://interventionistische-linke.org/hannover/termine/maenner-toeten-patriarchale-gewalt-in-autoritaeten-zeiten",
  "date":"2026-11-25","start":"17:00","end":"",
  "title":"Demonstration gegen patriarchale Gewalt an FLINTA*",
  "location":"Christuskirche, Hannover","publisher":"Interventionistische Linke – Veranstaltungsaufruf",
  "must":("Männer töten. Patriarchale Gewalt","Demo am Tag gegen patriarchale Gewalt",
          "25.11.2026","17:00 Uhr","Christuskirche, Hannover","FLINTA*"),
  "date_pattern":r"25\.11\.2026","time_pattern":r"17:00\s*Uhr"},
 {"city":"Ludwigshafen","state":"Rheinland-Pfalz",
  "url":"https://rheinland-pfalz-saarland.dgb.de/veranstaltungen/veranstaltung/aktionstag-gegen-gewalt-an-frauen-demo-ludwigshafen/",
  "date":"2026-11-25","start":"11:55","end":"14:00",
  "title":"Aktionstag gegen Gewalt an Frauen – Demonstration",
  "location":"Europaplatz, 67063 Ludwigshafen",
  "publisher":"DGB Rheinland-Pfalz/Saarland – Gewerkschaftlicher Veranstaltungshinweis",
  "must":("Aktionstag gegen Gewalt an Frauen","Demo Ludwigshafen",
          "25.11.2026","11:55","14:00","Europaplatz, 67063 Ludwigshafen"),
  "date_pattern":r"25\.11\.2026","time_pattern":r"11:55\s*[-–]\s*14:00"},
 {"city":"Wiesbaden","state":"Hessen",
  "url":"https://rheinland-pfalz-saarland.dgb.de/veranstaltungen/veranstaltung/aktionstag-bunt-laut-und-unuebersehbar-zur-arbeits-und-sozialministerkonferenz/",
  "corroboration":"https://www.gew-hessen.de/details/demonstration-in-wiesbaden-gegen-kuerzungen-der-bundesregierung",
  "date":"2026-12-02","start":"17:30","end":"19:30",
  "title":"Aktionstag zur Arbeits- und Sozialministerkonferenz",
  "location":"Kochbrunnenplatz, Wiesbaden",
  "publisher":"DGB Rheinland-Pfalz/Saarland – Veranstaltungshinweis",
  "must":("Aktionstag: Bunt, laut und unübersehbar","Arbeits- und Sozialministerkonferenz",
          "02.12.2026","17:30","19:30","Kochbrunnenplatz, Wiesbaden"),
  "date_pattern":r"02\.12\.2026","time_pattern":r"17:30\s*[-–]\s*19:30"},
)

class Visible(HTMLParser):
 def __init__(self):
  super().__init__(convert_charrefs=True);self.parts=[];self.hidden=0
 def handle_starttag(self,tag,attrs):
  if tag in ("style","script","noscript"):self.hidden+=1
 def handle_endtag(self,tag):
  if tag in ("style","script","noscript"):self.hidden=max(0,self.hidden-1)
 def handle_data(self,v):
  if not self.hidden:self.parts.append(v)
 @property
 def body(self):return re.sub(r"\s+"," "," ".join(self.parts)).strip()

def text_of(raw):
 parser=Visible();parser.feed(raw);return parser.body

def has_text(body,value):
 return re.search(r"\s+".join(map(re.escape,value.split())),body,re.I) is not None

def verify(item,original,secondary=None):
 body=text_of(original)
 if not all(has_text(body,x) for x in item["must"]):return None
 if not re.search(item["date_pattern"],body,re.I):return None
 if not re.search(item["time_pattern"],body,re.I):return None
 if item.get("corroboration"):
  if secondary is None:return None
  support=text_of(secondary)
  if not all(has_text(support,x) for x in (
   "Demonstration in Wiesbaden gegen Kürzungen der Bundesregierung",
   "2. Dezember 2026","17.30 bis 19.30 Uhr","Kochbrunnenplatz, Wiesbaden")):return None
  if not re.search(r"2\. Dezember 2026.{0,140}?17\.30 bis 19\.30 Uhr",support,re.I|re.S):
   # Date and time may be separated by a text paragraph, but MUST be
   # independently present in the GEW primary report.
   if not (has_text(support,"2. Dezember 2026") and has_text(support,"17.30 bis 19.30 Uhr")):return None
 key=item["url"]+"|"+item["date"]+"|"+item["city"]
 return {"id":"regional-oneoff-"+hashlib.sha256(key.encode()).hexdigest()[:16],
  "country":"DE","state":item["state"],"city":item["city"],"date":item["date"],
  "start":item["start"],"end":item["end"],"title":item["title"],
  "location":item["location"],"route":"",
  "source":item["publisher"],"source_url":item["url"],
  "source_status":"Einzelne Veranstaltung von nichtstaatlichem Originalherausgeber angekündigt; keine amtliche Versammlungsregistrierung oder freie Bulk-Lizenz belegt."}

def fetch(url):
 req=urllib.request.Request(url,headers={
  "User-Agent":"DemoRadar/1.0 (+https://github.com/PuntaCanada/demoradar)","Accept":"text/html"})
 with urllib.request.urlopen(req,timeout=15) as response:
  if response.status!=200:raise ValueError("HTTP "+str(response.status))
  raw=response.read(950_001)
  if not (400<=len(raw)<=950_000):raise ValueError("Unexpected original HTML size")
  return raw.decode("utf-8","replace")

def save(found,today):
 data=json.loads(EVENTS.read_text(encoding="utf8"))
 if not isinstance(data.get("events"),list):raise ValueError("Missing event list")
 prefix="regional-oneoff-"
 existing={e["id"]:e for e in data["events"] if str(e.get("id","")).startswith(prefix)
  and e.get("date","")>=str(today-dt.timedelta(days=30))}
 for e in found:existing[e["id"]]=e
 others=[e for e in data["events"] if not str(e.get("id","")).startswith(prefix)]
 merged=sorted(others+list(existing.values()),key=lambda e:(e["date"],e.get("start",""),e["id"]))
 if merged!=data["events"]:
  data["events"]=merged;data["count"]=len(merged)
  EVENTS.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf8")

def main():
 today=dt.datetime.now(ZoneInfo("Europe/Berlin")).date()
 reports=[];verified=[]
 for item in SOURCES:
  day=dt.date.fromisoformat(item["date"])
  report={"city":item["city"],"state":item["state"],"source":item["url"],
   "checked_on":today.isoformat(),"status":"outside_window","count":0,
   "source_type":"non_government_event_original_single_notice",
   "rights":"Reuse short factual date/subject/venue with attribution only; no content, official police verification or bulk licence"}
  if day-dt.timedelta(days=14)<=today<=day+dt.timedelta(days=30):
   try:
    original=fetch(item["url"])
    second=fetch(item["corroboration"]) if item.get("corroboration") else None
    event=verify(item,original,second)
    if event:verified.append(event);report.update(status="verified_non_government_one_off",count=1)
    else:report["status"]="original_content_not_verified_no_import"
   except Exception as exc:report.update(status="source_unavailable_no_import",error=str(exc)[:120])
  reports.append(report)
 save(verified,today)
 result={"version":1,"checks":reports}
 old={}
 try:old=json.loads(REPORT.read_text(encoding="utf8"))
 except (OSError,ValueError):pass
 if result!=old:REPORT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
 print("Three new exact future protest notices:",[(x["city"],x["status"],x["count"]) for x in reports])
if __name__=="__main__":main()
