---
name: wireframe-content
description: Generate wireframe-ready website content briefs in compact markdown format, and optionally render them as browser-previewable HTML wireframes using a 890-layout image library — pages organized by section with headings, cards, tags, and buttons that paste directly into Figma frames, or as full HTML pages ready to open in a browser. Use this skill whenever the user wants to plan website content for design, generate page-by-page copy for wireframes or mockups, build a content brief for a new website, write a sitemap with section-level content, organize site copy so a designer can lay it out in Figma, or generate an HTML wireframe / wireframe preview for a website. Triggers on phrases like "content for a website", "wireframe content", "Figma content", "website copy plan", "site sitemap", "page-by-page content", "landing page content brief", "build content for my Figma mockup", "HTML wireframe", "wireframe preview", "browser preview of my site structure", or any task that turns site information into structured per-page copy or a previewable wireframe. Also triggers when the user has a website concept and needs structured content before design, even if they don't say "wireframe" — if the goal is "design later in Figma" or "preview in a browser", apply this skill.
---

# Wireframe Content Brief

Produce **wireframe-ready website content** in compact markdown — every page organised by section, with element types (heading, subtitle, body, card, tag, button) clearly distinguishable so a designer can paste each block straight into a Figma frame. Optionally continue into **HTML wireframes** — real browser-previewable pages built from a 890-layout reference library, one HTML file per page.

This skill captures a 5-phase workflow proven on a full villa-rental site (21 pages). The same workflow generalises to any conversion-focused website: rental, e-commerce, SaaS, agency, restaurant, portfolio.

---

## When to use this skill

Use whenever the user wants to **plan and write website content for design**. Signals:

- "I'm designing a website, I need content"
- "Wireframe / Figma mockup content"
- "Sitemap with copy"
- "Page-by-page content brief"
- "Landing page sections + copy"
- "Help me write content for [X] website"
- Provides a reference website and asks for content
- Plans a website and asks where to start

Don't use this skill when:

- The user wants finished marketing copy in long-form prose (use a draft-content skill)
- The user wants only SEO meta or only one short section of microcopy
- The user wants visual design recommendations — colors, fonts, spacing decisions (this skill is **content-first**: Phases A–D produce copy only; the optional Phase E produces structural HTML wireframes from a reference layout library, never a finished visual design)

---

## How to apply the skill

The workflow has five phases (the fifth is optional). Pause for user input at the end of each phase before moving on.

### Phase A — Foundations (set up once per project)

Create a `content/` directory (or whatever the user prefers) with these files. Use the templates in `templates/`:

1. `CLAUDE.md` — short AI entry-point (which files to load, hard format rules)
2. `_foundations/brand-voice.md` — tone, blacklist/whitelist vocabulary
3. `_foundations/facts.md` — single source of truth about the business; use `(mockup)` markers for unknowns instead of inventing
4. `_foundations/personas.md` — 2-4 customer personas with hooks and pain points
5. `_foundations/ux-patterns.md` — standard CTA labels, form fields, error messages, microcopy

If the user has a reference website, fetch it first (WebFetch the homepage + key subpages) and pre-fill these files from observed facts. If not, ask the user to fill them or accept `(mockup)` placeholders.

**Don't skip Phase A.** Every page in Phase C depends on these foundations being readable as a source of truth.

### Phase B — Sitemap

Design the information architecture: page tree, what lives where, conversion funnel. Use `templates/sitemap.template.md`. Write a `plan.md` that lists every page in generation order. See `PROCESS.md` for the full method.

### Phase B.5 — Global elements (header + footer)

Once the sitemap is locked, generate the global elements that appear on every page: **header navigation** (or mega menu), **mobile menu** if it differs, and **footer** with brand block, navigation columns, contact, optional newsletter, and legal bar.

Output to `pages/00-global.md`. Use `templates/global-elements.template.md` and reference `examples/villa-t-global-elements.md`. Pull every link from `sitemap.md` — don't invent pages that don't exist.

Pick the right header pattern:
- **Simple header** when 4–8 top-level pages fit on one row
- **Mega menu** when the site has more than ~10 pages that benefit from grouping
- **Mobile menu** as its own block when mobile collapses sub-pages under accordion groups

This step is small but load-bearing — every page generated in Phase C references the navigation, the social handles, and the legal nav.

### Phase C — Page generation

For each page in the plan, write `pages/[NN]-[slug].md` in the compact format defined in `FORMAT.md`. **Read `FORMAT.md` before writing the first page** — the format is strict and not obvious.

Hard rules during generation:
- No SEO meta blocks, no OG image, no alt text, no internal-link section, no "NEEDS_INPUT" lists
- No italic `*...*` anywhere
- No `Heading: value` label-colon pattern
- Tags as `` `Tag` ``, buttons as `**[ Button label ]**`, quotes as `> ...`
- One section per `##`, section break `---`
- Self-check for blacklist words before saving

### Phase D — Bundle and validate

Concatenate every page into `pages/_master.md` (one big file for Figma plugins). Run a blacklist grep to catch slips. Report line counts so the user sees the saving from compact format.

### Phase E — HTML wireframes (optional)

Turn the finished content brief into browser-previewable HTML — one `wireframes/[NN]-[slug].html` per page plus `wireframes/index.html`, built from a 890-layout reference image library (`wireframe-library/` + `references/library-catalog/`) instead of inventing structure from scratch. Only run this when the user asks for a wireframe preview, an HTML mockup, or something to open in a browser — it's a separate ask from the content brief itself.

**Read `WIREFRAME.md` in full before generating the first HTML page** — it has the section→layout mapping table, the selection algorithm, the embedded CSS, and the validation checklist. Don't skip straight to writing HTML from memory; the whole point of Phase E is picking real layouts from the catalog, not reinventing generic ones.

Every heading must break by meaning: no single word stranded on the last line, no line that ends one sentence and starts the next. Apply `WIREFRAME.md` §5.5 (`&nbsp;` glue + `.wf-phrase` per sentence) while writing each page, and run the §7 heading probe before reporting done.

---

## What "compact format" means

The format is the deliverable. Read `FORMAT.md` for the full spec. Quick mental model:

- The markdown file is a **content brief**, rendered nicely when previewed.
- Section labels (`## Hero`, `## Welcome`) are document-level anchors.
- Headlines (`### ...`) are what the user reads on the website.
- Subtitles are plain paragraphs immediately below headlines (no italic, no `Subtitle:` prefix).
- Cards and items collapse into a single H4 line: `` #### `Tag` · Card title ``.
- FAQ questions go directly into H4: `#### How do I check availability?`
- Reviews put author and tag inline: `` #### Sarah & Tom, London — `Couples · June 2025` ``.
- Buttons appear as `**[ Button label ]**` and tags as `` `Tag` ``.

This is intentional. Designers paste the block into a Figma text layer and visually re-style — they don't want SEO meta or markdown noise mixed in. Tokens are also conserved: roughly 30% smaller than the verbose `Heading:`/`Subtitle:` pattern.

---

## Resources in this skill

- `PROCESS.md` — the 5-phase workflow in detail (read once per new project)
- `FORMAT.md` — the output format spec including header / mega menu / footer (read before generating the first page)
- `WIREFRAME.md` — the Phase E spec: section→layout mapping, selection algorithm, embedded CSS, output + validation (read before generating the first HTML wireframe page)
- `templates/` — drop-in templates for each foundation file plus `global-elements.template.md` for header & footer
- `examples/villa-t-home.md`, `examples/villa-t-faq.md`, `examples/villa-t-check-availability.md`, `examples/villa-t-global-elements.md` — complete real-world page outputs in this format. When unsure, mirror the example.
- `references/conversion-patterns.md` — CTA patterns, funnel design, persona hooks (read when designing conversion flow)
- `references/library-catalog/` — machine-readable catalog of all 890 layouts in `wireframe-library/` (`INDEX.md` + 43 category files), used only by Phase E

---

## Generalising to other website types

The workflow is universal; only the IA and personas change. Some defaults to consider:

- **Rental / booking / hospitality** — primary CTA = `Check Availability` / `Request a Quote`; key pages = Home, About, Rooms, Amenities, Services, Eat & Drink, Location, Rates, FAQ, Gallery, Reviews, Contact + a form page.
- **E-commerce** — primary CTA = `Add to Cart` / `Buy Now`; key pages = Home, Shop, PDP, About, Lookbook, Reviews, FAQ, Cart, Checkout, Account.
- **SaaS** — primary CTA = `Start Free Trial` / `Book a Demo`; key pages = Home, Product, Features, Pricing, Customers, Resources, About, Sign up.
- **Agency / consultancy** — primary CTA = `Book a Call` / `Start a Project`; key pages = Home, Services, Case Studies, About, Team, Insights, Contact.
- **Restaurant** — primary CTA = `Reserve a Table` / `Order Online`; key pages = Home, Menu, About, Private Dining, Press, Contact.

If the user doesn't tell you what type, ask one quick question to pick the right defaults.

---

## What not to do

- Don't add a `> Content brief for the X homepage.` blockquote at the top of every page file — that's already in CLAUDE.md and just inflates tokens. The page name in `# H1` is enough.
- Don't invent facts. If the user hasn't told you the year founded or the founder's name, write `(mockup)` next to the placeholder value and list it in the "Open questions" section of `facts.md`.
- Don't deviate from `FORMAT.md`. Consistency across pages is the whole point — if one page uses a different card pattern, the designer can't paste reliably.
- Don't skip the pause at the end of each phase. Misalignment caught at the sitemap stage costs minutes; caught after 20 generated pages it costs hours.