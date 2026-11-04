// Build every site page listed in project.json → pages from the layout modules.
//   await T.A.assemble(tab)                          // all pages
//   await T.A.assemble(tab, { only: ["contact.html"] })
// A page whose frame (pages[].frame, else "<name> — Desktop 1512") already exists anywhere in the file — also inside
// a Section — is replaced in place (same Figma page, Section, position, layer order): the team's organisation is
// kept. A new page goes to its Figma page (pages[].figmaPage, default: its own page named after it) at pages[].x/y
// (default: right of existing frames).
// Several entries may use the same file in different UI states: pages[].prepare (JS run in the page before
// extraction), pages[].sections (selector override), pages[].chrome (true | "header" | false), pages[].header
// (Header properties), pages[].height (fixed viewport-size screen).
import * as H from "./harness.js";

export const PLAN = H.PROJECT.pages;

// only: site files (every entry of that file); names: page names (exactly those entries);
// device: "mobile" (only mobile entries) or null (only desktop entries); omit for both.
export async function assemble(tab, { only = null, names = null, device = undefined, log = console.log } = {}) {
  const existing = new Set(await H.run(H.FIND_FRAME + `await figma.loadAllPagesAsync(); return frameNames();`));
  const results = [];
  for (const p of PLAN) {
    if (only && !only.includes(p.file)) continue;
    if (names && !names.includes(p.name)) continue;
    if (device !== undefined && (p.device || null) !== device) continue;
    const frameName = H.frameOf(p);
    try {
      const pg = await H.extract(tab, p.file, { prepare: p.prepare, sections: p.sections, device: p.device });
      const opts = { chrome: p.chrome ?? true, header: p.header || {}, height: p.height || null, device: p.device || null, drawer: p.drawer || null };
      const r = existing.has(frameName)
        ? await H.build(pg, { ...opts, replace: frameName })
        : await H.build(pg, { ...opts, figmaPage: p.figmaPage || p.name, frameName, x: p.x ?? null, y: p.y ?? null });
      results.push({ ...p, id: r.id, figmaPage: r.page, height: Math.round(r.size[1]), replaced: existing.has(frameName) });
      log(`${p.name}: ${r.page} · ${Math.round(r.size[1])}px${existing.has(frameName) ? " · replaced in place" : " · new"}`);
    } catch (e) {
      results.push({ ...p, error: String(e.message || e).slice(0, 400) });
      log(`${p.name}: ERROR ${String(e.message || e).slice(0, 200)}`);
    }
  }
  return results;
}

// First build only: put pages in project.json order, a divider before each group, then Components and Foundations.
// Do not run on a file the team has reorganised — it moves pages.
export async function order() {
  const groups = [];
  for (const p of PLAN) {
    const g = groups.find((x) => x[0] === p.group);
    const name = p.figmaPage || p.name;
    if (g) { if (!g[1].includes(name)) g[1].push(name); } else groups.push([p.group, [name]]);
  }
  return H.run(`
const groups = ${JSON.stringify(groups)};
for (const p of [...figma.root.children]) if (p.isPageDivider) { if (figma.currentPage === p) await figma.setCurrentPageAsync(figma.root.children.find((x) => !x.isPageDivider)); p.remove(); }
const byName = (n) => figma.root.children.find((p) => p.name === n);
const divider = () => (figma.createPageDivider ? figma.createPageDivider() : Object.assign(figma.createPage(), { name: "---" }));
let i = 0;
const put = (p) => { if (p) figma.root.insertChild(i++, p); };
groups.forEach(([, names], k) => { if (k) put(divider()); for (const n of names) put(byName(n)); });
put(divider());
put(byName("Components"));
put(byName("Foundations"));
return figma.root.children.map((p) => p.name);
`);
}
