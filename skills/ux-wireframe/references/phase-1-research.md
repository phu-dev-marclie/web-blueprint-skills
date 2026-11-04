# Phase 1 — Research → `Business-information.md`

Output is the **single source of truth (SSOT)**. Every later phase reads it first; every
on-screen fact must trace back to it. Research is where the wireframe gets its substance —
spend the effort here, in parallel.

## 1. Harvest (one parallel batch)

| Source | What to extract |
| --- | --- |
| Client files (`.md`, `.docx`, `.pdf`, chat logs, emails) | the brief's own words, decisions already made, offering list, constraints, deadlines |
| Old website — home, about, contact, one listing, one detail page | navigation, offering structure, proof used, contact/legal data, meta patterns, tone |
| Old website `sitemap.xml` / `sitemap_index.xml` | **complete** URL inventory, locales, slugs, page families, redirect sources |
| Platform data the site exposes (e.g. `/wp-json/…` store API, product feeds) | structured offering data — let a scout subagent turn it into JSON with a per-field source |
| Reference sites the client named | URLs and what the client said about each (teardown happens in phase 3) |
| Reference sites' `sitemap.xml` | **page-type inventory** of an established player — feeds the gap analysis in phase 2 |
| Sister / parent company sites | legal entity, certifications, contact data, channels the new site must hand off to |
| No references given? `web_search` 3–5 established players in the category + 1 outside it | expand the solution space; record why each was chosen |

Read 4–6 sources per block. Delegate long extractions (20+ detail pages) to a scout with a
fixed field list and the instruction "null when not stated; report contradictions".

## 2. Mandatory findings

- **Who is really behind the brand** — operator, legal entity, sister brands.
- **The offering** in the archetype's own terms (table below) with stable slugs and counts.
- **Proof that exists** (certifications, figures, cases, awards) — each with its source.
  What has no source is not proof.
- **The brief's language**, quoted verbatim: wanted adjectives, "must not feel like…",
  must-have sections, the client's favourite reference and why.
- **Channels** — where conversion happens (enquiry, booking, partner shop, app store) and
  what the site hands off to.
- **Contradictions and gaps** — two sources disagree, a page lacks data its siblings have,
  copy leaked from another market or supplier. Record both values; never pick silently.
- **Language contamination** — foreign words in nav/labels → `banned_terms`.

| Archetype (decided in phase 3, anticipated here) | §3 offering taxonomy holds |
| --- | --- |
| commerce | categories → products, variants, prices, stock |
| brand | care/product areas → product families → products, specs, indications |
| service | services → packages, process steps, service areas, team roles |
| saas | modules → features, plans/tiers, integrations, use cases |
| editorial | sections → topics → article types, authors (only real ones) |
| portfolio | disciplines → projects/cases, clients (with permission) |
| nonprofit | causes → programmes, ways to help, impact figures (sourced) |

## 3. File skeleton

```markdown
# Business Information — <BRAND>
> SSOT for <domain>. Meta/comments = <team language>. Displayed copy = <site language>.

## 0. Quick facts (YAML)        brand, legal entity, domains, market, languages, business model,
                                 offering summary, audiences, contact, design reference
## 1. Story                     summary · before/after (why redesign) · copy in 3 lengths
## 2. Business lines            tree with weight
## 3. Offering taxonomy         tree WITH slugs + counts; detail tables per item (fields + source)
## 4. Representative items      the 1–5 items that will be shown in full detail, with source URL
## 5. Audience                  persona table (need · trigger · matching CTA) + pain points
## 6. USPs & proof              each with source; "not a USP" list (site features)
## 7. Voice                     tone axes · do/don't · glossary (use ↔ never) · CTA set
## 8. Contact & legal           real data only + legal pages required
## 9. Direction                 brief quotes, references, channels, platform, redirects, decisions
## 10. SEO foundation           keyword clusters · meta templates · schema types
## 11. Open questions           numbered, status — the ONLY place unknowns live
## 12. Sources                  every input consulted
```

## 4. Rules

- **Never invent** people, quotes, figures, certifications, IDs, clients, countries served.
  Unknown → `[PLACEHOLDER — reason]` in this file and a row in §11, never on screen.
- **Claim scope is part of the fact.** Record which items a claim covers ("CE line on 15 of
  18 product pages"). A range-wide claim later needs evidence for every item.
- **§6 USPs are about the offering, the company or the service — never about the website.**
  Language versions, search, accessibility, responsiveness are site functions: never USPs,
  proof figures, trust badges or partner benefits.
- §3 slugs are final; sitemap and wireframe reuse them verbatim.
- §7.3 glossary and §7.4 CTA set are enforced downstream — make them exhaustive.
- Never copy credentials or personal data from client files.

## 5. Ask the user only when
Two viable directions with materially different cost and no evidence to choose between them.
Otherwise choose the conservative option and record it in §9. When asking, also accept a
plain-text answer (numbered options) — choice widgets can fail.
