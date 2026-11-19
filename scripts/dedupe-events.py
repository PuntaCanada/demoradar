#!/usr/bin/env python3
"""Conservative cross-source deduplication; never merge events solely on topic or city."""
import json,re,unicodedata
from pathlib import Path
FILE=Path("data/events.json")
def norm(s):
 s=unicodedata.normalize("NFKD",str(s or "").casefold())
 s="".join(c for c in s if not unicodedata.combining(c))
 return re.sub(r"[^a-z0-9]+"," ",s).strip()
def dedupe(events):
 seen={}; removed=[]
 for e in events:
  # Topic alone is not enough: require same city, date, title, start time,
  # and (when both exist) same location. Distinct parallel rallies survive.
  key=(norm(e.get("city")),e.get("date"),norm(e.get("title")),e.get("start",""))
  if not all(key[:3]):continue
  original=seen.get(key)
  if original is None:seen[key]=e;continue
  place_a=norm(original.get("location"))
  place_b=norm(e.get("location"))
  if place_a and place_b and place_a!=place_b:continue
  # Prefer city/authority source, preserve all additional origin links.
  priority=lambda x:(int("behörd" in x.get("source_status","").lower()),int(bool(x.get("location"))),int(bool(x.get("organizer"))),int(bool(x.get("route"))))
  winner,loser=(e,original) if priority(e)>priority(original) else (original,e)
  origins=list(dict.fromkeys([winner.get("source_url",""),loser.get("source_url","")]+winner.get("additional_sources",[])+loser.get("additional_sources",[])))
  winner["additional_sources"]=[u for u in origins if u and u!=winner.get("source_url")]
  if winner is e:seen[key]=e
  removed.append(loser["id"])
 return [e for e in events if e["id"] not in removed],removed

def main():
 d=json.loads(FILE.read_text(encoding="utf-8"));before=len(d["events"])
 new,removed=dedupe(d["events"])
 new.sort(key=lambda e:(e["date"],e.get("start",""),e["id"]))
 if new!=d["events"]:
  d["events"]=new;d["count"]=len(new)
  FILE.write_text(json.dumps(d,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print("Deduplication:",before,"=>",len(new),"removed",len(removed))
if __name__=="__main__":main()
