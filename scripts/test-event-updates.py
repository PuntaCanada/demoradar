#!/usr/bin/env python3
"""Regression checks: only explicit status = cancellation; route, time and location diffs must be observable."""
import datetime as dt, runpy, unittest
tracker=runpy.run_path("scripts/track-event-updates.py")
class Changes(unittest.TestCase):
 def test_classification(self):
  classify=tracker["classify"]
  self.assertEqual(classify("abgesagt"),"cancelled")
  self.assertEqual(classify("Veranstaltung abgemeldet"),"withdrawn")
  self.assertEqual(classify("Versammlung vorzeitig beendet"),"stopped")
  for s in ("angemeldet","genehmigt","keine Meldung","abgerufen",""):
   self.assertEqual(classify(s),"")
 def test_route_time_and_place_change(self):
  date=(dt.datetime.now(dt.timezone.utc).date()+dt.timedelta(days=1)).isoformat()
  a={"date":date,"city":"Dresden","title":"Friedensmarsch","start":"14:00","end":"17:00","route":"A nach B","location":"A","event_status":"","source_url":"https://example.org"}
  b={**a,"start":"15:00","route":"A nach C","location":"C"}
  ch=tracker["changes"]({"test":a},{"test":b})
  self.assertEqual(len(ch),1)
  self.assertEqual({x["field"] for x in ch[0]["changes"]},{"start","route","location"})
 def test_missing_entry_not_cancelled(self):
  date=(dt.datetime.now(dt.timezone.utc).date()+dt.timedelta(days=1)).isoformat()
  before={"gone":{"date":date,"city":"Berlin","title":"Protest","start":"13:00"}}
  self.assertEqual(tracker["changes"](before,{}),[])
if __name__=="__main__":unittest.main()
