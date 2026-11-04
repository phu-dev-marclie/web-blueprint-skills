# Wireframe Library Catalog — Index

Machine-readable catalog of the 890-layout wireframe image library (43 categories). Built once by vision-analyzing every `.webp`; used by Phase E (see `../../WIREFRAME.md`) to select layouts for HTML wireframes.

**Library images location:** resolved per project — key `Wireframe library:` in the project `CLAUDE.md`, default `<project-root>/wireframe-library/`. The catalog works without the images (catalog-only mode), but HTML fidelity is best when the chosen image is Read before writing HTML.

---

## Entry schema (legend)

Every layout has a 4-line entry in its category file:

```
## hero section 12
- Layout: split 50/50, text left / img right, left-aligned, H:720
- Slots: eyebrow?, H1, body, btn x2, img x1
- Fits: hero w/ subtitle + 1-2 CTAs, no cards | tags: split, image-right, classic
```

Field meanings:

| Token | Meaning |
|---|---|
| `## <id>` | Entry id = filename without `.webp` (e.g. `hero section 12` → `hero-sections/hero section 12.webp`) |
| `Layout:` | Column structure, content alignment, `H:<px>` = source image height (section size signal: ~80-120 header strip, ~300-600 footer, ~700-900 hero, 900-1200 content block, 1500+ full page) |
| `Slots:` | Content slots in visual order. `?` = optional/omittable. `x2` = exactly 2, `x3-6` = grid supports 3 to 6 |
| `Fits:` | What content shape this layout serves, then `tags:` keywords for filtering |

Slot vocabulary: `eyebrow` (small tagline above heading), `H1`/`H2`, `body`, `btn` (button), `card` (title+body unit, may note composition e.g. `card(icon+title+body) x3`), `img` (gray image placeholder block), `avatar` (circular photo placeholder), `logo` (logo placeholder), `tag` (chip/badge), `stat` (number+label), `form(N)` (form with N fields), `field` (single input), `link`, `nav`, `arrows` (carousel controls), `dots` (carousel indicators), `quote`, `icon`, `accordion`, `price`, `checklist`, `social`, `map`, `video`, `rating`.

---

## Categories

| Category | Count | When to use |
|---|---|---|
| banner-sections | 11 | Slim announcement/promo strips (top-of-page bar, seasonal callout) |
| blog-sections | 40 | Article grids/lists, blog homepage, post preview cards |
| bottom-navigation-bars | 4 | Mobile sticky bottom tab bar (app-like navigation) |
| career-sections | 4 | Jobs/careers listing, open-positions blocks |
| cart-pages | 3 | Shopping cart page (line items, summary, checkout CTA) |
| category-filters | 5 | Shop/catalog filter bar or sidebar (facets, sort) |
| checkpoint-pages | 3 | Age/region/access gate interstitial before main site |
| coming-soon-pages | 5 | Pre-launch holding page (countdown, notify-me form) |
| contact-sections | 34 | Contact forms, contact info blocks, map + details |
| content-sections | 100 | General-purpose text/image blocks — welcome, about, feature explainer, stats bar |
| cta-sections | 52 | Pre-footer conversion banners, mid-page CTA breaks |
| dashboard-pages | 8 | Logged-in app dashboard/admin panel layouts |
| error-pages | 7 | 404 / error state pages |
| event-sections | 8 | Event listing/promo blocks (conference, webinar) |
| faq-sections | 18 | FAQ accordions and Q&A blocks |
| feature-sections | 111 | Cards/icon-grid for services, features, room/product highlights |
| footer-sections | 32 | Site footer (brand, nav columns, contact, newsletter, legal bar) |
| gallery-sections | 11 | Photo grids, masonry galleries |
| header-sections | 18 | Top navigation bar (simple header, logo + nav + CTA) |
| hero-sections | 102 | Page-top hero (headline + subtitle + CTA, with or without image) |
| intro-sections | 12 | Short welcome/intro blurb directly under hero |
| link-pages | 6 | Linktree-style single-column link list page |
| login-pagers | 8 | Login/signup/auth form pages |
| logo-sections | 21 | "As seen in" / client logo strips |
| mega-menu-sections | 8 | Dropdown nav panel with grouped columns |
| offcanvas | 8 | Slide-out side panel (mobile menu, filter drawer) |
| popup-sections | 9 | Modal/popup dialogs (newsletter, promo, confirmation) |
| portfolio-sections | 27 | Work/case-study grids, project showcases |
| pricing-sections | 33 | Pricing tables/cards, plan comparison |
| process-sections | 27 | "How it works" numbered steps, process flow |
| product-sections | 14 | E-commerce product grid/catalog cards |
| property-sections | 6 | Real-estate/rental listing cards |
| single-event-sections | 3 | Single event detail page sections |
| single-portfolio-sections | 7 | Single case-study/project detail page sections |
| single-post-heros | 6 | Blog post detail page hero (title, author, date) |
| single-post-sections | 7 | Blog post detail body sections (content, related posts) |
| single-products | 4 | Single product detail page (PDP) sections |
| single-property-sections | 5 | Single property/listing detail page sections |
| single-team-sections | 4 | Single team-member bio detail page sections |
| team-sections | 29 | Team/staff grid, meet-the-team blocks |
| testimonials-sections | 50 | Customer reviews/quotes, testimonial carousels |
| thank-you-pages | 4 | Post-submit confirmation page |
| timeline-sections | 16 | Chronological history/roadmap, vertical or horizontal timeline |

Total: **890 layouts**.

---

## File naming conventions in the library

- Pattern: `<singular noun> <N>.webp`, lowercase, **spaces in filenames** (always quote paths), 1-indexed, no zero-padding — sort numerically, not lexically.
- Numbering may have gaps (e.g. `product-sections` is missing #5). Never assume `1..N` contiguity — trust `_INVENTORY.md`.
- `login-pagers/` is a typo folder name in the source library (contains `login page N.webp`) — kept verbatim.
- 3 stray files named `breakpointdesktop.webp` exist in `dashboard-pages/`, `portfolio-sections/`, `testimonials-sections/` — cataloged as normal entries with id `breakpointdesktop`.
- All images are 1512px wide, desktop-only (no responsive variants). Height varies 80–3544px.
