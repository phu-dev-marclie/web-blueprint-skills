"""Pixel diff of two screenshot folders — the parity gate of a conversion (0 changed px).

    python pixel_diff.py <before-dir> <after-dir> [--out DIR] [--threshold 40]

Per file: identical / SIZE change / changed px + bounding box; changed files get a side-by-side
sheet (before | after | mask) in --out (default <after>/_diff). Names containing `light` or `dark`
are checked against the image: a "dark" shot with a light page (or the reverse) is reported as
MODE — a capture that leaked another tab's colour mode is not a valid baseline.
Recapture once to tell image-decoding / animation noise (it moves between runs) from real changes.
Exit code 1 when a file changed or a mode mismatch was found.
"""
import argparse
import pathlib
import sys

import numpy as np
from PIL import Image


def mode_of(img: np.ndarray) -> str:
    # median luminance of the site header band (below a WP admin bar, above any hero): photos,
    # dark bands and footers would mislead a whole-image or frame sample
    band = img[36:110].reshape(-1, 3)
    lum = 0.2126 * band[:, 0] + 0.7152 * band[:, 1] + 0.0722 * band[:, 2]
    return "dark" if np.median(lum) < 110 else "light"


def expected(name: str):
    parts = name.lower().replace("_", "-").split("-")
    return "dark" if "dark" in parts else "light" if "light" in parts else None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("before")
    ap.add_argument("after")
    ap.add_argument("--out")
    ap.add_argument("--threshold", type=int, default=40)
    a = ap.parse_args()
    before, after = pathlib.Path(a.before), pathlib.Path(a.after)
    out = pathlib.Path(a.out) if a.out else after / "_diff"
    bad = 0
    for f in sorted(after.glob("*.png")):
        b = before / f.name
        if not b.exists():
            print(f"{f.name}: no baseline")
            continue
        x = np.asarray(Image.open(b).convert("RGB")).astype(int)
        y = np.asarray(Image.open(f).convert("RGB")).astype(int)
        want = expected(f.name)
        if want:
            for label, img in (("before", x), ("after", y)):
                got = mode_of(img)
                if got != want:
                    print(f"{f.name}: MODE {label} shot looks {got}, name says {want}")
                    bad += 1
        if x.shape != y.shape:
            print(f"{f.name}: SIZE {x.shape[1]}x{x.shape[0]} -> {y.shape[1]}x{y.shape[0]}")
            bad += 1
            continue
        mask = np.abs(x - y).max(axis=2) > a.threshold
        n = int(mask.sum())
        if not n:
            print(f"{f.name}: identical")
            continue
        bad += 1
        ys, xs = np.where(mask)
        box = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
        print(f"{f.name}: {n} px changed, box {box}")
        out.mkdir(parents=True, exist_ok=True)
        pad = 40
        crop = (max(0, box[0] - pad), max(0, box[1] - pad), min(x.shape[1], box[2] + pad), min(x.shape[0], box[3] + pad))
        ia, ib = Image.open(b).convert("RGB").crop(crop), Image.open(f).convert("RGB").crop(crop)
        im = Image.fromarray((mask * 255).astype("uint8")).convert("RGB").crop(crop)
        w, h = ia.size
        sheet = Image.new("RGB", (w * 3 + 20, h), "red")
        for i, img in enumerate((ia, ib, im)):
            sheet.paste(img, (i * (w + 10), 0))
        sheet.save(out / f.name)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
