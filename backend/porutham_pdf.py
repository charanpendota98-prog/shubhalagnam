"""Build a dependency-free PDF from the backend's ten Porutham checks."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List

CHECK_NAMES = {
    1: "Rasi Porutham", 2: "Nakshatra / Dina Porutham", 3: "Gana Porutham",
    4: "Yoni Porutham", 5: "Rajju Porutham", 6: "Vedha Porutham",
    7: "Mahendra Porutham", 8: "Stree Deergha", 9: "Vashya Porutham",
    10: "Rasi Adhipathi",
}


def _literal(value: Any) -> str:
    text = " ".join(str(value or "").split()).encode("ascii", "replace").decode("ascii")[:105]
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def generate_porutham_pdf(bride: Dict[str, Any], groom: Dict[str, Any], result: Dict[str, Any]) -> bytes:
    """Return a one-page ASCII PDF; only supplied data and actual check outcomes are used."""
    items = result.get("items") if result and result.get("available") else None
    if not isinstance(items, list) or not items:
        raise ValueError("An available ten-check result is required")
    checks = [item for item in items if isinstance(item, dict)][:10]
    passed = sum(item.get("pass") is True for item in checks)
    b_id = (bride or {}).get("tsap_id") or "Not supplied"
    g_id = (groom or {}).get("tsap_id") or "Not supplied"
    b_star = result.get("bride_star_en") or (bride or {}).get("star") or "Not available"
    g_star = result.get("groom_star_en") or (groom or {}).get("star") or "Not available"
    rows = [
        ("MANA VIVAHA - PORUTHAM REFERENCE", 48, 792, 18),
        ("Limited rule-based reference from supplied star details", 48, 770, 10),
        (f"Bride profile: {b_id} | Star: {b_star}", 48, 738, 10),
        (f"Groom profile: {g_id} | Star: {g_star}", 48, 720, 10),
        (f"Checks marked pass: {passed}/{len(checks)}", 48, 688, 12),
        ("Pass count is a tally only, not a compatibility score or marriage verdict.", 48, 670, 9),
        ("CHECK", 48, 646, 10), ("RESULT", 435, 658, 10),
        ("-" * 82, 48, 646, 9),
    ]
    y = 623
    for item in checks:
        try:
            number = int(item.get("no"))
        except (TypeError, ValueError):
            number = 0
        name = CHECK_NAMES.get(number, f"Porutham check {number or ''}".strip())
        outcome = "PASS" if item.get("pass") is True else "REVIEW"
        rows.extend([(f"{number:02d}. {name}", 48, y, 10), (outcome, 435, y, 10)])
        y -= 24
    rows.extend([
        ("LIMITATION", 48, y - 8, 10),
        ("Not a complete horoscope, identity check, or prediction of marriage outcomes.", 48, y - 26, 9),
        ("Verify details independently with family and a qualified adviser.", 48, y - 41, 9),
        ("Generated: " + datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"), 48, 50, 8),
    ])
    stream = "".join(
        f"BT /F1 {size} Tf 1 0 0 1 {x} {y} Tm ({_literal(text)}) Tj ET\n"
        for text, x, y, size in rows
    ).encode("ascii")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length " + str(len(stream)).encode("ascii") + b" >>\nstream\n" + stream + b"endstream",
    ]
    pdf = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for i, body in enumerate(objects, 1):
        offsets.append(len(pdf))
        pdf.extend(f"{i} 0 obj\n".encode("ascii") + body + b"\nendobj\n")
    xref = len(pdf)
    pdf.extend(f"xref\n0 {len(objects)+1}\n".encode("ascii"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    pdf.extend(f"trailer\n<< /Size {len(objects)+1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode("ascii"))
    return bytes(pdf)
