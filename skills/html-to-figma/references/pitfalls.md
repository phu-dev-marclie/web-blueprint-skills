# Pitfalls and fixes (all observed in real runs)

| Symptom | Cause | Fix |
|---|---|---|
| Plugin window never shows "Connected"; Figma console: `Invalid value for devAllowedDomains … must be a valid URL` | Figma rejects IP literals (`http://127.0.0.1:3999`) in the manifest | Keep only `http://localhost:3999` (as shipped); server listens on 127.0.0.1 and ::1 |
| `timeout: plugin did not answer` | Plugin closed, wrong file focused, or a previous server still holds port 3999 | Ask the user to (re)run the plugin in the right file; `netstat -ano | findstr :3999`; one server only |
| Old plugin still open in another file runs your scripts | Every open bridge plugin polls the same port | Confirm `figma.root.name` before writing; ask to close other bridge windows |
| Code changes in `tools/` have no effect | Bun caches ES modules by path (query strings don't help) | Always import via `tools/load.js` → `load()` again |
| `EADDRINUSE` on 3999/4173 | Orphan server from an earlier session | Find PID with `netstat -ano`, stop it, restart the service |
| `ERR_EMPTY_RESPONSE` from the local site | Two processes on the port | Kill both, start one |
| `figma.createImage` fails / image missing | WebP/AVIF/SVG not supported | `convert_images.py` → jpg/png; SVG logos pasted as vectors by the user |
| `page.children` throws | `documentAccess: dynamic-page`: pages not loaded | `await figma.loadAllPagesAsync()` (lib does it) |
| Glyph boxes for Arabic/CJK text | Inter/most Latin fonts lack those scripts | Add twin text styles (e.g. `Heading/H3 · Han` with Noto Sans SC) and use them for those strings |
| Row height 1px off the grid | Baseline alignment across two font families | Pin the row height to its 4px value |
| Font switch breaks styles ("missing font") | New family lacks a style name ("Semi Bold" vs "SemiBold") | Check `listAvailableFontsAsync`; adjust `tokens.json → type` styles; re-run foundations |
| Text style shows Inter after changing `font-family-display` | Style not bound (created before binding existed) | Re-run `foundations.js` (binds every style's family and `text-*` size) |
| `missing variable text/default` (or `space/16`, `bg/page` …) | Project modules / tokens.json from before the Bricks naming | Port them to the template names (`text-title`, `space-m` or px, `bg-body`); `init_project --upgrade` refuses old tokens.json |
| `no spacing token 22.6` | A Bricks length off the 4px grid passed straight to `gap` / `p` | Pass the token name (`"space-l"`) or the snapped px from tokens.json |
| Instances vanished / "orphanInstances" > 0 after a rebuild | A component was deleted and recreated | Only `H.buildComponents` (swap first). To repair: swap orphans to the current component by name |
| A component disappeared from the Components page but instances still render | Node removed from the tree (parent null) while referenced | `getNodeByIdAsync(id)` still returns it: re-insert into the Components page before rebuilding |
| `vectorNetwork` errors (`getVectorNetworkAsync is not a function`) | Async getter not in this API version | Read `node.vectorNetwork`, write `setVectorNetworkAsync()` |
| Variant set clipped / only first row visible | Set counter axis fixed after `combineAsVariants` | `variantSet()` sets both axes to AUTO (and FIXED width only when wrapping) |
| `w: "fill"` error | FILL set before the node has an auto-layout parent | Build the full tree, then `finalize(root)` once |
| `no spacing token N` | Off-grid spacing | Round to the nearest token; never add odd tokens |
| `has no property X` | Wrong component property name or property not wired | Check `componentProperties`; wire with `textProp`/`setTextProp` |
| Edits applied to the wrong lines in agent-written files | Line-number drift after earlier edits | Re-read before editing; run `check.js` after every batch of edits |
| Diff reports hidden text as "added" | Collapsed `<details>`, inactive tabs | diff.js skips closed details/hidden nodes; build default states only (other states = `prepare` entries) |
| Diff photo count is one higher than the HTML | A raster decoration (dashed route PNG) is an overlay fill | Expected; mention it in the report |
| Frames on the team's page have new names ("1 Home") | The team renamed frames after the build | Rebuilds by name would add new frames: update `pages[].name` (or ask) before assembling; `D.diffPage` needs the current frame name |
| Several agents' files collide (`Identifier already declared`) | Shared scope | Harness wraps each component/layout file in its own block; share helpers via kit or `build/project-kit.js` |
| Error is only `at <input>:LINE:COL` with no message | Old bridge plugin code (QuickJS stacks omit the message) | Current `bridge/code.js` sends `name: message` + stack — re-run the plugin. `at AsyncFunction (native)` = syntax error in the composed script: `H.source(...)` line ≈ LINE − 2 |
| Syntax error at a line with `?.(`, or `Cannot declare … twice` | Optional-call chaining / a `const` that shadows a parameter or a top-level helper (`media`, `MOBILE`) in the concatenated script | Avoid `a?.b()`; name locals so they cannot clash with lib/kit/build-step globals; `check.js` catches duplicate top-level consts |
| `H.run` hangs for minutes | Plugin closed / file switched | Server now fails fast ("plugin not connected"); ask the user to re-run the plugin; `H.status()` |
| Text property set to a long value renders one character per line | The component's text is EMPTY with fill width: Figma lays it out at 0 px | Give every fill-width text a non-empty default (`"Placeholder"`) and the property the same default |
| A swapped icon in a button turns invisible | Instance swap drops the glyph colour override (navy icon on navy button) | Re-tint after swapping (kit `btnIcon` copies the label colour) |
| `resize()` on a nested layer of an instance has no effect | Fixed size of nested layers is not overridable from the plugin | Lock the aspect ratio in the component (`node.lockAspectRatio()` on a fill-width image) or size the instance itself |
| Photo heights 241.5, frames off the 4px grid | Aspect-locked photos at non-multiple widths | H.build pins every section to the next 4px step; keep exact ratios (4:3, 16:9) in components |
| Gallery photos overwrite each other in `assets/` | Same file names in different folders (01.jpg per stay) | Asset names are the path below `assets/` joined with `--`; re-run `convert_images.py` |
| Imported SVG logo shows black boxes | Clip-path shapes flattened as filled vectors | kit `svgArt()` drops mask/clip shapes and invisible paints before `figma.flatten` |
| Breadcrumb misses the current page | It is a bare text node (`<a>Home</a> › Contact`) | `crumbs()` reads text nodes in order |
| Mega menu / dropdown never appears in screenshots or extraction | Shown on `:hover` only (`display:none` otherwise) | In `prepare`, set the panel's `style.display = 'block'` (screenshots: `page.hover` in the same `tab.run`) |
| Linked texts in instances show Inter without a style after reopening the file | Range overrides (underline) on instance texts got reset | Re-apply the main component layer's text style (`setTextStyleIdAsync`) and the underline; prefer link styles in components |
| Effects/gradients look different from the site | Raw effects on layers / not measured | Measure `box-shadow` / `linear-gradient` in the browser; `tokens.json → effects/gradients`; apply with `elevate()` / `gradient()` |
| Variable modes cannot be added | Free Figma plan (1 mode per collection) | Remove `gridMobile` / mobile sizes or upgrade; mobile frames then need separate mobile text styles |
