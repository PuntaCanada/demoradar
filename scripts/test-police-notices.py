#!/usr/bin/env python3
"""Offline checks for explicit, publisher-authored Cologne assembly facts."""
import datetime as dt
import runpy
import unittest
m=runpy.run_path("scripts/update-police-notices.py")
notice=m["NOTICES"][0]
sample="""<html><body><h1>Polizei Köln bereitet sich auf Versammlungen am Freitag vor</h1>
<time>19.11.2026 – 07:58</time><p>Für Freitag (20. November) wurde für
die Initiative "Gen Z regelt Köln" eine Versammlung unter dem Motto
"Unsere Zukunft liegt in unseren Händen" bei der Polizei Köln angezeigt.</p>
<p>Die Veranstaltung ist von 13 bis 19 Uhr angesetzt.</p>
<p>Darüber hinaus hat eine Privatperson eine weitere Versammlung unter dem
Motto "Schulstreik gegen die Wehrpflicht" angezeigt. Für den Zeitraum
von 11 bis 16 Uhr rechnet die Anmelderin mit rund 200 Teilnehmenden.</p>
<p>Die Versammlung ist bereits Ende Oktober bestätigt worden.</p>
</body></html>"""
class PoliceNoticeTests(unittest.TestCase):
 def test_factual_records(self):
  events=m["parse_notice"](sample,notice)
  self.assertEqual(len(events),2)
  self.assertEqual([e["start"] for e in events],["13:00","11:00"])
  self.assertEqual([e["date"] for e in events],["2026-11-20"]*2)
  self.assertEqual([e["end"] for e in events],["19:00","16:00"])
  self.assertTrue(all(e["location"]=="" and e["route"]=="" for e in events),
                  "Not-yet-agreed location and routes must not be invented")
  self.assertTrue(all(e["source_url"]==notice["url"] for e in events))
 def test_missing_publisher_rejected(self):
  self.assertEqual(m["parse_notice"](sample.replace("Polizei Köln","privater Blog"),notice),[])
 def test_wrong_date_rejected(self):
  self.assertEqual(m["parse_notice"](sample.replace("20. November","21. November"),notice),[])
 def test_unconfirmed_second_not_imported(self):
  e=m["parse_notice"](sample.replace("Die Versammlung ist bereits Ende Oktober bestätigt worden.",""),notice)
  self.assertEqual(len(e),1)
 def test_missing_start_time_rejected(self):
  e=m["parse_notice"](sample.replace("Die Veranstaltung ist von 13 bis 19 Uhr angesetzt.",""),notice)
  self.assertEqual(len(e),1)
 def test_no_reproduction_of_press_release(self):
  for e in m["parse_notice"](sample,notice):
   self.assertNotIn("Die Veranstaltung ist",str(e))
   self.assertNotIn("Für Freitag",str(e))
if __name__=="__main__":unittest.main()
