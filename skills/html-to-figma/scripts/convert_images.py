#!/usr/bin/env python3
"""Convert the site's raster images into figma-bridge/assets for Figma (figma.createImage accepts PNG/JPG/GIF only).

  python convert_images.py --site <site dir> --out <project>/figma-bridge/assets [--max 2400]

Every image under --site (webp, avif, png, jpg, jpeg, gif, bmp, tiff) becomes <name>.jpg, or <name>.png when it has
transparency. <name> is the image path below the last "assets" folder joined with "--", without extension
("assets/photos/villa-moon/01.webp" → "photos--villa-moon--01"); images outside an "assets" folder keep their base
name. This matches assetName() in tools/extract-kit.js, so photos that share a file name in different folders
(01.jpg, 02.jpg per gallery) stay distinct. Up-to-date outputs are skipped. SVGs are skipped: icons and logos become
vector components (H.harvestIcons / kit svgArt), never rasters.
"""
import argparse
import sys
from pathlib import Path

from PIL import Image

EXTS = {".webp", ".avif", ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tif", ".tiff"}


def has_alpha(im: Image.Image) -> bool:
    if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
        alpha = im.convert("RGBA").getchannel("A")
        return alpha.getextrema()[0] < 255
    return False


def asset_name(site: Path, src: Path) -> str:
    """Same rule as assetName() in extract-kit.js: path below the last "assets" folder, "/" → "--", no extension."""
    parts = list(src.relative_to(site).with_suffix("").parts)
    if "assets" in parts:
        parts = parts[len(parts) - parts[::-1].index("assets"):]
    else:
        parts = parts[-1:]
    return "--".join(parts)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--site", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--max", type=int, default=2400, help="longest side in px")
    a = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    site, out = Path(a.site).resolve(), Path(a.out).resolve()
    out.mkdir(parents=True, exist_ok=True)
    seen, converted, skipped, failed = {}, 0, 0, []
    for src in sorted(p for p in site.rglob("*") if p.suffix.lower() in EXTS and out not in p.parents):
        base = asset_name(site, src)
        if base in seen:
            print(f"duplicate asset name {base}: {seen[base]} and {src} (only the first is used)")
            continue
        seen[base] = src
        existing = [out / (base + ".jpg"), out / (base + ".png")]
        if any(e.exists() and e.stat().st_mtime >= src.stat().st_mtime for e in existing):
            skipped += 1
            continue
        try:
            with Image.open(src) as im:
                im.load()
                alpha = has_alpha(im)
                im = im.convert("RGBA" if alpha else "RGB")
                im.thumbnail((a.max, a.max), Image.Resampling.LANCZOS)
                if alpha:
                    im.save(out / (base + ".png"), optimize=True)
                else:
                    im.save(out / (base + ".jpg"), quality=86, optimize=True)
            converted += 1
        except Exception as e:  # unreadable/unsupported file: report and continue
            failed.append(f"{src}: {e}")
    print(f"converted {converted}, up to date {skipped}, failed {len(failed)} → {out}")
    for f in failed:
        print("  failed", f)


if __name__ == "__main__":
    main()
