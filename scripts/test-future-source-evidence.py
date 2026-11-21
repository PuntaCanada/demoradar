#!/usr/bin/env python3
import runpy,unittest,datetime as dt
m=runpy.run_path("scripts/audit-future-source-evidence.py")
STATES=[{"state":"State"+str(i)} for i in range(16)]
def e(id,date,state="State0"):
 return {"id":id,"date":date,"state":state}
class Test(unittest.TestCase):
 def test_future_provenance_remains_strict(self):
  data=[e("berlin-1","2026-11-21"),e("dresden-2","2026-11-22"),
   e("weimar-oneoff-3","2026-11-25","State1"),
   e("stuttgart-oneoff-4","2026-11-25","State2"),
   e("regional-oneoff-5","2026-12-02","State3"),
   e("opaque-community-6","2026-11-25","State4"),
   e("berlin-past","2026-11-20")]
  r=m["report"](data,STATES,dt.date(2026,11,21))
  self.assertEqual(r["all_event_records"],7)
  self.assertEqual(r["dated_today_or_later"],6)
  self.assertEqual(r["old_event_records"],1)
  self.assertEqual(r["source_categories"],{
   "official_structured_source":2,"official_individual_notice":1,
   "municipal_event_listing_registration_unconfirmed":1,
   "nongovernment_organizer_notice":1,"unclassified_source":1})
  self.assertEqual(r["states_with_official_structured_future_events"],1)
  self.assertEqual(r["states_with_any_future_official_notice"],2)
  self.assertEqual(r["by_state"][3]["state"],"State11") # alphabetical sort
 def test_wrong_weekday_or_guessed_state_never_claimed(self):
  r=m["report"]([e("regional-oneoff-x","2026-11-23","Unknown")],STATES,dt.date(2026,11,21))
  self.assertEqual(r["states_with_any_future_official_notice"],0)
  self.assertEqual(r["unmapped_state_records"],1)
 def test_invalid_date_and_duplicates(self):
  r=m["report"]([e("berlin-x","2026-02-30")],STATES,dt.date(2026,11,21))
  self.assertEqual(r["invalid_dates"],1)
  with self.assertRaises(ValueError):
   m["report"]([e("berlin-y","2026-11-21"),e("berlin-y","2026-11-22")],STATES,dt.date(2026,11,21))
if __name__=="__main__":unittest.main()
