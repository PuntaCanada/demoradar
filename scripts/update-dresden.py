#!/usr/bin/env python3
"""Import the city's own structured Dresden assembly list, preserving older data on failure."""
import datetime as dt
import hashlib
import json
import re
import urllib.request
from pathlib import Path

URL="https://www.dresden.de/data_ext/versammlungsuebersicht/Versammlungen.json"
PUBLIC_URL="https://www.dresden.de/de/rathaus/dienstleistungen/versammlungsuebersicht.php"
FILE=Path("data/events.json")
STATUS=Path("data/dresden-source.json")
def clean(s):return re.sub(r"\s+"," ",str(s or "")).strip()
def parse_time(text):
    m=re.search(r"\b([012]?\d)[.:]([0-5]\d)\s*[-–]\s*([012]?\d)[.:]([0-5]\d)",text)
    if m:return f"{int(m[1]):02d}:{m[2]}",f"{int(m[3]):02d}:{m[4]}"
    m=re.search(r"\b([012]?\d)[.:]([0-5]\d)",text)
    return (f"{int(m[1]):02d}:{m[2]}","") if m else ("","")
def main():
    report={"url":URL,"status":"unavailable","count":0,"checked_on":dt.date.today().isoformat()}
    try:
        req=urllib.request.Request(URL,headers={"User-Agent":"DemoRadar/0.1 public assembly directory (github.com/PuntaCanada/demoradar)","Accept":"application/json"})
        with urllib.request.urlopen(req,timeout=20) as resp:
            if resp.status!=200:raise ValueError("HTTP "+str(resp.status))
            raw=json.load(resp)
        rows=raw.get("Versammlungen")
        if not isinstance(rows,list) or not rows or len(rows)>10000:raise ValueError("Unexpected Dresden JSON structure or empty list")
        today=dt.date.today()
        events=[]
        for item in rows:
            if not isinstance(item,dict):continue
            date=clean(item.get("Datum"))
            title=clean(item.get("Thema"))
            if not re.fullmatch(r"20\d\d-\d\d-\d\d",date) or len(title)<4:continue
            try:day=dt.date.fromisoformat(date)
            except ValueError:continue
            if day<today-dt.timedelta(days=30) or day>today+dt.timedelta(days=550):continue
            start,end=parse_time(clean(item.get("Zeit")))
            location=clean(item.get("Ort") or item.get("Startpunkt"))
            organizer=clean(item.get("Veranstalter"))
            if organizer.lower() in ("natürliche person","privatperson"):organizer=""
            status=clean(item.get("Status"))
            # Preserve explicitly cancelled/withdrawn entries to show their real status;
            # the frontend excludes them from active counts instead of silently dropping them.
            parts=clean(item.get("Teilnehmer"))
            ident=hashlib.sha256(("|".join([date,start,title,location])).casefold().encode()).hexdigest()[:16]
            events.append({"id":"dresden-"+ident,"country":"DE","state":"Sachsen","city":"Dresden","date":date,"start":start,"end":end,"title":title,"location":location,"postal_code":"","route":"","organizer":organizer,"registered_participants":parts,"event_status":status,"source":"Landeshauptstadt Dresden – Versammlungsübersicht","source_url":PUBLIC_URL,"source_status":"behördlich veröffentlicht"})
        if not events:raise ValueError("No valid Dresden event rows")
        data=json.loads(FILE.read_text(encoding="utf-8"))
        others=[e for e in data["events"] if e.get("city")!="Dresden"]
        # Stable ID and normalized fields allow incremental updates without duplicating rows.
        by_id={e["id"]:e for e in events}
        combined=sorted(others+list(by_id.values()),key=lambda e:(e["date"],e.get("start",""),e["id"]))
        if combined!=data["events"]:
            data["events"]=combined;data["count"]=len(combined)
            FILE.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        report.update(status="ok",count=len(by_id),source_date=raw.get("Dateidatum"),checked_on=today.isoformat())
    except Exception as ex:
        report["error"]=str(ex)[:200]
        print("Dresden: unavailable, preserving previous data:",repr(ex))
    old={}
    if STATUS.exists():
        try:old=json.loads(STATUS.read_text(encoding="utf-8"))
        except Exception:pass
    if report!=old:STATUS.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Dresden:",report["status"],report["count"])
if __name__=="__main__":main()
