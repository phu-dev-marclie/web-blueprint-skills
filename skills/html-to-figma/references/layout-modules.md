# Layout modules

One file `layouts/<layout>.js` per section layout key (the value of `project.json → sections.layout`).
Start from `example-layout.js`. A module must work on **every** page that uses the layout — inspect all
variants (different child patterns, counts, optional parts, dark/light surfaces) before writing it.

## Contract

```js
EXTRACT["<layout>"] = (sec) => ({ /* plain JSON read from the DOM */ });
BUILD["<layout>"] = async (data, env) => section("<Readable name>", env, { /* … */ }, [ /* children */ ]);
BUILD_MOBILE["<layout>"] = async (data, env) => msection("<Readable name>", env, { /* … */ }, [ /* w: "fill" */ ]);   // only if mobile screens use it
```

- EXTRACT: pure DOM reading in the rendered page; source text via `txt()` (textContent — reveal animations split
  headings into letters and hide them, innerText would miss them); only rendered content (`visible()`), the state
  the page is in (default, or the one `pages[].prepare` produced: the visible wizard panel / tab / menu); images via
  `mediaOf()`. The same EXTRACT serves desktop and mobile (DOM order may differ at 440 — read it, don't assume).
- BUILD: returns exactly one section frame made with `section()` (or `frame()`/`overlay()` for full-bleed cases);
  only `frame` / `text` / `inst` / `media` / helpers — no raw `figma.create*` except inside component defs.
  Layout-dependent finishing (edge fades) → `AFTER_LAYOUT.push(async () => …)`.
- Each file runs in its own block scope: file-local helpers are fine, nothing leaks between files. Helpers several
  layouts need → `build/project-kit.js` (owner: the lead).
- Repeated items → component instances (add the def in `components/50-*.js`); buttons via `btn()`/`btnIcon()`,
  arrow links via `arrowLink()`, images via `media()`, content on photos via `overlay()`, icons via `icon()`.
- Widths by `span(n)`; spacing only from tokens; colours via tokens and `ink(env, …)` on dark surfaces.
- Rich text (links, bold inside a paragraph): one text node, ranges styled with `setRangeFills` /
  `setRangeTextStyleIdAsync`; never one node per run.

## Build loop per module

1. Screenshot the section in each variant page at 1512.
2. Write EXTRACT; run `H.extract(tab, file, {layouts: [name]})` on every page that uses it; inspect JSON
   (no empty titles, no nulls where the HTML has content).
3. Write BUILD; `H.build(pg, {figmaPage: "Sandbox · <name>", only: [name], chrome: false, clear: true})`;
   stack variants side by side with `clear: false` (frames are placed to the right automatically).
4. `H.audit("Sandbox · <name>")` → clean. `bun <skill>/scripts/check.js <project>/figma-bridge` → parses.
5. Export and compare with the screenshot; fix content/hierarchy/proportion mismatches.
6. Remove the sandbox page and tmp files.

## Delegating many layouts to subagents

Group related layouts (heroes; product details; lists/docs; forms; editorial…) into 5–9 tasks of 3–5 layouts.
Give every task the same context block (below) and only its own layouts + pages. Each subagent owns its
layout files and at most one components file `components/50-<task-slug>.js`; shared files (lib, kit,
project-kit, 00-core, 90-chrome, tools) are read-only to them (new icons: read-modify-write of the ICON_SVG map in
`components/00-assets.js` only). Before spawning: build the shared cards/helpers the layouts need (cards used on
many pages go to `components/50-shared.js` + factories in `build/project-kit.js`) and run `H.reference()`.
Afterwards the lead runs `check.js`, builds all components, assembles pages, audits, diffs and visually checks.
Agents stay useful after their report: follow-up fixes and mobile/state versions of their layouts go back to the
same agent (it knows its modules).

### Context block (copy, fill the <…>)

```
# Goal
Rebuild the website <name> (HTML in <site>, served at <siteUrl>) as editable Figma designs. Each page =
Header + sections + Footer; one layout module per section layout. Only your assigned layouts.

# Hard rules
- Desktop 1512; container 1368 = 12 × 92 + 11 × 24. Widths by span(n) = 116n − 24.
- Every frame Auto Layout (frame() does it). No groups, no absolute positioning, no grid layout, no shapes as layout.
- Spacing only 0/4/8/12/16/20/24/32/40/48/56/64/72/80/96/128 (helpers throw otherwise); round CSS values.
- Colours only semantic tokens; text only existing text styles (tokens.json → semantic, type). No new
  variables or styles (effect/gradient styles exist: elevate(), gradient()).
- Meaningful layer names; no "Frame 3"/"Text"/"Line". Repeated UI → component instances; buttons btn()/btnIcon();
  links arrowLink(); images media(); content on a photo overlay(); icons icon().
- Fidelity to the HTML rendered at 1512: content, hierarchy, proportions, surfaces, default widget states. Keep the
  site's tilts (tilt()), staggered/overlapping positions (fixed-size slot frames), shadows (elevate()) and fades
  (edgeFade() via AFTER_LAYOUT) instead of flattening them; report what you approximated.

# Files
Read first: <project>/figma-bridge/REFERENCE.md (components + properties, icons, styles, tokens), build/lib.js,
build/kit.js, build/project-kit.js, components/00-core.js, <skill>/references/api.md, <skill>/references/pitfalls.md,
<skill>/references/example-layout.js. Write: layouts/<layout>.js per assigned layout (BUILD, and BUILD_MOBILE if
asked); optional components/50-<your-slug>.js (COMPONENT_DEFS, unique names; existing: <list>). Never edit other
files. project.json → sections tells how sections and layouts are detected; pages per layout: <map>.

# Harness (JS eval)
const { H } = await (await import("file:///<project>/figma-bridge/tools/load.js")).load();
const tab = await browser.open({ name: "<YourName>", url: H.SITE + "index.html", viewport: { width: 1512, height: 982 } });
H.extract(tab, file, { layouts, prepare?, device? }) / H.buildComponents([yourNames]) /
H.build(pg, { figmaPage: "Sandbox · <YourName>", only, chrome: false, clear: true, device? })
H.audit("Sandbox · <YourName>") / H.exportNode(id, "<project>/tmp-<yourname>.jpg") / H.removePage(...)
Plugin errors carry their message; a syntax error reports "<input>:LINE" — compare with H.source(...) line LINE − 2.
The bridge runs scripts one at a time for all agents: keep scripts bounded; only touch your sandbox page and
your own components. Retry a timeout once; never restart servers.

# Done
Per layout: EXTRACT returns full data on every listed page; BUILD renders every variant; audit clean;
visual comparison done and mismatches fixed; sandbox + tmp files removed. Report: layouts, components added
(names, variants, properties), deviations from the HTML and why.
```
