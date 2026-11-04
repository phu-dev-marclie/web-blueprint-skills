# Updating the Figma file from a new HTML version

Default: **update the existing file in place**, after a named version snapshot. Do not add parallel
"v2" pages — instances on old pages would follow component changes anyway, so a page copy is not a real
backup; Version history (or duplicating the whole file) is.

## Before touching anything

1. Ask once: has anyone edited page frames by hand or added comments/prototype links? Frames rebuilt in
   place lose manual edits. For edited frames: fix only the affected section with `H.patch` (below), or build the
   new version next to the old one (`H.build(pg, {figmaPage, frameName: "<name> — v2"})`) and let the team merge.
   Signs of hand edits: frame heights that differ from the last build or are off the 4px grid, unknown frames,
   frames moved to the team's own pages — never "fix" those without asking.
2. Servers + plugin as in `workflow.md` §1 (the plugin works on whichever file is open — confirm the file:
   `H.run("return figma.root.name")`).
3. `await H.snapshot("Before <change> — <date>", "<what will change>")`.
4. Inventory the file before assuming anything: pages, frames per page, component names, local
   variables. The team may have reorganised pages, renamed things or pasted assets (e.g. a real logo).
   Work with their organisation — `A.assemble` replaces frames wherever they now live, also inside Sections the
   team grouped frames into (same parent, position, layer order). If the team curated a subset of frames (e.g. one
   "Mockup" page with sample pages only), rewrite `project.json → pages` to exactly those frames (+ `figmaPage`) so
   future assembles neither recreate deleted pages nor miss kept ones.

## Find what changed

```js
const diffs = await D.diffAll(tab);   // per page: sections missingInFigma / missingInHtml, added/removed text, image counts
```

Also compare the section-layout inventory against `layouts/` (new layout keys need modules), re-read CSS
for token changes (colours, fonts, type scale), and check header/footer partials for chrome changes.
If the site is a git repo, `git diff` of the HTML sources is the fastest map.

## Apply

| Change | Action |
|---|---|
| Tokens (colours, fonts, sizes, spacing) | edit `tokens.json` → `H.runStep("build/foundations.js")` (upsert: bindings follow) → re-run the board |
| Header/footer content | `project.json → chrome` / `90-chrome.js` → `H.buildComponents(["Header", "Footer"])` |
| A component's design | edit its def → `H.buildComponents([name])` (instances swapped, overrides kept) |
| New/changed section layout | write/adjust the module → sandbox test → rebuild affected pages, or `H.patch` the section in place |
| One section looks wrong in kept frames | fix the module → `H.patch(await H.extract(tab, file, {layouts: [l]}), {frameName, layouts: [l]})` per frame |
| Text/image changes only | rebuild the affected pages |
| New page / UI state / mobile screen | add a `project.json → pages` entry (with `prepare` / `device` / `x`,`y`) → `A.assemble(tab, {names: [name]})` |
| Team renamed frames (e.g. `1 Home `, `2 Payment `) | set `pages[].frame` to the exact Figma name (trailing spaces included); rebuilds replace that frame in place and keep its name — no need to rename back |

```js
await A.assemble(tab, { only: ["index.html", "wound-care.html"] });   // replaced in place: same page, x/y, layer order
await A.assemble(tab, { names: ["My account · Coupons"] });          // exactly one entry (a file can have many)
```

Never delete a component or variable to "recreate" it: instances become detached orphans and bindings break.

## Verify and report

`H.audit()` clean (includes `orphanInstances: 0`), `D.diffAll` clean for rebuilt pages, frame positions
unchanged, visual check of changed sections. Report: snapshot name, pages rebuilt, components changed
(swapped instance counts), token changes, anything left for the team.
