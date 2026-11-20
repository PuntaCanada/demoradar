#!/usr/bin/env python3
"""Two reviewed organizer/fachverband one-off assembly notices, NOT government feeds.
Only verified facts, dates and original links; no copyrighted descriptions or media.
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
STATUS=Path("data/potsdam-lindenberg-source.json")
SOURCES=(
 {"id_prefix":"organizer-potsdam","url":"https://www.nbfev.de/event/demonstration/",
  "city":"Potsdam","state":"Brandenburg","date":"2026-11-25","start":"15:00","end":"18:00",
  "title":"Demonstration gegen Gewalt an Frauen – Nauener Tor bis Landtag",
  "location":"Nauener Tor, Potsdam","route":"",
  "source":"Netzwerk der brandenburgischen Frauenhäuser e. V. – Veranstaltungshinweis",
  "source_status":"Von Fachverband veröffentlichte Demonstration; städtische Gleichstellungsbeauftragte als Mitinitiatorin genannt. Keine amtliche Polizeianmeldung oder lizenzierter Demo-Feed nachgewiesen.",
  "required":("Netzwerk der brandenburgischen Frauenhäuser","Demonstration","November 25","15:00","18:00","Nauener Tor","Landtag","Gleichstellungsbeauftragte der Stadt Potsdam","Potsdam"),
  "date_evidence":r"(?:2026-11-25|November\s+25\b)",
  "time_evidence":r"(?:November\s+25.{0,120}?15:00\s*[-–]\s*18:00|15:00\s*[-–]\s*18:00)",
  "context":"Organizing women's shelter network event notice + municipality co-initiator; not official assembly authority."},
 {"id_prefix":"organizer-lindenberg","url":"https://gruene.li/termine/termin/alice-weidel-raus-aus-lindenberg",
  "city":"Lindenberg im Allgäu","state":"Bayern","date":"2026-11-29","start":"11:00","end":"",
  "title":"Alice Weidel raus aus Lindenberg! – Gegenkundgebung",
  "location":"Stadtplatz, Lindenberg im Allgäu","route":"",
  "source":"BÜNDNIS 90/DIE GRÜNEN Landkreis Lindau – Veranstaltungsankündigung",
  "source_status":"Von regionalem politischem Kreisverband angekündigte öffentliche Kundgebung; keine amtliche Versammlungsanmeldung oder lizenzierter behördlicher Terminfeed nachgewiesen.",
  "required":("BÜNDNIS 90/DIE GRÜNEN","Landkreis Lindau","Alice Weidel raus aus Lindenberg!","29.11.2026","11:00","Stadtplatz Lindenberg","OAT Westallgäu"),
  "date_evidence":r"29\.11\.2026",
  "time_evidence":r"11:00\s*[-–]\s*Offenes Ende",
  "context":"Regional party original event listing and explicitly named organizer; not a police or municipal announcement."}
)

class Text(HTMLParser):
 def __init__(self):
  super().__init__(convert_charrefs=True)
  self.parts=[]
  self.skip=0
 def handle_starttag(self,tag,attrs):
  if tag in ("script","style","noscript"):self.skip+=1
 def handle_endtag(self,tag):
  if tag in ("script","style","noscript"):self.skip=max(0,self.skip-1)
 def handle_data(self,val):
  if not self.skip:self.parts.append(val)
 @property
 def text(self):
  return re.sub(r"\s+"," "," ".join(self.parts)).strip()

def parse(item,html):
 p=Text();p.feed(html)
 body=p.text
 # Every field must be explicit on the ORIGINAL non-government event page.
 # No general calendar import, guessed venue or recurrent-event expansion.
 if not all(re.search(r"\s+".join(map(re.escape,term.split())),body,re.I) for term in item["required"]):return None
 if not re.search(item["date_evidence"],body,re.I):return None
 if not re.search(item["time_evidence"],body,re.I):return None
 # The identity is fixed; no item discovered via user-submitted or third-party feeds.
 ident=hashlib.sha256((item["url"]+"|"+item["date"]+"|"+item["title"]).encode()).hexdigest()[:16]
 return {"id":item["id_prefix"]+"-"+ident,"country":"DE","state":item["state"],"city":item["city"],
  "date":item["date"],"start":item["start"],"end":item["end"],"title":item["title"],
  "location":item["location"],"route":item["route"],"source":item["source"],
  "source_url":item["url"],"source_status":item["source_status"]}

def fetch(item):
 req=urllib.request.Request(item["url"],headers={"User-Agent":"DemoRadar/1.0 (+https://github.com/PuntaCanada/demoradar)","Accept":"text/html"})
 with urllib.request.urlopen(req,timeout=16) as resp:
  if resp.status!=200:raise ValueError("HTTP "+str(resp.status))
  body=resp.read(900_001)
  if not (450<=len(body)<=900_000):raise ValueError("HTML body missing or exceeds safe limit")
  return body.decode("utf-8","replace")

def update(found,today):
 data=json.loads(EVENTS.read_text(encoding="utf8"))
 if not isinstance(data.get("events"),list):raise ValueError("Invalid existing event list")
 prefixes=tuple(x["id_prefix"]+"-" for x in SOURCES)
 retained={e["id"]:e for e in data["events"] if str(e.get("id","")).startswith(prefixes) and
  e.get("date","")>=str(today-dt.timedelta(days=30))}
 for item in found:retained[item["id"]]=item
 others=[e for e in data["events"] if not str(e.get("id","")).startswith(prefixes)]
 merged=sorted(others+list(retained.values()),key=lambda e:(e["date"],e.get("start",""),e["id"]))
 if merged!=data["events"]:
  data["events"]=merged
  data["count"]=len(merged)
  EVENTS.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
 return len(retained)

def main():
 today=dt.datetime.now(ZoneInfo("Europe/Berlin")).date()
 reports=[]
 found=[]
 for item in SOURCES:
  day=dt.date.fromisoformat(item["date"])
  report={"city":item["city"],"state":item["state"],"source":item["url"],
   "status":"outside_review_window","count":0,"checked_on":today.isoformat(),
   "source_type":"independent_organizer_or_specialist_original_one_off",
   "rights":"Individual short factual event fields with a link to original. No blanket bulk reuse or official assembly registration claimed."}
  if day-dt.timedelta(days=14)<=today<=day+dt.timedelta(days=30):
   try:
    match=parse(item,fetch(item))
    if match:
     found.append(match)
     report["status"]="verified_organizer_one_off"
     report["count"]=1
    else:report["status"]="original_content_unverified_no_import"
   except Exception as exc:
    report["status"]="original_unreachable_no_import"
    report["error"]=str(exc)[:145]
  reports.append(report)
 update(found,today)
 result={"version":1,"checks":reports}
 previous={}
 try:previous=json.loads(STATUS.read_text(encoding="utf8"))
 except (OSError,ValueError):pass
 if result!=previous:
  STATUS.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
 print("Potsdam/Lindenberg individually verified event counts:",[(x["city"],x["status"],x["count"]) for x in reports])

if __name__=="__main__":main()
