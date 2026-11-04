# Design rules

## Variables (created by `build/foundations.js` from `tokens.json`)

| Collection | Variables | Notes |
|---|---|---|
| Primitives | raw palette `neutral/900`, `brand/700`, `white/76`… | hidden from pickers (`scopes = []`); change these to re-theme |
| Color | semantic `text/*`, `bg/*`, `border/*`, `action/*`, `accent/*`, `image/*`, `status/*` | aliases of primitives; scoped (text → TEXT_FILL, bg → fills, border → strokes) |
| Spacing | `space/4…128`, `radius/sm|md|lg|full`, `layout/page|container|gutter|margin`, `layout/col-1…12` | gaps/paddings bound to `space/*`; widths of column spans bound to `layout/col-N` |
| Typography | `font/heading`, `font/body` (STRING, FONT_FAMILY scope); `type/<style>/size|line` (FLOAT) for styles with mobile sizes | modes Desktop / Mobile (Mobile only when tokens define mobile sizes or `gridMobile`) |

Layers only ever use **semantic** colour tokens. `foundations.js` upserts by name (ids stay, bindings follow
new values); it reports `stale` variables instead of deleting them.

Font switch: change `font/heading` or `font/body` in the Variables panel → every bound text style updates.
The new family must contain the style names the type scale uses (e.g. "Semi Bold" vs "SemiBold" differ per
family) — check before switching, or adjust `tokens.json → type` and re-run foundations.

Effect styles (`Shadow/*`) and gradient paint styles (`Gradient/*`) come from `tokens.json → effects/gradients`:
site box-shadows and linear-gradients map to them (`elevate()`, `gradient()`), never to raw effects on layers.

Responsive type: the same style names everywhere; a mobile frame carries the Typography mode "Mobile", so
`Heading/H1` renders at its mobile size there. Components made for mobile set that mode on themselves so they
preview correctly on the Components page.

## Text styles

Names `Group/Name` (`Heading/H2`, `Body/MD`, `Label/Button LG`). The template scale covers display, H1–H6,
body XL–Micro, titles, labels, button, field, stat, wordmark — keep the names lib/kit/core use, change values.
Line heights are pixel values on the 4px grid. Bold/link runs inside a paragraph: range overrides
(`setRangeTextStyleIdAsync` with a style, or `text(…, {link})`), never a second text node per run.

## Grid and widths

Desktop frame 1512 wide (`layout/page`), container 1368 (`layout/container`) centred, 72 margins.
12 columns of 92 with 24 gutters: `span(n) = 116n − 24`.

| Columns | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Width | 92 | 208 | 324 | 440 | 556 | 672 | 788 | 904 | 1020 | 1136 | 1252 | 1368 |

- Size blocks by spans; an empty column between blocks = `main: "between"` or one extra gutter+column of gap.
- HTML fractions map to spans: `1fr 1fr` → 6/6, `4fr 8fr` → 4/8, `5fr 7fr` → 5/7, 3 cards → 4/4/4,
  4 cards → 3/3/3/3. Report the difference when the HTML gap was larger than 24.
- Full-bleed media (hero photos) use `w: "fill"` on the 1512 section via `section(…, bleed)`.
- The layout grid style `Desktop/12 columns · 1368` is applied to every page frame.
- Max-width that cannot sit on the 4px grid with 12 columns (e.g. 1366): ask the user — offer the nearest
  valid container (1368) vs. exact width with fractional columns.
- Mobile frames (on request): 440 wide (Figma preset iPhone 16 & 17 Pro Max), grid style `Mobile/4 columns · 440`
  (stretch, margins = the site's mobile side padding); sections via `msection()`, content `w: "fill"`.

## Auto Layout

- Every frame, component and set: `layoutMode` HORIZONTAL or VERTICAL (`frame()` guarantees it).
- Never: `figma.group`, absolute positioning, `layoutPositioning = "ABSOLUTE"`, GRID layout mode,
  rectangles/lines as dividers (use strokes on one side: `stroke: {color, sides: ["top"]}`).
- Overlays (text on a photo): kit `overlay()` — the photo is the frame's fill, the text is a child (see Images).
- Diagonal/skewed/tilted decoration in the HTML → keep the tilt with kit `tilt(node, cssDeg)` (rotation inside auto
  layout; the parent lays out the rotated bounding box). Staggered or overlapping positions (polaroid boards, photo
  clusters) → fixed-size slot frames (widths/heights are free numbers, spacing stays on tokens) with the item aligned
  inside; a slot smaller than its item without clipping lets neighbours overlap. Decorative lines (dashed routes,
  waves) → rasterise the site's SVG to `assets/decor--*.png` and use it as the fill of the overlay frame the items
  sit on. Report every such choice.
- Masks and fades (marquee edges, scrolling photo walls): kit `edgeFade(area, {axis, size | ratio, mode, color})`
  after layout (`AFTER_LAYOUT.push(...)` in BUILD; directly after finalize in component defs). `mode: "alpha"`
  fades text to transparent (CSS mask-image); `mode: "overlay"` lays a band-coloured gradient over photos (CSS
  ::before/::after fade). The gradient is computed from current positions: rebuild after moving items.
- Running marquees: show 2–3 copies in a clipped row (middle copy centred) + edge fade.
- Hairlines do not count in layout (`strokesIncludedInLayout = false`), so heights stay on the 4px grid.
- Section heights and page frame heights must be multiples of 4 (mixed font baselines can add 1px — pin the height).

## Naming

- Frames by role: `Hero`, `Heading column`, `Actions`, `Card · <title>`, `Row · <label>`, `Q · <question>`.
- Text by role: `Title`, `Lede`, `Eyebrow`, `Description`, `Label` — never `Text`.
- Instances: the component's role or content (`Primary action`, `Image · Hero image`, `Tab · Foam core`).
- Section frame names describe the content (`FAQ`, `Care areas`); the layout key lives in plugin data.
- Page frames: `<Page name> — Desktop 1512`, mobile `<Page name> — iPhone 16 & 17 Pro Max`; UI states as
  `<Page> · <state>` (`Book · … · 2 Payment`, `My account · Coupons`). Figma pages: one per site page (fresh file) or
  the team's own (keep frames where the team moved them — rebuilds replace in place).

## Components

- Built from `COMPONENT_DEFS` on the **Components** page; names `Area/Name` (`Form/Field`, `Card/Product`).
- Variants named `Prop=Value, Prop=Value`; sets laid out with auto layout (`variantSet`).
- Every text a page changes is a TEXT property; optional parts are BOOLEAN properties; images and links inside
  are exposed nested instances (`isExposedInstance = true`) set with `nested()`.
- Light/Dark themes as a `Theme` variant when a component appears on dark surfaces.
- Rebuilding never deletes first (`buildComponents` swaps every instance to the new definition).
- Core set (template `00-core.js`): Button, Link/Arrow, Icon/Arrow circle, Image/Placeholder, Brand/Logo,
  Nav/Item, Breadcrumb/Item, Accordion/Item, Form/Field, Form/Checkbox, Form/Radio, Tag, Tab/Underline;
  `90-chrome.js`: Header, Footer.

## Images

- One component: `Image/Placeholder` (caption text + `Show caption`). `media()` creates an instance named
  `Image · <name>`; a real photo becomes the instance fill (FILL = cover, FIT = contain on `bg/surface`),
  caption hidden. Designers swap a photo: select instance → Fill → image.
- Content on top of a photo (hero text, tile titles, card badges, map pins): kit `overlay(name, m, o, kids)` → an
  auto-layout frame named `Image · <name>` whose fill is the photo (+ optional scrim token); the audit accepts image
  fills only on `Image/Placeholder` instances and on these frames. Inside a component the same frame works; pages
  override its fill.
- Cards with photos nest an exposed `Image` instance of `Image/Placeholder` (or an `Image · Photo` frame for
  overlays) with a locked aspect ratio, so any card width keeps 4:3 / 16:9.
- Assets: `figma-bridge/assets/<name>.jpg|png` (`convert_images.py`), `<name>` = path below `assets/` joined with
  `--` (gallery photos share file names); EXTRACT returns these names via `mediaOf()`.
- Logos/icons that are SVG: real vectors — `H.harvestIcons` for icon sets, kit `svgArt()` for logos — flattened into
  one vector per component (multi-colour regions survive flattening), never redrawn by hand, never rasters.

## Fidelity checklist per section

Content complete (all visible text, in order) · hierarchy (text styles match sizes/weights) · proportions
(spans) · surface colour · images in the right slots · interactive widgets in their default rendered state
(first tab active, accordions as rendered, hidden panels skipped) · dark surfaces use `text/on-dark*` and
Theme=Dark buttons.
