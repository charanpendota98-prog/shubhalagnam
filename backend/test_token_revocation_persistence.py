"""Persistent token-revocation state must survive process replacement and fail closed.

Run: python backend/test_token_revocation_persistence.py
Uses subprocesses and temporary files only; no live profiles or provider calls.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

BACKEND = Path(__file__).resolve().parent


class TokenRevocationPersistenceTests(unittest.TestCase):
    def run_python(self, source: str, state_file: Path, *, production: bool = False,
                   configure_path: bool = True):
        env = os.environ.copy()
        env.update({
            "APP_ENV": "production" if production else "test",
            "TSAP_AUTH_MODE": "on",
            "TSAP_AUTH_SECRET": "test-only-token-revocation-secret-0123456789",
            "ADMIN_KEY": "test-only-token-revocation-admin-key-0123456789",
            "WA_TEST_FAST": "0",
        })
        if configure_path:
            env["TSAP_TOKEN_VERSIONS_FILE"] = str(state_file)
        else:
            env.pop("TSAP_TOKEN_VERSIONS_FILE", None)
        env["PYTHONPATH"] = str(BACKEND) + os.pathsep + env.get("PYTHONPATH", "")
        result = subprocess.run(
            [sys.executable, "-c", source],
            cwd=BACKEND,
            env=env,
            capture_output=True,
            text=True,
            timeout=20,
        )
        return result

    def test_revocation_survives_a_new_process_and_state_is_private(self):
        with tempfile.TemporaryDirectory(prefix="token-revocation-test-") as folder:
            state_file = Path(folder) / "state" / "token_versions.json"
            first = self.run_python(
                """
import json
import hardening as h
old = h.sign_token('TEST-PROFILE-001', ttl_seconds=3600)
assert h.verify_token(old) is not None
assert h.revoke_all_tokens('TEST-PROFILE-001') == 1
new = h.sign_token('TEST-PROFILE-001', ttl_seconds=3600)
assert h.verify_token(old) is None
assert h.verify_token(new) is not None
print(json.dumps({'old': old, 'new': new}))
""",
                state_file,
            )
            self.assertEqual(first.returncode, 0, first.stderr or first.stdout)
            tokens = json.loads(first.stdout.strip().splitlines()[-1])
            self.assertTrue(state_file.is_file())
            if os.name == "posix":
                self.assertEqual(state_file.stat().st_mode & 0o777, 0o600)

            # Pass only test tokens through a dedicated environment variable.
            env = os.environ.copy()
            env.update({
                "APP_ENV": "test",
                "TSAP_AUTH_MODE": "on",
                "TSAP_AUTH_SECRET": "test-only-token-revocation-secret-0123456789",
                "ADMIN_KEY": "test-only-token-revocation-admin-key-0123456789",
                "TSAP_TOKEN_VERSIONS_FILE": str(state_file),
                "TOKEN_TEST_INPUT": str(Path(folder) / "tokens.json"),
                "WA_TEST_FAST": "0",
                "PYTHONPATH": str(BACKEND) + os.pathsep + env.get("PYTHONPATH", ""),
            })
            Path(env["TOKEN_TEST_INPUT"]).write_text(json.dumps(tokens), encoding="utf-8")
            second = subprocess.run(
                [sys.executable, "-c", "import json, os, hardening as h; t=json.load(open(os.environ['TOKEN_TEST_INPUT'], encoding='utf-8')); print(json.dumps({'old_valid': h.verify_token(t['old']) is not None, 'new_valid': h.verify_token(t['new']) is not None, 'version': h.token_version('TEST-PROFILE-001')}))"],
                cwd=BACKEND,
                env=env,
                capture_output=True,
                text=True,
                timeout=20,
            )
            self.assertEqual(second.returncode, 0, second.stderr or second.stdout)
            persisted = json.loads(second.stdout.strip().splitlines()[-1])
            self.assertEqual(persisted, {"old_valid": False, "new_valid": True, "version": 1})

    def test_failed_write_does_not_claim_or_apply_revocation(self):
        with tempfile.TemporaryDirectory(prefix="token-revocation-write-fail-") as folder:
            blocker = Path(folder) / "not-a-directory"
            blocker.write_text("fixture", encoding="utf-8")
            impossible_path = blocker / "token_versions.json"
            source = f"""
import hardening as h
old = h.sign_token('TEST-PROFILE-002', ttl_seconds=3600)
h.TOKEN_VERSIONS_PATH = {str(impossible_path)!r}
try:
    h.revoke_all_tokens('TEST-PROFILE-002')
except OSError:
    pass
else:
    raise AssertionError('revocation unexpectedly reported success')
assert h.token_version('TEST-PROFILE-002') == 0
assert h.verify_token(old) is not None
print('write failure preserved the prior version and token')
"""
            result = self.run_python(source, Path(folder) / "unused.json")
            self.assertEqual(result.returncode, 0, result.stderr or result.stdout)

    def test_production_requires_an_explicit_durable_state_path(self):
        with tempfile.TemporaryDirectory(prefix="token-revocation-production-") as folder:
            state_file = Path(folder) / "unused.json"
            result = self.run_python(
                "import hardening",
                state_file,
                production=True,
                configure_path=False,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("TSAP_TOKEN_VERSIONS_FILE", result.stderr)

    def test_corrupt_state_fails_closed_instead_of_dropping_revocations(self):
        with tempfile.TemporaryDirectory(prefix="token-revocation-corrupt-") as folder:
            state_file = Path(folder) / "token_versions.json"
            state_file.write_text("not valid json", encoding="utf-8")
            result = self.run_python("import hardening", state_file)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("Token-version state is corrupt", result.stderr)


if __name__ == "__main__":
    unittest.main(verbosity=2)
