#!/usr/bin/env python3
"""Strict offline HTML-evidence and no-copied-or-invented-events test."""
import datetime as dt
import runpy,unittest
m=runpy.run_path("scripts/update-weimar-oneoffs.py")
SOURCE_HEADER="<h1>Bestätigte Versammlungsanmeldungen in Weimar</h1>"
FIRST="<article>Fr, 20.11.26 13:00 bis 19:00 Uhr <h4>Straßenfest des Schulstreikkomitees gegen die Wiedereinführung der Wehrpflicht</h4>Stephane-Hessel-Platz</article>"
FOUR="".join("<article>"+w+", "+str(int(day[8:10]))+"."+day[5:7]+"."+day[2:4]+" "+start+" bis "+end+" Uhr <h4>"+title+"</h4>"+venue+"</article>" for day,w,start,end,title,venue in m["ANNOUNCEMENTS"])
DOC="<html>"+SOURCE_HEADER+FIRST+FOUR+"</html>"
class Checks(unittest.TestCase):
 def test_four_upcoming_distinct_primary_records(self):
  actual=m["parse"](DOC)
  self.assertEqual(len(actual),4)
  self.assertEqual([e["date"] for e in actual],["2026-11-22","2026-11-23","2026-11-24","2026-11-25"])
  self.assertEqual(len(set(e["id"] for e in actual)),4)
  self.assertTrue(all(e["state"]=="Thüringen" and e["city"]=="Weimar" and e["location"]=="Goetheplatz" for e in actual))
  self.assertTrue(all(e["source_url"]==m["URL"] and "keine" in e["source_status"] for e in actual))
 def test_must_be_exactly_same_announcement(self):
  self.assertEqual(m["parse"](DOC.replace(SOURCE_HEADER,"<h1>General city events</h1>")),[])
  self.assertEqual(len(m["parse"](DOC.replace("Mo, 23.11.26","Di, 23.11.26"))),3)
  self.assertEqual(len(m["parse"](DOC.replace("19:00 bis 21:00 Uhr","19:15 bis 21:00 Uhr"))),3)
  self.assertEqual(len(m["parse"](DOC.replace("Bunte Begegnung - Für","Another event - Für"))),3)
  self.assertEqual(len(m["parse"](DOC.replace("Di, 24.11.26","Di, 24.11.27"))),3)
  self.assertEqual(len(m["parse"](DOC.replace("Goetheplatz","Other square",1))),4)
  self.assertEqual(len(m["parse"](DOC.replace("<h4>Frieden schaffen ohne Waffen</h4>Goetheplatz","<h4>Frieden schaffen ohne Waffen</h4>Unbekannt"))),3)
 def test_no_false_link_to_previous_date(self):
  wrong=DOC.replace("So, 22.11.26 15:00 bis 18:00 Uhr","So, 22.11.26 12:00 bis 13:00 Uhr")
  self.assertEqual(len(m["parse"](wrong)),3)
if __name__=="__main__":unittest.main()
