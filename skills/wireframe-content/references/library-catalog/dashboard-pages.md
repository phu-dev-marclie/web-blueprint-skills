# dashboard-pages (8 layouts)

## breakpointdesktop
- Layout: sidebar nav left / skeleton table right, left-aligned, H:982
- Slots: nav x4, btn-ghost, body(placeholder rows) x6 x5cols
- Fits: dashboard loading/skeleton state | tags: split, list, minimal, compact

## dashboard account 1
- Layout: horizontal tab nav + welcome body text below, left-aligned, H:416
- Slots: nav x5, body, link x2
- Fits: account dashboard landing/welcome message | tags: minimal, compact, left-aligned, list

## dashboard address 1
- Layout: horizontal tab nav + 2-col address cards, left-aligned, H:536
- Slots: nav x5, h2 x2, link x2, body x2
- Fits: billing/shipping address display | tags: grid-2, two-col, list, compact

## dashboard edit account 1
- Layout: horizontal tab nav + stacked account edit form, left-aligned, H:1035
- Slots: nav x5, field x2(row), field, field, accordion(field x3), btn
- Fits: account details edit form w/ password change | tags: list, boxed, compact, left-aligned

## dashboard edit address 1
- Layout: horizontal tab nav + stacked address edit form, left-aligned, H:1363
- Slots: nav x5, field x2(row), field, field, field x2, field x2, field, field, btn
- Fits: long address edit form | tags: list, tall, left-aligned, compact

## dashboard order 1
- Layout: horizontal tab nav + orders table below, left-aligned, H:579
- Slots: nav x5, table(order+date+status+total+btn) x3
- Fits: order history table | tags: table, list, compact, left-aligned

## dashboard page 1
- Layout: horizontal tab nav + skeleton grid rows, left-aligned, H:475
- Slots: nav x5, body(placeholder rows) x4 x5cols
- Fits: dashboard loading/empty state | tags: list, minimal, compact, left-aligned

## dashboard page 3
- Layout: split, avatar card left / tab nav+skeleton grid right, left-aligned, H:551
- Slots: avatar, h2, body, btn | nav x4, body(placeholder rows) x4 x5cols
- Fits: profile sidebar + dashboard content shell | tags: split, image-left, list, compact
