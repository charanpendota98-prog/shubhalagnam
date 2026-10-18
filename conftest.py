"""Pytest collection policy for the repository's two test entrypoint styles.

Most legacy backend checks are intentionally executable integration programs: they
configure isolated stores, construct a TestClient, print a human-readable report,
and exit with the report status. Importing those programs is not a test operation
and used to make pytest abort during collection via their deliberate ``sys.exit``.
The direct-script sweep runs them as subprocesses. Keep only the side-effect-free
unit-style persistence checks in pytest's collection namespace.
"""
from __future__ import annotations

from pathlib import Path

import pytest


_PYTEST_BACKEND_TESTS = {"test_atomic_store.py"}
collect_ignore = [
    str(path)
    for path in (Path(__file__).parent / "backend").glob("test_*.py")
    if path.name not in _PYTEST_BACKEND_TESTS
]


def _is_legacy_executable(path: Path) -> bool:
    return (
        path.parent.name == "backend"
        and path.name.startswith("test_")
        and path.suffix == ".py"
        and path.name not in _PYTEST_BACKEND_TESTS
    )


class _LegacyExecutableFile(pytest.File):
    """A no-import collector for direct-run integration programs."""

    def collect(self):
        return []


def pytest_ignore_collect(collection_path: Path, config) -> bool:  # noqa: ARG001
    return _is_legacy_executable(Path(str(collection_path)).resolve())


def pytest_collect_file(parent, file_path: Path):
    # Directory walks use this hook.
    path = Path(str(file_path)).resolve()
    if _is_legacy_executable(path):
        return _LegacyExecutableFile.from_parent(parent, path=path)
    return None


def pytest_pycollect_makemodule(module_path: Path, parent):
    # Explicit file arguments can go through this hook directly in pytest 9.
    path = Path(str(module_path)).resolve()
    if _is_legacy_executable(path):
        return _LegacyExecutableFile.from_parent(parent, path=path)
    return None
