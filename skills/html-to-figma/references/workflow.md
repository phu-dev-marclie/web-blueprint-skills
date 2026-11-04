# First conversion — step by step

`<skill>` = this skill's folder; `<project>` = the website project; `<site>` = folder with the built `*.html`.
JS snippets run in the agent's JS eval kernel (Bun). Re-run setup after a kernel restart.

## 1. Setup

```bash
python <skill>/scripts/init_project.py --project <project> --site <site> --name "Brand"   # creates <project>/figma-bridge
python <skill>/scripts/convert_images.py --site <site> --out <project>/figma-bridge/assets
python -m http.server 4173 --bind 127.0.0.1          # run inside <site>, as a long-lived service
bun <skill>/bridge/server.js --assets <project>/figma-bridge/assets   # long-lived service, port 3999
```

Ask the user (one question, exact steps):
1. Open the target **Figma Design** file in Figma Desktop (a new empty file for a first build).
2. First time only: Menu → Plugins → Development → **Import plugin from manifest…** →
   `<skill>/bridge/manifest.json`.
3. Run **HTML → Figma Bridge (local)**; keep its small window open until the work is done ("Connected").

```js
const T = await (await import("file:///<project>/figma-bridge/tools/load.js")).load();
const { H, A, D } = T;
await H.status();                       // { server: true, plugin: true }
const tab = await browser.open({ name: "site", url: H.SITE + "index.html", viewport: { width: 1512, height: 982 } });
```

Re-run the `load()` line after editing any file in `tools/` (Bun caches modules by path; `load()` copies them
to a fresh folder). Files in `build/`, `components/`, `layouts/` are read fresh on every call.

### From a ux-wireframe build

```bash
python wireframe/build.py --final        # in <project>: strips review-only blocks
python wireframe/handoff.py              # → wireframe/handoff/figma.json (tokens, chrome, pages, states, fonts, icons)
python <skill>/scripts/init_project.py --project <project> --from-wireframe <project>/wireframe [--mobile]
python <skill>/scripts/convert_images.py --site <project>/wireframe --out <project>/figma-bridge/assets
```

`init_project` fills `project.json` (name, siteDir, sections, chrome, pages + UI states, `--mobile`: mobile screens)
and `tokens.json` (template semantic names kept, values from the wireframe CSS), then prints the fonts to install in
Figma and the icon call — after `load()`: `await H.harvestIcons(tab, <handoff icons.files>)` (default match fits the
wireframe's `pi-<name>` icons). Serve `<project>/wireframe`; in §2–3 check the pre-filled values instead of
surveying from scratch.

## 2. Survey the site

- List pages (`project.json → pages` is pre-filled from the `<title>`s — rename to clean page names, set
  `group` for page ordering).
- Find how sections are marked up. Set `project.json → sections`:
  - `selector`: top-level sections, e.g. `"main > section"`, `"body > section[data-layout]"`.
  - `layout`: JS expression naming the section's layout, e.g. `"sec.dataset.layout"`,
    `"(sec.className.match(/\\bsection--([\\w-]+)/) || [])[1] || sec.id"`. Same visual layout → same key on every page.
  - `surface`: JS expression → a key of `tokens.json → surfaces` (`default`, `subtle`, `brand`, `inverse`…),
    e.g. `"sec.classList.contains('dark') ? 'inverse' : 'default'"`.
- Inventory layouts × pages (one evaluate over all pages) — this is the module work list.
- Screenshot each distinct layout at 1512 (hide sticky headers / dev bars first).
- Read computed styles of key elements (font family/size/weight/line-height/letter-spacing, colours,
  paddings, gaps, radii, container width) and the site CSS custom properties.

## 3. Tokens (`tokens.json`)

- `fonts.heading` / `fonts.body`: the site's families. Check they are installed in Figma
  (`figma.listAvailableFontsAsync()`); every style name used in `type` must exist in that family.
- `primitives`: the site palette (hex). `alpha`: translucent whites/blacks used on dark surfaces.
- `semantic`: keep all names (lib, kit and core components use them), point them at the right primitives;
  add project-specific ones (e.g. `bg/care`) and add their surfaces under `surfaces`.
- `type`: map the site's type scale to the style names; line heights rounded to 4px; letter spacing in %.
- `space`, `radius`: 4px multiples. `grid` stays 1512/12/92/24/72 unless the user asks otherwise
  (foundations checks the arithmetic). If the site's container differs (e.g. 1248 content), ask once: site
  proportions on a custom grid vs. the skill grid — then map the site's fractions onto column spans.
- `section.padY` / `ruleBetweenPlain`: the site's vertical rhythm between sections.
- `effects` / `gradients`: the site's box-shadows and linear-gradients as effect/paint styles (kit `elevate()`,
  `gradient()`), so cards, menus, form panels keep their shadows. Translucent overlays stay colour tokens.
- Mobile screens requested: `gridMobile` (440 page, the site's mobile side padding) and `mobile: [size, lh]` on every
  heading style whose size changes at the mobile width (measure there; body sizes usually stay) — foundations adds
  the Typography mode "Mobile" (needs a paid Figma plan for modes).

```js
await H.runStep("build/foundations.js");          // upsert; { reset: true } only on a blank file
await H.runStep("build/foundations-board.js");    // "Foundations" page: live specimens
```

## 4. Components

- Icons: the site's inline SVG icons → `await H.harvestIcons(tab, files, { match })` (default class `pi pi-<name>`
  for Phosphor; pass the site's pattern, e.g. `"lucide-([\\w-]+)"`). Include pages whose menus/states are hidden by
  default — hidden SVGs are collected too. Writes `components/00-assets.js` (built before 00-core, so `Button` gets
  its `Show icon` + `Icon` slot for kit `btnIcon()`).
- Logos / payment marks (SVG): add defs to `components/00-assets.js` with kit `svgArt(svg, "Artwork", {h})` — the
  real vector, flattened (multi-colour regions kept, clip-path masks dropped). Light/Dark: recolour `currentColor`.
- `project.json → chrome`: utility links, nav items (`menu: true` adds ▾), CTA, footer columns/legal text. Large
  menu content (mega menus) can live there too and feed panel components.
- Edit `components/90-chrome.js` when the real header/footer differs from the generic one (keep the names
  `Header` / `Footer`; header states as variants picked by `pages[].header`; mobile = `Header/Mobile`,
  `Footer/Mobile`).
- Repeated items found in the survey (cards, rows, chips, steps) → `components/50-<area>.js`. Photos in cards: lock
  the aspect ratio of the image layer in the component (`node.lockAspectRatio()`), because a page cannot resize a
  nested fixed-height layer of an instance.
- Helpers several layouts share (card factories, section heads) → `build/project-kit.js` (loaded after kit.js, never
  overwritten by `init_project.py --upgrade`).

```js
await H.buildComponents();                        // all, in file order; or ["Card/Product", "Header"]
await H.reference();                              // REFERENCE.md for layout authors / subagents
```

## 5. Layout modules

Write `layouts/<layout>.js` per layout (see `layout-modules.md`). Test each in a sandbox page:

```js
const pg = await H.extract(tab, "contact.html", { layouts: ["faq-split"] });
const r = await H.build(pg, { figmaPage: "Sandbox", only: ["faq-split"], chrome: false, clear: true });
await H.audit("Sandbox");
await H.exportNode(r.id, "<project>/tmp-faq.jpg", { scale: 0.5 });   // then view it next to the HTML screenshot
```

`bun <skill>/scripts/check.js <project>/figma-bridge` catches syntax errors in every module at once.

## 6. Pilot, then all pages

```js
await A.assemble(tab, { only: ["index.html"] });   // pilot: show the user before building everything
await A.assemble(tab);                             // every page in project.json → pages
await A.order();                                   // fresh files only: page order + dividers
await H.removePage("Sandbox");
```

### UI states, overlays and mobile screens (extra `pages[]` entries)

Several entries may share a file; each is its own frame. Keys besides `file`, `name`, `group`, `figmaPage`, `x`, `y`:

| Key | Use |
|---|---|
| `prepare` | JS (async body) run in the loaded page before extraction: click "Next", open a tab, show a panel. E.g. `"document.querySelector('[data-wizard-next]').click(); await new Promise((r) => setTimeout(r, 500));"` |
| `header` | Header variant props, e.g. `{"Account": "Signed in"}`, `{"Menu": "Stays"}` |
| `sections` | override of `project.json → sections` (selector/layout/surface), e.g. map the hero to a `mega-menu` layout |
| `chrome` | `true` (Header + Footer), `"header"`, `false` |
| `height` | fixed viewport screen (clipped), e.g. 984 desktop, 956 mobile |
| `device` | `"mobile"`: 440 frame named "… — iPhone 16 & 17 Pro Max", tab at 440 × 956, `BUILD_MOBILE`, `Header/Mobile` + `Footer/Mobile`, Typography mode Mobile, mobile grid |
| `drawer` | `{layout, width, side}`: that section is an off-canvas panel; the rest of the page is built behind a darkened strip |

Wizard steps, account tabs, open mega menus, filter drawers and their mobile versions are all built this way;
layout modules read the visible panel/state in EXTRACT (`qa(...).find(visible)`). Mobile builds:
`BUILD_MOBILE[layout]` in the same layout file, `msection()` bands, `w: "fill"` children.

Use `A.assemble(tab, { names: [...] })` / `{ device: "mobile" }` to build exactly those entries (`only` matches every
entry of a file).

## 7. Verify

```js
await H.audit();                  // clean: true required
const diffs = await D.diffAll(tab);   // per page and state: sections with added/removed text or photo count mismatch
```

Visual check: export 3–4 complex pages at scale 0.25 and place them next to full-page HTML screenshots
(PIL side-by-side; for states run the same `prepare` before the screenshot, mobile at 440). Fix modules, rebuild the
affected pages, re-audit.

## 8. Report to the user

Pages built (where), component list, token collections, the font switch (`font/heading`, `font/body`),
how images are swapped, deviations from the HTML and why, how to rebuild (`A.assemble`), what needs the
plugin open. Remove `tmp-*` exports and `.tool-cache/`.
