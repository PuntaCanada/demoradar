#!/usr/bin/env python3
"""Offline fail-closed readiness checks. Not an importer; no network or event output."""
import datetime as dt
import unittest
import xml.etree.ElementTree as ET

def inspect_rss(payload, http_status=200):
    if http_status != 200:
        return False
    try:
        root = ET.fromstring(payload)
    except ET.ParseError:
        return False
    if root.tag != "rss" or root.attrib.get("version") != "2.0":
        return False
    channel = root.find("channel")
    if channel is None:
        return False
    items = channel.findall("item")
    if not items:
        return False
    guids = []
    for item in items:
        guid = (item.findtext("guid") or "").strip()
        if not guid or guid in guids:
            return False
        guids.append(guid)
    # RSS 2.0 does not require start/end/place or cancellation semantics.
    # Even a syntactically valid RSS is NOT approved for an event import.
    return True

def inspect_notice(category, start, end, place, status):
    if category != "Versammlungen" or not place or not place.strip():
        return False
    if status not in ("announced", "confirmed"):
        return False
    try:
        first = dt.datetime.fromisoformat(start)
        last = dt.datetime.fromisoformat(end)
    except (TypeError, ValueError):
        return False
    return first.tzinfo is not None and last.tzinfo is not None and first < last

class FailClosedTests(unittest.TestCase):
    def test_rss_errors_and_guid(self):
        valid = b'<rss version="2.0"><channel><item><guid>r1</guid></item></channel></rss>'
        self.assertTrue(inspect_rss(valid))
        for status in (403, 429, 503):
            self.assertFalse(inspect_rss(valid, status))
        for invalid in (b'broken', b'<rss>', b'<html></html>',
                        b'<rss version="2.0"><channel><item><title>demo</title></item></channel></rss>',
                        b'<rss version="2.0"><channel><item><guid>a</guid></item><item><guid>a</guid></item></channel></rss>'):
            self.assertFalse(inspect_rss(invalid))
    def test_notice_category_date_status(self):
        args = ("Versammlungen", "2026-11-25T16:00:00+01:00", "2026-11-25T20:00:00+01:00", "Holzmarkt", "confirmed")
        self.assertTrue(inspect_notice(*args))
        for changes in ({0:"Veranstaltungen"}, {1:"bad"}, {2:"2026-11-25T15:00:00+01:00"}, {3:""}, {4:"beschieden"}, {4:"abgesagt"}, {1:"2026-11-25T16:00:00"}):
            modified=list(args)
            for index,value in changes.items():
                modified[index]=value
            self.assertFalse(inspect_notice(*modified))
    def test_no_import_path(self):
        self.assertFalse(inspect_notice("Versammlungen", "2026-11-25T16:00:00+01:00", "2026-11-25T20:00:00+01:00", "Holzmarkt", "beschieden"))
if __name__ == "__main__":
    unittest.main()
