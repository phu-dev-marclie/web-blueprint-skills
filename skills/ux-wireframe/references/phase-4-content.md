# Phase 4 — `content/*.md`

One file per detailed wireframe page, plus `_global-header-footer.md`. Copy is written
**into the compositions decided in phase 3** — the section list, order and `data-layout`
come from `design-direction.md §7`, so the words fit the shape (a ledger row needs a
6-word claim, a manifesto needs one long sentence, a chooser needs answer labels).

## File skeleton (mandatory)

```markdown
# <Page name> — Content

> Page: `/slug` · Template: `T:xxx` · Wireframe: `xxx.html`
> Source: Business-information.md + sitemap.md §3.x + design-direction.md §7.x

## SEO Meta
| Field | Value |
| --- | --- |
| Title (≤60) | … |
| Meta description (≤155) | … |
| H1 | … |
| Primary keyword | … |
| Secondary keywords | …, …, … |
| Canonical | https://domain/… |
| Schema | … |
| Breadcrumb | Home › … |

## Section Content

### [H3] `section-slug` · layout `ledger` — Section name
- **Eyebrow / Subtitle:** …
- **Heading (H2):** …
- **Short description:** 1–2 sentences
- **Body / Items:** bullets, table, or card list — shaped for the layout
- **CTA:** `Primary` → `/link` · `Secondary` → `/link`
- **Image brief:** the full art direction for the `.w-photo` (subject, role, setting, ratio, light)

## Claims ledger
| Claim on this page | Covers | Source (SSOT §) |
| --- | --- | --- |

## Internal links — check
| Rule (sitemap §5) | Satisfied by |
```

The **claims ledger** lists every factual statement a visitor could rely on (certification,
figure, duration, indication, availability, country, partner). "Covers" states its scope
(one item, a family, the whole range). A claim with no SSOT source is cut, not softened.

## Repeated items

Repeated units (cards, rows, steps, panels) are markdown tables so the wireframe renders
every field. Columns follow the layout, e.g. product card
`| Badge | Heading | Short description | Meta | CTA → link |`, ledger row
`| No. | Claim | Explanation |`, chooser result `| Condition | Recommended | Why |`.
Commerce product cards on a filterable listing also need the facet dataset
(`interactions-contract.md` §6).

## Writing rules

- Section rhythm: short eyebrow → benefit or question headline → 1–2 sentence lead → content.
  Vary it when the composition asks for it (a manifesto has no eyebrow; a quote has no H2 lead).
- Scannable: bullets ≤ 12 words, numbers in bold, tables over paragraphs for specs.
- FAQ and long-form SEO text are written **where design-direction places them** — they are
  not appended to every page by default. Hubs and category pages normally carry one SEO
  passage (250–400 words, can be the editorial intro); funnels and product pages normally don't.
- **One list per fact set.** The core facts (counts, amenities, distances, capacities) are listed
  once, where the reader decides (hero, catalogue, product page). Every other page tells them
  as a story for its own angle (the place, a day, who it suits, the area around) or links to the
  list. Two pages that differ only by name (two buildings, two branches) get two different
  stories, not one paragraph with the name swapped. A selector that duplicates a menu entry
  (e.g. "how many of you?" on the home page when the listing already filters by party size) is
  replaced by content and moved to the listing as a guide.
- **Story sections carry the SEO.** Home and hub pages get one story section (150–400 words with
  the primary keyword in the H2 and links into the site) and, when the site has a blog, a rail
  of 3 posts. Facts in a story still need a claims-ledger row.
- **A page needs a job no other page does.** A thin page whose sections already live elsewhere
  (a "Location" page = map + distances + directions + parking, when About, the home ruler and the
  guide already say it) is merged: its unique parts move to the page that owns the topic (map and
  site plan → About; directions → a guide article with route tabs), the URL gets a 301 to the new
  owner, and nav/footer/sitemap/content files lose it in the same pass.
- **Every CTA block has at most 2 buttons: primary + secondary.** The primary is the conversion
  (book, check availability, browse the list); the secondary is a reading step that fits the block —
  for blocks about the place, a hub article ("Why visit {place}") that links into every guide. A third
  route is a text link, not a button.
- Use only the CTA vocabulary from `Business-information.md §7.4` and the glossary §7.3.

### Write for the reader, never about the data
Every heading, lede, label and CTA speaks to the visitor about what they get. Copy must not
narrate how the page was produced or hedge about the source:

| Author/AI voice (wrong) | UX writing (right) |
| --- | --- |
| "All 21 products on one page, grouped by type, with the exudate level where the documentation states it." | H2 "The full range" · "Compare every dressing by exudate level." |
| "CE marking … as stated in the product documentation." | "Certificates and declarations of conformity are available on request for every product." |
| Row meta "Exudate not stated · 4 sizes" | "Superabsorbent · 4 sizes" (show what is known, omit the unknown) |

Uncertainty about a fact is resolved in the SSOT (§11), not voiced on the page: either state the
fact plainly because it is verified, or leave it out. Qualifiers a professional needs ("in
vitro", "the choice remains a clinical decision") are content — write them **once, into the
body sentence or the table heading they qualify**, never as a small note under a block or a
caption under an image, and never repeated under every result.
`qa.py` warns on typical author-voice phrases and on captions next to image slots; treat every
warning as a rewrite. Add project-specific phrases to `qa.config.json` `meta_phrases`.

**Don't sell the website.** Figures, proof lines, badges and benefits come from the product,
the company and the service. "Available in nine languages", "search our range", "accessible
website" are site functions — keep them in the language switcher, the language page or the
accessibility statement, never in a hero, a figure, a trust row or a partner benefit.

## Honesty rules

- Real data only; unknown facts → `[PLACEHOLDER — reason]` in the content file, resolved or
  removed before phase 5 (`qa.py` rejects the string in rendered HTML).
- Never invent people, testimonials, statistics, certifications, legal identifiers, client
  logos or countries served. Photos show roles, never names.
- **Claim scope:** a claim stated for a group must hold for every member. If 3 of 18 items
  lack the evidence, word it for the group that has it ("CE-marked dressings…") or move it to
  the item pages — never a range-wide badge.
- Regulated or sensitive domains (medical, financial, legal, food): use the verbs the evidence
  supports ("supports healing", not "heals"); never name an approval body or regulation that
  the sources do not name.
- Prices only for `commerce` archetype demos (mark invented ones).

## Scope control

- **Authored pages** (every single page that is linked): one content file each.
- **Generated families** (products, services, locations…): no content file per item — one
  `wireframe/data/<family>.json` with every item's fields taken verbatim from SSOT §3, plus
  the family's shared copy in the template. Missing fields are omitted (the template's
  optional blocks disappear), never filled with guesses.
State both explicitly in agent briefs or agents will write the whole catalogue by hand.

## Parallelisation

Split by page or template family. Every agent receives the same SSOT, glossary, CTA set and
the **design-direction page table for its page** — consistency comes from the shared files.
