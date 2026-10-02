"""
🧪 TEST HARNESS — page source resolver (App Router server/client split aware)
============================================================================
Frontend lo chala pages R13 refactor tarvata rendu files ga unnai:

    app/<route>/page.tsx         → server component (metadata, JSON-LD, wrapper)
    app/<route>/page-client.tsx  → asalu client UI (useState, forms, CTAs…)

Paatha tests anni `page.tsx` lopaliki direct ga dive ayyevi — split tarvata
avi "feature ledu" ani FALSE FAIL isthunnai (UI real ga page-client lo undi).

Ee helper okke okka place lo aa resolution chestundi:
  • `src_page("frontend/src/app/register/page.tsx")`
      → register/page.tsx + register/page-client.tsx (rendu content join)
  • client file lekapothe → page.tsx matrame (backwards compatible)
  • path already `-client` tho aipithe → aa file matrame

Tests lo file-level assertions (exists / lang-aware / tokens) ippudu nijamaina
code ni chadavutai — future lo server wrapper lo markup pettina, client lo
pettina, assertion pass avutundi.
"""
from __future__ import annotations

import os
from typing import List

# Repo root = backend/ ki parent (tests ROOT convention tho same)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

_CLIENT_SUFFIX = "-client.tsx"


def _norm(path: str) -> str:
    """'frontend/src/…' (posix string) → absolute OS path."""
    path = str(path).replace("\\", "/").strip()
    if not path:
        return path
    return path if os.path.isabs(path) else os.path.join(ROOT, *path.split("/"))


def page_variants(path: str) -> List[str]:
    """page.tsx ki sambandhinchina anni source files (server + client) — existing ones only."""
    abs_p = _norm(path)
    out: List[str] = []
    if abs_p.endswith("/page.tsx") or abs_p.endswith(os.sep + "page.tsx"):
        client = abs_p[: -len(".tsx")] + _CLIENT_SUFFIX  # …/page-client.tsx
        for cand in (abs_p, client):
            if os.path.exists(cand) and cand not in out:
                out.append(cand)
        return out
    if os.path.exists(abs_p):
        out.append(abs_p)
    return out


def src_page(path: str, missing: str = "") -> str:
    """Page source (server wrapper + client part) — tests ki okke string.

    `missing`: file(s) lekapothe return ayye text (default "" → assertions fail,
    silent pass kaadu).
    """
    parts = []
    for f in page_variants(path):
        try:
            with open(f, encoding="utf-8") as fh:
                parts.append(fh.read())
        except Exception:
            continue
    return ("\n".join(parts)) if parts else missing


def read_any(*paths: str, missing: str = "") -> str:
    """Multiple paths (variants tho kalipi) chadavi okke string istundi."""
    chunks: List[str] = []
    for p in paths:
        s = src_page(p, missing="")
        if s:
            chunks.append(s)
    return "\n".join(chunks) if chunks else missing
