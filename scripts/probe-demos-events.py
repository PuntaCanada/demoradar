#!/usr/bin/env python3
"""Test documented small, public read-only list query and save only safe schema metadata."""
import json,urllib.request
from pathlib import Path
URL="https://api.demonstrations.org/v1/event/all"
OUT=Path("data/demos-api-sample.json")
payload=json.dumps({"sorting_key":"start_time","sorting_direction":"asc","offset":0,"limit":3}).encode()
req=urllib.request.Request(URL,data=payload,headers={"Content-Type":"application/json","Accept":"application/json","User-Agent":"DemoRadar/0.1 (+https://github.com/PuntaCanada/demoradar)"},method="POST")
result={"api_url":URL,"query":{"sorting_key":"start_time","sorting_direction":"asc","offset":0,"limit":3},"status":"unavailable","import_enabled":False}
try:
 with urllib.request.urlopen(req,timeout=22) as response:
  result["http_status"]=response.status
  body=json.load(response)
 result["status"]="ok"
 result["root_type"]=type(body).__name__
 if isinstance(body,dict):
  result["root_keys"]=list(body.keys())
  result["root_value_types"]={k:type(v).__name__ for k,v in body.items()}
  for k,v in body.items():
   if isinstance(v,list) and v and isinstance(v[0],dict):
    result["list_field"]=k
    result["list_count"]=len(v)
    result["item_keys"]=list(v[0].keys())
    result["item_types"]={z:type(q).__name__ for z,q in v[0].items()}
    result["sample_event"]={key:v[0].get(key) for key in ("id","name","title","start_time","end_time","date","status","url","city","country","location","description","event_id") if key in v[0] and isinstance(v[0].get(key),(str,int,float,type(None)))}
    break
 elif isinstance(body,list) and body and isinstance(body[0],dict):
  result["list_count"]=len(body)
  result["item_keys"]=list(body[0].keys())
  result["item_types"]={k:type(v).__name__ for k,v in body[0].items()}
  result["sample_event"]={k:body[0].get(k) for k in ("id","name","title","start_time","end_time","date","status","url","city","country","location") if k in body[0] and isinstance(body[0].get(k),(str,int,float,type(None)))}
except Exception as ex:result["error"]=str(ex)[:220]
old={}
if OUT.exists():
 try:old=json.loads(OUT.read_text(encoding="utf-8"))
 except Exception:pass
if old!=result:
 OUT.parent.mkdir(parents=True,exist_ok=True)
 OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("Demos public event sample:",result["status"],result.get("root_keys"),result.get("item_keys"))
