"""Guardrails for user-facing compatibility, verification, and promotion copy."""
from __future__ import annotations

import asyncio
import contextlib
import io
import os
import unittest
from pathlib import Path
from unittest.mock import patch

import interest

ROOT = Path(__file__).resolve().parents[1]


class CopyTruthTests(unittest.TestCase):
    def _interest_message(self, evidence: dict[str, bool]) -> str:
        requester = {
            "tsap_id": "TSAP-TEST-REQUESTER",
            "full_name": "Example Member",
            "age": 28,
            "gender": "Bride",
            "phone": "9876543210",
            "education": "BTech",
            "job": "Teacher",
            **evidence,
        }
        owner = {"tsap_id": "TSAP-TEST-OWNER"}
        return interest.interest_to_owner_text(
            requester, owner, {"request_id": "REQ-TEST-1"}
        )

    def test_interest_message_names_only_the_recorded_verification_check(self) -> None:
        expected = {
            "phone_verified": "Phone OTP check recorded",
            "selfie_verified": "Photo review recorded",
            "id_verified": "ID review recorded",
        }
        for evidence, phrase in expected.items():
            with self.subTest(evidence=evidence):
                message = self._interest_message({evidence: True})
                self.assertIn(phrase, message)
                self.assertNotIn("✅ Verified", message)
                self.assertNotIn("9876543210", message)

    def test_interest_message_does_not_imply_a_check_that_is_not_recorded(self) -> None:
        message = self._interest_message({})
        self.assertNotIn("Verified", message)
        self.assertNotIn("check recorded", message)

    def test_spotlight_and_plan_copy_has_no_unsupported_popularity_claim(self) -> None:
        paths = (
            ROOT / "frontend/src/app/spotlight/page-client.tsx",
            ROOT / "frontend/src/app/page.tsx",
            ROOT / "frontend/src/app/pricing/page-client.tsx",
            ROOT / "frontend/src/app/requests/page-client.tsx",
            ROOT / "frontend/src/app/vendors/page-client.tsx",
            ROOT / "frontend/src/app/bureau/page-client.tsx",
        )
        forbidden = ("most popular", "best seller", "best-seller", "best value", "fastest growing")
        for path in paths:
            text = path.read_text(encoding="utf-8").casefold()
            for claim in forbidden:
                with self.subTest(path=path.relative_to(ROOT), claim=claim):
                    self.assertNotIn(claim, text)

    def test_channel_welcome_instructions_do_not_show_an_example_member_id(self) -> None:
        text = (ROOT / "backend/channel_content.py").read_text(encoding="utf-8")
        self.assertIn("Members అందించిన profile వివరాలు", text)
        self.assertIn("member ID వెతకండి", text)
        self.assertNotIn("TSAP-F-2025-1042", text)

    def test_homepage_hero_is_concise_while_spotlights_disclose_review_scope(self) -> None:
        hero = (ROOT / "frontend/src/components/CinematicHero.tsx").read_text(encoding="utf-8")
        spotlight = (ROOT / "frontend/src/components/ProfilesOfTheDay.tsx").read_text(encoding="utf-8")
        growth = (ROOT / "frontend/src/components/HomeGrowth.tsx").read_text(encoding="utf-8")
        self.assertNotIn("member-submitted details", hero)
        self.assertNotIn("do not guarantee identity", hero)
        # The hero stays concise, but the one line it must keep is the
        # illustrative-imagery disclaimer: the film and poster are not
        # photographs of members, so saying so is required, not clutter.
        self.assertIn("Illustrative visuals only", hero)
        self.assertIn("member-submitted", spotlight)
        self.assertIn("does not independently verify", spotlight)
        self.assertIn("Member-submitted previews", growth)
        self.assertNotIn("real, approved profiles", spotlight.casefold())
        self.assertNotIn("real people. real families", growth.casefold())

    def test_match_send_filter_names_the_recorded_check_evidence(self) -> None:
        text = (ROOT / "frontend/src/components/MatchSend.tsx").read_text(encoding="utf-8")
        self.assertIn("Recorded check (phone OTP / photo / ID)", text)
        self.assertIn("!x.is_verified", text)
        self.assertNotIn("✅ verified", text.casefold())

    def test_live_smoke_script_has_no_demo_login_or_mutating_flow(self) -> None:
        text = (ROOT / "backend/verify_live_flow.py").read_text(encoding="utf-8")
        for forbidden in (
            "/api/auth/demo-token", "/api/payment/webhook", "/api/vendors/register",
            "SMOKEUTR", "9848012345", "TSAP-F-2025-1042",
        ):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, text)
        self.assertIn("method=\"GET\"", text)
        self.assertIn("retired destructive smoke option", text)

        channel_smoke = (ROOT / "backend/test_channels.py").read_text(encoding="utf-8")
        self.assertIn('if os.getenv("ALLOW_READ_ONLY_TELEGRAM_CHECK") != "1"', channel_smoke)
        self.assertIn("if len(targets) != 2", channel_smoke)
        self.assertIn("getChatMember", channel_smoke)
        self.assertIn("READ_ONLY_METHODS", channel_smoke)
        self.assertNotIn("sendMessage", channel_smoke)
        self.assertNotIn("sendPhoto", channel_smoke)
        self.assertNotIn("load_dotenv", channel_smoke)

    def test_channel_smoke_default_does_not_read_token_or_make_network_request(self) -> None:
        import test_channels as channel_smoke

        getenv_calls: list[str] = []

        def fake_getenv(name: str, default: str | None = None) -> str | None:
            getenv_calls.append(name)
            return {"BOT_TOKEN": "not-a-real-token"}.get(name, default)

        with patch.object(channel_smoke.os, "getenv", side_effect=fake_getenv):
            with patch.object(channel_smoke.urllib.request, "urlopen") as urlopen:
                with contextlib.redirect_stdout(io.StringIO()):
                    self.assertEqual(channel_smoke.main(), 0)
                urlopen.assert_not_called()
        self.assertEqual(getenv_calls, ["ALLOW_READ_ONLY_TELEGRAM_CHECK"])

    def test_channel_smoke_opt_in_uses_only_allowlisted_read_methods(self) -> None:
        import test_channels as channel_smoke

        calls: list[tuple[str, dict | None]] = []

        def fake_read(token: str, method: str, parameters: dict | None = None) -> dict:
            calls.append((method, parameters))
            if method == "getMe":
                return {"id": 42}
            if method == "getChat":
                return {"id": -1001234567890}
            if method == "getChatMember":
                return {"status": "administrator"}
            raise AssertionError(f"Unexpected Telegram method: {method}")

        env = {
            "ALLOW_READ_ONLY_TELEGRAM_CHECK": "1",
            "BOT_TOKEN": "test-token-only",
            "TEST_CHANNELS": "@first_test_channel,@second_test_channel",
        }
        with patch.dict(os.environ, env, clear=True):
            with patch.object(channel_smoke, "telegram_read", side_effect=fake_read):
                with contextlib.redirect_stdout(io.StringIO()):
                    self.assertEqual(channel_smoke.main(), 0)
        self.assertEqual([method for method, _ in calls], [
            "getMe", "getChat", "getChatMember", "getChat", "getChatMember",
        ])
        with self.assertRaises(ValueError):
            channel_smoke.telegram_read("test-token-only", "sendMessage")

    def test_rewritten_test_guides_do_not_reuse_old_seed_or_payment_examples(self) -> None:
        for name in ("TEST-2-CHANNELS-NORMAL.md", "LOCAL-TEST-VS-ORACLE-DEPLOY.md"):
            text = (ROOT / name).read_text(encoding="utf-8")
            for stale_value in ("LAK42", "98480xxxxx", "test123", "TSAP-F-2025-3561", "tsap123"):
                with self.subTest(file=name, stale_value=stale_value):
                    self.assertNotIn(stale_value.casefold(), text.casefold())
        channels = (ROOT / "TEST-2-CHANNELS-NORMAL.md").read_text(encoding="utf-8")
        self.assertIn("ALLOW_READ_ONLY_TELEGRAM_CHECK=1", channels)
        self.assertIn("dry run", channels.casefold())
        self.assertIn("send nothing", channels.casefold())
        self.assertIn("does not send messages", channels.casefold())

    def test_channel_registry_and_generators_do_not_store_or_guess_alternates(self) -> None:
        registry = (ROOT / "backend/channels_config.py").read_text(encoding="utf-8")
        setup = (ROOT / "backend/setup_channels.py").read_text(encoding="utf-8")
        create = (ROOT / "backend/create_channels.py").read_text(encoding="utf-8")
        master = (ROOT / "backend/gen_master_list.py").read_text(encoding="utf-8")
        admin_ui = (ROOT / "frontend/src/components/control/Dashboard.tsx").read_text(encoding="utf-8")
        self.assertNotIn('"fallbacks":', registry)
        self.assertNotIn('ch.get("fallbacks"', setup)
        self.assertNotIn('r["fallbacks"]', setup)
        self.assertNotIn('"fallbacks"', create)
        self.assertNotIn("fallback usernames", master.casefold())
        self.assertNotIn('|| "manavivaha"', admin_ui)
        self.assertIn("never probe guessed alternates", setup)

    def test_legacy_telegram_bot_does_not_create_fake_members_or_send_channel_posts(self) -> None:
        import telegram_bot as bot

        source = (ROOT / "backend/telegram_bot.py").read_text(encoding="utf-8")
        for forbidden in ("random.randint", "TSAP-F-2025-", 'session.get("caste", "Reddy")',
                          "message.contact.phone_number", "YOUR_BOT_TOKEN_HERE"):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, source)

        class NeverSend:
            def __init__(self) -> None:
                self.calls = []

            async def send_message(self, *args, **kwargs):
                self.calls.append((args, kwargs))

            async def send_photo(self, *args, **kwargs):
                self.calls.append((args, kwargs))

        previous = bot.bot
        fake = NeverSend()
        bot.bot = fake
        try:
            result = asyncio.run(bot.post_to_channels(
                {"gender": "Bride", "state": "TS", "religion": "Hindu", "caste": "Reddy"},
                "TSAP-TEST-ONLY",
            ))
        finally:
            bot.bot = previous
        self.assertTrue(result["dry_run"])
        self.assertEqual(result["posted"], [])
        self.assertFalse(fake.calls)
        self.assertFalse(result["external_status_checked"])

    def test_publish_and_whatsapp_integrations_are_disabled_by_default_even_with_a_bot_token(self) -> None:
        import publisher
        import wa_antiban

        with patch.dict(os.environ, {"BOT_TOKEN": "operator-test-token"}, clear=True):
            config = publisher.config()
            self.assertTrue(config["dry_run"])
            self.assertFalse(config["auto_post_on_approval"])
            self.assertFalse(wa_antiban.ENGINE.cfg()["enabled"])

        env = (ROOT / ".env.example").read_text(encoding="utf-8")
        for safe_setting in (
            "AUTO_POST_ON_REGISTER=false", "PUBLISH_DRY_RUN=true", "WA_ENABLED=false",
            "PAYMENTS_LIVE=false", "PAYMENT_AUTO_APPROVE=false", "DEMO_SEED_ENABLED=false",
        ):
            with self.subTest(setting=safe_setting):
                self.assertIn(safe_setting, env)
        for fake_value in ("123456:", "9198480", "140.245.216.16", "rzp_test_xxxx", "tsap123"):
            with self.subTest(fake_value=fake_value):
                self.assertNotIn(fake_value.casefold(), env.casefold())


if __name__ == "__main__":
    unittest.main()
