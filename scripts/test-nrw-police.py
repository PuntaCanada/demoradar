#!/usr/bin/env python3
import runpy,unittest
m=runpy.run_path("scripts/update-nrw-police.py")
BONN="""<html><body><h1>Polizei Bonn</h1><time>19.11.2026</time>
<p>Demonstration mit Aufzug in Bonn am Freitag, 20.11.2026.</p>
<p>Die Protestkundgebung gegen die Wiedereinführung der Wehrpflicht findet statt.
Die Versammlung beginnt um 10:00 Uhr an der Poppelsdorfer Allee.
Die Versammlung endet gegen 14:00 Uhr im Bonner Hofgarten.</p></body></html>"""
MUENSTER="""<html><body><h1>Polizei Münster</h1><time>19.11.2026</time>
<p>Versammlung am Freitag (20.11.). Für den kommenden Freitag liegen die
Anmeldungen zweier Versammlungen mit den Themen "Schulstreik gegen die Wehrpflicht"
und "Nein zur Wehrpflicht" vor.</p><p>Angezeigt sind zwei Aufzüge mit insgesamt rund
500 Personen in der Zeit von 10-13 Uhr. Die Route verläuft vom Hauptbahnhof.
Die andere Route verläuft vom Schlossplatz.</p></body></html>"""
class Tests(unittest.TestCase):
 def test_bonn(self):
  e=m["parse"](BONN,"Bonn");self.assertEqual(len(e),1)
  self.assertEqual(e[0]["date"],"2026-11-20")
  self.assertEqual((e[0]["start"],e[0]["end"],e[0]["location"]),("10:00","14:00","Poppelsdorfer Allee"))
  self.assertEqual(e[0]["route"],"")
 def test_muenster(self):
  e=m["parse"](MUENSTER,"Münster");self.assertEqual(len(e),2)
  self.assertEqual([x["location"] for x in e],["Hauptbahnhof","Schlossplatz"])
  self.assertTrue(all(not x["start"] and not x["end"] for x in e),"Overall 10-13 window cannot become individual event timings")
 def test_no_source_or_time(self):
  self.assertFalse(m["parse"](BONN.replace("Polizei Bonn","Unbekannt"),"Bonn"))
  self.assertFalse(m["parse"](BONN.replace("10:00 Uhr","11:00 Uhr"),"Bonn"))
  self.assertFalse(m["parse"](MUENSTER.replace("zwei Aufzüge","ein Aufzug"),"Münster"))
  self.assertFalse(m["parse"](BONN,"Münster"))
 def test_short_date_without_dated_publication_rejected(self):
  self.assertFalse(m["parse"](MUENSTER.replace("19.11.2026","19.11."),"Münster"))
 def test_no_guess_routes(self):
  self.assertTrue(all(not x["route"] for city,doc in [("Bonn",BONN),("Münster",MUENSTER)] for x in m["parse"](doc,city)))
if __name__=="__main__":unittest.main()
