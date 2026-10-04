"""Regression checks for alphabetized public community and district catalogues."""
from __future__ import annotations

import json
import re
import sys
import unittest
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
REPO_DIR = BACKEND_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

import matchpro
from community_catalog import HINDU_SUBCASTES, subcastes_for
from location_catalog import (
    AP_DISTRICTS,
    TS_DISTRICTS,
    canonicalize_district,
    valid_district_for_state,
)


def alpha(values: list[str]) -> list[str]:
    return sorted(values, key=lambda value: (value.casefold(), value))


class CatalogOrderingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.frontend_source = (REPO_DIR / "frontend/src/lib/telugu-data.ts").read_text(encoding="utf-8")

    def test_backend_districts_are_sorted_unique_and_current(self) -> None:
        self.assertEqual(len(TS_DISTRICTS), 33)
        self.assertEqual(len(AP_DISTRICTS), 28)
        self.assertEqual(TS_DISTRICTS, alpha(TS_DISTRICTS))
        self.assertEqual(AP_DISTRICTS, alpha(AP_DISTRICTS))
        self.assertEqual(len(TS_DISTRICTS), len(set(TS_DISTRICTS)))
        self.assertEqual(len(AP_DISTRICTS), len(set(AP_DISTRICTS)))
        self.assertIn("Markapuram", AP_DISTRICTS)
        self.assertIn("Polavaram", AP_DISTRICTS)

    def test_frontend_district_catalog_matches_backend_in_a_to_z_order(self) -> None:
        for name, expected in (("TS", TS_DISTRICTS), ("AP", AP_DISTRICTS)):
            marker = f"export const {name}_DISTRICTS_DETAILED: DistrictDetail[] = sortDirectoryByEnglish(["
            start = self.frontend_source.index(marker) + len(marker)
            end = self.frontend_source.index("]);", start)
            labels = re.findall(r'\{ en: "([^"]+)"', self.frontend_source[start:end])
            self.assertEqual(labels, expected, name)
            self.assertEqual(labels, alpha(labels), name)

    def test_all_backend_community_lists_are_sorted_unique_and_have_self_description(self) -> None:
        for religion, payload in matchpro.RELIGION_CASTES.items():
            labels = payload
            self.assertEqual(labels, alpha(labels), religion)
            self.assertEqual(len(labels), len(set(labels)), religion)
            self.assertIn("Other / self-described", labels, religion)

    def test_frontend_registration_choices_match_backend_for_each_religion(self) -> None:
        detailed_start = self.frontend_source.index("export const CASTES_DETAILED: CasteInfo[] = [")
        detailed_end = self.frontend_source.index("].map((community)", detailed_start)
        detailed = set(re.findall(r'en: "([^"]+)"', self.frontend_source[detailed_start:detailed_end]))
        detailed.add("Other / self-described")

        hindu_start = self.frontend_source.index("  Hindu: sortUniqueOptions([", detailed_end)
        hindu_end = self.frontend_source.index("]),\n  Muslim:", hindu_start)
        hindu_extras = set(re.findall(r'"([^"]+)"', self.frontend_source[hindu_start:hindu_end]))
        frontend_hindu = detailed | hindu_extras
        self.assertEqual(frontend_hindu, set(matchpro.castes_for("Hindu")["castes"]))

        for religion in ("Muslim", "Christian", "Sikh", "Jain", "Buddhist", "Other"):
            match = re.search(
                rf"^  {re.escape(religion)}: sortUniqueOptions\(\[(.*?)\]\),$",
                self.frontend_source,
                re.MULTILINE,
            )
            self.assertIsNotNone(match, religion)
            frontend_options = set(re.findall(r'"([^"]+)"', match.group(1)))
            frontend_options.add("Other / self-described")
            self.assertEqual(frontend_options, set(matchpro.castes_for(religion)["castes"]), religion)

    def test_subcaste_catalog_and_api_source_are_alphabetized_with_custom_path(self) -> None:
        raw = json.loads((BACKEND_DIR / "community_catalog.json").read_text(encoding="utf-8"))
        raw_groups = raw["hindu_subcastes"]
        self.assertEqual(list(raw_groups), alpha(list(raw_groups)))
        for caste in raw_groups:
            labels = subcastes_for("Hindu", caste)
            self.assertEqual(labels, alpha(labels), caste)
            self.assertEqual(len(labels), len(set(labels)), caste)
        registration_source = (REPO_DIR / "frontend/src/app/register/page-client.tsx").read_text(encoding="utf-8")
        self.assertIn("sortUniqueOptions([...values, OTHER_COMMUNITY_OPTION])", registration_source)

    def test_legacy_district_spellings_normalize_to_canonical_options(self) -> None:
        self.assertEqual(canonicalize_district("TS", "Mahbubnagar"), "Mahabubnagar")
        self.assertEqual(canonicalize_district("AP", "NTR (Vijayawada)"), "NTR")
        self.assertEqual(canonicalize_district("AP", "vijayawada (ntr)"), "NTR")
        self.assertTrue(valid_district_for_state("AP", "Markapuram"))
        self.assertTrue(valid_district_for_state("AP", "NTR (Vijayawada)"))
        self.assertFalse(valid_district_for_state("TS", "Markapuram"))


if __name__ == "__main__":
    unittest.main()
