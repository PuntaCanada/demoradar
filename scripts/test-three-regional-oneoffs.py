#!/usr/bin/env python3
import runpy,unittest
M=runpy.run_path("scripts/update-three-regional-oneoffs.py")
HAN="""<html><body><h1>Männer töten. Patriarchale Gewalt in autoritäten Zeiten.</h1>
<p>Demo am Tag gegen patriarchale Gewalt an Flinta*</p>
<p>Am 25.11.2026, 17:00 Uhr</p><p>Mi. 25.11.2026 | Ab 17:00 Uhr | Christuskirche, Hannover</p></body></html>"""
LUD="""<html><body><h1>Aktionstag gegen Gewalt an Frauen - Demo Ludwigshafen</h1>
<p>25.11.2026 von 11:55 - 14:00</p><p>Europaplatz, 67063 Ludwigshafen</p></body></html>"""
WIE="""<html><body><h1>Aktionstag: Bunt, laut und unübersehbar zur Arbeits- und Sozialministerkonferenz!</h1>
<p>02.12.2026 von 17:30 - 19:30</p><p>Kochbrunnenplatz, Wiesbaden</p></body></html>"""
GEW="""<html><body><h1>Demonstration in Wiesbaden gegen Kürzungen der Bundesregierung</h1>
<p>Wir machen gemeinsam am 2. Dezember 2026 Druck.</p>
<p>Wann: 2. Dezember 2026, ca. 17.30 bis 19.30 Uhr</p>
<p>Wo: Kochbrunnenplatz, Wiesbaden</p></body></html>"""
class Tests(unittest.TestCase):
 def test_three_unique_non_government_events(self):
  ev=[M["verify"](a,b,c) for a,b,c in zip(M["SOURCES"],[HAN,LUD,WIE],[None,None,GEW])]
  self.assertTrue(all(ev))
  self.assertEqual([(e["date"],e["city"]) for e in ev],[
   ("2026-11-25","Hannover"),("2026-11-25","Ludwigshafen"),("2026-12-02","Wiesbaden")])
  self.assertEqual(len({e["id"] for e in ev}),3)
  self.assertTrue(all("nichtstaatlichem" in e["source_status"] and not e["route"] for e in ev))
 def test_fail_closed_original_mismatch(self):
  self.assertIsNone(M["verify"](M["SOURCES"][0],HAN.replace("Christuskirche","Hauptbahnhof")))
  self.assertIsNone(M["verify"](M["SOURCES"][0],HAN.replace("25.11.2026","27.11.2026")))
  self.assertIsNone(M["verify"](M["SOURCES"][1],LUD.replace("11:55","12:55")))
  self.assertIsNone(M["verify"](M["SOURCES"][1],LUD.replace("Europaplatz","Marktplatz")))
  self.assertIsNone(M["verify"](M["SOURCES"][2],WIE))
  self.assertIsNone(M["verify"](M["SOURCES"][2],WIE,GEW.replace("Kochbrunnenplatz","Marktplatz")))
  self.assertIsNone(M["verify"](M["SOURCES"][2],WIE,GEW.replace("17.30 bis 19.30","17.30 bis 20.30")))
 def test_no_context_only_import(self):
  self.assertIsNone(M["verify"](M["SOURCES"][0],"<html>Welcome to trouble</html>"))
  self.assertIsNone(M["verify"](M["SOURCES"][1],"<html>25.11.2026 Europaplatz Weihnachtsmarkt</html>"))
  self.assertIsNone(M["verify"](M["SOURCES"][2],GEW,GEW))
if __name__=="__main__":unittest.main()
