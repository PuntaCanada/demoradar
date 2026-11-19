#!/usr/bin/env python3
"""Import explicitly announced future demonstrations from one verified Frankfurt city notice.
This is NOT a rolling assembly register. Only mechanical factual elements are used.
There is no blanket verified licence to reproduce Frankfurt news texts or images.
"""
import datetime as dt
import hashlib,json,re,urllib.request
from html.parser import HTMLParser
from pathlib import Path
URL="https://frankfurt.de/de-de/aktuelle-meldung/meldungen/mehrere-versammlungen-angemeldet/"
FILE=Path("data/events.json")
STATUS=Path("data/frankfurt-source.json")
MONTHS={"januar":1,"februar":2,"märz":3,"april":4,"mai":5,"juni":6,"juli":7,"august":8,"september":9,"oktober":10,"november":11,"dezember":12}
class Text(HTMLParser):
 def __init__(self):super().__init__();self.parts=[];self.skip=0
 def handle_starttag(self,t,attrs):
  if t in ("script","style","noscript"):self.skip+=1
  if t in ("p","div","h1","h2","h3","h4","li","br","tr"):self.parts.append("\n")
 def handle_endtag(self,t):
  if t in ("script","style","noscript"):self.skip=max(0,self.skip-1)
  if t in ("p","div","h1","h2","h3","h4","li","tr"):self.parts.append("\n")
 def handle_data(self,t):
  if not self.skip:self.parts.append(t)
 @property
 def text(self):return "\n".join(re.sub(r"\s+"," ",x).strip() for x in "".join(self.parts).splitlines() if x.strip())
def clean(s):return re.sub(r"\s+"," ",s or "").strip()
def time(s):
 m=re.search(r"\b(\d{1,2})(?:[.:](\d{2}))?\s+bis\s+(\d{1,2})(?:[.:](\d{2}))?\s+Uhr\b",s,re.I)
 if not m:return "",""
 a,b,c,d=m.groups()
 if int(a)>23 or int(c)>23:return "",""
 return f"{int(a):02d}:{b or '00'}",f"{int(c):02d}:{d or '00'}"
def parse(html,today):
 p=Text();p.feed(html)
 txt=p.text
 # Explicit future date in the verified announcement headline.
 head=re.search(r"Versammlungen\s+(?:sind\s+)?für den\s+(\d{1,2})\.\s+(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s+angemeldet",txt,re.I)
 published=re.search(r"\b(\d{2})\.(\d{2})\.(20\d{2}),?\s+\d{1,2}:\d{2}\s*Uhr",txt)
 if not head or not published:return []
 try:day=dt.date(int(published[3]),MONTHS[head[2].lower()],int(head[1]))
 except (ValueError,KeyError):return []
 if not today-dt.timedelta(days=1)<=day<=today+dt.timedelta(days=14):return []
 # Each announcement is numbered and each entry must have both a real time and a Thema field.
 parts=re.split(r"\n\s*([1-9])\.\s+([^\n:]{4,120}):\s*\n",txt)
 if len(parts)<4:return []
 result=[]
 for i in range(1,len(parts)-2,3):
  number,organizer,body=parts[i],clean(parts[i+1]),parts[i+2]
  start,end=time(body)
  theme=re.search(r"(?:^|\n)Thema:\s*[„\"]?([^\n„”\"]{7,180})[”\"]?",body)
  if not start or not theme:continue
  title=clean(theme[1])
  route=""
  location=""
  route_match=re.search(r"(?:^|\n)Demonstrationszug\s+([^\n]{8,170})",body)
  stationary=re.search(r"(?:^|\n)Stationäre Kundgebung\s+([^\n]{5,120})",body)
  if route_match:route=clean(route_match[1])
  if stationary:location=clean(stationary[1])
  participant=re.search(r"(?:^|\n)Angezeigte Zahl der Teilnehmerinnen und Teilnehmer:\s*(\d[\d .]*)\s+Personen",body)
  ident=hashlib.sha256((URL+"|"+number).encode()).hexdigest()[:16]
  result.append({"id":"frankfurt-"+ident,"country":"DE","state":"Hessen","city":"Frankfurt am Main","date":day.isoformat(),"start":start,"end":end,"title":title,"postal_code":"","location":location,"route":route,"organizer":organizer[:120],"registered_participants":clean(participant[1]) if participant else "","source":"Stadt Frankfurt am Main – amtliche Mitteilung","source_url":URL,"source_status":"einzelne behördliche Pressemitteilung; keine vollständige Versammlungsübersicht"})
 return result
def main():
 status={"source":URL,"scope":"one-off verified official notice, not complete calendar","licence":"Only factual time/place/topic data and source link; no open reuse licence for creative text established","status":"unavailable","count":0}
 try:
  req=urllib.request.Request(URL,headers={"User-Agent":"DemoRadar/1.0 (+https://github.com/PuntaCanada/demoradar)","Accept":"text/html"})
  with urllib.request.urlopen(req,timeout=20) as r:
   if r.status!=200:raise RuntimeError("HTTP "+str(r.status))
   html=r.read(1_500_000).decode("utf-8","replace")
  found=parse(html,dt.date.today())
  if not found:raise ValueError("No unambiguous upcoming numbered official event notices")
  data=json.loads(FILE.read_text(encoding="utf-8"))
  if not isinstance(data.get("events"),list):raise ValueError("Missing existing official event data")
  existing={e["id"]:e for e in data["events"] if str(e.get("id","")).startswith("frankfurt-")}
  for e in found:existing[e["id"]]=e
  other=[e for e in data["events"] if not str(e.get("id","")).startswith("frankfurt-")]
  combined=sorted(other+list(existing.values()),key=lambda e:(e["date"],e.get("start",""),e["id"]))
  if combined!=data["events"]:
   data["events"]=combined;data["count"]=len(combined)
   FILE.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
  status.update(status="ok",count=len(found))
 except Exception as exc:status["error"]=str(exc)[:180];print("Frankfurt official notice skipped safely:",repr(exc))
 previous={}
 try:previous=json.loads(STATUS.read_text(encoding="utf-8"))
 except Exception:pass
 if previous!=status:STATUS.write_text(json.dumps(status,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print("Frankfurt official notice:",status["status"],status["count"])
if __name__=="__main__":main()
