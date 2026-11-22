"""Shared cross-process gate for on-server photo check children.

Both the face check and the text check spawn memory-heavy subprocesses
(~170 MiB peak RSS each on the 1GB Oracle VM). Two children at once could
OOM the site, so every photo check child across ALL backend processes must
hold this one file lock. This intentionally serializes face and text checks
across gunicorn/pm2 workers: under a burst, extra checks defer to staff
review (fail-open) instead of running concurrently. Non-blocking: if another
check is running, the caller defers to staff review, exactly like the
per-process semaphores.

Set PHOTO_CHECK_LOCK="" (empty) to disable the file lock and fall back to
the per-process locks only, e.g. after a VM upgrade to 2GB. Set
PHOTO_CHECK_LOCK to a custom path to relocate the lock file.
"""
import fcntl
import os
from pathlib import Path

_LOCK_ENV = os.environ.get("PHOTO_CHECK_LOCK", "/tmp/manavivaha-photo-check.lock")
_LOCK_PATH = Path(_LOCK_ENV) if _LOCK_ENV else None


def acquire_photo_gate():
    """Return an open fd holding the exclusive lock, or None if busy.
    Returns -1 (always acquired, release-safe) when the lock is disabled."""
    if _LOCK_PATH is None:
        return -1
    try:
        fd = os.open(_LOCK_PATH, os.O_CREAT | os.O_RDWR, 0o600)
    except OSError:
        return None
    try:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        os.close(fd)
        return None
    return fd


def release_photo_gate(fd):
    if fd is None or fd == -1:
        return
    try:
        fcntl.flock(fd, fcntl.LOCK_UN)
    finally:
        os.close(fd)
