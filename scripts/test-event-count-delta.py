#!/usr/bin/env python3
import runpy,unittest
M=runpy.run_path("scripts/audit-event-count-delta.py")
class Test(unittest.TestCase):
 def test_three_berlin_items_disappear_without_cancellation(self):
  old=M["snapshot"]([{"id":"berlin-1","city":"Berlin","date":"2026-11-20"},
   {"id":"berlin-2","city":"Berlin","date":"2026-11-21"},
   {"id":"berlin-3","city":"Berlin","date":"2026-11-21"},
   {"id":"regional-oneoff-a","city":"Wiesbaden","date":"2026-12-02"}])
  now=M["snapshot"]([{"id":"regional-oneoff-a","city":"Wiesbaden","date":"2026-12-02"}])
  out=M["compare"](old,now,"2026-11-21")
  self.assertEqual((out["before_total"],out["after_total"],out["delta"]),(4,1,-3))
  self.assertEqual((out["removed_from_dataset_count"],out["added_to_dataset_count"]),(3,0))
  self.assertFalse(out["removed_entries_are_cancellations"])
  berlin=next(x for x in out["source_groups"] if x["group"]=="berlin_official_json")
  self.assertEqual((berlin["before"],berlin["after"],berlin["removed_ids"]),(3,0,3))
  self.assertEqual(len(out["removed_samples"]),3)
 def test_replacement_not_misrepresented_as_pure_loss(self):
  before=M["snapshot"]([{"id":"berlin-old","city":"Berlin","date":"2026-11-20"}])
  after=M["snapshot"]([{"id":"berlin-new","city":"Berlin","date":"2026-11-21"}])
  report=M["compare"](before,after,"2026-11-21")
  self.assertEqual(report["delta"],0)
  self.assertEqual(report["removed_from_dataset_count"],1)
  self.assertEqual(report["added_to_dataset_count"],1)
 def test_duplicate_ids_rejected(self):
  with self.assertRaisesRegex(ValueError,"Duplicate event"):
   M["snapshot"]([{"id":"a"},{"id":"a"}])
if __name__=="__main__":unittest.main()
