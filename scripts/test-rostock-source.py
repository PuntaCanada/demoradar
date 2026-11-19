#!/usr/bin/env python3
"""Test the real Rostock importer offline with simulated official HTML and failures."""
import datetime as dt
import json
import os
import runpy
import tempfile
import unittest
import urllib.request
from pathlib import Path
from unittest.mock import patch

SCRIPT=Path("scripts/update-rostock.py").resolve()
class Response:
 def __init__(self,body):self.body=body
 def __enter__(self):return self
 def __exit__(self,*args):return False
 def read(self,*args):return self.body
class RostockSourceTests(unittest.TestCase):
 def row(self,date,title):
  return '<h3>„'+title+'“</h3><p>Versammlungsbeginn: '+date.strftime("%d.%m.%Y")+', 14:00:00</p><p>Versammlungsart: Kundgebung</p>'
 def test_retention_and_provenance(self):
  now=dt.date.today()
  html='<html><body>'+self.row(now-dt.timedelta(days=20),"Testkundgebung für Frieden und Bildung")+self.row(now-dt.timedelta(days=40),"Alte Demonstration außerhalb des Archivs")+'</body></html>'
  with tempfile.TemporaryDirectory() as folder:
   cwd=os.getcwd()
   try:
    os.chdir(folder);Path("data").mkdir()
    Path("data/events.json").write_text(json.dumps({"events":[{"id":"berlin-test","date":now.isoformat(),"start":"","title":"Test","city":"Berlin"}]}))
    with patch.object(urllib.request,"urlopen",return_value=Response(html.encode())):runpy.run_path(str(SCRIPT))
    data=json.loads(Path("data/events.json").read_text())
    source=json.loads(Path("data/rostock-source.json").read_text())
    records=[e for e in data["events"] if e["id"].startswith("rostock-")]
    self.assertEqual(len(records),1)
    self.assertEqual(records[0]["date"],(now-dt.timedelta(days=20)).isoformat())
    self.assertEqual(source["count"],1)
    self.assertEqual(source["status"],"ok")
    self.assertEqual(source["checked_on"],now.isoformat())
    self.assertTrue(any(e["id"]=="berlin-test" for e in data["events"]))
    before=Path("data/events.json").read_bytes()
    with patch.object(urllib.request,"urlopen",side_effect=OSError("unavailable")):runpy.run_path(str(SCRIPT))
    self.assertEqual(Path("data/events.json").read_bytes(),before)
    self.assertEqual(json.loads(Path("data/rostock-source.json").read_text())["status"],"unavailable")
   finally:os.chdir(cwd)
if __name__=="__main__":unittest.main()
