"""Crash-safe persistence helpers for the JSON/JSONL state stores.

The product still uses a single-process JSON system of record for now.  Every
satellite store therefore needs the same minimum guarantee as ``db_store``:
write a private file, flush it to disk, then atomically replace the old file.
A direct ``open(path, "w")`` truncates the only good copy before serialization
finishes; a process crash at that point turns a recoverable state file into an
empty/corrupt one.

This module deliberately has no application imports so it can be used by all
backend subsystems without introducing import cycles.  It raises on failure;
callers that historically fail closed may catch the exception and return their
existing error shape.
"""
from __future__ import annotations

import json
import os
import tempfile
from typing import Any


def _sync_directory(directory: str) -> None:
    """Persist the rename where the platform exposes directory fsync."""
    if os.name != "posix":
        return
    try:
        fd = os.open(directory, os.O_RDONLY)
    except OSError:
        return
    try:
        os.fsync(fd)
    except OSError:
        pass
    finally:
        os.close(fd)


def atomic_write_bytes(path: str, payload: bytes, mode: int = 0o600) -> None:
    """Write bytes without ever truncating the previously committed file."""
    target = os.path.abspath(os.fspath(path))
    directory = os.path.dirname(target) or "."
    os.makedirs(directory, mode=0o700, exist_ok=True)
    fd, temporary = tempfile.mkstemp(
        prefix=f".{os.path.basename(target)}.", suffix=".tmp", dir=directory
    )
    try:
        if hasattr(os, "fchmod"):
            os.fchmod(fd, mode)
        with os.fdopen(fd, "wb") as handle:
            fd = -1
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, target)
        temporary = ""
        _sync_directory(directory)
    finally:
        if fd >= 0:
            try:
                os.close(fd)
            except OSError:
                pass
        if temporary:
            try:
                os.unlink(temporary)
            except OSError:
                pass


def atomic_write_text(path: str, text: str, mode: int = 0o600, encoding: str = "utf-8") -> None:
    """UTF-8 text variant of :func:`atomic_write_bytes`."""
    atomic_write_bytes(path, text.encode(encoding), mode=mode)


def atomic_json_dump(path: str, value: Any, *, mode: int = 0o600, **json_kwargs: Any) -> None:
    """Serialize first, then atomically commit one JSON snapshot.

    Serializing before opening the temporary file also means an unserialisable
    object cannot damage the previous snapshot.
    """
    text = json.dumps(value, **json_kwargs)
    atomic_write_text(path, text, mode=mode)


def atomic_append_line(path: str, line: str, mode: int = 0o600, encoding: str = "utf-8") -> None:
    """Append one durable JSONL/text record without creating a world-readable file."""
    target = os.path.abspath(os.fspath(path))
    directory = os.path.dirname(target) or "."
    os.makedirs(directory, mode=0o700, exist_ok=True)
    fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_APPEND, mode)
    try:
        if hasattr(os, "fchmod"):
            os.fchmod(fd, mode)
        with os.fdopen(fd, "a", encoding=encoding) as handle:
            fd = -1
            handle.write(line)
            handle.flush()
            os.fsync(handle.fileno())
    finally:
        if fd >= 0:
            os.close(fd)
