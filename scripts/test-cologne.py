#!/usr/bin/env python3
"""Conservative City of Cologne demo importer unit tests, no network needed."""
import datetime as dt
import runpy
import unittest

m=runpy.run_path("scripts/update-cologne.py")
day=dt.date.today()+dt.timedelta(days=3)
date=day.strftime("%d.%m.%Y")
url="https://www.stadt-koeln.de/leben-in-koeln/verkehr/verkehrskalender/versammlung-mit-aufzug-innenstadt"
def html(s):return "<html><body><h1>Versammlung mit Aufzug (Innenstadt)</h1>"+s+"</body></html>"
class CologneTests(unittest.TestCase):
 def test_explicit_date_time_route(self):
  raw=html("<p>Zeitraum: am Samstag, "+date+", von 12:00 bis 17:00 Uhr</p><p>Aufzugstrecke: Neumarkt - Rathausplatz - Domplatz</p>")
  e=m["parse_detail"](url,raw,dt.date.today())
  self.assertEqual(e["city"],"Köln")
  self.assertEqual(e["state"],"Nordrhein-Westfalen")
  self.assertEqual(e["date"],day.isoformat())
  self.assertEqual(e["start"],"12:00")
  self.assertEqual(e["end"],"17:00")
  self.assertIn("Rathausplatz",e["route"])
  self.assertEqual(e["source_url"],url)
 def test_missing_time_rejected(self):
  self.assertIsNone(m["parse_detail"](url,html("Zeitraum: "+date),dt.date.today()))
 def test_outdated_not_resurrected(self):
  raw=html("<p>Zeitraum: 01.01.2020 von 12:00 bis 13:00 Uhr</p>")
  self.assertIsNone(m["parse_detail"](url,raw,dt.date.today()))
 def test_no_invented_state_for_other_sources(self):
  p=m["Page"]()
  p.feed('<a href="/leben-in-koeln/verkehr/verkehrskalender/versammlung-mit-aufzug-innenstadt">Versammlung</a><a href="https://thirdparty.example/demo">Demonstration</a><a href="/leben-in-koeln/verkehr/verkehrskalender/baustelle">Baustelle</a>')
  self.assertEqual(m["candidate_links"](p),[url])
 def test_invalid_date_dropped(self):
  self.assertIsNone(m["parse_detail"](url,html("Zeitraum: 31.02.2027, von 12:00 bis 17:00 Uhr"),dt.date.today()))
if __name__=="__main__":unittest.main()
