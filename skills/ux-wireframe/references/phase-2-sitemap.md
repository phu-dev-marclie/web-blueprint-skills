# Phase 2 — `sitemap.md`

Defines **which pages exist**, how they relate, and **what each section must achieve**.
Written for an AI reader: explicit legend, stable codes, no prose.

## Required sections

### §0 Legend
```
├─ / └─   parent–child
[T:xxx]   template type — pages sharing a template share the section list
[W]       built in the wireframe   [C] has a content .md   [gen] rendered from template + data
[nav]     in header nav            [foot] in footer
{n}       production instance count
★         representative page of its template
```
Template codes — pick what the archetype needs, add your own when none fits:

| Family | Codes |
| --- | --- |
| any site | `T:home` `T:hub` `T:editorial` `T:contact` `T:funnel` `T:legal` `T:utility` |
| offering | `T:collection` (category/area landing) · `T:pdp` (item detail) · `T:plp` (filterable listing, commerce) |
| service | `T:service` · `T:process` · `T:team` · `T:booking` |
| saas | `T:feature` · `T:pricing` · `T:integration` · `T:docs-hub` |
| editorial | `T:blog-index` · `T:blog-post` · `T:topic` · `T:author` |
| portfolio / nonprofit | `T:case` · `T:case-index` · `T:cause` · `T:donate` |
| commerce extras | `T:cart` · `T:account` |

### §1 Site tree
ASCII tree covering **every** URL incl. funnel, utility and legal pages. Each node carries
its flags; mark the representative page of each template with `★`.

### §1b Page-type gap analysis (reference IA)
Compare the tree with the page-type inventory of 1–3 established references (their
`sitemap.xml`, phase 1). One row per page type the references have and this site lacks:

| Page type (reference example) | Need for this client? (persona · evidence) | Decision | Content available? |
| --- | --- | --- | --- |
| Product safety notices (coloplast.com/campaigns/discontinuation-…) | professionals, regulated product | build now | process unknown → §11 |
| Investor relations | private company | not relevant | — |
| News | no articles exist | phase 2 (not built, not linked) | — |

Decisions: **build now** · **phase 2** (not built, not linked) · **not relevant** (say why).
When the run is interactive, offer the "build now" candidates to the user as numbered
options before committing — they change scope.

**Guides, journals, inspiration (any archetype).** A destination/area guide, journal or
resource library is a **blog**, not a landing page: `T:blog-index` with a keyword search and
facets, and one `T:blog-post` per article. Plan it like a catalogue:
- **Facets:** the site's own persona values first (the same values the offering is filtered by,
  e.g. a rental's "Who's travelling" → articles and stays share `?za=`), then topic, season /
  occasion, and distance or effort when place matters. Search over title, excerpt and
  `data-keywords` synonyms (other languages, spellings without accents).
- **Articles** come from a research step (search-demand evidence, competitor guide IA, a fact
  sheet with a source per fact) and each one recommends 2–3 matching offerings with a
  one-line reason, plus a link to the pre-filtered listing. Index and articles are one data
  family: `render.py` renders the index from the same records (`"index"` block), so cards
  are never copied by hand.
- No author bylines unless a real person is named by the client; show "checked {month year}"
  and the sources on each article.

### §2 Page counts and sources
Table: group · unique templates · production instances. Then the explicit list of files:
*authored* (bespoke composition) or *generated* (family = template + data file). Every page
that is linked is one of the two — **no placeholder pages**. Pages without real content are
phase 2 and not linked.

### §3 Section map — the core
`§3.0` global header (G1…) and `§3.0b` global footer (F1…), then one table per template:

| # | Section | Content it carries | Purpose (persona · conversion) |
| --- | --- | --- | --- |
| H1 | `opening` | brand promise, primary + secondary CTA, key visual | positioning → explore / enquire |

This phase decides **what** each section achieves, not **how it looks**. Phase 3 may merge,
split or reorder sections — it then updates this table so both files agree.
Section codes are letter+number keyed to the template; they are the contract between content
files and fragments.

### §4 Selection specification
How visitors narrow the offering. Choose by archetype and volume:
- **Guided chooser** (brand, service, saas): questions, answer values, result mapping
  (`data-when`), what happens to items without the data.
- **Filter rail** (commerce, large catalogues): every group, UI type and value + sort options.
- **Plan comparison** (saas): rows = capabilities, columns = plans.
Counts and mappings must be computed from SSOT §3, not estimated.

### §5 Internal linking rules
Numbered, checkable, adapted to the archetype. Always include:
1. Breadcrumb on every page except home; its parent = the page's nav group.
2. The primary conversion is reachable from every template.
3. Every hub links all its children; every detail page links its parent and ≥3 siblings.
4. Every authored page is reachable from the header or footer (checked by `qa.py`).

### §6 File mapping
content file ↔ page ↔ wireframe file (or data file ↔ template ↔ generated pages).

### §7 Redirect map
Old URL → new URL for every page family in the old sitemap, per locale. Flag spelling fixes
and localised slugs.

## Rules
- Slugs come from SSOT §3; derived URLs are marked `[derived]`.
- Section order in §3 is the scroll order once phase 3 confirms it.
- Keep intent-based entry points (by need, by situation, by role) — high SEO and UX value.
- When pages are added later, update §1, §2, the IA table (phase 3 §6) and the partials in
  the same change.
