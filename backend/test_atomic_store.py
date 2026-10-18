"""Crash-safety regression checks for every JSON state writer's shared helper."""
from __future__ import annotations

import json
import os
import stat
import tempfile
import threading
from pathlib import Path

try:
    from atomic_store import atomic_append_line, atomic_json_dump
except ModuleNotFoundError:  # pytest imports from the repository root
    from backend.atomic_store import atomic_append_line, atomic_json_dump


def test_round_trip_is_private_and_atomic() -> None:
    with tempfile.TemporaryDirectory(prefix="mana-atomic-") as root:
        target = Path(root) / "nested" / "state.json"
        atomic_json_dump(str(target), {"version": 1, "telugu": "మన వివాహ"}, ensure_ascii=False)
        assert json.loads(target.read_text(encoding="utf-8"))["version"] == 1
        assert stat.S_IMODE(target.stat().st_mode) == 0o600
        assert not list(target.parent.glob("*.tmp"))


def test_append_line_is_private_and_durable_shape() -> None:
    with tempfile.TemporaryDirectory(prefix="mana-atomic-") as root:
        target = Path(root) / "audit.jsonl"
        atomic_append_line(str(target), '{"event":"first"}\n')
        atomic_append_line(str(target), '{"event":"second"}\n')
        assert target.read_text(encoding="utf-8").splitlines() == ['{"event":"first"}', '{"event":"second"}']
        assert stat.S_IMODE(target.stat().st_mode) == 0o600


def test_serialization_failure_never_truncates_previous_snapshot() -> None:
    class NotJson:
        pass

    with tempfile.TemporaryDirectory(prefix="mana-atomic-") as root:
        target = Path(root) / "state.json"
        atomic_json_dump(str(target), {"safe": True})
        try:
            atomic_json_dump(str(target), {"bad": NotJson()})
        except TypeError:
            pass
        else:
            raise AssertionError("unserialisable payload unexpectedly succeeded")
        assert json.loads(target.read_text(encoding="utf-8")) == {"safe": True}


def test_concurrent_snapshots_always_leave_valid_json() -> None:
    with tempfile.TemporaryDirectory(prefix="mana-atomic-") as root:
        target = os.path.join(root, "state.json")
        failures: list[BaseException] = []

        def write(value: int) -> None:
            try:
                for _ in range(12):
                    atomic_json_dump(target, {"writer": value, "rows": list(range(value + 1))})
            except BaseException as exc:  # pragma: no cover - asserted below
                failures.append(exc)

        workers = [threading.Thread(target=write, args=(n,)) for n in range(6)]
        for worker in workers:
            worker.start()
        for worker in workers:
            worker.join()
        assert not failures
        final = json.loads(Path(target).read_text(encoding="utf-8"))
        assert isinstance(final["writer"], int)
        assert final["rows"] == list(range(final["writer"] + 1))


def run_tests() -> int:
    tests = [value for name, value in sorted(globals().items()) if name.startswith("test_")]
    failures = 0
    for test in tests:
        try:
            test()
            print(f"  ✓ {test.__name__}")
        except Exception as error:  # noqa: BLE001
            failures += 1
            print(f"  ✗ {test.__name__}: {type(error).__name__}: {error}")
    print(f"\n# tests {len(tests)}\n# pass {len(tests) - failures}\n# fail {failures}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(run_tests())
