# BEM rules — patterns and conversions

Examples come from a real header converted from "classes on some elements, CSS in parents
and section attributes" to BEM; the result rendered pixel-identical in 7 UI states.

## Naming

| Part | Form | Example |
| --- | --- | --- |
| Section block | `w-` + what the section is | `w-about`, `w-home-hero`, `w-stay-catalogue` |
| Component block | `w-` + group + kind | `w-button-primary`, `w-card-stay`, `w-heading-m`, `w-header` |
| Element | `block__part` (one level, never `block__a__b`) | `w-about__heading`, `w-card-stay__title` |
| Modifier | `block--variant`, `block__part--variant` | `w-card-stay--compact`, `w-tabs__item--small` |
| State | `is-*` / `has-*` (toggled by JS or server) | `is-open`, `is-active`, `has-error` |

- Every class starts with `w-` (`references/class-system.md`); no class is shared by sections.
- Deep parts flatten: `w-mega__card` → `w-mega__card-media`, `w-mega__card-title` (not `w-mega__card__title`).
- No abbreviations a newcomer cannot read (`co`, `bk`, `dp`, `acc`).
- One concept, one name: do not create `w-btn` and `w-button-primary`.

## Selector patterns

| Need | ❌ Hidden / coupled | ✅ BEM |
| --- | --- | --- |
| Style a child | `.w-breadcrumb a` | `.w-breadcrumb__link` on the `<a>` |
| Section variant | `[data-layout="garden-hero"] h1` | `<section class="w-garden-hero" data-brx="section">` + `.w-garden-hero__title` |
| Shared layout utility | `<div class="wrap"><div class="cols"><div class="span-7">` | `w-about__container` (data-brx container) › `w-about__grid { grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); }` |
| Component look inside one section | `.w-closing-card .w-button-primary` | in the section's CSS: `.w-closing-band .w-button-primary { … }` (bare section class + component, nothing else) |
| Component placed by its parent | `.w-about__cta-row .w-button-primary { margin… }` | gap / grid on `.w-about__cta-row`; the button keeps only its own class |
| Dark band | `[data-surface="inverse"] .w-button-primary { background… }` | `[data-surface="inverse"] { --btn-bg: …; }` + `.w-button-primary { background: var(--btn-bg); }` (token defined in tokens.py) |
| Parent state → child | `.w-nav-panel li.is-open > a .w-icon` | `.w-nav-panel__item.is-open > .w-nav-panel__link > .w-nav-panel__caret` (same block) |
| Hover card → child | `.w-card-category:hover .w-card-category__photo` (fine) | keep: same-block context is allowed |
| Size variant of children | `.w-tabs--small > :is(a, button)` | `w-tabs__item--small` modifier on each item |
| Modifier beats modifier | order-dependent | doubled class `%root%%root%` (= `.w-tabs__item--icon.w-tabs__item--icon`) + comment |
| Responsive hide inside a block | `.w-actions .w-cta-label` | `.w-header__actions > .w-header__cta` (same block) |
| Node created by JS | — | `/* bem-lint: allow js-node — overlay from initTyping */ .w-topbar__message > .w-topbar__typing` |

**Specificity:** BEM keeps nearly everything at one class (0,1,0). When a block's own
modifier must beat a base rule from another class on the same element, use the same-block
context or a doubled class — never `!important` (utilities like `visually-hidden` excepted).

## Markup checklist per element

- Has a class from its own block (or is an allowed exception).
- Interactive element is a real `<button type="button">` / `<a href>`; behaviour via `data-*`.
- Icons: in HTML `<i data-icon="name" class="w-icon w-icon--sm">` (name = file in the project's icon
  folder); in Bricks the same icon is an SVG element from the site icon set with the same
  classes. Give icon-specific behaviour its own class (`w-nav__caret`, `w-button-text__icon`) —
  never select by icon name (`.pi-arrow-right`, `a:has(> .icon-x)`): replacing the icon would
  silently change the styling.
- Text that varies per instance of a component carries `data-prop`.
- Rich text you cannot class (CMS content) sits in a prose container (`data-prose`); its tag rules
  live in the base stylesheet (theme style typography / Rich text), never in a component or section.
- Layout boxes carry `data-brx="section|container|block|div"` (`references/class-system.md` §4).

## Empty classes are fine

A class with no CSS yet (`w-nav__label`, `w-button-primary__label`) is a hook: in Bricks the developer
clicks the element and styles that class without hunting for a parent rule. Keep them.

## CSS file layout

```
tokens.css        GENERATED (tokens.py): Style Manager colours + variables + theme-style variables
base.css          /* bem-lint: base */  reset, body, h1–h6, rich text, Bricks element defaults for data-brx + container theme style
components.css    /* bem-lint: components */  one block per component (buttons, type, cards, widgets)
sections/<x>.css  one file per section block: .w-x { } .w-x__y { } .w-x--z { } (+ media/state, + `.w-x .w-component` overrides)
```
In Bricks, `base.css` maps to the theme style, components/sections each become their classes' custom
CSS (`%root%` = the class), section overrides the section element's Custom CSS.

## Lint quick reference

```
python bem_lint.py --base assets/base.css assets/ _pages/ _partials/
python bem_lint.py --skip-class search-form header.css header.html   # skip widget markup
python bem_lint.py --prefix w- assets/ _pages/   # every class starts with w- (is-*/has-*, brxe-*/bricks-*/wp-*/pi-* exempt)
python bem_lint.py --json …   # machine-readable
python bem_lint.py --selftest
```
Rules: `no-class`, `tag-selector`, `hidden-descendant`, `cross-block`, `layout-attr`,
`surface-descendant`, `id-selector`, `no-class-subject`, `modifier-alone`,
`element-outside-block`, `prop-outside-component`, `component-no-block`, `prefix` (with
`--prefix`), `brx-structure` (errors); `orphan-element`, `bem-name`, `important`,
`shared-block` (warnings).
- `cross-block` exception: `.w-about .w-heading-m` — exactly two compounds joined by a space, the
  first a single section block class (block on a `data-brx="section"` element in the linted HTML),
  the second only classes of one other block (+ state classes, pseudos). Three compounds, `>`, an
  element / modifier / state on the first compound or a non-section first block stay errors.
- `brx-structure`: `data-brx` ∈ section|container|block|div; with any `data-brx` in a file every
  `<section>` is `data-brx="section"`; a section's first class is its block, its element children
  are `data-brx="container"` with element classes of that block (`w-x__container`).
- `shared-block`: a non-component block used inside two or more section blocks — only components
  are reused across sections. Components: blocks on / inside a `data-component` element, or blocks
  styled (selector subjects) in a stylesheet whose first comment contains `bem-lint: components`
  (global classes such as `w-heading-*`, `w-text-*`, `w-eyebrow`, `w-icon`). Unlike
  `bem-lint: base`, that marker does not allow tag selectors.
