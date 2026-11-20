#!/usr/bin/env python3
"""Create review-only links to original broadcaster reports, never republish RSS.
Input links are manually checked and described using original short labels.
A report is only a context link for ONE already existing event; it never creates
or verifies events, cancellation status, or platform LIVE activity.
"""
import datetime as dt
import json
import re
from pathlib import Path
from urllib.parse import urlsplit

ROOT=Path("data")
EVENTS=ROOT/"events.json"
OUTPUT=ROOT/"news-matches.json"
EDITORIAL=ROOT/"editorial-link-candidates.json"
DOMAINS={
 "tagesschau / rbb":{"www.tagesschau.de"},
 "tagesschau / NDR":{"www.tagesschau.de"},
 "tagesschau / WDR":{"www.tagesschau.de"},
 "tagesschau":{"www.tagesschau.de"},
 "rbb24":{"www.rbb24.de"},
 "MDR":{"www.mdr.de"},
 "NDR":{"www.ndr.de"},
 "WDR":{"www1.wdr.de"},
 "BR24":{"www.br.de"}
}
FORBIDDEN={"cancelled","canceled","withdrawn","stopped","abgesagt","zurueckgezogen","zurückgezogen"}
EDITORIAL_MAX_AGE_DAYS=7 # A curated story can provide context briefly, never perpetual "today" coverage.
def berlin_day():
 return dt.datetime.now(__import__("zoneinfo").ZoneInfo("Europe/Berlin")).date()
def link_is_fresh(link,review_date,today):
 if not is_allowed_link(link):return False
 published=parse_day(link["published_on"])
 reviewed=parse_day(review_date)
 event=parse_day(link["event_day"])
 if not reviewed or reviewed<published or reviewed>today:return False
 # Never transform a dated media article into a reference for another protest day.
 return (today-event).days>=-3 and (today-event).days<=3 and (today-reviewed).days<=EDITORIAL_MAX_AGE_DAYS


def parse_day(s):
 if not isinstance(s,str) or not re.fullmatch(r"20\d{2}-\d{2}-\d{2}",s):
  return None
 try:return dt.date.fromisoformat(s)
 except ValueError:return None

def tokens(s):
 return re.findall(r"[a-z0-9]+",str(s).casefold().replace("ß","ss"))

def has_phrase(title,phrase):
 needle=tokens(phrase)
 hay=tokens(title)
 return bool(needle) and any(hay[i:i+len(needle)]==needle for i in range(len(hay)-len(needle)+1))

def is_allowed_link(link):
 if not isinstance(link,dict):return False
 publisher=link.get("publisher")
 if publisher not in DOMAINS:return False
 url=link.get("url")
 if not isinstance(url,str) or len(url)>700:return False
 try:parts=urlsplit(url)
 except ValueError:return False
 if parts.scheme!="https" or parts.hostname not in DOMAINS[publisher] or parts.username or parts.password or parts.port or not parts.path.startswith("/"):return False
 if parts.fragment:return False
 verification=link.get("url_check_status")
 if verification not in (None,"content_verified","access_inconclusive"):return False
 if verification is not None and not parse_day(link.get("url_check_date")):return False

 if not parse_day(link.get("event_day")) or not parse_day(link.get("published_on")):return False
 # Contemporary advance reporting may precede a documented event by up to seven days.
 # Never extend backward lookups for an article more than two days AFTER the event.
 gap=(parse_day(link["event_day"])-parse_day(link["published_on"])).days
 if gap>7 or gap< -2:return False
 phrases=link.get("match_phrases")
 if not isinstance(phrases,list) or len(phrases)<2 or len(phrases)>4:return False
 if not all(isinstance(x,str) and len(x.strip())>=3 for x in phrases):return False
 if len({x.casefold() for x in phrases})!=len(phrases):return False
 if not isinstance(link.get("city"),str) or not link["city"].strip():return False
 label=link.get("label")
 return isinstance(label,str) and 10<=len(label)<=110 and "<" not in label and ">" not in label

def match_links(events,links,today=None,reviewed_on=None):
 today=today or berlin_day()
 reviewed_on=reviewed_on or today.isoformat()
 eligible=[e for e in events if isinstance(e,dict) and parse_day(e.get("date")) and
  abs((parse_day(e["date"])-today).days)<=3 and e.get("id") and e.get("city") and e.get("title") and
  str(e.get("status_code","")).casefold() not in FORBIDDEN]
 results={}
 for link in links:
  if not link_is_fresh(link,reviewed_on,today):continue
  matching=[e for e in eligible if e["date"]==link["event_day"] and e["city"].casefold()==link["city"].casefold() and
   all(has_phrase(e["title"],phrase) for phrase in link["match_phrases"])]
  # Reject ambiguous articles that could refer to different same-city demonstrations.
  if len(matching)!=1:continue
  e=matching[0]
  item={"url":link["url"],"source":link["publisher"],"title":link["label"],
   "published":link["published_on"],"match_type":"independently linked editorial context; not event confirmation",
   "reviewed_on":reviewed_on,"url_check_status":link.get("url_check_status","access_inconclusive")}
  bucket=results.setdefault(str(e["id"]),[])
  if not any(x["url"]==item["url"] for x in bucket):bucket.append(item)
 return {key:rows[:3] for key,rows in results.items()}

def main():
 today=berlin_day()
 events=json.loads(EVENTS.read_text(encoding="utf-8")).get("events",[])
 try:
  supplemental=json.loads((ROOT/"demos-events.json").read_text(encoding="utf-8"))
  if supplemental.get("license")=="CC BY-SA 4.0" and isinstance(supplemental.get("events"),list):
   events.extend(supplemental["events"])
 except (OSError,ValueError) as ex:print("Community event file unavailable",str(ex)[:100])
 manual=json.loads(EDITORIAL.read_text(encoding="utf-8"))
 if manual.get("version")!=1 or not isinstance(manual.get("links"),list):raise ValueError("Invalid editorial link registry")
 matches=match_links(events,manual["links"],today,manual.get("reviewed_on"))
 snapshot={"checked_at":dt.datetime.now(dt.timezone.utc).isoformat(),
  "policy":"Only independently authored labels and verified source URLs; manually reviewed link candidates, automatic event association is NOT event verification. No RSS syndication.",
  "feeds":[],"editorial_sources":sorted({x["publisher"] for x in manual["links"]}),
  "matches":matches}
 prev={}
 try:prev=json.loads(OUTPUT.read_text(encoding="utf-8"))
 except (ValueError,OSError):pass
 if prev.get("matches")==matches and prev.get("policy")==snapshot["policy"] and prev.get("editorial_sources")==snapshot["editorial_sources"]:
  print("Editorial context links unchanged;",len(matches),"matching existing events")
 else:
  OUTPUT.write_text(json.dumps(snapshot,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
  print("Editorial context links:",len(matches),"existing events, no content republished")

if __name__=="__main__":main()
