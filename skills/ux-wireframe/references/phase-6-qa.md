# Phase 6 — QA

Three gates. All must pass before delivery. Run order:
`python wireframe/render.py && python wireframe/clean.py && python wireframe/build.py && python wireframe/qa.py`

## Gate A — static (`python wireframe/qa.py`, exit 0, warnings read one by one)

| Group | Problems (exit 1) | Warnings (decide, usually fix) |
| --- | --- | --- |
| structure | ≠ 1 `<h1>`, `<style>`, `<img>` (image slots are `.w-photo`), unbalanced tags, duplicate ids | heading-level jumps |
| links | relative link to a missing page, missing `#anchor`, orphan page (no inbound link) | authored page not in header/footer |
| copy | `PLACEHOLDER`, `.w-anno`/`.w-sec-id`, review notes ("coming soon", "page structure"…), stub markup, banned terms, team-language characters | author/AI voice (`META_VOICE` + `meta_phrases`), captions/notes next to image slots |
| archetype | missing archetype; commerce markup on non-commerce sites (`w-card-product`, `w-fav`, `data-cart`, `data-fav`, `data-bundle`, `data-calc`, prices); empty price on commerce | — |
| composition | section without `data-layout`; section `lacks class “w-x”` or `lacks data-brx="section"` (`class="w-x" data-layout="x" data-brx="section"`); layout not in catalogue; layout `has no stylesheet assets/sections/<layout>.css`; `[data-layout]` selector in a stylesheet; consecutive repeat | variety < `min_layout_variety`; cloned skeletons between authored pages |
| templates | mode `element`: instances whose class structure or content differs (`differs in class structure` / `differs in content`); mode `insert`: different section / container classes (`differs in class structure`), another section's element classes inside (`uses another section's element class`), a section-element class only one instance uses and `assets/sections/<layout>.css` never styles (`a typo?`); mode other than `element` / `insert`; `pi-*` / `is-*` / `has-*` ignored | — |
| BEM (`bem_lint.py --prefix w-`, skill `bricks-bem-html` `references/class-system.md`) over `base.css`, `components.css`, `assets/sections/*.css`, other authored stylesheets + `_pages`, `_partials`, `_templates` | every lint error, as `bem <file>:<line> [rule] message`: `prefix`, `brx-structure`, `no-class`, `tag-selector`, `cross-block` (only `.w-section .w-component` in that section's file is allowed), `layout-attr`, `surface-descendant`, `id-selector`, `modifier-alone`, `element-outside-block`, `prop-outside-component`, `component-no-block`… (stylesheets whose first comment says `bem-lint: base` may use tag selectors) | lint warnings (`shared-block` — a class used by several sections: make it a component or give each section its own element class; `bem-name`, `orphan-element`…) |
| primitives | `removed layout primitive(s)` in markup or CSS (`w-layout-*`, `section`, `wrap`, `cols`, `span-N`, `split*`, `grid`, `g-N`, `row`, `stack`, `bento`, `spacer` — sections own their layout); `site.config.json` css other than tokens.css → base.css → components.css → sections.css (`wireframe.css` / `site.css` / `style.css` / packs: `that layer is gone`) | — |
| components | a `data-component` value not listed in design-direction §8c Component catalogue | a catalogue row never used; `data-component` used without a §8c table |
| drift | — | authored page without a content file; h1/h2 not found in its content file |
| hooks | required interaction attribute missing | — |
| tokens + handoff (token / design-tool contract) | `assets/tokens.css` missing or not first in `site.config.json`; a token (name in tokens.css) defined in a `:root`/`html` rule of another stylesheet; a token-family `var()` not in tokens.css (renamed or removed name, e.g. `--display-size`, `--layout-wrap`); `@media` width off the Bricks breakpoints of `handoff/bricks-tokens.json` (1279 / 991 / 767 / 478); stray top-level fragment element; section `data-surface` missing/unknown; spacing off the 4 px grid (stylesheets + inline `style`); literal `font-size`/`line-height`; text in CSS `content:`; glyph icons in copy; review bar (`wf-bar`) | header/footer without `data-chrome="nav"` / `"footer-col"` |

`qa.config.json`:
```json
{ "currency": "",
  "banned_terms": [],
  "banned_chars": "<team-language characters>",
  "meta_phrases": ["project-specific author-voice phrases"],
  "min_layout_variety": 0.6,
  "required_hooks": { "wound-care.html": ["data-chooser"], "partners.html": ["data-wizard"] } }
```

## Gate B — browser (mandatory)

Serve `python -m http.server 8777 --directory wireframe`, then for **every page at 390, 768,
1440 and 1512** (1512 = the Figma desktop frame) load it, evaluate the source of
`wireframe/browser-checks.js`, and collect console errors with the driver. The probe returns
`{ ok, overflow, offenders, imgs, emptyPh, colour, headerOut, headings, typeGrid, container, widgets[] }`.
`headings` lists every `h1`–`h6` / `p.…__title` with a lone last word under a fuller line, a line
that ends one sentence and starts the next, or a word past its box (fix per phase-5 rule 9, then
re-run). `typeGrid` lists text whose line height is not its font size × one of the
`--line-height-xs…xl` tokens (a literal or inherited px line height). `container` lists a root
font size other than 10 px (62.5 %) and every `data-brx="container"` that is not
min(viewport, `--max-screen-width`) wide with `--container-padding` at each side (sections never set
container width or side padding). It also exercises every
widget it finds:

| Widget | Asserted |
| --- | --- |
| slider | next changes the counter |
| tabs | each tab → exactly its own panel visible |
| gallery | thumb → main slot shows its brief |
| chooser | each `data-when` result appears for its answers, empty state hides; reset restores |
| wizard | empty required → stays; filled → advances; last step submit → confirmation |
| forms | filled + submitted → inline confirmation (also in inactive tab panels) |
| mobile nav | toggle opens, close closes (when the toggle is visible) |
| header menus | every header link/button focused/hovered → nothing opens outside the viewport |
| dropdowns (`data-menu-toggle`) | click opens the panel inside the viewport; Escape closes it and returns focus |

omp runner (Playwright: same loop with `page.evaluate(src)` and `page.on("console")`):
```js
const src = await Bun.file("wireframe/browser-checks.js").text();
const tab = await browser.open({ name: "qa", url: "http://127.0.0.1:8777/index.html" });
for (const w of [390, 768, 1440, 1512]) { await tab.emulate({ viewport: { width: w, height: 900 } });
  for (const p of pages) { await tab.clearConsole(); await tab.goto(base + p, { wait_until: "load" });
    const r = await tab.evaluate(src);
    const errs = (await tab.errors()).entries.length +
      (await tab.console()).entries.filter(m => m.type === "error").length;
    if (!r.ok || errs) fails.push({ w, p, errs, r }); } }
```
Pass = zero fails. The probe opens/closes a filter drawer (`[data-filter-panel]`, contract §6b),
checks the sidebar where the drawer trigger is hidden, and asserts clear-all restores every
result. Widgets it cannot judge (commerce cart, sort order, variants, calculator) are
asserted by hand per `interactions-contract.md`.
With the UI refine done (`"style": true` → `<html data-style="on">`, phase 7) the grayscale check covers `.w-photo` image slots only.

## Gate C — design review (against design-direction.md)

Screenshot every concept page at 1440 and 390 (first screen + full page):

| Check | Pass when |
| --- | --- |
| Signature moves | each move from §4 is visible where §7 places it |
| Anti-patterns | none of §3's anti-patterns appear without a §7 justification |
| First screen | matches the §7 hero composition (hierarchy, CTA, media) |
| Rhythm | padding/density follows §5; no accidental equal-card monotony |
| Distinctness | home vs inner pages read as different compositions of one system |
| Brief adjectives | a reviewer can point to where each adjective is expressed |
| Reader's eye | no leftover notes, captions, repeated caveats, source talk, site features sold as benefits |
| Claims | every claim on screen is in the page's claims ledger with an SSOT source |

Record a pass/fix note per row; fix and re-screenshot until all pass.

## Failure modes seen in practice

| Symptom | Cause | Fix |
| --- | --- | --- |
| Site looks like the previous project | layouts from shared CSS / old partials | phase 3 catalogue + one `assets/sections/<layout>.css` per section; skeleton partials |
| Linked pages are empty shells | stub generator, "will contain" tables | authored page or `render.py` family; otherwise no link |
| Copy narrates the data ("as stated in the documentation") | writer describes sources, not benefits | phase 4 reader table; `meta_phrases` |
| "Nine languages" as a USP or partner benefit | site function sold as value | phase 1 §6, phase 4 "don't sell the website" |
| Grey role captions / small notes under blocks | art direction leaked out of the image slot; caveats repeated per item | brief inside `.w-photo`; qualifier once in body/table heading |
| Range-wide badge some items can't carry | claim scope ignored | claims ledger with "Covers" |
| New page reachable only from body copy | nav not revisited | IA table; reachability warning |
| Header wraps / dropdown cut off at 1024–1280 | menu breakpoint guessed | measure; switch to menu button where the bar wraps; panels anchored to container |
| Fragment and content file disagree | page edited directly | fix the content file first; drift warning |
| Filtered cards stay visible | `.w-card-post{display:flex}` beats `[hidden]` | base keeps `[hidden]{display:none!important}` |
| `clean.py` deletes a runtime hook | empty-element regex | elements with `data-*` are kept |
| Horizontal overflow on mobile | grid children `min-width:auto`, `nowrap` buttons | `min-width:0`; allow wrapping |
| CSS edits ignored | cached stylesheet | build.py appends `?v=<mtime>` |
| Backdrop creates a scrollbar | `box-shadow: 0 0 0 100vmax` | fixed-position `::before` overlay |
| Heading-level jumps | item labels as `<h3>` under no `<h2>` | `<p class="…__title">` |
| Foreign words in the UI | sibling-market copy | glossary + `banned_terms` |
| Lone word on a heading's last line ("One standard of / care.") | big type in a narrow label column, no glue | phase-5 rule 9: `&nbsp;` after function words + last two words |
| One line holds two sentences ("Two care / areas. One / …") | `text-wrap: balance` evens lengths, ignores meaning | `<span class="w-phrase">` per sentence |
| Glued heading overflows at 320–390 | `&nbsp;` chain longer than the column | chain ≤ 18 chars; longer groups as `.w-phrase` |
| Filter rail stacked above the results on mobile; user scrolls past 6 filter groups to the first card | rail only collapses to one column | §6b filter panel: same inputs as an off-canvas drawer, sticky "Filters (n)" + sort toolbar |
| "Clear filters" leaves a radio group with nothing checked | reset unchecked facets only | engine re-checks the neutral radio (same `name`, no `data-facet`) |
| Drawer footer button cut off at the right edge on phones (visible only once a filter is on and "Clear all" appears) | two `white-space: nowrap` buttons wider than the fixed, clipping drawer; page overflow checks never see it | footer = text-link reset + `flex: 1; min-width: 0; white-space: normal` apply; probe `filter-panel` measures drawer contents opened and with a filter on |
| Result count says "products" on a rental / course site | global `resultCount` string | `data-result-label="{total} stays"` per catalogue |
| Figma rebuild approximates every section ("nearest span", rounded paddings, missing arrows) | wireframe CSS off the design-tool grid: `4fr 6fr` splits, 7/11/13 px values, glyph/`content:` icons, `clamp()` type | phase-5 design-tool contract; `qa.py` handoff group; probe `typeGrid` |
| Figma header/footer filled by hand, dropdowns missing in Figma | no `data-chrome` hooks; `:hover`-only menus | `data-chrome` hooks in partials; `data-menu-toggle` widget (states exported by `handoff.py`) |
| Black "UX WIREFRAME" bar with page shortcuts above the header; client asks to remove it | skeleton header shipped a review bar (`wf-bar`) | templates no longer create it; `qa.py` rejects `wf-bar`; reviewers navigate via the real header/footer |
| A guide/journal built as one long landing page; reviewer asks for a searchable blog by persona | guide treated as an editorial page, no search in the catalogue engine | phase-2 "Guides, journals" rule; contract §6c `data-catalog-search` (probe `catalog-search`); `render.py` `"index"` block renders the listing from the article data |
| `banned term` fires on every page because a slug or `data-keywords` holds the plain spelling (`vodic-festivali-zrce.html`, "zrce") | banned terms were matched against raw HTML | `qa.py` checks readable copy only (text + alt/aria-label/title/placeholder/meta content/filter labels/form messages); selftest `banned term` + "ignores … URLs" |
| Every stay's "Book now" opens the same booking page for one sample stay; confirmation is a separate page reachable only by form | one hand-made funnel page | one booking page per item via `render.py` `"also"`; confirmation in place (`data-wizard-done`); probe `wizard` checks Edit + done panel |
| Date picker probe reports "outside the viewport" / "fewer than 9 days" | probe clicked an off-screen field mid smooth-scroll; late-month current month | probe scrolls the field into view, waits, turns to next month when needed |
| Bricks import needs 400+ classless elements and 800 context selectors untangled | layouts scoped as `[data-layout="x"] .child`, surfaces restyling components from outside, repeated parts never named | v4 markup contract (every element classed, surface tokens, §8c components; `bem_lint` in Gate A), now v5 class system: section = own `w-<layout>` block with `data-brx`, `bem_lint --prefix w-` |
| Bricks import of v4 output still needs untangling: shared `.section .wrap .cols .span-N` layout classes on every section, unprefixed names, one site.css for all sections | layout primitives reused across sections, no owner prefix, no Bricks element types | v5: one `w-<layout>` block per section with its own `assets/sections/<layout>.css`, components the only reused classes, `data-brx` types, Bricks templates; qa `primitives` / `templates` / `bem --prefix w-` |

## Reporting

Report only what was executed, in the user's language: pages built (authored/generated),
Gate A problems/warnings, Gate B runs × fails and console errors per breakpoint, widgets
exercised, design-review table, every defect found and fixed with its cause.
