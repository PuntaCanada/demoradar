#!/usr/bin/env python3
"""Four individually corroborated future Weimar assembly facts, NOT bulk reuse.
The municipal HTML list and individual registrations are linked as evidence;
this importer does not republish the listing or enable a rolling generic feed.
"""
import datetime as dt
import hashlib,json,re,urllib.request
from html.parser import HTMLParser
from pathlib import Path
from zoneinfo import ZoneInfo
URL="https://stadt.weimar.de/de/versammlungsanmeldungen.html"
EVENTS=Path("data/events.json")
STATUS=Path("data/weimar-oneoffs-source.json")
# Manually reviewed against the city's original public list on 2026-11-20.
# Only these four specific dated/time/place event facts may be admitted.
ANNOUNCEMENTS=(
 ("2026-11-22","So","15:00","18:00","Für Frieden und Solidarität mit der Ukraine","Goetheplatz"),
 ("2026-11-23","Mo","19:00","21:00","Bunte Begegnung - Für Demokratie und Toleranz, Mit-Menschlichkeit gegen faschistische Rhetorik und Faschismus","Goetheplatz"),
 ("2026-11-24","Di","16:00","17:00","Frieden schaffen ohne Waffen","Goetheplatz"),
 ("2026-11-25","Mi","15:00","16:00","Bürgerinitiative: Friedenspreis für Kinder und Jugendliche","Goetheplatz"),
)
DAYS=("Mo","Di","Mi","Do","Fr","Sa","So")
class Text(HTMLParser):
 def __init__(self):
  super().__init__(convert_charrefs=True);self.parts=[];self.skip=0
 def handle_starttag(self,tag,attrs):
  if tag in ("script","style","noscript"):self.skip+=1
 def handle_endtag(self,tag):
  if tag in ("script","style","noscript"):self.skip=max(0,self.skip-1)
 def handle_data(self,value):
  if not self.skip:self.parts.append(value)
 @property
 def text(self):return re.sub(r"\s+"," "," ".join(self.parts)).strip()

def parse(html):
 reader=Text();reader.feed(html)
 text=reader.text
 if "Bestätigte Versammlungsanmeldungen in Weimar" not in text:return []
 # Segment rows on complete dates so event titles can't be accidentally
 # borrowed from the next row or unrelated navigation.
 pattern=re.compile(r"\b(Mo|Di|Mi|Do|Fr|Sa|So),\s*(\d{1,2})\.(\d{1,2})\.(\d{2})\b")
 markers=list(pattern.finditer(text))
 if not markers:return []
 windows={}
 for i,m in enumerate(markers):
  try:day=dt.date(2000+int(m[4]),int(m[3]),int(m[2]))
  except ValueError:continue
  if DAYS[day.weekday()]!=m[1]:continue
  slice_=text[m.end():markers[i+1].start() if i+1<len(markers) else len(text)]
  windows.setdefault(day.isoformat(),[]).append((m[1],slice_))
 out=[]
 for iso,weekday,start,end,title,place in ANNOUNCEMENTS:
  date=dt.date.fromisoformat(iso)
  if DAYS[date.weekday()]!=weekday:raise ValueError("Incorrect audited weekday")
  # Match time, original subject, city location together inside the SAME
  # dated announcement. Never use broad substring matching over the whole page.
  escaped=re.escape(title)
  times=re.escape(start)+r"\s+bis\s+"+re.escape(end)+r"\s+Uhr"
  if not any(wd==weekday and re.search(times+r".{0,420}?"+escaped+r".{0,120}?"+re.escape(place),segment,re.I) for wd,segment in windows.get(iso,[])):
   continue
  ident=hashlib.sha256((URL+"|"+iso+"|"+title).encode()).hexdigest()[:16]
  out.append({"id":"weimar-oneoff-"+ident,"country":"DE","state":"Thüringen","city":"Weimar",
   "date":iso,"start":start,"end":end,"title":title,"location":place,"route":"",
   "source":"Stadt Weimar – einzeln geprüfte Versammlungsanmeldung","source_url":URL,
   "source_status":"Amtlich bestätigte Einzelanmeldung; keine automatische Übernahme aller Termine oder Nachnutzungslizenz für Bulk-Daten behauptet"})
 return out

def fetch():
 req=urllib.request.Request(URL,headers={"User-Agent":"DemoRadar/1.0 (+https://github.com/PuntaCanada/demoradar)","Accept":"text/html"})
 with urllib.request.urlopen(req,timeout=18) as response:
  if response.status!=200:raise ValueError("HTTP "+str(response.status))
  data=response.read(900_000)
  if len(data)<400:raise ValueError("Suspiciously short municipal page")
  return data.decode("utf-8","replace")

def update(found,today):
 data=json.loads(EVENTS.read_text(encoding="utf8"))
 if not isinstance(data.get("events"),list):raise ValueError("Missing event records")
 old={e["id"]:e for e in data["events"] if str(e.get("id","")).startswith("weimar-oneoff-")
  and e.get("date","")>=str(today-dt.timedelta(days=30))}
 for e in found:old[e["id"]]=e
 others=[e for e in data["events"] if not str(e.get("id","")).startswith("weimar-oneoff-")]
 merged=sorted(others+list(old.values()),key=lambda e:(e["date"],e.get("start",""),e["id"]))
 if merged!=data["events"]:
  data["events"]=merged
  data["count"]=len(merged)
  EVENTS.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
 return len(old)

def main():
 today=dt.datetime.now(ZoneInfo("Europe/Berlin")).date()
 status={"source":URL,"mode":"fixed_four_independently_verified_one_off_facts","checked_on":today.isoformat(),
  "source_reviewed_on":"2026-11-20","status":"outside_verification_window","count":0,
  "scope":"four individually verified municipal announcements dated 22-25 November 2026, not automatic bulk syndication",
  "rights":"Only factual date/time/place/subject and direct primary link; blanket reuse licence NOT verified"}
 found=[]
 if dt.date(2026,11,19)<=today<=dt.date(2026,12,25):
  try:
   proposed=parse(fetch())
   if len(proposed)==len(ANNOUNCEMENTS):
    # Only 4 exact records together; a changed page cannot silently
    # overwrite partial or inferred event data.
    found=proposed
    status.update(status="verified_individual_oneoffs",count=4)
   else:status.update(status="incomplete_original_no_new_import",count=len(proposed))
  except Exception as error:status.update(status="source_unavailable_no_new_import",error=str(error)[:150])
 update(found,today)
 previous={}
 try:previous=json.loads(STATUS.read_text(encoding="utf8"))
 except (OSError,ValueError):pass
 if previous!=status:STATUS.write_text(json.dumps(status,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
 print("Weimar separately reviewed factual notices:",status["status"],status["count"])
if __name__=="__main__":main()
