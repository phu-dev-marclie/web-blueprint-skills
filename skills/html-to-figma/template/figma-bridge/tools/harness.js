// Agent-side harness (Bun / omp JS eval). Load through tools/load.js — Bun caches modules by path, so a plain
// re-import keeps running stale code:
//   const T = await (await import("file:///<project>/figma-bridge/tools/load.js")).load();   // T.H, T.A, T.D
// Needs: bridge server (bun <skill>/bridge/server.js --assets <project>/figma-bridge/assets) + plugin "Connected",
//        the site served at project.json → siteUrl.
import { readdirSync, existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const HERE = import.meta.dir;
export const ROOT = HERE.includes(".tool-cache") ? resolve(HERE, "..", "..") : resolve(HERE, "..");
export const PROJECT = JSON.parse(readFileSync(join(ROOT, "project.json"), "utf8"));
export const TOKENS = JSON.parse(readFileSync(join(ROOT, "tokens.json"), "utf8"));
export const SITE = PROJECT.siteUrl.endsWith("/") ? PROJECT.siteUrl : PROJECT.siteUrl + "/";
// Frame names: "<page> — Desktop 1512" or, for device "mobile", "<page> — iPhone 16 & 17 Pro Max" (Figma's 440 preset).
export const frameNameOf = (pageName, device = null) => pageName + (device === "mobile" ? " — iPhone 16 & 17 Pro Max" : PROJECT.frameSuffix ?? " — Desktop 1512");
// Frame of a project.json → pages[] entry: `frame` when the team renamed it in Figma, else the generated name.
export const frameOf = (entry) => entry.frame || frameNameOf(entry.name, entry.device);
// Figma-side finder: a page frame by name, also inside Sections the team grouped frames into (any depth).
// Defines findFrame(name) → {f, page} | null; needs all pages loaded.
export const FIND_FRAME = `
const findFrame = (name) => {
  const walk = (kids) => { for (const n of kids) { if (n.name === name && n.type !== "SECTION") return n; if (n.type === "SECTION") { const f = walk(n.children); if (f) return f; } } return null; };
  for (const p of figma.root.children) { const f = walk(p.children); if (f) return { f, page: p }; }
  return null;
};
// Names of every page frame (top level and inside Sections).
const frameNames = () => { const out = []; const walk = (kids) => { for (const n of kids) { if (n.type === "SECTION") walk(n.children); else out.push(n.name); } }; for (const p of figma.root.children) walk(p.children); return out; };
`;
const read = (p) => Bun.file(p).text();

// ---------- Figma execution
export async function run(code, timeoutMs = 240000) {
  const r = await fetch(`http://127.0.0.1:3999/run?timeout=${timeoutMs}`, { method: "POST", body: code, headers: { "Content-Type": "text/plain" } });
  const m = await r.json();
  if (!m.ok) throw new Error(m.error);
  return m.result;
}
// Bridge + plugin health: {server, plugin} — plugin is true when the Figma plugin is polling.
export async function status() {
  try {
    const s = await (await fetch("http://127.0.0.1:3999/status")).json();
    return { server: true, plugin: s.pollers > 0 || (s.lastPollMsAgo !== null && s.lastPollMsAgo < 25000), assets: s.assets };
  } catch {
    return { server: false, plugin: false };
  }
}

const layoutFile = (name) => join(ROOT, "layouts", name + ".js");
export const layoutNames = () => (existsSync(join(ROOT, "layouts")) ? readdirSync(join(ROOT, "layouts")).filter((f) => f.endsWith(".js")).map((f) => f.slice(0, -3)) : []);
const prelude = (data = {}) => `const PROJECT = ${JSON.stringify(PROJECT)};\nconst TOKENS = ${JSON.stringify(TOKENS)};\nconst DATA = ${JSON.stringify(data)};\n${FIND_FRAME}\n`;
// Each module file gets its own block scope, so file-local helpers never collide across files.
const scoped = (src) => "{\n" + src + "\n}";

// Shared Figma-side code: lib + kit (toolkit, refreshed by init_project --upgrade) + build/project-kit.js (optional,
// project-owned helpers shared by several components/layouts — never overwritten by --upgrade).
async function kitParts() {
  const parts = [await read(join(ROOT, "build/lib.js")), await read(join(ROOT, "build/kit.js"))];
  if (existsSync(join(ROOT, "build/project-kit.js"))) parts.push(await read(join(ROOT, "build/project-kit.js")));
  return parts;
}

// prelude + lib + kit (+ project kit) + component defs + requested layout files (default: all).
export async function source({ layouts = null, components = true, data = {} } = {}) {
  const parts = [prelude(data), ...(await kitParts())];
  if (components) for (const f of readdirSync(join(ROOT, "components")).filter((f) => f.endsWith(".js")).sort()) parts.push(scoped(await read(join(ROOT, "components", f))));
  for (const n of layouts || layoutNames()) if (existsSync(layoutFile(n))) parts.push(scoped(await read(layoutFile(n))));
  return parts.join("\n;\n");
}

// Run a build step file (relative to figma-bridge/, e.g. "build/foundations.js") with DATA = data.
export async function runStep(file, data = {}) {
  const parts = [prelude(data), ...(await kitParts()), await read(join(ROOT, file))];
  return run(parts.join("\n;\n"), 600000);
}

// Named Figma version (File → Version history). Take one before every update that replaces frames or components.
export async function snapshot(title, description = "") {
  return run(`const v = await figma.saveVersionHistoryAsync(${JSON.stringify(title)}, ${JSON.stringify(description)}); return v.id;`, 60000);
}

// ---------- extraction (browser)
// Returns { file, title, sections: [{ layout, surface, id, data }] } using project.json → sections.
// opts.prepare: JS (async function body) run in the loaded page before extraction — puts the page in a UI state
//   (wizard step, account tab, open mega menu). opts.sections: per-page override of project.json → sections.
// opts.device: "mobile" renders the page at the mobile viewport (tokens.json → gridMobile.page × 956), else 1512 × 982.
export async function extract(tab, file, { layouts = null, prepare = null, sections = null, device = null } = {}) {
  const mobile = device === "mobile";
  await tab.run(async ({ page }, w, h, m) => page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: m, hasTouch: m }),
    { args: [mobile ? TOKENS.gridMobile.page : TOKENS.grid.page, mobile ? 956 : 982, mobile] });
  await tab.goto(SITE + file);
  if (prepare) {
    await tab.evaluate(`(async () => { ${prepare}\n })()`);
    await new Promise((r) => setTimeout(r, 600));
  }
  const kit = await read(join(ROOT, "tools/extract-kit.js"));
  const files = [];
  for (const n of layouts || layoutNames()) if (existsSync(layoutFile(n))) files.push(await read(layoutFile(n)));
  await tab.evaluate(`(() => { ${kit}\n${files.map((f) => `try { ${f}\n } catch (e) { console.error(e) }`).join("\n")} })()`);
  const S = { ...PROJECT.sections, ...(sections || {}) };
  return tab.evaluate(`(() => {
    const layoutOf = (sec) => (${S.layout});
    const surfaceOf = (sec) => (${S.surface || "'default'"});
    const out = { file: ${JSON.stringify(file)}, title: document.title.split(/ [—|–-] /)[0].trim(), sections: [] };
    for (const sec of document.querySelectorAll(${JSON.stringify(S.selector)})) {
      if (!sec.getClientRects().length) continue;
      const layout = layoutOf(sec);
      const fn = window.EXTRACT[layout];
      out.sections.push({ layout, surface: surfaceOf(sec) || "default", id: sec.id || null, data: fn ? fn(sec) : null });
    }
    return out;
  })()`);
}

// ---------- building
// page: output of extract().
// opts.figmaPage: target Figma page (created if missing) · opts.frameName (default "<title> — Desktop 1512")
// opts.only: layouts to include · opts.chrome: true = Header + Footer, "header" = Header only, false = none
// opts.header: Header component properties (e.g. {"Account": "Signed in", "Menu": "Stays"})
// opts.height: fixed frame height with clipping (a viewport-size screen, e.g. 982) · opts.y: y position
// opts.clear: empty the Figma page first (default false) · opts.x: x position (default: right of existing frames)
// opts.replace: name of an existing frame anywhere in the file — the new frame takes its page, position and layer
//               order and the old one is removed (keeps the team's page organisation).
// opts.device: "mobile" → 440 wide frame, BUILD_MOBILE modules, Header/Mobile + Footer/Mobile, Typography mode Mobile.
// opts.drawer: {layout, width, side} — the section with that layout is an off-canvas drawer: the rest of the page is
//   built behind a scrim and only its uncovered strip shows (screen = opts.height, e.g. 956).
export async function build(page, { figmaPage, frameName, only = null, chrome = true, header = {}, height = null, clear = false, x = null, y = null, replace = null, device = null, drawer = null } = {}) {
  const sections = page.sections.map((s, i, all) => ({ ...s, env: { first: i === 0, surface: s.surface, prevSurface: i ? all[i - 1].surface : null, file: page.file, device } }))
    .filter((s) => !only || only.includes(s.layout));
  const used = [...new Set(sections.map((s) => s.layout))];
  const missing = used.filter((l) => !existsSync(layoutFile(l)));
  if (missing.length) throw new Error("no layout module for: " + missing.join(", ") + " (write layouts/<name>.js)");
  const empty = sections.filter((s) => !s.data).map((s) => s.layout);
  if (empty.length) throw new Error("EXTRACT returned nothing for: " + empty.join(", "));
  const data = { figmaPage: figmaPage || page.title, frameName: replace || frameName || frameNameOf(page.title, device), chrome, header, height, clear, x, y, replace, sections, device, drawer };
  const code = (await source({ layouts: used, data })) + `
;
let pg, old = null;
if (DATA.replace) {
  await figma.loadAllPagesAsync();
  const hit = findFrame(DATA.replace);
  if (!hit) throw new Error("no frame named " + DATA.replace);
  old = hit.f; pg = hit.page;
} else pg = page(DATA.figmaPage, { create: true });
await figma.setCurrentPageAsync(pg);
if (DATA.clear && !DATA.replace) for (const n of [...pg.children]) n.remove();
const right = pg.children.length ? Math.max(...pg.children.map((n) => n.x + n.width)) + 160 : 0;
const MOB = DATA.device === "mobile";
const REG = MOB ? BUILD_MOBILE : BUILD;
const HEADER = MOB ? C["Header/Mobile"] : C["Header"];
const FOOTER = MOB ? C["Footer/Mobile"] : C["Footer"];
const W = MOB ? TOKENS.gridMobile.page : TOKENS.grid.page;
const isDrawer = (s) => DATA.drawer && s.layout === DATA.drawer.layout;
const buildSection = (s) => {
  if (!REG[s.layout]) throw new Error((MOB ? "BUILD_MOBILE" : "BUILD") + " missing for " + s.layout);
  // The layout key is stored on each section frame so diff.js can match Figma sections to HTML sections.
  return Promise.resolve(REG[s.layout](s.data, s.env)).then((n) => { n.setPluginData("layout", s.layout); return n; });
};
const kids = [];
if (DATA.chrome && HEADER) kids.push(inst(HEADER, MOB ? {} : DATA.header || {}, { name: "Header", w: "fill" }));
for (const s of DATA.sections) if (!isDrawer(s)) kids.push(buildSection(s));
if (DATA.chrome === true && FOOTER) kids.push(inst(FOOTER, {}, { name: "Footer", w: "fill" }));
let root;
if (DATA.drawer) {
  // Off-canvas screen: drawer + the strip of the page it leaves uncovered, darkened like the site's scrim.
  const d = DATA.sections.find(isDrawer);
  if (!d) throw new Error("drawer section " + DATA.drawer.layout + " not found");
  const behind = await frame("Page behind", { fill: "bg-body", w: W }, kids);
  behind.opacity = 0.55;
  const strip = await frame("Scrim", { dir: "h", main: DATA.drawer.side === "right" ? "start" : "end", clip: true, fill: "bg-base", w: W - DATA.drawer.width, h: "fill" }, [behind]);
  const drawerNode = await buildSection(d);
  root = await frame(DATA.frameName, { dir: "h", fill: "bg-body", w: W, h: DATA.height || 956, clip: true }, DATA.drawer.side === "right" ? [strip, drawerNode] : [drawerNode, strip]);
} else root = await frame(DATA.frameName, { fill: "bg-body", w: W, wVar: MOB ? undefined : "figma/page", h: DATA.height || undefined, clip: !!DATA.height }, kids);
finalize(root);
if (MOB) {
  const typo = (await figma.variables.getLocalVariableCollectionsAsync()).find((c) => c.name === "Typography");
  const mode = typo && typo.modes.find((m) => m.name === "Mobile");
  if (mode) root.setExplicitVariableModeForCollection(typo, mode.modeId);
}
// Layout-dependent finishing (edge fades…) registered by modules in AFTER_LAYOUT.
for (const fn of AFTER_LAYOUT.splice(0)) await fn();
// Aspect-locked photos and mixed baselines can leave fractional heights: pin each section to the next 4px step so
// the page frame height stays on the 4px grid.
for (const s of root.children) if (s.type === "FRAME" && Math.abs(s.height / 4 - Math.round(s.height / 4)) > 0.001) { s.layoutSizingVertical = "FIXED"; s.resize(s.width, Math.ceil(s.height / 4) * 4); }
if (old) { const par = old.parent; par.insertChild(par.children.indexOf(old), root); root.x = old.x; root.y = old.y; old.remove(); }
else { root.x = DATA.x ?? right; root.y = DATA.y ?? 0; }
const grid = (await figma.getLocalGridStylesAsync()).find((g) => g.name.startsWith(MOB ? "Mobile/" : "Desktop/"));
if (grid) await root.setGridStyleIdAsync(grid.id);
return { page: pg.name, id: root.id, size: [root.width, root.height], sections: root.children.map((n) => n.name + " " + Math.round(n.width) + "×" + Math.round(n.height)) };
`;
  return run(code);
}

// Rebuild only some sections of an existing page frame, in place: each section frame whose layout key (plugin data)
// is in `layouts` is replaced by a fresh build at the same index; the rest of the frame (and any hand edits there)
// stays untouched. page: output of extract() for the same file/state.
// opts.device: "mobile" uses BUILD_MOBILE (the frame must be a mobile frame built with device "mobile").
export async function patch(page, { frameName, layouts, device = null }) {
  const all = page.sections.map((s, i, arr) => ({ ...s, env: { first: i === 0, surface: s.surface, prevSurface: i ? arr[i - 1].surface : null, file: page.file, device } }));
  const nth = {};
  const picked = [];
  for (const s of all) { nth[s.layout] = (nth[s.layout] || 0) + 1; if (layouts.includes(s.layout)) picked.push({ ...s, n: nth[s.layout] }); }
  if (!picked.length) throw new Error("no section with layout " + layouts.join(", ") + " on " + page.file);
  const data = { frameName, sections: picked, device };
  const code = (await source({ layouts, data })) + `
;
await figma.loadAllPagesAsync();
const hit = findFrame(DATA.frameName);
if (!hit) throw new Error("no frame named " + DATA.frameName);
const f = hit.f;
const out = [];
for (const s of DATA.sections) {
  const olds = f.children.filter((n) => n.getPluginData("layout") === s.layout);
  const old = olds[s.n - 1];
  if (!old) throw new Error(DATA.frameName + ": no section #" + s.n + " " + s.layout);
  const REG = DATA.device === "mobile" ? BUILD_MOBILE : BUILD;
  if (!REG[s.layout]) throw new Error("no build for " + s.layout + (DATA.device ? " (" + DATA.device + ")" : ""));
  const node = await REG[s.layout](s.data, s.env);
  node.setPluginData("layout", s.layout);
  f.insertChild(f.children.indexOf(old), node);
  finalize(node);
  node.layoutSizingHorizontal = "FILL";
  if (Math.abs(node.height / 4 - Math.round(node.height / 4)) > 0.001) { node.layoutSizingVertical = "FIXED"; node.resize(node.width, Math.ceil(node.height / 4) * 4); }
  for (const fn of AFTER_LAYOUT.splice(0)) await fn();
  out.push(s.layout + " " + Math.round(old.height) + " → " + Math.round(node.height));
  old.remove();
}
return { frame: f.name, id: f.id, height: f.height, out };
`;
  return run(code);
}

// ---------- delegation aids
// Markdown reference of what layout/component authors may use: components with their properties, icons, text
// styles (with mobile sizes), colour tokens, spacing. Writes figma-bridge/REFERENCE.md and returns the text — give it
// to subagents with the layout-modules brief, regenerate after adding components.
export async function reference() {
  const comps = await run((await source({ layouts: [], components: false })) + `
return Object.keys(C).sort().map((k) => [k, Object.entries(C[k].componentPropertyDefinitions || {}).map(([p, d]) => p.split("#")[0] + (d.variantOptions ? "=" + d.variantOptions.join("|") : ":" + d.type)).join(", ")]);`);
  const icons = comps.filter(([k]) => /^Icon\/[a-z0-9]/.test(k)).map(([k]) => k.slice(5));
  const rest = comps.filter(([k]) => !/^Icon\/[a-z0-9]/.test(k));
  const type = TOKENS.type.map((t) => `${t[0]} (${t[1]} ${t[2]} ${t[3]}/${Array.isArray(t[4]) ? t[4].join("|") : t[4]}${t[6] && t[6].textCase ? " caps" : ""})`);
  const names = (rows) => (rows || []).map((s) => s[0]).join(", ");
  const surfaces = Object.entries(TOKENS.surfaces).filter(([k]) => !k.startsWith("$"))
    .map(([k, s]) => `${k} (fill ${s.fill}${s.dark ? ", dark" : ""}${s.tokens ? "; " + s.tokens.map((t) => k + "/" + t[0]).join(", ") : ""})`);
  const md = `# ${PROJECT.name} — Figma build reference (generated by H.reference())

## Components {properties}
${rest.map(([k, p]) => "- " + k + (p ? " {" + p + "}" : "")).join("\n")}

## Icons — icon(key, {size, color})
${icons.join(", ") || "(none — H.harvestIcons)"}

## Text styles
${type.join("; ")}

## Colour tokens (Bricks names; tok(env, name) reads a surface's re-pointed value)
Theme roles: ${names(TOKENS.theme)}
Component variables: ${names(TOKENS.components)}
Surfaces: ${surfaces.join(" · ")}

## Spacing and radius (gap / p take px or a token name)
${Object.entries(TOKENS.space).map(([k, v]) => k + " " + v).join(" · ")} · figma/px-N: ${(TOKENS.spaceLiterals || []).join(" ")} · layout-gutter ${TOKENS.grid.gutter} · figma/margin ${TOKENS.grid.margin}
radius: ${Object.entries(TOKENS.radius).map(([k, v]) => k + " " + v).join(" · ")} · section padY ${TOKENS.section && TOKENS.section.padY}
Desktop grid ${TOKENS.grid.page}: ${TOKENS.grid.columns} × ${TOKENS.grid.column} + gutter ${TOKENS.grid.gutter}, margin ${TOKENS.grid.margin}${TOKENS.gridMobile ? ` · Mobile ${TOKENS.gridMobile.page}: margin ${TOKENS.gridMobile.margin}` : ""}
`;
  await Bun.write(join(ROOT, "REFERENCE.md"), md);
  return md;
}

// Icons from the site's inline SVGs: visits `files`, collects every <svg> whose class matches `match` (group 1 = icon
// key; default Phosphor "pi pi-bed" → "bed", e.g. "lucide-([\\w-]+)" for Lucide; hidden ones too — states and menus
// need them) and merges them into components/00-assets.js (built before 00-core, so Button gets its icon slot) as
// "Icon/<key>" components: 24 px auto-layout frame + one flattened vector "Glyph", recolourable per instance.
// If the file already exists only its ICON_SVG line is rewritten (other asset defs, e.g. logos, stay).
// Then H.buildComponents(["Icon/<key>", …]). Returns the keys added.
export async function harvestIcons(tab, files, { match = "(?:^|\\s)pi-([\\w-]+)", out = "components/00-assets.js" } = {}) {
  const found = {};
  for (const f of files) {
    await tab.goto(SITE + f);
    const r = await tab.evaluate(`(() => { const re = new RegExp(${JSON.stringify(match)}); const out = {};
      for (const s of document.querySelectorAll("body svg")) { const m = (s.getAttribute("class") || "").match(re); if (!m || out[m[1]]) continue;
        const c = s.cloneNode(true); c.removeAttribute("class"); c.removeAttribute("aria-hidden"); c.removeAttribute("focusable");
        c.setAttribute("xmlns", "http://www.w3.org/2000/svg"); const vb = (c.getAttribute("viewBox") || "0 0 24 24").split(/\\s+/);
        c.setAttribute("width", vb[2]); c.setAttribute("height", vb[3]); out[m[1]] = c.outerHTML.replace(/currentColor/g, "#000000"); }
      return out; })()`);
    for (const [k, v] of Object.entries(r)) found[k] ||= v;
  }
  const path = join(ROOT, out);
  const before = existsSync(path) ? await read(path) : null;
  const line = before && before.match(/^const ICON_SVG = (\{.*\});$/m);
  const prev = line ? JSON.parse(line[1]) : {};
  const added = Object.keys(found).filter((k) => !prev[k]);
  const all = Object.fromEntries(Object.entries({ ...prev, ...found }).sort());
  const iconLine = "const ICON_SVG = " + JSON.stringify(all) + ";";
  if (line) await Bun.write(path, before.replace(line[0], () => iconLine));
  else await Bun.write(path, (before ? before + "\n" : "") + `// GENERATED by H.harvestIcons() from the site's inline SVGs — re-run it instead of editing the map by hand.
// "Icon/<key>": 24 × 24 auto-layout component with one flattened vector "Glyph" (kit svgArt); recolour per instance
// with icon(key, {color}) / tintIcon(), resize with icon(key, {size}).
${iconLine}
for (const key of Object.keys(ICON_SVG)) {
  COMPONENT_DEFS["Icon/" + key] = async () => {
    const c = await frame("Icon/" + key, { component: true, dir: "h", main: "center", cross: "center", w: 24, h: 24 });
    const g = svgArt(ICON_SVG[key], "Glyph", { box: 24 });
    g.fills = [solid("text-title")];
    c.appendChild(g);
    return finalize(c);
  };
}
`);
  return added;
}

// (Re)build component defs from components/*.js on the Components page. names: subset (default: all, file order).
// An existing component is never deleted first: the new one is built, every instance in the file is swapped to it
// (variants matched by name, overrides kept), then the old one is removed and the new one takes its place.
export async function buildComponents(names = null) {
  const code = (await source({ layouts: [], data: { names } })) + `
;
const lib = page("Components", { create: true });
await figma.setCurrentPageAsync(lib);
const names = DATA.names || Object.keys(COMPONENT_DEFS);
const out = [];
for (const name of names) {
  if (!COMPONENT_DEFS[name]) throw new Error("no COMPONENT_DEFS entry " + name);
  const old = lib.children.find((n) => n.name === name);
  const bottom = lib.children.length ? Math.max(...lib.children.map((n) => n.y + n.height)) : 0;
  const node = await COMPONENT_DEFS[name]();
  if (node.parent !== lib) lib.appendChild(node);
  let swapped = 0;
  if (old) {
    const variantsOld = old.type === "COMPONENT_SET" ? old.children : [old];
    const pick = (v) => (node.type === "COMPONENT_SET" ? node.children.find((c) => c.name === v.name) || node.defaultVariant : node);
    for (const v of variantsOld) for (const i of await v.getInstancesAsync()) { i.swapComponent(pick(v)); swapped++; }
    node.x = old.x; node.y = old.y;
    lib.insertChild(lib.children.indexOf(old), node);
    old.remove();
  } else { node.x = 0; node.y = bottom + 80; }
  refreshComponents();
  out.push(node.type + " " + node.name + " " + Math.round(node.width) + "×" + Math.round(node.height) + (old ? " (replaced, " + swapped + " instances swapped)" : " (new)"));
}
return out;
`;
  return run(code, 600000);
}

// Export a node to disk (JPG/PNG) for visual review.
export async function exportNode(nodeId, outPath, { scale = 0.5, format = "JPG" } = {}) {
  const b64 = await run(`const n = await figma.getNodeByIdAsync(${JSON.stringify(nodeId)}); if (!n) throw new Error("no node"); return figma.base64Encode(await n.exportAsync({ format: "${format}", constraint: { type: "SCALE", value: ${scale} } }));`);
  await Bun.write(outPath, Buffer.from(b64, "base64"));
  return outPath;
}
// Id of a page frame by name (any page, also inside Sections).
export async function frameId(name) {
  return run(FIND_FRAME + `await figma.loadAllPagesAsync(); const hit = findFrame(${JSON.stringify(name)}); return hit ? hit.f.id : null;`);
}

// Structural audit of one Figma page (or all pages when name is null). Every count must be 0:
// groups · frames without auto layout · grid layout · spacing off the 4px grid · spacing not bound to a variable ·
// default layer names · text without a text style · solid fills/strokes not bound to a colour variable ·
// images outside an Image/Placeholder instance · instances whose main component was deleted.
export async function audit(figmaPage = null) {
  return run(`
const pages = ${JSON.stringify(figmaPage)} ? [figma.root.children.find((x) => x.name === ${JSON.stringify(figmaPage)})] : figma.root.children.filter((p) => p.type === "PAGE");
if (!pages[0]) throw new Error("no page");
const I = { groups: [], noAutoLayout: [], gridLayout: [], off4: [], unboundSpacing: [], defaultNames: [], noTextStyle: [], unboundColor: [], looseImages: [], orphanInstances: [] };
const unbound = (paints) => Array.isArray(paints) && paints.some((f) => f.type === "SOLID" && f.visible !== false && !(f.boundVariables && f.boundVariables.color));
for (const p of pages) {
  await p.loadAsync();
  for (const n of p.findAll(() => true)) {
    const path = p.name + " › " + n.name + " (" + n.id + ")";
    if (n.type === "GROUP") I.groups.push(path);
    if (/^(Frame|Group|Rectangle|Text|Vector|Ellipse|Line|Component|Instance|Polygon|Star)( \\d+)?$/.test(n.name)) I.defaultNames.push(path);
    if (["FRAME", "COMPONENT", "COMPONENT_SET", "INSTANCE"].includes(n.type)) {
      if (n.layoutMode === "NONE" && !(n.type === "COMPONENT" && n.children.some((c) => c.type === "VECTOR"))) I.noAutoLayout.push(path);
      if (n.layoutMode === "GRID") I.gridLayout.push(path);
      if (n.layoutMode && n.layoutMode !== "NONE" && n.type !== "INSTANCE" && n.type !== "COMPONENT_SET") {
        for (const f of ["itemSpacing", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft"]) {
          const v = n[f];
          if (v % 4) I.off4.push(path + " " + f + "=" + v);
          if (v && !(n.boundVariables && n.boundVariables[f]) && !(f === "itemSpacing" && n.primaryAxisAlignItems === "SPACE_BETWEEN")) I.unboundSpacing.push(path + " " + f + "=" + v);
        }
      }
      if (n.type !== "INSTANCE" && n.type !== "COMPONENT_SET" && (unbound(n.fills) || unbound(n.strokes))) I.unboundColor.push(path);
      if (n.type === "INSTANCE") {
        const m = await n.getMainComponentAsync();
        if (!m || !m.parent) I.orphanInstances.push(path);
      }
    }
    if (n.type === "TEXT") {
      if (!n.textStyleId) I.noTextStyle.push(path);
      if (unbound(n.fills)) I.unboundColor.push(path);
    }
    // Photos live in Image/Placeholder instances, or — when content sits on the photo (hero bands, card media with
    // badges) — in overlay frames named "Image · …" made by kit overlay() (photo = frame fill, content = children).
    if (Array.isArray(n.fills) && n.fills.some((f) => f.type === "IMAGE") && !(n.type === "FRAME" && n.name.startsWith("Image · ")) && !(n.type === "INSTANCE" && (await n.getMainComponentAsync())?.name === "Image/Placeholder")) I.looseImages.push(path);
  }
}
const counts = {}; for (const [k, v] of Object.entries(I)) counts[k] = v.length;
return { clean: Object.values(counts).every((c) => !c), counts, samples: Object.fromEntries(Object.entries(I).filter(([, v]) => v.length).map(([k, v]) => [k, v.slice(0, 6)])) };
`, 600000);
}

export async function removePage(name) {
  return run(`const p = figma.root.children.find((x) => x.name === ${JSON.stringify(name)}); if (p) { if (figma.currentPage === p) await figma.setCurrentPageAsync(figma.root.children.find((x) => x !== p)); p.remove(); } return !!p;`);
}
