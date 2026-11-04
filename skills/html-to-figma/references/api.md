# API

## Figma side (available in components/*.js, layouts/*.js BUILD, build steps)

Globals: `PROJECT` (project.json), `TOKENS` (tokens.json), `DATA` (per call), `V` (variables by name),
`TS` (text styles by name), `C` (components by name, refreshed by `refreshComponents()`), `figma`.
Every script is the body of an async function: top-level `await` works, `return` sends the result back.

### lib.js

| Function | Purpose |
|---|---|
| `frame(name, o, kids)` | Auto-layout frame (or component with `o.component`). Kids: nodes/promises; `null`/`false` skipped. |
| `text(name, style, chars, o)` | Text node with text style + colour token. `o.color` (default `text-body`), `o.w`, `o.h`, `o.grow`, `o.align` (`"CENTER"`), `o.link` (substring styled as link, `surface-link`). |
| `inst(comp, props, o)` | Instance (component or set → default variant). `props` = `{PropertyName: value}`; `o.name`, `o.w`, `o.h`, `o.grow`, `o.fill`. |
| `variant(set, {Prop: "Value"})` | Variant component of a set. |
| `nested(instance, exposedName, props)` | Set properties of an exposed nested instance; returns it. |
| `imagePaint(name, scaleMode)` | IMAGE paint from `assets/` (base name ok); `"FILL"` cover, `"FIT"` contain. |
| `solid(token)` | SOLID paint bound to a colour variable (Bricks name: `text-title`, `btn-bg`, `inverse/btn-bg`). |
| `finalize(root)` | Applies deferred sizing top-down. Call once on each root you create (component or page frame). |
| `page(name, {create})` | Figma page by name. |
| `twoToneFill(light, dark, rows)` | Presentation backdrop for component sets showing light + dark variants. |

`frame` options `o`:

| Key | Values |
|---|---|
| `dir` | `"h"` horizontal, default vertical |
| `gap` | 0, px (resolved to `space-*`, `layout-gutter`, `figma/margin`, `figma/px-N` with that value) or a token name (`"space-m"`) — anything else throws |
| `p` | padding: `n`, `[vertical, horizontal]`, `[top, right, bottom, left]` (same values as `gap`) |
| `main` / `cross` | `start` `center` `end` `between` / `start` `center` `end` `baseline` |
| `w` / `h` | number (fixed; column spans auto-bind to `figma/col-N`) or `"fill"`; omitted = hug |
| `grow` | fill remaining space on the parent's main axis |
| `fill` | colour token string or a paint (image) |
| `stroke` | `{color, sides: ["top"…], w, dash: [4, 4]}` — inside, excluded from layout |
| `r` | radius token: `radius-m` or its step `s` `m` `l` `full` |
| `clip`, `wrap`, `wVar`, `component` | clip content · wrap rows (gap also between rows) · bind width to a variable · create a component |

Sizing is deferred: `w: "fill"` works only inside an auto-layout parent — always build the whole tree and
call `finalize` on the root.

### kit.js

| Function / const | Purpose |
|---|---|
| `span(n)`, `CONTAINER`, `GRID` | Column span width; container width; `TOKENS.grid`. |
| `section(name, env, o, kids, bleed)` | Section band: surface fill, `layout-section-pad` rhythm, centred container (`o.dir`, `o.gap`, `o.main`, `o.cross`, `o.surface`, `o.padTop`, `o.padBottom`, `o.firstTop`, `o.sectionGap`, `o.bleedBefore`). `bleed` = full-width nodes after the container. |
| `tok(env, token)`, `ink(env, token, darkToken)`, `onDark(env)`, `themed(theme, token)` | Read a token through the section's surface (`inverse/btn-bg` when the surface re-points it, else the token); `ink` uses `darkToken` on a dark surface when given (`ink(env, "text-title", "text-contrast")`); `themed("Dark", t)` = the dark surface's value for Theme=Dark variants. |
| `headingBlock(d, env, o)` | Eyebrow + title + lede stack. |
| `eyebrow(text, env)` | Eyebrow label. |
| `btn(label, {Type, Size, Theme, State}, o)` | Button instance (defaults Primary/Large/Light/Default). |
| `arrowLink(label, o)` | Link/Arrow instance. |
| `media(name, {img, caption, alt}, {w, h, grow, r, fit})` | Image/Placeholder instance; real photo as fill override. |
| `breadcrumb([{label, current}])` | Breadcrumb row. |
| `variantSet(variants, {name, dir, gap, wrap, w, fill, description})` | Combine variants into an auto-layout set. |
| `textProp(comp, layer, prop, default)`, `boolProp(…)` | Wire a layer to a TEXT / BOOLEAN property (single component). |
| `setTextProp(set, layer, prop, default)`, `setBoolProp(…)` | Same for every variant of a set. |
| `variantSet(variants, {name, dir, gap, wrap, w, fill, description})` | Combine variants into an auto-layout set. |
| `textProp(comp, layer, prop, default)`, `boolProp(…)`, `swapProp(comp, layer, prop, defaultComp)` | Wire a layer to a TEXT / BOOLEAN / INSTANCE_SWAP property (single component). |
| `setTextProp(set, layer, prop, default)`, `setBoolProp(…)`, `setSwapProp(…)` | Same for every variant of a set. |
| `icon(key, {size, color, name})`, `tintIcon(iconInstance, token)` | `Icon/<key>` instance (24 base, rescaled, glyph recoloured). |
| `btnIcon(label, iconKey, values, o)` | Button with its leading icon slot on (needs icon components). |
| `overlay(name, {img, caption}, {…frame opts, scrim, clip, fit}, kids)` | Frame `Image · <name>` with the photo as fill and content on top (heroes, tiles). |
| `svgArt(svg, name, {box | h | scale})` | SVG markup → one flattened vector (logos, icons); masks dropped, colours kept. |
| `elevate(node, "shadow-…")`, `gradient(node, "gradient-…")` | Apply effect / gradient styles from tokens (named after the Bricks tokens; effect layers may be `inset: true` inner shadows or `{backgroundBlur: n}` frosted glass). |
| `tilt(node, cssDeg)` | Rotate like CSS `rotate()` (after the node has its final size). |
| `edgeFade(area, {axis, size \| ratio, edges, mode: "alpha" \| "overlay", color})`, `tokenRGB(token)` | Fade content towards the area edges (marquees, photo walls); run after layout. |
| `AFTER_LAYOUT` | Push `async () => …` from BUILD for layout-dependent work; the harness runs them after the page is laid out. |
| `msection(name, env, {dir, gap, main, cross, surface, padTop, padBottom}, kids)`, `MOBILE` | Mobile section band (side margins from `tokens.gridMobile`). |
| `round4(n)` | Round to the 4px grid (sizes, not spacing). |
| `BUILD`, `BUILD_MOBILE`, `EXTRACT`, `COMPONENT_DEFS` | Registries filled by layout and component files. |

`build/project-kit.js` (optional, project-owned) is loaded after kit.js: project helpers shared by several files
(card factories, section heads); `init_project.py --upgrade` never overwrites it.

`env` passed to BUILD / BUILD_MOBILE: `{first, surface, prevSurface, file, device}`.

### Component def pattern

```js
COMPONENT_DEFS["Card/Product"] = async () => {
  const c = finalize(await frame("Card/Product", { component: true, gap: 16, w: span(4) }, [
    inst(C["Image/Placeholder"], {}, { name: "Image", w: "fill", h: 328 }),
    frame("Content", { gap: 8, w: "fill" }, [
      text("Title", "Heading/H5", "Product", { color: "text-title", w: "fill" }),
      text("Description", "Body/XS", "Short description", { color: "surface-text-muted", w: "fill" }),
    ]),
    arrowLink("View product", { name: "Link" }),
  ]));
  textProp(c, "Title", "Title", "Product");
  textProp(c, "Description", "Description", "Short description");
  for (const n of c.children) if (n.type === "INSTANCE") n.isExposedInstance = true;   // Image, Link
  return c;
};
// page side: const card = await inst(C["Card/Product"], { Title, Description }, { name: "Card · " + Title, w: span(4) });
//            const img = nested(card, "Image", { "Show caption": false }); img.fills = [await imagePaint(d.img)]; img.strokes = [];
```

## Browser side (EXTRACT, tools/extract-kit.js)

`txt(el)` normalised text · `q(root, sel)` · `qa(root, sel)` · `visible(el)` · `assetName(url)` (path below
`assets/` joined with `--`) · `mediaOf(el)` → `{img, alt}` (img/picture/background-image) or `{img: null, caption}` ·
`crumbs(root)` → `[{label, current}]` (bare-text current page included) · `rich(el)` → `{text, links[], strong[]}`.
EXTRACT must return JSON-serialisable data. The extract runs after `prepare` (UI state) at the page's device width.

## Agent side (tools/, Bun) — `const { H, A, D } = await (await import(".../tools/load.js")).load()`

| Call | Purpose |
|---|---|
| `H.status()` | `{server, plugin}` connection check |
| `H.run(code, timeoutMs)` | Run raw plugin code (async body); returns the value |
| `H.runStep(file, data)` | Run `build/<step>.js` with lib + kit (+ project kit) |
| `H.snapshot(title, description)` | Named Figma version (Version history) |
| `H.extract(tab, file, {layouts, prepare, sections, device})` | Render page (1512 or mobile 440), run `prepare`, EXTRACT per section → `{file, title, sections[]}` |
| `H.build(page, {figmaPage, frameName, only, chrome, header, height, device, drawer, clear, x, y, replace})` | Build a page frame; `replace` = replace an existing frame in place; runs `AFTER_LAYOUT` hooks |
| `H.patch(page, {frameName, layouts, device})` | Replace only those sections inside an existing frame (hand edits elsewhere survive) |
| `H.buildComponents(names)` | Build/rebuild component defs (instances swapped, nothing orphaned) |
| `H.harvestIcons(tab, files, {match, out})` | Site inline SVG icons → `Icon/<key>` defs in `components/00-assets.js` |
| `H.reference()` | Write `REFERENCE.md` (components + props, icons, styles, tokens) for layout authors / subagents |
| `H.audit(page?)` | Structural audit; `clean: true` required |
| `H.exportNode(id, path, {scale, format})`, `H.frameId(name)`, `H.frameNameOf(name, device)`, `H.frameOf(entry)` | Visual review exports, frame names (`frameOf` honours `pages[].frame` for team-renamed frames; frames inside Sections are found too) |
| `H.removePage(name)` | Delete a (sandbox) page |
| `A.assemble(tab, {only, names, device})` | Build/replace pages in `project.json → pages` (`only` = files, `names` = entries, `device` = "mobile" / null) |
| `A.order()` | Fresh file only: page order with dividers, Components + Foundations last |
| `D.diffPage(tab, file, frameName, {prepare, sections, device})`, `D.diffAll(tab)` | HTML ↔ Figma text/photo diff per section, in each entry's state |
