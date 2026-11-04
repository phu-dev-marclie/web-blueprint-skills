# Components — the reusable layer

Classes answer "how does it look"; components answer "what is it made of". A Bricks
Component is a stored element tree; every instance points to it (`cid`) and only stores
property values. Edit the main component once → every instance changes.

## When to extract

| Situation | Do |
| --- | --- |
| Same structure ≥2 times, only text/link/image/visibility differ | Component |
| Same look, different structure | Shared classes only (no component) |
| One-off section | Plain elements + classes |
| Variant that changes structure (extra row, different order) | Separate component |
| Variant that changes only look | Same component + class preset / modifier |

Header example (6 components, 25 instances): `Button: Check availability` (2),
`Nav: Link` (5), `Mega menu: House card` (3), `Mega menu: Traveller link` (3),
`Mobile menu: Link` (5), `Mobile menu: Sub link` (7).

## Button system

**One class and one component per button type** (no look modifiers), `w-` prefix everywhere, so a
change to "all primary buttons" is one edit (`references/class-system.md` §3):

| Component | Root class | Properties |
| --- | --- | --- |
| `Button: Primary` | `w-button-primary` | Label (text), Link (link), Icon (icon), Hide icon (toggle), Extra classes (class, multiple) |
| `Button: Secondary` | `w-button-secondary` | same |
| `Button: Text` | `w-button-text` | same |
| `Button: Pill` | `w-button-pill` | same |
| `Button: Icon` | `w-button-icon` | Icon (icon), Link or action, Label for screen readers (text) |
| `Button: <Action>` | its type class + behaviour attributes | Label, Icon, Hide icon, Extra classes — e.g. `Button: Check availability` opens a dialog via `data-dialog-open` baked into the component |

Size/width modifiers of a type (`w-button-primary--small`, `--block`) come in through the
**Extra classes** property. A component's look inside one section is written in that section's
CSS as `.w-section .w-button-primary` (the only allowed cross-block form).

Type and text roles are plain reusable global classes (no component needed): `w-heading-2xl/xl/l/m/s`,
`w-text-l/m/s`, `w-eyebrow`; cards are components `w-card-<kind>` (`Card: Stay` = `w-card-stay`).

## Properties (Bricks 2.x)

| Type | Bind to (control key) | Use for |
| --- | --- | --- |
| `text` | `text` (Basic text, Text link, Heading), `altText` (Image) | labels, titles, counts, alt |
| `link` | `link` on the element rendering `<a>` | href |
| `image` | `image` (Image element) | photos |
| `toggle` | `_hideElementFrontend` + `_hideElementBuilder` | optional parts ("Hide icon"); value `on`/`off`, `off` removes the setting |
| `class` | `_cssGlobalClasses` on the root; `multiple: true`, no `options` = merge any classes; `options` = named presets (instance stores the option id), `replace: true` to swap variants | sizes, widths, parent layout hooks |
| `icon` | `iconSet` of an SVG element (source "SVG icon") | per-instance icon from the site icon set; value `{library: "custom_<setId>", svg: {id: <attachment>, icon_id, url}}` |
| `editor` | rich text control | long formatted copy |
| `query` | `query` on the component root (root has `hasLoop: true`) | loop cards: each instance sets its own query (`Card: Stay` lists the house's apartments here, siblings there) |

Cannot be bound: custom attributes (`_attributes`, e.g. `data-dialog-open`, `aria-*`). Keep
behaviour attributes fixed inside the component (one component per behaviour, e.g.
`Button: Check availability`).

Instances carry no settings or classes of their own (no conditions, no extra classes): give
the component an `Extra classes` property, and keep elements that need display conditions as
plain elements (or put the condition inside the component and bind it).

## Loop components (cards in query loops)

Put the loop on the **component root** (`hasLoop: true`, a default `query`) and expose a
`query` property; an instance is then one loop — no looped wrapper element, so grids and
scrollers keep their direct children. Dynamic data inside the component (`{post_title}`,
`{acf_…}`, nested loops such as photo slides or badges) resolves per item. Optional parts per
instance (badges on some lists only) are `toggle` properties. Verify in the builder too: the
canvas renders the loop items of an instance.

Not a component, even when repeated: structures whose parts differ by **behaviour** (a link
vs a dialog button) or **source** (static image vs query-loop photo) — properties cannot swap
element types or loops. Share the classes and document the structure in the shared module.

## HTML contract (before Bricks)

```html
<a class="w-button-primary" href="/kontakt/" data-component="Button: Primary">
  <i class="w-icon w-icon--sm" data-icon="arrow-right" data-prop="icon"></i>
  <span class="w-button-primary__label" data-prop="label">Kontakt</span>
</a>
```
- `data-component` on the instance root = component label (`Group: Variant`).
- `data-prop` on every element whose value differs per instance = property id.
- Catalogue table (design doc) lists: label, root classes, properties (id · type · binds to),
  instances. Every `data-component` value must be in the catalogue.

## Naming

- Label `Group: Variant` (`Card: Stay`, `Nav: Link`), category = area (`Buttons`, `Site chrome`, `Cards`).
- Description says what it is for and what you can change: "Primary button that opens the
  availability dialog. Properties: label, hide icon, extra classes."
- Element labels inside the component describe the part (`Card · Title`), instance labels say
  which one (`Nav link · Kontakt`).

## Writing components programmatically

Use Bricks abilities (`bricks/create-component`, `bricks/update-component` with
`expectedDesignSystemVersion` + `expectedComponentDigest` from `bricks/get-component`), never
hand-write the components option. `scripts/bricks_apply.php` does this by label (create or
update), then writes instances as `{ id, name: <root element name>, parent, children: [], cid,
properties: { propId: value } }` with arrays (not objects) for settings. Value formats:
text → string, link → `{type:"external", url}`, image → `{id, size, url}`, toggle → `"on"|"off"`,
class (multiple) → array of global class ids.

Deleting a component orphans its instances (placeholder in the builder): replace instances
first and get the user's confirmation (see `bricks-components` skill).
