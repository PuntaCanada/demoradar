#!/usr/bin/env python3
"""Discover Demos Berlin e.V. documented API schema without guessing event routes.
The provider's published data licence is CC BY-SA 4.0. No events imported
until endpoint and response shape have been checked separately."""
import json,re,urllib.request,urllib.error,html
from pathlib import Path
BASE="https://api.demonstrations.org"
DOCS=BASE+"/v1/docs"
CANDIDATES=[BASE+"/v1/openapi.json",BASE+"/openapi.json"]
OUT=Path("data/demos-api-status.json")
def request(url):
 req=urllib.request.Request(url,headers={"Accept":"application/json, text/html;q=0.9","User-Agent":"DemoRadar/0.1 (schema discovery; github.com/PuntaCanada/demoradar)"})
 with urllib.request.urlopen(req,timeout=14) as response:
  ct=response.headers.get("Content-Type","")
  return response.status,ct,response.read(800000)
def main():
 report={"provider":"Demos Berlin e.V.","docs_url":DOCS,"license":"CC BY-SA 4.0","license_url":"https://creativecommons.org/licenses/by-sa/4.0/","status":"unverified","import_enabled":False,"candidates":[]}
 urls=[DOCS]+CANDIDATES
 for url in urls:
  item={"url":url}
  try:
   status,ct,data=request(url)
   item.update(http_status=status,content_type=ct)
   schema=None
   try:schema=json.loads(data)
   except (ValueError,UnicodeDecodeError):pass
   if isinstance(schema,dict) and ("openapi" in schema or "swagger" in schema) and isinstance(schema.get("paths"),dict):
    item.update(kind="openapi",version=schema.get("openapi",schema.get("swagger")),path_count=len(schema["paths"]))
    # Only metadata, not payloads, stored publicly.
    item["get_paths"]=[p for p,v in schema["paths"].items() if isinstance(v,dict) and "get" in v][:100]
    report["status"]="schema_found"
    report["schema_url"]=url
   elif "text/html" in ct:
    page=data.decode("utf-8","replace")
    item["kind"]="html_docs"
    # Only same-origin schema references may be probed on future iterations.
    links=re.findall(r'(?:url|href|src)\s*[:=]\s*["\']([^"\']+(?:openapi|swagger)[^"\']*)["\']',page,re.I)[:10]
    item["potential_spec_links"]=[html.unescape(x) for x in links]
   else:item["kind"]="unknown"
  except Exception as e:item["error"]=str(e)[:220]
  report["candidates"].append(item)
 old={}
 if OUT.exists():
  try:old=json.loads(OUT.read_text(encoding="utf-8"))
  except (ValueError,OSError):pass
 if old!=report:
  OUT.parent.mkdir(parents=True,exist_ok=True)
  OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print("Demos API schema:",report["status"],"; import disabled until event response verified.")
if __name__=="__main__":main()
