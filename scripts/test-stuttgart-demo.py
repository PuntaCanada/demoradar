#!/usr/bin/env python3
import unittest,runpy
m=runpy.run_path("scripts/update-stuttgart-demo.py")
DOC="""<!doctype html><html><body><header>Landeshauptstadt Stuttgart</header>
<h1>Demo zum Internationaler Tag gegen Gewalt an Frauen</h1>
<h2>25. November 2026 18:00 Uhr</h2>
<p>Gemeinsam gehen wir auf die Straße gegen die vielen Formen von Gewalt.</p>
<p>Die Demonstration wird vom Aktionsbündnis 8. März Stuttgart veranstaltet.</p>
<h2>Veranstaltungsort</h2><p>Rotebühlplatz, 70173 Stuttgart</p>
</body></html>"""
class Test(unittest.TestCase):
 def test_unique_factual_demo_event(self):
  events=m["parse"](DOC)
  self.assertEqual(len(events),1)
  self.assertEqual((events[0]["city"],events[0]["date"],events[0]["start"]),("Stuttgart","2026-11-25","18:00"))
  self.assertEqual(events[0]["source_url"],m["URL"])
  self.assertEqual(events[0]["end"],"")
  self.assertEqual(events[0]["route"],"")
  self.assertIn("kein Nachweis",events[0]["source_status"])
 def test_negative_guardrails(self):
  for bad in (
   DOC.replace("Landeshauptstadt Stuttgart","Demo Startup Inc."),
   DOC.replace("25. November 2026","24. November 2026"),
   DOC.replace("18:00 Uhr","19:00 Uhr"),
   DOC.replace("Rotebühlplatz, 70173 Stuttgart","Rathausplatz in München"),
   DOC.replace("Die Demonstration wird vom Aktionsbündnis 8. März Stuttgart veranstaltet.","Unconfirmed organizer."),
   DOC.replace("Demo zum Internationaler Tag gegen Gewalt an Frauen","FoodBRYCKE Demo Day")
  ):
   self.assertEqual(m["parse"](bad),[])
 def test_never_generates_multiple_events_or_media_links(self):
  events=m["parse"](DOC)
  self.assertEqual(len({e["id"] for e in events}),1)
  self.assertNotIn("stream",events[0])
  self.assertNotIn("organizer",events[0])
if __name__=="__main__":unittest.main()
