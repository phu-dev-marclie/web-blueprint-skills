// Foundations: pages, variables (colour, spacing, radius, layout, fonts, font sizes), text styles, layout grid style.
// Variable names = the Bricks token names of skill bricks-bem-html without "--" (code syntax WEB = var(--name)), in
// collections that mirror the Bricks Style Manager; Figma-only helpers live under "figma/…" and carry no code syntax.
// Upsert by name — safe to re-run after editing tokens.json: existing variables/styles keep their ids, so every
// binding in the file follows the new values. Nothing is deleted unless DATA.reset (blank files only).
// Run with: H.runStep("build/foundations.js", { reset: false })
const T = TOKENS;
const log = { created: [], updated: 0, stale: [] };

if (DATA.reset) {
  for (const c of await figma.variables.getLocalVariableCollectionsAsync()) c.remove();
  for (const s of await figma.getLocalTextStylesAsync()) s.remove();
  for (const s of await figma.getLocalGridStylesAsync()) s.remove();
}
for (const name of ["Components", "Foundations"]) page(name, { create: true });

// ---------- helpers
const hex = (h, a = 1) => ({ r: parseInt(h.slice(1, 3), 16) / 255, g: parseInt(h.slice(3, 5), 16) / 255, b: parseInt(h.slice(5, 7), 16) / 255, a });
const allVars = await figma.variables.getLocalVariablesAsync();
const seen = new Set();
async function collection(name, modeName) {
  let c = (await figma.variables.getLocalVariableCollectionsAsync()).find((x) => x.name === name);
  if (!c) {
    c = figma.variables.createVariableCollection(name);
    log.created.push("collection " + name);
  }
  c.renameMode(c.modes[0].modeId, modeName);
  return c;
}
// meta: {hidden, code: Bricks token name for the WEB code syntax (default: the name; none for figma/…), description}
function upVar(c, name, type, value, scopes, meta = {}) {
  let v = allVars.find((x) => x.variableCollectionId === c.id && x.name === name);
  if (v && v.resolvedType !== type) throw new Error(`variable ${name} exists with type ${v.resolvedType}, wanted ${type}`);
  if (!v) {
    v = figma.variables.createVariable(name, c, type);
    allVars.push(v);
    log.created.push(name);
  } else log.updated++;
  try {
    for (const m of c.modes) v.setValueForMode(m.modeId, value);
    v.scopes = scopes;
    v.hiddenFromPublishing = !!meta.hidden;
    const code = meta.code !== undefined ? meta.code : name.startsWith("figma/") ? null : name;
    if (code) v.setVariableCodeSyntax("WEB", `var(--${code})`);
    else if (v.codeSyntax && v.codeSyntax.WEB) v.removeVariableCodeSyntax("WEB");
    if (meta.description !== undefined) v.description = meta.description;
  } catch (e) {
    throw new Error(`variable ${c.name}/${name}: ${e && (e.message || e)}`);
  }
  seen.add(v.id);
  V[name] = v;
  return v;
}
const SCOPES = {
  text: ["TEXT_FILL"],
  fill: ["FRAME_FILL", "SHAPE_FILL"],
  stroke: ["STROKE_COLOR"],
  "fill+stroke": ["FRAME_FILL", "SHAPE_FILL", "STROKE_COLOR"],
  "text+stroke": ["TEXT_FILL", "STROKE_COLOR"],
  all: ["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL", "STROKE_COLOR"],
};
const entries = (o) => Object.entries(o || {}).filter(([k]) => !k.startsWith("$"));

// ---------- colour: Brand + Neutrals palettes (hidden from pickers) → Theme roles → component variables → surfaces
const COL = {};
const colourValue = (value, who) => {
  if (typeof value === "string" && value.startsWith("#")) return hex(value);
  if (Array.isArray(value)) return hex(value[0], value[1]);
  if (!COL[value]) throw new Error(`${who} → unknown colour ${value} (define it earlier in tokens.json)`);
  return figma.variables.createVariableAlias(COL[value]);
};
const brand = await collection("Brand", "Value");
for (const [name, value] of entries(T.brand)) COL[name] = upVar(brand, name, "COLOR", colourValue(value, name), [], { hidden: true });
const neutrals = await collection("Neutrals", "Value");
for (const [name, value] of entries(T.neutrals)) COL[name] = upVar(neutrals, name, "COLOR", colourValue(value, name), [], { hidden: true });
const colourRows = async (c, rows, prefix = "", meta = () => ({})) => {
  for (const [name, value, scope] of rows || []) {
    if (!SCOPES[scope]) throw new Error(`${prefix}${name}: unknown scope ${scope}`);
    const v = upVar(c, prefix + name, "COLOR", colourValue(value, prefix + name), SCOPES[scope], meta(name));
    if (!prefix) COL[name] = v;
  }
};
const theme = await collection("Theme", "Light");
await colourRows(theme, T.theme);
const comps = await collection("Components", "Default");
await colourRows(comps, T.components);
// A [data-surface] that re-points tokens: "<surface>/<token>" holds the value the token takes on that surface.
const surfs = await collection("Surfaces", "Value");
for (const [key, s] of entries(T.surfaces)) {
  if (!COL[s.fill]) throw new Error(`surface ${key}: fill ${s.fill} is not a theme colour`);
  await colourRows(surfs, s.tokens, key + "/", (name) => ({ code: name, description: `[data-surface="${key}"] --${name}` }));
}

// ---------- spacing, radius, layout (4px grid)
const G = T.grid;
const container = G.columns * G.column + (G.columns - 1) * G.gutter;
if (container + 2 * G.margin !== G.page) throw new Error(`grid: ${G.columns}×${G.column} + gutters = ${container}, + 2×${G.margin} margins ≠ page ${G.page}`);
for (const [name, n] of [["grid.column", G.column], ["layout-gutter", G.gutter], ["grid.margin", G.margin], ...entries(T.space), ...(T.spaceLiterals || []).map((n) => ["spaceLiterals", n]), ...entries(T.radius).filter(([, r]) => r < 999)])
  if (n % 4) throw new Error(`off the 4px grid: ${name} = ${n}`);
const dims = await collection("Spacing", "Desktop");
for (const [name, s] of entries(T.space)) upVar(dims, name, "FLOAT", s, ["GAP"]);
for (const n of T.spaceLiterals || []) upVar(dims, "figma/px-" + n, "FLOAT", n, ["GAP"], { description: `Figma-only: ${n}px written as a literal in the class CSS (no Bricks token)` });
for (const [name, r] of entries(T.radius)) upVar(dims, name, "FLOAT", r, ["CORNER_RADIUS"]);
upVar(dims, "layout-gutter", "FLOAT", G.gutter, ["GAP"]);
if (T.section && T.section.padY) upVar(dims, "layout-section-pad", "FLOAT", T.section.padY, ["GAP"]);
upVar(dims, "figma/page", "FLOAT", G.page, ["WIDTH_HEIGHT"], { description: "Figma-only: desktop frame width" });
upVar(dims, "figma/container", "FLOAT", container, ["WIDTH_HEIGHT"], { description: "Figma-only: container content width = --max-screen-width − 2 × --container-padding" });
upVar(dims, "figma/margin", "FLOAT", G.margin, ["GAP"], { description: "Figma-only: side margin of the container in the 1512 frame" });
// Column spans: figma/col-N = N columns + (N − 1) gutters. Bind any width to these to snap it to the grid.
for (let n = 1; n <= G.columns; n++) upVar(dims, "figma/col-" + n, "FLOAT", n * G.column + (n - 1) * G.gutter, ["WIDTH_HEIGHT"], { description: `Figma-only: width of ${n} grid column${n > 1 ? "s" : ""}` });

// ---------- typography: font families (font-family, font-family-display) and the text-* font-size scale
// Modes Desktop and — when tokens define mobile values or gridMobile — Mobile (the harness sets Mobile on device
// "mobile" frames): text-* hold [1512, 440] px; styles whose line height differs on mobile bind it to figma/line/<style>.
const typo = await collection("Typography", "Desktop");
const wantsMobile = !!T.gridMobile || entries(T.text).some(([, [d, m]]) => d !== m) || T.type.some((t) => Array.isArray(t[4]));
let MOBILE_MODE = null;
if (wantsMobile) {
  const existing = typo.modes.find((m) => m.name === "Mobile");
  try {
    MOBILE_MODE = existing ? existing.modeId : typo.addMode("Mobile");
  } catch (e) {
    throw new Error("cannot add the Typography 'Mobile' mode (" + e.message + "): variable modes need a paid Figma plan — remove gridMobile and the mobile sizes from tokens.json, or upgrade");
  }
}
const FONT = {};
for (const [name, family] of entries(T.fonts)) FONT[name] = upVar(typo, name, "STRING", family, ["FONT_FAMILY"]);
const SIZEVAR = {};
for (const [name, [d, m]] of entries(T.text)) {
  SIZEVAR[name] = upVar(typo, name, "FLOAT", d, ["FONT_SIZE"]);
  if (MOBILE_MODE) SIZEVAR[name].setValueForMode(MOBILE_MODE, m);
}

const available = await figma.listAvailableFontsAsync();
const styleExists = (family, style) => available.some((f) => f.fontName.family === family && f.fontName.style === style);
const styles = await figma.getLocalTextStylesAsync();
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
for (const [name, fontVar, fontStyle, size, line, ls, extra = {}] of T.type) {
  const family = T.fonts[fontVar];
  if (!family) throw new Error(`text style ${name}: unknown font variable ${fontVar} (tokens.json → fonts)`);
  if (typeof size === "string" && !SIZEVAR[size]) throw new Error(`text style ${name}: unknown font size ${size} (tokens.json → text)`);
  const [lineD, lineM] = Array.isArray(line) ? line : [line, line];
  if (lineD % 4 || lineM % 4) throw new Error(`text style ${name}: line height ${lineD}/${lineM} is off the 4px grid`);
  if (!styleExists(family, fontStyle)) {
    const have = available.filter((f) => f.fontName.family === family).map((f) => f.fontName.style);
    throw new Error(`font ${family} has no style "${fontStyle}" (available: ${have.join(", ") || "family not installed"})`);
  }
  await figma.loadFontAsync({ family, style: fontStyle });
  let s = styles.find((x) => x.name === name);
  if (!s) {
    s = figma.createTextStyle();
    s.name = name;
    styles.push(s);
    log.created.push("text style " + name);
  } else log.updated++;
  s.fontName = { family, style: fontStyle };
  s.fontSize = typeof size === "string" ? T.text[size][0] : size;
  s.lineHeight = { unit: "PIXELS", value: lineD };
  s.letterSpacing = { unit: "PERCENT", value: ls };
  s.textCase = extra.textCase || "ORIGINAL";
  s.textDecoration = extra.decoration || "NONE";
  s.setBoundVariable("fontFamily", FONT[fontVar]);
  s.setBoundVariable("fontSize", typeof size === "string" ? SIZEVAR[size] : null);
  if (MOBILE_MODE && lineM !== lineD) {
    const vl = upVar(typo, "figma/line/" + slug(name), "FLOAT", lineD, ["LINE_HEIGHT"], { description: `Figma-only: line height of ${name} in px` });
    vl.setValueForMode(MOBILE_MODE, lineM);
    s.setBoundVariable("lineHeight", vl);
  } else s.setBoundVariable("lineHeight", null);
  s.description = [`font-family var(--${fontVar})`, typeof size === "string" ? `font-size var(--${size})` : `font-size ${size}px`,
    extra.lineHeight ? `line-height var(--${extra.lineHeight})` : null].filter(Boolean).join(" · ");
  TS[name] = s;
}

// ---------- layout grid style
const gridName = `Desktop/${G.columns} columns · ${container}`;
const grids = await figma.getLocalGridStylesAsync();
let grid = grids.find((g) => g.name === gridName);
if (!grid) {
  grid = figma.createGridStyle();
  grid.name = gridName;
  log.created.push("grid style " + gridName);
}
grid.layoutGrids = [{ pattern: "COLUMNS", alignment: "CENTER", count: G.columns, sectionSize: G.column, gutterSize: G.gutter, visible: true, color: { r: 0.94, g: 0.29, b: 0.33, a: 0.08 } }];
// Mobile frames (tokens.json → gridMobile): stretch columns with fixed margins and gutters.
if (T.gridMobile) {
  const M = T.gridMobile;
  const mName = `Mobile/${M.columns} columns · ${M.page}`;
  let mg = grids.find((g) => g.name === mName);
  if (!mg) { mg = figma.createGridStyle(); mg.name = mName; log.created.push("grid style " + mName); }
  mg.layoutGrids = [{ pattern: "COLUMNS", alignment: "STRETCH", count: M.columns, gutterSize: M.gutter, offset: M.margin, visible: true, color: { r: 0.94, g: 0.29, b: 0.33, a: 0.08 } }];
}

// ---------- effect styles (tokens.json → effects) and gradient paint styles (tokens.json → gradients), named after
// the Bricks tokens: effects {"shadow-m": [{x, y, blur, spread, color: "#192A43", alpha: 0.4}, …]} — CSS box-shadow
// layers (outer; `inset: true` = inner shadow); a layer {backgroundBlur: 24} = CSS backdrop-filter blur (frosted glass).
// gradients: {"gradient-brand": {angle: 135, stops: [["#1F3A61", 0], ["#192A43", 1]]}} — CSS linear-gradient angle;
// a stop may carry an alpha: ["#FFFFFF", 1, 0].
if (T.effects) {
  const effects = await figma.getLocalEffectStylesAsync();
  for (const [name, layers] of Object.entries(T.effects)) {
    if (name.startsWith("$")) continue;
    let s = effects.find((x) => x.name === name);
    if (!s) { s = figma.createEffectStyle(); s.name = name; log.created.push("effect " + name); }
    s.effects = layers.map((l) => l.backgroundBlur != null
      ? { type: "BACKGROUND_BLUR", radius: l.backgroundBlur, visible: true }
      : { type: l.inset ? "INNER_SHADOW" : "DROP_SHADOW", color: hex(l.color, l.alpha ?? 1), offset: { x: l.x || 0, y: l.y || 0 }, radius: l.blur || 0, spread: l.spread || 0, visible: true, blendMode: "NORMAL" });
  }
}
if (T.gradients) {
  const paints = await figma.getLocalPaintStylesAsync();
  for (const [name, g] of Object.entries(T.gradients)) {
    if (name.startsWith("$")) continue;
    // CSS angle θ (0 = to top, 90 = to right) → gradient transform over the node's unit square, ending on the corners.
    const th = ((g.angle ?? 180) * Math.PI) / 180;
    const dx = Math.sin(th), dy = -Math.cos(th), Lc = Math.abs(dx) + Math.abs(dy);
    const gradientTransform = [[dx / Lc, dy / Lc, 0.5 - (dx + dy) / (2 * Lc)], [-dy / Lc, dx / Lc, 0.5 - (dx - dy) / (2 * Lc)]];
    let s = paints.find((x) => x.name === name);
    if (!s) { s = figma.createPaintStyle(); s.name = name; log.created.push("paint " + name); }
    s.paints = [{ type: "GRADIENT_LINEAR", gradientTransform, gradientStops: g.stops.map(([c, p, a]) => ({ position: p, color: hex(c, a ?? 1) })) }];
  }
}

// ---------- report variables in managed collections that tokens.json no longer defines (kept: bindings may use them)
const managed = new Set([brand.id, neutrals.id, theme.id, comps.id, surfs.id, dims.id, typo.id]);
for (const v of allVars) if (managed.has(v.variableCollectionId) && !seen.has(v.id)) log.stale.push(v.name);
return {
  created: log.created.length > 20 ? log.created.length + " items" : log.created,
  updated: log.updated,
  stale: log.stale,
  variables: (await figma.variables.getLocalVariablesAsync()).length,
  textStyles: (await figma.getLocalTextStylesAsync()).length,
  grid: gridName,
};
