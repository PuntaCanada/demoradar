#!/usr/bin/env python3
"""Conservative official-source monitor: only imports clearly classified Jena assemblies.
Dresden is monitored, not scraped, until its official listing schema is verified."""
import json, re, hashlib, urllib.request, datetime
from pathlib import Path
from html.parser import HTMLParser

JENA="https://rathaus.jena.de/de/auflagen-aktueller-veranstaltungen"
DRESDEN="https://www.dresden.de/versammlungen"
EVENTS=Path("data/events.json")
STATUS=Path("data/source-status.json")

class Reader(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text=[]
        self.heading=False
        self.blocks=[]
    def handle_starttag(self,tag,attrs):
        if tag in ("h2","h3"):
            self.heading=True
            self.blocks.append([""])
        elif tag in ("p","li","br","div","time"):
            self.text.append("\n")
            if self.blocks:self.blocks[-1].append("\n")
    def handle_endtag(self,tag):
        if tag in ("h2","h3"):self.heading=False
        if tag in ("p","li","div","time"):
            self.text.append("\n")
            if self.blocks:self.blocks[-1].append("\n")
    def handle_data(self,data):
        self.text.append(data)
        if self.blocks:self.blocks[-1].append(data)

def fetch(url):
    req=urllib.request.Request(url,headers={"User-Agent":"DemoRadar/0.1 (public civic event index; contact through GitHub)", "Accept":"text/html"})
    with urllib.request.urlopen(req,timeout=18) as res:
        if res.status != 200: raise RuntimeError("HTTP "+str(res.status))
        body=res.read(2_000_000).decode("utf-8","replace")
        if len(body)<1500:raise RuntimeError("Unexpectedly short response")
        return body

def main():
    now=datetime.datetime.now(datetime.timezone.utc)
    report={"checked_at":now.isoformat(),"sources":[]}
    data=json.loads(EVENTS.read_text("utf-8"))
    for city,url in [("Dresden",DRESDEN),("Jena",JENA)]:
        entry={"city":city,"url":url,"status":"unavailable","imported":0}
        try:
            page=fetch(url)
            p=Reader();p.feed(page)
            if city=="Dresden":
                entry["status"]="reachable_unverified_format"
                entry["note"]="Official landing page reachable; no importer until structured listing is verified."
            else:
                if "Auflagen von Veranstaltungen und Versammlungen" not in page:
                    raise ValueError("Unexpected Jena site format")
                today=now.date()
                found=[]
                for block in p.blocks:
                    raw="\n".join(x.strip() for x in "".join(block).splitlines() if x.strip())
                    lines=raw.splitlines()
                    if not lines:continue
                    title=lines[0][:230]
                    # Only items explicitly categorised as assemblies, never events or markets.
                    if not any(re.fullmatch(r"Versammlungen?|Aufzüge|Demonstrationen",line,re.I) for line in lines[1:]):continue
                    m=re.search(r"\b(\d{2})\.(\d{2})\.(20\d{2})\b(?:\s*[-–]\s*\d{2}\.\d{2}\.\d{4})?\s*\|\s*(\d{2}:\d{2})",raw)
                    if not m:continue
                    date=f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
                    when=datetime.date.fromisoformat(date)
                    if not(today-datetime.timedelta(days=1)<=when<=today+datetime.timedelta(days=120)):continue
                    ident=hashlib.sha256((title+date+m.group(4)).encode()).hexdigest()[:16]
                    found.append({"id":"jena-"+ident,"country":"DE","state":"Thüringen","city":"Jena","date":date,"start":m.group(4),"end":"","title":title,"postal_code":"","location":"","route":"","source":"Stadt Jena – Auflagen aktueller Versammlungen","source_url":JENA,"source_status":"behördlich veröffentlicht"})
                if found:
                    by_id={e["id"]:e for e in data["events"]}
                    for event in found:by_id[event["id"]]=event
                    data["events"]=sorted(by_id.values(),key=lambda e:(e["date"],e.get("start",""),e["id"]))
                    data["count"]=len(data["events"])
                    EVENTS.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
                entry["status"]="ok"
                entry["imported"]=len(found)
                entry["note"]="Only explicitly labelled assembly entries are imported; absence is not proof of no demonstrations."
        except Exception as err:
            entry["status"]="unavailable"
            entry["note"]=str(err)[:220]
        report["sources"].append(entry)
    STATUS.parent.mkdir(parents=True,exist_ok=True)
    STATUS.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(report,ensure_ascii=False))

if __name__=="__main__":main()
