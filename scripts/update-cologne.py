#!/usr/bin/env python3
"""Conservative Cologne city traffic-calendar importer.
Reads only official city event pages linked from its own traffic calendar.
Publishes factual date, time and venue with source link; never copies articles.
If a page format is ambiguous, fail closed and retain previous event records.
No claim of an open licence for the municipal HTML page is made.
"""
import datetime as dt
import hashlib
import json
import re
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

ROOT="https://www.stadt-koeln.de"
INDEX=ROOT+"/leben-in-koeln/verkehr/verkehrskalender/index.html"
FILE=Path("data/events.json")
STATUS=Path("data/cologne-source.json")
PATTERN=re.compile(r"\b(demonstration|kundgebung|mahnwache|versammlung(?:\s+mit\s+aufzug)?|protestzug)\b",re.I)
DATE=re.compile(r"\b(\d{1,2})\.(\d{1,2})\.(20\d{2})\b")
TIME=re.compile(r"\b(?:von\s+)?(\d{1,2}):(\d{2})\s*(?:bis|[-–])\s*(\d{1,2}):(\d{2})\s*Uhr\b",re.I)
START=re.compile(r"\b(?:ab|beginn|auftakt)\s*:?\s*(\d{1,2})(?::(\d{2}))?\s*Uhr\b",re.I)
ROUTE=re.compile(r"(?:Aufzugstrecke|Aufzugsstrecke|Aufzugsweg|Der Aufzugsweg führt über folgende Strecke)\s*:\s*([^\n]{10,450})",re.I)
MAX_LINKS=120
def clean(value):return re.sub(r"\s+"," ",str(value or "")).strip()
class Page(HTMLParser):
 def __init__(self):
  super().__init__(convert_charrefs=True);self.links=[];self.parts=[];self.hide=0;self.anchor=None
 def handle_starttag(self,tag,attrs):
  attrs=dict(attrs)
  if tag in ("script","style","noscript"):self.hide+=1
  if tag=="a":self.anchor=[attrs.get("href",""),[]]
  if tag in ("p","h1","h2","h3","h4","li","div","tr","br","dt","dd"):self.parts.append("\n")
 def handle_endtag(self,tag):
  if tag in ("script","style","noscript"):self.hide=max(0,self.hide-1)
  if tag=="a" and self.anchor:
   url,text=self.anchor
   self.links.append((url,clean("".join(text))))
   self.anchor=None
  if tag in ("p","h1","h2","h3","h4","li","div","tr","dt","dd"):self.parts.append("\n")
 def handle_data(self,data):
  if self.hide:return
  self.parts.append(data)
  if self.anchor:self.anchor[1].append(data)
 @property
 def text(self):return "\n".join(clean(x) for x in "".join(self.parts).splitlines() if clean(x))
def fetch(url):
 req=urllib.request.Request(url,headers={"Accept":"text/html","User-Agent":"DemoRadar/1.0 (source-based civic events; github.com/PuntaCanada/demoradar)"})
 with urllib.request.urlopen(req,timeout=18) as resp:
  if resp.status!=200:raise ValueError("HTTP "+str(resp.status))
  body=resp.read(2_000_000)
  if len(body)<500:raise ValueError("Response is too short")
  return body.decode("utf-8","replace")
def candidate_links(page):
 # Only same-origin dedicated Cologne traffic-calendar detail pages, never citywide search results.
 found={}
 for href,label in page.links:
  url=urllib.parse.urljoin(INDEX,href)
  parsed=urllib.parse.urlparse(url)
  if parsed.hostname!="www.stadt-koeln.de":continue
  if not parsed.path.startswith("/leben-in-koeln/verkehr/verkehrskalender/"):continue
  if parsed.path.endswith(("/","/index.html")):continue
  if not PATTERN.search(label+" "+parsed.path.replace("-"," ")):continue
  found[url.split("#")[0]]=label
 return list(found)[:MAX_LINKS]
def parse_detail(url,raw,today):
 p=Page();p.feed(raw)
 text=p.text
 # Only explicit protest descriptions, not generic city traffic disruptions.
 if not PATTERN.search(text[-8000:]):return None
 m=DATE.search(text)
 if not m:return None
 try:date=dt.date(int(m[3]),int(m[2]),int(m[1]))
 except ValueError:return None
 if not today-dt.timedelta(days=30)<=date<=today+dt.timedelta(days=90):return None
 t=TIME.search(text)
 start=f"{int(t[1]):02d}:{t[2]}" if t else ""
 end=f"{int(t[3]):02d}:{t[4]}" if t else ""
 if not start:
  st=START.search(text)
  if st:start=f"{int(st[1]):02d}:{st[2] or '00'}"
 if not start:return None
 title=next((line for line in text.splitlines() if PATTERN.search(line) and len(line)<150),"")
 # Standard city heading is generic, avoid inventing a political topic.
 title=title or "Versammlung / Demonstration"
 if "Verkehrskalender" in title:title="Versammlung / Demonstration"
 location=""
 startloc=re.search(r"\b(?:Auftakt|Beginn des Aufzugs)\s*:\s*(?:\d{1,2}(?::\d{2})?\s*Uhr?,?\s*)?([^\n]{5,130})",text,re.I)
 if startloc:location=clean(startloc[1])
 route=""
 route_match=ROUTE.search(text)
 if route_match:route=clean(route_match[1])[:300]
 # Stable ID comes from canonical city URL, not time/location that can change.
 ident=hashlib.sha256(url.encode()).hexdigest()[:16]
 return {"id":"cologne-"+ident,"country":"DE","state":"Nordrhein-Westfalen","city":"Köln","date":date.isoformat(),"start":start,"end":end,"title":title[:170],"postal_code":"","location":location[:150],"route":route,"source":"Stadt Köln – Verkehrskalender","source_url":url,"source_status":"amtliche Verkehrsinformation (keine vollständige Versammlungsliste)"}
def main():
 status={"source":INDEX,"mode":"conservative_factual_extraction","licence":"No blanket open-data licence verified for the city HTML; reuse only unprotected factual details with direct attribution.","status":"unavailable","count":0}
 try:
  # City calendar is alphabetically paginated (ten rows per page). Scanning
  # only the first page would systematically miss "Demonstration" and "Versammlung".
  # Limit to at most twelve pages, stop early when a page has no new items.
  links=[]
  pages_checked=0
  for offset in range(0,120,10):
   url=INDEX if offset==0 else INDEX+"?start="+str(offset)
   try:
    index=Page();index.feed(fetch(url))
    pages_checked+=1
    links.extend(candidate_links(index))
    # Last page has fewer than ten matching detail links, excluding navigation.
    detail_paths=[urllib.parse.urlparse(urllib.parse.urljoin(INDEX,h)).path for h,_ in index.links]
    if offset>0 and not any("/leben-in-koeln/verkehr/verkehrskalender/" in q and not q.endswith(("index.html","/")) for q in detail_paths):break
   except Exception as ex:
    if offset==0:raise
    print("Cologne pagination page unavailable:",offset,str(ex)[:90])
    break
  links=list(dict.fromkeys(links))[:MAX_LINKS]
  if not links:
   status.update(status="reachable_no_matching_detail_links",count=0,links_inspected=0,pages_checked=pages_checked)
   raise LookupError("No clearly labelled demonstrations on sampled calendar page; no import")
  now=dt.date.today()
  found=[]
  for url in links:
   try:
    event=parse_detail(url,fetch(url),now)
    if event:found.append(event)
   except Exception as exc:print("Skipping Cologne detail:",str(exc)[:100])
  # Empty is legitimate when all published city calendar links are past; don't remove historical entries in that case.
  data=json.loads(FILE.read_text(encoding="utf-8"))
  if not isinstance(data.get("events"),list):raise ValueError("Missing official event data")
  prev=[e for e in data["events"] if not str(e.get("id","")).startswith("cologne-")]
  existing={e["id"]:e for e in data["events"] if str(e.get("id","")).startswith("cologne-")}
  for event in found:existing[event["id"]]=event
  # Retain recent but no longer listed events, not proof of cancellation.
  existing={k:e for k,e in existing.items() if e["date"]>=str(now-dt.timedelta(days=30))}
  combined=sorted(prev+list(existing.values()),key=lambda e:(e["date"],e.get("start",""),e["id"]))
  if combined!=data["events"]:
   data["events"]=combined;data["count"]=len(combined)
   FILE.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
  status.update(status="ok",count=len(found),links_inspected=len(links),retained=len(existing),pages_checked=pages_checked)
 except LookupError as ex:
  status["note"]=str(ex)[:180]
  print("Cologne source reachable, but no demonstration links currently matched")
 except Exception as ex:
  status["error"]=str(ex)[:180]
  print("Cologne monitor/import skipped safely:",repr(ex))
 old={}
 try:old=json.loads(STATUS.read_text(encoding="utf-8"))
 except Exception:pass
 if status!=old:
  STATUS.write_text(json.dumps(status,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print("Cologne official source:",status["status"],"new/future events",status["count"])
if __name__=="__main__":main()
