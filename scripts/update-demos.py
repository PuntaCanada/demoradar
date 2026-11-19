#!/usr/bin/env python3
"""Import plausible German upcoming public events from Demos Berlin e.V.
Provider dataset CC BY-SA 4.0, kept separate from government data.
Read-only documented POST /v1/event/all, sorted newest first."""
import datetime as dt
import json,re,time,urllib.request
from pathlib import Path
from zoneinfo import ZoneInfo
URL="https://api.demonstrations.org/v1/event/all"
OUT=Path("data/demos-events.json")
SOURCE="Demos Berlin e.V."
LIMIT=200
MAX_PAGES=20
WINDOW_DAYS=120
def clean(value):
 return re.sub(r"\s+"," ",str(value or "")).strip()
def query(offset):
 payload=json.dumps({"sorting_key":"start_time","sorting_direction":"desc","offset":offset,"limit":LIMIT}).encode()
 req=urllib.request.Request(URL,data=payload,headers={"Content-Type":"application/json","Accept":"application/json","User-Agent":"DemoRadar/0.1 (+https://github.com/PuntaCanada/demoradar)"},method="POST")
 with urllib.request.urlopen(req,timeout=22) as response:
  if response.status!=200:raise ValueError("HTTP "+str(response.status))
  result=json.load(response)
 if not isinstance(result,dict) or not isinstance(result.get("events"),list):raise ValueError("Unexpected response")
 return result
def transform(event,now):
 if not isinstance(event,dict):return None
 eid=event.get("id")
 if not isinstance(eid,int) or eid<1:return None
 title=clean(event.get("name"))[:260]
 if len(title)<5:return None
 raw_date=clean(event.get("start_time"))
 try:
  moment=dt.datetime.fromisoformat(raw_date.replace("Z","+00:00"))
  if moment.tzinfo is not None:moment=moment.astimezone(ZoneInfo("Europe/Berlin"))
  day=moment.date()
 except (ValueError,TypeError):return None
 if not now-dt.timedelta(days=1)<=day<=now+dt.timedelta(days=WINDOW_DAYS):return None
 locations=event.get("locations")
 if not isinstance(locations,list) or not locations:return None
 cities=set()
 good=[]
 for location in locations:
  if not isinstance(location,dict):continue
  if clean(location.get("country")).casefold() not in ("deutschland","germany","de","bundesrepublik deutschland"):continue
  city=clean(location.get("city"))
  if not city:continue
  cities.add(city.casefold())
  good.append(location)
 if len(cities)!=1 or not good:return None
 city=clean(good[0].get("city"))
 # Federal state absent from API locations in tested response; do not guess state.
 time_str=moment.strftime("%H:%M")
 end=""
 try:
  end_m=dt.datetime.fromisoformat(clean(event.get("end_time")).replace("Z","+00:00"))
  if end_m.tzinfo is not None:end_m=end_m.astimezone(ZoneInfo("Europe/Berlin"))
  if end_m.date()==day and end_m>=moment:end=end_m.strftime("%H:%M")
 except (ValueError,TypeError):pass
 # Provider's page link may be null. Every ID has documented official read-only API URL.
 event_url=clean(event.get("url"))
 if not re.match(r"^https?://",event_url):event_url=f"https://api.demonstrations.org/v1/event/{eid}"
 # No automatic attribution of an organiser without a verified source field.
 return {"id":f"demos-{eid}","country":"DE","state":"","city":city,"date":day.isoformat(),"start":time_str,"end":end,"title":title,"postal_code":"","location":clean(event.get("raw_location"))[:220],"route":"","source":SOURCE,"source_url":event_url,"source_status":"Community-/Quellenmeldung, nicht behördlich bestätigt","license":"CC BY-SA 4.0","license_url":"https://creativecommons.org/licenses/by-sa/4.0/","data_provider":"https://demonstrations.org/en/data"}
def main():
 now=dt.datetime.now(ZoneInfo("Europe/Berlin")).date()
 events={}
 offset=0
 fetched=0
 status="ok"
 try:
  for page in range(MAX_PAGES):
   result=query(offset)
   rows=result["events"]
   if not rows:break
   fetched+=len(rows)
   for event in rows:
    e=transform(event,now)
    if e:events[e["id"]]=e
   # Newest-first is documented; stop after reaching dates older than current day.
   dates=[str(e.get("start_time",""))[:10] for e in rows if isinstance(e,dict)]
   if dates and min(dates)<now.isoformat():break
   if len(rows)<LIMIT:break
   offset+=len(rows)
   time.sleep(.25)
  else:
   status="partial_page_limit"
 except Exception as ex:
  print("Demos API import failed; retaining last good data:",repr(ex))
  return
 data={"source":SOURCE,"license":"CC BY-SA 4.0","license_url":"https://creativecommons.org/licenses/by-sa/4.0/","attribution_url":"https://demonstrations.org/en/data","source_api":URL,"count":len(events),"status":status,"events":sorted(events.values(),key=lambda x:(x["date"],x["start"],x["id"]))}
 if status=="partial_page_limit":
  print("Page cap reached before historical cutoff; no overwrite to avoid silently incomplete data")
  return
 if not events:
  print("No plausible upcoming German events; preserving previous snapshot")
  return
 old={}
 if OUT.exists():
  try:old=json.loads(OUT.read_text(encoding="utf-8"))
  except Exception:pass
 if old!=data:
  OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print("Demos import:",len(events),"events from",fetched,"raw records. Separate CC BY-SA data.")
if __name__=="__main__":main()
