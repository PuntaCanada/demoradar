#!/usr/bin/env python3
import runpy,unittest
m=runpy.run_path("scripts/import-frankfurt-police-archive.py")
SAMPLE="""<html><body><h1>POL-F: Mehrere Versammlungslagen in der Innenstadt</h1>
<p>13.11.2026 – 14:32</p><p>Polizeipräsidium Frankfurt am Main</p>
<p>Am kommenden Samstag (14. November 2026) finden in Frankfurt am Main mehrere Versammlungslagen
im Innenstadtbereich statt. Eine dieser Versammlungen findet zwischen 12:30 Uhr und
15:00 Uhr an der Hauptwache statt. Diese Kundgebung ist der aktuellen Protestbewegung
"Gen Z regelt" zuzurechnen, die für diesen Tag auch zu einem Aktionstag aufgerufen hat.</p>
<p>Eine weitere Kundgebung findet zwischen 17:00 Uhr - 19:00 Uhr an der Bockenheimer Warte statt.</p>
<p>Der größte angezeigte Aufzug mit 1000 erwarteten Teilnehmenden im Zusammenhang mit dem
aktuellen Irankonflikt beginnt um 16:00 Uhr am Goetheplatz und endet gegen 19:00 Uhr wieder dort.</p>
</body></html>"""
class Tests(unittest.TestCase):
 def test_verified_only_specific_two(self):
  rows=m["parse"](SAMPLE)
  self.assertEqual(len(rows),2,"Unspecified third rally cannot be invented")
  self.assertEqual([e["date"] for e in rows],["2026-11-14"]*2)
  self.assertEqual([e["start"] for e in rows],["12:30","16:00"])
  self.assertEqual([e["location"] for e in rows],["Hauptwache","Goetheplatz"])
  self.assertTrue(all(e["route"]=="" for e in rows))
  self.assertTrue(all(e["source_url"]==m["URL"] for e in rows))
 def test_unknown_publisher(self):
  self.assertEqual(m["parse"](SAMPLE.replace("Polizeipräsidium Frankfurt am Main","Privater Blog")),[])
 def test_missing_dateline(self):
  self.assertEqual(m["parse"](SAMPLE.replace("13.11.2026","13.11.2025")),[])
 def test_wrong_event_date(self):
  self.assertEqual(m["parse"](SAMPLE.replace("14. November 2026","21. November 2026")),[])
 def test_missing_independent_proof(self):
  self.assertEqual(len(m["parse"](SAMPLE.replace("15:00 Uhr an der Hauptwache","14:00 Uhr an der Hauptwache"))),1)
  self.assertEqual(len(m["parse"](SAMPLE.replace("um 16:00 Uhr am Goetheplatz","um 17:00 Uhr am Goetheplatz"))),1)
if __name__=="__main__":unittest.main()
