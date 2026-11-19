#!/usr/bin/env python3
"""Offline integration tests for the original official Jena assembly extractor."""
import datetime
import json
import os
import runpy
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SCRIPT=Path("scripts/update-dresden-jena.py").resolve()
MODULE=runpy.run_path(str(SCRIPT))
class JenaSourceTests(unittest.TestCase):
 def block(self,title,date,category="Versammlungen"):
  return f"<h2>{title}</h2><p>{category}</p><p>{date:%d.%m.%Y} | 14:00 - 16:00 Uhr</p>"
 def test_30_day_archive_and_market_exclusion(self):
  today=datetime.date.today()
  site='<html><body><h1>Auflagen von Veranstaltungen und Versammlungen</h1>'+self.block("Kundgebung für Bürgerrechte",today-datetime.timedelta(days=20))+self.block("Alte Kundgebung",today-datetime.timedelta(days=40))+self.block("Stadtfest im Zentrum",today,category="Veranstaltungen")+'</body></html>'
  with tempfile.TemporaryDirectory() as folder:
   cwd=os.getcwd()
   try:
    os.chdir(folder);Path("data").mkdir()
    old={"events":[{"id":"berlin-test","city":"Berlin","date":today.isoformat(),"start":"","title":"Existing verified event"}]}
    Path("data/events.json").write_text(json.dumps(old))
    with patch.dict(MODULE["main"].__globals__,{"fetch":lambda url:site}):
     MODULE["main"]()
    events=json.loads(Path("data/events.json").read_text())["events"]
    jena=[e for e in events if e.get("city")=="Jena"]
    self.assertEqual(len(jena),1)
    self.assertEqual(jena[0]["date"],(today-datetime.timedelta(days=20)).isoformat())
    self.assertEqual(jena[0]["title"],"Kundgebung für Bürgerrechte")
    self.assertTrue(any(e["id"]=="berlin-test" for e in events))
    status=json.loads(Path("data/source-status.json").read_text())
    self.assertEqual(next(x for x in status["sources"] if x["city"]=="Jena")["status"],"ok")
    before=Path("data/events.json").read_bytes()
    with patch.dict(MODULE["main"].__globals__,{"fetch":lambda url:(_ for _ in ()).throw(OSError("network down"))}):
     MODULE["main"]()
    self.assertEqual(Path("data/events.json").read_bytes(),before)
    status=json.loads(Path("data/source-status.json").read_text())
    self.assertEqual(next(x for x in status["sources"] if x["city"]=="Jena")["status"],"unavailable")
   finally:os.chdir(cwd)
if __name__=="__main__":unittest.main()
