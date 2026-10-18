"""Regression checks for optional, owner-supplied public contact and web-push settings.

Run with: python backend/test_contact_configuration.py
No network calls are made; VAPID keys are generated in memory for the valid-key test.
"""
from __future__ import annotations

import os
import re
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import yaml

ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))
_state = tempfile.TemporaryDirectory(prefix="contact-config-test-")
os.environ["MANA_VIVAHA_APP_STATE_DIR"] = _state.name

import advanced11 as A11  # noqa: E402
from cryptography.hazmat.primitives import serialization  # noqa: E402
from py_vapid import Vapid  # noqa: E402
from py_vapid.utils import b64urlencode  # noqa: E402


def contact_env(*, public: str = "", private: str = "", subject: str = "", email: str = ""):
    return patch.dict(os.environ, {
        "VAPID_PUBLIC_KEY": public,
        "VAPID_PRIVATE_KEY": private,
        "VAPID_SUBJECT": subject,
        "SUPPORT_EMAIL": email,
    }, clear=False)


def key_pair() -> tuple[str, str]:
    generated = Vapid()
    generated.generate_keys()
    private_raw = generated.private_key.private_numbers().private_value.to_bytes(32, "big")
    public_raw = generated.public_key.public_bytes(
        serialization.Encoding.X962,
        serialization.PublicFormat.UncompressedPoint,
    )
    return b64urlencode(public_raw), b64urlencode(private_raw)


class VapidContactConfigurationTests(unittest.TestCase):
    def test_blank_configuration_is_not_ready(self):
        with contact_env():
            self.assertEqual(A11.vapid_contact_subject(), "")
            self.assertFalse(A11.vapid_delivery_ready())

    def test_subject_uses_only_valid_owner_configured_contact(self):
        with contact_env(email="owner@example.test"):
            self.assertEqual(A11.vapid_contact_subject(), "mailto:owner@example.test")
        with contact_env(email="not-an-email"):
            self.assertEqual(A11.vapid_contact_subject(), "")
        with contact_env(subject="https://example.invalid/privacy", email=""):
            self.assertEqual(A11.vapid_contact_subject(), "https://example.invalid/privacy")

    def test_delivery_requires_valid_matching_keys_and_subject(self):
        public, private = key_pair()
        with contact_env(public=public, private=private, email="owner@example.test"):
            self.assertTrue(A11.vapid_delivery_ready())
        with contact_env(public=public, private=private, subject="mailto:invalid"):
            self.assertFalse(A11.vapid_delivery_ready())

    def test_delivery_rejects_mismatched_or_malformed_keys(self):
        public, private = key_pair()
        other_public, _ = key_pair()
        with contact_env(public=other_public, private=private, subject="https://example.invalid/contact"):
            self.assertFalse(A11.vapid_delivery_ready())
        with contact_env(public=public, private="malformed", subject="https://example.invalid/contact"):
            self.assertFalse(A11.vapid_delivery_ready())


class FrontendContactConfigurationTests(unittest.TestCase):
    def read(self, relative: str) -> str:
        return (ROOT / relative).read_text(encoding="utf-8")

    def test_contact_and_legal_entity_have_no_hardcoded_defaults(self):
        config = self.read("frontend/src/lib/site-config.ts")
        self.assertIn('process.env.NEXT_PUBLIC_SUPPORT_EMAIL || ""', config)
        self.assertIn('process.env.NEXT_PUBLIC_SUPPORT_PHONE || ""', config)
        self.assertIn('process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || ""', config)
        self.assertIn('process.env.NEXT_PUBLIC_BUSINESS_CONTACT_NAME || ""', config)
        self.assertIn('process.env.NEXT_PUBLIC_BUSINESS_LOCATION || ""', config)
        self.assertIn('process.env.NEXT_PUBLIC_LEGAL_NAME || ""', config)
        self.assertIsNone(re.search(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", config, re.I))
        self.assertNotIn('legalName: "Manavivaha"', config)

    def test_contact_views_and_structured_data_suppress_empty_values(self):
        privacy = self.read("frontend/src/app/privacy/page-client.tsx")
        refund = self.read("frontend/src/app/refund/page-client.tsx")
        terms = self.read("frontend/src/app/terms/page-client.tsx")
        footer = self.read("frontend/src/components/SiteFooter.tsx")
        home = self.read("frontend/src/app/page.tsx")
        # Site-wide Organization/WebSite structured data lives in the root layout now;
        # the homepage emits only its own FAQ graph.
        layout = self.read("frontend/src/app/layout.tsx")
        self.assertIn("SITE_CONFIG.owner.email ?", privacy)
        self.assertIn("SITE_CONFIG.owner.location ?", privacy)
        self.assertIn("SITE_CONFIG.supportConfigured", privacy)
        self.assertIn("SITE_CONFIG.owner.email ?", refund)
        self.assertIn("SITE_CONFIG.owner.location ?", refund)
        self.assertIn("SITE_CONFIG.supportConfigured", refund)
        self.assertIn("SITE_CONFIG.supportEmail ?", terms)
        self.assertIn("SITE_CONFIG.supportEmail ?", footer)
        self.assertIn("...(SUPPORT_EMAIL ? { email: SUPPORT_EMAIL } : {})", layout)
        self.assertIn("...(CONTACT_POINT ? { contactPoint: CONTACT_POINT } : {})", layout)
        self.assertNotIn("email: SITE_CONFIG.supportEmail,", home)
        self.assertNotIn("email: SUPPORT_EMAIL,", layout)
        self.assertNotIn("areaServed", home)
        for source in (terms, privacy, refund):
            self.assertNotIn("Hyderabad, Telangana, India", source)
            self.assertNotIn("areaServed", source)
            self.assertIn('const LAST_UPDATED = "12 Oct 2026";', source)

    def test_visitor_analytics_are_pseudonymous_bounded_and_disclosed(self):
        growth = self.read("backend/growth.py")
        main = self.read("backend/main.py")
        privacy = self.read("frontend/src/app/privacy/page-client.tsx")
        track_route = main.split('@app.post("/api/track")', 1)[1].split(
            '@app.post("/api/leads/quick")', 1
        )[0]
        self.assertIn("_VISITOR_ID_SALT = os.urandom(32)", growth)
        self.assertIn("hmac.new(_VISITOR_ID_SALT", growth)
        self.assertIn("MAX_VISITOR_EVENTS = 10_000", growth)
        self.assertIn("VISITOR_RETENTION_DAYS = 30", growth)
        self.assertNotIn('p.get("ip"', track_route)
        self.assertNotIn('p.get("ua"', track_route)
        self.assertNotIn('"visitor_id": rec["vid"]', track_route)
        self.assertIn("process-local HMAC identifier", privacy)
        self.assertIn("expire after 30 days", privacy)
        self.assertIn("capped at 10,000", privacy)

    def test_optional_contact_build_and_compose_plumbing_exists(self):
        env_example = self.read(".env.example")
        frontend_dockerfile = self.read("frontend/Dockerfile")
        development_compose = self.read("docker-compose.yml")
        production_compose = self.read("docker-compose.prod.yml")
        for key in (
            "NEXT_PUBLIC_SUPPORT_EMAIL",
            "NEXT_PUBLIC_BUSINESS_CONTACT_NAME",
            "NEXT_PUBLIC_BUSINESS_LOCATION",
            "NEXT_PUBLIC_GRIEVANCE_OFFICER",
            "NEXT_PUBLIC_LEGAL_NAME",
        ):
            self.assertIn(f"{key}=", env_example)
            self.assertIn(key, frontend_dockerfile)
            self.assertIn(key, development_compose)
            self.assertIn(key, production_compose)
            self.assertIn(f"{key}=", env_example)
        for key in (
            "SUPPORT_EMAIL", "SUPPORT_PHONE", "SUPPORT_WHATSAPP", "VAPID_SUBJECT",
            "NEXT_PUBLIC_SUPPORT_EMAIL", "NEXT_PUBLIC_SUPPORT_PHONE", "NEXT_PUBLIC_SUPPORT_WHATSAPP",
            "NEXT_PUBLIC_BUSINESS_CONTACT_NAME", "NEXT_PUBLIC_BUSINESS_LOCATION",
            "NEXT_PUBLIC_GRIEVANCE_OFFICER", "NEXT_PUBLIC_LEGAL_NAME",
        ):
            self.assertIn(f"{key}=\n", env_example)
        parsed_dev = yaml.safe_load(development_compose)
        self.assertIn("backend", parsed_dev["services"])
        self.assertIn("frontend", parsed_dev["services"])
        backend_env = parsed_dev["services"]["backend"]["environment"]
        frontend_env = parsed_dev["services"]["frontend"]["environment"]
        self.assertTrue(any(entry.startswith("VAPID_SUBJECT=") for entry in backend_env))
        self.assertTrue(any(entry.startswith("SUPPORT_EMAIL=") for entry in backend_env))
        self.assertTrue(any(entry.startswith("NEXT_PUBLIC_LEGAL_NAME=") for entry in frontend_env))


if __name__ == "__main__":
    unittest.main(verbosity=2)
