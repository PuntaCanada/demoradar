#!/usr/bin/env python3
"""No network: source monitoring is observation-only and never imports an event."""
import importlib.util
import json
import tempfile
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location("official_sources","scripts/monitor-official-sources.py")
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
assert any(x["city"]=="Köln" and x["parser"] for x in module.SOURCES)
assert sum(x["city"]=="Leipzig" for x in module.SOURCES)==2
assert all("url" in x and "data_rights" in x and "scope" in x for x in module.SOURCES)
class Response:
 status=200
 def __enter__(self):return self
 def __exit__(self,*_):return False
 def read(self,_):return b"official bulletin or showcase"*40
with patch.object(module.urllib.request,"urlopen",return_value=Response()):
 for item in module.SOURCES:
  checked=module.inspect(item)
  assert checked["status"]==("reachable_parser_configured" if item["parser"] else "reachable_monitor_only_not_a_feed")
  assert "events" not in checked
with tempfile.TemporaryDirectory() as tmp:
 p=Path(tmp)/"sources.json"
 with patch.object(module,"OUTPUT",p),patch.object(module.urllib.request,"urlopen",return_value=Response()):
  module.main()
  result=json.loads(p.read_text())
  assert len(result["sources"])==len(module.SOURCES)
  assert all("events" not in s for s in result["sources"])
print("official-source monitor: safe statuses and no fictitious events OK")
