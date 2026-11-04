# Phase E — HTML Wireframes

Turns a finished content brief (`pages/*.md` from Phases A–D) into browser-previewable HTML wireframes, using real layouts from the `wireframe-library/` image set instead of inventing structure from scratch.

Read this file once before generating the first wireframe page. Read `references/library-catalog/INDEX.md` right after.

---

## 1. When this runs

Phase E is optional and comes after Phase D. Requirements:

- `pages/00-global.md` and at least one `pages/[NN]-[slug].md` must exist and be validated (Phase D done).
- `references/library-catalog/` must exist (43 category `.md` files + `INDEX.md`). This ships with the skill — nothing to build per project.
- The `.webp` source images are **optional**. If present, they make the HTML closer to the source layout (see mode below). If absent, build from the catalog's `Layout:`/`Slots:` description alone.

## 2. Resolving the library path

Look for a `Wireframe library:` line in the project's `CLAUDE.md` (the Phase A foundations file). Resolution order:

1. Path given by `Wireframe library:` in `CLAUDE.md`.
2. `<project-root>/wireframe-library/` (default, only if it exists).
3. **Catalog-only mode** — no images found. Still fully usable: every entry's `Layout:`/`Slots:` line has enough detail to hand-build the section. Note this once at the top of `wireframes/index.html` as an HTML comment: `<!-- built in catalog-only mode: no wireframe-library/ images found -->`.

When images ARE available: **read the chosen `.webp` before writing that section's HTML.** The catalog entry gets you to the right candidate; the image is what you actually copy the structure from (exact spacing rhythm, whether an eyebrow tag is really there, card count, etc.). Never write a section's HTML from the catalog text alone if the image is reachable — the catalog is a search index, not the source of truth.

## 3. Section → category mapping

Match each `##` section in a content page to a library category. This table is the default lookup; use judgement when a section name doesn't appear verbatim (e.g. "Rooms" content maps the same as "Cards section" for a rental site).

**Check `sitemap.md` first.** If Phase B annotated its section lists with categories (`Hero → hero-sections`), those annotations win — they were reviewed and approved by the user, and re-deriving them here risks silently drifting from what was agreed. Use this table for sections the sitemap left unannotated, and when a sitemap annotation turns out to be a poor fit once the real content exists, say so rather than swapping categories quietly.

| Content brief section (from FORMAT.md) | Library categor(y/ies) to search |
|---|---|
| Hero | `hero-sections` |
| Welcome / paragraph section | `intro-sections`, or `content-sections` |
| Stats / inline bar | `content-sections` (tags: `stats`), or `logo-sections` if it's a logo strip |
| Cards section (rooms, services, distinct-page cards) | `feature-sections`; use `product-sections`/`property-sections`/`blog-sections` when the domain is e-commerce/rental/blog |
| Icon grid section (amenities, features list) | `feature-sections` (tags: `icon-grid`) |
| Steps / process | `process-sections`, or `timeline-sections` for chronological/roadmap framing |
| Guest Reviews / testimonials | `testimonials-sections` |
| FAQ | `faq-sections` |
| The Form (contact, booking, signup) | `contact-sections`, or `login-pagers` for auth forms |
| Pricing | `pricing-sections` |
| Gallery | `gallery-sections`, or `portfolio-sections` for project/case-study framing |
| Team | `team-sections`, or `single-team-sections` for a bio detail page |
| Pre-footer CTA / final CTA | `cta-sections`, or `banner-sections` for a slim announcement strip |
| Header → Navigation (simple) | `header-sections` |
| Mega Menu | `mega-menu-sections` |
| Mobile Menu | `offcanvas` |
| Footer | `footer-sections` |
| Cart / Checkout | `cart-pages` |
| Login / signup | `login-pagers` |
| Error page | `error-pages` |
| Thank-you page | `thank-you-pages` |
| Coming soon / holding page | `coming-soon-pages` |
| Dashboard | `dashboard-pages` |
| Single product detail | `single-products` |
| Single property detail | `single-property-sections` |
| Single event detail | `single-event-sections` |
| Single portfolio/case-study detail | `single-portfolio-sections` |
| Blog post detail (hero) | `single-post-heros` |
| Blog post detail (body) | `single-post-sections` |
| Blog index / listing | `blog-sections` |
| Category filter bar | `category-filters` |
| Bottom nav (mobile app-style) | `bottom-navigation-bars` |
| Careers listing | `career-sections` |
| Popup / modal | `popup-sections` |
| Age/region gate | `checkpoint-pages` |
| Link-in-bio page | `link-pages` |
| Logo strip ("as seen in") | `logo-sections` |

**No match → skip.** `Submit States`, `Validation Messages`, and any other section with no corresponding category do not get rendered. Emit a comment in the HTML at the point they'd have appeared:

```html
<!-- skipped: Submit States (no layout category — behavioral spec, not a visual section) -->
```

## 4. Selection algorithm

For each section, in order:

1. Open the target category file(s) from the mapping table above (or `INDEX.md` first if unsure which category fits).
2. Filter entries by **content fit**: does `Slots:` roughly match what the brief section actually has? Count cards/reviews/FAQ items/form fields in the brief content and look for a `Slots:` line whose counts accommodate it (`x3` exact, or an `xN-M` range that covers it). A brief with 4 review cards should not get a layout whose `Slots:` says `quote x2`. Exact counts are a preference, not a hard requirement — if the closest candidate holds 4 and the brief has 6, use it anyway and add the extra items as more of the same repeating cell (the catalog is a structural guide, not a rigid mold). Same for cosmetic details in the source image that the brief doesn't call for (a raised/dark middle card, a rating strip) — drop them rather than inventing content to fill them.
3. Among fitting candidates, prefer the one whose `H:` (source image height) roughly matches the section's expected weight (a hero with just headline+CTA doesn't need a 1500px layout; a stats-heavy hero can use a taller one).
4. **Diversity rule:** don't reuse the same layout id twice within one page, and across the project avoid reusing an id more than 2–3 times — cycle through the category so the wireframe set doesn't look copy-pasted. Keep a running note of ids used so far.

   **Exception — repeated series.** When a page runs several sections of the *same content type* as a deliberate series (five FAQ category groups, three feature blocks, a run of alternating text/image rows), reuse **one** layout for all of them. That is a single component repeating, which is what a real design would do; giving each one a different accordion style would look broken, not varied. The rule exists to stop *unrelated* sections all defaulting to the same layout — not to forbid a legitimate repeat. When you do repeat deliberately, the `data-wf-layout` value is identical on each, so validation check 3 will flag it; note the intended repeat in your report instead of forcing a different layout to satisfy the grep.
5. Once chosen, **Read the `.webp`** (if the library is available — see §2) before writing the HTML for that section. Match its actual structure: column split ratio, alignment, image block placement, whether a tag/eyebrow is present.
6. Write the section with a traceability comment right above it **and** a `data-wf-layout` attribute on the section element itself:

```html
<!-- section: Hero | layout: hero-sections/hero section 12 -->
<section class="wf-section" data-wf-layout="hero-sections/hero section 12">
```

Both carry the same `<category>/<entry id>` value (no `.webp`), which resolves to `wireframe-library/<category>/<entry id>.webp`. The comment is for grep and diffing; the attribute is what the on-page layout-label overlay reads (§5.4) so a designer can see, in the browser, which Brixies section each block came from. Put the attribute on every traceable block — content sections, header, and footer alike.

## 5. HTML/CSS conventions

### 5.1 `wireframes/wireframe.css` — write once per project

Create this file before the first page. Every wireframe page links it (`<link rel="stylesheet" href="wireframe.css">`); never inline duplicate styles per page.

```css
:root {
  --wf-accent: #2563EB;
  --wf-gray-50: #F8FAFC;
  --wf-gray-100: #F1F5F9;
  --wf-gray-200: #E2E8F0;
  --wf-gray-300: #CBD5E1;
  --wf-gray-400: #94A3B8;
  --wf-gray-500: #64748B;
  --wf-gray-700: #334155;
  --wf-gray-900: #0F172A;
  --wf-radius: 8px;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
  color: var(--wf-gray-900);
  background: #fff;
}

.wf-canvas { max-width: 1512px; margin: 0 auto; }

.wf-section { padding: 64px 0; border-bottom: 1px solid var(--wf-gray-100); }
.wf-section--tight { padding: 32px 0; }
.wf-section--dark { background: var(--wf-gray-900); color: #fff; }

.wf-container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }

.wf-eyebrow {
  display: inline-block;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: .04em;
  text-transform: uppercase;
  color: var(--wf-accent);
  margin-bottom: 12px;
}

h1.wf-h1 { font-size: 44px; line-height: 1.15; margin: 0 0 16px; }
h2.wf-h2 { font-size: 30px; line-height: 1.2; margin: 0 0 12px; }
h1, h2, h3, h4 { text-wrap: balance; }      /* heading line breaks — see §5.5 */
.wf-phrase { display: inline-block; }       /* one wrapping unit: a sentence or a name group */
.wf-body { font-size: 16px; line-height: 1.6; color: var(--wf-gray-500); margin: 0 0 16px; }

.wf-btn {
  display: inline-block;
  padding: 12px 24px;
  border-radius: var(--wf-radius);
  background: var(--wf-accent);
  color: #fff;
  text-decoration: none;
  font-weight: 600;
  font-size: 15px;
  border: none;
  cursor: pointer;
}
.wf-btn--ghost {
  background: transparent;
  color: var(--wf-gray-900);
  border: 1.5px solid var(--wf-gray-300);
}

.wf-tag {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--wf-gray-100);
  color: var(--wf-gray-700);
}

.wf-img {
  background: var(--wf-gray-200);
  border-radius: var(--wf-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: var(--wf-gray-400);
}
.wf-img::before {
  content: "";
  width: 40px;
  height: 40px;
  background: var(--wf-gray-400);
  -webkit-mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>') center/contain no-repeat;
  mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>') center/contain no-repeat;
}

.wf-avatar {
  width: 56px; height: 56px; border-radius: 50%;
  background: var(--wf-gray-300); flex-shrink: 0;
}

.wf-icon {
  width: 48px; height: 48px;
  border-radius: var(--wf-radius);
  background: var(--wf-gray-100);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  margin-bottom: 16px;
}
.wf-icon::before {
  content: "";
  width: 22px; height: 22px;
  background: var(--wf-gray-700);
  -webkit-mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2 3 7v10l9 5 9-5V7l-9-5zm0 2.3 6 3.3v8.8l-6 3.3-6-3.3V7.6l6-3.3z"/></svg>') center/contain no-repeat;
  mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2 3 7v10l9 5 9-5V7l-9-5zm0 2.3 6 3.3v8.8l-6 3.3-6-3.3V7.6l6-3.3z"/></svg>') center/contain no-repeat;
}

.wf-accordion-item { border-bottom: 1px solid var(--wf-gray-200); padding: 20px 0; }
.wf-accordion-item summary {
  display: flex; justify-content: space-between; align-items: center;
  cursor: pointer; font-weight: 600; list-style: none;
}
.wf-accordion-item summary::-webkit-details-marker { display: none; }
.wf-accordion-item summary::after { content: "+"; font-size: 20px; color: var(--wf-gray-500); }
.wf-accordion-item[open] summary::after { content: "\2212"; }
.wf-accordion-item .wf-body { margin-top: 16px; }

.wf-card {
  background: #fff;
  border: 1px solid var(--wf-gray-200);
  border-radius: var(--wf-radius);
  padding: 24px;
}

.wf-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 32px; }
.wf-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; }
.wf-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }

.wf-split { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; }
.wf-split--60-40 { grid-template-columns: 3fr 2fr; }
.wf-split--reverse { direction: rtl; }
.wf-split--reverse > * { direction: ltr; }

.wf-quote { font-size: 20px; font-style: normal; margin: 0 0 16px; color: var(--wf-gray-700); }

.wf-stats { display: flex; gap: 40px; flex-wrap: wrap; }
.wf-stat { font-size: 32px; font-weight: 700; }
.wf-stat small { display: block; font-size: 14px; font-weight: 400; color: var(--wf-gray-500); }

.wf-nav { display: flex; align-items: center; justify-content: space-between; padding: 20px 0; }
.wf-nav ul { list-style: none; display: flex; gap: 28px; margin: 0; padding: 0; }
.wf-nav a { color: var(--wf-gray-900); text-decoration: none; font-size: 15px; }

.wf-footer-grid { display: grid; grid-template-columns: 2fr repeat(3, 1fr); gap: 32px; }
.wf-footer-grid ul { list-style: none; margin: 0; padding: 0; }
.wf-footer-grid li { margin-bottom: 10px; }
.wf-legal-bar {
  border-top: 1px solid var(--wf-gray-200);
  margin-top: 48px; padding-top: 24px;
  display: flex; justify-content: space-between;
  font-size: 13px; color: var(--wf-gray-500);
}

/* Layout labels — off until the toggle adds .wf-labels to <body>. See §5.4. */
[data-wf-layout] { position: relative; }

.wf-labels [data-wf-layout] { outline: 1px dashed var(--wf-accent); outline-offset: -1px; }
.wf-labels [data-wf-layout]::before {
  content: attr(data-wf-layout);
  position: absolute;
  top: 0; left: 0;
  z-index: 50;
  background: var(--wf-accent);
  color: #fff;
  font: 600 12px/1 -apple-system, "Segoe UI", Roboto, sans-serif;
  letter-spacing: .02em;
  padding: 6px 10px;
  border-radius: 0 0 var(--wf-radius) 0;
  pointer-events: none;
  white-space: nowrap;
}

.wf-label-toggle {
  position: fixed; right: 20px; bottom: 20px; z-index: 100;
  padding: 11px 20px;
  border: none; border-radius: 999px;
  background: var(--wf-gray-900); color: #fff;
  font: 600 14px/1 -apple-system, "Segoe UI", Roboto, sans-serif;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(15, 23, 42, .25);
}
.wf-labels .wf-label-toggle { background: var(--wf-accent); }

@media print { .wf-label-toggle { display: none; } }

@media (max-width: 768px) {
  .wf-split, .wf-grid-2, .wf-grid-3, .wf-grid-4, .wf-footer-grid { grid-template-columns: 1fr; }
  .wf-nav ul { display: none; } /* mobile menu takes over — see §5.3 */
  h1.wf-h1 { font-size: 32px; }
}
```

Extend this stylesheet only when a layout genuinely needs a class that doesn't exist yet (e.g. a carousel's dot indicators, an accordion chevron). Keep additions in the same token system — reuse `--wf-accent` and the gray scale, don't introduce new colors.

### 5.2 Page shell

Every `wireframes/[NN]-[slug].html` is a self-contained document:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>[Page name] — Wireframe</title>
<link rel="stylesheet" href="wireframe.css">
</head>
<body>
<div class="wf-canvas">
  <!-- header | layout: header-sections/header section 3 -->
  <header class="wf-container wf-nav" data-wf-layout="header-sections/header section 3"> ... </header>

  <!-- section: Hero | layout: hero-sections/hero section 12 -->
  <section class="wf-section" data-wf-layout="hero-sections/hero section 12"> ... </section>

  <!-- footer | layout: footer-sections/footer section 4 -->
  <footer class="wf-section" data-wf-layout="footer-sections/footer section 4"> ... </footer>
</div>
<button class="wf-label-toggle" onclick="document.body.classList.toggle('wf-labels')">Layouts</button>
</body>
</html>
```

The `wf-label-toggle` button goes on **every** page, as the last element before `</body>` — outside `.wf-canvas` so it stays fixed while the page scrolls.

### 5.3 Header/footer render on every page

Build the header and footer HTML once from `pages/00-global.md`, then paste the same markup into every page. Mobile Menu (from `00-global.md`) becomes a simple hidden-by-default `<nav class="wf-mobile-menu">` block toggled by a small inline `<script>` — a wireframe only needs the toggle to work, not real animation.

### 5.4 Layout labels — the designer's handoff view

Clicking the **Layouts** button toggles `.wf-labels` on `<body>`, which outlines every block carrying a `data-wf-layout` attribute and stamps its source id on the top-left corner — `hero-sections/hero section 12`, `feature-sections/feature section 55`, and so on. Toggle it off and the page reads as a clean wireframe again.

This is the handoff mechanism: a designer opens the HTML, flips labels on, and reads straight off the page which section of the source kit to pull for each block, instead of guessing from a screenshot or digging through HTML comments. Because the label is `content: attr(data-wf-layout)`, it can never drift from the attribute — there is no second copy of the name to keep in sync.

The whole feature is 25 lines of CSS plus one inline `onclick`. No script file, no dependency, works from `file://`.

### 5.5 Heading line breaks — no lone words, no split sentences

A heading must never leave one word alone on its last line under a fuller line ("One standard of / care."), and a line must never end one sentence and start the next ("Two care / areas. One / standard of care."). Both misread and look broken. `text-wrap: balance` (in the stylesheet above) evens line lengths but ignores meaning, so author the breaks in every heading:

- `&nbsp;` after short function words — a, an, the, and, or, of, to, for, in, on, at, by, with, from, into, your, our, its, their, & — and between the last two words of each sentence: `One standard of&nbsp;care.` No glue after a comma.
- Keep each glued chain ≤ 18 characters; longer chains overflow narrow columns on mobile. Release the leftmost function-word glue first, the last-two-words glue last.
- Two or more sentences: wrap each in `<span class="wf-phrase">`, so lines break only between sentences. Use `.wf-phrase` also for a group that must stay whole but is too long to glue (a product variant after the brand: `Nür <span class="wf-phrase">Premium Maxi</span>`); it wraps inside itself instead of overflowing.
- Pseudo-element suffixes on titles (`::after { content: " →" }`) use a no-break space: `content: "\00a0→"`.
- Don't use `text-wrap: pretty` for headings: Chrome only reshapes the last lines of long paragraphs and leaves 2–3-line headings untouched (about twice the defects of `balance` measured on a 43-page build); Firefox lacks it.

Example: `<h2 class="wf-h2"><span class="wf-phrase">Two care&nbsp;areas.</span> <span class="wf-phrase">One standard of&nbsp;care.</span></h2>` renders "Two care areas. / One standard / of care." in a narrow column and "Two care areas. / One standard of care." on mobile.

## 6. Output

- `wireframes/wireframe.css` — one file, project-wide.
- `wireframes/[NN]-[slug].html` — one per page in `pages/`, same `NN` and `slug` as the source `.md`.
- `wireframes/index.html` — links to every generated page **plus a layout manifest**: one row per section, listing which library layout it used. That table is the designer's shopping list — everything they need to pull from the source kit, in page order, without opening each page. Include the catalog-only-mode comment here if it applied.

```html
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>[Project] — Wireframes</title><link rel="stylesheet" href="wireframe.css"></head>
<body>
<div class="wf-container" style="padding-top:48px">
<h1 class="wf-h1">[Project] — Wireframe Preview</h1>
<p class="wf-body">Open any page and press <strong>Layouts</strong> (bottom right) to see the source layout id on each section.</p>

<h2 class="wf-h2">Pages</h2>
<ul>
  <li><a href="01-home.html">Home</a></li>
  <li><a href="02-about.html">About</a></li>
</ul>

<h2 class="wf-h2">Layout manifest</h2>
<table class="wf-manifest">
  <thead><tr><th>Page</th><th>Section</th><th>Library layout</th></tr></thead>
  <tbody>
    <tr><td>01-home</td><td>Hero</td><td>hero-sections/hero section 12</td></tr>
    <tr><td>01-home</td><td>Room Preview Cards</td><td>feature-sections/feature section 25</td></tr>
  </tbody>
</table>
</div>
</body>
</html>
```

Add this to `wireframe.css` for the manifest table:

```css
.wf-manifest { border-collapse: collapse; width: 100%; font-size: 14px; margin-bottom: 64px; }
.wf-manifest th, .wf-manifest td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--wf-gray-200); }
.wf-manifest th { font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: var(--wf-gray-500); }
.wf-manifest td:last-child { font-family: ui-monospace, "Cascadia Mono", Consolas, monospace; color: var(--wf-accent); }
```

Build the manifest rows by reading back the generated pages rather than from memory — `grep -oE 'data-wf-layout="[^"]*"' wireframes/*.html` gives page + id for every row, so the table can't drift from what was actually rendered.

## 7. Validation checklist (before reporting done)

1. Every `##` section in every source `pages/*.md` is either rendered or has a `<!-- skipped: ... -->` comment — none silently dropped.
2. Every rendered section has both a `<!-- section: ... | layout: category/id -->` comment and a matching `data-wf-layout="category/id"` attribute, and that `category/id` resolves to a real entry in `references/library-catalog/`. Counts must agree: `grep -c 'data-wf-layout=' [page].html` equals `grep -c '| layout:' [page].html`.
2b. Every page ends with the `wf-label-toggle` button, and the manifest table in `index.html` has one row per `data-wf-layout` occurrence across all pages.
3. No layout id is reused twice within the same page. Entry ids contain spaces (`hero section 12`), so match up to the comment close, not the first space: `grep -oE 'layout: [^|]*-->' [page].html | sed 's/ -->//' | sort | uniq -d` should return nothing.
4. `grep -ri 'lorem ipsum' wireframes/*.html` returns nothing — all copy comes from the content brief, not placeholder text.
5. Every internal link (`href="..."`) in header/footer/CTA points to a sibling `.html` file that actually exists in `wireframes/`.
6. Open `wireframes/index.html` in a browser (or screenshot it) and spot-check 2–3 pages against their source `.webp` layouts.
7. Headings break by meaning (§5.5). In a browser at 390, 768, 1024 and 1440, no `h1`–`h4` has a single word on its last line under a line of two or more words, no line holds the end of one sentence and the start of the next, and no word sticks out past the heading box. Probe each page with this snippet (returns the offending headings; empty array = pass):

   ```js
   [...document.querySelectorAll("h1,h2,h3,h4")].filter(h => h.getClientRects().length).flatMap(h => {
     const words = [], tw = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
     for (let n = tw.nextNode(); n; n = tw.nextNode()) for (const m of n.textContent.matchAll(/[^\s\u00a0]+/g)) {
       const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
       const q = r.getClientRects(); if (q.length) words.push({ w: m[0], top: q[0].top, right: q[q.length - 1].right });
     }
     const lines = [];
     for (const w of words) { const l = lines.at(-1); if (l && Math.abs(l.top - w.top) < 6) l.ws.push(w.w); else lines.push({ top: w.top, ws: [w.w] }); }
     const k = lines.length, bad = [];
     if (k > 1 && lines[k - 1].ws.length === 1 && lines[k - 2].ws.length > 1) bad.push("lone last word");
     if (lines.slice(0, -1).some(l => l.ws.slice(0, -1).some(w => /[.?!]$/.test(w) && !/^\d+\.$/.test(w)))) bad.push("sentence split");
     if (words.some(w => w.right > h.getBoundingClientRect().right + 2)) bad.push("overflow");
     return bad.length ? [lines.map(l => l.ws.join(" ")).join(" / ") + " — " + bad.join(", ")] : [];
   })
   ```

Report to the user: how many pages generated, how many sections skipped and why, whether the library was used or catalog-only mode kicked in, and the path to `wireframes/index.html` to open.
