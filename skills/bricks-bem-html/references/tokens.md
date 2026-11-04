# Tokens in Bricks' Style Manager

The token system is learned from Core Framework (CF) but built on Bricks' own theme management — no CF plugin.
One spec file per project (`tokens.py`, `scripts/tokens_builder.py`) generates both the CSS a mockup loads
(`tokens.css`, identical to what Bricks prints) and the data written into Bricks (`tokens.json`), so the mockup,
the classes and the site always share names and values. Values that Bricks generates (scale steps, colour shades)
are computed with Bricks' own maths (PHP ports in `tokens_builder.py`) and checked with
`scripts/bricks_tokens_verify.php`.

## Settings (Style Manager)

| Setting | Value | Why |
| --- | --- | --- |
| HTML font size | `62.5%` → 1rem = 10px | CF convention; generated scale values are rem |
| Min / max screen width | `320` / `1440` | the range every fluid token interpolates over |
| Default mode | `auto` (dark theme) or `light` | dark values print under `:root[data-brx-theme="dark"]`, choice stored in `localStorage "brx_mode"` |
| Breakpoints | desktop-first `max-width` 991 / 767 / 478 (Bricks defaults) + custom ones only when measured (e.g. `laptop` 1279 where a header nav stops fitting) | class CSS uses exactly these; `min-width` = width + 1 |

## Naming (Core Framework style)

The name says the role; the kind is told by the family. Classes read roles first, ramps second, brand last.

| Family | Tokens | Style Manager |
| --- | --- | --- |
| Brand | `--primary`, `--secondary`, `--tertiary` + Bricks shades `-l-1…4` (towards white) / `-d-1…4` (towards black) | Colors › palette "… · Brand" (shades generated, grouped under their base) |
| Neutral ramps | `--light`, `--dark` (+ `-5 / -10 / -20 … -90` alpha) **swap in dark mode**; `--all-light`, `--all-dark` (+ alpha) **never swap** (text/overlays on photos and night bands) | Colors › palette "… · Neutrals" |
| Theme roles (light + dark value) | backgrounds `--bg-body`, `--bg-surface`, `--bg-surface-2/-3`, `--bg-base`, `--bg-accent`…; text `--text-title`, `--text-body`, `--text-body-dark` (muted), `--text-eyebrow`, `--text-contrast`, `--accent`; borders `--border-subtle/-light/-dark/-strong`; interaction `--active`, `--active-hover`, `--hover`, `--focus`; status `--success`, `--error` (+`-bg`) | Colors › palette "… · Theme" |
| Font sizes | `--text-xs … --text-6xl` (scale, baseline `m`) | Typography scale, prefix `text-` |
| Spacing | `--space-3xs … --space-5xl` (scale, baseline `m`) | Spacing scale, prefix `space-` |
| Line heights | `--line-height-xs` 1 · `s` 1.2 · `m` 1.3 · `l` 1.4 · `xl` 1.5 (unitless, pair with any size) | Variables › Line heights |
| Fonts | `--font-family[-display\|-mono]`, `--font-weight-body/strong/heading`, `--letter-spacing-*` | Variables › Fonts |
| Layout | `--layout-wrap`, `--layout-margin`, `--layout-gutter`, `--layout-section-pad` (fluid), `--columns-N` (`repeat(N, minmax(0, 1fr))`) | Variables › Layout |
| Radius / strokes / shadows / effects | `--radius-*`, `--stroke[-strong\|-subtle]` (`1px solid <border role>`), `--shadow-m/-l/-xl`, `--gradient-*`, `--icon-*` | Variables categories |
| Component variables | `--btn-bg`, `--ph-bg`, `--surface-link`… — defaults point at roles; a `[data-surface]` may re-point them | Variables › Components |

Rules:
- **`text-` has two meanings, never mixed:** `--text-xs…6xl` are sizes; `--text-title/body/body-dark/eyebrow/contrast`
  are colours. No size token named after a role (`--text-body: 16px` is a bug).
- **One colour per text role.** Eyebrows read `--text-eyebrow`, captions their own role, etc. A role never borrows
  another role's token, so a designer changes one role without moving the others.
- Theme roles point at Brand / Neutral colours (`var(--primary-d-1)`) or hold literals — never at another role.
- Every token has a value in tokens.css; no `var(--x, fallback)`. Dark mode changes token values only; class CSS
  has no dark selectors except documented per-element tweaks.
- Variables have no dark value in Bricks: dark overrides of non-colour tokens (shadows) go into ONE theme-style
  rule `:root[data-brx-theme="dark"] { --shadow-…: …; }` (`themeStyleCss`).

## Scales: base × ratio, not hand-picked steps

Like CF, each scale is a base size and a ratio at both ends of the screen range; step n = base × ratio^n,
fluid between 320 and 1440 px, in Bricks' format
`clamp(MIN, calc(slope * (100vw - 32rem) + MIN), MAX)`. Change one number, the whole scale moves — and Style
Manager › Generate variables produces the same values (category `scale.isManual: false`).

| Scale | Default | Notes |
| --- | --- | --- |
| Font sizes | base 16 / 16, ratio 1.125 @320 / 1.2 @1440, steps `xs … 6xl` | negative steps (`xs`, `s`) end up with MIN > MAX: CSS clamp() returns MIN, so they stay fixed (12.6 / 14.2 px) — same in CF and Bricks |
| Spacing | base 16 / 16, ratio 1.414, steps `3xs … 5xl` (4 · 5.7 · 8 · 11.3 · 16 · 22.6 · 32 · 45 · 64 · 90 · 128) | fixed rhythm; make it fluid with a larger max base (CF default 16 → 28) |

Map design roles onto steps once (h2 → `4xl`, lede → `l`, eyebrow → `xs` …) and keep the map in the project's
token doc. Sizes above the scale (display numerals, wordmarks) are named variables with `T.fluid(min, max)`.

## Spec → tokens.css + tokens.json

```python
import sys; sys.path.insert(0, "<dir of tokens_builder.py>")   # vendored next to the spec in a wireframe project
from tokens_builder import Tokens
T = Tokens()
T.style_manager(htmlFontSize="62.5%", minScreenWidth=320, maxScreenWidth=1440, defaultMode="auto")
T.breakpoints([("laptop", "Laptop", 1279, True), ("tablet_portrait", "Tablet portrait", 991, False),
               ("mobile_landscape", "Mobile landscape", 767, False), ("mobile_portrait", "Mobile portrait", 478, False)])
T.brand("Site · Brand", [("primary", "#E0174F", {"light": 4, "dark": 4}), ("secondary", "#1D1D1F", {"light": 4, "dark": 4}), ("tertiary", "#F5F5F7")])
T.neutrals("Site · Neutrals")
T.palette("Site · Theme", [("bg-body", "#FFFFFF", "#121214"), ("text-title", "var(--secondary)", "#F5F5F7"),
                           ("text-eyebrow", "#6E6E73", "#A1A1A6"), ("accent", "var(--primary-d-1)", "var(--primary-l-2)"), ...])
T.ratio_scale("fsz", "Font sizes", "typography", "text-", ["xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl", "5xl", "6xl"], "m", (16, 16), (1.125, 1.2))
T.ratio_scale("spc", "Spacing", "spacing", "space-", ["3xs", "2xs", "xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl", "5xl"], "m", (16, 16), (1.414, 1.414))
T.category("lhe", "Line heights", [("line-height-xs", "1"), ("line-height-s", "1.2"), ("line-height-m", "1.3"), ("line-height-l", "1.4"), ("line-height-xl", "1.5")])
T.category("lay", "Layout", [("layout-wrap", "1368px"), ("layout-margin", T.fluid(16, 72)), ("columns-3", "repeat(3, minmax(0, 1fr))"), ...])
T.theme_style('html { font-size: 62.5%; }\n:root[data-brx-theme="dark"] { color-scheme: dark; --shadow-m: …; }')
T.write("handoff/tokens.json", css="assets/tokens.css")
```

`write()` refuses duplicate names and `var()` references to undefined tokens. Order of calls = order in the
Style Manager. `scale()` (manual steps) stays available for sites whose steps were hand-picked.

## Apply to Bricks

```
studio wp eval-file <skill>/scripts/bricks_tokens_apply.php tokens.json <backupDir> dry   # report only
studio wp eval-file <skill>/scripts/bricks_tokens_apply.php tokens.json <backupDir>
studio wp eval-file <skill>/scripts/bricks_tokens_verify.php tokens.json                  # 0 mismatch(es)
```

The applier treats the spec as the complete token set. It aborts before writing when a name appears twice
(palette + variable), when a token that exists today is missing from the spec (list deliberate removals in `drop`),
or when a dropped token is still referenced. It keeps ids by name, writes brand shades as real Bricks shades
(`type`, `parent`, `index` — grouped under their base colour), backs up the four options and regenerates
`style-manager.min.css`. It prints the two manual steps: `breakpoints` (Bricks › Settings › Breakpoints, skill
`bricks-breakpoints`) and `themeStyleCss` (site-wide theme style, conditions `any`, Custom CSS).

With abilities instead: `set-style-manager` → palettes (`create-color` with `raw: var(--name)`, shades via
`generate-color-shades`, light + dark) → scale categories via `generate-scale-variables` (compare with the spec)
→ `set-global-variables` for the other categories.

Verify with a full-page pixel diff (light + dark, desktop + mobile, open menus/dialogs) against the mockup.

## Dark mode
- Colour tokens carry their dark value in the Color Manager; Bricks prints them under
  `:root[data-brx-theme="dark"]` and its head script sets `data-brx-theme` before paint from
  `localStorage.brx_mode`, else the Style Manager default mode (`auto` = follow the OS).
- A site switch writes the same key and attribute (`brx_mode`, `data-brx-theme`); no second head script.
  A mockup uses the same key and attribute, so its switch works unchanged on the site.

## Renaming tokens on a live site
Values and ids stay; only names change, everywhere at once, in ONE pass per source:
1. `{"old": "new"}` map without `--` (chains are fine in one pass; never rename sequentially). Moving a site from
   the older `--color-*` / `--text-<role>` naming: semantic `color-text-default` → `text-title`,
   `color-text-muted` → `text-body-dark`, `color-bg-page` → `bg-body`, `color-bg-subtle` → `bg-surface-2`,
   `color-bg-inverse` → `bg-base`, `color-border-default` → `border-light`, `color-action-primary` → `active`,
   `color-paper*` → `all-light*`, `color-ink*` → `all-dark*`; size roles → scale steps
   (`text-body` → `text-m`, `text-lede` → `text-l`, `text-h2` → `text-4xl` …); `line-height-<role>` → unitless
   steps; `border-line/soft/hair` → `stroke-strong/stroke/stroke-subtle`; `shadow-card/raised/overlay` →
   `shadow-m/l/xl`. Size and line-height renames change values (fluid scale) — pixel-diff and review.
2. Screenshot baseline of every page/state.
3. Bricks data: `studio wp eval-file SK/bricks_token_rename.php map.json <backupDir> [dry]` —
   variables, palettes (raw/light/dark), classes, theme styles, components, every document
   (Save_Pipeline). Refuses to run twice (a target name already exists).
4. Files: `python SK/token_rename.py map.json <plugin/theme dirs> <spec files> [--dry]` (whole names
   only; skips vendor/node_modules/*.min.*); review the dry run for names used as CLI flags/prose.
5. Tokens spec → re-apply `bricks_tokens_apply.php` (it must report no missing name), regenerate every area spec
   and compare its class CSS with the site (0 differences), then pixel-diff and run the plugin tests.

## Gotchas
- `htmlFontSize` must be set. Without it the scale generator assumes 10px and the mockup (16px root) and the
  site disagree. With `62.5%` every non-token `rem` in class CSS is 10px — write px or tokens.
- Scale members keep the exact values from the spec; with `isManual: false` "Generate variables" reproduces them
  (verify script = 0 mismatches). Changing min/max screen width or the html font size regenerates every step.
- The Color Manager's "Enable dark mode" toggle reads `darkModeEnabled`; a colour with only a `dark` value works on
  the frontend but shows the toggle off (the applier sets both).
- Brand shade maths: `-l-N` / `-d-N` = mix towards white / black at (steps − i) / (steps + 1) — 4 steps give 80 /
  60 / 40 / 20 % of the colour. A hover that must match an existing hex exactly is a Theme role with a literal.
- WP-CLI rejects unknown `--flags` after `eval-file`; pass plain words (`dry`).
- A framework plugin that syncs into Bricks (Core Framework) writes classes/variables straight into these options
  and shadows site tokens with the same names (`--primary`, `--text-m`, `--space-m`). This system replaces it:
  uninstall the plugin (delete-data on) and remove what it leaves after a usage check.
