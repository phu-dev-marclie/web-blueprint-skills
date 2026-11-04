// Foundations: pages, variables (colour, spacing, radius, layout, fonts), text styles, layout grid style.
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
function upVar(c, name, type, value, scopes, hidden = false) {
  let v = allVars.find((x) => x.variableCollectionId === c.id && x.name === name);
  if (v && v.resolvedType !== type) throw new Error(`variable ${name} exists with type ${v.resolvedType}, wanted ${type}`);
  if (!v) {
    v = figma.variables.createVariable(name, c, type);
    allVars.push(v);
    log.created.push(name);
  } else log.updated++;
  try {
    v.setValueForMode(c.modes[0].modeId, value);
    v.scopes = scopes;
    v.hiddenFromPublishing = hidden;
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
};

// ---------- colour: primitives (hidden from pickers) → semantic aliases (what layers use)
const prim = await collection("Primitives", "Value");
const P = {};
for (const [name, h] of Object.entries(T.primitives)) P[name] = upVar(prim, name, "COLOR", hex(h), [], true);
for (const [name, [h, a]] of Object.entries(T.alpha || {})) P[name] = upVar(prim, name, "COLOR", hex(h, a), [], true);
const color = await collection("Color", "Light");
for (const [name, ref, scope] of T.semantic) {
  if (!P[ref]) throw new Error(`semantic ${name} → unknown primitive ${ref}`);
  if (!SCOPES[scope]) throw new Error(`semantic ${name}: unknown scope ${scope}`);
  upVar(color, name, "COLOR", figma.variables.createVariableAlias(P[ref]), SCOPES[scope]);
}

// ---------- spacing, radius, layout (4px grid)
const G = T.grid;
const container = G.columns * G.column + (G.columns - 1) * G.gutter;
if (container + 2 * G.margin !== G.page) throw new Error(`grid: ${G.columns}×${G.column} + gutters = ${container}, + 2×${G.margin} margins ≠ page ${G.page}`);
for (const n of [G.column, G.gutter, G.margin, ...T.space, ...Object.values(T.radius).filter((r) => r < 999)]) if (n % 4) throw new Error(`off the 4px grid: ${n}`);
const dims = await collection("Spacing", "Desktop");
for (const s of T.space) upVar(dims, "space/" + s, "FLOAT", s, ["GAP"]);
for (const [k, r] of Object.entries(T.radius)) upVar(dims, "radius/" + k, "FLOAT", r, ["CORNER_RADIUS"]);
upVar(dims, "layout/page", "FLOAT", G.page, ["WIDTH_HEIGHT"]);
upVar(dims, "layout/container", "FLOAT", container, ["WIDTH_HEIGHT"]);
upVar(dims, "layout/gutter", "FLOAT", G.gutter, ["GAP"]);
upVar(dims, "layout/margin", "FLOAT", G.margin, ["GAP"]);
// Column spans: layout/col-N = N columns + (N − 1) gutters. Bind any width to these to snap it to the grid.
for (let n = 1; n <= G.columns; n++) upVar(dims, "layout/col-" + n, "FLOAT", n * G.column + (n - 1) * G.gutter, ["WIDTH_HEIGHT"]);

// ---------- fonts: one variable per role; every text style's family is bound to its role
// Typography has the modes Desktop and — when tokens define mobile sizes or gridMobile — Mobile: styles with
// `extra.mobile: [size, lineHeight]` bind fontSize and lineHeight to "type/<style>/size|line" variables, so the same
// style renders smaller in a frame set to Mobile (the harness sets that mode on device "mobile" frames).
const typo = await collection("Typography", "Desktop");
const wantsMobile = !!T.gridMobile || T.type.some((t) => t[6] && t[6].mobile);
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
for (const [role, family] of Object.entries(T.fonts)) {
  FONT[role] = upVar(typo, "font/" + role, "STRING", family, ["FONT_FAMILY"]);
  if (MOBILE_MODE) FONT[role].setValueForMode(MOBILE_MODE, family);
}

const available = await figma.listAvailableFontsAsync();
const styleExists = (family, style) => available.some((f) => f.fontName.family === family && f.fontName.style === style);
const styles = await figma.getLocalTextStylesAsync();
for (const [name, role, fontStyle, size, lh, ls, extra = {}] of T.type) {
  const family = T.fonts[role];
  if (!family) throw new Error(`text style ${name}: unknown font role ${role}`);
  if (lh % 4) throw new Error(`text style ${name}: line height ${lh} is off the 4px grid`);
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
  s.fontSize = size;
  s.lineHeight = { unit: "PIXELS", value: lh };
  s.letterSpacing = { unit: "PERCENT", value: ls };
  s.textCase = extra.textCase || "ORIGINAL";
  s.textDecoration = extra.decoration || "NONE";
  s.setBoundVariable("fontFamily", FONT[role]);
  if (extra.mobile) {
    const [ms, ml] = extra.mobile;
    if (ml % 4) throw new Error(`text style ${name}: mobile line height ${ml} is off the 4px grid`);
    const vs = upVar(typo, "type/" + name + "/size", "FLOAT", size, ["FONT_SIZE"]);
    const vl = upVar(typo, "type/" + name + "/line", "FLOAT", lh, ["LINE_HEIGHT"]);
    vs.setValueForMode(MOBILE_MODE, ms);
    vl.setValueForMode(MOBILE_MODE, ml);
    s.setBoundVariable("fontSize", vs);
    s.setBoundVariable("lineHeight", vl);
  }
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

// ---------- effect styles (tokens.json → effects) and gradient paint styles (tokens.json → gradients)
// effects: {"Shadow/Card": [{x, y, blur, spread, color: "#192A43", alpha: 0.4}, …]} — CSS box-shadow layers (outer;
// `inset: true` = inner shadow); a layer {backgroundBlur: 24} = CSS backdrop-filter blur (frosted glass).
// gradients: {"Gradient/Brand": {angle: 135, stops: [["#1F3A61", 0], ["#192A43", 1]]}} — CSS linear-gradient angle;
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
const managed = new Set([prim.id, color.id, dims.id, typo.id]);
for (const v of allVars) if (managed.has(v.variableCollectionId) && !seen.has(v.id)) log.stale.push(v.name);
return {
  created: log.created.length > 20 ? log.created.length + " items" : log.created,
  updated: log.updated,
  stale: log.stale,
  variables: (await figma.variables.getLocalVariablesAsync()).length,
  textStyles: (await figma.getLocalTextStylesAsync()).length,
  grid: gridName,
};
