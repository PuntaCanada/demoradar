#!/usr/bin/env python3
import runpy,unittest
m=runpy.run_path("scripts/import-leipzig-archive.py")
SAMPLE="""<html><body><h1>Einsatz zu den Protesten der Generation Z am 31. Oktober in Leipzig</h1>
<p>Polizeidirektion Leipzig, 26. Oktober 2026</p>
<p>Unter dem Motto „Gen Z regelt! Solidarität mit den Protestierenden in Frankreich!“
wurde der Versammlungsbehörde der Stadt Leipzig eine Versammlung mit 100 Teilnehmern angezeigt.
Der angegebene Zeitraum für die Versammlung ist der 31. Oktober 2026 von 14:00 Uhr bis 17:00 Uhr.</p>
<p>Um 14:00 Uhr begann die Demonstration wie angemeldet am Augustusplatz.</p>
</body></html>"""
class TestArchive(unittest.TestCase):
 def test_official_historical_event(self):
  events=m["parse"](SAMPLE)
  self.assertEqual(len(events),1)
  self.assertEqual(events[0]["date"],"2026-10-31")
  self.assertEqual(events[0]["start"],"14:00")
  self.assertEqual(events[0]["location"],"Augustusplatz")
  self.assertEqual(events[0]["route"],"")
  self.assertTrue(events[0]["source_url"].startswith("https://www.polizei.sachsen.de/"))
 def test_date_mismatch(self):
  self.assertEqual(m["parse"](SAMPLE.replace("31. Oktober 2026","30. Oktober 2026")),[])
 def test_publisher_missing(self):
  self.assertEqual(m["parse"](SAMPLE.replace("Polizeidirektion Leipzig","Privater Blog")),[])
 def test_time_missing(self):
  self.assertEqual(m["parse"](SAMPLE.replace("14:00 Uhr bis 17:00 Uhr","Uhrzeit unbekannt")),[])
 def test_location_missing(self):
  self.assertEqual(m["parse"](SAMPLE.replace("Augustusplatz","unbekannt")),[])
 def test_no_unrelated_events(self):
  self.assertEqual(len(m["parse"](SAMPLE+"<p>weitere Kundgebungen</p>")),1)
if __name__=="__main__":unittest.main()
