#!/usr/bin/env python3
"""Set up (or upgrade) the html-to-figma toolkit in a website project.

  python init_project.py --project <project dir> --site <site dir> [--url http://127.0.0.1:4173/] [--name "Brand"]
  python init_project.py --project <project dir> --from-wireframe <project>/wireframe [--mobile]
  python init_project.py --project <project dir> --upgrade      # refresh lib/kit/foundations/tools only

Creates <project>/figma-bridge/ from the skill template:
  project.json  site location, section detection, header/footer content, page list (pre-filled from the site's *.html)
  tokens.json   design tokens (fill from the site's CSS before running foundations)
  build/        lib.js, kit.js, foundations.js, foundations-board.js (+ your optional project-kit.js)
  components/   00-core.js (generic components), 90-chrome.js (Header/Footer); H.harvestIcons adds 00-assets.js
  layouts/      one module per section layout (written per project)
  tools/        harness.js, assemble.js, diff.js, extract-kit.js, load.js
  assets/       images for Figma (scripts/convert_images.py, named by path below assets/)
--upgrade never touches project.json, tokens.json, build/project-kit.js, components/ or layouts/ (project-owned).
After an upgrade, move project helpers that lived in kit.js into build/project-kit.js and compare tokens.json with
the template (new optional keys: gridMobile, effects, gradients, type[].mobile).
--from-wireframe reads <wireframe>/handoff/figma.json (ux-wireframe: `python wireframe/handoff.py` after
`python wireframe/build.py --final`): site, name, sections, chrome, pages + UI states (+ mobile screens with
--mobile) and the tokens (template semantic names kept, values from the wireframe CSS).
"""
import argparse
import html
import json
import os
import re
import shutil
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parent.parent
TEMPLATE = SKILL / "template" / "figma-bridge"
TOOLKIT = ["build/lib.js", "build/kit.js", "build/foundations.js", "build/foundations-board.js",
           "tools/harness.js", "tools/assemble.js", "tools/diff.js", "tools/extract-kit.js", "tools/load.js"]


def page_list(site: Path):
    pages = []
    files = sorted(site.glob("*.html"), key=lambda p: (p.name != "index.html", p.name))
    for f in files:
        m = re.search(r"<title>(.*?)</title>", f.read_text(encoding="utf-8", errors="replace"), re.S | re.I)
        title = html.unescape(m.group(1)).strip() if m else f.stem
        name = re.split(r"\s+[—|–-]\s+", title)[0].strip() or f.stem
        if f.name == "index.html":
            name = "Home"
        pages.append({"group": "Pages", "name": name, "file": f.name})
    return pages


def load_handoff(wf: Path):
    f = wf / "handoff" / "figma.json"
    if not f.is_file():
        sys.exit(f"error: {f} not found — run `python wireframe/build.py --final` then `python wireframe/handoff.py`")
    return json.loads(f.read_text(encoding="utf-8"))


def merge_tokens(tpl: dict, hand: dict) -> dict:
    """Template tokens.json + handoff tokens: template semantic names/order/scopes kept, values from the handoff."""
    out = dict(tpl)
    for key in ("fonts", "primitives", "alpha", "grid", "gridMobile", "surfaces", "darkSurfaces", "radius", "effects", "gradients"):
        if key not in hand:
            continue
        docs = {k: v for k, v in tpl.get(key, {}).items() if k.startswith("$")} if isinstance(tpl.get(key), dict) else {}
        out[key] = {**docs, **hand[key]} if isinstance(hand[key], dict) else hand[key]
    values = {name: ref for name, ref, _ in hand.get("semantic", [])}
    missing = [name for name, _, _ in tpl["semantic"] if name not in values]
    if missing:
        sys.exit("error: the wireframe CSS defines no value for the semantic token(s) " + ", ".join(missing)
                 + " — add them (--" + missing[0].replace("/", "-", 1) + ": var(--<primitive>)), re-run handoff.py")
    known = {name for name, _, _ in tpl["semantic"]}
    out["semantic"] = [[name, values[name], scope] for name, _, scope in tpl["semantic"]] + \
                      [list(s) for s in hand.get("semantic", []) if s[0] not in known]
    out["space"] = sorted(set(tpl.get("space", [])) | set(hand.get("space", [])))
    styles = {t[0]: t for t in hand.get("type", [])}
    names = {t[0] for t in tpl["type"]}
    out["type"] = [styles.get(t[0], t) for t in tpl["type"]] + [t for t in hand.get("type", []) if t[0] not in names]
    if "section" in hand:
        out["section"] = {**tpl.get("section", {}), "padY": hand["section"]["padY"]}
    return out


def font_report(tokens: dict, hand: dict, wf: Path):
    print("fonts to install for Figma (foundations needs every style):")
    for role, family in tokens["fonts"].items():
        styles = sorted({t[2] for t in tokens["type"] if t[1] == role})
        print(f"  {role}: {family} — {', '.join(styles)}")
    for f in hand.get("fonts", []):
        files = ", ".join(str((wf / p).resolve()) if "://" not in p else p for p in f["files"])
        print(f"  {f['family']} {'/'.join(map(str, f['weights']))}: {files or '(no files)'}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", required=True, help="website project folder (figma-bridge/ is created inside)")
    ap.add_argument("--site", help="folder with the built HTML pages (absolute or relative to --project)")
    ap.add_argument("--from-wireframe", help="ux-wireframe folder with handoff/figma.json (as given, else relative to --project)")
    ap.add_argument("--mobile", action="store_true", help="with --from-wireframe: add the mobile screens to pages")
    ap.add_argument("--url", default="http://127.0.0.1:4173/", help="URL the site is served at")
    ap.add_argument("--name", help="brand / project name")
    ap.add_argument("--upgrade", action="store_true", help="refresh toolkit files only")
    a = ap.parse_args()

    project = Path(a.project).resolve()
    dest = project / "figma-bridge"
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    if a.upgrade:
        if not dest.is_dir():
            sys.exit(f"error: {dest} does not exist; run without --upgrade first")
        for rel in TOOLKIT:
            (dest / rel).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(TEMPLATE / rel, dest / rel)
            print("updated", rel)
        return

    if dest.exists():
        sys.exit(f"error: {dest} already exists (use --upgrade to refresh the toolkit files)")
    if a.mobile and not a.from_wireframe:
        sys.exit("error: --mobile needs --from-wireframe")
    in_project = lambda p: (project / p).resolve() if not os.path.isabs(p) else Path(p).resolve()
    wf = None
    if a.from_wireframe:   # as given (cwd-relative), else relative to --project
        wf = Path(a.from_wireframe).resolve() if Path(a.from_wireframe).is_dir() else in_project(a.from_wireframe)
    hand = load_handoff(wf) if wf else None
    if not a.site and not wf:
        sys.exit("error: --site (or --from-wireframe) is required")
    site = in_project(a.site) if a.site else wf
    if not site.is_dir():
        sys.exit(f"error: site folder {site} not found")
    tokens = merge_tokens(json.loads((TEMPLATE / "tokens.json").read_text(encoding="utf-8")), hand["tokens"]) if hand else None

    shutil.copytree(TEMPLATE, dest)
    for d in ("assets", "layouts"):
        (dest / d).mkdir(exist_ok=True)
    (dest / ".gitignore").write_text(".tool-cache/\n", encoding="utf-8")

    cfg = json.loads((dest / "project.json").read_text(encoding="utf-8"))
    cfg["name"] = a.name or (hand and hand.get("name")) or project.name
    cfg["siteDir"] = os.path.relpath(site, dest).replace("\\", "/")
    cfg["siteUrl"] = a.url
    if hand:
        cfg["sections"] = {"$doc": cfg["sections"]["$doc"], **hand["sections"]}
        cfg["chrome"] = {"$doc": cfg["chrome"]["$doc"], **hand["chrome"]}
        pages = hand["pages"] + hand["states"] + (hand["mobile"] if a.mobile else [])
    else:
        pages = page_list(site)
    if pages:
        cfg["pages"] = pages
    (dest / "project.json").write_text(json.dumps(cfg, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if tokens:
        (dest / "tokens.json").write_text(json.dumps(tokens, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"created {dest}")
    print(f"  site: {site}  ({len(pages)} pages listed in project.json)")
    if hand:
        print(f"  from {wf / 'handoff' / 'figma.json'}: {len(hand['pages'])} pages, {len(hand['states'])} states"
              + (f", {len(hand['mobile'])} mobile screens" if a.mobile else "") + f", {len(hand['layouts'])} layouts"
              + "; tokens.json + chrome + sections filled")
        font_report(tokens, hand, wf)
        print("convert images:")
    else:
        print("next: fill tokens.json + project.json (sections, chrome), then convert images:")
    print(f"  python \"{SKILL / 'scripts' / 'convert_images.py'}\" --site \"{site}\" --out \"{dest / 'assets'}\"")
    if hand:
        icons = hand.get("icons", {})
        print(f"icons ({len(icons.get('keys', []))}), after setup:  await H.harvestIcons(tab, "
              f"{json.dumps(icons.get('files', []), ensure_ascii=False)});")


if __name__ == "__main__":
    main()
