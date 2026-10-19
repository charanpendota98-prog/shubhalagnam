"""Registration photo policy: required uploads, server validation, privacy, and real storage.

Run directly with ``python test_registration_photo_required.py``; no pytest
installation is required.
"""
from __future__ import annotations

import io
import os
import sys
from pathlib import Path

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("ENV", "test")
os.environ["TSAP_AUTH_MODE"] = "enforce"
os.environ["WA_TEST_FAST"] = "0"
os.environ.setdefault("TSAP_AUTH_SECRET", "registration-photo-test-secret-not-for-production")
os.environ.setdefault("OTP_DEV_MODE", "true")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from test_storage import isolate_test_stores  # noqa: E402

isolate_test_stores("registration-photo-required")

from fastapi.testclient import TestClient  # noqa: E402
from PIL import Image  # noqa: E402
import main  # noqa: E402
from photo_validate import validate_photo  # noqa: E402
from testutil_photos import TEST_PROFILE_PHOTO  # noqa: E402

client = TestClient(main.app, raise_server_exceptions=False)


def form(phone: str, *, photo_private: bool = True) -> dict[str, str]:
    return {
        "gender": "Bride",
        "full_name": "Photo Policy Member",
        "dob": "1998-01-15",
        "password": "secure-pass-123",
        "height": "5'5\"",
        "marital_status": "Pelli Kaledu",
        "religion": "Hindu",
        "caste": "Reddy",
        "state": "TS",
        "district": "Hyderabad",
        "phone": phone,
        "photo_private": str(photo_private).lower(),
        "photo_consent_confirmed": "true",
        "consent_confirmed": "true",
    }


def upload(phone: str, *, filename: str = "profile.png", data: bytes = TEST_PROFILE_PHOTO,
           photo_private: bool = True, photo_url: str = ""):
    payload = form(phone, photo_private=photo_private)
    if photo_url:
        payload["photo_url"] = photo_url
    return client.post(
        "/api/register",
        data=payload,
        files={"photo_file": (filename, data, "image/png")},
    )


def test_registration_requires_a_photo_file():
    response = client.post("/api/register", data=form("9911001001"))
    assert response.status_code == 400
    assert response.json()["detail"]["reason"] == "PHOTO_REQUIRED"
    assert not any(u.get("phone") == "9911001001" for u in main.DB_USERS)


def test_registration_requires_photo_permission_consent():
    payload = form("9911001005")
    payload["photo_consent_confirmed"] = "false"
    response = client.post(
        "/api/register",
        data=payload,
        files={"photo_file": ("profile.jpg", TEST_PROFILE_PHOTO, "image/jpeg")},
    )
    assert response.status_code == 400
    assert response.json()["detail"]["reason"] == "PHOTO_CONSENT_REQUIRED"
    assert not any(u.get("phone") == "9911001005" for u in main.DB_USERS)


def test_registration_rejects_non_image_before_creating_profile():
    before = len(main.DB_USERS)
    response = upload("9911001002", filename="profile.jpg", data=b"not actually a jpeg")
    assert response.status_code == 422
    assert response.json()["detail"]["reason"] == "TOO_SMALL_FILE"
    assert len(main.DB_USERS) == before


def test_photo_validator_rejects_animated_and_oversized_images():
    oversized = Image.effect_noise((12_001, 350), 90).convert("RGB")
    oversized_bytes = io.BytesIO()
    oversized.save(oversized_bytes, format="JPEG", quality=75)
    large_verdict = validate_photo(oversized_bytes.getvalue(), "wide.jpg")
    assert large_verdict["reason"] == "IMAGE_DIMENSIONS"

    first = Image.open(io.BytesIO(TEST_PROFILE_PHOTO)).convert("RGB")
    second = Image.eval(first, lambda value: min(255, value + 8))
    animated_bytes = io.BytesIO()
    first.save(animated_bytes, format="WEBP", save_all=True, append_images=[second], duration=500, loop=0)
    animated_verdict = validate_photo(animated_bytes.getvalue(), "animated.webp")
    assert animated_verdict["reason"] == "ANIMATED"


def test_registration_stores_real_decoded_format_and_keeps_pending_photo_private():
    assert validate_photo(TEST_PROFILE_PHOTO, "wrong-extension.png")["ok"]
    response = upload(
        "9911001003", filename="wrong-extension.png", photo_private=False,
        photo_url="https://images.invalid/unreviewed.jpg",
    )
    assert response.status_code == 200, response.text[:240]
    profile_id = response.json()["tsap_id"]
    profile = main._find_user(profile_id)
    assert profile is not None
    # A 2xx registration is synchronously durable (not just in the process cache
    # or waiting for the generic five-second debounce), so a rebuild can reload it.
    saved_snapshot = main.DBSTORE.load()
    assert any(row.get("tsap_id") == profile_id for row in saved_snapshot.get("users", []))
    if os.name == "posix":
        assert Path(main.DBSTORE.DB_FILE).stat().st_mode & 0o777 == 0o600
    photo_url = profile["photo_url"]
    assert photo_url.startswith("/photos/")
    assert profile["photo_urls"] == [photo_url]
    assert profile["photo_status"] == "pending"
    assert profile["privacy_mode"] == "public"
    assert photo_url.endswith(".jpg")  # extension comes from decoded content, not client filename

    filename = photo_url.rsplit("/", 1)[-1]
    photo_path = Path(main.PHOTO_MEDIA_DIR) / filename
    assert photo_path.is_file()
    stored_photo = photo_path.read_bytes()
    assert stored_photo != b""
    assert validate_photo(stored_photo, "stored.jpg")["ok"]
    # Accepted media is re-encoded before storage so public approval cannot
    # disclose EXIF/GPS/device metadata from the original upload.
    with Image.open(io.BytesIO(stored_photo)) as stored_image:
        assert not stored_image.getexif()
    assert client.get(photo_url).status_code == 404  # pending means not public, even when user opts in

    owner_response = client.get(photo_url, headers={"X-Tsap-Token": response.json()["auth_token"]})
    assert owner_response.status_code == 200
    assert owner_response.headers["content-type"] == "image/jpeg"


def test_registration_strips_embedded_image_metadata_before_storage():
    source = Image.open(io.BytesIO(TEST_PROFILE_PHOTO)).convert("RGB")
    metadata = Image.Exif()
    metadata[0x010E] = "private device/location description"
    metadata[0x0110] = "private camera model"
    original = io.BytesIO()
    source.save(original, format="JPEG", quality=88, exif=metadata)
    original_bytes = original.getvalue()
    assert Image.open(io.BytesIO(original_bytes)).getexif()

    payload = form("9911001007")
    payload["full_name"] = "Metadata Policy Member"
    response = client.post(
        "/api/register",
        data=payload,
        files={"photo_file": ("profile.jpg", original_bytes, "image/jpeg")},
    )
    assert response.status_code == 200, response.text[:240]
    profile = main._find_user(response.json()["tsap_id"])
    stored = Path(main.PHOTO_MEDIA_DIR) / profile["photo_url"].rsplit("/", 1)[-1]
    with Image.open(stored) as sanitized:
        assert not sanitized.getexif()


def test_registration_fails_safely_if_durable_checkpoint_fails():
    before_ids = {u.get("tsap_id") for u in main.DB_USERS}
    before_photos = set(Path(main.PHOTO_MEDIA_DIR).glob("*"))
    original_save = main.DBSTORE.save
    try:
        main.DBSTORE.save = lambda *args, **kwargs: False
        response = upload("9911001006")
    finally:
        main.DBSTORE.save = original_save
    assert response.status_code == 503
    assert {u.get("tsap_id") for u in main.DB_USERS} == before_ids
    assert set(Path(main.PHOTO_MEDIA_DIR).glob("*")) == before_photos


def test_registration_rejects_tampered_image_bytes():
    valid = validate_photo(TEST_PROFILE_PHOTO, "profile.jpg")
    assert valid["ok"]
    corrupted = TEST_PROFILE_PHOTO[:80] + b"x" * 300 + TEST_PROFILE_PHOTO[380:]
    verdict = validate_photo(corrupted, "profile.jpg")
    assert not verdict["ok"]
    response = upload("9911001004", filename="profile.jpg", data=corrupted)
    assert response.status_code == 422
    assert not any(u.get("phone") == "9911001004" for u in main.DB_USERS)


if __name__ == "__main__":
    tests = [(name, func) for name, func in sorted(globals().items())
             if name.startswith("test_") and callable(func)]
    for name, test in tests:
        test()
        print(f"PASS {name}")
    print(f"RESULT: {len(tests)} passed / 0 failed")
