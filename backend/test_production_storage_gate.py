"""Production storage/deployment guard checks without Docker or live data.

Run: .venv/bin/python test_production_storage_gate.py
All application state is created below a disposable /var/tmp directory.
"""
from __future__ import annotations

import asyncio
import json
import os
import sys

# Use a non-/tmp disposable test root because production rejects ephemeral paths.
os.environ["TMPDIR"] = "/var/tmp"
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from test_storage import isolate_test_stores  # noqa: E402

TEST_ROOT = isolate_test_stores("production-storage-gate")
os.environ["APP_ENV"] = "test"
os.environ["MANA_VIVAHA_PERSISTENT_ROOT"] = TEST_ROOT
os.environ["VENDOR_POSTER_DIR"] = os.path.join(TEST_ROOT, "media", "vendor-posters")
os.environ["REFERRAL_POSTER_DIR"] = os.path.join(TEST_ROOT, "media", "referral-posters")

import yaml  # noqa: E402
import bootstrap_core_db  # noqa: E402
import main  # noqa: E402

passed = 0
failed = 0


def check(label: str, condition: bool, detail=None) -> None:
    global passed, failed
    if condition:
        passed += 1
        print(f"  ✅ {label}")
    else:
        failed += 1
        print(f"  ❌ {label}: {detail}")


print("\n=== PERSISTENT STORAGE GUARD ===")
try:
    result = main._validate_production_storage()
    check("all runtime stores and media are inside the durable test volume",
          result.get("root") == os.path.realpath(TEST_ROOT) and result.get("durable_paths", 0) >= 31,
          result)
    check("token revocation state is routed to the isolated durable store",
          os.path.realpath(main.TOKEN_VERSIONS_PATH) == os.path.realpath(
              os.environ["TSAP_TOKEN_VERSIONS_FILE"])
          and os.path.commonpath((os.path.realpath(TEST_ROOT),
                                  os.path.realpath(main.TOKEN_VERSIONS_PATH))) == os.path.realpath(TEST_ROOT)
          and os.path.commonpath((os.path.realpath(os.environ["MANA_VIVAHA_STATE_DIR"]),
                                  os.path.realpath(main.TOKEN_VERSIONS_PATH)))
              == os.path.realpath(os.environ["MANA_VIVAHA_STATE_DIR"]),
          main.TOKEN_VERSIONS_PATH)
except Exception as exc:  # the success path must not silently fall through
    check("all runtime stores and media are inside the durable test volume", False, repr(exc))

original_token_path = main.TOKEN_VERSIONS_PATH
try:
    main.TOKEN_VERSIONS_PATH = os.path.join(TEST_ROOT, "token_versions_outside_state.json")
    try:
        main._validate_production_storage()
        check("token revocation state outside backup-scanned state directory fails closed", False, "no exception")
    except RuntimeError as exc:
        check("token revocation state outside backup-scanned state directory fails closed",
              "inside MANA_VIVAHA_STATE_DIR" in str(exc), str(exc))
finally:
    main.TOKEN_VERSIONS_PATH = original_token_path

original_db_file = main.DBSTORE.DB_FILE
try:
    main.DBSTORE.DB_FILE = os.path.join(os.path.dirname(TEST_ROOT), "outside-volume.json")
    try:
        main._validate_production_storage()
        check("off-volume core database path fails closed", False, "no exception")
    except RuntimeError as exc:
        check("off-volume core database path fails closed", "outside the durable volume" in str(exc), str(exc))
finally:
    main.DBSTORE.DB_FILE = original_db_file

original_root = os.environ.pop("MANA_VIVAHA_PERSISTENT_ROOT", None)
try:
    try:
        main._validate_production_storage()
        check("missing persistent root fails closed", False, "no exception")
    except RuntimeError as exc:
        check("missing persistent root fails closed", "MANA_VIVAHA_PERSISTENT_ROOT" in str(exc), str(exc))
finally:
    if original_root is not None:
        os.environ["MANA_VIVAHA_PERSISTENT_ROOT"] = original_root

print("\n=== PRODUCTION STARTUP FAIL-CLOSED CHECK ===")
original_app_env = os.environ.get("APP_ENV")
original_startup_db = main.DBSTORE.DB_FILE
original_startup_empty_flag = os.environ.get("MANA_VIVAHA_ALLOW_EMPTY_PRODUCTION_DB")
startup_db_file = os.path.join(TEST_ROOT, "startup-db-gate", "data_db.json")
main.DBSTORE.DB_FILE = startup_db_file
os.environ["APP_ENV"] = "production"
os.environ["MANA_VIVAHA_ALLOW_EMPTY_PRODUCTION_DB"] = "true"  # legacy/stale env must not bypass the startup gate
try:
    try:
        asyncio.run(main._startup_publisher())
        check("production startup refuses a missing DB even with a stale bypass env", False, "no exception")
    except RuntimeError as exc:
        check("production startup refuses a missing DB even with a stale bypass env",
              "missing" in str(exc).lower(), str(exc))
    check("blocked production startup leaves DB path absent", not os.path.exists(startup_db_file), startup_db_file)
finally:
    main.DBSTORE.DB_FILE = original_startup_db
    if original_app_env is None:
        os.environ.pop("APP_ENV", None)
    else:
        os.environ["APP_ENV"] = original_app_env
    if original_startup_empty_flag is None:
        os.environ.pop("MANA_VIVAHA_ALLOW_EMPTY_PRODUCTION_DB", None)
    else:
        os.environ["MANA_VIVAHA_ALLOW_EMPTY_PRODUCTION_DB"] = original_startup_empty_flag

print("\n=== CORE DATABASE STARTUP INTEGRITY GATE ===")
original_db_file = main.DBSTORE.DB_FILE
gate_db_file = os.path.join(TEST_ROOT, "core-db-gate", "data_db.json")
main.DBSTORE.DB_FILE = gate_db_file
try:
    try:
        main._validate_production_core_database()
        check("missing core DB fails closed by default", False, "no exception")
    except RuntimeError as exc:
        check("missing core DB fails closed by default", "missing" in str(exc).lower(), str(exc))
    check("failed missing-DB check does not create/replace a file", not os.path.exists(gate_db_file), gate_db_file)

    try:
        bootstrap_core_db.initialize_empty_core_db(confirm_new_install=False)
        check("empty DB bootstrap requires explicit operator confirmation", False, "no exception")
    except RuntimeError as exc:
        check("empty DB bootstrap requires explicit operator confirmation", "confirmation" in str(exc), str(exc))
    initialized = bootstrap_core_db.initialize_empty_core_db(confirm_new_install=True)
    check("one-shot initializer creates a canonical empty DB only on an absent path",
          initialized.get("users") == 0 and os.path.exists(gate_db_file)
          and json.load(open(gate_db_file, encoding="utf-8")).get("storage_format") == main.DBSTORE.STORAGE_FORMAT,
          initialized)
    created_bytes = open(gate_db_file, "rb").read()
    try:
        bootstrap_core_db.initialize_empty_core_db(confirm_new_install=True)
        check("one-shot initializer refuses to overwrite any existing DB", False, "no exception")
    except RuntimeError as exc:
        check("one-shot initializer refuses to overwrite any existing DB", "refusing to overwrite" in str(exc), str(exc))
    check("rejected second bootstrap leaves initialized DB unchanged",
          open(gate_db_file, "rb").read() == created_bytes, gate_db_file)
    restart_state = main._validate_production_core_database()
    check("initialized empty DB passes later restart validation",
          restart_state.get("users") == 0 and not restart_state.get("has_records"), restart_state)

    unmarked_empty = {"users": [], "interests": [], "payments": [], "otps": {},
                      "verified_phones": [], "views": [], "saves": [], "digest": [],
                      "legacy_note": "preserve me"}
    with open(gate_db_file, "w", encoding="utf-8") as handle:
        json.dump(unmarked_empty, handle)
    before_unmarked_empty = open(gate_db_file, "rb").read()
    try:
        main._validate_production_core_database()
        check("unmarked empty database fails closed", False, "no exception")
    except RuntimeError as exc:
        check("unmarked empty database fails closed", "initialization marker" in str(exc), str(exc))
    check("unmarked empty source file is preserved", open(gate_db_file, "rb").read() == before_unmarked_empty,
          gate_db_file)
    marked_empty = bootstrap_core_db.initialize_empty_core_db(confirm_existing_empty=True)
    with open(gate_db_file, encoding="utf-8") as handle:
        marked_empty_payload = json.load(handle)
    check("explicit legacy-empty upgrade preserves metadata and adds only the marker",
          marked_empty.get("users") == 0
          and marked_empty_payload.get("legacy_note") == "preserve me"
          and marked_empty_payload.get("storage_format") == main.DBSTORE.STORAGE_FORMAT,
          marked_empty_payload)

    corrupt_bytes = b"{broken-json-do-not-touch"
    with open(gate_db_file, "wb") as handle:
        handle.write(corrupt_bytes)
    try:
        main._validate_production_core_database()
        check("corrupt DB fails closed", False, "no exception")
    except RuntimeError as exc:
        check("corrupt DB fails closed", "corrupt" in str(exc).lower(), str(exc))
    with open(gate_db_file, "rb") as handle:
        check("corrupt DB bytes are preserved for recovery", handle.read() == corrupt_bytes, gate_db_file)

    incomplete = {"users": [{"tsap_id": "MV-LEGACY-001"}], "interests": [], "payments": [],
                  "otps": {}, "verified_phones": [], "views": [], "saves": []}
    with open(gate_db_file, "w", encoding="utf-8") as handle:
        json.dump(incomplete, handle)
    before_incomplete = open(gate_db_file, "rb").read()
    try:
        main._validate_production_core_database()
        check("incomplete schema fails closed", False, "no exception")
    except RuntimeError as exc:
        check("incomplete schema fails closed", "digest" in str(exc), str(exc))
    check("incomplete DB bytes are preserved", open(gate_db_file, "rb").read() == before_incomplete, gate_db_file)

    legacy_db = {"users": [{"tsap_id": "MV-LEGACY-001", "phone": "9000000001"}],
                 "interests": [], "payments": [], "otps": {}, "verified_phones": [],
                 "views": [], "saves": [], "digest": []}
    with open(gate_db_file, "w", encoding="utf-8") as handle:
        json.dump(legacy_db, handle)
    before_populated_bootstrap = open(gate_db_file, "rb").read()
    try:
        bootstrap_core_db.initialize_empty_core_db(confirm_existing_empty=True)
        check("empty-database marker tool refuses populated registrations", False, "no exception")
    except RuntimeError as exc:
        check("empty-database marker tool refuses populated registrations", "contains records" in str(exc), str(exc))
    check("populated registration DB remains byte-for-byte unchanged by bootstrap refusal",
          open(gate_db_file, "rb").read() == before_populated_bootstrap, gate_db_file)
    legacy_state = main._validate_production_core_database()
    check("populated legacy database without new marker remains compatible",
          legacy_state.get("users") == 1 and legacy_state.get("has_records"), legacy_state)

    duplicate_db = dict(legacy_db)
    duplicate_db["users"] = [dict(legacy_db["users"][0]), dict(legacy_db["users"][0])]
    with open(gate_db_file, "w", encoding="utf-8") as handle:
        json.dump(duplicate_db, handle)
    before_duplicate = open(gate_db_file, "rb").read()
    try:
        main._validate_production_core_database()
        check("duplicate registrations block production without being dropped", False, "no exception")
    except RuntimeError as exc:
        check("duplicate registrations block production without being dropped", "duplicate" in str(exc).lower(), str(exc))
    check("duplicate-registration source file is unchanged", open(gate_db_file, "rb").read() == before_duplicate,
          gate_db_file)

    first_snapshot = main.DBSTORE.snapshot([{"tsap_id": "MV-SAVE-001"}], [], [], {}, set(), [], [], [])
    next_snapshot = main.DBSTORE.snapshot([{"tsap_id": "MV-SAVE-001"}, {"tsap_id": "MV-SAVE-002"}],
                                          [], [], {}, set(), [], [], [])
    check("forced core save commits a registration snapshot", main.DBSTORE.save(first_snapshot, force=True))
    check("a second immediate forced save bypasses debounce",
          main.DBSTORE.save(next_snapshot, force=True)
          and len(main.DBSTORE.load().get("users", [])) == 2,
          main.DBSTORE.load().get("users"))
    check("core database writes use private POSIX mode",
          os.name != "posix" or os.stat(gate_db_file).st_mode & 0o777 == 0o600,
          oct(os.stat(gate_db_file).st_mode & 0o777) if os.name == "posix" else "not POSIX")
    check("atomic save leaves no temporary database files",
          not any(name.startswith(".data_db.json.") and name.endswith(".tmp")
                  for name in os.listdir(os.path.dirname(gate_db_file))),
          os.listdir(os.path.dirname(gate_db_file)))
finally:
    main.DBSTORE.DB_FILE = original_db_file

print("\n=== STANDALONE PRODUCTION COMPOSE ===")
with open(os.path.join(ROOT, "docker-compose.prod.yml"), encoding="utf-8") as handle:
    compose = yaml.safe_load(handle)
services = compose.get("services", {})
backend = services.get("backend", {})
frontend = services.get("frontend", {})
backend_env = backend.get("environment", {})
frontend_env = frontend.get("environment", {})
backend_volumes = backend.get("volumes", [])
check("production stack is standalone and contains only enabled app services",
      set(services) == {"backend", "frontend", "bot"} and compose.get("name"), set(services))
check("backend is single-worker and does not publish an API host port",
      "--workers" in backend.get("command", []) and "1" in backend.get("command", [])
      and not backend.get("ports"), backend)
check("durable named volume backs the application state root",
      any(v == "appdata:/var/lib/manavivaha"
          or (isinstance(v, dict) and v.get("source") == "appdata"
              and v.get("target") == "/var/lib/manavivaha")
          for v in backend_volumes)
      and backend_env.get("MANA_VIVAHA_PERSISTENT_ROOT") == "/var/lib/manavivaha"
      and backend_env.get("TSAP_DB_FILE") == "/var/lib/manavivaha/state/data_db.json",
      {"volumes": backend_volumes, "persistent_root": backend_env.get("MANA_VIVAHA_PERSISTENT_ROOT")})
check("normal production service has no persistent empty-DB bypass and has a one-shot initializer",
      "MANA_VIVAHA_ALLOW_EMPTY_PRODUCTION_DB" not in backend_env
      and os.path.isfile(os.path.join(HERE, "bootstrap_core_db.py"))
      and "bootstrap_core_db.py --confirm-new-install" in open(
          os.path.join(ROOT, "PRODUCTION-DEPLOY.md"), encoding="utf-8").read(),
      {"bypass": backend_env.get("MANA_VIVAHA_ALLOW_EMPTY_PRODUCTION_DB"),
       "initializer": os.path.isfile(os.path.join(HERE, "bootstrap_core_db.py"))})
check("frontend host port is loopback-only for the TLS reverse proxy",
      frontend.get("ports") == ["127.0.0.1:3000:3000"], frontend.get("ports"))
check("production frontend proxies to the internal backend service",
      frontend_env.get("BACKEND_URL") == "http://backend:8000"
      and any(d.get("condition") == "service_healthy" for d in frontend.get("depends_on", {}).values()),
      {"env": frontend_env, "depends_on": frontend.get("depends_on")})
check("images exclude local secrets, virtualenvs, runtime stores and build caches",
      all(token in open(os.path.join(ROOT, path), encoding="utf-8").read()
          for path, tokens in (("backend/.dockerignore", (".env", ".env.*", ".venv/", "data_db.json*",
                                                              "token_versions.json*", "test_*.py", "test_fixtures/", "photos/",
                                                              "cards/", "voice/", "jathakam/", "media/")),
                               ("frontend/.dockerignore", (".env", ".env.*", "node_modules/", ".next/")))
          for token in tokens),
      "required ignore rules are missing")

print(f"\nRESULT: {passed} passed / {failed} failed")
if failed:
    raise SystemExit(1)
