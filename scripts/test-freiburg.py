#!/usr/bin/env python3
import datetime as dt
import unittest
import runpy
mod=runpy.run_path("scripts/update-freiburg.py")
DOC="""<html><head><title>Verkehrseinschränkungen in der Innenstadt</title></head><body>
<h1>Verkehrseinschränkungen in der Innenstadt</h1>
<p>Am Freitag, 20. November, finden in Freiburg mehrere Demonstrationen statt.</p>
<h2>Angemeldete Versammlungen in der Innenstadt</h2>
<p>Um 10 Uhr beginnt auf dem Platz der Universität eine Kundgebung mit dem Titel
„Schulstreik gegen Wehrpflicht“. Die Aktion endet um 13.45 Uhr.</p>
<p>Um 11 Uhr startet auf dem Platz der Alten Synagoge eine Versammlung
unter dem Motto „Jugenddemo gegen Krieg“. Die Versammlung wird um 14.30 Uhr beendet.</p>
<p>Abends wird von 19 bis 21 Uhr eine Demonstration zum Thema „GenZ regelt das!“ erwartet.
Dazu könnten rund 3.000 Menschen auf dem Platz der Alten Synagoge zusammenkommen.</p>
<p>Veröffentlicht am 19. November 2026</p>
</body></html>"""

class Tests(unittest.TestCase):
 def test_three_independent_original_facts(self):
  events=mod["parse"](DOC)
  self.assertEqual(len(events),3)
  self.assertEqual([(e["start"],e["end"]) for e in events],
   [("10:00","13:45"),("11:00","14:30"),("19:00","21:00")])
  self.assertEqual({e["state"] for e in events},{"Baden-Württemberg"})
  self.assertTrue(all(e["source_url"]==mod["URL"] for e in events))
  self.assertEqual(len({e["id"] for e in events}),3)
 def test_no_inference_from_incomplete_or_undated_page(self):
  self.assertEqual(mod["parse"](DOC.replace("Veröffentlicht am 19. November 2026","")),[])
  self.assertEqual(mod["parse"](DOC.replace("Am Freitag, 20. November","Am Freitag, 27. November")),[])
  self.assertEqual(mod["parse"](DOC,dt.date(2026,11,21)),[])
  self.assertEqual(len(mod["parse"](DOC.replace("GenZ regelt das!","Unrelated event"))),2)
  self.assertEqual(mod["parse"]("<html>GenZ regelt das!</html>"),[])
 def test_no_fake_future_dates(self):
  self.assertEqual({e["date"] for e in mod["parse"](DOC)},{"2026-11-20"})
  self.assertTrue(all(e["source_status"].startswith("Amtlich angekündigte Einzel") for e in mod["parse"](DOC)))
if __name__=="__main__":unittest.main()
