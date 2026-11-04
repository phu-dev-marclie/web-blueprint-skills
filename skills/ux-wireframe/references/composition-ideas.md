# Composition ideas — a bank to check against, not a menu to order from

Proven compositions from past projects, organised by **the job a section must do**. Use this
file only *after* phase 3 §4 has produced the concept and its signature moves.

## Anti-template rules
1. Form your own composition first (from the offering's truth and the brief). Then look here
   to sharpen it — never start a page by picking rows from this list.
2. Every reused idea is renamed for the project's concept and re-justified in §7 ("why").
3. Each concept page carries ≥ 2 layouts that exist only because of this concept.
4. A layout that appears here is not automatically right for another archetype — read
   "avoid when".
5. When a project invents a strong new composition, add it here (iteration loop, lesson capture).

**How shapes are written.** Every idea becomes one section block `w-<layout>` (`data-brx="section"` ›
`w-<layout>__container`) with its own layout in `assets/sections/<layout>.css` — there are no shared
layout classes. A ratio such as "7/5" or "4/8" is the fraction pair on the parent grid
(`grid-template-columns: minmax(0, 7fr) minmax(0, 5fr)`); "N columns" means `var(--columns-N)`, capped
per breakpoint (desktop / laptop ≤ 1279 ≤ 5 · tablet ≤ 991 ≤ 3 · mobile landscape ≤ 767 ≤ 3 · mobile
portrait ≤ 478 ≤ 2, prefer 1). Parts that repeat are components (`w-card-post`, `w-card-feature`,
`w-button-primary` / `w-button-secondary`, `w-accordion`, `w-contents`, `w-steps`, `w-filters`,
`w-photo` …) or a project component in `assets/components.css`.

## By job

### Open a page (first screen)
| Idea | Shape | Fits when | Avoid when |
| --- | --- | --- | --- |
| statement hero | full-bleed image, one display sentence bottom-left, 2 CTAs + text link | brand with one strong promise | the visitor arrives to do a task (support, docs) |
| title + film | breadcrumb, large title + lede, then full-bleed 21:9 image | category or editorial pages | the image adds nothing |
| ink hero | dark band, display title, ruled facts column | a distinct audience chapter (partners, investors) | used on more than one page type |
| title + routes | title + 3–5 large ruled route rows | contact, support, hubs where people choose a path | storytelling pages |
| product stage | facts + CTAs left, large gallery right | item detail without a buy box | commerce (use the commerce partials and components) |

### Explain
| Idea | Shape | Fits when | Avoid when |
| --- | --- | --- | --- |
| label split (4/8) | short label/heading left, long lead text right, optional proof figures as type | introductions, mission, indications | lists of many items |
| ledger | numbered ruled rows: claim · explanation | problems → answers, reasons to partner, principles | items need images |
| sticky chapters | sticky illustration left, numbered chapters right | technology, science, method | mobile-only audiences (illustration loses context) |
| exploded layers | diagram of the product's layers + vertical tabs; selected layer highlighted | a physical product with a meaningful build-up | the build-up is not verified |
| timeline | numbered steps on one line (vertical on mobile) | onboarding, application, service process | more than ~6 steps |

### Help choose
| Idea | Shape | Fits when | Avoid when |
| --- | --- | --- | --- |
| guided chooser | 1–3 questions → result card with picks and why | professionals choose by known criteria | criteria are unknown — invent nothing |
| range index | family label left, ruled item rows right (name · key fact) | complete overview without a product grid | visual products where images decide |
| compare table | rows = attributes, columns = options | plans, families, models | > 6 columns on mobile |
| true-to-scale view | sizes drawn to the same scale | physical sizes matter | sizes unknown |
| size list | size names as large type | named sizes (M/L/XL, 15 g) | dimensions in cm (use true-to-scale) |
| guide board | title + big search field, 3 persona tiles (filter chips), filter sidebar / drawer, article grid with one lead card | a guide or journal people browse by who they are and what they like | fewer than ~8 articles (a list is enough) |

### Show the offering
| Idea | Shape | Fits when | Avoid when |
| --- | --- | --- | --- |
| uneven mosaic | 7/5 image tiles with title plates | 2–4 areas of unequal weight | many equal items |
| product stories | alternating image/text rows | 3–5 representative items with a story | full catalogues |
| settings rail | horizontal snap rail of tall images per situation | "where it is used" | items need comparison |
| benefit row | 4 benefits on one ruled line | scannable detail pages | marketing claims without source |
| picks in content | inside an article: "Where to stay / what to use" — 2–3 offering cards, each with a one-line reason tied to the article, + link to the pre-filtered listing | guides and journals that should convert | the reason would be generic ("great choice") |

### Build trust
| Idea | Shape | Fits when | Avoid when |
| --- | --- | --- | --- |
| proof line | one ruled row of 3–4 short statements with sources | certifications, standards, documents | the statements are site features |
| document list | ruled rows: type tag · title · action | IFU, declarations, policies, catalogues | documents don't exist |
| notice list | type tabs + rows (date · type · item · status) + honest empty state | regulated products, safety notices | — |
| tint media split | tinted band, text + portrait | professional services, support | as a default section shape |

### Convert
| Idea | Shape | Fits when | Avoid when |
| --- | --- | --- | --- |
| enquiry panel | statement left, form right | item- or topic-specific enquiries | the form needs > 8 fields |
| apply wizard | aside + 3-step form | partner/job/funding applications | quick contact |
| form tabs | aside + tabbed forms by intent | several distinct request types | one request type |
| checkout card + sticky summary | 7/5: wizard card (numbered steps → ✓, "Step n of n", recap + Edit before paying, confirmation in place) / summary (photo, dates with times, nights, guests mirrored live, availability status, price lines, deposit, cancellation box) | booking or ordering one item; one page per item from the item data | multi-item carts (use the commerce cart) |
| sold-out state | the booking page replaces the form with "These dates are booked" + other dates / other items free on these dates / enquiry; summary keeps the item | any availability-based booking | — |
| thank-you page | same card + summary as the checkout, every step ✓, reference, amounts, next steps, "Go to my account", a rail of trip-planning content | the client measures conversions on a URL | a confirmation in place is enough |
| auth split | 5/7: form (log in / sign up, reset in a `w-accordion`, switch link) / photo 4:5 with a floating benefits card | sites with guest accounts | no account features behind it |
| account board | 3/9: vertical `w-tabs` (Overview · Bookings · Payments · Coupons · Membership · Details) / one panel: tiles, booking cards with status, payments `w-table`, dashed coupon cards with Copy, tier card + tier columns | returning customers, loyalty programmes | one-off purchases |
| top bar auth | thin bar above a sticky header: language · promo code notice (desktop) · Log in / Sign up, swapped for My account / Log out on `body.is-signed-in` pages | accounts + a crowded main bar (moving language out frees width) | — |
| property card (photo-led) | no frame: rounded photo slider (3–4 briefs, dots on the photo, arrows on hover / always on touch) with 0–2 feature badges from the facets; uppercase place line, title, icon facts (≤ 3 so they never wrap: guests · bedrooms · m²), price; one card markup for every list, its data generated once per item and copied into every family that lists it | listings of stays, homes, cars | items without photos |
| category card (glass) | the photo fills the card, the name (+ count or one line) sits on a dark translucent panel at its foot; compact size for mega menus | entry points to groups (houses, types, places) | product cards (they need price and facts) |
| filter panel → drawer | ≥ 992: `w-filters` as a tinted rounded panel (3/9 against the results, sticky) with uppercase group legends, checkbox rows with counts, pills for "minimum" and small-number facets, "Clear all" link; results column opens with count + sort and active-filter chips. ≤ 991: the toolbar [Filters (n) · sort] sticks under the header inside the results column (`display: contents` on its wrapper), the panel slides in from the left with a sticky footer: "Clear all" text link + full-width "Show N items" | catalogues with 4+ facets | 1–2 facets (use chips above the grid) |
| accordion with a round toggle | question left, a 32 px round button right (+, rotates to × and fills dark on hover / open), hairline rows, smooth height via `::details-content`; FAQ groups get an H2 with a strong rule below | FAQ pages and teasers | answers that must stay visible (put them in prose) |
| contents rail with scrollspy | sticky left rail, a hairline on its left, numbered links in markup, the section being read marked by the engine (`data-toc` → `aria-current`) with a dark bar; on phones a tinted box above the text (FAQ: a chip row) | articles, legal pages, long FAQs | pages with < 4 sections |
| article ending | after the sources line: a share row (WhatsApp, email, copy link via empty `data-copy`) and an author box (avatar, "Written by", name → About page, one line, About · Contact) | blogs / travel guides written by the business | anonymous or syndicated content |
| about page (small business) | title + wide photo · who looks after you (label + text + contact button) · story chapters (the place, the shared spaces, the area) · 4 reasons to book direct · closing search; only facts the client confirmed — names, years, stories wait for the client; no "at a glance" list that repeats the home page | any business site without one | — |
| story split | 5/7: photo / eyebrow, keyword H2 and 2–3 paragraphs (18/28) with links into the listing, the audiences and the guide, one closing link | the home or hub page's SEO passage, telling the place instead of listing it | pages that already carry long text |
| story chapters | 2–4 numbered chapters, each number · title + 2 paragraphs + links · photo, ruled apart | About pages, "the place" pages: the house, the garden, the area | facts the client has not confirmed |
| persona guide | 3 columns under a strong rule: label with icon, title, a paragraph naming real items, a link to the pre-filtered list | listings where audiences pick different items (couples / families / groups) | when the menu already shows the same split without content |
| day strip | head + 4 moments of one day under a strong rule (time with icon · benefit H3 · 2 lines · "what helps" = the amenities used) | amenity / facility pages: turn a list of features into a day the guest can picture | the facility is used once (a lift, a car park) |
| audience tabs | one `w-tabs` tab per kind of guest with an icon; panel 5/7: photo / benefit H3, 2–3 sentence story, 3 ✓ tips, a "where to stay" box with 2 items + reason + price, links to the filtered list and the matching guide | one shared feature that each audience uses differently (pool garden, spa, coworking) | the audiences pick different items anyway (use persona guide) |
| ink chapter | dark band, oversized question, 3 ruled columns, CTAs | a second audience (B2B, donors, investors) | more than once per page |
| two doors (footer) | two large typographic links for the two conversions | sites with two primary audiences | one conversion |
| CTA pair | primary filled button + one outline button for the reading step (hub article, guide); further routes as text links below | every closing band, story split, map card | 3+ buttons in one block |
| hub article ("Why visit {place}") | the guide's lead article: one section per reason (beaches, nightlife, food, history, nature, day trips, when / how to come), each ending in links to the detailed article; sources aggregated; stay picks with reasons | blogs about one destination or topic; it becomes the secondary CTA of place-related blocks | the blog has < 5 articles to link |
| route tabs in an article | inside an article section: a tab row per way of getting there (car / ferry / plane / without a car), each panel a numbered ordered list of 3 measured steps; map brief below | directions, how-to with alternatives | one route only (use a numbered list) |
| quiz recommender | head + one card: "Question n of 5" + progress bar, one question at a time as large icon tiles (Back / Continue / See my matches), then the 3 best items as standard cards with a "Best match" pill and ✓ reason lines that echo the visitor's answers; Start again + link to the full comparison. Engine `data-quiz` (contract §18); tags and reasons generated from the item facets | 8+ similar items where visitors don't know the differences (stays, plans, products) | < 6 items, or facts too thin to give honest reasons |
| email the result (lead) | tinted panel under a quiz / calculator / configurator result: H4 "Send these to your inbox" + why (decide with others) / email + button on one row, an optional unticked box for tips or news, privacy line; the submit (`formaction`) carries the answers and picks to a thank-you page (lead conversion URL) that says what arrives, asks for the double opt-in confirmation and rails 3 guides; the nurture sequence lives in the content file | any tool that produces a personal result; the honest alternative to discount-for-email | the result is not worth keeping (one obvious answer) |

### Utility & legal
| Idea | Shape | Fits when |
| --- | --- | --- |
| prose + sticky contents | contents list left, numbered parts right | legal, accessibility, long policies |
| language list | native name · English name · URL per row, `:target` highlight | multi-locale sites |
| search results | big query field, results grouped by type | any site with search |
| distributor list | country label left, partner rows right; only verified entries | partner/distribution networks |
| market map | map + where the brand is today + invitation | expansion messaging (honest footprint) |

## Ideas for other archetypes (not yet proven in a build)
- **saas**: product tour (sticky screenshot + steps), plan matrix with "best for" row,
  integration index by category, changelog ledger.
- **service**: process timeline with deliverables per step, case ledger (problem · approach ·
  result with a sourced figure), team roles grid (roles, not invented people).
- **editorial**: lead story + topic rails, article with sticky contents and pull quotes from
  the article itself, author index (real authors only). Proven (rental site): article = sticky
  contents 3 / body 6 / booking box 3 (fractions 3fr 6fr 3fr; one column ≤ 991), key facts (read time, distance, persona) in the meta line
  under the title rather than a separate facts box, sourced "checked" line, picks in content,
  related rail.
- **nonprofit**: cause chapter, "where your gift goes" breakdown (sourced), action panel
  (donate / volunteer / share).
- **portfolio**: case index with filters by discipline, case page as chapters
  (challenge · process · outcome).
