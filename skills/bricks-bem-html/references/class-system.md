# Class system (`w-`) — sections, components, layout

The owner's convention for every Bricks site and every mockup built for one. It refines the BEM rules of
`SKILL.md`; where they differ, this file wins.

## 1. Prefix
Every class starts with `w-` — sections, their elements, components, modifiers — in every project.
Exempt: state classes `is-*` / `has-*`, Bricks / WordPress internals (`brxe-*`, `bricks-*`, `wp-*`).
`bem_lint.py --prefix w-` enforces it.

## 2. Sections own their names
- Each section is its own block named after what it is: `w-about`, `w-home-hero`, `w-stay-catalogue`.
  Everything inside follows BEM from that block: `w-about__container`, `w-about__heading-container`,
  `w-about__eyebrow`, `w-about__heading`, `w-about__grid`, `w-about__card-list`.
- **No class shared by several sections** — no `.section`, `.wrap`, `.container`, `.cols`, `.span-6`,
  `.grid`, `.row`, `.stack`, `.split`. Each section's grid / gap / padding lives in its own classes.
- Vertical padding of a section lives on the section class (`.w-about { padding-block: var(--space-3xl); }`).

## 3. Components are the only reused classes
Something repeated on a page or across pages (and smaller than a section) is a **Bricks Component**
with its own block, reused as-is:

| Group | Classes |
| --- | --- |
| Type | `w-heading-2xl` (display) · `w-heading-xl` (h1) · `w-heading-l` (h2) · `w-heading-m` (h3) · `w-heading-s` (h4) — sizes from the `--text-*` scale, independent of the h-level; `w-text-l` (lede) · `w-text-m` (body) · `w-text-s` (small); `w-eyebrow` |
| Buttons | one class per button type, not modifiers: `w-button-primary`, `w-button-secondary`, `w-button-text`, (+ project types such as `w-button-pill`, `w-button-icon`) |
| Cards | `w-card-blog`, `w-card-service`, `w-card-product`, `w-card-stay` … with BEM elements (`w-card-stay__title`) and modifiers (`w-card-stay--compact`) |
| Widgets | `w-icon`, `w-photo`, `w-slider`, `w-accordion`, `w-tabs`, `w-chip`, `w-field`, `w-breadcrumb` … |

A component instance inside a section keeps only its component class(es). It does **not** get a
section element class mixed in (Bricks component hosts cannot carry classes).
The mockup keeps component classes in one stylesheet marked `/* bem-lint: components */`, so
`bem_lint.py` treats them as reusable even without `data-component` (no `shared-block` warning).

### Section-specific look of a component — the one allowed cross-block selector
```css
/* in the section's own CSS — Bricks: Custom CSS of the .w-about section element */
.w-about .w-heading-m { max-width: 18ch; }
```
- Exactly two compounds: the **section block** (no element / modifier / state) + descendant + a
  **component class** (block, element or modifier of one component, optional pseudo-class).
- Written only in that section's CSS (mockup: the section's block in `site.css` / its section file).
- Anything else crossing blocks (`.w-card-stay .w-button-primary`, `.w-about__grid .w-heading-m`,
  `.w-about .w-about__x .w-heading-m`) stays forbidden. `bem_lint.py` reports it as `cross-block`.

## 4. Bricks element types in the mockup (`data-brx`)
The HTML says which Bricks element each box becomes; the mockup's base CSS reproduces Bricks' own
defaults and the theme style for these attributes, so the page renders like Bricks before import.

| `data-brx` | Bricks element | Default (Bricks frontend CSS, reproduced in the mockup base) |
| --- | --- | --- |
| `section` | Section | `display:flex; flex-direction:column; align-items:center; width:100%; margin-inline:auto` |
| `container` | Container | `display:flex; flex-direction:column; align-items:flex-start; margin-inline:auto;` + theme style `width: var(--max-screen-width); padding-inline: var(--container-padding)` (border-box, max-width 100%) |
| `block` | Block | `display:flex; flex-direction:column; align-items:flex-start; width:100%` |
| `div` | Div | `display:block` |

All four wrap at ≤ 767 px like Bricks (`flex-wrap: wrap`). Elements without `data-brx` map by tag:
`h1–h6` → Heading, `p` → Basic text (rich text in `.w-prose`-style blocks → Rich text), `a` → Text link
(or Button for `w-button-*`), `button` → Button / Div with tag button, `img` → Image, inline SVG icon →
SVG / Icon element, `ul/ol/li` → Div / Block with that tag, `form` → Form or a plugin widget.

Structure: **Section > Container > Block/Div …** — the section's direct children are containers; the
section is the largest element of a page. The container never gets layout from a shared class: width
and side padding come from the theme style, anything else from the section's own element class
(`w-about__container`).

## 5. Layout
| Need | Use |
| --- | --- |
| 2 or more columns (always for equal columns) | **Grid** on the parent: `grid-template-columns: var(--columns-3)`; unequal columns as fractions on the parent — `minmax(0, 7fr) minmax(0, 5fr)`; children need no width |
| one column | **Flex column** |
| inline sequences (buttons, chips, meta, icon + text, nav) | **Flex row** where it fits the case (wrap allowed) — not banned |

Column ceilings: desktop ≤ 5 · laptop (≤ 1279) ≤ 5 · tablet (≤ 991) ≤ 3 · mobile landscape (≤ 767) ≤ 3 ·
mobile portrait (≤ 478) ≤ 2, prefer 1.

## 6. Breakpoints
Bricks breakpoints on every site: **desktop** (base) · **laptop 1279 (custom, always added)** · tablet
portrait 991 · mobile landscape 767 · mobile portrait 478. `@media (max-width: N)` with exactly these
widths, `min-width` = N + 1. Mobile landscape normally repeats the tablet values.

## 7. Container token
`--max-screen-width` (1440 px, per project) and `--container-padding` (fluid 16 → 40 px over 320 → 1440)
are variables in the Style Manager (`references/tokens.md`); the theme style's Container settings read
them. Sections never set container width or side padding.

## 8. Sections reused on several pages = Bricks templates
A section repeated across pages is a **Bricks template (type Section)**:

| Same … | Mockup marks the `<section>` with | In Bricks |
| --- | --- | --- |
| structure **and** content | `data-brx-template="CTA band" data-brx-template-mode="element"` | a **Template element** pointing at the template — edit once, every page follows |
| structure, different content | `data-brx-template="Page title" data-brx-template-mode="insert"` | **insert** the template into the page, then edit its content there; classes stay identical |

Every section with the same template name has the same class structure (qa checks it); mode `element`
also needs identical content.

## 9. Checklist per section
- [ ] `<section class="w-x" data-brx="section">`; direct children `data-brx="container"` with `w-x__container`.
- [ ] Every element has a `w-x__…` class or a component class; no shared layout class.
- [ ] Grid for ≥ 2 columns (fractions on the parent), flex column for one, flex row for inline runs.
- [ ] Column ceilings per breakpoint; `@media` only at 1279 / 991 / 767 / 478.
- [ ] Section-specific component looks only as `.w-x .w-component` in the section's CSS.
- [ ] Repeated across pages → `data-brx-template` + mode.
