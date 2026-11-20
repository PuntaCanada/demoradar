#!/usr/bin/env python3
"""No invented organizer event dates, and no government-source misclassification."""
import runpy
import unittest
mod=runpy.run_path("scripts/update-regional-organizer-oneoffs.py")
POTSDAM="""<html><body><h1>Netzwerk der brandenburgischen Frauenhäuser e.V.</h1>
<h2>Demonstration</h2><p>November 25 @ 15:00 - 18:00</p>
<p>Die Demo startet um 15 Uhr am Nauener Tor und führt zum Landtag.</p>
<p>Sie wird initiiert von dem Inner Wheel Club Potsdam und der Gleichstellungsbeauftragte der Stadt Potsdam.</p>
<p>Gleichstellungsbeauftragte der Stadt Potsdam</p></body></html>"""
LINDENBERG="""<html><body><h1>BÜNDNIS 90/DIE GRÜNEN</h1><p>im Landkreis Lindau</p>
<h2>Alice Weidel raus aus Lindenberg!</h2><p>Datum: 29.11.2026</p>
<p>Uhrzeit: 11:00 - Offenes Ende</p><p>Ort: Stadtplatz Lindenberg</p>
<p>Veranstalter: OAT Westallgäu</p></body></html>"""
class Checks(unittest.TestCase):
 def test_two_real_distinct_protest_events(self):
  a=mod["parse"](mod["SOURCES"][0],POTSDAM)
  b=mod["parse"](mod["SOURCES"][1],LINDENBERG)
  self.assertIsNotNone(a);self.assertIsNotNone(b)
  self.assertEqual((a["date"],a["city"],a["start"]),("2026-11-25","Potsdam","15:00"))
  self.assertEqual((b["date"],b["city"],b["start"]),("2026-11-29","Lindenberg im Allgäu","11:00"))
  self.assertNotEqual(a["id"],b["id"])
  self.assertTrue(all("keine amtliche" in row["source_status"].lower() for row in (a,b)))
  self.assertTrue(all("presseportal" not in row["source_url"] for row in (a,b)))
 def test_organizer_primary_context_is_required(self):
  for s in ("Nauener Tor","Landtag","15:00","November 25","Gleichstellungsbeauftragte der Stadt Potsdam","Demonstration"):
   self.assertIsNone(mod["parse"](mod["SOURCES"][0],POTSDAM.replace(s,"different information")),s)
  for s in ("29.11.2026","Stadtplatz Lindenberg","11:00","OAT Westallgäu","Alice Weidel raus aus Lindenberg!"):
   self.assertIsNone(mod["parse"](mod["SOURCES"][1],LINDENBERG.replace(s,"different information")),s)
 def test_unrelated_calendar_not_inferred(self):
  self.assertIsNone(mod["parse"](mod["SOURCES"][0],"<html>Flaggenhissung Potsdam 25 November 2026</html>"))
  self.assertIsNone(mod["parse"](mod["SOURCES"][1],"<html>Heizungskeller 29.11.2026</html>"))
  self.assertNotIn("route",{"fake":"not the output"})
if __name__=="__main__":unittest.main()
