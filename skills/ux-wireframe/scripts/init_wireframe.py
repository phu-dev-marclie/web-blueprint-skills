#!/usr/bin/env python3
"""
Scaffold a wireframe project in the target folder.

    python <skill>/scripts/init_wireframe.py [target_dir] [--lang en] [--team-lang vi]
                                             [--currency "€"] [--archetype brand] [--force]

--lang       language of the displayed copy
--team-lang  language of the team's notes; its characters are banned from displayed copy
             (automatically off when it equals --lang, e.g. a Vietnamese site)
--currency   only for sites that display prices

Step 0 runs before research, so --archetype is usually omitted; phase 3 then
re-runs with the decided archetype:
    python <skill>/scripts/init_wireframe.py . --archetype brand
which only writes what is still missing (site.config.json archetype is always updated).

Creates:
    content/                      per-page copy (.md)
    wireframe/tokens.py           THE PROJECT'S DESIGN TOKENS (one spec: Bricks Style Manager palettes,
                                  scales, variables incl. the container (--max-screen-width, --container-padding),
                                  breakpoints incl. laptop 1279) + tokens_builder.py (vendored generator);
                                  `python wireframe/tokens.py` writes assets/tokens.css + handoff/bricks-tokens.json
    wireframe/assets/             tokens.css (generated, loads first) + base.css (Bricks theme style + element
                                  defaults for data-brx — the only tag selectors) + components.css (every reused
                                  w- class: type, buttons, cards, widgets) + wireframe.js (engine)
    wireframe/assets/sections/    ONE STYLESHEET PER SECTION BLOCK (<layout>.css, authored in phase 3/5) +
                                  header.css / footer.css starters; build.py concatenates them into sections.css
    wireframe/_partials/          header.html + footer.html (Bricks structure: w-header / w-footer sections with
                                  w-…__container containers; skeleton, or commerce templates)
    wireframe/_pages/             body fragments (authored)
    wireframe/_templates/         templates for data-driven page families (render.py)
    wireframe/data/               data files for those families (*.json)
    wireframe/build.py clean.py qa.py render.py handoff.py bem_lint.py browser-checks.js
    wireframe/assets/icons/       inline-SVG icon library (<i data-icon="name" class="w-icon"> → build.py)
    wireframe/site.config.json    archetype + stylesheet stack (tokens.css, base.css, components.css, sections.css)
    wireframe/qa.config.json      QA rules
    wireframe/i18n.json           engine strings

Never overwrites an existing file unless --force.
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parent.parent
TOOLING = SKILL / "assets" / "tooling"
PARTIALS = SKILL / "assets" / "partials"
ICONS = SKILL / "assets" / "icons"
ARCHETYPES = ["commerce", "brand", "service", "saas", "editorial", "portfolio", "nonprofit"]

BANNED_BY_LANG = {
    # language of the site -> terms that leak in from sibling-market copy
    "hr": ["osvetlenie", "osvětlení", "svietidl", "košík", "Prihlásiť", "Zobraziť",
           "zrkadl", "obklady", "soklové", "Hľadať", "Obľúbené"],
}
# Characters that betray the TEAM's note language leaking into displayed copy.
# Only used when the team writes notes in a different language than the site.
NOTE_CHARS_BY_TEAM_LANG = {
    "vi": "ẦỀẤỆỌỘƯỚỜỢảãạắằẳẵặấầẩẫậẻẽẹếềểễệỉĩịỏõọốồổỗộơớờởỡợủũụưứừửữựỳỷỹỵđĐ",
}

STACK = ["assets/tokens.css", "assets/base.css", "assets/components.css", "assets/sections.css"]
# layers of the pre-class-system skill: replaced by components.css + assets/sections/<layout>.css
OBSOLETE_CSS = ("assets/wireframe.css", "assets/site.css", "assets/style.css", "assets/packs/")


def copy(src: Path, dst: Path, force: bool) -> None:
    if dst.exists() and not force:
        print(f"  skip   {dst.name}")
        return
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, dst)
    print(f"  write  {dst.name}")


def write(dst: Path, text: str, force: bool) -> None:
    if dst.exists() and not force:
        print(f"  skip   {dst.name}")
        return
    dst.write_text(text, encoding="utf-8")
    print(f"  write  {dst.name}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("target", nargs="?", default=".")
    ap.add_argument("--lang", default="en", help="site content language code, e.g. hr, en, vi")
    ap.add_argument("--team-lang", default="vi",
                    help="language the team writes notes in; its characters are banned from "
                         "displayed copy unless it equals --lang")
    ap.add_argument("--currency", default="", help="only for sites that show prices, e.g. €")
    ap.add_argument("--archetype", choices=ARCHETYPES, help="decided in phase 3")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()

    root = Path(a.target).resolve()
    wf = root / "wireframe"
    for d in (root / "content", wf / "_pages", wf / "_partials", wf / "_templates", wf / "data",
              wf / "assets" / "sections", wf / "assets" / "icons"):
        d.mkdir(parents=True, exist_ok=True)

    print(f"scaffolding {root}")
    for name in ("base.css", "components.css", "wireframe.js"):
        copy(TOOLING / name, wf / "assets" / name, a.force)
    for name in ("build.py", "clean.py", "qa.py", "render.py", "handoff.py", "bem_lint.py", "browser-checks.js",
                 "tokens.py", "tokens_builder.py"):
        copy(TOOLING / name, wf / name, a.force)
    for icon in sorted(ICONS.glob("*.svg")):
        dst = wf / "assets" / "icons" / icon.name
        if a.force or not dst.exists():
            shutil.copyfile(icon, dst)
    print(f"  write  assets/icons/ ({len(list(ICONS.glob('*.svg')))} icons, Phosphor regular)")
    # the project's token spec → assets/tokens.css + handoff/bricks-tokens.json (generated, always fresh)
    run = subprocess.run([sys.executable, str(wf / "tokens.py")], capture_output=True, text=True, encoding="utf-8")
    if run.returncode:
        print(run.stdout + run.stderr, file=sys.stderr)
        print("error: wireframe/tokens.py failed — fix the token spec and rerun it", file=sys.stderr)
        return 1
    print("  write  assets/tokens.css + handoff/bricks-tokens.json (python wireframe/tokens.py)")

    # header / footer: partial markup + its section stylesheet; an untouched skeleton is replaced when the
    # archetype calls for other templates
    src = PARTIALS / "commerce" if a.archetype == "commerce" else PARTIALS
    for part in ("header", "footer"):
        for skel_name, dst in ((f"{part}.template.html", wf / "_partials" / f"{part}.html"),
                               (f"{part}.css", wf / "assets" / "sections" / f"{part}.css")):
            skeleton = (PARTIALS / skel_name).read_text(encoding="utf-8")
            untouched = dst.is_file() and dst.read_text(encoding="utf-8") == skeleton
            copy(src / skel_name, dst, a.force or (untouched and src != PARTIALS))

    site_file = wf / "site.config.json"
    site = json.loads(site_file.read_text(encoding="utf-8")) if site_file.is_file() else {}
    if a.archetype or not site:
        old = site.get("css", [])
        gone = [rel for rel in old if rel.startswith(OBSOLETE_CSS)]
        # project layers added later (none by default) keep their place after the stack
        css = STACK + [rel for rel in old if rel not in STACK and rel not in gone]
        site.update({"archetype": a.archetype, "css": css})
        site_file.write_text(json.dumps(site, indent=2), encoding="utf-8")
        print(f"  write  site.config.json (archetype: {a.archetype})")
        if gone:
            print(f"  note   dropped {', '.join(gone)} from site.config.json — move their rules into "
                  "assets/components.css (reused classes) and assets/sections/<layout>.css (one file per section)")

    cfg = wf / "qa.config.json"
    note_chars = "" if a.team_lang == a.lang else NOTE_CHARS_BY_TEAM_LANG.get(a.team_lang, "")
    write(cfg, json.dumps({
        "currency": a.currency,
        "banned_terms": BANNED_BY_LANG.get(a.lang, []),
        "banned_chars": note_chars,
        "meta_phrases": [],
        "min_layout_variety": 0.6,
        "required_hooks": {},
    }, ensure_ascii=False, indent=2), a.force)
    i18n = {"lang": a.lang}
    if a.currency:
        i18n["currency"] = a.currency
    write(wf / "i18n.json", json.dumps(i18n, ensure_ascii=False, indent=2), a.force)
    stale = wf / "make_stubs.py"
    if stale.exists():   # stub pages are no longer part of the pipeline
        print("  note   make_stubs.py is obsolete — every linked page is authored or rendered")

    print(
        "\nnext:\n"
        "  1. research         -> Business-information.md\n"
        "  2. sitemap          -> sitemap.md\n"
        "  3. design direction -> design-direction.md + archetype + tokens.py (python wireframe/tokens.py)\n"
        "                         + component catalogue (assets/components.css) + one stylesheet per layout\n"
        "                         (assets/sections/<layout>.css, block w-<layout>) + partials (w-header / w-footer)\n"
        "  4. content          -> content/*.md\n"
        "  5. wireframe        -> _partials/*, _pages/*.html (authored), _templates/ + data/ (generated); every section\n"
        "                         <section class=\"w-<layout>\" data-layout=\"<layout>\" data-brx=\"section\"> >\n"
        "                         <div class=\"w-<layout>__container\" data-brx=\"container\">, then:\n"
        "       python wireframe/render.py && python wireframe/clean.py && python wireframe/build.py && python wireframe/qa.py\n"
        "  6. QA               -> browser gate + design review\n"
        "  7. UI refine        -> design.md (from a reference site) + tokens.py values + skins in assets/components.css\n"
        "                         and assets/sections/*.css\n"
        "  8. iterate          -> fixes at the source; handoff to Figma: build.py --final && handoff.py\n"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
