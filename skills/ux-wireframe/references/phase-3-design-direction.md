# Phase 3 — Design direction → `design-direction.md` + `wireframe/assets/sections/*.css`

The phase that makes the wireframe **this client's** site. Research says *what is true*, the
sitemap *what exists and why*; this phase decides *how each page is composed* and records it
as a named layout catalogue that build and QA enforce. The tooling ships primitives only —
no page compositions. This is where the AI's research and creativity are spent.

## Inputs
- SSOT §1 story, §3 offering, §5 audience, §6 proof, §7 voice, §9 brief quotes
- `sitemap.md` §1–§3 (what each section must achieve)
- Reference sites — opened in a **real browser** at 1440 and 390: first screen, one full
  scroll of home and of one inner page of the same type you are designing
- `references/composition-ideas.md` — read *after* forming your own ideas, to check, not to start

## Steps

### 1. Archetype
Decide from the business model; record it: `python <skill>/scripts/init_wireframe.py . --archetype <name>`

| Archetype | Goal | Implies | Rules out |
| --- | --- | --- | --- |
| `commerce` | sell online | commerce pack, listing/detail/cart, prices | — |
| `brand` | positioning, enquiries, partners | storytelling, proof, guided selection, enquiry & partner funnels | prices, cart, favourites, filter rail as main content, payment chips |
| `service` | book / request a quote | proof, process, team roles, booking | cart, product grids |
| `saas` | trial / demo | product tour, plans, integrations | cart |
| `editorial` | read / subscribe | article rhythm, topic indexes | buy boxes |
| `portfolio` | hire / commission | cases, work index | product grids |
| `nonprofit` | donate / volunteer | cause, impact, action | commerce widgets |

### 2. Reference teardown
One table per reference (client favourite first) — screenshots, not memory:

| Aspect | What it does | Why it reads as <brief adjectives> | Principle we take | What we do NOT copy |
| --- | --- | --- | --- | --- |
| First screen · Navigation · Type & rhythm · Density · Imagery · Proof · Offering presentation · Conversion · Mobile | | | | |

Close with 5–7 **transferable principles**, each tied to a quoted brief line. Add one
**creative stretch**: a principle borrowed from a site *outside* the category (a museum, a
journal, a car configurator…) that serves this brief.

### 3. Constraints and anti-patterns
Quote the brief (wanted adjectives, "must not feel like…", must-haves). List anti-patterns
and why; a listed pattern may only appear where §7 justifies it. Usual suspects outside
commerce: hero carousel, shop-USP announcement bar, search field as header centrepiece,
equal 3-card rows everywhere, boxed stat tiles, bento for its own sake, product grid as the
first thing on a category page, footer payment/USP strips, captions under every image.

### 4. Concept routes → one concept
Sketch **2–3 distinct routes** (name, one-line idea, 3 signature moves, first-screen
description). Score each 1–5 on: brief adjectives · audience tasks · offering truth ·
distinctness from references · build risk. Choose one and record why the others lost.
When interactive, show the routes to the user before committing.

**Signature moves** (3–5) come from the **truth of the offering or the business**, not from
a pattern list. Ask: what is physically or conceptually unique here, and how can a page
*show* it?
- a layered product → an exploded layer explorer; products with sizes → a true-to-scale
  size view; a decision professionals make → a guided chooser; a growth goal → a dedicated
  partner chapter; a process → a timeline the visitor walks through.
For each: where it appears, what it does, which persona, which brief line it answers.
A move must be visible in the wireframe (design review checks it).

### 5. Layout grammar
Grid · type scale (display / h1 / h2 / lede / body, weights) · rhythm (section padding,
separators) · density per page type · image ratios and art direction · bands (surfaces and
their meaning) · motion intent. Write the values into `wireframe/tokens.py` (the one token source,
skill `bricks-bem-html` `references/tokens.md`) and run it — never as `:root` overrides in a stylesheet —
inside the token contract (phase 5), because the same values become the Bricks Style Manager and the
Figma file:
- **Container:** the Bricks theme style, not a class. Every `data-brx="container"` is
  `--max-screen-width` (1440, border-box) wide with `--container-padding` (fluid 16 → 40) sides;
  reading columns cap at `--max-content-width`. Sections never set container width or side padding.
- **Grid:** no 12-column page wrap or span classes — each section owns its grid: CSS grid for ≥ 2
  columns (`grid-template-columns: var(--columns-3)` or fractions `minmax(0, 7fr) minmax(0, 5fr)` on
  the parent), flex column for one column, flex row for inline runs; gaps `--layout-gutter` (fluid
  16 → 32). Column ceilings: desktop ≤ 5 · laptop ≤ 1279 ≤ 5 · tablet ≤ 991 ≤ 3 · mobile landscape
  ≤ 767 ≤ 3 · mobile portrait ≤ 478 ≤ 2 (prefer 1). Prefer fractions of 12 (7/5, 8/4, 3 × 4) so the
  split lands on the Figma grid `handoff.py` derives from the container tokens (1512 frame:
  12 × 84 + 11 × 32, margin 76).
- **Breakpoints:** the Bricks set on every site — laptop 1279 (custom, always), tablet 991, mobile
  landscape 767, mobile portrait 478; no others.
- **Type:** pick the scale (base 16, ratio at 320 and at 1440) so the roles land on steps, then one row
  per role with its step pair and the resulting px:
  | Role | Size / line-height tokens | px @1440 · @390 | Weight | Colour role | Used for |
  | --- | --- | --- | --- | --- | --- |
  | `h1` | `--text-5xl` / `--line-height-s` | 48 · 33 | 600 | `--text-title` | page titles |
  | `w-eyebrow` | `--text-xs` / `--line-height-m` | 12.6 · 12.6 | 600 | `--text-eyebrow` | labels above headings |
  A role whose size sits above the scale gets a named variable (`--numeral-size: T.fluid(56, 96)`);
  a role with its own colour gets its own Theme colour token.
- **Rhythm:** `--layout-section-pad` (fluid) and gaps from the `--space-*` scale
  (`3xs … 5xl` = 4 · 5.7 · 8 · 11.3 · 16 · 22.6 · 32 · 45 · 64 · 90 · 128 with the default ratio √2).
- **Surfaces:** `default` / `subtle` / `inverse` (+ project surfaces) with what each band means.
  A surface sets only `background`, `color` and re-points tokens on the section
  (`[data-surface="inverse"] { --text-eyebrow: var(--all-light-70); --btn-bg: …; }`); components read
  the tokens, never `[data-surface] .x` selectors. No `var(--x, fallback)`.

**Images:** every image slot is a `w-photo` whose text is the full art-direction brief (subject,
role, setting, ratio, light) — it seeds image prompts later. No visible captions or notes.

### 6. Navigation model + IA table
Header behaviour, bar contents and why, primary CTA, menu pattern, mobile pattern, footer.
Then the **IA table**: page · group (audience/task) · header placement · footer column ·
breadcrumb parent. Rules:
- Group by the visitor's role or task, not by page type; a main item with children opens a
  dropdown (title + one-line description) and still links to its overview page.
- Footer columns mirror the header groups, same order and labels.
- One destination, one label; no utility link duplicating a main item.
- Breadcrumb parent = nav group; the highlighted item agrees.
- Utility row = needs of a large audience that are not brand story (where to buy, contact,
  search, language).
- Switch to the menu button at the width where the bar would wrap — **measure it** (5 menus +
  CTA usually need > 1024 px). Dropdowns must stay inside the viewport at every width above it.
- Revisit the table whenever pages are added (`qa.py` warns on unreachable authored pages).

### 7. Page compositions
One table per authored page and one per generated family:

| # | Section (sitemap code) | `data-layout` | Composition 1440 / 390 | Why (persona · goal · brief) | Interaction |
| --- | --- | --- | --- | --- | --- |

Rules: no consecutive repeats; ≥ 60 % distinct layouts per page; home and inner pages differ;
every signature move appears; FAQ/SEO/enquiry blocks get a composition that fits the page;
concept pages carry ≥ 2 layouts that exist only because of this concept. When composition
changes the section list, update sitemap §3 in the same step.

### 8. Layout catalogue (parsed by `qa.py` — keep the heading text)
```markdown
## 8. Layout catalogue
| Layout | Description | Used on | Responsive behaviour |
| --- | --- | --- | --- |
| `ledger` | numbered ruled rows: claim · explanation | wound-care, partners | stacked |
```
Names describe the composition (`ledger`, `sticky-chapters`), never the content. **Each name is
its own BEM block `w-<name>`** (skill `bricks-bem-html`): the section is
`<section class="w-ledger" data-layout="ledger" data-brx="section" …>`, its parts are `w-ledger__row`,
`w-ledger__title`, variants `w-ledger--compact`. Kebab-case, unique, no `__`/`--` in the name; no class
is shared between sections.

### 8b. Markup contract
Exact HTML skeleton + class names per layout. Agents build only from this:
- Section block `<section class="w-<layout>" id="…" data-layout="<layout>" data-surface="…"
  data-brx="section">` › `<div class="w-<layout>__container" data-brx="container">` › elements
  `w-<layout>__<part>` (`data-brx="block"` for a flex-column box, `"div"` for a plain box).
- Every element has its own class (section element or component); global type / `w-photo` /
  `w-icon` classes may sit beside a section element class (`w-about__title w-heading-l`). Rich text
  (articles, legal) sits in one element with `data-prose`; links inside running text and inline
  phrasing need no class.
- Components are the only reused classes. A section-specific look of a component is written once as
  `.w-<layout> .w-<component>` in that section's stylesheet — the one allowed cross-block selector.
- A section repeated across pages is a Bricks Section template: `data-brx-template="Name"` +
  `data-brx-template-mode="element"` (same structure and content) or `"insert"` (same classes, own
  content).
- One stylesheet per layout: `assets/sections/<layout>.css`.

### 8c. Component catalogue (parsed by `qa.py` — keep the heading text)
Every structure used ≥ 2× with only content changing — type styles, **each button type**, cards,
rows, chips, steps, nav links, testimonials — once, as the Bricks/Figma component it becomes. The
shipped catalogue (`assets/components.css` header) gives type `w-heading-2xl/xl/l/m/s`,
`w-text-l/m/s`, `w-eyebrow`; buttons one class per type `w-button-primary/secondary/text/icon`; cards
`w-card-*`; widgets (`w-tag`, `w-accordion`, `w-tabs` …). Project components (a card type, a button
type) are added to `assets/components.css`:
```markdown
### 8c. Component catalogue
| Component | Block + modifiers | Properties (per instance) | Used on |
| --- | --- | --- | --- |
| `Heading: L` | `w-heading-l` | text | section titles |
| `Eyebrow` | `w-eyebrow` | text | section heads |
| `Button: Primary` | `w-button-primary`, `--small`, `--large`, `--block` | label (text), link | header, every closing |
| `Button: Secondary` | `w-button-secondary` | label (text), link | hero, cards |
| `Button: Icon` | `w-button-icon`, `--small` | icon, link, label (aria) | header, sliders |
| `Card: Stay` | `w-card-stay`, `w-card-stay--compact` | image, title, meta, price, link, badge (toggle) | stay-grid, related |
```
Names are `Group: Variant`. Each instance root carries `data-component="Card: Stay"`; each
element whose text / href / image / icon changes carries `data-prop="title"` (ids from the
Properties column). Same item, same block on every page; a different look is a modifier
(`w-card-stay--compact`), never a one-off override. `qa.py` fails a `data-component` missing
here and warns on an unused row.

### 9. Author `tokens.py`, `components.css`, section stylesheets, header, footer
`tokens.py` first (§5 values, component variables with their defaults); project components into
`assets/components.css`; then one `assets/sections/<layout>.css` per catalogue entry: the `.w-<layout>`
block (plus its `__elements` / `--modifiers`, its own grid/flex layout and `.w-<layout> .w-<component>`
overrides) with responsive rules at the Bricks breakpoints. Header and footer start from the
`w-header` / `w-footer` partials and their `assets/sections/header.css` / `footer.css`.
`[data-surface="x"]` re-points tokens only. `build.py` concatenates the section files into the
generated `assets/sections.css`. Grayscale only. A class styles only its own element: no tag
selectors, no other block's classes, no `[data-layout]`. `qa.py` fails unstyled layouts, a layout
without its stylesheet, removed layout primitives, `bem_lint` errors and anything outside the token
contract (tokens defined outside `tokens.py`, unknown token, off-grid spacing, literal type sizes,
`@media` off the breakpoints, text in `content:`).

## Output skeleton
```markdown
# Design direction — <BRAND>
## 1. Archetype & rationale        ## 2. Reference teardown (+ creative stretch)
## 3. Constraints & anti-patterns  ## 4. Concept routes → concept, signature moves
## 5. Layout grammar               ## 6. Navigation model + IA table
## 7. Page compositions            ## 8. Layout catalogue   ## 8b. Markup contract
## 8c. Component catalogue         ## 9. Open design questions
```

## Gate
- Archetype set; header/footer starters match it (commerce: the `commerce/` partials).
- Routes compared; chosen concept has signature moves rooted in the offering.
- Every page in sitemap §2 has a composition table with a "why" per row; IA table covers
  every page.
- Catalogue, markup contract and component catalogue complete; every layout has its
  `assets/sections/<layout>.css` styling it as a `w-` block inside the design-tool contract;
  `bem_lint` 0 errors.
- Interactive run: concept and page skeletons shown to the user before copy is written.
