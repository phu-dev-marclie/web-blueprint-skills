// Shared helpers, prepended to every script sent to Figma. Runs inside the plugin sandbox (async function body).
// Globals injected by the harness before this file: PROJECT (project.json), TOKENS (tokens.json).
await figma.loadAllPagesAsync();

const V = {};
for (const v of await figma.variables.getLocalVariablesAsync()) V[v.name] = v;
const TS = {};
for (const s of await figma.getLocalTextStylesAsync()) TS[s.name] = s;
// Every text style's font must be loaded before text using it can be created or edited.
await Promise.all([...new Set(Object.values(TS).map((s) => JSON.stringify(s.fontName)))].map((f) => figma.loadFontAsync(JSON.parse(f))));

function page(name, { create = false } = {}) {
  let p = figma.root.children.find((x) => x.name === name);
  if (!p && create) {
    p = figma.createPage();
    p.name = name;
  }
  if (!p) throw new Error("missing page " + name);
  return p;
}
function need(name) {
  const v = V[name];
  if (!v) throw new Error("missing variable " + name);
  return v;
}
// Solid paint bound to a colour variable (semantic token name, e.g. "text/default").
function solid(token) {
  return figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", need(token));
}
// Spacing values must be 0 or one of the space/* tokens; anything else throws so off-grid values never slip in.
function bindSpace(node, field, value) {
  if (value === undefined || value === null) return;
  if (value === 0) {
    node[field] = 0;
    return;
  }
  const v = V["space/" + value];
  if (!v) throw new Error("no spacing token " + value + " for " + node.name + "." + field);
  node.setBoundVariable(field, v);
}
function bindRadius(node, r) {
  const v = need("radius/" + r);
  for (const f of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) node.setBoundVariable(f, v);
}
// s: {color, sides: ["top"|"right"|"bottom"|"left"], w, dash}
function stroke(node, s) {
  node.strokes = [solid(s.color)];
  node.strokeAlign = "INSIDE";
  // Hairlines are decoration: keep them out of auto-layout sizing so heights stay on the 4px grid.
  node.strokesIncludedInLayout = false;
  const w = s.w || 1;
  if (!s.sides) node.strokeWeight = w;
  else {
    node.strokeTopWeight = s.sides.includes("top") ? w : 0;
    node.strokeRightWeight = s.sides.includes("right") ? w : 0;
    node.strokeBottomWeight = s.sides.includes("bottom") ? w : 0;
    node.strokeLeftWeight = s.sides.includes("left") ? w : 0;
  }
  if (s.dash) node.dashPattern = s.dash;
}

// Sizing is deferred and applied top-down by finalize(), so FILL children never sit in HUG parents mid-build.
const SIZE = new Map();
// Fixed widths that equal a column span are bound to layout/col-N, so they stay on the grid when the grid changes.
const SPAN_VAR = new Map();
for (let n = 1; n <= TOKENS.grid.columns; n++) SPAN_VAR.set(n * TOKENS.grid.column + (n - 1) * TOKENS.grid.gutter, "layout/col-" + n);
function applySize(node, s) {
  const isText = node.type === "TEXT";
  if (s.w === "fill") node.layoutSizingHorizontal = "FILL";
  else if (typeof s.w === "number") {
    node.layoutSizingHorizontal = "FIXED";
    node.resize(s.w, node.height);
    const wVar = s.wVar || (SPAN_VAR.has(s.w) && V[SPAN_VAR.get(s.w)] ? SPAN_VAR.get(s.w) : null);
    if (wVar) {
      try {
        node.setBoundVariable("width", need(wVar));
      } catch (e) {
        if (!isText) throw e; // some Figma versions refuse width variables on text nodes; the fixed width stays
      }
    }
  }
  if (s.h === "fill") node.layoutSizingVertical = "FILL";
  else if (typeof s.h === "number") {
    node.layoutSizingVertical = "FIXED";
    node.resize(node.width, s.h);
  } else if (!isText && node.layoutMode && node.layoutMode !== "NONE" && typeof s.w === "number") {
    node.layoutSizingVertical = "HUG";
  }
  if (isText && s.w !== undefined && s.h === undefined) node.textAutoResize = "HEIGHT";
  if (s.grow) {
    node.layoutGrow = 1;
    if (isText) node.textAutoResize = "NONE";
  }
}
function finalize(root) {
  const walk = (n) => {
    const s = SIZE.get(n);
    if (s) applySize(n, s);
    if ("children" in n && n.type !== "INSTANCE") for (const c of n.children) walk(c);
  };
  walk(root);
  return root;
}

const MAIN = { start: "MIN", center: "CENTER", end: "MAX", between: "SPACE_BETWEEN" };
const CROSS = { start: "MIN", center: "CENTER", end: "MAX", baseline: "BASELINE" };
// Auto-layout frame (or component with o.component). Children may be nodes or promises; null/false are skipped.
// o: {dir:'h'|'v', gap, p:n|[v,h]|[t,r,b,l], main, cross, fill:token|paint, stroke, r, clip, w, h, grow, wrap, wVar, component}
async function frame(name, o = {}, kids = []) {
  const f = o.component ? figma.createComponent() : figma.createFrame();
  f.name = name;
  f.fills = o.fill ? [typeof o.fill === "string" ? solid(o.fill) : o.fill] : [];
  f.clipsContent = !!o.clip;
  f.layoutMode = o.dir === "h" ? "HORIZONTAL" : "VERTICAL";
  f.primaryAxisSizingMode = "AUTO";
  f.counterAxisSizingMode = "AUTO";
  f.primaryAxisAlignItems = MAIN[o.main || "start"];
  f.counterAxisAlignItems = CROSS[o.cross || "start"];
  if (o.gap !== undefined) bindSpace(f, "itemSpacing", o.gap);
  else f.itemSpacing = 0;
  if (o.wrap) {
    f.layoutWrap = "WRAP";
    bindSpace(f, "counterAxisSpacing", o.gap);
  }
  const p = o.p === undefined ? [0, 0, 0, 0] : Array.isArray(o.p) ? (o.p.length === 2 ? [o.p[0], o.p[1], o.p[0], o.p[1]] : o.p) : [o.p, o.p, o.p, o.p];
  bindSpace(f, "paddingTop", p[0]);
  bindSpace(f, "paddingRight", p[1]);
  bindSpace(f, "paddingBottom", p[2]);
  bindSpace(f, "paddingLeft", p[3]);
  if (o.r) bindRadius(f, o.r);
  if (o.stroke) stroke(f, o.stroke);
  const children = await Promise.all(kids.flat().filter(Boolean));
  for (const c of children) if (c) f.appendChild(c);
  SIZE.set(f, { w: o.w, h: o.h, grow: o.grow, wVar: o.wVar });
  return f;
}
// Text node with a text style and a colour token. o: {color, w, h, grow, align:'CENTER'|'RIGHT', link:'substring'}
async function text(name, style, chars, o = {}) {
  const t = figma.createText();
  t.name = name;
  if (!TS[style]) throw new Error("missing text style " + style);
  await t.setTextStyleIdAsync(TS[style].id);
  t.characters = chars;
  t.fills = [solid(o.color || "text/default")];
  if (o.align) t.textAlignHorizontal = o.align;
  if (o.link) {
    const i = chars.indexOf(o.link);
    if (i >= 0) {
      t.setRangeFills(i, i + o.link.length, [solid("text/link")]);
      t.setRangeTextDecoration(i, i + o.link.length, "UNDERLINE");
    }
  }
  SIZE.set(t, { w: o.w, h: o.h, grow: o.grow });
  return t;
}
function propKey(node, name) {
  const key = Object.keys(node.componentProperties).find((k) => k.split("#")[0] === name);
  if (!key) throw new Error(node.name + " has no property " + name);
  return key;
}
// Instance of a component or component set (default variant). props: {PropertyName: value}. o: {name, w, h, grow, fill}
async function inst(comp, props = {}, o = {}) {
  if (!comp) throw new Error("inst(): component missing — build it with H.buildComponents first");
  const main = comp.type === "COMPONENT_SET" ? comp.defaultVariant : comp;
  const i = main.createInstance();
  const set = {};
  for (const [k, v] of Object.entries(props)) set[propKey(i, k)] = v;
  if (Object.keys(set).length) i.setProperties(set);
  if (o.name) i.name = o.name;
  if (o.fill) i.fills = [o.fill];
  SIZE.set(i, { w: o.w, h: o.h, grow: o.grow });
  return i;
}
// Sets properties on an exposed nested instance (e.g. the image inside a card).
function nested(instance, name, props) {
  const n = instance.exposedInstances.find((x) => x.name === name);
  if (!n) throw new Error(instance.name + " has no exposed instance " + name);
  const set = {};
  for (const [k, v] of Object.entries(props)) set[propKey(n, k)] = v;
  if (Object.keys(set).length) n.setProperties(set);
  return n;
}
// Image paint from figma-bridge/assets (base name or file name). scaleMode: FILL (cover) | FIT (contain).
async function imagePaint(name, scaleMode = "FILL") {
  const r = await fetch("http://localhost:3999/asset?f=" + encodeURIComponent(name));
  if (!r.ok) throw new Error("asset " + name + " → " + r.status + " (run scripts/convert_images.py?)");
  const img = figma.createImage(new Uint8Array(await r.arrayBuffer()));
  return { type: "IMAGE", imageHash: img.hash, scaleMode };
}
// Top-level components and component sets on the Components page, by name.
function components() {
  const C = {};
  const lib = figma.root.children.find((x) => x.name === "Components");
  if (!lib) return C;
  for (const n of lib.findAllWithCriteria({ types: ["COMPONENT_SET", "COMPONENT"] })) {
    if (n.type === "COMPONENT" && n.parent.type === "COMPONENT_SET") continue;
    C[n.name] = n;
  }
  return C;
}
// Variant of a component set by property values, e.g. variant(C["Button"], {Type: "Primary"}).
function variant(set, values) {
  if (!set) throw new Error("variant(): component set missing");
  const want = Object.entries(values).map(([k, v]) => k + "=" + v);
  const c = set.children.find((x) => want.every((w) => x.name.split(", ").includes(w)));
  if (!c) throw new Error("no variant " + want.join(", ") + " in " + set.name);
  return c;
}
// Presentation backdrop for a component set: light half + dark half (shows Light and Dark themes together).
function twoToneFill(lightToken, darkToken, vertical = false) {
  const stop = (token, position) => ({ position, color: { r: 0, g: 0, b: 0, a: 1 }, boundVariables: { color: figma.variables.createVariableAlias(need(token)) } });
  return {
    type: "GRADIENT_LINEAR",
    gradientTransform: vertical ? [[0, 1, 0], [-1, 0, 1]] : [[1, 0, 0], [0, 1, 0]],
    gradientStops: [stop(lightToken, 0), stop(lightToken, 0.5), stop(darkToken, 0.5), stop(darkToken, 1)],
  };
}
