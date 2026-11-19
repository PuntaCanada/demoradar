#!/usr/bin/env python3
"""Read-only source discovery monitor for undercovered federal states.
Reachability is NOT event availability, licensing permission, or completeness.
No speculative events are generated and no page text is republished.
"""
import json
import urllib.error
import urllib.request
from pathlib import Path

OUTPUT=Path("data/expansion-sources.json")
SOURCES=[
 {"city":"Köln","state":"Nordrhein-Westfalen","type":"official_city_traffic_calendar","url":"https://www.stadt-koeln.de/leben-in-koeln/verkehr/verkehrskalender/index.html","parser":"scripts/update-cologne.py","data_rights":"Only factual event details with original source and attribution; blanket open reuse licence for HTML not confirmed","scope":"Selected traffic-relevant demonstrations, not all registered assemblies"},
 {"city":"Nürnberg","state":"Bayern","type":"official_city_press","url":"https://www.nuernberg.de/presse/mitteilungen/","parser":None,"data_rights":"Press release reuse permission not verified; monitoring and linking only","scope":"Occasional ahead-of-time official protest notices, no complete public assembly list"},
 {"city":"Leipzig","state":"Sachsen","type":"official_police_press","url":"https://www.polizei.sachsen.de/de/42797.htm","parser":None,"data_rights":"No verified bulk reuse licence for press texts; monitoring and linking only","scope":"Event- and operation-specific police information, not complete calendar"},
 {"city":"Frankfurt am Main","state":"Hessen","type":"official_city_press","url":"https://frankfurt.de/de-de/aktuelle-meldung/meldungen/mehrere-versammlungen-angemeldet/","parser":None,"data_rights":"No verified bulk republication licence; official fact notices linked only","scope":"Detailed verified one-off municipal notice for 20 November 2026, not a rolling list"},
 {"city":"Hamburg","state":"Hamburg","type":"official_registration_information","url":"https://www.hamburg.de/service/info/111097758/","parser":None,"data_rights":"Not an event feed; no bulk licence applicable","scope":"Registration rules and contacts only; not a future event source"},
]
def inspect(item):
 output={**item,"status":"unavailable"}
 req=urllib.request.Request(item["url"],headers={"User-Agent":"DemoRadar/1.0 (+https://github.com/PuntaCanada/demoradar)","Accept":"text/html"})
 try:
  with urllib.request.urlopen(req,timeout=12) as response:
   payload=response.read(160_000)
   if response.status!=200 or len(payload)<400:raise ValueError("Empty or non-200 page")
   output["status"]="reachable_unverified_event_feed" if not item["parser"] else "reachable_parser_configured"
 except Exception as exc:output["error"]=str(exc)[:125]
 return output
def main():
 result={"version":1,"method":"read-only official-page check; reachability never establishes event coverage or reuse rights","sources":[inspect(x) for x in SOURCES]}
 previous={}
 try:previous=json.loads(OUTPUT.read_text(encoding="utf-8"))
 except Exception:pass
 if result!=previous:OUTPUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print("Expansion source monitor:",[(s["city"],s["status"]) for s in result["sources"]])
if __name__=="__main__":main()
