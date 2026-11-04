# Plan — [Project Name] Generation Roadmap

> Every page in generation order. Mark each step as it completes.

---

## Phase A — Foundations

| Step | Output | Status |
|---|---|---|
| A1 | `_foundations/facts.md` | ⏳ |
| A2 | `_foundations/brand-voice.md` | ⏳ |
| A3 | `_foundations/personas.md` | ⏳ |
| A4 | `_foundations/ux-patterns.md` | ⏳ |
| A5 | `CLAUDE.md` | ⏳ |
| A6 | User reviews and confirms foundations | ⏳ |

---

## Phase B — Sitemap

| Step | Output | Status |
|---|---|---|
| B1 | `sitemap.md` complete with section design per page | ⏳ |
| B2 | User confirms IA before generation | ⏳ |

---

## Phase B.5 — Global elements

| Step | Output | Status |
|---|---|---|
| B.5.1 | `pages/00-global.md` — header + mega menu (if any) + mobile menu + footer + newsletter + legal bar | ⏳ |
| B.5.2 | User confirms nav structure | ⏳ |

---

## Phase C — Page generation

Generation order: **conversion page first**, then Home, then high-touch product pages, trust pages, FAQ, resource pages, legal last.

| Step | Page slug | Output file | Status | Wireframe |
|---|---|---|---|---|
| C1 | `/[conversion]` | `pages/12-[conversion-slug].md` | ⏳ | ☐ |
| C2 | `/` Home | `pages/01-home.md` | ⏳ | ☐ |
| C3 | `/about` | `pages/02-about.md` | ⏳ | ☐ |
| C4 | `/[product-hub]` | `pages/03-[slug].md` | ⏳ | ☐ |
| C4a | `/[product-hub]/[sub-1]` | `pages/03a-[slug].md` | ⏳ | ☐ |
| C4b | `/[product-hub]/[sub-2]` | `pages/03b-[slug].md` | ⏳ | ☐ |
| C5 | `/features` or `/amenities` | `pages/04-[slug].md` | ⏳ | ☐ |
| C6 | `/services` | `pages/05-services.md` | ⏳ | ☐ |
| C7 | `/[differentiation page]` | `pages/06-[slug].md` | ⏳ | ☐ |
| C8 | `/location` | `pages/07-location.md` | ⏳ | ☐ |
| C9 | `/rates` | `pages/08-rates.md` | ⏳ | ☐ |
| C10 | `/faq` | `pages/09-faq.md` | ⏳ | ☐ |
| C11 | `/gallery` | `pages/10-gallery.md` | ⏳ | ☐ |
| C12 | `/reviews` | `pages/11-reviews.md` | ⏳ | ☐ |
| C13 | `/contact` | `pages/13-contact.md` | ⏳ | ☐ |
| C14 | `/thank-you` | `pages/14-thank-you.md` | ⏳ | ☐ |
| C15 | Legal pages | `pages/15..18-*.md` | ⏳ | ☐ |

Mark `✅` as each completes. Adapt order if the project has more or fewer pages. Check the **Wireframe** box once that page's `wireframes/[NN]-[slug].html` is generated in Phase E.

---

## Phase D — Bundle and validate

| Step | Output | Status |
|---|---|---|
| D1 | `pages/_master.md` (all pages concatenated) | ⏳ |
| D2 | Blacklist grep — 0 violations | ⏳ |
| D3 | Line-count report per page | ⏳ |
| D4 | Hand off files to user | ⏳ |

---

## Order rationale

- **Conversion page first.** Every other page's CTA points here. Define the form copy, the trust blocks, the validation messages first — they ripple into every subsequent page.
- **Home second.** Touches every other page; defines the hero promise + section preview language used elsewhere.
- **Product / service pages third.** The meat of the site.
- **Trust pages (Reviews, About, Gallery, Location) fourth.** Increase confidence.
- **Resource pages (FAQ, Rates) fifth.** Reduce friction.
- **Functional (Contact, Thank you) sixth.** Endpoint pages.
- **Legal last.** Doesn't influence other pages; can run in parallel.

---

## Phase E — HTML wireframes (optional)

| Step | Output | Status |
|---|---|---|
| E1 | `wireframes/wireframe.css` | ⏳ |
| E2 | `wireframes/[NN]-[slug].html` per page | ⏳ |
| E3 | `wireframes/index.html` | ⏳ |
| E4 | Validation checklist passed (see `WIREFRAME.md` §7) | ⏳ |
| E5 | User opens `index.html` and confirms | ⏳ |

---

## When generation slips

If user changes a foundation (facts, voice, persona) mid-project, re-check every page generated before the change — the drift compounds. Flag which pages need a pass and regenerate them before continuing forward, rather than patching foundations quietly and leaving old pages inconsistent.