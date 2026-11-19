import json,re,hashlib,urllib.request,datetime as dt
from pathlib import Path
from html.parser import HTMLParser
URL="https://rathaus.rostock.de/de/versammlungen/343356?r=artikellink"
FILE=Path("data/events.json")
STATUS=Path("data/rostock-source.json")
TODAY=dt.date.today()
class Text(HTMLParser):
 def __init__(self): super().__init__();self.parts=[];self.skip=0
 def handle_starttag(self,t,a):
  if t in ("script","style"):self.skip+=1
  if t in ("p","div","h1","h2","h3","h4","li","tr","br","dt","dd"):self.parts.append("\n")
 def handle_endtag(self,t):
  if t in ("script","style"):self.skip=max(0,self.skip-1)
  if t in ("p","div","h1","h2","h3","h4","li","tr","dt","dd"):self.parts.append("\n")
 def handle_data(self,d):
  if not self.skip:self.parts.append(d)
def clean(s):return re.sub(r"\s+"," ",s).strip()
request=urllib.request.Request(URL,headers={"User-Agent":"DemoRadar/0.1 public assembly calendar","Accept":"text/html"})
try:
 with urllib.request.urlopen(request,timeout=25) as response:
  html=response.read(3000000).decode("utf-8","replace")
 text=Text();text.feed(html)
 text="\n".join(clean(x) for x in "".join(text.parts).splitlines() if clean(x))
 # Split events at their distinctive start-time labels; locate the immediately preceding quoted heading.
 pattern=re.compile(r"Versammlungsbeginn:\s*(\d{2})\.(\d{2})\.(\d{4}),\s*(\d{2}:\d{2})(?::\d{2})?",re.I)
 starts=list(pattern.finditer(text))
 if not starts:raise ValueError("Rostock page contained no parseable event start dates")
 events=[]
 for i,match in enumerate(starts):
  prev=text[max(0,match.start()-800):match.start()]
  quoted=re.findall(r"[„“\"]([^„“\"\n]{5,240})[“\"]",prev)
  if not quoted:continue
  title=clean(quoted[-1])
  tail=text[match.end():starts[i+1].start() if i+1<len(starts) else match.end()+1800]
  # limit to first fields preceding next quoted event heading
  tail=tail.split("\n„")[0]
  def field(name):
   m=re.search(re.escape(name)+r":\s*([^\n]+)",tail,re.I)
   return clean(m.group(1)) if m else ""
  date=f"{match.group(3)}-{match.group(2)}-{match.group(1)}"
  try:
   day=dt.date.fromisoformat(date)
  except ValueError:continue
  if day<TODAY-dt.timedelta(days=30) or day>TODAY+dt.timedelta(days=550):continue
  route=field("Beschiedener Streckenverlauf") or field("Beantragter Streckenverlauf")
  kind=field("Versammlungsart")
  place=route if kind.lower() not in ("aufzug","demonstrationszug") else ""
  if place:route=""
  # Applicant names are intentionally not republished; public dates/topics remain attributable.
  status=field("Status")
  identifier=hashlib.sha256((date+match.group(4)+title).encode()).hexdigest()[:16]
  events.append(dict(id="rostock-"+identifier,country="DE",state="Mecklenburg-Vorpommern",city="Rostock",date=date,start=match.group(4),end=(field("Versammlungsende").split(",")[-1].strip()[:5]),title=title,postal_code="",location=place,route=route,kind=kind,organizer="",registered_participants=field("Angezeigte Teilnehmerzahl"),event_status=status,source="Hanse- und Universitätsstadt Rostock",source_url=URL,source_status="behördlich veröffentlicht"))
 if not events:raise ValueError("Rostock source format changed; no valid titles parsed")
 data=json.loads(FILE.read_text())
 existing=[e for e in data["events"] if not e["id"].startswith("rostock-")]
 combined=sorted(existing+events,key=lambda e:(e["date"],e["start"],e["id"]))
 if combined!=data["events"]:
  data["events"]=combined;data["count"]=len(combined)
  data["sources"]=[{"name":"Polizei Berlin","url":"https://www.berlin.de/polizei/service/versammlungsbehoerde/versammlungen-aufzuege/"},{"name":"Stadt Rostock","url":URL}]
  FILE.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n")
 status={"url":URL,"status":"ok","count":len(events),"checked_on":TODAY.isoformat(),"coverage":"Rostock municipal public list only; not Mecklenburg-Vorpommern"}
 previous={}
 try:previous=json.loads(STATUS.read_text(encoding="utf8"))
 except (OSError,ValueError):pass
 if previous!=status:STATUS.write_text(json.dumps(status,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
 print("Rostock:",len(events),"events; total:",len(combined))
except Exception as e:
 status={"url":URL,"status":"unavailable","checked_on":TODAY.isoformat(),"error":str(e)[:150],"count":0,"coverage":"Rostock city only; previous verified events preserved"}
 previous={}
 try:previous=json.loads(STATUS.read_text(encoding="utf8"))
 except (OSError,ValueError):pass
 if previous!=status:STATUS.write_text(json.dumps(status,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
 print("Rostock import skipped; Berlin remains available:",repr(e))
