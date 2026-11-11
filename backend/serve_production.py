"""Fail-closed PM2 entry. Preflight and application use the same interpreter/env.

No reload or workers: file-backed persistence permits exactly one backend.
"""
import os
import sys
from preflight import run

if __name__ == '__main__':
    run()
    os.execv(sys.executable, [sys.executable, '-m', 'uvicorn', 'backend.main:app',
                            '--host', '127.0.0.1', '--port', '8000'])
