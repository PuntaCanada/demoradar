#!/usr/bin/env python3
"""Offline regression for durable official Dresden feed and archive retention."""
import datetime as dt
import json
import runpy
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

m=runpy.run_path("scripts/update-dresden.py")

class Response:
 status=200
 def __init__(self,payload):self.payload=payload
 def __enter__(self):return self
 def __exit__(self,*args):return False
 def read(self,*args):return self.payload

class DresdenArchives(unittest.TestCase):
 def run_import(self,rows,existing=()):
  now=dt.date.today()
  with tempfile.TemporaryDirectory() as folder:
   root=Path(folder)
   file=root/"events.json"
   status=root/"dresden-source.json"
   file.write_text(json.dumps({"events":[{"id":"berlin-test","country":"DE","city":"Berlin","date":now.isoformat(),"title":"Demo Berlin"},*existing]}),encoding="utf8")
   original=m["main"].__globals__
   payload=json.dumps({"Versammlungen":rows,"Dateidatum":now.isoformat()}).encode()
   with patch.dict(original,{"FILE":file,"STATUS":status}),patch.object(original["urllib"].request,"urlopen",return_value=Response(payload)):
    m["main"]()
   return json.loads(file.read_text()),json.loads(status.read_text())
 def row(self,day):
  return {"Datum":day.isoformat(),"Thema":"Kundgebung für soziale Gerechtigkeit","Zeit":"15:00 - 17:00","Ort":"Altmarkt","Status":"angemeldet"}
 def test_retains_recent_archives_but_not_old_entries(self):
  today=dt.date.today()
  data,status=self.run_import([self.row(today-dt.timedelta(days=20)),self.row(today-dt.timedelta(days=40)),self.row(today+dt.timedelta(days=2))])
  d=[e for e in data["events"] if e.get("city")=="Dresden"]
  self.assertEqual(len(d),2)
  self.assertEqual([x["date"] for x in d],[(today-dt.timedelta(days=20)).isoformat(),(today+dt.timedelta(days=2)).isoformat()])
  self.assertTrue(all(x["source_url"]==m["PUBLIC_URL"] for x in d))
  self.assertEqual(status["url"],m["URL"])
  self.assertEqual(status["status"],"ok")
  self.assertEqual(status["checked_on"],today.isoformat())
  self.assertEqual(status["source_date"],today.isoformat())
 def test_preserves_unrelated_events(self):
  data,_=self.run_import([self.row(dt.date.today())])
  self.assertTrue(any(x["id"]=="berlin-test" for x in data["events"]))
 def test_preserves_previously_recorded_history_and_individual_notices(self):
  today=dt.date.today()
  historic={"id":"dresden-history","date":(today-dt.timedelta(days=31)).isoformat(),"city":"Dresden","source":m["SOURCE"],"source_url":m["URL"]}
  stale={**historic,"id":"dresden-stale","date":(today+dt.timedelta(days=1)).isoformat()}
  notice={**stale,"id":"dresden-notice","source":"Amtliche Einzelmeldung","source_url":"https://www.dresden.de/meldung"}
  data,_=self.run_import([self.row(today)],(historic,stale,notice))
  self.assertIn(historic,data["events"])
  self.assertIn(notice,data["events"])
  self.assertNotIn(stale,data["events"])
 def test_empty_source_preserves_previous_data(self):
  today=dt.date.today()
  with tempfile.TemporaryDirectory() as folder:
   path=Path(folder)/"events.json"
   status=Path(folder)/"status.json"
   expected={"events":[{"id":"dresden-previous","date":today.isoformat(),"title":"Previously verified Dresden demo"}]}
   path.write_text(json.dumps(expected),encoding="utf8")
   payload=json.dumps({"Versammlungen":[]}).encode()
   g=m["main"].__globals__
   with patch.dict(g,{"FILE":path,"STATUS":status}),patch.object(g["urllib"].request,"urlopen",return_value=Response(payload)):
    m["main"]()
   self.assertEqual(json.loads(path.read_text()),expected)
   self.assertEqual(json.loads(status.read_text())["status"],"unavailable")
if __name__=="__main__":unittest.main()
