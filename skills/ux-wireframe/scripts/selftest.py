#!/usr/bin/env python3
"""
Regression test for the ux-wireframe tooling. Run after every change to the skill:

    python <skill>/scripts/selftest.py                  # tooling pipeline + qa negative tests
    python <skill>/scripts/selftest.py --project DIR    # also: DIR's tooling equals the skill's

1. Scaffolds a tiny `service` site in a temp folder with init_wireframe.py, authors two pages in the w- class
   system (Bricks Section > Container, one stylesheet per section in assets/sections/, a Bricks Section template
   shared by two pages), one generated family, content files and the catalogues — a clean, real project.
2. render → clean → build → qa must pass with zero problems and zero warnings; tokens.py has written
   assets/tokens.css (first stylesheet) with every token the skill CSS / JS reads; build.py has concatenated
   assets/sections/*.css (header first, footer last).
3. Each known failure mode is injected into a fresh copy; qa must report it.
Exit 1 on the first unexpected result.
"""
from __future__ import annotations

import argparse
import filecmp
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

SKILL = Path(__file__).resolve().parent.parent
TOOLING = SKILL / "assets" / "tooling"
UPSTREAM = SKILL.parent / "bricks-bem-html" / "scripts"
VENDORED = ("bem_lint.py", "tokens_builder.py")     # byte-identical copies of skill bricks-bem-html, never edited here
# tooling that must stay byte-identical in a project (base.css takes @font-face in phase 7, components.css and
# assets/sections/ are the project's own)
SYNCED = {"build.py": "build.py", "clean.py": "clean.py", "qa.py": "qa.py", "render.py": "render.py",
          "handoff.py": "handoff.py", "browser-checks.js": "browser-checks.js", "bem_lint.py": "bem_lint.py",
          "tokens_builder.py": "tokens_builder.py", "wireframe.js": "assets/wireframe.js"}

HEADER = """<header class="w-header" data-brx="section"><div class="w-header__container" data-brx="container">
<a class="w-header__brand" href="index.html" data-chrome="brand">Acme</a>
<nav class="w-header__nav" aria-label="Main" data-chrome="nav"><ul class="w-header__list"><li class="w-header__item"><a class="w-header__link" href="services.html" data-nav="services">Services</a></li><li class="w-header__item"><a class="w-header__link" href="about.html" data-nav="about">About</a></li></ul></nav>
<a class="w-button-primary" href="services.html" data-chrome="cta" data-component="Button: Primary" data-prop="label">Book a visit</a>
<button class="w-header__nav-toggle" type="button" data-nav-toggle aria-expanded="false"><i data-icon="list" class="w-icon"></i> Menu</button>
</div></header>
<div class="w-nav-panel" data-nav-panel><button class="w-nav-panel__close" type="button" data-nav-close>Close <i data-icon="x" class="w-icon w-icon--small"></i></button>
<ul class="w-nav-panel__list"><li class="w-nav-panel__item"><a class="w-nav-panel__link" href="services.html">Services</a></li><li class="w-nav-panel__item"><a class="w-nav-panel__link" href="about.html">About</a></li></ul></div>
"""
FOOTER = """<footer class="w-footer" data-brx="section"><div class="w-footer__container" data-brx="container">
<div class="w-footer__column" data-chrome="footer-col"><p class="w-footer__column-title">Acme</p><ul class="w-footer__menu"><li class="w-footer__menu-item"><a class="w-footer__menu-link" href="services.html">Services</a></li><li class="w-footer__menu-item"><a class="w-footer__menu-link" href="about.html">About</a></li></ul></div>
<p class="w-footer__legal" data-chrome="legal">© Acme</p>
</div></footer>
"""
DESIGN = """# Design direction — Acme
## 8. Layout catalogue
| Layout | Description | Used on | Responsive behaviour |
| --- | --- | --- | --- |
| `statement` | display sentence + CTA | home | stacked |
| `ledger` | numbered ruled rows (Bricks template "Ledger", insert) | home, about | stacked |
| `label-split` | label left, text right | home, about, services | stacked |
| `service-stage` | service facts + brief | services family | stacked |

### 8c. Component catalogue
| Component | Block + modifiers | Properties | Used on |
| --- | --- | --- | --- |
| `Button: Primary` | `w-button-primary` | label (text), link | header, home |
| `Card: Service` | `w-card-service` | link (text) | services |
"""
COMPONENT_CSS = """
/* Card: Service — project component (design-direction §8c) */
.w-card-service { padding-block: 8px; border-bottom: var(--stroke-subtle); }
.w-card-service__link { text-decoration: none; }
"""
SECTION_CSS = {
    "statement": ".w-statement { padding-block: 80px; }\n.w-statement__title { margin: 0; }\n"
                 ".w-statement__actions { margin: 0; }\n.w-statement .w-button-primary { padding-inline: 32px; }\n",
    "ledger": ".w-ledger { padding-block: 64px; }\n.w-ledger__list { margin: 0; }\n"
              ".w-ledger__icon { margin-right: 8px; }\n.w-ledger__note { margin: 0; }\n",
    "label-split": ".w-label-split { padding-block: 64px; }\n"
                   ".w-label-split__container { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); "
                   "gap: var(--layout-gutter); }\n"
                   "@media (max-width: 767px) {\n  .w-label-split__container { grid-template-columns: minmax(0, 1fr); }\n}\n",
    "service-stage": ".w-service-stage { padding-block: 64px; }\n",
}
LEDGER_TPL = 'data-brx="section" data-brx-template="Ledger" data-brx-template-mode="insert"'
HOME = """<!--META {"title":"Acme","desc":"Acme home","template":"T:home","nav":"home"} -->
<section class="w-statement" id="intro" data-layout="statement" data-surface="inverse" data-brx="section"><div class="w-statement__container" data-brx="container"><h1 class="w-statement__title w-heading-2xl">Repairs that last</h1>
<p class="w-statement__actions"><a class="w-button-primary" href="services.html" data-component="Button: Primary" data-prop="label">See services&nbsp;<i data-icon="arrow-right" class="w-icon w-icon--small"></i></a></p></div></section>
<section class="w-ledger" id="why" data-layout="ledger" data-surface="default" """ + LEDGER_TPL + """><div class="w-ledger__container" data-brx="container"><h2 class="w-ledger__title">Why Acme</h2><ol class="w-ledger__list"><li class="w-ledger__row"><i data-icon="check" class="w-icon w-icon--small w-ledger__icon"></i> Same-day visits</li><li class="w-ledger__row"><i data-icon="check" class="w-icon w-icon--small w-ledger__icon"></i> Fixed quotes</li></ol><p class="w-ledger__note">Both in writing.</p></div></section>
<section class="w-label-split" id="about-us" data-layout="label-split" data-surface="subtle" data-brx="section"><div class="w-label-split__container" data-brx="container"><h2 class="w-label-split__title">Who we are</h2>
<figure class="w-label-split__media"><div class="w-photo w-photo--4x3">Photo · 4:3 · technician repairing a boiler, daylight</div></figure></div></section>
"""
ABOUT_P = '<p class="w-label-split__text">Family firm.</p>'
ABOUT = """<!--META {"title":"About Acme","desc":"About","template":"T:editorial","nav":"about"} -->
<section class="w-label-split" id="story" data-layout="label-split" data-surface="default" data-brx="section"><div class="w-label-split__container" data-brx="container"><nav class="w-breadcrumb"><a class="w-breadcrumb__link" href="index.html">Home</a><span class="w-breadcrumb__separator">/</span><span class="w-breadcrumb__current">About</span></nav>
<h1 class="w-label-split__title">About Acme</h1>""" + ABOUT_P + """</div></section>
<section class="w-ledger" id="values" data-layout="ledger" data-surface="subtle" """ + LEDGER_TPL + """><div class="w-ledger__container" data-brx="container"><h2 class="w-ledger__title">What we promise</h2><ol class="w-ledger__list"><li class="w-ledger__row"><i data-icon="x" class="w-icon w-icon--small w-ledger__icon"></i> No call-out fee</li></ol></div></section>
"""
SERVICES = """<!--META {"title":"Services","desc":"Services","template":"T:hub","nav":"services"} -->
<section class="w-label-split" id="list" data-layout="label-split" data-surface="default" data-brx="section"><div class="w-label-split__container" data-brx="container"><h1 class="w-label-split__title">Services</h1>
<ul class="w-label-split__list"><li class="w-card-service" data-component="Card: Service"><a class="w-card-service__link" href="boiler-repair.html" data-prop="link">Boiler repair</a></li><li class="w-card-service" data-component="Card: Service"><a class="w-card-service__link" href="pipe-repair.html" data-prop="link">Pipe repair</a></li></ul></div></section>
"""
CONTENT = {
    "home.md": "# Home\n> Page: `/` · Template: `T:home` · Wireframe: `index.html`\n\n## Sections\n"
               "Repairs that last. Why Acme. Who we are.\n",
    "about.md": "# About\n> Page: `/about` · Wireframe: `about.html`\n\n## Sections\nAbout Acme. What we promise.\n",
    "services.md": "# Services\n> Page: `/services` · Wireframe: `services.html`\n\n## Sections\nServices.\n",
}
TEMPLATE = """<section class="w-service-stage" id="stage" data-layout="service-stage" data-surface="default" data-brx="section"><div class="w-service-stage__container" data-brx="container"><h1 class="w-service-stage__title">{{title}}</h1><p class="w-service-stage__lede w-text-l">{{lede}}</p>
<p class="w-service-stage__back"><a href="services.html">All services</a></p></div></section>
"""
DATA = {"template": "_templates/service.html", "meta": {"template": "T:service", "nav": "services"},
        "pages": [{"slug": "boiler-repair", "title": "Boiler repair", "lede": "Gas and oil boilers."},
                  {"slug": "pipe-repair", "title": "Pipe repair", "lede": "Leaks and bursts."}]}

ABOUT_LEDGER = 'id="values" data-layout="ledger" data-surface="subtle" ' + LEDGER_TPL
# (name, file under wireframe/ | [(file, old, new), …], old, new, expected qa text); new None deletes the file;
# extra files per case in EXTRA
INJECTIONS = [
    ("caption under image", "_pages/index.html", "</div></figure>",
     "</div><figcaption class=\"w-label-split__caption\">Technician · site visit</figcaption></figure>", "visible caption"),
    ("caption class", "_pages/about.html", ABOUT_P, '<p class="w-caption">Owner · workshop</p>',
     "visible caption"),
    ("author voice", "_pages/about.html", "Family firm.", "Family firm, as stated in the documentation.",
     "author/AI voice"),
    ("review note", "_pages/about.html", "Family firm.", "Coming soon.", "review/authoring notes"),
    ("placeholder", "_pages/about.html", "Family firm.", "Founded PLACEHOLDER.", "PLACEHOLDER"),
    ("consecutive layout", "_pages/about.html", 'data-layout="ledger"', 'data-layout="label-split"',
     "consecutive sections"),
    ("unknown layout", "_pages/about.html", 'data-layout="ledger"', 'data-layout="bento"',
     "not defined in design-direction"),
    ("commerce markup", "_pages/about.html", ABOUT_P, '<p class="w-card-product__price">9</p>',
     "commerce-only markup"),
    ("dead link", "_pages/about.html", "Family firm.", '<a href="missing.html">x</a>', "missing.html"),
    ("drift", "_pages/about.html", "What we promise", "Our promise to you", "not in its content file"),
    ("orphan", "_templates/service.html", '<a href="services.html">All services</a>', "", None),
    ("two h1", "_pages/about.html", ABOUT_P, '<h1 class="w-label-split__title">Again</h1>', "expected exactly 1 <h1>"),
    ("not in nav", "_pages/index.html", "Same-day visits", 'Same-day visits by <a href="team.html">our team</a>',
     "team.html: not linked from the header"),
    # design-tool contract (html-to-figma handoff)
    ("stray top-level", "_pages/about.html", '<section class="w-label-split" id="story"',
     '<nav class="w-breadcrumb"><a class="w-breadcrumb__link" href="index.html">Home</a></nav>\n'
     '<section class="w-label-split" id="story"', "stray top-level <nav>"),
    ("unknown surface", "_pages/about.html", 'data-surface="subtle"', 'data-surface="dark"', "data-surface="),
    ("off-grid spacing", "assets/sections/ledger.css", "padding-block: 64px", "padding-block: 62px",
     "off the 4 px spacing grid"),
    ("literal font size", "assets/sections/ledger.css", ".w-ledger {", ".w-ledger { font-size: 15px;",
     "use the type tokens"),
    ("css content text", "assets/sections/ledger.css", ".w-ledger {",
     '.w-ledger__row::before { content: "01"; }\n.w-ledger {', "text in CSS"),
    # one token source (tokens.py → assets/tokens.css) and the Bricks breakpoints
    ("token redefined in root rule", "assets/sections/statement.css", ".w-statement {",
     ":root { --text-5xl: 44px; }\n.w-statement {", "--text-5xl is a token; tokens are defined only in tokens.py"),
    ("unknown token", "assets/sections/ledger.css", ".w-ledger {", ".w-ledger { color: var(--color-text-default);",
     "var(--color-text-default) is not a token in assets/tokens.css"),
    ("old placeholder token", "assets/sections/ledger.css", ".w-ledger {", ".w-ledger { background: var(--ph-bg);",
     "var(--ph-bg) is not a token in assets/tokens.css"),
    ("non-Bricks breakpoint", "assets/sections/ledger.css", ".w-ledger {",
     "@media (max-width: 860px) {\n  .w-ledger__list { padding-block: 32px; }\n}\n.w-ledger {",
     "@media (max-width: 860px) is not a Bricks breakpoint"),
    ("inline spacing", "_pages/about.html", ABOUT_P, '<p class="w-label-split__text" style="margin-top:10px">Family firm.</p>',
     "inline style"),
    ("icon glyph", "_pages/about.html", "Family firm.", "Family firm. Read more →", "icon glyph"),
    ("review bar", "_partials/header.html", '<header class="w-header"',
     '<div class="wf-bar">Acme — review</div>\n<header class="w-header"', "review bar (wf-bar)"),
    ("banned term", "_pages/about.html", "Family firm.", "Family firm, Acmee approved.", "banned term"),
    # class system: w- prefix, section blocks, data-brx, no shared layout classes (bem_lint.py --prefix w- + qa)
    ("w-layout class in markup", "_pages/about.html", '<section class="w-ledger" id="values"',
     '<section class="w-ledger w-layout-split" id="values"', "removed layout primitive(s) w-layout-split"),
    (".wrap rule in a section sheet", "assets/sections/ledger.css", ".w-ledger {",
     ".wrap { padding-inline: 24px; }\n.w-ledger {", "removed layout primitive(s) .wrap"),
    ("unprefixed class", "_pages/about.html", ABOUT_P, '<p class="label-split__text">Family firm.</p>', "[prefix]"),
    ("layout attr selector", "assets/sections/ledger.css", ".w-ledger {",
     '[data-layout="ledger"] .w-ledger__row { padding-block: 8px; }\n.w-ledger {', "[layout-attr]"),
    ("surface descendant", "assets/sections/ledger.css", ".w-ledger {",
     '[data-surface="inverse"] .w-button-primary { color: var(--text-contrast); }\n.w-ledger {', "[surface-descendant]"),
    ("cross-block override not allowed", "assets/sections/statement.css", ".w-statement {",
     ".w-statement__actions .w-button-primary { padding-block: 8px; }\n.w-statement {", "[cross-block]"),
    ("classless div", "_pages/about.html", '<h1 class="w-label-split__title">About Acme</h1>',
     '<div><h1 class="w-label-split__title">About Acme</h1></div>', "[no-class]"),
    ("prop outside component", "_pages/about.html", ABOUT_P,
     '<p class="w-label-split__text" data-prop="lede">Family firm.</p>', "[prop-outside-component]"),
    ("unknown component", "_pages/about.html", ABOUT_P,
     '<p class="w-label-split__text" data-component="Card: Team">Family firm.</p>', "not in design-direction.md §8c"),
    ("section without w-x class", "_pages/about.html", '<section class="w-ledger" id="values"',
     '<section class="w-values" id="values"', "lacks class \u201cw-ledger\u201d"),
    ("section without data-brx", "_pages/about.html", ABOUT_LEDGER,
     'id="values" data-layout="ledger" data-surface="subtle" data-brx-template="Ledger" data-brx-template-mode="insert"',
     'lacks data-brx="section"'),
    ("layout without stylesheet", "assets/sections/service-stage.css", "", None,
     "has no stylesheet assets/sections/service-stage.css"),
    # Bricks templates: insert-mode instances may differ inside (the clean fixture: icons, list length, an optional
    # note), but not in their section / container classes, not with another section's classes, not by an unstyled
    # one-off element class; element mode needs one structure and one content
    ("template instances differ in structure", "_pages/about.html",
     '<div class="w-ledger__container" data-brx="container"><h2 class="w-ledger__title">What',
     '<div class="w-ledger__container w-ledger__container--narrow" data-brx="container"><h2 class="w-ledger__title">What',
     "differs in class structure"),
    ("template one-off unstyled class", "_pages/about.html", '<ol class="w-ledger__list"><li class="w-ledger__row"><i data-icon="x"',
     '<p class="w-ledger__lede">Signed on every quote.</p><ol class="w-ledger__list"><li class="w-ledger__row"><i data-icon="x"',
     "never styles it (a typo?)"),
    ("template with another section's class", "_pages/about.html", "No call-out fee</li>",
     'No call-out fee <span class="w-label-split__text">*</span></li>', "uses another section's element class"),
    ("template element mode differs",
     [("_pages/index.html", 'data-brx-template-mode="insert"', 'data-brx-template-mode="element"'),
      ("_pages/about.html", 'data-brx-template-mode="insert"', 'data-brx-template-mode="element"')], None, None,
     "(mode element): index.html differs in class structure"),
    ("template element mode with own content",
     [("_pages/index.html", 'data-brx-template-mode="insert"', 'data-brx-template-mode="element"'),
      ("_pages/about.html", 'data-brx-template-mode="insert"', 'data-brx-template-mode="element"'),
      ("_pages/about.html", '<li class="w-ledger__row"><i data-icon="x" class="w-icon w-icon--small w-ledger__icon"></i> No call-out fee</li></ol>',
       '<li class="w-ledger__row"><i data-icon="check" class="w-icon w-icon--small w-ledger__icon"></i> Same-day visits</li>'
       '<li class="w-ledger__row"><i data-icon="check" class="w-icon w-icon--small w-ledger__icon"></i> Fixed quotes</li></ol>'
       '<p class="w-ledger__note">Both in writing.</p>')], None, None,
     "differs in content"),
    ("obsolete stylesheet layer", "site.config.json", '"assets/sections.css"', '"assets/sections.css",\n    "assets/site.css"',
     "that layer is gone"),
]
BANNED_CFG = json.dumps({"banned_terms": ["Acmee"]})
EXTRA = {
    "not in nav": {
        "wireframe/_pages/team.html": '<!--META {"title":"Team","desc":"Team","template":"T:editorial",'
                                      '"nav":"about"} -->\n<section class="w-label-split" id="team" '
                                      'data-layout="label-split" data-surface="default" data-brx="section">'
                                      '<div class="w-label-split__container" data-brx="container">'
                                      '<h1 class="w-label-split__title">Our team</h1></div></section>\n',
        "content/team.md": "# Team\n> Page: `/team` · Wireframe: `team.html`\n\n## Sections\nOur team.\n",
    },
    "banned term": {"wireframe/qa.config.json": BANNED_CFG},
    "obsolete stylesheet layer": {"wireframe/assets/site.css": ".w-ledger__row { margin: 0; }\n"},
}


def run(wf: Path, script: str) -> subprocess.CompletedProcess:
    return subprocess.run([sys.executable, str(wf / script)], capture_output=True, text=True,
                          encoding="utf-8", errors="replace")


def scaffold(root: Path) -> Path:
    subprocess.run([sys.executable, str(SKILL / "scripts" / "init_wireframe.py"), str(root),
                    "--lang", "en", "--archetype", "service"], check=True, capture_output=True)
    wf = root / "wireframe"
    (root / "design-direction.md").write_text(DESIGN, encoding="utf-8")
    comp = wf / "assets" / "components.css"
    comp.write_text(comp.read_text(encoding="utf-8") + COMPONENT_CSS, encoding="utf-8")
    for layout, css in SECTION_CSS.items():
        (wf / "assets" / "sections" / f"{layout}.css").write_text(css, encoding="utf-8")
    (wf / "_partials" / "header.html").write_text(HEADER, encoding="utf-8")
    (wf / "_partials" / "footer.html").write_text(FOOTER, encoding="utf-8")
    for name, body in (("index.html", HOME), ("about.html", ABOUT), ("services.html", SERVICES)):
        (wf / "_pages" / name).write_text(body, encoding="utf-8")
    for name, body in CONTENT.items():
        (root / "content" / name).write_text(body, encoding="utf-8")
    (wf / "_templates" / "service.html").write_text(TEMPLATE, encoding="utf-8")
    (wf / "data" / "services.json").write_text(json.dumps(DATA), encoding="utf-8")
    return wf


def pipeline(wf: Path) -> subprocess.CompletedProcess:
    for step in ("render.py", "clean.py", "build.py"):
        r = run(wf, step)
        if r.returncode:
            raise SystemExit(f"FAIL {step}: {r.stderr or r.stdout}")
    return run(wf, "qa.py")


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", help="project folder whose wireframe/ tooling must equal the skill's")
    a = ap.parse_args()
    fails = 0

    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp) / "clean"
        wf = scaffold(base)
        qa = pipeline(wf)
        clean = qa.returncode == 0 and "PROBLEMS: none" in qa.stdout and "WARNINGS" not in qa.stdout
        print(f"{'ok  ' if clean else 'FAIL'} clean project passes qa with no warnings")
        if not clean:
            print(qa.stdout[-2500:])
            fails += 1

        # tokens: tokens.py → assets/tokens.css (first stylesheet) defines every token the skill CSS / JS reads
        tokens_css = (wf / "assets" / "tokens.css").read_text(encoding="utf-8")
        defined = set(re.findall(r"(--[\w-]+)\s*:", tokens_css))
        scoped = {"--filter-top"}          # set per element by components.css / wireframe.js, not a token
        used: set[str] = set()
        partial_css = [*(SKILL / "assets" / "partials").glob("*.css"), *(SKILL / "assets" / "partials" / "commerce").glob("*.css")]
        for f in [*(TOOLING / n for n in ("base.css", "components.css", "wireframe.js", "browser-checks.js")), *partial_css]:
            code = re.sub(r"/\*.*?\*/", "", f.read_text(encoding="utf-8"), flags=re.S)
            used |= set(re.findall(r"var\((--[\w-]+)", code))
            used |= set(re.findall(r"getPropertyValue\(\"(--[\w-]+)\"\)", code))
        missing = sorted(used - defined - scoped)
        site_css = json.loads((wf / "site.config.json").read_text(encoding="utf-8"))["css"]
        page = (wf / "index.html").read_text(encoding="utf-8")
        sections_css = (wf / "assets" / "sections.css").read_text(encoding="utf-8")
        order = re.findall(r"assets/sections/([\w-]+)\.css =", sections_css)
        variables = {v["name"]: v["value"] for v in json.loads(
            (wf / "handoff" / "bricks-tokens.json").read_text(encoding="utf-8"))["variables"]}
        bps = {b["width"] for b in json.loads((wf / "handoff" / "bricks-tokens.json").read_text(encoding="utf-8"))["breakpoints"]}
        checks = {
            "css stack tokens → base → components → sections": site_css == ["assets/tokens.css", "assets/base.css",
                                                                          "assets/components.css", "assets/sections.css"],
            "handoff/bricks-tokens.json written": (wf / "handoff" / "bricks-tokens.json").is_file(),
            "root font size 62.5 %": "html { font-size: 62.5%; }" in tokens_css,
            "container tokens 1440 / fluid 16→40, no layout-wrap": variables.get("max-screen-width") == "1440px"
                and "clamp(" in variables.get("container-padding", "") and "max-content-width" in variables
                and not {"layout-wrap", "layout-margin", "layout-wrap-narrow"} & set(variables),
            "Bricks breakpoints incl. laptop 1279": bps == {1279, 991, 767, 478},
            f"every token the skill reads is defined{f' (missing {missing})' if missing else ''}": not missing,
            "head script: brx_mode, default mode light": 'localStorage.getItem("brx_mode")||"light"' in page
                                                          and page.index("brx_mode") < page.index("tokens.css"),
            "sections.css = header first, footer last": order[:1] == ["header"] and order[-1:] == ["footer"]
                                                         and set(order) == {"header", "footer", *SECTION_CSS},
            "icons expanded as w-icon": '<svg class="w-icon pi-arrow-right w-icon--small"' in page,
        }
        bad = [k for k, v in checks.items() if not v]
        print(f"{'ok  ' if not bad else 'FAIL'} scaffold: tokens.css from tokens.py, css stack, sections.css" + (f" — {bad}" if bad else ""))
        fails += 1 if bad else 0

        # design-tool handoff: review build is rejected, final build exports pages/chrome/tokens/icons
        hand = Path(tmp) / "handoff"
        shutil.copytree(base, hand)
        hw = hand / "wireframe"
        hdr = hw / "_partials" / "header.html"
        clean_header = hdr.read_text(encoding="utf-8")
        hdr.write_text("<!--wf:review--><p>review only</p><!--/wf:review-->\n" + clean_header, encoding="utf-8")
        subprocess.run([sys.executable, str(hw / "build.py")], capture_output=True, check=True)
        r = run(hw, "handoff.py")
        ok = r.returncode == 1 and "--final" in (r.stdout + r.stderr)
        print(f"{'ok  ' if ok else 'FAIL'} handoff rejects a review build (wf:review block present)")
        fails += 0 if ok else 1
        subprocess.run([sys.executable, str(hw / "build.py"), "--final"], capture_output=True, check=True)
        r = run(hw, "handoff.py")
        data = {}
        if r.returncode == 0 and (hw / "handoff" / "figma.json").is_file():
            data = json.loads((hw / "handoff" / "figma.json").read_text(encoding="utf-8"))
        type_h1 = next((t for t in data.get("tokens", {}).get("type", []) if t[0] == "Heading/H1"), None)
        checks = {
            "exit 0": r.returncode == 0,
            "5 pages, Home first": [p["file"] for p in data.get("pages", [])][:1] == ["index.html"]
                                   and len(data.get("pages", [])) == 5,
            "nav from data-chrome": [n["label"] for n in data.get("chrome", {}).get("nav", [])] == ["Services", "About"],
            "grid 1512/12/84/32/76 from the container tokens": data.get("tokens", {}).get("grid") ==
                                     {"page": 1512, "columns": 12, "column": 84, "gutter": 32, "margin": 76},
            # h1 = --text-5xl × --line-height-s (1.2), fluid: 47.8 px at 1512, 34.05 px at 440
            "Heading/H1 47.8/57.36, mobile 34.05/40.86": bool(type_h1) and type_h1[3:5] == [47.8, 57.36]
                                              and (type_h1[-1] or {}).get("mobile") == [34.05, 40.86],
            "icons harvested": {"arrow-right", "list", "x"} <= set(data.get("icons", {}).get("keys", [])),
            "components exported": data.get("components", {}).get("Button: Primary", {}).get("props") == ["label"]
                                   and data["components"].get("Card: Service", {}).get("pageCount") == 1
                                   and data["components"]["Card: Service"].get("block") == "w-card-service",
            "surfaces inverse/subtle": {"inverse", "subtle"} <= set(data.get("tokens", {}).get("surfaces", {})),
            "colour/space/radius tokens from tokens.py": "secondary/d-1" in data.get("tokens", {}).get("primitives", {})
                                   and ["text/title", "primary/base", "text"] in data["tokens"].get("semantic", [])
                                   and ["bg/body", "role/bg-body", "fill"] in data["tokens"].get("semantic", [])
                                   and 16 in data["tokens"].get("space", [])
                                   and data["tokens"].get("radius", {}).get("full") == 999,
            "mobile nav state": any(m.get("prepare") for m in data.get("mobile", [])),
        }
        bad = [k for k, v in checks.items() if not v]
        print(f"{'ok  ' if not bad else 'FAIL'} handoff exports a final build" + (f" — {bad}" if bad else ""))
        if bad:
            print((r.stdout + r.stderr)[-1500:])
            fails += 1
        # a container whose column math is not a whole pixel: a warning, the grid still sums to the page
        tok = hw / "tokens.py"
        tok.write_text(tok.read_text(encoding="utf-8").replace('("layout-gutter", T.fluid(16, 32))',
                                                               '("layout-gutter", T.fluid(16, 24))'), encoding="utf-8")
        subprocess.run([sys.executable, str(tok)], capture_output=True, check=True)
        subprocess.run([sys.executable, str(hw / "build.py"), "--final"], capture_output=True, check=True)
        r = run(hw, "handoff.py")
        g = json.loads((hw / "handoff" / "figma.json").read_text(encoding="utf-8"))["tokens"]["grid"] if r.returncode == 0 else {}
        ok = (r.returncode == 0 and "is not a whole pixel" in r.stdout
              and g.get("column") == 91 and 12 * g["column"] + 11 * g["gutter"] + 2 * g["margin"] == g["page"])
        print(f"{'ok  ' if ok else 'FAIL'} handoff warns on a fractional grid column (24 px gutter) and keeps the grid exact")
        if not ok:
            print((r.stdout + r.stderr)[-1500:])
            fails += 1
        page = hw / "_pages" / "about.html"
        page.write_text(page.read_text(encoding="utf-8").replace("Family firm.", 'Family firm. <i data-icon="no-such-icon"></i>'),
                        encoding="utf-8")
        r = run(hw, "build.py")
        ok = r.returncode == 1 and "unknown icon" in r.stderr
        print(f"{'ok  ' if ok else 'FAIL'} build rejects an unknown icon")
        fails += 0 if ok else 1

        for name, rel, old, new, expect in INJECTIONS:
            case = Path(tmp) / re.sub(r"[^\w-]+", "-", name)
            shutil.copytree(base, case)
            edits = rel if isinstance(rel, list) else [(rel, old, new)]
            missing_anchor = False
            for e_rel, e_old, e_new in edits:
                f = case / "wireframe" / e_rel
                if e_new is None:            # the failure mode is a missing file
                    f.unlink()
                    continue
                text = f.read_text(encoding="utf-8")
                if e_old not in text:
                    print(f"FAIL {name}: injection anchor not found in {e_rel}")
                    missing_anchor = True
                    break
                f.write_text(text.replace(e_old, e_new, 1), encoding="utf-8")
            if missing_anchor:
                fails += 1
                continue
            for extra_rel, body in EXTRA.get(name, {}).items():
                (case / extra_rel).write_text(body, encoding="utf-8")
            if name == "orphan":           # generated pages lose their only inbound link from services
                svc = case / "wireframe" / "_pages" / "services.html"
                svc.write_text(svc.read_text(encoding="utf-8").replace(
                    '<li class="w-card-service" data-component="Card: Service"><a class="w-card-service__link" '
                    'href="pipe-repair.html" data-prop="link">Pipe repair</a></li>', ""), encoding="utf-8")
                expect = "pipe-repair.html: orphan page"
            out = pipeline(case / "wireframe").stdout
            hit = expect in out
            print(f"{'ok  ' if hit else 'FAIL'} qa detects {name}")
            if not hit:
                print(out[-1500:])
                fails += 1

        # a banned spelling inside a URL, id or search synonyms (data-keywords) is not copy
        case = Path(tmp) / "banned-term-in-url"
        shutil.copytree(base, case)
        (case / "wireframe" / "qa.config.json").write_text(BANNED_CFG, encoding="utf-8")
        f = case / "wireframe" / "_pages" / "about.html"
        text = f.read_text(encoding="utf-8")
        assert ABOUT_P in text, "banned-term-in-url anchor missing"
        f.write_text(text.replace(ABOUT_P, '<p class="w-label-split__text" data-keywords="acmee">Family firm. '
                                  '<a href="services.html?acmee=1">Services</a></p>', 1), encoding="utf-8")
        out = pipeline(case / "wireframe").stdout
        ok = "banned term" not in out
        print(f"{'ok  ' if ok else 'FAIL'} qa ignores a banned spelling in URLs and data-keywords")
        if not ok:
            print(out[-1500:])
            fails += 1

    # the vendored lint and token generator are byte-identical copies of skill bricks-bem-html (never edited here)
    for name in VENDORED:
        if (UPSTREAM / name).is_file():
            same = filecmp.cmp(TOOLING / name, UPSTREAM / name, shallow=False)
            print(f"{'ok  ' if same else 'FAIL'} assets/tooling/{name} identical to bricks-bem-html/scripts/{name}")
            fails += 0 if same else 1
        else:
            print(f"skip {name} upstream check (bricks-bem-html not installed)")

    if a.project:
        wf = Path(a.project).resolve() / "wireframe"
        for src, dst in SYNCED.items():
            same = (wf / dst).is_file() and filecmp.cmp(TOOLING / src, wf / dst, shallow=False)
            print(f"{'ok  ' if same else 'FAIL'} {dst} in sync with skill")
            fails += 0 if same else 1

    print(f"\n{'PASS' if not fails else f'{fails} FAILURE(S)'}")
    return 1 if fails else 0


if __name__ == "__main__":
    raise SystemExit(main())
