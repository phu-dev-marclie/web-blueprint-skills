# Phase 8 — Iteration loop: handling review feedback

A wireframe is reviewed in rounds. Each round must leave the **sources, the pages and the
skill** in agreement. Fixing only the HTML makes the next build or the next project repeat
the mistake.

## Per feedback item

1. **Restate** the item as an observable symptom ("small grey role captions under photos")
   and find **every** instance — grep the fragments, templates, data files and content files,
   not just the page the reviewer mentioned.
2. **Classify** it:

   | Class | Example | Fix at |
   | --- | --- | --- |
   | fact | wrong country list, invented badge | SSOT → content → pages |
   | structure | missing page type, page unreachable | sitemap + IA table → partials → new page |
   | composition | looks like a template, monotonous rhythm | design-direction §4/§7 → `assets/sections/<layout>.css` → fragments |
   | copy | author voice, selling site features, leftover notes | content `.md` → fragments / data |
   | interaction | widget dead, overflow, dropdown off-screen | engine / `components.css` / `assets/sections/<layout>.css` → browser gate |
   | style | wrong accent use, font too heavy, low contrast (after phase 7) | `design.md` → `tokens.py` / skins in `components.css` + `assets/sections/*.css` → gates + contrast scan |

3. **Fix at the source first**, then propagate downward in the same change:
   SSOT → sitemap → design-direction (+ catalogue, markup contract) → content `.md` →
   `data/*.json` / `_templates/` → `_pages/` fragments → partials → `components.css` / `assets/sections/<layout>.css`.
   Generated fragments are never hand-edited.
4. **Preserve what the reviewer still needs.** Removing a pattern can delete information
   (e.g. a caveat, an image brief). Move it to the right place instead of dropping it, and
   say where it went.
5. **Rebuild and run all gates**: `render.py → clean.py → build.py → qa.py`, browser check of
   the pages touched at 390 / 1440 / 1512, screenshot the changed sections.
6. **Report** in the user's language: what was removed/changed (list), what was kept and
   why, where moved information now lives, measured gate results.

## Lesson capture — improve the skill when the flaw is systemic

Ask after each round: *would this happen again on another project?* If yes:

1. Add the rule to the phase reference where the mistake is **made** (not where it is noticed).
2. If it is machine-checkable, add a `qa.py` check — warning for taste, problem for
   correctness — and prove it with a **negative test**: inject the flaw into a throwaway copy
   and confirm the check fires; confirm the real project stays clean.
3. Add a row to the failure-modes table in `phase-6-qa.md`.
4. Strong new compositions go into `composition-ideas.md`.
5. Sync tooling: project `wireframe/{qa,render,build,clean,handoff}.py`, `browser-checks.js`,
   `assets/{base.css,components.css,wireframe.js}` must equal the skill's `assets/tooling/*`; run
   `python <skill>/scripts/selftest.py --project .`.

Browser checks after an edit: load pages with a cache-busting query (`?v=<time>`) or a fresh tab —
the static server's pages are cached by the headless browser, and a stale page reports a fixed bug.

## Lessons already captured (do not relearn)

| Feedback | Systemic cause | Rule now lives in |
| --- | --- | --- |
| "Looks like the previous project" | layouts came from shared CSS | phase 3 (catalogue + `site.css`; now one `assets/sections/<layout>.css` per section), qa composition checks |
| "Pages are empty placeholders" | stub generator | render.py families; qa review-note check |
| "Sounds like an AI describing its data" | author voice in copy | phase 4 "write for the reader"; qa `META_VOICE` |
| "Languages are not a USP" | site functions sold as benefits | phase 1 §6, phase 4 "don't sell the website" |
| "Pages I can't reach" | pages added without nav update | phase 3 IA table; qa reachability warning |
| "Small notes on the layout" | captions under images, repeated caveats | phase 3/4/5 image + qualifier rules; qa caption warning |
| "Missing page types big brands have" | IA derived from the old site only | phase 2 §1b gap analysis |
| "CE on everything" | claim scope ignored | phase 4 claims ledger + claim scope |
| "Filter should be a sidebar on desktop, off-canvas on mobile" | filters as a one-row bar + chips; rail stacked on mobile | interactions-contract §6b, engine `initFilterDrawer`, commerce pack drawer (now `w-filters` in `components.css`), probe `filter-panel` check |
| "Figma rebuild needs guessing: spans, paddings, type styles, icons, menus" | wireframe CSS off the design-tool grid; glyph/`content:` icons; `:hover` menus; chrome filled by hand | phase-5 design-tool contract, base tokens on 1512/12/24/72 + 4 px, `<i data-icon>`, `data-menu-toggle`, `data-chrome` hooks, `handoff.py`; qa handoff group, probe `typeGrid` |
| "Make it look like <reference>" done as colour-only or as a clone | no measured style system; reference values copied | phase 7: `style-probe.js` → `design.md` (translate, don't clone) → `style.css` (now skins in `components.css` / `assets/sections/*.css`) |
| "Remove the black review bar above the header" | header skeleton shipped a `wf-bar` page index | header templates (no bar), phase-5 header rules, qa `review bar (wf-bar)` problem, selftest `review bar` |
| "The guide should be a blog people search and filter by persona, with stays suggested in each article" | guide built as a landing page; engine had no keyword search; index cards would be copied by hand | phase-2 "Guides, journals" rule, contract §6c + probe `catalog-search`, `render.py` `"index"` block, composition-ideas (guide board, picks in content) |
| Banned spelling flagged in URLs/search synonyms | `qa.py` scanned raw HTML | `qa.py` readable-copy scope; selftest cases |
| "Learn the booking flow of my other site (Premium Booker)" — one shared booking page, a separate thank-you page, native date inputs | booking built as a generic 3-step form; engine lacked range picker, recap/edit, in-place confirmation | contract §13 booking extensions + §14 date range picker, base CSS `.stepper` / `.dp` (now `w-stepper` / `w-datepicker` in `components.css`), probe `wizard` (Edit, done panel) + `date-range`, `render.py` `"also"` (one booking page per stay from the stay data), composition-ideas "checkout card + sticky summary" |
| "Add login / sign up, my account, membership, coupon code and a separate thank-you page (for measurement)" | engine had no coupon / copy widgets; in-place confirmation cannot carry a conversion tag; "also" pages were generated for items that cannot be booked (orphans) | contract §15 coupon + §16 copy-code, probe `coupon`, wizard probe validates forms that post to a real page, §13 thank-you variant, `render.py` `"also"` + `"when"`, composition-ideas (auth split, account board, top bar auth) |
| "Make the UI mockup from my other site's design.md, but with a pink (Airbnb) button accent" | the base `--color-action-primary` (now `--active`) drove buttons and selected states; the named hue failed white text; new fonts widened the nav past the menu breakpoint (1201–1215 px overflowed, unseen at 1440 / 1512) | phase-7 step 6 lessons (`--btn-bg` → `--primary`, `--active` neutral, deepen hue to 4.5 : 1, Neutrals ramps for hairlines, transparent borders) + step 7 header breakpoint re-measure |
| "Importing into Bricks needs 400+ classless elements and 800 context selectors untangled" | layouts scoped as `[data-layout="x"] .child`, surfaces restyling components (`[data-surface] .btn`), repeated parts unnamed | v4: layout = section block, every element classed, surface tokens, design-direction §8c components (`data-component` / `data-prop`); `bem_lint.py` (skill bricks-bem-html) in `qa.py`; selftest negatives (now the v5 class system, row below) |
| "Learn the property card, category card and desktop / mobile filters of my other site" | card markup was copied per list (catalogue, siblings, house floors, article picks) with diverging briefs; the drawer footer's two buttons overflowed a 342 px drawer; a sticky toolbar inside a short wrapper never sticks | composition-ideas (property card, glass category card, filter panel → drawer); one card data object per item copied into every family (`render.py` loops, no partials); drawer footer = text-link reset + flexible apply button; sticky toolbar wrapper `display: contents` on mobile |
| "Learn the FAQ accordion, legal page and blog detail of my other site; the site has no About page" | the engine had no scrollspy for contents rails; "copy link" needed a page URL; About content risks invented host stories | engine `initToc` (contract §17) + probe `toc`; empty `data-copy` copies the page URL; composition-ideas (round-toggle accordion, contents rail, article ending, small-business about page); About built from confirmed facts only, the rest as an SSOT question |
| "Content is thin and repetitive: the home party-size block duplicates the menu; the About 'at a glance' list adds nothing" | compositions chosen per page as fact lists (ladder, ledger, legend) restated the same SSOT facts on 5+ pages; no page carried a story / SEO passage; two sibling pages shared paragraphs | phase-4 "one list per fact set" + "story sections carry the SEO"; composition-ideas story split / story chapters / persona guide |
| "The Location page is redundant — fold it into About; make 'getting here' a guide article; add a 'Why visit {place}' article as the secondary button of CTAs" | the IA gave every SSOT topic its own page, so a thin page restated About, the home ruler and the guide; CTA blocks had one button and no reading step; directions copy carried unconfirmed claims (transfer, distances) | phase-4 "a page needs a job no other page does" (merge + 301 + nav/footer/sitemap in one pass) and "≤ 2 buttons per CTA block"; composition-ideas CTA pair / hub article / route tabs in an article |
| "Turn the compare page into a quiz about the trip that recommends apartments, then a 10% / 4-hour offer for an email, then a thank-you page with featured articles" — next round: "drop the 10% / 4 hours, it breaches EU consumer protection; how do we still get leads?" | the chooser (§12) only shows hand-written results for exact answer combinations; nothing could rank real items; a discount + countdown for an email is pressure selling (EU UCPD) and needs code infrastructure; an offer card inside a dark band inherited white headings (caught only by a contrast scan in the revealed state) | engine `data-quiz` (contract §18: scored ranking from facet tags; "email me my matches" = submit with `formaction` + `data-quiz-picks`) with probe; qa counts `formaction` as a link; composition-ideas quiz recommender / email the result (lead); propose value-for-email (the result, a planner, an alert) before discounts or timers; check contrast and overflow again after revealing hidden states |
| "Guests don't care about the pool, garden or amenities until they see what these do for their holiday; tell it as a story, with ideas for different guests, SEO-friendly and easy to scan" | the facility page was built from the amenity list (pool ledger, plan legend, parking block): each section named a thing, none said what it changes for the guest; facts repeated across 3 blocks | phase-4 "one list per fact set" applied per page: benefit sections first (composition-ideas day strip = a day with the facility, audience tabs = who uses it how, each tab ending in 2 matching items + guide), then ONE short "good to know" ledger with short values; jump chips under the H1 so readers skip to their part |
| "Learn how Core Framework sets up variables, but build on Bricks' own theme management, so an agent can move the mockup to Bricks exactly and I can edit it later" — next round: "why doesn't `.eyebrow` use `--text-eyebrow`?" | tokens lived in three stylesheets as fixed px role pairs (`--text-h2`, `--line-height-body`) and `--color-*` semantics, with 9 ad-hoc breakpoints and a private dark-mode attribute — nothing mapped 1:1 onto Bricks' Style Manager; `--text-eyebrow` was a size, and the eyebrow colour borrowed the muted text token | one token source `wireframe/tokens.py` + vendored `tokens_builder.py` (bricks-bem-html) → `tokens.css` + `bricks-tokens.json`; CF naming (Brand + Bricks shades, Neutrals flip / never-flip, Theme roles with dark values), base × ratio scales, unitless line heights, 62.5 % root, Bricks breakpoints, `data-brx-theme` / `brx_mode`; one colour token per text role; qa token group + probe `typeGrid` ratio check; bricks-bem-html `references/tokens.md`, `bricks_tokens_verify.php` |
| "Owner's Bricks class convention: one block per section with w- prefix, only components reused, section overrides as `.w-section .w-component`, data-brx element types, Bricks templates, grid/flex rules" | v4 shared layout primitives across every section, unprefixed names, one site-wide stylesheet, no Bricks element types or templates — the import still needed renaming and untangling | SKILL.md rule 9; bricks-bem-html `references/class-system.md`; phase-3 §5 / §8b / §8c; phase-5 markup contract; `qa.py` composition / templates / bem (`--prefix w-`) / primitives checks + browser probe `container`; selftest cases |
