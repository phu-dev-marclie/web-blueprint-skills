# Format — Compact Wireframe Content

The output format every page must follow. The format is the deliverable: it's how a designer reads the brief and pastes blocks into Figma.

Read this file once **before generating the first page**. Then mirror the example in `examples/villa-t-home.md`.

---

## Hard rules

| | Rule |
|---|---|
| 1 | Do not use `*italic*` anywhere. Subtitle / intro / tagline are plain paragraphs. |
| 2 | Do not use `Heading: ...` / `Subtitle: ...` label-colon pattern (except in form spec — see § form). |
| 3 | No SEO meta block, no OG image, no alt text, no internal-links list, no NEEDS_INPUT block in page files. |
| 4 | No code-fence ` ```text ` around paragraphs. |
| 5 | Tags / chips: `` `Tag` `` (backtick). |
| 6 | Buttons / CTA: `**[ Button label ]**` (bold + brackets). |
| 7 | Review quotes: `> Quote text` (blockquote). |
| 8 | Section break: `---` on its own line. |
| 9 | No emoji. |
| 10 | No words from the blacklist (`luxury`, `5-star`, `best`, `amazing`, etc.). |

---

## Markdown level convention

| Element | Markdown |
|---|---|
| Page name (top of file) | `# [Project] — [Page name]` |
| Section name | `## [Section name]` |
| Hero / section headline | `### [Headline text]` |
| Card | `` #### `Tag` · Card title `` (inline) |
| Item (icon grid, location list) | `` #### `Tag` · Item title `` |
| FAQ question | `#### Question text?` |
| Review | `` #### Author Name, City — `Tag (stay type · month)` `` |
| Step | `` #### `Step 1` · Step title `` |
| Field (form) | `#### Field 1` then `**Label:**` etc. |
| Body / paragraph | Plain text |
| Subtitle line (under heading) | Plain paragraph |
| Stats bar items | `**stat 1 · stat 2 · stat 3**` |
| Inline list (eg amenities tags) | `Stat 1 · Stat 2 · Stat 3` |

---

## Section types — templates

### Hero

```
## Hero

### [Big headline that sells the page in one sentence]

[Subtitle paragraph — one or two lines explaining the headline.]

**[ Primary button ]**  **[ Secondary button ]**
```

### Welcome / paragraph section

```
## Welcome

### [Section headline]

[Subtitle line.]

[Body paragraph 1.]

[Body paragraph 2 if needed.]

**[ Section CTA ]**
```

### Stats / inline bar

```
## Stats Bar — At a Glance

**stat 1 · stat 2 · stat 3 · stat 4**
```

### Cards section (rooms, services, features)

Use this pattern when each card leads to a **distinct page** the visitor can drill into (a room detail page, a feature detail page, a service detail page). Each card has its own CTA.

```
## [Section name]

### [Section headline]

[Subtitle line.]

#### `Tag` · Card title

Card description.

**[ CTA ]**

#### `Tag` · Card title

Card description.

**[ CTA ]**

**[ Section CTA ]**
```

### Icon grid section (amenities, features list)

Use this pattern when items are **informational only** (no detail page per item — they live inside this page). The section has one CTA at the end, items do not.

```
## [Section name]

### [Section headline]

[Subtitle line.]

#### `Tag` · Item title

Item description.

#### `Tag` · Item title

Item description.

**[ Section CTA ]**
```

**Quick test:** *"Does clicking this card take me to a new page?"* Yes → cards section. No → icon grid section.

### FAQ section

```
## FAQ

### [Section headline]

[Subtitle line.]

#### Question text?

Answer paragraph.

#### Question text?

Answer paragraph.

**[ See all FAQs ]**
```

### Reviews section

```
## Guest Reviews

### [Section headline]

[Subtitle line.]

#### Author Name, City — `Tag (stay type · month)`

> Quote text.

#### Author Name, City — `Tag`

> Quote text.

**[ Read more ]**
```

### Form section

Forms describe field structure, not paragraph content. Use this sub-format:

```
## The Form

### [Form headline]

[Form subtitle.]

#### Field 1

**Label:** Full name
**Placeholder:** Jane Doe
**Required:** Yes

#### Field 2

**Label:** Email
**Placeholder:** you@example.com
**Helper:** We'll reply here.
**Required:** Yes

#### Field 3

**Label:** Phone (optional)
**Placeholder:** +1 555 0100
**Required:** No

**[ Submit Button Label ]**

[Below-submit microcopy paragraph, if any.]
```

For dropdowns and checkbox groups, add `**Options:**` line with options separated by ` · `.

### Submit states sub-section (for forms)

```
## Submit States

### [Form headline]

What the submit button shows at each stage.

#### `Default` · [Default label]

The initial label.

#### `Loading` · Sending…

While the form is sending.

#### `Success` · [success behaviour]

What happens on success (e.g. redirect to /thank-you).

#### `Error` · Try Again

Shown if submit fails.
```

### Validation messages sub-section (for forms)

```
## Validation Messages

### What we show if something's missing

#### `Empty name` · We'd love a name to write back to.

Shown if the name field is left empty.

#### `Invalid email` · That email doesn't look right — please check.

Shown if email format is wrong.
```

### Header — simple navigation

For a small/medium site where 4–8 nav items fit on one row.

```
## Header

### Logo

[Brand name as text logo, or filename of logo asset]

### Navigation

- Home → `/`
- About → `/about`
- The Villa → `/the-villa`
- Amenities → `/amenities`
- Eat & Drink → `/eat-drink`
- Gallery → `/gallery`

### Primary CTA

**[ Check Availability ]** → `/check-availability`

### Utility (optional)

- Phone: `+385 91 396 6352`
- Instagram: `@brand` → `https://instagram.com/brand`
- Language: `EN` (if multilingual)
```

### Header — mega menu

For larger sites where the top nav opens dropdown panels with grouped links.

Each dropdown trigger gets its own `## Mega Menu — [trigger label]` section, with columns inside.

```
## Mega Menu — "The Villa" dropdown

### Column 1 — Rooms

- All bedrooms → `/the-villa`
- Master Suite — Sea View → `/the-villa/master-suite-sea`
- Master Suite — Old Town View → `/the-villa/master-suite-old-town`
- Standard rooms → `/the-villa/standard-rooms`

### Column 2 — The Villa

- Amenities → `/amenities`
- Services → `/services`
- Eat & Drink → `/eat-drink`
- Gallery → `/gallery`

### Column 3 — Plan Your Stay

- Location → `/location`
- Rates → `/rates`
- FAQ → `/faq`
- Reviews → `/reviews`

### Featured panel (optional, right side)

#### Eyebrow

Featured this season

#### Title

Master Suite — Sea View

#### Body

King-size bed, hot-tub bath, the Adriatic at the window.

**[ See the room ]** → `/the-villa/master-suite-sea`
```

If there are multiple mega menu triggers (e.g. "The Villa", "Experiences", "Plan Your Stay"), create one `## Mega Menu — [trigger]` section for each. Triggers that don't open a panel stay as a single link in `## Header → Navigation`.

### Mobile menu (optional)

For when mobile uses a hamburger panel different from desktop nav.

```
## Mobile Menu

### Sections

- Home → `/`
- About → `/about`
- The Villa
  - Master Suite — Sea View → `/the-villa/master-suite-sea`
  - Master Suite — Old Town View → `/the-villa/master-suite-old-town`
  - Standard rooms → `/the-villa/standard-rooms`
- Amenities → `/amenities`
- Eat & Drink → `/eat-drink`
- Gallery → `/gallery`
- Location → `/location`
- Rates → `/rates`
- FAQ → `/faq`
- Reviews → `/reviews`

### Primary CTA (sticky bottom)

**[ Check Dates ]** → `/check-availability`

### Utility

- `+385 91 396 6352` (tap to call)
- `@brand` on Instagram
```

The mobile primary CTA often uses a shorter label than desktop (`Check Dates` instead of `Check Availability`) because it sits in a sticky bottom bar. Note it explicitly.

### Footer

The footer has 2–4 columns plus optional newsletter and a legal bar. Brand column always first, contact column always present.

```
## Footer

### Column 1 — Brand

#### Logo

[Brand name]

#### Tagline

[One short line.]

#### Description

[1–2 sentence description of the business.]

#### Social

- Instagram → `https://instagram.com/brand`

### Column 2 — Explore

- Page → `/slug`
- Page → `/slug`
- Page → `/slug`

### Column 3 — Plan Your Stay

- Page → `/slug`
- Page → `/slug`

### Column 4 — Contact

#### Email

hello@example.com

#### Phone / WhatsApp

+1 555 0100

#### Address

Street, City, Country

#### Hours

9am – 9pm, seven days

### Newsletter

#### Heading

[Newsletter headline.]

#### Subtitle

[What subscribers get, how often.]

#### Field

**Label:** Email
**Placeholder:** you@example.com
**Required:** Yes

**[ Subscribe ]**

#### Consent line

By subscribing, you agree to our Privacy Policy.

### Legal Bar

© [year] [Brand] · Privacy · Terms · [project-specific legal pages]
```

Rules:
- Column count: 2 (small site) / 3 (medium) / 4 (large).
- Every nav link must resolve to a real page in `sitemap.md`.
- Newsletter is optional — omit the whole `### Newsletter` block if the project has none.
- Legal bar items separated by ` · `, copyright first.

See `examples/villa-t-global-elements.md` for a complete filled-in example.

---

## Final self-check before saving any page

1. No `*italic*` anywhere.
2. No `Heading:` / `Subtitle:` label-colon pattern outside form field blocks.
3. No blacklist words (grep the brand-voice blacklist).
4. Every button is `**[ Label ]**`, every tag is `` `Tag` ``, every quote is `> ...`.
5. Sections separated by `---`, one topic per `##`.
6. No emoji, no SEO meta, no alt text.