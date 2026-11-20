import unittest
import datetime as dt
from scripts.update_news import match_links,is_allowed_link,has_phrase
TODAY=dt.date(2026,11,20)
BASE={"publisher":"tagesschau / rbb","url":"https://www.tagesschau.de/inland/regional/berlin/rbb-nicht-nur-gen-z-regelt-neue-jugendproteste-am-freitag-in-berlin-100.html",
 "city":"Berlin","event_day":"2026-11-20","published_on":"2026-11-20",
 "match_phrases":["gen z","regelt"],"label":"Eigenständiger Linktext zum Jugendprotest"}
EVENT={"id":"actual-1","city":"Berlin","date":"2026-11-20","title":"Demo Gen Z regelt am Alexanderplatz"}
class EditorialSafetyTests(unittest.TestCase):
 def test_verified_link_same_event(self):
  m=match_links([EVENT],[BASE],TODAY)
  self.assertEqual(list(m),["actual-1"])
  self.assertEqual(m["actual-1"][0]["title"],BASE["label"])
 def test_city_specific(self):
  self.assertEqual(match_links([dict(EVENT,city="Hamburg")],[BASE],TODAY),{})
 def test_no_fabrication(self):
  self.assertEqual(match_links([], [BASE],TODAY),{})
 def test_no_unrelated_subject(self):
  self.assertEqual(match_links([dict(EVENT,title="Mahnwache für den Frieden")],[BASE],TODAY),{})
 def test_only_one_event(self):
  self.assertEqual(match_links([EVENT,dict(EVENT,id="another-protest")],[BASE],TODAY),{})
 def test_old_article_no_future_link(self):
  self.assertEqual(match_links([EVENT],[dict(BASE,published_on="2026-11-08")],TODAY),{})
 def test_url_must_be_official_https_host(self):
  for url in ("http://www.tagesschau.de/test","https://tagesschau.de.evil.example/test","https://www.tagesschau.de.evil.example/test","https://user:pass@www.tagesschau.de/test","https://www.tagesschau.de:8080/test"):
   self.assertFalse(is_allowed_link(dict(BASE,url=url)))
 def test_no_unlicensed_publisher(self):
  self.assertFalse(is_allowed_link(dict(BASE,publisher="Unknown")))
 def test_canceled_not_linked(self):
  for status in ("cancelled","withdrawn","stopped","abgesagt"):
   self.assertEqual(match_links([dict(EVENT,status_code=status)],[BASE],TODAY),{})
 def test_dedupe(self):
  m=match_links([EVENT],[BASE,BASE],TODAY)
  self.assertEqual(len(m["actual-1"]),1)
 def test_time_window(self):
  self.assertEqual(match_links([EVENT],[BASE],dt.date(2026,11,26)),{})
 def test_word_boundaries(self):
  self.assertTrue(has_phrase("Demo Gen Z regelt am Freitag","gen z"))
  self.assertFalse(has_phrase("Regeltechnik in der Schule","regelt"))
 def test_no_unreviewed_labels(self):
  self.assertFalse(is_allowed_link(dict(BASE,label="<script>bad</script>")))
if __name__=="__main__":unittest.main()
