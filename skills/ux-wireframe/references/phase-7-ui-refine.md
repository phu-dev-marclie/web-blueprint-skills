# Phase 7 — UI mockup refine → `design.md` + `wireframe/tokens.py` + skins in `assets/components.css` / `assets/sections/<layout>.css`

Turns the approved grayscale wireframe into a styled UI mockup in the visual language of a
reference site the user names: colour, typefaces, type scale, spacing rhythm, radius, elevation
and component skins. IA, compositions and copy stay exactly as approved. The phase learns a
design **system** from the reference and applies it to this client's brand. It never clones the
reference.

**When:** after phase 6 passes and the user names a reference: a URL, or a DESIGN.md file such as
`airbnb.design.md`. If the user asked for the phase without naming one, ask once; the choice is
the user's.

## Boundary

| May change | Never changes in this phase |
| --- | --- |
| **`wireframe/tokens.py`** (the only token source → `assets/tokens.css` + `handoff/bricks-tokens.json`): Brand colours and their shades (`--primary`, `--secondary`, `--tertiary`), Theme roles with light + dark values (`--bg-*`, `--text-title/body/body-dark/eyebrow/contrast`, `--accent`, `--border-*`, `--active`, `--hover`, `--focus`, status), Style Manager default mode | markup, copy, section order, `data-layout`, IA, interactions |
| type: font families and weights (Fonts category), the font-size scale's base + ratios, line-height values, letter spacing; which scale step a role uses (`--text-xl` → `--text-2xl`) | grid structure: columns, spans, `display`, `grid-template-*`, `order`, `position`, visibility |
| spacing scale base + ratio, `--layout-*` min/max, radius, `--shadow-*`, `--gradient-*`, component variables (`--btn-*`, `--photo-*`…) | `.w-photo` slots: they stay grayscale image placeholders (photos come from the photo layer, phase 5) |
| **`assets/base.css`** (theme style): `@font-face`, theme typography. **`assets/components.css`**: component skins on the components' own classes (`.w-button-primary`, `.w-button-secondary`, `.w-card-post`, `.w-field__input`, `.w-chip`…) and project components. **`assets/sections/<layout>.css`** (incl. `header.css`, `footer.css`): section-specific looks on the section's own classes (`.w-header__link`, `.w-about__head`), across blocks only as `.w-section .w-component`. Surfaces (`[data-surface="x"]` background, color and re-pointed tokens only — may add `brand`); hover/focus states | the container (`--max-screen-width`, `--container-padding`), the section grids, the Bricks breakpoints, the token names; class names, `data-brx`, `data-brx-template`, `data-component` / `data-prop` |

A design move that needs geometry (an extra line, a panel, a different column split) is written
into `design.md §Open questions` as a phase-3 proposal. It is not added in a skin.

There is no separate style layer: skins live in the same files the Bricks import reads
(`components.css` → component classes, `assets/sections/*.css` → section classes, `base.css` → theme
style). `"style": true` in `site.config.json` marks the refine as done.

## Steps

### 1. Capture the reference (real browser)
Capture the home page and one inner page of the type closest to this client's key page (for
example a listing detail for an accommodation site), each at 1440 and 390. Scroll to the end so
lazy content renders, then close cookie banners and pop-ups. Evaluate
`<skill>/scripts/style-probe.js` on every view and save:
- `research/style/<host>-<page>-<width>.json`: the probe report (fonts, type clusters, roles,
  colour shares, surfaces, radii, shadows, spacing, component anatomy);
- `research/style/<host>-<page>-<width>.png`: full-page screenshots.

When the user supplies a DESIGN.md file, read it first. If the site is reachable, still verify 3–5
key values in the browser, because such files go stale.

### 2. Findings (measured, with numbers)
Write a findings table from the reports. One row per aspect, each with the value, its share or
count, and the source file:

| Aspect | What to measure |
| --- | --- |
| Fonts | families and their share of text, weight range |
| Type | role clusters (display / h1–h3 / body / small / button / nav / eyebrow): size, line height, weight, tracking |
| Colour | text and background area shares; accent colour(s) with where and how often they appear |
| Surfaces | sequence of full-width bands down the page |
| Shape | radius family; shadow tiers |
| Rhythm | section padding, grid gaps, container width, density per scroll |
| Components | button height, padding, radius and weight; input, card, nav (height, sticky) and footer anatomy |

Close with 5–7 **system qualities**, each with its numbers. Examples: "one accent, used on
primary CTAs only (3 of 40 interactive elements)", "display weight 600, never 800", "one radius
family of 8/12/full".

### 3. Translate, don't clone
- **Transfers:** system qualities such as accent restraint, weight modesty, radius family,
  density, rhythm ratios, photo-first surfaces and the anatomy of the controls.
- **Never transfers:** the reference's brand colour, logo, illustrations, icon set, proprietary
  typeface or copy. A look-alike of another brand is refused (security policy).
- **Palette:** take it from the client's own brand (logo, existing CSS, brief). If the client has
  none, propose one from the brief, for example "black with a dark green or burgundy accent". Then
  apply the reference's *usage pattern* to it: which roles take the accent, the surface shares,
  the contrast between ink and muted text.
- **Fonts:** use the reference typeface only if it is openly licensed (OFL / Google Fonts).
  Otherwise pick the nearest open substitute and say why (x-height, width, weight range,
  language coverage for the site language, e.g. Croatian diacritics). Self-host the woff2 files
  in `wireframe/assets/fonts/` with the licence file next to them. The Figma handoff needs the
  same family installed.
- **Snap:** spacing to the `--space-*` steps, line heights to `--line-height-xs…xl`, sizes to the
  `--text-*` scale. Fit the scale to the reference instead of adding roles: choose the base and the two
  ratios so the reference's body / h3 / h2 / h1 / display land on steps (e.g. body 16 → `m`, h2 40 → `4xl`
  with ratio 1.2 at 1440), then map each role once (table below). Sizes above `6xl` become named
  variables (`--numeral-size: T.fluid(56, 96)`). The container (`--max-screen-width` 1440,
  `--container-padding`) stays. If the reference's look depends on another width, note it in Open questions instead.

| Role | Size / line-height tokens (template default — `handoff.py` `TYPE_ROLES`) | Figma text style |
| --- | --- | --- |
| display (`.w-heading-2xl`) | `6xl` / `s`; a larger display becomes a named variable in `tokens.py` (`T.fluid(min, max)`) | Display/XL |
| h1 · h2 · h3 · h4 | `5xl` · `4xl` · `xl` · `l` / `s` · `s` · `m` · `xl` | Heading/H1 … H4 |
| lede · body · small · micro | `l` · `m` · `s` · `xs` / `xl` · `xl` · `l` · `m` | Body/LG, Body/MD, Body/XS, Body/Micro |
| title (cards) | `m` / `xl` (raise to `l` when titles are 18+ px) | Title/MD |
| eyebrow · nav · button · button sm · field | `xs` · `s` · `s` · `xs` · `s` / `m` · `l` · `l` · `m` · `l` | Label/Eyebrow, Label/Nav, Label/Button LG/SM, Label/Field |
| stat | `4xl` / `s` | Stat/Number |

When a project maps a role to another step, change the component class (`w-heading-*`, `w-text-*`,
`w-eyebrow`… in `components.css`) **and** the role's row in `handoff.py` `TYPE_ROLES`, so the Figma
text styles follow.

Colour per text role: each role in the table that has its own colour gets its own Theme token
(`--text-eyebrow` for eyebrows, not the muted `--text-body-dark`), so one role can change alone.

### 4. Write `design.md` (project root)
Use the DESIGN.md format ([spec](https://github.com/google-labs-code/design.md)):

- **YAML front matter:** `version`, `name`, `description`, and these token groups:
  - `colors`: Brand (`primary`, `secondary`, `tertiary`) and the Theme roles (`text-title`, `text-eyebrow`,
    `bg-base`, `active`, …); CSS `--<key>`, Figma variable `text/title`;
  - `typography`: one entry per role above, with `fontFamily`, `fontSize`, `fontWeight`,
    `lineHeight` and `letterSpacing` at 1440 (mobile values in Responsive Behavior);
  - `rounded`: `s`, `m`, `l`, `xl`, `full` (CSS `--radius-<key>`);
  - `spacing`: `3xs` … `5xl` (CSS `--space-<key>`), plus `section`, `gutter` and `margin` (`--layout-*`);
  - `components`: per skin, using `{colors.x}` references.
- **Markdown sections:** Overview · Colors · Typography · Layout · Elevation · Components ·
  Responsive Behavior · Do's and Don'ts · Known Gaps.
- **Project sections:**
  - `## Reference findings`: the step-2 table and the probe JSON paths.
  - `## Adaptation for <client>`: what was taken, what was changed and why, each tied to a brief
    line.
  - `## Token map`: DESIGN.md token → `tokens.py` entry (palette row, scale step, variable) → Figma
    variable or style; the scale settings (base / ratio at 320 and 1440) and the role → step table.
  - `## Contrast`: computed WCAG ratio for every text/background pair used, light and dark.
  - `## Open questions`: geometry proposals and unconfirmed brand choices.

```yaml
---
version: alpha
name: Example Stays
description: Quiet premium hospitality — near-black ink on warm white, one deep-green accent on booking actions only.
colors:
  ink-900: "#141414"
  green-800: "#1f3d2e"
  text-title: "{colors.ink-900}"
  active: "{colors.green-800}"
typography:
  h1: { fontFamily: "Inter", fontSize: 48px, fontWeight: 600, lineHeight: 1.2, letterSpacing: -0.02em }
rounded: { s: 4px, m: 8px, l: 16px, full: 999px }
spacing: { m: 16px, section: 96px, gutter: 24px, margin: 72px }
components:
  button-primary: { backgroundColor: "{colors.primary}", textColor: "#ffffff", rounded: "{rounded.full}", padding: 12px 24px }
---
```

### 5. Show the user (interactive stop)
Show screenshots of home and one inner page with the skins on, next to the reference
screenshots, plus the palette, type table and the system qualities from `design.md`. Get the
palette and fonts approved before polishing component skins.

### 6. Implement: `wireframe/tokens.py`, then the skins (`base.css`, `components.css`, `assets/sections/*.css`)
1. `tokens.py` (run `python wireframe/tokens.py` after every change — never edit `assets/tokens.css`):
   - Brand: `T.brand(...)` with the approved hues; Bricks generates `-l-1…4` / `-d-1…4` (hover = `-d-1`).
   - Theme roles: light **and** dark value per role. A role points at a Brand / Neutral colour
     (`("active", "var(--secondary)", "#515154")`) or holds a literal; never at another role.
   - Fonts category (families, weights, tracking); scale settings (base + ratios fitted in step 3);
     radius, shadows (dark overrides in `T.theme_style`), gradients; component variables (`--btn-*`…).
   - Default mode `auto` when the site gets a dark theme (dark values are then mandatory and checked
     in the contrast scan).
2. `assets/base.css` (theme style): `@font-face` rules (self-hosted woff2) and theme typography;
   `assets/components.css`: surfaces and component skins; `assets/sections/<layout>.css`:
   section-specific looks.
3. Surfaces: `[data-surface="…"]` rules set `background` (a `--bg-*` role), `color` (a `--text-*`
   role) and re-point the tokens components read (`--btn-bg`, `--text-eyebrow`, `--photo-bg`…). Never
   `[data-surface="x"] .w-button-primary`.
4. Component skins: on the components' own classes in `components.css` — `.w-button-primary`,
   `.w-button-secondary`, `.w-card-post__title`, a project card's elements — and section looks on the
   section's own classes (`.w-ledger__row`, `.w-header__link`, `.w-footer__menu-link`) in its file:
   colour, type, radius and shadow only, all through tokens. No tag selectors outside `base.css`, no
   `[data-layout="x"] …`; a component that must look different in one section gets
   `.w-closing .w-button-primary` in `assets/sections/closing.css` (the one allowed cross-block form) or
   a component modifier. `bem_lint --prefix w-` must stay at 0 errors.

Lessons from earlier runs:
- **Accent on buttons only:** selected states (chips, steps, picked dates, tabs, plan cells) read
  `--active`; buttons read the component variables `--btn-bg` / `--btn-bg-hover`. Point the button
  variables at `--primary` / `--primary-d-1` and keep `--active` neutral (e.g. `var(--secondary)`);
  otherwise the accent leaks into every selected state. Accent text and outlines use `--accent`.
- **Borrowed hue, own contrast:** a brand hue the user names (e.g. "pink like Airbnb", #FF385C) can fail
  white button text (3.5 : 1). Keep the hue, deepen it until white text is ≥ 4.5 : 1 (#E0174F, 4.8 : 1)
  and record the original as an open question. Check the generated `-d-1` hover too.
- **Translucent hairlines and fills** come from the Neutrals ramps (`--dark-5`, `--dark-10` flip with the
  theme; `--all-light-20` stays white on night bands and photos) or a Theme role literal
  (`("border-light", "rgba(0, 0, 0, .12)", "rgba(255, 255, 255, .14)")`) — never `color-mix()` chains.
- **One colour per text role:** a client asking to recolour eyebrows only must change one Theme row
  (`--text-eyebrow`); a role borrowing another role's token forces a second change everywhere.
- **Borders → transparent, not 0:** cards that float on shadows keep `border-color: transparent` so the
  box size, and the structure snapshot, stay identical.
- `handoff.py` writes `wireframe/handoff/figma.json`; run it only for the Figma handoff (step 8).
  `tokens.py` writes `handoff/bricks-tokens.json` on every run (the Bricks import, skill `bricks-bem-html`).

Set `"style": true` in `site.config.json` (the css stack stays tokens.css → base.css → components.css →
sections.css; no extra stylesheet). `build.py` then marks pages `<html data-style="on">`, and the probe
enforces grayscale on `.w-photo` only. The `qa.py` contract applies: tokens only from tokens.css, type
through the scale + line-height steps, `@media` at the Bricks breakpoints, no text in `content:`,
spacing literals on the 4 px grid.

### 7. Verify (all must pass, report the numbers)
- **Gate A:** `python wireframe/qa.py` exits 0 with no warnings.
- **Gate B:** every page × 390 / 768 / 1440 / 1512. The probe is `ok`: `typeGrid` is empty and
  `headings` is clean. New fonts change line breaks, so re-glue headings per phase-5 rule 9 in
  the content/data source, then rebuild.
- **Structure unchanged:** the same visible-element count and section sequence before and after the
  refine, on every page at 1440 and 390. Record `snap()` on the grayscale build before step 6, run it
  again after, and compare:
  ```js
  const snap = () => ({ sections: [...document.querySelectorAll("body > section[data-layout]")].map(s => s.id + ":" + s.dataset.layout).join(","),
    visible: [...document.querySelectorAll("body *")].filter(e => e.getClientRects().length).length });
  JSON.stringify(snap());   // before === after, per page and width
  ```
- **Contrast:** at least 4.5 : 1 for text, 3 : 1 for text ≥ 24 px (or ≥ 19 px bold), measured on
  every page, in light and (when the default mode allows it) dark — toggle `html[data-brx-theme]`.
  Take each visible text element's colour against the first non-transparent background up its
  ancestor chain.
- **Header breakpoint:** new fonts change the nav width, and Gate B widths (1440 / 1512) miss the band
  just above the menu breakpoint. Measure the header bar's visible content at 1600 px and check
  `need + 2 × --container-padding` against the breakpoint; when it no longer fits move the menu
  button to the laptop breakpoint (1279, present on every site) or add another custom Bricks
  breakpoint in `tokens.py` `T.breakpoints`, then check the header at breakpoint + 1 px.
- **Bricks parity (when WordPress is available):** `bricks-bem-html/scripts/bricks_tokens_verify.php
  wireframe/handoff/bricks-tokens.json` reports 0 mismatches.
- **Design review:** compare side by side with the reference. Check that the system qualities from
  step 2 are visible, the measured accent usage is comparable (count accent-coloured interactive
  elements per page), the brief adjectives read true, and no reference brand asset was copied.

### 8. Handoff to Figma (when asked)
```bash
python wireframe/build.py --final && python wireframe/handoff.py
```
`wireframe/handoff/figma.json` carries the tokens (incl. this phase's palette, fonts, shadows),
pages, UI states and chrome. Continue with the html-to-figma skill:
`init_project.py --project . --from-wireframe wireframe`. Install the fonts from `design.md` in
Figma first.

## Gate
- Reference captured: probe JSON and screenshots in `research/style/`.
- `design.md` complete: front matter, findings with numbers, adaptation, token map, contrast table.
- Palette and fonts approved by the user (interactive run).
- `tokens.py` and the skins (`base.css`, `components.css`, `assets/sections/*.css`) only inside the boundary; Gates A and B pass; structure snapshot
  identical; contrast scan clean.
