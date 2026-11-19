#!/usr/bin/env python3
import runpy,unittest
m=runpy.run_path("scripts/update-dortmund-police.py")
NOTICE="""<html><body><h1>POL-DO: "GenZ regelt" am 20. November</h1><time>18.11.2026 – 16:22</time>
<p>Polizei Dortmund</p><p>Für den kommenden Freitag, 20. November, hat die Polizei Dortmund
eine Versammlungsanmeldung zum Thema "GenZ regelt" erhalten.</p>
<p>Die Versammlung wird in den Nachmittagsstunden im nördlichen Bereich des Dortmunder
Hauptbahnhofs starten und als Aufzug über innerstädtische Straßen auf dem Friedensplatz
in der Innenstadt enden.</p></body></html>"""
class Tests(unittest.TestCase):
 def test_explicit_original(self):
  e=m["parse"](NOTICE)
  self.assertEqual(len(e),1)
  self.assertEqual(e[0]["date"],"2026-11-20")
  self.assertEqual(e[0]["city"],"Dortmund")
  self.assertEqual(e[0]["location"],"Nördlicher Bereich des Dortmunder Hauptbahnhofs")
  self.assertEqual(e[0]["start"],"")
  self.assertEqual(e[0]["end"],"")
  self.assertEqual(e[0]["route"],"")
  self.assertEqual(e[0]["source_url"],m["URL"])
 def test_wrong_date(self):
  self.assertEqual(m["parse"](NOTICE.replace("Freitag, 20. November","Freitag, 21. November")),[])
 def test_wrong_publisher(self):
  self.assertEqual(m["parse"](NOTICE.replace("Polizei Dortmund","Privatblog")),[])
 def test_missing_origin(self):
  self.assertEqual(m["parse"](NOTICE.replace("im nördlichen Bereich des Dortmunder Hauptbahnhofs starten","irgendwo starten")),[])
 def test_missing_destination(self):
  self.assertEqual(m["parse"](NOTICE.replace("auf dem Friedensplatz in der Innenstadt enden","irgendwo enden")),[])
 def test_missing_dateline(self):
  self.assertEqual(m["parse"](NOTICE.replace("18.11.2026","18.11.")),[])
if __name__=="__main__":unittest.main()
