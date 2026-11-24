"""Request IDs must not collide when the old four-digit RNG repeats."""
import re
import unittest
from datetime import datetime, timedelta
from unittest.mock import patch
import interest


class RequestIdentifiers(unittest.TestCase):
    def test_repeated_legacy_random_draws_do_not_alias_requests(self):
        sender = {"tsap_id": "ID-TEST-SENDER", "credits": 1}
        owners = [{"tsap_id": "ID-TEST-OWNER-A"}, {"tsap_id": "ID-TEST-OWNER-B"}]
        with patch.object(interest.random, "randint", return_value=1000):
            first = interest.create_interest(sender, owners[0])
            second = interest.create_interest(sender, owners[1])
        self.assertNotEqual(first["request_id"], second["request_id"])
        for record in [first, second]:
            self.assertRegex(record["request_id"], r"^REQ-\d{6}-[0-9a-f]{32}$")
            self.assertIsInstance(record["request_id"], str)
        first["status"] = "accepted"
        second["created_at"] = (datetime.utcnow() - timedelta(days=8)).isoformat()
        self.assertEqual(interest.expire_old([first, second], [sender]), 1)
        self.assertEqual(first["status"], "accepted")
        self.assertEqual(second["status"], "expired")
        self.assertTrue(second["credit_refunded"])
        self.assertEqual(sender["credits"], 2)
        self.assertEqual(interest.expire_old([first, second], [sender]), 0)
        self.assertEqual(sender["credits"], 2)

    def test_legacy_ids_remain_valid_for_expiry(self):
        sender = {"tsap_id": "LEGACY-SENDER", "credits": 0}
        old = {"request_id": "REQ-261124-1000", "from_id": sender["tsap_id"],
               "status": "pending", "created_at": (datetime.utcnow() - timedelta(days=8)).isoformat()}
        self.assertEqual(interest.expire_old([old], [sender]), 1)
        self.assertEqual(old["request_id"], "REQ-261124-1000")
        self.assertEqual(sender["credits"], 1)


if __name__ == "__main__":
    unittest.main()
