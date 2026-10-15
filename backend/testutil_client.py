"""TestClient adapter that supplies test-only media and explicit consent to legacy form tests."""
from __future__ import annotations

from urllib.parse import urlsplit

from fastapi.testclient import TestClient as _FastAPITestClient

from testutil_photos import TEST_PROFILE_PHOTO


class TestClient(_FastAPITestClient):
    """Keep older API tests focused on their tested behavior under required-photo registration."""

    def post(self, url, *args, **kwargs):  # type: ignore[no-untyped-def]
        if urlsplit(str(url)).path == "/api/register":
            data = kwargs.get("data")
            if data is None:
                data = {"consent_confirmed": "true", "photo_consent_confirmed": "true"}
            elif isinstance(data, dict):
                data = dict(data)
                data.setdefault("consent_confirmed", "true")
                data.setdefault("photo_consent_confirmed", "true")
            elif isinstance(data, list):
                data = list(data)
                if not any(name == "consent_confirmed" for name, *_ in data):
                    data.append(("consent_confirmed", "true"))
                if not any(name == "photo_consent_confirmed" for name, *_ in data):
                    data.append(("photo_consent_confirmed", "true"))
            kwargs["data"] = data
            files = kwargs.get("files")
            part = ("test-profile.jpg", TEST_PROFILE_PHOTO, "image/jpeg")
            if files is None:
                files = {"photo_file": part}
            elif isinstance(files, dict):
                files = dict(files)
                files.setdefault("photo_file", part)
            else:
                files = list(files)
                if not any(name == "photo_file" for name, *_ in files):
                    files.append(("photo_file", part))
            kwargs["files"] = files
        return super().post(url, *args, **kwargs)
