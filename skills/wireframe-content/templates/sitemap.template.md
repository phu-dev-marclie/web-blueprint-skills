# Sitemap — [Project Name]

> Information architecture for the [Project Name] website. Source of truth for page generation in Phase C.

---

## 1. Site overview

- **Brand:** [name]
- **Primary conversion goal:** [e.g. submit form / add to cart / book a demo]
- **Primary CTA across site:** `[CTA label]`
- **Pricing strategy:** [public / by quote / hybrid]
- **Languages:** [primary, then phase-2 list]

---

## 2. Page tree

```
/
├── /about
├── /[product hub]                    ← e.g. /the-villa, /shop, /services
│   ├── /[product hub]/[sub-1]
│   ├── /[product hub]/[sub-2]
│   └── ...
├── /features (or /amenities)
├── /[differentiation page]           ← e.g. /eat-drink, /pricing, /case-studies
├── /gallery (if visual product)
├── /location (if geographic)
├── /rates (or /pricing)
├── /faq
├── /reviews (or /testimonials)
├── /[primary conversion]  ★          ← form, signup, cart
├── /contact
├── /thank-you (post-submit, noindex)
└── Legal
    ├── /house-rules (or /tos)
    ├── /cancellation (or /returns)
    ├── /privacy
    └── /terms
```

Adjust per project type. Conversion page (`★`) is non-negotiable.

---

## 3. Main navigation

`Home · [Product] · Features · Pricing · Gallery · Reviews · [Primary CTA] (button)`

---

## 4. Footer

- **Brand column:** Logo, tagline, 1-sentence description
- **Explore:** key product pages
- **Plan your stay / purchase:** rates, FAQ, location, legal
- **Contact:** email, phone, social, address
- **Bottom bar:** © YEAR · Privacy · Terms · Sitemap

---

## 5. Conversion funnel

```
Awareness         → Consideration         → Decision          → Action
─────────────       ──────────────────       ──────────────     ──────────────
Home Hero        →  Product / Gallery   →   Rates + FAQ     →  /[conversion]
SEO landing      →  About               →   Reviews            /contact (secondary)
```

Every page's primary CTA points to `/[conversion]`.

---

## 6. Page details

Per page, capture: purpose · primary persona · key sections.

**Layout category annotation (do this only if Phase E is planned).** Next to each section, note the library *category* it will draw from — `→ hero-sections`, `→ feature-sections`, and so on. Pick these from the 43-row table in `references/library-catalog/INDEX.md`, which is small enough to read in one pass. See `WIREFRAME.md` §3 for the section→category mapping.

Annotate the **category** here, never a specific layout id. The category is a structural commitment ("this is a card grid, not a split hero") that content should be written to fit; the exact id depends on how much content actually gets written, so it stays a Phase E decision. Two things this catches early, while a sitemap edit is still cheap:

- A section type the library has no category for — you find out now, not after 20 pages are written.
- A page that is six card-grids in a row — visible as repetition in this list long before it becomes six near-identical wireframes.

### 6.1 `/` Home

- **Purpose:** in 8 seconds, convey what the business is and one reason to take the CTA.
- **Primary persona:** all (balanced)
- **Sections (in scroll order):**
  1. Hero → `hero-sections`
  2. Stats / At-a-glance bar → `content-sections` (tags: stats)
  3. Welcome → `intro-sections` or `content-sections`
  4. Product preview cards → `feature-sections`
  5. Feature / amenities grid → `feature-sections` (tags: icon-grid)
  6. Services preview → `feature-sections`
  7. [Differentiation section] → `content-sections`
  8. Gallery teaser → `gallery-sections`
  9. Location preview (if applicable) → `content-sections`
  10. Reviews preview → `testimonials-sections`
  11. FAQ short → `faq-sections`
  12. Pre-footer CTA → `cta-sections`

### 6.2 `/about`

- **Purpose:** trust + story + team.
- **Primary persona:** [P3 / values-driven]
- **Sections:** Hero · Our story · Principles · Team · Promise · Sustainability · Pre-footer CTA

### 6.3 `/[product hub]`

- **Purpose:** show the product / inventory in full.
- **Primary persona:** [P1 / pragmatic]
- **Sections:** Hero · Layout / overview · Product cards (with sub-page CTAs) · Shared comforts · Best for · Pre-footer CTA

### 6.4 `/[product hub]/[sub-1]`

- **Purpose:** deep dive on one product / room / SKU.
- **Sections:** Hero · At-a-glance specs · Inside / inside the room · Features list · Best paired with · Pre-footer CTA

### 6.5 `/features` (or `/amenities`)

- **Sections:** Hero · Feature groups (with tag-prefixed items) · Pre-footer CTA

### 6.6 `/[differentiation page]`

- **Sections:** Hero · The differentiator (deep story) · Sample / demo · Pairing options · Pre-footer CTA

### 6.7 `/location`

- **Sections:** Hero · Neighbourhood · Distances table · Day trips · Getting here · Pre-footer CTA

### 6.8 `/rates`

- **If public pricing:** Hero · Tier table · What's included · How booking works · Cancellation summary · Pre-footer CTA
- **If by-quote pricing:** Hero · Why personalised pricing · What every quote includes · Add-ons on request · Minimum commitments · How booking works · Cancellation summary · Pre-footer CTA. **No prices shown.** Primary CTA = `Request a Quote`.

### 6.9 `/faq`

- **Sections:** Hero · Category 1 (3–5 Q&As) · Category 2 · Category 3 · Pre-footer CTA

### 6.10 `/gallery`

- **Sections:** Hero · Filter tabs · (Grid is visual, no copy) · Below-grid reassurance · Pre-footer CTA

### 6.11 `/reviews`

- **Sections:** Hero · Featured story · Recent stays (9–12 review cards) · External proof · A note from us · Pre-footer CTA

### 6.12 `/[primary conversion]`  ★

- **Sections:** Hero · Form · Submit states · Validation messages · Trust mini-blocks · Inline FAQ · Below FAQ (contact)
- **No pre-footer CTA on this page.**

### 6.13 `/contact`

- **Sections:** Hero · Two paths (booking vs other) · Contact form · Submit states · Direct details · Map · Pre-footer CTA

### 6.14 `/thank-you` (noindex)

- **Sections:** Hero · What happens next · While you wait · Add to calendar · Follow us · Bottom note
- **No pre-footer CTA.**

### 6.15 Legal pages

- House rules / TOS, Cancellation, Privacy, Terms — single H1 + numbered sections.

---

## 7. Persona mapping per page

(fill from `_foundations/personas.md`)

| Page | Primary persona | Secondary |
|---|---|---|
| Home | All four | — |
| About | | |
| [Product hub] | | |
| ... | | |

---

## 8. Open questions

Per-project questions to resolve before generation. Carry forward to user.

1. [question]
2. [question]
