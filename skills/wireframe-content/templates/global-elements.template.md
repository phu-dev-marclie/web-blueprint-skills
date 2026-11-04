# [Project Name] — Global Elements (Header + Footer)

> Header, footer, and any global navigation that appears on every page.
> Generated once per project after sitemap is locked. Reused across all pages.

---

## Header

### Logo

[Brand name as text, or logo filename]

### Navigation

- [Link label] → `[path]`
- [Link label] → `[path]`
- [Link label] → `[path]`
- [Link label] → `[path]`
- [Link label] → `[path]`

### Primary CTA

**[ [Primary CTA label] ]** → `[/conversion-path]`

### Utility (optional)

- Phone: `[number]`
- Social: `[handle]` → `[url]`
- Language: `EN` (if multilingual)

---

## Mega Menu (only if header uses dropdowns)

Repeat one block per dropdown trigger.

### Mega Menu — "[Trigger label]" dropdown

#### Column 1 — [Group name]

- [Link] → `[path]`
- [Link] → `[path]`
- [Link] → `[path]`

#### Column 2 — [Group name]

- [Link] → `[path]`
- [Link] → `[path]`
- [Link] → `[path]`

#### Column 3 — [Group name]

- [Link] → `[path]`
- [Link] → `[path]`

#### Featured panel (optional, right side)

##### Eyebrow

[Small label]

##### Title

[Featured item title]

##### Body

[1-sentence pitch.]

**[ [CTA] ]** → `[path]`

---

## Mobile Menu (only if mobile nav differs from desktop)

### Sections

- [Link] → `[path]`
- [Group label]
  - [Sub-link] → `[path]`
  - [Sub-link] → `[path]`
- [Link] → `[path]`

### Primary CTA

**[ [Primary CTA] ]** → `[/conversion-path]`

### Utility

- `[phone]` (tap to call)
- `[social handle]`

---

## Footer

### Column 1 — Brand

#### Logo

[Brand name or filename]

#### Tagline

[One-line tagline]

#### Description

[1–2 sentences. What the business is, who it's for.]

#### Social

- [Channel] → `[url]`
- [Channel] → `[url]`

### Column 2 — [Nav group name, e.g. "Explore"]

- [Link] → `[path]`
- [Link] → `[path]`
- [Link] → `[path]`
- [Link] → `[path]`

### Column 3 — [Nav group name, e.g. "Plan Your Stay"]

- [Link] → `[path]`
- [Link] → `[path]`
- [Link] → `[path]`

### Column 4 — Contact

#### Email

[email]

#### Phone / WhatsApp

[number]

#### Address

[address]

#### Reservations hours (optional)

[hours]

### Newsletter (optional — skip if no newsletter)

#### Heading

[Heading copy]

#### Subtitle

[1-sentence pitch.]

#### Field

**Label:** Email
**Placeholder:** you@example.com
**Required:** Yes

**[ Subscribe ]**

#### Consent line

[Consent text.]

### Legal Bar

© [YEAR] [Brand] · Privacy · Terms · [Other legal pages]

---

## Authoring guide

1. **Pull the link list from `sitemap.md`.** Don't invent pages that don't exist.
2. **Pick column count based on page count:**
   - ≤ 8 pages → 2-column footer
   - 9–15 pages → 3-column footer
   - 16+ pages → 4-column footer
3. **Primary CTA in header = primary CTA across the whole site.** Same label as in `_foundations/ux-patterns.md`.
4. **Mega menu only when site has > 10 pages that benefit from grouping.** Otherwise simple nav reads faster.
5. **Newsletter is optional.** Skip the entire `### Newsletter` block if there's no newsletter, instead of leaving placeholder text.
