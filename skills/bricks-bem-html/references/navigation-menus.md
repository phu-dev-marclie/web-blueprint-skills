# Navigation from WordPress menus

Lists of links (footer columns, legal links, simple header/side menus) are **content**, not
design: editors change them in **Appearance → Menus**, Bricks owns only the markup and classes of
one item, repeated by a query loop. Never hand-place a list of Text Links in Bricks.

Why not the Bricks Nav Menu element: it renders WordPress's own markup (`menu-item`,
`sub-menu`…), which can only be styled with descendant selectors — the opposite of BEM.

## Setup (once per site)

1. Copy `assets/menu-query.php` into the child theme (`inc/menu-query.php`) and require it.
   It registers the query type **WordPress menu**, a **Menu** select on Div/Block/Container/
   Section (below the query control), and the tags `{menu_item_title}` / `{menu_item_url}`.
   Rename the prefix/tags if the site already uses them (Kristal Paris: `kp_menu`,
   `{kp_menu_item_title}`).
2. Create one menu per list with a stable slug (`footer-apartmani`, `footer-pravno`) and a
   readable name (`Footer: Apartmani`). Avoid `·` and other symbols in names that become slugs.
   Link items to real objects (pages, posts, CPT items, terms, post-type archives) so URLs follow
   permalink changes; use custom links only for anchors or pages that do not exist yet.
   Script it for reproducibility (create if missing, `reset` to rebuild) — see the Kristal Paris
   `.tools/footer-bem/menus.php`.

## Markup in Bricks

```
ul.kp-footer__menu                      (no loop: the list)
  li.kp-footer__menu-item   hasLoop, query.objectType = WordPress menu, Menu = footer-apartmani
    a.kp-footer__menu-link  text {menu_item_title}, link {menu_item_url}
```
The loop element is the item (`li`); the list layout lives on its non-looping parent.

Spec (`spec_builder.py`):
```python
S.box("Menu item (loop)", "kp-footer__menu-item", "li", [
    S.link("Menu item · Link", "kp-footer__menu-link", "{menu_item_title}", "{menu_item_url}"),
], hasLoop=True, query={"objectType": "site_menu"}, siteMenu="footer-apartmani")
```

## As a component (several columns)

`Footer: Menu column` = heading + the list above; properties:
- `title` (text) → heading `text`
- `menu` (**select, no options**) → the loop element's `siteMenu` control. A select property
  without its own options shows the bound control's options, so instances get a dropdown of
  the site's menus.

## Verify

- Frontend shows every item with the right URL (count them).
- Rename one menu item in WordPress → the frontend changes without touching Bricks → revert.
- Builder: the loop renders (it loads a moment after the canvas), instance shows Title + Menu.
- Lint: Bricks adds an empty `<li class="brx-query-trail">` after each loop — `bem_lint.py`
  skips `brx-*` runtime markers.

## Limits

- Top-level items only. For a submenu, nest a second loop and filter by
  `menu_item_parent` (extend the run filter) — or keep deep menus in a dedicated element.
- Current-page state (`aria-current`) is not set; add a `{menu_item_current}` tag returning
  `page` when `$item->object_id` / `$item->url` matches the queried object if the design needs it.
