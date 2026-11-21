"""Isolated API photo fixtures; public-domain portrait provenance recorded alongside it."""
from __future__ import annotations

import io
import random

from PIL import Image, ImageDraw


def make_test_photo() -> bytes:
    rng = random.Random(1701)
    image = Image.new("RGB", (600, 800))
    pixels = image.load()
    for by in range(0, 800, 4):
        for bx in range(0, 600, 4):
            noise = rng.randint(-42, 42)
            red = max(20, min(235, 30 + ((bx * 3 + by) % 165) + noise))
            green = max(20, min(235, 35 + ((bx + by * 2) % 160) + noise))
            blue = max(20, min(235, 40 + ((bx * 2 - by) % 155) + noise))
            for y in range(by, min(by + 4, 800)):
                for x in range(bx, min(bx + 4, 600)):
                    pixels[x, y] = (red, green, blue)
    draw = ImageDraw.Draw(image)
    draw.ellipse((180, 120, 420, 420), fill=(192, 145, 112))
    draw.polygon([(90, 800), (150, 475), (450, 475), (510, 800)], fill=(72, 48, 84))
    output = io.BytesIO()
    image.save(output, format="JPEG", quality=88)
    return output.getvalue()


# Public-domain NASA sample used only in isolated face-eligibility tests.
# Source and rights: tests/fixtures/README.md. Never a production member image.
from pathlib import Path
TEST_PROFILE_PHOTO = (Path(__file__).parent / "tests/fixtures/nasa-astronaut.jpg").read_bytes()
