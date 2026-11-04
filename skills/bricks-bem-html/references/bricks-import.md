# From spec to Bricks — import, convert, verify

## 1. Describe the area (`scripts/spec_builder.py`)

```python
import pathlib, sys
sys.path.insert(0, str(pathlib.Path.home() / ".agents/skills/bricks-bem-html/scripts"))
from spec_builder import Spec

S = Spec("site-footer", shared={"wrap", "btn", "icon", "icon--sm"})   # existing site classes used as-is
S.css("kp-footer", "%root% { background: var(--bg-base); }", "Site chrome")
S.css("kp-footer__col", "%root% { display: grid; gap: var(--space-xs); }", "Site chrome")
S.css("kp-footer__link", "", "Site chrome")                            # hook class, no CSS yet

S.component("Footer: Link", "Site chrome", "Link in a footer column. Properties: label, link.",
    S.box("Footer link item", "kp-footer__item", "li", [S.keyed(S.link("Footer · Link", "kp-footer__link", "Link", "/"), "link")]),
    [{"id": "label", "label": "Label", "type": "text", "bind": [("link", "text")]},
     {"id": "link", "label": "Link", "type": "link", "bind": [("link", "link")]}])

footer = S.box("Footer", "kp-footer", children=[
    S.box("Column · Apartmani", "kp-footer__col", "ul", [
        S.instance("Footer: Link", "Footer link · Kontakt", label="Kontakt", link=S.ext("/kontakt/")),
    ]),
])
S.write("footer.json", [footer], obsolete=["old-footer-class"])
```

DSL: `box(label, classes, tag, children, **settings)` (div; `tag` = semantic tag or custom
`button/span/i/strong/dialog`), `text(label, classes, value, tag)`, `link(label, classes,
value, url)`, `icon(name, classes)`, `node(name, label, classes, settings)` for any Bricks
element, `attrs(data_x="…")`, `a(url)` (div → link), `keyed(node, key)` + `component()` +
`instance()`. `write()` refuses a class without a `css()` entry (use `""` for hooks), an unused
`css()` entry, or an `obsolete` class still in use. `strip={"btn": [[from, to]]}` removes rules
from shared classes that targeted the converted area — only for classes this spec does **not**
define (the applier aborts otherwise: the upsert would write the rule back). Legacy rules kept in
a shared module are removed there, then every spec that calls it is re-applied.

## 2. Apply (`scripts/bricks_apply.php`)

```bash
cd <wordpress root>
studio wp eval-file ~/.agents/skills/bricks-bem-html/scripts/bricks_apply.php <spec.json> <postId> [backupDir]
```
Order: backup (area elements, global classes, components) → strip → upsert classes (CSS in
`_cssCustom`, category created if missing) → components by label (`create-component` or
`update-component` with digest) → `\Bricks\Abilities\Save_Pipeline::execute()` (revision) →
remove `obsolete` classes not used by any post or component. Re-runnable: classes and
components are matched by name/label. A spec class whose name already exists in **another
category with other CSS** aborts the apply (it is someone else's — e.g. a plugin widget class
`auth__form`); rename it, or take it over on purpose with `write(..., adopt=["name"])`.

Restore: `studio wp eval-file SK/bricks_restore.php <stamp>-post<id>-<area>-<id>.json <postId>
[area] [<stamp>-…-global-classes.json] [<stamp>-…-components.json]` — it saves through Bricks'
Save_Pipeline (a raw `update_post_meta` restore does not persist reliably), or use the Bricks revision.

### Converting an existing Bricks area

Do not retype a page. Export it and edit the generated spec:
```bash
studio wp eval-file SK/bricks_export.php <postId> export.json          # tree + CSS of its classes
python SK/spec_skeleton.py export.json build.py                        # node(...) per element, all settings kept
```
The skeleton keeps text, links, dynamic data, queries, conditions, attributes and images, turns
static `<i data-icon>` placeholders into `icon()` SVG elements, guesses labels and marks every
problem with `# FIX` (no class, `_cssClasses` strings, element CSS, dynamic icons). Edit it into
the spec: classes, labels, `css()`, components; register shared pieces by calling the shared
module. Keep the original **element types** (Bricks' own CSS differs: `.brxe-text-link` is
inline-flex, Basic text cannot loop — loop a div).

Icons whose name is content (`{term_meta:icon}`) need an SVG element with source "Dynamic
data" and a site tag that resolves the name and returns the SVG markup from the icon-set folder
(Kristal Paris: `{kp_icon:term_meta:icon}`, child theme `inc/icon-tag.php`, filter
`bricks/dynamic_data/render_tag`).

### Several workers, one site

The applier read-modify-writes global options; run every apply through the lock:
`python SK/locked.py <project>/.tools/.bricks-lock -- studio wp eval-file SK/bricks_apply.php …`
(shell timeout ≥ 600 s — a killed apply leaves the lock directory; it is taken over after 15 min).
One owner per shared module; page workers only call it. `S.write(scan=[plugin/theme dirs])`
keeps obsolete classes that PHP/JS markup still mentions. `css(..., optional=True)` /
`component(..., optional=True)` let a shared module register a whole catalogue while each spec
writes only what it uses.

## 3. Verify — all four, every time

1. **Pixel parity.** Screenshot the frontend before and after in every UI state the area has
   (desktop, tablet, mobile, menus open, dialog open, off-canvas open and scrolled) with reduced
   motion; diff with a 40/255 threshold → expect 0 changed pixels. If the old CSS had a
   specificity accident that the design relied on, reproduce the *rendered* result, not the
   intended rule (and note it). Take a full-site baseline before the first change; recapture
   once to tell image-decoding / animation noise (it moves) from real changes. A computed-style
   diff of every element (before/after, incl. hover) names the element and property behind a
   pixel change. Hover lists use structural selectors (`.cta-pair > :nth-child(2)`) so they work
   before and after; park the mouse away from the WP admin bar. Pin light/dark **per tab**
   (`evaluateOnNewDocument` overriding `Storage.prototype.getItem` for `brx_mode`): writing
   `localStorage` leaks the mode into every parallel tab of the same browser profile.
   `scripts/pixel_diff.py <before> <after>` diffs two folders (threshold 40, side-by-side sheets)
   and reports `MODE` when a shot named light/dark shows the other mode — never trust such a
   shot as a baseline.
2. **Lint.** Export the CSS of every class used by the area + its components and the rendered
   HTML of the whole page, then `bem_lint.py --skip-class 'brxe-<plugin>-*' area.css page.html`
   → 0 errors in classes and markup the area owns (report pre-existing errors in shared classes
   separately; `--skip-class` globs also match Bricks element classes of PHP widgets).
3. **Builder.** Open the template/page with `?bricks=run`: Structure labels readable, each element
   shows its class, Style → CSS shows `%root%` rules, instances purple with their Properties.
4. **Behaviour.** Exercise JS (menus, dialogs, typing, theme switch) and check console errors.

## Icons: one Bricks icon set, SVG elements

```python
S.icon("arrow-right", "icon icon--sm arrow-link__icon")          # SVG element, source "SVG icon"
S.write("spec.json", roots, icons={"set": "Phosphor (Site)", "dir": "<theme>/assets/icons"})
```
The applier finds or creates the custom icon set (`bricks/create-custom-icon-set`), uploads every
`*.svg` of `dir` that is not in the set yet (`bricks/upload-custom-icon`: sanitized, stored in the
Media Library), and resolves each icon to the value the builder stores:
`{"library": "custom_<setId>", "svg": {"id": <attachment id>, "icon_id": "<icon id>", "url": "…"}}`.
Component `icon` properties take an icon name per instance.

- SVG files must use `fill="currentColor"` / `stroke="currentColor"` so the inline SVG follows
  the text colour; size comes from the `icon` classes (Bricks' `:where(.brxe-svg)` default has no
  specificity).
- Uploads need `bricks_upload_svg` on the role (`get_role('administrator')->add_cap('bricks_upload_svg')`
  or Bricks → Settings → General); otherwise `ability_invalid_permissions`.
- Before replacing icon placeholders, search the theme styles and classes for selectors keyed on
  icon names (`:has(> .pi-arrow-right)`, `.pi-heart`) — they stop matching and the design shifts.
  Move them to role classes (`arrow-link`, `arrow-link__icon`) in the same change.
- Markup that PHP renders (plugin widgets, shortcodes) cannot use Bricks elements; keep a PHP icon
  helper for it that reads the **same** SVG folder, so there is one icon source.

## Several areas, one design system

Keep classes and components used by more than one area in one project module and let each
area spec register only what it uses:
```python
# .tools/bricks-ds/shared.py
def arrow_link(S, inverse=False): S.css("arrow-link", …); …; S.component("Link: Arrow", …)
# header/build.py and footer/build.py
from shared import brand, arrow_link
arrow_link(S)                      # identical definition in every spec
```
Applying any spec then upserts the same CSS and component — no area can overwrite a shared piece
with an older copy. Re-apply every area that uses a shared piece after changing it, and diff all
of them (header + footer when the brand or a button changes).

Pixel parity must include **hover/focus states** of links and buttons (hover the element, wait
for transitions, screenshot) — most hidden-CSS regressions only show there. Check that the
hover screenshot differs from the resting one, otherwise the hover was not exercised.

## Bricks facts that bite

- `_cssCustom` of a global class is persisted with the real selector (`.btn {…}`); the builder
  shows it as `%root%`. Bricks 2.4 can sync simple declarations to style controls — fine.
- A global class's CSS is printed only on pages where an element uses it. Markup rendered by
  PHP (plugin elements, shortcodes) needs the plugin to register its classes for output —
  on the frontend *and* in the builder canvas (`Assets::generate_global_classes()` with the
  class ids, isolated like `Integrations\Block_Editor::generate_gutenberg_global_classes_css`).
- Save element rows with PHP **arrays** for `settings` (objects crash component resolution).
- Component instance row: `{ id, name: <root element name>, parent, children: [], label, cid,
  properties: {…}, settings: [] }`.
- Abilities from PHP: `wp_get_ability( 'bricks/create-component' )->execute( $input )` under an
  administrator (`wp_set_current_user`).
- Theme styles may set `[hidden] { display: none !important }`.
- Header/footer trees live in `_bricks_page_header_2` / `_bricks_page_footer_2`; use
  `\Bricks\Database::get_bricks_data_key( $area )`.
- Bricks prints sibling elements without whitespace: `<b>` + `<span>` lose the space the
  hand-written HTML had — add it in CSS on the second element or keep text in one element.
- Classes used only inside rich text of a component are not printed; give such markup elements.
- Classes used only by PHP-rendered markup must be registered for output by the plugin (or a
  category that the site always prints); otherwise they vanish on pages without a Bricks user.

## Builder canvas helper (child theme)

Panels opened by JS stay invisible in the builder, and legacy PHP icon placeholders (not yet
converted to SVG elements) render as empty 90 px boxes. A builder-only stylesheet fixes both
(enqueue on `wp_enqueue_scripts` when `bricks_is_builder_iframe()`):

```php
$css = ':where([data-icon]:empty){display:inline-block;width:20px;height:20px;background:currentColor;'
     . '-webkit-mask:var(--icon) center/contain no-repeat;mask:var(--icon) center/contain no-repeat}'
     . '[data-icon]:empty{min-width:0;min-height:0;outline:0}';
foreach ( glob( get_stylesheet_directory() . '/assets/icons/*.svg' ) as $f ) {
	$n    = basename( $f, '.svg' );
	$css .= "[data-icon=\"$n\"]{--icon:url(\"" . esc_url( get_stylesheet_directory_uri() . "/assets/icons/$n.svg" ) . '")}';
}
if ( 'header' === \Bricks\Templates::get_template_type( get_the_ID() ) ) {   // only while editing the header
	$css .= '.mega.mega[hidden]{display:block!important}'                     // doubled class beats class CSS injected later
	      . '.search-dialog.search-dialog:not([open]){position:relative;display:block;margin:2rem auto}'
	      . '.nav-panel.nav-panel{position:relative;inset:auto;transform:none;width:390px;margin:2rem auto}';
}
wp_register_style( 'builder-canvas', false, [], null );
wp_enqueue_style( 'builder-canvas' );
wp_add_inline_style( 'builder-canvas', $css );
```
