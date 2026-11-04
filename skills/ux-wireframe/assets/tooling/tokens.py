#!/usr/bin/env python3
"""Design tokens — the ONE source for the wireframe and for Bricks' Style Manager.

    python tokens.py   → assets/tokens.css          (the CSS Bricks prints; every page loads it first)
                         handoff/bricks-tokens.json  (bricks_tokens_apply.php / bricks_tokens_verify.php,
                                                      handoff.py, qa.py breakpoints, build.py default mode)

The system is learned from Core Framework and built on Bricks' own theme management (no Core Framework
plugin): Color Manager palettes (Brand with Bricks shades, Neutrals, Theme roles with a dark value each),
Style Manager scales (fluid font sizes and spacing generated from a base size and a ratio) and global
variables in categories. The maths (fluid clamp(), colour shades) is Bricks' own, ported in
tokens_builder.py — a vendored, byte-identical copy of skill bricks-bem-html/scripts/tokens_builder.py;
never edit it here.

Rules
- A token is defined here and nowhere else: no stylesheet defines a tokens.css name in a :root / html rule
  (qa.py). A section's [data-surface="x"] rule may re-point tokens for its subtree.
- Type is a scale step plus a unitless line height: font-size var(--text-<step>), line-height
  var(--line-height-<step>). Spacing literals in stylesheets stay on the 4 px grid.
- Colours: components read Theme roles (--bg-*, --text-*, --border-*, --active …); a Theme role points at a
  Brand / Neutral colour or holds a literal, never at another role. --light / --dark [-N] flip in dark mode,
  --all-light / --all-dark [-N] never do (text and fills on photos or always-dark surfaces).
- Breakpoints are Bricks' (desktop-first) on every site: laptop 1279 (custom, always added), tablet portrait
  991, mobile landscape 767, mobile portrait 478 — @media (max-width: N) or (min-width: N + 1); JS matchMedia
  the same.
- Container: the theme style's Container reads --max-screen-width (border-box width) and --container-padding
  (side padding); base.css reproduces it for every data-brx="container". Sections never set either.
- Dark mode is Bricks' own: html[data-brx-theme="dark"], localStorage "brx_mode"; build.py's head script
  falls back to styleManager defaultMode. Phase 7 (UI refine) changes the values here, then reruns this file.
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from tokens_builder import Tokens  # noqa: E402

T = Tokens()

# ----------------------------------------------------------------- Style Manager, breakpoints
# 62.5 %: 1rem = 10px. defaultMode: set "auto" when the project gets a dark theme (prefers-color-scheme).
T.style_manager(htmlFontSize="62.5%", minScreenWidth=320, maxScreenWidth=1440, defaultMode="light")
# desktop-first max-width; "laptop" 1279 is custom and added on every site (class-system.md §6)
T.breakpoints([("laptop", "Laptop", 1279, True), ("tablet_portrait", "Tablet portrait", 991, False),
               ("mobile_landscape", "Mobile landscape", 767, False), ("mobile_portrait", "Mobile portrait", 478, False)])

# ----------------------------------------------------------------- colours (Color Manager) — grayscale wireframe
T.brand("Wireframe · Brand", [
    ("primary", "#000000", {"light": 4, "dark": 4}),     # ink: solid actions, strong text, outlines
    ("secondary", "#808080", {"light": 4, "dark": 4}),   # gray ramp: d-4 #1a1a1a … l-4 #e6e6e6
    ("tertiary", "#F2F2F2"),                             # light band
], pid="wfbrnd")
T.neutrals("Wireframe · Neutrals", pid="wfneut")
T.palette("Wireframe · Theme", [  # (role, light, dark | None = same in both modes)
    # backgrounds
    ("bg-body", "#FFFFFF", "#121212"),
    ("bg-surface", "#FFFFFF", "#1E1E1E"),                # cards, controls, popovers
    ("bg-surface-2", "var(--tertiary)", "#181818"),      # subtle bands, table heads, boxes
    ("bg-surface-3", "#E4E4E4", "#2A2A2A"),              # utility fills
    ("bg-base", "#000000", None),                        # inverse bands, footer
    ("bg-accent", "var(--tertiary)", "#1E1E1E"),
    # text — one colour per text role
    ("text-title", "var(--primary)", "var(--tertiary)"),            # headings, strong text, links
    ("text-body", "var(--primary)", "var(--secondary-l-4)"),
    ("text-body-dark", "var(--secondary-d-1)", "var(--secondary-l-2)"),   # muted text
    ("text-eyebrow", "var(--secondary-d-1)", "var(--secondary-l-2)"),     # eyebrows above headings
    ("text-contrast", "#FFFFFF", None),                  # text on --active / --bg-base
    ("accent", "var(--primary)", "var(--tertiary)"),
    # borders
    ("border-subtle", "#E4E4E4", "#2A2A2A"),
    ("border-light", "var(--secondary-l-3)", "#3A3A3A"),
    ("border-dark", "var(--secondary-l-1)", "var(--secondary-d-1)"),    # input borders
    ("border-strong", "var(--primary)", "var(--tertiary)"),
    # interaction
    ("active", "var(--primary)", "var(--secondary-d-2)"),            # solid buttons, selected chips/steps/days
    ("active-hover", "var(--secondary-d-3)", "var(--secondary-d-1)"),
    ("hover", "var(--secondary-d-3)", "var(--secondary-l-3)"),       # link hover
    ("focus", "var(--primary)", "var(--tertiary)"),                  # focus rings
    # status (grayscale until phase 7)
    ("success", "var(--primary)", "var(--tertiary)"),
    ("success-bg", "var(--tertiary)", "#1E1E1E"),
    ("error", "var(--primary)", "var(--tertiary)"),
    ("error-bg", "var(--tertiary)", "#1E1E1E"),
], pid="wfthem")

# ----------------------------------------------------------------- scales (Style Manager › Typography / Spacing)
T.ratio_scale("wffsz", "Font sizes", "typography", "text-",
              ["xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl", "5xl", "6xl"], "m", (16, 16), (1.125, 1.2))
T.ratio_scale("wfspc", "Spacing", "spacing", "space-",
              ["3xs", "2xs", "xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl", "5xl"], "m", (16, 16), (1.414, 1.414))

# ----------------------------------------------------------------- variables (Style Manager › Variables)
T.category("wflhe", "Line heights", [("line-height-xs", "1"), ("line-height-s", "1.2"), ("line-height-m", "1.3"),
                                     ("line-height-l", "1.4"), ("line-height-xl", "1.5")])
T.category("wffnt", "Fonts", [
    ("font-family", '"Inter", "Helvetica Neue", Arial, "Segoe UI", sans-serif'),
    ("font-family-display", "var(--font-family)"),
    ("font-family-mono", '"SFMono-Regular", Consolas, "Roboto Mono", monospace'),
    ("font-weight-body", "400"),
    ("font-weight-strong", "600"),
    ("font-weight-heading", "700"),
    ("letter-spacing-heading", "-0.01em"),
    ("letter-spacing-display", "-0.03em"),
    ("letter-spacing-eyebrow", "0.14em"),
])
T.category("wflay", "Layout", [
    # theme style › Container: width var(--max-screen-width) (border-box, padding included), side padding
    # var(--container-padding). Desktop content 1440 − 2 × 40 = 1360 = 12 × 84 + 11 × 32 (handoff.py grid).
    ("max-screen-width", "1440px"),
    ("container-padding", T.fluid(16, 40)),
    ("max-content-width", "904px"),             # narrow reading column inside a container (articles, legal)
    ("layout-header-h", "72px"), ("layout-sticky-top", "96px"),
    ("layout-gutter", T.fluid(16, 32)),         # column gap of a section grid
    ("layout-section-pad", T.fluid(48, 96)),    # vertical padding of a section (on the section's own class)
    *[(f"columns-{n}", f"repeat({n}, minmax(0, 1fr))") for n in (2, 3, 4, 5, 6, 7, 12)],   # equal grid tracks
])
T.category("wfrad", "Radius", [("radius-s", "4px"), ("radius-m", "8px"), ("radius-l", "12px"),
                               ("radius-full", "999px")])
T.category("wfstr", "Strokes", [("stroke-strong", "1px solid var(--border-strong)"),
                                ("stroke", "1px solid var(--border-light)"),
                                ("stroke-subtle", "1px solid var(--border-subtle)")])
T.category("wfshd", "Shadows", [
    ("shadow-s", "0 1px 4px rgba(0, 0, 0, .12)"),                                    # selected segment
    ("shadow-m", "0 1px 2px rgba(0, 0, 0, .04), 0 4px 16px rgba(0, 0, 0, .06)"),     # cards
    ("shadow-l", "0 8px 24px rgba(0, 0, 0, .12)"),                                   # popovers
    ("shadow-xl", "0 4px 12px rgba(0, 0, 0, .06), 0 28px 72px rgba(0, 0, 0, .18)"),  # overlays
])
T.category("wfcmp", "Components", [
    # buttons (w-button-primary / w-button-secondary) — an inverse [data-surface] re-points them
    ("btn-bg", "var(--active)"), ("btn-fg", "var(--text-contrast)"), ("btn-border", "var(--active)"),
    ("btn-bg-hover", "var(--active-hover)"), ("btn-fg-hover", "var(--text-contrast)"),
    ("btn-border-hover", "var(--active-hover)"),
    ("btn-secondary-fg", "var(--text-title)"), ("btn-secondary-border", "var(--border-strong)"),
    ("btn-secondary-bg-hover", "var(--dark-5)"), ("btn-secondary-fg-hover", "var(--text-title)"),
    ("btn-secondary-border-hover", "var(--border-strong)"),
    # image slots (w-photo)
    ("photo-bg", "var(--bg-surface-2)"), ("photo-border", "var(--border-light)"), ("photo-fg", "var(--text-body-dark)"),
    # text on the current surface
    ("lede-fg", "var(--text-title)"),                  # w-text-l
    ("surface-text-muted", "var(--text-body-dark)"),   # muted text a section reads
    ("surface-link", "var(--text-title)"),             # links (base.css) and w-button-text
    ("surface-link-hover", "var(--hover)"),
])

# ----------------------------------------------------------------- theme style (variables have no dark value)
T.theme_style("""
html { font-size: 62.5%; }
:root[data-brx-theme="dark"] {
  color-scheme: dark;
  --shadow-s: 0 0 0 1px rgba(255, 255, 255, .08), 0 1px 4px rgba(0, 0, 0, .5);
  --shadow-m: 0 0 0 1px rgba(255, 255, 255, .06), 0 4px 16px rgba(0, 0, 0, .4);
  --shadow-l: 0 0 0 1px rgba(255, 255, 255, .08), 0 8px 24px rgba(0, 0, 0, .55);
  --shadow-xl: 0 0 0 1px rgba(255, 255, 255, .08), 0 28px 72px rgba(0, 0, 0, .7);
}
""")

if __name__ == "__main__":
    T.write(ROOT / "handoff" / "bricks-tokens.json", css=ROOT / "assets" / "tokens.css")
