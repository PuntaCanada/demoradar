#!/usr/bin/env python3
"""Evidence-only changes in the actually published event dataset.

Capture a snapshot BEFORE imports and compare AFTER validation. Missing upstream
entries are never classified as cancelled. No unknown official feed is enabled.
"""
import datetime as dt
import json
import os
import sys
from collections import Counter
from pathlib import Path

DATA=Path("data/events.json")
REPORT=Path("data/event-count-change.json")
SCRATCH=Path(os.environ.get("RUNNER_TEMP","/tmp"))/"demoradar-event-count-before.json"
MAX_SAMPLES=12

def group(e):
 source=str(e.get("source","")).lower()
 eid=str(e.get("id",""))
 if eid.startswith("berlin-") or ("polizei berlin" in source and "versammlungsbeh" in source):
  return "berlin_official_json"
 if eid.startswith("regional-oneoff-"):return "regional_organizer_oneoffs"
 if eid.startswith("organizer-"):return "other_organizer_oneoffs"
 if eid.startswith("stuttgart-oneoff-"):return "stuttgart_manual_city_oneoff"
 if eid.startswith("weimar-oneoff-"):return "weimar_official_oneoffs"
 if eid.startswith("police-"):return "police_oneoff_notices"
 if eid.startswith("freiburg-"):return "freiburg_official_oneoffs"
 return "other_source_records"

def snapshot(events):
 if not isinstance(events,list):raise ValueError("Missing event list")
 ids={}
 for e in events:
  eid=e.get("id") if isinstance(e,dict) else None
  if not isinstance(eid,str) or not eid:raise ValueError("Missing event ID")
  if eid in ids:raise ValueError("Duplicate event ID: "+eid)
  ids[eid]={"group":group(e),"city":str(e.get("city",""))[:90],
   "date":str(e.get("date",""))[:12]}
 return ids

def compare(before,after,day):
 old=set(before);new=set(after)
 removed=sorted(old-new);added=sorted(new-old)
 counts_before=Counter(e["group"] for e in before.values())
 counts_after=Counter(e["group"] for e in after.values())
 categories=sorted(counts_before.keys()|counts_after.keys())
 return {
  "version":1,"checked_on":day,
  "method":"Exactly compare persisted event IDs before and after the full import on the same runner. Source disappearance does NOT establish cancellation.",
  "before_total":len(before),"after_total":len(after),"delta":len(after)-len(before),
  "removed_from_dataset_count":len(removed),"added_to_dataset_count":len(added),
  "removed_entries_are_cancellations":False,
  "source_groups":[{"group":name,"before":counts_before[name],"after":counts_after[name],
    "delta":counts_after[name]-counts_before[name],
    "removed_ids":sum(before[x]["group"]==name for x in removed),
    "added_ids":sum(after[x]["group"]==name for x in added)} for name in categories],
  "removed_samples":[{"id":key,**before[key]} for key in removed[:MAX_SAMPLES]],
  "added_samples":[{"id":key,**after[key]} for key in added[:MAX_SAMPLES]]
 }

def main():
 if len(sys.argv)!=2 or sys.argv[1] not in ("before","after"):
  raise SystemExit("Usage: audit-event-count-delta.py before|after")
 current=snapshot(json.loads(DATA.read_text(encoding="utf8"))["events"])
 if sys.argv[1]=="before":
  SCRATCH.write_text(json.dumps(current,ensure_ascii=False),encoding="utf8")
  print("Dataset delta baseline",len(current),"events")
 else:
  if not SCRATCH.exists():raise RuntimeError("Missing same-run baseline; refuse fabricated delta")
  before=json.loads(SCRATCH.read_text(encoding="utf8"))
  result=compare(before,current,dt.datetime.now(dt.timezone.utc).date().isoformat())
  prior={}
  try:prior=json.loads(REPORT.read_text(encoding="utf8"))
  except (OSError,ValueError):pass
  if prior!=result:
   REPORT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
  print("Dataset delta",result["before_total"],"=>",result["after_total"],
   "change",result["delta"],"removed",result["removed_from_dataset_count"],
   "added",result["added_to_dataset_count"])
  for row in result["source_groups"]:
   if row["delta"] or row["removed_ids"] or row["added_ids"]:
    print(row["group"],"delta",row["delta"],"removed",row["removed_ids"],"added",row["added_ids"])
  if result["removed_from_dataset_count"]:
   print("NOTE: missing entries are NOT independently confirmed cancellations")
if __name__=="__main__":main()
