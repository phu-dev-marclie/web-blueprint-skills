# Interactions contract — `assets/wireframe.js`

The engine is generic: it is improved centrally (bug fixes, new generic widgets), never
forked per project. Markup only needs the attributes below. `base.css` carries widget
*states* keyed on `data-*` hooks, `assets/components.css` carries the widget components
(`w-slider`, `w-filters`, `w-datepicker` …), and how a widget looks inside a composition is
styled in that section's stylesheet `assets/sections/<layout>.css`. All interactive controls
are `<button type="button">`, never `<a href="#">`. Icons inside controls are
`<i data-icon="name" class="w-icon w-icon--small">` (inline SVG from `assets/icons/`), never glyphs.

**Hooks vs classes (BEM gate, `bem_lint.py --prefix w-`).** Behaviour hangs on `data-*`
attributes only; the engine never looks up a styling class, and it reports state with `is-*`
classes (`is-active`, `is-open`, `is-done`, `is-list`, `is-finished`) and `aria-*` / `hidden`.
Styling hangs on `w-` classes only: every element in the examples below carries its own class
(`w-block`, `w-block__element`, `w-block--modifier`), and a rule styles only the element
carrying its class. Each section is its own block (`w-<layout>`, `data-brx="section"` ›
`w-<layout>__container` `data-brx="container"` › `w-<layout>__…` elements); components are the
only reused classes. Rename a block freely in its stylesheet; never rename a `data-*` hook.
Inline phrasing (`strong`, `em`, links inside a sentence) and table cells need no class.

**Components.** A part that repeats with the same structure (buttons, cards, list rows, nav
links, options) is declared in design-direction.md §8c and marked in markup:
`data-component="Group: Variant"` on the instance root (which carries only its component
class), `data-prop="propertyId"` on every element whose text / link / image / icon changes per
instance. A button's label is the root's text, so `data-prop="label"` sits on the root. The
engine ignores both attributes; handoff and the Bricks import read them.

```html
<a class="w-button-secondary" href="stays.html" data-component="Button: Secondary" data-prop="label">All stays</a>
<a class="w-button-text" href="stays.html" data-component="Button: Text" data-prop="label">All stays <i data-icon="arrow-right" class="w-icon w-icon--small w-button-text__icon"></i></a>
```

**Use only what the page needs.** Widgets are chosen in phase 3 per composition, not
sprinkled to prove the engine works.

| Widget | commerce | brand / service / saas / editorial / portfolio / nonprofit |
| --- | --- | --- |
| Slider, tabs, gallery, forms, mobile nav, search suggestions, modal dialog (§10b) | ✓ | ✓ |
| Chooser (§12), wizard (§13) | ✓ | ✓ |
| Qty stepper, variants | ✓ | only if the design needs a selector (no prices) |
| Catalogue filter/sort/load-more, filter panel (§6b) | ✓ | only with a real browse need (sitemap §4) |
| Cart, bundle, favourites, area calculator | ✓ | ✗ (`qa.py` rejects) |

## 1. Slider

```html
<div class="w-slider w-hero__slider" data-slider data-autoplay="7000">
  <div class="w-slider__track">
    <article class="w-slide w-hero__slide is-active" data-slide>
      <div class="w-hero__body" data-brx="block">
        <span class="w-hero__eyebrow w-eyebrow">…</span>
        <h1 class="w-hero__title w-heading-2xl">…</h1>          <!-- slide 1 = h1, slides 2..n = h2 -->
        <p class="w-hero__lede w-text-l">…</p>
        <div class="w-hero__actions" data-brx="div"><a class="w-button-primary w-button-primary--large" href="…" data-component="Button: Primary" data-prop="label">…</a><a class="w-button-secondary w-button-secondary--large" href="…" data-component="Button: Secondary" data-prop="label">…</a></div>
      </div>
      <div class="w-photo w-photo--fill w-hero__media">Photo · …</div>
    </article>
    <article class="w-slide w-hero__slide" data-slide> … </article>
  </div>
  <div class="w-slider__controls">
    <button class="w-slider__nav" type="button" data-slider-prev aria-label="Previous"><i data-icon="caret-left" class="w-icon"></i></button>
    <button class="w-slider__nav" type="button" data-slider-next aria-label="Next"><i data-icon="caret-right" class="w-icon"></i></button>
    <div class="w-slider__dots" data-slider-dots></div>          <!-- generated: button.w-slider__dot -->
    <span class="w-slider__counter" data-slider-counter>1 / 3</span>
  </div>
</div>
```
Gives: autoplay, pause on hover/focus, arrows, dots, ←/→ keys, swipe, focus trapping off
inactive slides. Slides are found by `[data-slide]`; `.w-slide` / `.is-active` only style them.

Other widgets can show a slide by dispatching `new CustomEvent("slidergo", { detail: index })` (0-based) on the `[data-slider]` root; the dialog engine uses it for `data-dialog-show`.

## 2. Tabs

```html
<nav class="w-tabs" data-tabs>
  <a class="w-tabs__tab is-active" href="#description">Description</a>
  <a class="w-tabs__tab" href="#specs">Specs</a>
</nav>
<div class="w-tab-panel" id="description"> … </div>
<div class="w-tab-panel" id="specs"> … </div>
```
The engine treats every link inside `[data-tabs]` as a tab. Deep links from elsewhere on the
page (`href="#specs"`) open the right tab.

## 3. Gallery

```html
<div class="w-gallery" data-gallery>
  <div class="w-gallery__thumbs">
    <button class="w-photo w-gallery__thumb" type="button" data-thumb data-caption="Photo · over the table">1 · over the table</button>
  </div>
  <div class="w-photo w-photo--1x1 w-gallery__main" data-gallery-main>Photo · …</div>
</div>
```

## 4. Quantity stepper

```html
<div class="w-stepper w-stepper--compact" data-qty>
  <button class="w-stepper__button" type="button" data-step="-1" aria-label="Decrease"><i data-icon="minus" class="w-icon w-icon--small"></i></button>
  <input class="w-stepper__input" type="number" value="1" min="1" aria-label="Quantity">
  <button class="w-stepper__button" type="button" data-step="1" aria-label="Increase"><i data-icon="plus" class="w-icon w-icon--small"></i></button>
</div>
```
`min` / `max` on the input clamp the value (guests: `max` = the unit's capacity). For a guest
field in a form use the full-width stepper `<div class="w-stepper" data-qty>` (no `--compact`)
with the same `button.w-stepper__button` and `input.w-stepper__input` (components.css), a visible
`<label class="w-field__label" for>` on the input and a hint "Sleeps up to N" under it.

## 5. Variants (option → price)

```html
<div class="w-product__buybox" data-brx="block" data-variants>
  <p class="w-product__variant">Colour: <strong data-variant-label>Oak</strong></p>
  <div class="w-swatches">
    <button class="w-swatch" type="button" data-variant="Black" data-price="331" data-stock="In stock" data-component="Swatch: Colour" data-prop="label">Black</button>
    <button class="w-swatch is-active" type="button" data-variant="Oak" data-price="331" data-stock="In stock" data-component="Swatch: Colour" data-prop="label">Oak</button>
  </div>
  <p class="w-product__stock">Availability: <span class="w-product__stock-value" data-variant-stock>In stock</span></p>
  <p class="w-product__price" data-variant-price>331 €</p>   <!-- size it in assets/sections/product.css, never style="" -->
</div>
```

## 6. Catalogue — filter + sort + view + load more

Wrap rail **and** grid **and** toolbar in one `data-catalog` element.

```html
<section class="w-catalogue" id="catalogue" data-layout="catalogue" data-surface="default" data-brx="section" data-catalog>
  <div class="w-catalogue__container" data-brx="container">
    <div class="w-catalogue__active" data-active-filters></div>       <!-- engine adds button.w-chip.is-active per filter -->
    <span class="w-catalogue__active-empty" data-active-empty>No active filters.</span>
    <button class="w-button-text" type="button" data-clear-filters hidden>Clear all</button>

    <button class="w-chip" type="button" data-chip-facet="style" data-chip-value="modern" data-component="Chip: Facet" data-prop="label">Modern</button>

    <details class="w-filter-group" open>
      <summary class="w-filter-group__summary">Style <i data-icon="caret-down" class="w-icon w-icon--small w-filter-group__icon"></i></summary>
      <div class="w-filter-group__options">
        <label class="w-filter-group__option" data-component="Filter: Option"><input class="w-filter-group__input" type="checkbox" data-facet="style" value="modern" data-label="Style: Modern"> <span class="w-filter-group__label" data-prop="label">Modern</span> <span class="w-filter-group__count" data-prop="count">126</span></label>
      </div>
    </details>
    <!-- colour swatches carry a hidden checkbox:
         <label class="w-swatch"><input type="checkbox" data-facet="colour" value="black" data-label="Colour: Black" hidden>Black</label> -->

    <select class="w-catalogue__sort" data-sort>
      <option value="">Recommended</option>
      <option value="newest">Newest</option>
      <option value="price-asc">Price ascending</option>
      <option value="price-desc">Price descending</option>
      <option value="sold">Best selling</option>
      <option value="rating">Best rated</option>
      <option value="name">Name A–Z</option>
    </select>
    <select class="w-catalogue__per-page" data-per-page><option value="6">6</option><option value="12">12</option></select>
    <button class="w-chip is-active" type="button" data-view="grid"><i data-icon="squares-four" class="w-icon w-icon--small"></i> Grid</button>
    <button class="w-chip" type="button" data-view="list"><i data-icon="rows" class="w-icon w-icon--small"></i> List</button>

    <div class="w-catalogue__grid" data-brx="block">    <!-- grid in catalogue.css; the list view adds .is-list here -->
      <article class="w-card-product" data-product data-component="Card: Product"
               data-price="331" data-order="1" data-rating="4.8" data-sold="120"
               data-style="modern|designer" data-colour="oak|black"
               data-room="living-room|kitchen" data-availability="in-stock"
               data-labels="new|sale"> … <h3 class="w-card-product__title"><a class="w-card-product__link" href="…" data-prop="title">…</a></h3> … <p class="w-card-product__price" data-prop="price">331 €</p></article>
      <div class="w-catalogue__promo" data-brx="block" data-grid-promo> … </div>   <!-- re-inserted after card 6 -->
    </div>

    <p class="w-catalogue__count" data-result-count></p>
    <p class="w-catalogue__empty" data-empty hidden>No products match these filters.</p>
    <button class="w-button-secondary" type="button" data-load-more>Load more</button>
  </div>
</section>
```

**Facet rule:** `data-facet="X"` matches `data-X` on the card. Values are lowercase-hyphen,
multiple joined by `|`. Reserved: `data-facet="price"` uses `value="0-50"`, `"50-100"`,
`"500-"` and compares against `data-price`.

Sort keys are language-neutral: `price-asc` `price-desc` `name` `newest` `rating` `sold`
(Croatian legacy keys `cijena-asc` etc. still work). They read `data-price`, `data-order`,
`data-rating`, `data-sold`; the name sort reads `data-name` on the card, else the text of its
`data-prop="title"` element.

**Also in `data-catalog`:**
- `[data-clear-filters]` may appear several times (panel head, drawer footer, empty state); all
  hide while nothing is selected. Clearing and removing an active chip return a radio facet
  to its group's neutral option — the radio of the same `name` **without** `data-facet` ("Any").
- `[data-active-count]` shows the number of active filters and hides at 0 (badge on a
  "Filters" button).
- `[data-result-label="{total} stays"]` + optional `data-result-label-one` / `-zero`: result
  counts and apply buttons worded per catalogue ("Show 12 stays"). Prefer it to
  `data-result-count`, whose wording ("products") is global.
- **Deep links.** `?<facet>=<value>` in the URL pre-selects that filter (`stays.html?type=villa`).
  `data-param-map="where:dest who:guests"` on the catalogue maps search-form field names to
  facets; a numeric value with no exact option picks the smallest threshold ≥ it (`who=5` →
  "6+"). Other params fill a field with `data-param="<name>"` (dates). Menus, type tiles and
  search forms that point at the listing must arrive with their filter on.

## 6b. Filter panel — sidebar on desktop, off-canvas drawer on mobile

One panel serves both layouts; the inputs exist once. Where its trigger is hidden (CSS,
≥ 992 px) the panel is a static sidebar; where the trigger shows (≤ 991 px) it is an off-canvas
dialog: opens with focus inside, `role="dialog"` + `aria-modal`, Tab is trapped, Escape / scrim /
close / apply close it, focus returns to the trigger, page scroll locks while open, and
widening the window past the breakpoint turns it back into the sidebar.

```html
<section class="w-stays" id="stays" data-layout="stays" data-surface="default" data-brx="section" data-catalog>
  <div class="w-stays__container" data-brx="container">
    <div class="w-filters" id="filters" role="region" aria-labelledby="filters-title" data-filter-panel data-component="Catalog: Filters">
      <div class="w-filters__head"><p class="w-filters__title" id="filters-title">Filters</p>
        <button class="w-button-text" type="button" data-clear-filters hidden>Clear all</button>
        <button class="w-filters__close" type="button" data-filter-close aria-label="Close filters"><i data-icon="x" class="w-icon"></i></button></div>
      <div class="w-filters__body"> … w-filter-group fieldsets of [data-facet] checkboxes / radios … </div>
      <div class="w-filters__foot">   <!-- drawer only -->
        <button class="w-button-secondary" type="button" data-clear-filters hidden>Clear all</button>
        <button class="w-button-primary" type="button" data-filter-close data-result-label="Show {total} stays" data-result-label-one="Show 1 stay">Show stays</button>
      </div>
    </div>
    <div class="w-stays__scrim" data-filter-scrim hidden></div>
    <button class="w-stays__filters-open" type="button" data-filter-open aria-controls="filters" aria-expanded="false">Filters <span class="w-stays__count" data-active-count hidden></span></button>
    … results …
  </div>
</section>
```
Results update live while the drawer is open; the apply button only closes it and states the
count. `components.css` styles `.w-filters` as the sticky sidebar (≥ 992) and the drawer
(≤ 991: fixed, `translateX(-100%)` + `visibility:hidden` when closed, `is-open` on screen; the
engine sets `is-open`); `base.css` styles the scrim and the open button through their hooks
(`[data-filter-scrim]`, `[data-filter-open]`), so their section element classes only add the
composition's look (in `assets/sections/<layout>.css`).
Mobile rules: options ≥ 44 px tall, inputs/selects 16 px (no iOS zoom), a sticky toolbar with
the trigger and sort above the grid, a thin styled scrollbar on the drawer body only.
Sidebar: **no scrollbar inside the panel** (no `max-height` + `overflow:auto`). The engine sets
`--filter-top` on the panel: the header offset (`--layout-sticky-top`, default 96 px) when the panel
fits the viewport, otherwise a negative offset, so `position: sticky; top: var(--filter-top)`
lets a tall panel scroll with the page and then pin by its bottom edge — never cut off.
Keep groups few and rows compact (32 px).
The browser probe opens, checks and closes the drawer, rejects an inner-scrolling or cut-off
sticky sidebar, and asserts clear-all restores every result.

## 6c. Keyword search inside a catalogue (blog index, resources, help centre)

A listing that people browse by subject (articles, guides, recipes, FAQs) needs a search field
next to its facets. It filters the same cards, combined with every active facet.

```html
<section class="w-guide" id="guide" data-layout="guide" data-surface="default" data-brx="section" data-catalog>
  <div class="w-guide__container" data-brx="container">
    <form class="w-guide__search" role="search" action="#" onsubmit="return false">
      <label class="w-guide__search-label" for="q">Search the guide</label>
      <input class="w-guide__search-input" id="q" name="q" type="search" data-catalog-search placeholder="Beaches, Zrće, cheese…">
    </form>
    … filter panel (§6b), toolbar, [data-active-filters], [data-clear-filters] …
    <article class="w-card-post" data-product data-component="Card: Post" data-order="1" data-topic="beaches" data-who="families|couples"
             data-keywords="sand shallow kids swimming"> … </article>
    <p class="w-guide__empty" data-empty hidden>No articles match. <button class="w-button-text" type="button" data-clear-filters>Clear all</button></p>
  </div>
</section>
```
- Every term must occur in the card's text or its `data-keywords` (synonyms, other languages);
  matching ignores case and accents (`zrce` finds "Zrće"). Typing filters live; Enter does not
  submit.
- The term shows as an active chip ("Search: “zrce”", i18n `searchChip`), counts in
  `[data-active-count]`, and `[data-clear-filters]` empties it with the facets.
- Deep link `?q=…` (or the field's `name`) pre-fills it — a header search can point at
  `guide.html?q=…`.
- The field needs a visible label or `aria-label`. Put an empty state with a clear button in
  the grid: a search is the action most likely to return nothing.
The browser probe searches a word from the first card, then a nonsense term, then clears.

## 7. Area calculator

```html
<form class="w-calculator__form" data-calc-lamele data-per-m2="3.7" data-unit-price="27">
  <input class="w-calculator__input" type="number" data-calc="width"  step="0.1">
  <input class="w-calculator__input" type="number" data-calc="height" step="0.1">
  <select class="w-calculator__select" data-calc="collection">
    <option data-per-m2="3.7" data-unit-price="27">Collection A — 27 €/pc</option>
  </select>
  <button class="w-button-primary" type="submit">Calculate</button>
  <button class="w-button-secondary" type="reset">Reset</button>
  <div class="w-note" data-calc-out hidden></div>
</form>
```
Outputs area, +10 % waste, piece count, estimated price, add-to-cart shortcut.
Legacy Croatian keys (`sirina` / `visina` / `kolekcija`, `data-kom-po-m2`, `data-cijena`)
are still accepted as aliases.

## 8. Cart

```html
<section class="w-cart" id="cart" data-layout="cart" data-surface="default" data-brx="section" data-cart data-free-shipping="50">
  <div class="w-cart__container" data-brx="container">
    <div class="w-cart__filled" data-brx="block" data-cart-filled>
      <tr class="w-cart__row" data-cart-row data-unit-price="331">
        <div class="w-stepper w-stepper--compact" data-qty>…</div>
        <td data-line-total></td>
        <button class="w-button-text" type="button" data-cart-remove>Remove</button>
      </tr>
    </div>
    <div class="w-cart__empty" data-brx="block" data-cart-empty hidden> … empty state … </div>

    <div class="w-progress"><i class="w-progress__bar" data-ship-progress></i></div>
    <p class="w-cart__ship" data-ship-remaining></p>

    <span class="w-cart__subtotal" data-cart-subtotal></span> <span class="w-cart__shipping" data-cart-shipping></span> <span class="w-cart__total" data-cart-total></span>
  </div>
</section>
```
`data-cart-items` anywhere (e.g. the header badge) is kept in sync.

## 9. Bundle

```html
<div class="w-product__bundle" data-brx="block" data-bundle>
  <label class="w-checkbox"><input class="w-checkbox__input" type="checkbox" data-bundle-item data-price="331" checked> <span class="w-checkbox__text">Product — 331 €</span></label>
  <strong class="w-product__bundle-total" data-bundle-total>—</strong>
</div>
```

## 10. Favourites, forms, back-to-top, mobile nav

- `<button class="w-fav" type="button" data-fav aria-pressed="false" aria-label="Save"><i data-icon="heart" class="w-icon w-fav__icon w-fav__icon--off"></i><i data-icon="heart-fill" class="w-icon w-fav__icon w-fav__icon--on"></i></button>`
  (on a product card it sits in `w-card-product__fav`)
  → toggles `is-active` / `aria-pressed` (`.w-fav.is-active` shows the filled heart) + header badge.
- `<form data-demo-form="Thanks for your enquiry.">` → blocks submit, renders an inline
  `p.w-note[data-form-sent]`. Native `required` validation still runs first — fill the fields when testing.
- Back-to-top (`data-to-top`) and the off-canvas nav (`data-nav-toggle` / `data-nav-panel` /
  `data-nav-drill` / `data-nav-close`) ship inside the partials; the drill toggles `is-open` on
  the parent `li.w-nav-panel__item`.
- Accordion icons are markup: `<details class="w-accordion"><summary class="w-accordion__summary">Question
  <i data-icon="plus" class="w-icon w-accordion__icon"></i></summary><div class="w-accordion__answer">…</div></details>`;
  components.css rotates it to × when open.

## 10b. Modal dialog (popup) — e.g. a header "Find your stay" search

```html
<button class="w-button-primary" type="button" data-dialog-open="find-stay">Find your stay</button>
<dialog class="w-dialog" id="find-stay" aria-labelledby="find-stay-title" data-dialog>
  <div class="w-dialog__head"><p class="w-dialog__title" id="find-stay-title">Find your stay</p>
    <button class="w-button-icon" type="button" data-dialog-close aria-label="Close" data-component="Button: Icon"><i data-icon="x" class="w-icon"></i></button></div>
  <form class="w-dialog__body" action="stays.html" method="get"> … fields stacked one per row; first one `autofocus` … </form>
</dialog>
```
A dialog with its own look is a section-specific block instead (`w-find-stay`, `__head` …,
styled in its own stylesheet). Native `<dialog>` + `showModal()`: focus trap, Escape and the
top layer come from the browser.
The engine adds `aria-haspopup` / `aria-controls` / `aria-expanded` to openers, closes on
`[data-dialog-close]` and on a backdrop click, locks page scroll while open and returns focus
to the opener. Several openers may target one dialog (desktop button + mobile icon). `data-dialog-show="el-id"` on an opener shows that element: a `[data-slide]` of a `[data-slider]` inside the dialog becomes the active slide (photo lightbox: every gallery tile opens the lightbox at the photo clicked), anything else is scrolled into view. A lightbox is a `[data-slider]` inside the dialog: counter + prev/next, ← → keys and swipe come from the slider; display only the active slide (`display:none` on the others, from the lightbox's own slide class) so photos load one at a time; show the whole photo (`background-size: contain`) on a dark stage. Put the
dialog in the header partial **after** `</header>`; its title is a `<p>`, not a heading (it
precedes the page H1). Style the `::backdrop`; on phones a bottom sheet (`margin: auto 0 0`)
keeps the fields in thumb reach. Browser probe: opens, checks modal + focus inside + on
screen, closes, checks focus return and scroll unlock.

## 10c. Header dropdown — a main nav item with children

```html
<li class="w-header__item">
  <button class="w-header__link" type="button" data-menu-toggle aria-controls="menu-stays" aria-expanded="false" data-nav="stays">
    Stays <i data-icon="caret-down" class="w-icon w-icon--small w-header__toggle-icon"></i></button>
  <div class="w-header__dropdown" id="menu-stays" data-menu hidden>
    <a class="w-header__dropdown-link" href="stays.html">All stays</a>            <!-- the overview page stays reachable -->
    <a class="w-header__dropdown-link" href="stays-sea-view.html" data-component="Nav: Menu link"><span class="w-header__dropdown-label" data-prop="label">Sea view</span> <span class="w-header__dropdown-desc" data-prop="description">Balcony over the bay</span></a>
  </div>
</li>
```
`assets/sections/header.css` resets the toggle button and turns `.w-header__toggle-icon` while
`aria-expanded="true"`; the trigger looks like the other `w-header__link`s.
Click toggles the panel (`hidden` + `aria-expanded`), one panel open at a time, Escape closes and
returns focus to the toggle, a click outside closes. No `:hover`/`:focus-within` opening: a
click widget has a state the browser probe and the Figma handoff (`handoff.py` → one UI state per
menu) can reproduce. Style the panel in `assets/sections/header.css` (anchored to the container so
it stays in the viewport; commerce mega panels are `w-mega`). Browser probe: opens, checks the
viewport, Escape closes, focus returns.

## 11. Localisation — `wireframe/i18n.json`

`build.py` injects this file as `window.WF_I18N` and sets `<html lang>`; number formatting
follows that locale. Omit the file and the engine speaks English.

```json
{
  "lang": "en",
  "currency": "€",
  "resultCount": "Showing {shown} of {total} products",
  "empty": "No products match these filters.",
  "formSuffix": "This is a wireframe — nothing is submitted.",
  "formThanks": "Thank you.",
  "slideLabel": "Slide {n} of {total}",
  "wizardCounter": "Step {n} of {total}",
  "cartHref": "cart.html"
}
```
Commerce-only keys (`shipFree`, `shipRemaining`, `shipNone`, `shipFreeLabel`, `calc*`) are
listed in the `DEFAULTS` block of `wireframe.js`.

## 12. Chooser — guided selection

Questions → recommendation, the brand-site alternative to a filter rail.

```html
<div class="w-chooser__tool" data-brx="block" data-chooser>
  <fieldset class="w-chooser__question"><legend class="w-chooser__legend">Exudate level</legend>
    <label class="w-choice" data-component="Choice: Option"><input class="w-choice__input" type="radio" name="exudate" value="low"> <span class="w-choice__label" data-prop="label">Low</span></label>
    <label class="w-choice" data-component="Choice: Option"><input class="w-choice__input" type="radio" name="exudate" value="high"> <span class="w-choice__label" data-prop="label">High</span></label>
  </fieldset>
  <fieldset class="w-chooser__question"><legend class="w-chooser__legend">Infection risk</legend>
    <label class="w-choice" data-component="Choice: Option"><input class="w-choice__input" type="radio" name="infection" value="yes"> <span class="w-choice__label" data-prop="label">Infected / at risk</span></label>
    <label class="w-choice" data-component="Choice: Option"><input class="w-choice__input" type="radio" name="infection" value="no"> <span class="w-choice__label" data-prop="label">No</span></label>
  </fieldset>
  <div class="w-chooser__empty" data-chooser-empty>Answer both questions to see a recommendation.</div>
  <div class="w-chooser__result" data-when="exudate=low infection=yes" hidden> … </div>
  <div class="w-chooser__result" data-when="exudate=low|high infection=no" hidden> … </div>
  <button class="w-button-secondary" type="button" data-chooser-reset>Start again</button>
</div>
```
A result is shown when **every** `key=value|value` token matches a checked answer; the
empty node shows while nothing matches.

## 13. Wizard — multi-step form

```html
<form class="w-apply__form" data-wizard data-demo-form="Thank you — we will be in touch.">
  <ol class="w-steps">
    <li class="w-steps__step" data-wizard-step>Company</li><li class="w-steps__step" data-wizard-step>Market</li><li class="w-steps__step" data-wizard-step>Contact</li>
  </ol>
  <p class="w-apply__counter" data-wizard-counter></p>
  <div class="w-apply__panel" data-brx="block" data-wizard-panel> … required fields … </div>
  <div class="w-apply__panel" data-brx="block" data-wizard-panel hidden> … </div>
  <div class="w-apply__panel" data-brx="block" data-wizard-panel hidden> … </div>
  <button class="w-button-secondary" type="button" data-wizard-prev>Back</button>
  <button class="w-button-primary" type="button" data-wizard-next>Continue</button>
  <button class="w-button-primary" type="submit" data-wizard-submit>Send application</button>
</form>
```
"Continue" validates the current panel only; Enter advances instead of submitting; the
step markers get `is-active` / `is-done` (base CSS keys the state on `[data-wizard-step]`;
`.w-steps__step` gives the bar look); submit appears on the last panel and triggers the
`data-demo-form` confirmation (`data-demo-note="…"` replaces the generic wireframe line after it).

**Booking / checkout extensions** (proven on two booking sites):
- **Recap with Edit.** The payment step opens with a recap of earlier answers: `dd[data-mirror="first last"]`
  shows the live values of those field ids (space-joined, "—" when empty); a
  `button[data-wizard-goto="0"]` "Edit" jumps back. Done step markers are clickable too.
- **Confirmation in place.** `div[data-wizard-done][hidden][tabindex="-1"]` inside the form replaces
  the panels after submit: every marker turns done, nav buttons hide, focus moves to it. Put the
  reference, dates, guests, amount paid, next steps and help contacts in it, plus `p.w-note[data-form-sent]`.
  No separate "thank you" page is needed for the wireframe — **unless** the client measures
  conversions on a thank-you URL (Ads / Analytics goal): then drop `data-demo-form` and the done
  panel, set `action="<thank-you page>.html" method="get"` and build that page (one per item when
  it shows the item). The probe then validates the last step instead of submitting.
- Prefill the fields with one realistic sample guest so reviewers see a filled state; the probe
  empties them to test validation and restores them.
The browser probe walks every step, tests Edit, submits and asserts the done panel replaced the steps.

## 14. Date range picker

```html
<div class="w-field"><label class="w-field__label" for="ci">Check-in</label><input class="w-field__input" id="ci" name="checkin" type="date" data-date-end="co" value="2027-07-12" required></div>
<div class="w-field"><label class="w-field__label" for="co">Check-out</label><input class="w-field__input" id="co" name="checkout" type="date" value="2027-07-19" required></div>
<div class="w-stay__calendar" data-date-inline="ci"></div>   <!-- optional always-open calendar for the same pair -->
<h2 class="w-stay__nights" data-nights-title="ci" data-name="Apartment 3"></h2> <p class="w-stay__range" data-nights-range="ci"></p>   <!-- optional -->
```
The engine adds its own classes to what it builds: `w-datepicker-input` on both inputs, a
`span.w-datepicker-field` around an input inside `.w-field` (input gets `w-datepicker-field__input`,
calendar icon `w-datepicker-field__icon`), the popover `.w-datepicker` / `.w-datepicker--inline`
with `w-datepicker__*` elements (`__head __segment __body __nav __nav-button __months __month
__title __grid __weekday __day __foot __summary __clear`) and a Done button
`w-button-primary w-button-primary--small` with `data-dp-done` (styled in components.css).
Both inputs become read-only text fields showing the formatted date; clicking either opens one
popover with check-in / check-out segments, two months (one under 720 px), past days disabled,
the range shaded and a nights count, Clear dates and Done. Hidden inputs keep the ISO value and
the original `name`, so the form still submits `checkin=2027-07-12`. Keyboard: Enter/Space/↓ opens,
arrows by day/week, PageUp/PageDown by month, Esc closes. Use it on every check-in/check-out pair of
a booking site (search dialog, hero, listing, stay page, closing band) — one behaviour everywhere.
i18n keys: `dpAdd dpTitle dpPrev dpNext dpClear dpDone dpNight dpNights dpPickStart dpPickEnd
nightsTitle nightsTitleOne nightsEmpty`. The probe opens the first visible pair, picks two days and
asserts ISO values, field text and that the popover closed inside the viewport.

## 15. Coupon code

```html
<div class="w-booking__coupon" data-brx="block" data-coupon>
  <div class="w-booking__coupon-entry" data-coupon-entry>
    <label class="w-booking__coupon-label" for="cp">Coupon code</label>
    <input class="w-booking__coupon-input" id="cp" type="text" value="DIRECT5" autocomplete="off"> <button class="w-button-secondary" type="button" data-coupon-apply>Apply</button>
    <p class="w-booking__coupon-message" data-coupon-msg aria-live="polite"></p>
  </div>
  <p class="w-booking__coupon-applied" data-coupon-applied hidden><strong data-coupon-code>DIRECT5</strong> applied <button class="w-button-text" type="button" data-coupon-remove>Remove</button></p>
</div>
<div class="w-booking__summary-row" data-coupon-row hidden><dt class="w-booking__summary-term">Coupon −5%</dt><dd class="w-booking__summary-value">−€68.25</dd></div>
<dd class="w-booking__summary-value" data-coupon-full="€1,365" data-coupon-price="€1,296.75">€1,365</dd>   <!-- any element, anywhere on the page -->
```
Wireframe rule: any non-empty code applies (empty → `couponEmpty` message); the discount is authored
per item in the data (row + both prices on every total, deposit, balance and the pay button). Enter
applies. The probe applies an empty code (must fail), the prefilled code, checks every price swapped,
then Remove.

## 16. Copy code

`<button class="w-button-secondary" type="button" data-copy="SILVER-27" data-copy-done="Code copied">Copy code</button>` +
`<p class="w-account__copy-status" data-copy-status aria-live="polite"></p>` in the same `[role=group]` (coupon card) or section.
Without clipboard access the status shows "Copy this: SILVER-27" (i18n `copied`, `copyFailed`).
An empty `data-copy=""` copies the page URL ("Copy link" in a share row).

## 17. Table of contents (scrollspy)

`<nav class="w-contents" data-toc aria-label="In this article"><ol class="w-contents__list"><li class="w-contents__item"><a class="w-contents__link" href="#part-id">…</a></li>…</ol></nav>` beside
long pages (articles, legal pages, FAQ groups). The link of the section being read gets
`aria-current="true"`: the last section whose top has passed the upper third of the viewport, the
first until then. Style the current link from its class plus the attribute
(`.w-contents__link[aria-current="true"]`), never a JS-added class.
Numbers belong in markup (`<span class="w-contents__number">01</span>`), never in CSS `content:`. Targets carry
`scroll-margin-top` for the sticky header. The probe scrolls to the last section and back to the top.

## 18. Quiz — scored recommendation

Questions one at a time → the best-matching items, ranked. Use it instead of the chooser (§12)
when there are more than ~6 answer combinations or the items are real catalogue entries.

```html
<form class="w-quiz__form" id="quiz" data-quiz data-quiz-show="3">
  <p class="w-quiz__counter" data-quiz-counter></p> <progress class="w-quiz__progress" data-quiz-progress max="5" value="1"></progress>
  <fieldset class="w-quiz__step" data-quiz-step data-quiz-weight="3"><legend class="w-quiz__question">Who is coming?</legend>
    <label class="w-choice" data-component="Choice: Option"><input class="w-choice__input" type="radio" name="ko" value="para" required> <span class="w-choice__label" data-prop="label">Just the two of us</span></label> …
  </fieldset>
  <fieldset class="w-quiz__step" data-quiz-step data-quiz-require hidden> … name="gosti" … </fieldset>
  <button class="w-button-secondary" type="button" data-quiz-prev>Back</button>
  <button class="w-button-primary" type="button" data-quiz-next>Continue</button>
  <button class="w-button-primary" type="button" data-quiz-finish>See my matches</button>
  <div class="w-quiz__result" data-quiz-result hidden tabindex="-1">
    <div class="w-quiz__list" data-quiz-list>
      <article class="w-card-match" data-quiz-item data-component="Card: Match" data-quiz-tags="ko=para gosti=2|4 vazno=more|tus">
        <span class="w-card-match__best" data-quiz-best hidden>Best match</span>
        <li class="w-card-match__why" data-quiz-why="vazno=more svrha=more">Sea view</li>   <!-- shown when ANY token matches -->
      </article> …
    </div>
    <p class="w-quiz__empty" data-quiz-empty hidden>…</p>
    <button class="w-button-secondary" type="button" data-quiz-reset>Start again</button>
  </div>
</form>
<section class="w-quiz-offer" id="quiz-offer" data-layout="quiz-offer" data-surface="subtle" data-brx="section" data-quiz-reveal="quiz" hidden>   <!-- anywhere: shown once the quiz is finished -->
  <div class="w-quiz-offer__container" data-brx="container"> … </div>
</section>
```
Continue / Enter validates the current step (`required` radios). Finish scores every item: for each
answered step, an item whose `data-quiz-tags` holds `name=…|value|…` gains the step's
`data-quiz-weight` (default 1); a `data-quiz-require` step drops items that lack the answer. Items
are re-ordered by score (ties keep markup order — put the default order in markup, e.g. by price),
the first `data-quiz-show` are shown with `data-quiz-rank`, `[data-quiz-best]` only on rank 1,
and each `[data-quiz-why]` line only when the visitor gave one of its answers. The result replaces
the steps and takes focus; the form gets `is-finished` (hide the progress row and nav from it with
same-block rules such as `.w-quiz__form.is-finished .w-quiz__progress`);
`[data-quiz-reveal="<form id>"]` elements are shown and stay shown after
Start again (a revealed block must not reset). **Saving the result (lead):** inside `[data-quiz-result]`
put an email field, an optional unticked opt-in box, `<input type="hidden" name="matches" data-quiz-picks>`
and `<button type="submit" formaction="<thank-you>.html" formmethod="get">`; once finished the form
submits for real with the answers, the email and the ranked picks (`data-quiz-id`, else the item's first
link file name). This is the honest lead: the visitor gets what they just saw. i18n `quizCounter`. Tags and reasons come from
the item data (facets) — never invent a reason. The probe tests that an empty step does not
advance, answers every step with its first choice, checks the ranked result and the reveals, then
Start again.

## 19. Countdown — a real deadline

```html
<div class="w-offer__countdown" data-countdown="14400" data-countdown-key="offer-10" role="timer" aria-label="Time left">
  <b class="w-offer__hours" data-countdown-h>04</b> <b class="w-offer__minutes" data-countdown-m>00</b> <b class="w-offer__seconds" data-countdown-s>00</b>   <!-- or one [data-countdown-out] h:mm:ss -->
</div>
<form class="w-offer__form" data-countdown-live> … </form>  <div class="w-offer__ended" data-countdown-done hidden>This offer has ended …</div>
```
Starts when the element is first visible (at load, or when a quiz reveals it), counts down every
second and stores the deadline in `sessionStorage` under the key, so a reload never restarts it.
At zero, inside the same section `[data-countdown-live]` hide and `[data-countdown-done]` show.
Only use it for a deadline that exists anyway (a check-in cut-off, an event start, a booking hold the
system enforces). Do **not** pair it with a discount-for-email or "offer ends in" on consumer sites:
invented urgency is a dark pattern under EU consumer law (UCPD) — a client rejected it (iteration-loop).
For leads, email the visitor's own result instead (§18). The probe reads the time, waits a second
and expects it lower.

## Hard requirement

`[hidden] { display: none !important; }` must stay in `base.css` (the one `!important` the BEM
gate accepts there). `.w-card-product` / `.w-card-post` are `display:flex`, which otherwise
overrides the UA `[hidden]` rule and filtering appears broken while the logic is correct.
