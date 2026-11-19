#!/usr/bin/env python3
import datetime as dt,runpy,unittest
mod=runpy.run_path("scripts/update-frankfurt.py")
today=dt.date.today()
date=today+dt.timedelta(days=1)
months={1:"Januar",2:"Februar",3:"März",4:"April",5:"Mai",6:"Juni",7:"Juli",8:"August",9:"September",10:"Oktober",11:"November",12:"Dezember"}
date_title=f"{date.day}. {months[date.month]}"
sample=f"""<html><body><h3>Mehrere Versammlungen sind für den {date_title} angemeldet</h3><p>{today:%d.%m.%Y}, 14:46 Uhr</p>
<h3>1. Gen-Z regelt:</h3><ul><li>Stationäre Kundgebung auf der Weseler Werft</li><li>Zeit: 14 bis 16.30 Uhr</li><li>Thema: „Junge Erwachsene demonstrieren gegen Wehrpflicht“</li><li>Angezeigte Zahl der Teilnehmerinnen und Teilnehmer: 4000 Personen</li></ul>
<h3>2. Internationaler Jugendverband:</h3><ul><li>Demonstrationszug vom Universitätsplatz bis zur Hauptwache</li><li>Zeit: 11 bis 13.30 Uhr</li><li>Thema: „Internationaler Jugendstreik an der Universität“</li></ul></body></html>"""
class Tests(unittest.TestCase):
 def test_import_strict_explicit_fields(self):
  e=mod["parse"](sample,today)
  self.assertEqual(len(e),2)
  self.assertEqual(e[0]["city"],"Frankfurt am Main")
  self.assertEqual(e[0]["date"],date.isoformat())
  self.assertEqual(e[0]["start"],"14:00")
  self.assertEqual(e[0]["end"],"16:30")
  self.assertEqual(e[0]["registered_participants"],"4000")
  self.assertEqual(e[1]["route"],"vom Universitätsplatz bis zur Hauptwache")
 def test_ambiguous_or_old(self):
  self.assertEqual(mod["parse"](sample.replace("Thema:","Anlass:"),today),[])
  self.assertEqual(mod["parse"](sample,today+dt.timedelta(days=16)),[])
if __name__=="__main__":unittest.main()
