"""The operator supplied channel destinations stay mapped to canonical registry keys."""
from __future__ import annotations

import json
from pathlib import Path
import sys

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

from channels_config import DEFAULT_TELEGRAM_LINKS, DEFAULT_WA_LINKS  # noqa: E402


MANIFEST = json.loads((HERE / "chanmap15.json").read_text(encoding="utf-8"))
FRONTEND_REGISTRY = (HERE.parent / "frontend" / "src" / "lib" / "channels.ts").read_text(encoding="utf-8")
FRONTEND_ROWS = json.loads(
    FRONTEND_REGISTRY.split("export const ALL_CHANNELS: Channel[] = ", 1)[1].split(";\n\n// Hindu-only", 1)[0]
)
FRONTEND_BY_KEY = {row["key"]: row for row in FRONTEND_ROWS}


def test_checked_in_manifest_matches_every_operator_provided_destination() -> None:
    expected_keys = set(DEFAULT_TELEGRAM_LINKS) | set(DEFAULT_WA_LINKS)
    assert set(MANIFEST) == expected_keys
    for key, link in DEFAULT_TELEGRAM_LINKS.items():
        assert MANIFEST[key]["telegram_link"] == link
    for key, link in DEFAULT_WA_LINKS.items():
        assert MANIFEST[key]["whatsapp_link"] == link
    assert MANIFEST["c_rajaka_groom"]["whatsapp_link"] == ""


def test_bundled_frontend_registry_matches_the_same_operator_destinations() -> None:
    for key in set(DEFAULT_TELEGRAM_LINKS) | set(DEFAULT_WA_LINKS):
        # The official hub is an internal L0 registry row and is intentionally
        # excluded from the public bundled directory; every supplied community,
        # religion, and regional destination must be present.
        if key not in FRONTEND_BY_KEY:
            assert key == "official"
            continue
        assert FRONTEND_BY_KEY[key]["link"] == DEFAULT_TELEGRAM_LINKS.get(key, "")
        assert FRONTEND_BY_KEY[key]["whatsappLink"] == DEFAULT_WA_LINKS.get(key, "")


def test_manifest_never_marks_an_unconfigured_destination_as_active() -> None:
    for key, row in MANIFEST.items():
        assert row["active"] is bool(row["telegram_link"] or row["whatsapp_link"])
        assert row["note"] and (row["note"].startswith("Operator-provided public channel link")
                              or key == "c_rajaka_groom")


def test_every_community_destination_keeps_its_bride_or_groom_route() -> None:
    for key in MANIFEST:
        if not (key.startswith("c_") or key.startswith(("muslim_", "christian_"))):
            continue
        route = __import__("channels_config").CHANNELS[key]["route"]
        expected_gender = "Bride" if key.endswith("_bride") else "Groom"
        assert route["gender"] == expected_gender, (key, route)


def test_missing_rajaka_grooms_whatsapp_invite_is_reported_without_a_guess() -> None:
    import chanmap

    coverage = chanmap.coverage()
    assert "c_rajaka_groom" in coverage["whatsapp_gaps"]
    assert chanmap.public_links()["c_rajaka_groom"]["whatsapp"] == ""
