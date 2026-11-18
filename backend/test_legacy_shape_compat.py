# Compatibility gate: current changes against legacy stored-data shapes.
# Every shape below is evidenced in the repo's own fixtures/tests (qa/real-backend,
# backend/test_*.py) - the authorized record of what existing member records and
# preference payloads look like. Unknown/ambiguous must stay unknown; nothing
# may be fabricated.
import os, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from test_storage import isolate_test_stores
isolate_test_stores("legacy-shape-compat")
import quality


class LegacySalaryShapes(unittest.TestCase):
    def test_catalog_and_grounded_annual_labels(self):
        self.assertEqual(quality.salary_label_range_rupees("₹10 - 12 Lakhs / year"), (1000000, 1200000))
        self.assertEqual(quality.salary_label_range_rupees("₹12 Lakhs / year"), (1200000, 1200000))
        self.assertEqual(quality.salary_label_range_rupees("10 LPA"), (1000000, 1000000))
        self.assertEqual(quality.salary_label_range_rupees("₹50+ Lakhs (NRI / High Networth)"), (5000000, None))

    def test_ambiguous_legacy_labels_stay_unknown(self):
        # Bare "L" shorthand, k-labels, bare numbers, monthly marks and prose
        # never become a fabricated annual figure; they earn no income check.
        for label in ("10L", "12L", "8L", "2L+/mo", "40k", "60k", "80k",
                      "50000", "Member-entered range", "Under ₹1 Lakh / Not Disclosed"):
            self.assertEqual(quality.salary_label_range_rupees(label), (0, None), label)

    def test_comparison_verdicts_on_legacy_mix(self):
        pref = "₹5 - 7 Lakhs / year"
        self.assertEqual(quality.income_range_comparison("10 LPA", pref), "met")
        self.assertIsNone(quality.income_range_comparison("2L+/mo", pref))
        self.assertIsNone(quality.income_range_comparison("60k", pref))
        self.assertIsNone(quality.income_range_comparison("50000", pref))


class LegacyHeightShapes(unittest.TestCase):
    def test_catalog_and_cm_shapes(self):
        self.assertEqual(quality._height_cm("5'6\""), 168)
        self.assertEqual(quality._height_cm("5'10\""), 178)
        self.assertEqual(quality._height_cm("170 cm"), 170)

    def test_spelled_out_feet_inches(self):
        # Repo fixtures store "5 ft 6 in" / "5ft 6in"; these must convert
        # exactly, not drop the inches (5 ft alone would be a wrong claim).
        self.assertEqual(quality._height_cm("5 ft 6 in"), 168)
        self.assertEqual(quality._height_cm("5ft 6in"), 168)

    def test_ambiguous_bare_numbers_stay_unknown(self):
        self.assertEqual(quality._height_cm("170"), 0)   # 170 cm? 1.70 m? unknown
        self.assertEqual(quality._height_cm(""), 0)
        self.assertEqual(quality._height_cm(None), 0)
        self.assertEqual(quality._height_cm("6"), 180)   # single digit = feet, long-standing intent


class LegacyDietShapes(unittest.TestCase):
    def test_combination_containing_requested_value_is_met(self):
        # A member who lists Vegetarian among their own values must not be
        # called a definite mismatch for a Vegetarian preference.
        self.assertEqual(quality.diet_preference_match("Vegetarian", "Vegetarian,Non-Vegetarian"), "met")
        self.assertEqual(quality.diet_preference_match("Non-Vegetarian", "Vegetarian,Non-Vegetarian"), "met")
        self.assertEqual(quality.diet_preference_match("Vegetarian", "Vegetarian"), "met")

    def test_single_known_value_difference_is_not_met(self):
        self.assertEqual(quality.diet_preference_match("Vegetarian", "Non-Vegetarian"), "not_met")
        self.assertEqual(quality.diet_preference_match("Non-Vegetarian", "Vegetarian"), "not_met")

    def test_unrecognized_values_stay_unknown(self):
        # "Vegan" and unrecognized combinations earn no definite comparison.
        self.assertEqual(quality.diet_preference_match("Vegetarian", "Vegan"), "unknown")
        self.assertEqual(quality.diet_preference_match("Vegetarian", ""), "unknown")
        self.assertEqual(quality.diet_preference_match("Any", "Vegan"), "unknown")


if __name__ == "__main__":
    unittest.main()
