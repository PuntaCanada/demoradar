#!/usr/bin/env python3
"""Transparent future assembly inventory, NOT another event feed.

Classifies only stable, explicitly reviewed importer ID namespaces. The rest
are unknown-provenance records, not silently described as official.
No absence implies cancellation and no historic event counts as future.
"""
import datetime as dt
import json
import re
from collections import Counter
from pathlib import Path
from zoneinfo import ZoneInfo

EVENTS=Path("data/events.json")
OUT=Path("data/future-source-evidence.json")
STATES=Path("data/state-source-coverage.json")

CLASS_PREFIXES=(
 ("berlin-","official_structured_source"),
 ("dresden-","official_structured_source"),
 ("rostock-","official_structured_source"),
 ("weimar-oneoff-","official_individual_notice"),
 ("freiburg-","official_individual_notice"),
 ("frankfurt-","official_individual_notice"),
 ("police-","official_individual_notice"),
 ("stuttgart-oneoff-","municipal_event_listing_registration_unconfirmed"),
 ("regional-oneoff-","nongovernment_organizer_notice"),
 ("organizer-","nongovernment_organizer_notice"),
)

def classify(event):
 eid=str(event.get("id",""))
 # Namespaces are provenance indicators only, NOT a licence determination.
 for prefix,label in CLASS_PREFIXES:
  if eid.startswith(prefix):return label
 return "unclassified_source"

def report(events,states,today):
 valid={s["state"] for s in states}
 if len(states)!=16 or len(valid)!=16:raise ValueError("Expected sixteen unique official states")
 if not isinstance(events,list):raise ValueError("Events must be a list")
 all_ids=set();upcoming=[];invalid=0
 for event in events:
  if not isinstance(event,dict) or not event.get("id"):raise ValueError("Invalid event record")
  if event["id"] in all_ids:raise ValueError("Duplicate ID "+event["id"])
  all_ids.add(event["id"])
  day=str(event.get("date",""))
  try:date=dt.date.fromisoformat(day)
  except (ValueError,TypeError):invalid+=1;continue
  if date.isoformat()!=day:invalid+=1;continue
  if date>=today:upcoming.append(event)
 categories=Counter(classify(e) for e in upcoming)
 per_state={name:Counter() for name in valid}
 for e in upcoming:
  state=str(e.get("state",""))
  if state in per_state:per_state[state][classify(e)]+=1
  else:categories["unmapped_state"]+=1
 kinds=("official_structured_source","official_individual_notice",
  "municipal_event_listing_registration_unconfirmed",
  "nongovernment_organizer_notice","unclassified_source")
 return {
  "version":1,"reviewed_on":today.isoformat(),
  "scope":"Events dated today or later, not necessarily still upcoming at the current hour; source-provenance classification, NOT formal assembly registration, legal licence or completeness",
  "all_event_records":len(events),"dated_today_or_later":len(upcoming),
  "old_event_records":len(events)-len(upcoming)-invalid,"invalid_dates":invalid,
  "unmapped_state_records":categories["unmapped_state"],
  "source_categories":{k:categories[k] for k in kinds},
  "states_with_official_structured_future_events":sum(per_state[s]["official_structured_source"]>0 for s in valid),
  "states_with_any_future_official_notice":sum(
   per_state[s]["official_structured_source"]+per_state[s]["official_individual_notice"]>0 for s in valid),
  "by_state":[{"state":s,
    "future_records":sum(per_state[s].values()),
    "official_structured":per_state[s]["official_structured_source"],
    "official_one_off":per_state[s]["official_individual_notice"],
    "municipal_calendar_unregistered":per_state[s]["municipal_event_listing_registration_unconfirmed"],
    "organizer_only":per_state[s]["nongovernment_organizer_notice"],
    "unclassified":per_state[s]["unclassified_source"]}
     for s in sorted(valid)],
  "method":"Deterministic and conservatively known event ID namespaces. Zero means nothing listed here; it is NOT evidence that no demonstrations are occurring. Counts include current calendar day. No inference of LIVE, cancellation or open reuse rights."
 }

def main():
 today=dt.datetime.now(ZoneInfo("Europe/Berlin")).date()
 events=json.loads(EVENTS.read_text(encoding="utf8"))["events"]
 states=json.loads(STATES.read_text(encoding="utf8"))["states"]
 result=report(events,states,today)
 previous={}
 try:previous=json.loads(OUT.read_text(encoding="utf8"))
 except (OSError,ValueError):pass
 if previous!=result:OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
 print("Future source evidence",today,":",result["dated_today_or_later"],
  "official periodic",result["source_categories"]["official_structured_source"],
  "official isolated",result["source_categories"]["official_individual_notice"],
  "non-government",result["source_categories"]["nongovernment_organizer_notice"],
  "unclassified",result["source_categories"]["unclassified_source"])
if __name__=="__main__":main()
