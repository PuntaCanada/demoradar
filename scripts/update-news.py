#!/usr/bin/env python3
"""Conservative links-only news matching from editorial RSS feeds.
Do not copy article bodies. A match is a candidate, not a verified event report."""
import datetime as dt, email.utils, json, re, urllib.request, xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urlparse
EVENTS=Path("data/events.json")
OUTPUT=Path("data/news-matches.json")
FEEDS=[
 ("tagesschau Inland","https://www.tagesschau.de/inland/index~rss2.xml","www.tagesschau.de",None),
 ("tagesschau Aktuell","https://www.tagesschau.de/index~rss2.xml","www.tagesschau.de",None),
 ("MDR Sachsen","https://www.mdr.de/nachrichten/sachsen/nachrichten-mdr-120~rss2.xml","www.mdr.de",{"Dresden"}),
 ("NDR Mecklenburg-Vorpommern","https://www.ndr.de/nachrichten/mecklenburg-vorpommern/index~rss2.xml","www.ndr.de",{"Rostock"}),
 ("tagesschau Regional Berlin","https://www.tagesschau.de/inland/regional/berlin/index~rss2.xml","www.tagesschau.de",{"Berlin"}),
 ("tagesschau Regional Bayern","https://www.tagesschau.de/inland/regional/bayern/index~rss2.xml","www.tagesschau.de",{"Würzburg"}),
 ("tagesschau Regional NRW","https://www.tagesschau.de/inland/regional/nordrheinwestfalen/index~rss2.xml","www.tagesschau.de",{"Münster","Bielefeld"}),
 ("tagesschau Regional Niedersachsen","https://www.tagesschau.de/inland/regional/niedersachsen/index~rss2.xml","www.tagesschau.de",{"Lüneburg","Papenburg"}),
 ("tagesschau Regional Thüringen","https://www.tagesschau.de/inland/regional/thueringen/index~rss2.xml","www.tagesschau.de",{"Weimar","Jena"}),
]
STOP={"gegen","eine","einer","einem","einen","eines","und","oder","für","der","die","das","des","den","dem","mit","von","zum","zur","auf","bei","aus","wird","werden","nicht","mehr","heute","morgen","berlin","rostock","demo","demonstration","kundgebung","streik","protest","soll","sollen","über","alle","ein","einer","sind","dass","als","auch","in","im","am","an","ist","nach","neue","neuen","einer","menschen","recht","rechte","freiheit","tag"}
PROTEST=re.compile(r"\b(demo(?:nstration(?:en)?)?|kundgebung|protest(?:e|ieren|aktion)?|streik(?:s|en)?|mahnwache|versammlung|aufzug|demonstrier\w*)\b",re.I)
def words(t):
 return {w.lower() for w in re.findall(r"[a-zäöüß]{4,}",t.lower()) if w.lower() not in STOP}
def fetch(url):
 req=urllib.request.Request(url,headers={"User-Agent":"DemoRadar/0.1 (public source citation, headline links only)","Accept":"application/rss+xml,application/xml"})
 with urllib.request.urlopen(req,timeout=18) as r:
  if r.status!=200:raise ValueError("HTTP "+str(r.status))
  return r.read(1300000)
def main():
 now=dt.datetime.now(dt.timezone.utc)
 events=json.loads(EVENTS.read_text(encoding="utf-8"))["events"]
 # Include the separately licensed, plausibility-filtered Demos event file.
 try:
  supplemental=json.loads(Path("data/demos-events.json").read_text(encoding="utf-8"))
  if supplemental.get("license")=="CC BY-SA 4.0" and isinstance(supplemental.get("events"),list):
   events.extend(supplemental["events"])
 except (ValueError,OSError) as ex:print("Community events unavailable for news matching",str(ex)[:100])
 eligible=[e for e in events if abs((dt.date.fromisoformat(e["date"])-now.date()).days)<=3]
 found=[]
 for source,url,hostname,local_cities in FEEDS:
  try:
   root=ET.fromstring(fetch(url))
   for item in root.findall(".//channel/item")[:100]:
    title=(item.findtext("title") or "").strip()
    link=(item.findtext("link") or "").strip()
    date=(item.findtext("pubDate") or "").strip()
    if not title or not link.startswith("https://"+hostname+"/"):continue
    if not PROTEST.search(title):continue
    try:published=email.utils.parsedate_to_datetime(date).astimezone(dt.timezone.utc)
    except Exception:continue
    if abs((now-published).total_seconds())>6*86400:continue
    found.append({"title":title[:220],"url":link,"source":source,"published":published.isoformat(),"local_cities":sorted(local_cities) if local_cities else None})
  except Exception as ex:print("RSS unavailable",source,str(ex)[:150])
 matches={}
 for e in eligible:
  et=words(e["title"])
  if len(et)<2:continue
  candidates=[]
  for a in found:
   if a["local_cities"] is not None and e["city"] not in a["local_cities"]:continue
   # City alone is not enough; match 2 topic words and a protest term in headline.
   if e["city"].lower() not in a["title"].lower():continue
   common=et & words(a["title"])
   if len(common)<2:continue
   pub=dt.datetime.fromisoformat(a["published"]).date()
   if abs((pub-dt.date.fromisoformat(e["date"])).days)>2:continue
   candidates.append((len(common),a))
  if candidates:
   candidates.sort(key=lambda t:-t[0])
   matches[e["id"]]=[dict({k:v for k,v in a.items() if k!="local_cities"},match_type="automatischer Themen-/Ortsabgleich, redaktionell ungeprüft") for _,a in candidates[:2]]
 OUTPUT.parent.mkdir(parents=True,exist_ok=True)
 snapshot={"checked_at":now.isoformat(),"policy":"Nur Überschriften, Quellenlinks und Veröffentlichungsdatum; mögliche Zuordnung, keine Bestätigung","feeds":[x[0] for x in FEEDS],"matches":matches}
 # Ignore check timestamp when content unchanged; prevents unnecessary redeploys.
 old={}
 if OUTPUT.exists():
  try:old=json.loads(OUTPUT.read_text(encoding="utf-8"))
  except:pass
 if old.get("matches")==matches and old.get("feeds")==snapshot["feeds"]:
  print("News links unchanged;",len(matches),"events with potential matches")
 else:
  OUTPUT.write_text(json.dumps(snapshot,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
  print("News links:",len(matches),"events with potential matches")
if __name__=="__main__":main()
