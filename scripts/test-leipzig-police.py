#!/usr/bin/env python3
import runpy,unittest
m=runpy.run_path("scripts/update-leipzig-police.py")
sample="""<html><body><h1>Einsatz anlässlich des Schülerstreiks und des Protestes der Generation Z am 20. November 2026</h1>
<p>17. November | Informationen der Polizeidirektion Leipzig zum Einsatz</p>
<p>Unter dem Motto „Internationaler Schulstreik gegen die Wehrpflicht“ wurde der Versammlungsbehörde im Zeitraum von 10:00 Uhr bis 16:45 Uhr eine Kundgebung sowie ein Aufzug mit 1.500 Teilnehmenden angezeigt. Die Kundgebung soll auf dem kleinen Wilhelm-Leuschner-Platz stattfinden.</p>
<p>Für den Zeitraum von 17:00 Uhr bis 21:00 Uhr wurde weiterhin eine Versammlung zum Thema „Gen Z regelt“ angezeigt, die ebenfalls am kleinen Wilhelm-Leuschner-Platz starten soll.</p></body></html>"""
class Tests(unittest.TestCase):
 def test_verified(self):
  events=m["parse"](sample)
  self.assertEqual(len(events),2)
  self.assertEqual([e["start"] for e in events],["10:00","17:00"])
  self.assertTrue(all(e["date"]=="2026-11-20" and e["city"]=="Leipzig" for e in events))
  self.assertTrue(all(e["source_url"]==m["URL"] for e in events))
  self.assertTrue(all(e["route"]=="" for e in events),"Do not invent a final route")
 def test_wrong_date_rejected(self):
  self.assertEqual(m["parse"](sample.replace("20. November 2026","21. November 2026")),[])
 def test_unknown_publisher_rejected(self):
  self.assertEqual(m["parse"](sample.replace("Polizeidirektion Leipzig","Fremdblog")),[])
 def test_unconfirmed_event_rejected(self):
  self.assertEqual(len(m["parse"](sample.replace("17:00 Uhr bis 21:00 Uhr","17:00 Uhr bis ca. 20 Uhr"))),1)
 def test_missing_location_rejected(self):
  self.assertEqual(m["parse"](sample.replace("kleinen Wilhelm-Leuschner-Platz","unbekannten Platz")),[])
 def test_no_reproduction(self):
  self.assertTrue(all(len(e["title"])<80 for e in m["parse"](sample)))
if __name__=="__main__":unittest.main()
