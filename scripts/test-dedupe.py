#!/usr/bin/env python3
import runpy
import unittest
d=runpy.run_path("scripts/dedupe-events.py")["dedupe"]
def entry(id,title="Mahnwache für Frieden",city="Dresden",date="2026-11-20",start="16:00",location="Rathaus",source="Amtliche Quelle"):
 return dict(id=id,title=title,city=city,date=date,start=start,location=location,source=source,source_url="https://example.org/"+id,source_status="behördlich veröffentlicht")
class TestDedup(unittest.TestCase):
 def test_same_event_different_sources(self):
  x,removed=d([entry("a"),entry("b")])
  self.assertEqual(len(x),1)
  self.assertEqual(len(removed),1)
  self.assertEqual(len(x[0].get("additional_sources",[])),1)
 def test_other_locations_remain(self):
  x,_=d([entry("a"),entry("b",location="Bahnhof")])
  self.assertEqual(len(x),2)
 def test_other_city_remains(self):
  x,_=d([entry("a"),entry("b",city="Rostock")])
  self.assertEqual(len(x),2)
 def test_different_time_remains(self):
  x,_=d([entry("a"),entry("b",start="18:00")])
  self.assertEqual(len(x),2)
 def test_similar_but_not_same_title_remains(self):
  x,_=d([entry("a"),entry("b",title="Mahnwache für Frieden und Demokratie")])
  self.assertEqual(len(x),2)
if __name__=="__main__":unittest.main()
