#!/usr/bin/env python3
"""Bad Oldesloe: one true 21 Nov police notice, never an inferred 22 Nov event."""
import unittest
import runpy
m=runpy.run_path("scripts/update-bad-oldesloe-police.py")
DOC="""<html><body><h1>POL-RZ: Verkehrsbeeinträchtigungen in Bad Oldesloe</h1>
<time>20.11.2026 – 10:56</time>
<p>Polizeidirektion Ratzeburg</p>
<p>Am kommenden Wochenende (21. und 22. November 2026) findet in Bad Oldesloe eine
Veranstaltung der AfD statt, zu der bereits Gegenversammlungen angemeldet wurden.</p>
<p>Aufgrund einer angemeldeten Demonstration wird es am 21. November 2026 (Samstag)
in den Morgenstunden insbesondere in dem Bereich folgender Straßen zu Verkehrsbeeinträchtigungen
kommen: Käthe-Kollwitz-Straße/ Bahnhofsvorplatz, Bangertstraße, Sülzberg,
Kurparkallee, Salinenstraße, Hamburger Straße.</p></body></html>"""
class Test(unittest.TestCase):
 def test_one_registered_future_protest(self):
  r=m["parse"](DOC)
  self.assertEqual(len(r),1)
  a=r[0]
  self.assertEqual((a["date"],a["city"],a["state"]),("2026-11-21","Bad Oldesloe","Schleswig-Holstein"))
  self.assertEqual(a["start"],"")
  self.assertEqual(a["end"],"")
  self.assertEqual(a["route"],"")
  self.assertEqual(a["source_url"],m["URL"])
  self.assertEqual(len({x["id"] for x in r}),1)
  self.assertIn("nicht bestätigt",a["source_status"])
 def test_exact_original_and_date_required(self):
  for replacement in [
   DOC.replace("Polizeidirektion Ratzeburg","Unknown third-party author"),
   DOC.replace("21. November 2026 (Samstag)","22. November 2026 (Sonntag)"),
   DOC.replace("20.11.2026 – 10:56","18.11.2026 – 10:56"),
   DOC.replace("Gegenversammlungen angemeldet","Gegenversammlungen erwartet"),
   DOC.replace("Bahnhofsvorplatz","Hauptstraße"),
   DOC.replace("Aufgrund einer angemeldeten Demonstration","Eventuell demonstrieren Menschen"),
  ]:self.assertEqual(m["parse"](replacement),[])
 def test_no_fake_november_22_protest(self):
  self.assertEqual([e["date"] for e in m["parse"](DOC)],["2026-11-21"])
  self.assertNotIn("06:30",m["parse"](DOC)[0]["start"])
if __name__=="__main__":unittest.main()
