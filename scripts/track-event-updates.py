#!/usr/bin/env python3
"""Track authoritative *observed* event-field changes, never infer cancellation from disappearance.
Runs after all official/community imports. Retains a bounded public change log."""
import datetime as dt
import json
import re
from pathlib import Path

OFFICIAL=Path("data/events.json")
COMMUNITY=Path("data/demos-events.json")
OUT=Path("data/event-updates.json")
FIELDS=("date","start","end","location","route","event_status","title")
LABELS={"date":"date","start":"start","end":"end","location":"location","route":"route","event_status":"status","title":"title"}
MAX_EVENTS=18000
MAX_CHANGES=500
def clean(v):return re.sub(r"\s+"," ",str(v or "")).strip()[:350]
def classify(v):
 v=clean(v).casefold()
 # Exact labels and unambiguous status phrases only. Free-text titles are not proof.
 if re.search(r"\b(abgesagt|annulliert|storniert|fällt aus|faellt aus)\b",v):return "cancelled"
 if re.search(r"\b(abgemeldet|zurückgezogen|zurueckgezogen)\b",v):return "withdrawn"
 if re.search(r"\b(abgebrochen|vorzeitig beendet|aufgelöst|aufgeloest)\b",v):return "stopped"
 return ""
def load(path):
 try:return json.loads(path.read_text(encoding="utf-8"))
 except (OSError,ValueError):return {}
def snapshot():
 result={}
 for path in (OFFICIAL,COMMUNITY):
  data=load(path)
  if not isinstance(data.get("events"),list):continue
  for e in data["events"]:
   if not isinstance(e,dict) or not e.get("id"):continue
   result[str(e["id"])]={
    "city":clean(e.get("city")),"source_url":clean(e.get("source_url")),
    **{k:clean(e.get(k)) for k in FIELDS}
   }
 return result
def changes(before,now):
 today=dt.datetime.now(dt.timezone.utc).date()
 out=[]
 # Some official feeds generate IDs from the time/place. Match a renamed ID only
 # when the same city/date/title appears EXACTLY once in both snapshots.
 def key(e):return (clean(e.get("city")).casefold(),e.get("date"),clean(e.get("title")).casefold())
 old_index={}
 new_index={}
 for eid,e in before.items():old_index.setdefault(key(e),[]).append(eid)
 for eid,e in now.items():new_index.setdefault(key(e),[]).append(eid)
 for eid,cur in now.items():
  old=before.get(eid)
  if old is None:
   k=key(cur)
   if len(old_index.get(k,[]))==1 and len(new_index.get(k,[]))==1:
    old=before[old_index[k][0]]
  if not old:continue
  try:date=dt.date.fromisoformat(cur["date"])
  except ValueError:continue
  if date<today-dt.timedelta(days=7):continue
  changed=[{"field":LABELS[field],"previous":old.get(field,""),"current":cur.get(field,"")} for field in FIELDS if old.get(field,"")!=cur.get(field,"")]
  if changed:
   out.append({"id":eid,"date":cur["date"],"city":cur["city"],"source_url":cur.get("source_url",""),"changes":changed})
 return out
def main():
 state=load(OUT)
 now=snapshot()
 if not now or len(now)>MAX_EVENTS:raise RuntimeError("Refusing empty or unexpectedly large event index")
 previous=state.get("previous",{}) if isinstance(state.get("previous"),dict) else {}
 fresh=changes(previous,now)
 existing=state.get("changes",[]) if isinstance(state.get("changes"),list) else []
 nowstamp=dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()
 new=[dict(ch,detected_at=nowstamp) for ch in fresh]
 today=dt.datetime.now(dt.timezone.utc).date()
 def retained(ch):
  try: return dt.date.fromisoformat(ch.get("date",""))>=today-dt.timedelta(days=7)
  except ValueError:return False
 bykey={(c.get("id"),c.get("detected_at")):c for c in existing if retained(c)}
 for c in new:bykey[c["id"],c["detected_at"]]=c
 updates=sorted(bykey.values(),key=lambda c:(c["detected_at"],c["id"]),reverse=True)[:MAX_CHANGES]
 classified={}
 for eid,e in now.items():
  status=classify(e.get("event_status"))
  if status:classified[eid]={"status":status,"source_status":e.get("event_status",""),"source_url":e.get("source_url","")}
 output={"version":1,"previous":now,"changes":updates,"statuses":classified}
 if output!=state:
  OUT.parent.mkdir(parents=True,exist_ok=True)
  OUT.write_text(json.dumps(output,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
 print("Status/change tracker:",len(classified),"explicit statuses,",len(new),"observed updates; removed entries are NOT cancellations")
if __name__=="__main__":main()
