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
  self.assertIn("nicht nachgewiesen",events[0]["source_status"])
 def test_negative_guardrails(self):
  for bad in (
   DOC.replace("Rotebühlplatz, 70173 Stuttgart","Rathausplatz in München"),

   DOC.replace("Demo zum Internationaler Tag gegen Gewalt an Frauen","FoodBRYCKE Demo Day")
  ):
   self.assertEqual(m["parse"](bad),[])
 def test_original_word_breaks_and_cms_wrapping(self):
  wrapped=DOC.replace("25. November 2026 18:00 Uhr","25.\n November 2026   18:00  Uhr")
  self.assertEqual(len(m["parse"](wrapped)),1)
  content,checks=m["visible_and_evidence"](DOC)
  self.assertEqual(len(checks),5)
  self.assertTrue(all(checks.values()))
  self.assertEqual(m["parse"](DOC.replace("Rotebühlplatz, 70173 Stuttgart","Rotebühlplatz, 70173 Berlin")),[])
 def test_missing_visible_city_banner_does_not_mask_the_fixed_official_source(self):
  modified=DOC.replace("Landeshauptstadt Stuttgart","Stuttgart's official event portal")
  self.assertEqual(m["parse"](modified),[])
  _,checks=m["visible_and_evidence"](modified)
  self.assertFalse(list(checks.values())[0])
  self.assertTrue(all(list(checks.values())[1:4]))
 def test_manual_one_off_is_never_mislabeled_as_machine_verified(self):
  missing_display_time=DOC.replace("<h2>25. November 2026 18:00 Uhr</h2>","<p>Event date shown via CMS widget</p>")
  found=m["parse"](missing_display_time)
  self.assertEqual(len(found),1)
  self.assertIn("manuell",found[0]["source_status"])
  self.assertIn("nicht maschinenlesbar",found[0]["source_status"])
  self.assertEqual(found[0]["date"],"2026-11-25")
  self.assertEqual(found[0]["start"],"18:00")
  self.assertEqual(m["parse"](missing_display_time.replace("Rotebühlplatz, 70173 Stuttgart","Andere Stadt")),[])
  self.assertEqual(m["parse"](missing_display_time.replace("Aktionsbündnis 8. März Stuttgart","Unbekannt")),[])
 def test_city_calendar_date_time_format_variations(self):
  original=DOC.replace("25. November 2026 18:00 Uhr","25. November 2026, 18:00 Uhr")
  self.assertEqual(len(m["parse"](original)),1)
  changed=DOC.replace("25. November 2026 18:00 Uhr","25. November 2026 – Uhrzeit: 18:00 Uhr")
  self.assertEqual(len(m["parse"](changed)),1)
  shifted=DOC.replace("25. November 2026 18:00 Uhr","25. November 2026 – 19:00 Uhr")
  self.assertEqual(m["parse"](shifted),[]) # New conflicting displayed time must block
  shifted_day=DOC.replace("25. November 2026 18:00 Uhr","26. November 2026, 18:00 Uhr")
  self.assertEqual(m["parse"](shifted_day),[]) # New conflicting displayed day must block
 def test_optional_organizer_wording_does_not_block_verified_event(self):
  changed=DOC.replace("Die Demonstration wird vom Aktionsbündnis 8. März Stuttgart veranstaltet.","Organisatorische Details ändern sich.")
  self.assertEqual(m["parse"](changed),[])
  _,checks=m["visible_and_evidence"](changed)
  self.assertTrue(all(list(checks.values())[1:4]))
  self.assertFalse(list(checks.values())[4])
 def test_never_generates_multiple_events_or_media_links(self):
  events=m["parse"](DOC)
  self.assertEqual(len({e["id"] for e in events}),1)
  self.assertNotIn("stream",events[0])
  self.assertNotIn("organizer",events[0])
if __name__=="__main__":unittest.main()
