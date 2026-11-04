# Process — Wireframe Content Brief

The 5-phase workflow in detail (Phase E is optional). Read once when starting a new project; then refer back per phase as needed.

---

## Phase A — Foundations (do once)

The goal: a small set of reference files the rest of the project reads from. Five files. None are user-facing; they exist so every page generator (you, AI, or a different operator next month) writes consistent copy.

### A.1 — Triage what the user already has

Before writing anything, find out:

- Does the user have an existing brand voice doc? Style guide?
- Do they have a reference website (existing site or competitor)?
- Do they have product/business facts written down anywhere?
- Do they know their target personas?

If yes to any: read the source first, extract observations, fill the templates with what's there. If no to all: use `(mockup)` placeholders and tell the user to fill the facts later.

### A.2 — Fetch the reference site if there is one

If the user names a website (own or competitor), use WebFetch on the homepage and 3–5 key subpages. Extract:

- Page list (the nav reveals it)
- Specs visible in copy (capacity, dimensions, distances, materials)
- Service list (what's offered, what's add-on)
- Existing CTAs and their wording
- Contact details
- Tone signals (formal/casual, jargon level)

Write what you find into `_foundations/facts.md` as the source of truth.

### A.3 — Write the foundation files

In order:

1. **`CLAUDE.md`** — copy from `templates/CLAUDE.template.md`, fill in project name. This is the AI entry-point: whoever generates pages reads this file first.

2. **`_foundations/facts.md`** — every fact, every spec, every service. Mark `(mockup)` next to anything you guessed or filled with a placeholder. Keep an "Open questions" section at the bottom listing what the user still needs to confirm.

3. **`_foundations/brand-voice.md`** — voice rules. Blacklist (words to avoid), whitelist (preferred phrasings), tone keywords, sentence rhythm guidance. Always include "convey quality through specifics, not labels."

4. **`_foundations/personas.md`** — 2–4 personas with: who they are, what they want, what makes them hesitate, copy hooks that resonate. Map each page to a primary persona later.

5. **`_foundations/ux-patterns.md`** — CTA labels (primary, secondary, tertiary), form fields, error messages, success states, empty states. Be exhaustive — the form page in Phase C will use this file as its dictionary.

Stop and ask the user to skim before moving to Phase B. Misalignment caught here saves hours later.

---

## Phase B — Sitemap

The goal: a complete page tree and a generation plan.

### B.1 — Design the IA

Open `templates/sitemap.template.md`. Fill in:

- Page tree (header nav, footer nav, hidden pages like `/thank-you`)
- Page purposes (one sentence each)
- Sections per page (the H2 list)
- Conversion funnel (which CTAs trigger which pages)

For each page, decide:
- Primary persona (from `personas.md`)
- Primary CTA (from `ux-patterns.md`)
- Whether it needs special section types (form, FAQ, gallery, reviews)

**If the project will run Phase E**, also annotate each section with its target layout *category* (`Hero → hero-sections`, `Reviews preview → testimonials-sections`). Read `references/library-catalog/INDEX.md` once — 43 rows with a "when to use" column — and map from `WIREFRAME.md` §3. Category only, never a specific layout id: the category is a structural commitment content should be written to fit, while the id depends on how much content actually gets written and stays a Phase E decision.

This is the cheapest place to catch two problems: a section type the library has no category for, and a page that turns out to be five card-grids stacked on each other. Both are a two-minute sitemap edit here and a rewrite later.

### B.2 — Write the plan

In `plan.md`, list every page in generation order. Order recommendations:

1. Primary conversion page first (the form, the checkout) — every other page's CTA points here, so define it early.
2. Home next — touches every other page.
3. Product / service pages (`The Villa`, `Pricing`, `Features`) — the meat.
4. Trust pages (Reviews, About, Gallery, Location).
5. Resource pages (FAQ, Blog, Resources).
6. Functional pages (Contact, Thank you).
7. Legal last (House Rules, Cancellation, Privacy, Terms).

Stop and confirm the plan before generating.

---

## Phase B.5 — Global elements (header + footer)

The goal: one `pages/00-global.md` that captures every element appearing on every page — header navigation, mega menu, mobile menu, footer, newsletter, legal bar.

### B.5.1 — Pull nav from the sitemap

The header and footer nav are projections of the page tree. Open `sitemap.md`, read the page list, group it.

For **header**:
- Pick 4–8 top-level pages for the simple header. If more than 8 deserve nav presence, design a mega menu instead.
- The header's primary CTA is the project's primary CTA — pull from `_foundations/ux-patterns.md`.

For **mega menu** (when site has > 10 pages):
- Group pages into 2–4 columns. Common groupings: by section type (Rooms / Experiences / Plan Your Stay), by audience (For Families / For Couples / For Groups), by funnel stage (Explore / Decide / Book).
- Optionally add a "Featured" right-side panel highlighting one product or seasonal offer.

For **footer**:
- Column count: 2 (small site) / 3 (medium) / 4 (large).
- Brand column always first: logo + tagline + 1-sentence description + social links.
- Contact column always present: email, phone, address, hours.
- Newsletter is optional — skip the block entirely if there isn't one.
- Legal bar at the bottom: copyright + privacy + terms + any project-specific legal pages.

### B.5.2 — Mobile menu

If mobile collapses sub-pages under accordion groups (common for sites with sub-pages like `/the-villa/master-suite-sea`), write a separate `## Mobile Menu` section showing the nested structure. If mobile nav is just the desktop nav rearranged, skip — designer infers it.

The mobile primary CTA often uses a shorter label (`Check Dates` instead of `Check Availability`) for the sticky bottom bar. Note it.

### B.5.3 — Write the file

Use `templates/global-elements.template.md`. Mirror `examples/villa-t-global-elements.md`. Save to `pages/00-global.md` — the `00-` prefix puts it first in sorted listings.

### B.5.4 — Confirm with user

Show the user the file. Validate that every nav link maps to a real page in `sitemap.md`. Common slip: linking to `/services` when the sitemap has `/our-services`.

---

## Phase C — Page generation

The goal: one `pages/[NN]-[slug].md` per page, all in the compact format.

### C.1 — Before the first page, read FORMAT.md

Strict format. Read once, follow consistently. The skill rests on this format — if every page differs in structure, the designer can't paste anything reliably.

### C.2 — Generate pages one at a time

For each page in the plan:

1. Re-read the section design for that page in `sitemap.md`.
2. Re-read `_foundations/brand-voice.md` blacklist and `_foundations/ux-patterns.md` CTA labels.
3. Write the page following the structure in `FORMAT.md`.
4. Self-check: no italic, no blacklist words, CTAs match the standard labels.
5. Confirm to the user, ask if anything needs editing.

### C.3 — Forms are special

Form pages (`/check-availability`, `/contact`, signup, checkout) use a different sub-format because they describe form fields, not paragraph content. Use `**Label:**`, `**Placeholder:**`, `**Helper:**`, `**Required:**` pattern. See `FORMAT.md` § form-section.

### C.4 — Reviews and FAQ have compact patterns too

- Reviews: `` #### Author Name, City — `Tag` `` then `> Quote` (3 lines per review).
- FAQ: `#### Question text?` then plain answer (3 lines per question).

Don't number reviews as `#### Review 1`, `#### Review 2`. Don't use `**Q:**`/`**A:**` prefixes. The H4 carries the role.

---

## Phase D — Bundle and validate

The goal: ship-ready package.

### D.1 — Build `_master.md`

Concatenate every page into one file with a table of contents and anchors. A designer using a Figma plugin like CopyDoc or Content Reel can load one file and parse all pages.

Bash one-liner:
```bash
cd pages
{
  echo "# Project — Master Content Bundle"
  echo ""
  echo "## Table of contents"
  for f in $(ls [0-9]*.md | sort); do
    title=$(grep -m1 '^# ' "$f" | sed 's/^# //')
    slug=$(echo "$f" | sed 's/\.md$//')
    echo "- [$title](#$slug)"
  done
  echo ""
  for f in $(ls [0-9]*.md | sort); do
    slug=$(echo "$f" | sed 's/\.md$//')
    echo "---"
    echo ""
    echo "<a id=\"$slug\"></a>"
    echo ""
    cat "$f"
    echo ""
  done
} > _master.md
```

### D.2 — Blacklist validation

Grep every page for blacklist words (pull the actual list from `_foundations/brand-voice.md` — the one below is the default):

```bash
grep -inE 'luxury|luxurious|5-star|world-class|best|amazing|incredible|breathtaking|stunning|unforgettable|magical|paradise|sanctuary|oasis|haven' pages/*.md
```

Zero hits expected. Any hit → fix the page, not the list.

### D.3 — Format validation

```bash
# italic anywhere (asterisk not part of ** bold)
grep -nE '(^|[^*])\*[^*]+\*([^*]|$)' pages/*.md
# label-colon pattern outside form blocks (Label:/Placeholder:/Helper:/Required:/Options: are allowed)
grep -nE '^\*\*[A-Z][a-z]+:' pages/*.md | grep -vE 'Label|Placeholder|Helper|Required|Options'
# emoji
grep -nP '[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]' pages/*.md
```

All three should return nothing.

### D.4 — Report

Tell the user:
- Number of page files + `_master.md` built
- Line count per page and total (`wc -l pages/*.md`)
- Validation results (blacklist clean / format clean)
- What to do next: load `_master.md` into a Figma text plugin (CopyDoc, Content Reel), or continue to Phase E for HTML wireframes.

---

## Phase E — HTML wireframes (optional)

The goal: browser-previewable HTML — one `wireframes/[NN]-[slug].html` per page plus `wireframes/index.html` — built from real layouts in the `wireframe-library/` image set rather than invented structure. Only run this phase when the user actually asks for an HTML wireframe, a mockup to open in a browser, or a preview — it is a distinct deliverable from the content brief.

Full spec lives in `WIREFRAME.md` at the skill root. This section is the step sequence; `WIREFRAME.md` has the detail (mapping table, selection algorithm, embedded CSS, validation checklist) referenced at each step.

### E.1 — Check conditions and resolve the library path

Confirm Phase D is done (`pages/*.md` validated). Resolve the library path per `WIREFRAME.md` §2: check `Wireframe library:` in the project `CLAUDE.md`, fall back to `<project-root>/wireframe-library/`, or drop into catalog-only mode if neither exists. Read `references/library-catalog/INDEX.md` once, up front.

### E.2 — Write `wireframes/wireframe.css`

One file, written once per project, from the stylesheet in `WIREFRAME.md` §5.1. Every page links it; never duplicate styles inline per page. Extend it only when a specific layout needs a class that doesn't exist yet.

### E.3 — Generate each page

For every `pages/[NN]-[slug].md` in order:

1. Walk its `##` sections top to bottom.
2. For each section, map it to a library category (`WIREFRAME.md` §3), then run the selection algorithm (`WIREFRAME.md` §4): filter by content fit, prefer matching weight/height, enforce the no-repeat-layout-per-page rule, then **Read the chosen `.webp`** before writing that section's HTML (skip the Read only in catalog-only mode).
3. Write the section HTML with its `<!-- section: ... | layout: category/id -->` traceability comment, or a `<!-- skipped: ... -->` comment if no category fits.
4. Render the shared header/footer from `pages/00-global.md` on every page (§5.3).
5. Save as `wireframes/[NN]-[slug].html`, same numbering and slug as the source `.md`.

### E.4 — Build `wireframes/index.html`

A plain page linking every generated `.html` file, per the template in `WIREFRAME.md` §6. Note catalog-only mode in an HTML comment at the top if it applied.

### E.5 — Validate and hand off

Run the full checklist in `WIREFRAME.md` §7 (no orphaned sections, every layout comment resolves, no repeated layout id per page, no leftover Lorem ipsum, internal links resolve). Then tell the user how many pages were built, how many sections were skipped and why, whether the image library was used or catalog-only mode kicked in, and the path to open `wireframes/index.html`. Pause here — this is the last phase.