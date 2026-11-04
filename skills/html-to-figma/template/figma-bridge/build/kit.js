// Page-building kit, prepended after lib.js. Shared by every component def and layout module.
const BUILD = {};
// Mobile builds (pages[].device "mobile", 440-wide iPhone 16 & 17 Pro Max frames): BUILD_MOBILE[layout](data, env).
const BUILD_MOBILE = {};
const EXTRACT = {};
const COMPONENT_DEFS = {};
let C = components();
const refreshComponents = () => (C = components());

// ---------- grid: 12 columns × column + gutters (tokens.json → grid)
const GRID = TOKENS.grid;
const CONTAINER = GRID.columns * GRID.column + (GRID.columns - 1) * GRID.gutter;
// Width of n columns including the gutters between them: span(4) = 4 × column + 3 × gutter.
const span = (n) => n * GRID.column + (n - 1) * GRID.gutter;

// ---------- surfaces (tokens.json → surfaces, the site's [data-surface] keys)
// A surface sets its background Theme role and may re-point tokens ("inverse/btn-bg"), exactly like Bricks
// [data-surface="inverse"] { --btn-bg: … }. tok() reads a token through the current surface.
const SURFACES = TOKENS.surfaces;
const surfaceOf = (env) => (env && env.surface) || "default";
const surfaceFill = (surface) => (SURFACES[surface] || SURFACES.default).fill;
const onDark = (env) => !!(SURFACES[surfaceOf(env)] || {}).dark;
const tok = (env, token) => (V[surfaceOf(env) + "/" + token] ? surfaceOf(env) + "/" + token : token);
// Token for the current section: `dark` on a dark surface when given (e.g. text-title → text-contrast), else the
// surface's re-pointed value of `light`, else `light`.
const ink = (env, light, dark) => (onDark(env) && dark ? dark : tok(env, light));
// Theme=Dark component variants read the tokens of the first dark surface (usually "inverse").
const DARK_SURFACE = Object.keys(SURFACES).find((k) => SURFACES[k].dark) || "inverse";
const themed = (theme, token) => (theme === "Dark" ? tok({ surface: DARK_SURFACE }, token) : token);

// Section = full-width band (surface fill) holding one container of CONTAINER width.
// Rhythm (tokens.json → section): padY (= --layout-section-pad, bound to that variable) above/below; two plain
// (default-surface) sections in a row are separated by a hairline on the container plus padY inside it, when
// ruleBetweenPlain is true.
// o: {dir, gap, main, cross, surface, padTop, padBottom, firstTop, sectionGap, bleedBefore:[nodes]}; bleed: nodes after the container (full width).
async function section(name, env, o, kids, bleed = []) {
  const R = TOKENS.section || { padY: 128, ruleBetweenPlain: false };
  const PAD = V["layout-section-pad"] ? "layout-section-pad" : R.padY;
  const surface = o.surface || env.surface || "default";
  const coloured = surface !== "default";
  let secTop = 0;
  let conTop = 0;
  let rule = false;
  if (o.padTop !== undefined) secTop = o.padTop;
  else if (coloured) secTop = PAD;
  else if (env.first) secTop = o.firstTop ?? 0;
  else if (env.prevSurface && env.prevSurface !== "default") secTop = PAD;
  else if (R.ruleBetweenPlain) {
    conTop = PAD;
    rule = true;
  } else secTop = PAD;
  const container = frame("Container", {
    w: CONTAINER, wVar: "figma/container", dir: o.dir, gap: o.gap, main: o.main, cross: o.cross,
    p: [conTop, 0, 0, 0], stroke: rule ? { color: "border-subtle", sides: ["top"] } : undefined,
  }, kids);
  return frame(name, { cross: "center", w: "fill", fill: surfaceFill(surface), p: [secTop, 0, o.padBottom ?? PAD, 0], gap: o.sectionGap }, [...(o.bleedBefore || []), container, ...bleed]);
}

// ---------- common pieces
const eyebrow = (s, env = {}) => text("Eyebrow", "Label/Eyebrow", s, { color: ink(env, "text-eyebrow") });
const btn = (label, values = {}, o = {}) => inst(variant(C["Button"], { Type: "Primary", Size: "Large", Theme: "Light", State: "Default", ...values }), { Label: label }, { name: label, ...o });
const arrowLink = (label, o = {}) => inst(C["Link/Arrow"], { Label: label }, { name: label, ...o });

// Eyebrow + title + lede stack. d: {eyebrow, title, lede}; o: {name, gap, w, titleStyle, titleW, ledeStyle, ledeW}
function headingBlock(d, env, o = {}) {
  const title = () => text("Title", o.titleStyle || "Heading/H2", d.title, { color: ink(env, "text-title", "text-contrast"), w: o.titleW ?? "fill" });
  return frame(o.name || "Heading", { gap: o.gap ?? 16, w: o.w ?? "fill" }, [
    d.eyebrow ? frame("Title group", { gap: 8, w: "fill" }, [eyebrow(d.eyebrow, env), title()]) : title(),
    d.lede ? text("Lede", o.ledeStyle || "Body/LG", d.lede, { color: ink(env, "lede-fg"), w: o.ledeW ?? "fill" }) : null,
  ]);
}

// Every image is an Image/Placeholder instance, so designers swap pictures the same way everywhere:
// select the instance → Fill → image. With a real photo the fill is overridden and the caption hidden.
// m: {img: asset base name | null, caption, alt}; o: {w, h, grow, r: radius token, fit: 'cover'|'contain'}
async function media(name, m, o = {}) {
  const i = await inst(C["Image/Placeholder"], { Caption: (m && (m.caption || m.alt)) || "Image", "Show caption": !(m && m.img) }, { name: "Image · " + name, w: o.w, h: o.h, grow: o.grow });
  if (m && m.img) {
    const fit = o.fit === "contain";
    i.fills = fit ? [solid("bg-surface"), await imagePaint(m.img, "FIT")] : [await imagePaint(m.img)];
    i.strokes = [];
  }
  if (o.r) bindRadius(i, o.r);
  return i;
}

// Breadcrumb trail. items: [{label, current}]
function breadcrumb(items) {
  return frame("Breadcrumb", { dir: "h", gap: 8, cross: "center" }, items.map((it) =>
    inst(variant(C["Breadcrumb/Item"], { State: it.current ? "Current" : "Link" }), { Label: it.label }, { name: it.label })));
}

// Helper for component defs: wire a text layer's characters (or a layer's visibility) to a new component property.
function textProp(comp, layerName, propName, def) {
  const layer = comp.findOne((n) => n.name === layerName);
  if (!layer) throw new Error(comp.name + " has no layer " + layerName);
  layer.componentPropertyReferences = { ...layer.componentPropertyReferences, characters: comp.addComponentProperty(propName, "TEXT", def) };
}
function boolProp(comp, layerName, propName, def) {
  const key = comp.addComponentProperty(propName, "BOOLEAN", def);
  for (const layer of comp.findAll((n) => n.name === layerName)) layer.componentPropertyReferences = { ...layer.componentPropertyReferences, visible: key };
  return key;
}
// Combine variant components into a set laid out with auto layout. o: {name, dir, gap, wrap, w, fill}
function variantSet(variants, o) {
  const set = figma.combineAsVariants(variants, figma.currentPage);
  set.name = o.name;
  set.layoutMode = o.dir === "v" ? "VERTICAL" : "HORIZONTAL";
  set.primaryAxisSizingMode = "AUTO";
  set.counterAxisSizingMode = "AUTO";
  set.itemSpacing = o.gap ?? 24;
  set.paddingTop = set.paddingRight = set.paddingBottom = set.paddingLeft = 24;
  if (o.wrap) {
    set.layoutWrap = "WRAP";
    set.counterAxisSpacing = o.gap ?? 24;
    set.primaryAxisSizingMode = "FIXED";
    set.resize(o.w || 1000, set.height);
    set.counterAxisSizingMode = "AUTO";
  }
  set.fills = [o.fill || solid("bg-surface")];
  if (o.description) set.description = o.description;
  return set;
}
// Text property on every variant of a set (the layer must exist in each variant).
function setTextProp(set, layerName, propName, def) {
  const key = set.addComponentProperty(propName, "TEXT", def);
  for (const v of set.children) for (const layer of v.findAll((n) => n.name === layerName)) layer.componentPropertyReferences = { ...layer.componentPropertyReferences, characters: key };
  return key;
}
function setBoolProp(set, layerName, propName, def) {
  const key = set.addComponentProperty(propName, "BOOLEAN", def);
  for (const v of set.children) for (const layer of v.findAll((n) => n.name === layerName)) layer.componentPropertyReferences = { ...layer.componentPropertyReferences, visible: key };
  return key;
}
function swapProp(comp, layerName, propName, defComp) {
  const key = comp.addComponentProperty(propName, "INSTANCE_SWAP", defComp.id);
  for (const layer of comp.findAll((n) => n.name === layerName)) layer.componentPropertyReferences = { ...layer.componentPropertyReferences, mainComponent: key };
  return key;
}
function setSwapProp(set, layerName, propName, defComp) {
  const key = set.addComponentProperty(propName, "INSTANCE_SWAP", defComp.id);
  for (const v of set.children) for (const layer of v.findAll((n) => n.name === layerName)) layer.componentPropertyReferences = { ...layer.componentPropertyReferences, mainComponent: key };
  return key;
}

// ---------- icons, buttons with icons
// Icon instance of "Icon/<key>" (components made by H.harvestIcons or by hand). key = the site's icon name ("bed"…).
// o: {size: 12–48 (scales the 24px icon), color: text token, name}
async function icon(key, o = {}) {
  const c = C["Icon/" + key];
  if (!c) throw new Error("no icon " + key + " (H.harvestIcons, then H.buildComponents([\"Icon/" + key + "\"]))");
  const i = await inst(c, {}, { name: o.name || "Icon · " + key });
  if (o.color) i.findOne((n) => n.name === "Glyph").fills = [solid(o.color)];
  if (o.size && o.size !== 24) i.rescale(o.size / 24);
  return i;
}
// Recolour the glyph of an icon instance nested in a component instance (e.g. a card's meta icons).
function tintIcon(iconInstance, token) {
  const g = iconInstance.findOne((n) => n.name === "Glyph");
  if (g) g.fills = [solid(token)];
}
// Button with a leading icon (Button's 'Show icon' boolean + 'Icon' instance swap): btnIcon("Search", "magnifying-glass", {Size: "Small"}).
async function btnIcon(label, iconKey, values = {}, o = {}) {
  const b = await btn(label, values, o);
  // The variant's own icon colour (may differ from the label, e.g. a gold icon on a black pill), read before the swap.
  const own = b.children.find((n) => n.type === "INSTANCE");
  const ownGlyph = own && own.findOne((n) => n.name === "Glyph");
  const fills = ownGlyph ? ownGlyph.fills : null;
  b.setProperties({ [propKey(b, "Show icon")]: true, [propKey(b, "Icon")]: C["Icon/" + iconKey].id });
  // A swapped icon comes back with its own glyph colour: restore the variant's icon colour (else the label colour).
  const swapped = b.children.find((n) => n.type === "INSTANCE");
  const glyph = swapped && swapped.findOne((n) => n.name === "Glyph");
  const labelNode = b.findOne((n) => n.name === "Label");
  if (glyph) glyph.fills = fills || (labelNode ? labelNode.fills : glyph.fills);
  return b;
}
// Mobile section band (device "mobile" frames, tokens.json → gridMobile): surface fill, side margins = gridMobile.margin,
// kids fill the content width. o: {dir, gap, main, cross, surface, padTop (default 48), padBottom (default 48)}.
const MOBILE = TOKENS.gridMobile || { page: 440, columns: 4, gutter: 16, margin: 16 };
function msection(name, env, o, kids) {
  const surface = o.surface || env.surface || "default";
  return frame(name, { w: "fill", dir: o.dir, gap: o.gap, main: o.main, cross: o.cross, fill: surfaceFill(surface), p: [o.padTop ?? 48, MOBILE.margin, o.padBottom ?? 48, MOBILE.margin] }, kids);
}
// Photo with content on top (hero bands, tiles): auto-layout frame "Image · <name>" whose FILL is the photo (cover),
// optionally under a scrim (o.scrim: colour token, e.g. "all-dark-40"); kids sit on the photo. Without a photo the
// frame shows photo-bg. Designers swap the photo like any image: select → Fill → image.
// o: frame options (dir, gap, p, main, cross, w, h, grow, r) + scrim + clip (default true) + fit ("contain" → FIT).
async function overlay(name, m, o = {}, kids = []) {
  const { scrim, fit, ...fo } = o;
  const f = await frame("Image · " + name, { ...fo, clip: o.clip ?? true, fill: "photo-bg" }, kids);
  if (m && m.img) f.fills = [await imagePaint(m.img, fit === "contain" ? "FIT" : "FILL"), ...(scrim ? [solid(scrim)] : [])];
  f.setPluginData("media", "overlay");
  return f;
}
// Effect / gradient styles from tokens.json → effects / gradients (build/foundations.js):
// await elevate(node, "shadow-m"); await gradient(node, "gradient-brand").
async function elevate(node, styleName) {
  const s = (await figma.getLocalEffectStylesAsync()).find((x) => x.name === styleName);
  if (!s) throw new Error("no effect style " + styleName + " (tokens.json → effects, then run build/foundations.js)");
  await node.setEffectStyleIdAsync(s.id);
  return node;
}
async function gradient(node, styleName) {
  const s = (await figma.getLocalPaintStylesAsync()).find((x) => x.name === styleName);
  if (!s) throw new Error("no paint style " + styleName + " (tokens.json → gradients, then run build/foundations.js)");
  await node.setFillStyleIdAsync(s.id);
  return node;
}
// Site CSS rotate(deg) (clockwise) → Figma rotation (counter-clockwise). Inside auto layout the parent lays out the
// rotated bounding box; call after the node has its final size (after finalize of the tree).
function tilt(node, cssDeg) {
  node.rotation = -cssDeg;
  return node;
}

// ---------- Edge fades (site CSS mask-image / gradient overlays at the edges of scrolling strips)
// Hooks run by the harness after the page frame is laid out (positions final): AFTER_LAYOUT.push(async () => …).
const AFTER_LAYOUT = [];
// Fade the content of `area` towards its edges along one axis, like the site's mask or fade overlays.
// o: {axis: "x" | "y", size: px of each fade (or o.ratio of the area length), edges: ["start", "end"],
//     mode: "alpha" (TEXT: the glyph colour goes transparent — CSS mask-image) |
//           "overlay" (images: a gradient of o.color, the background behind the strip, is laid over the photo)}
// Targets: TEXT nodes (alpha) or Image/Placeholder instances / "Image · " frames (overlay) inside `area`.
function edgeFade(area, o) {
  const horizontal = o.axis !== "y";
  const box = area.absoluteBoundingBox;
  const L = horizontal ? box.width : box.height;
  const size = o.size || L * (o.ratio || 0.12);
  const edges = o.edges || ["start", "end"];
  // coverage(p): 1 where the area is fully visible, 0 at a faded edge (p = distance from the area's start).
  const coverage = (p) => {
    let c = 1;
    if (edges.includes("start")) c = Math.min(c, Math.max(0, p / size));
    if (edges.includes("end")) c = Math.min(c, Math.max(0, (L - p) / size));
    return c;
  };
  const isTarget = (n) => (o.mode === "alpha" ? n.type === "TEXT" : (n.type === "INSTANCE" && n.name.startsWith("Image")) || (n.type === "FRAME" && n.name.startsWith("Image · ")));
  const transform = horizontal ? [[1, 0, 0], [0, 1, 0]] : [[0, 1, 0], [1, 0, 0]];
  let n = 0;
  for (const node of area.findAll(isTarget)) {
    const b = node.absoluteBoundingBox;
    const start = horizontal ? b.x - box.x : b.y - box.y;
    const len = horizontal ? b.width : b.height;
    if (!len || start + len <= 0 || start >= L) continue;
    const marks = [0, size, L - size, L].map((p) => (p - start) / len).filter((t) => t > 0 && t < 1);
    const ts = [0, ...marks, 1].sort((a, z) => a - z);
    const cov = ts.map((t) => coverage(start + t * len));
    if (cov.every((c) => c >= 0.999)) continue; // not in a fade zone
    if (o.mode === "alpha") {
      const base = o.color || (node.fills[0] && node.fills[0].color) || { r: 1, g: 1, b: 1 };
      node.fills = [{ type: "GRADIENT_LINEAR", gradientTransform: transform, gradientStops: ts.map((t, i) => ({ position: t, color: { r: base.r, g: base.g, b: base.b, a: cov[i] } })) }];
    } else {
      const c = o.color;
      const overlay = { type: "GRADIENT_LINEAR", gradientTransform: transform, gradientStops: ts.map((t, i) => ({ position: t, color: { r: c.r, g: c.g, b: c.b, a: 1 - cov[i] } })) };
      node.fills = [...node.fills.filter((p) => p.type !== "GRADIENT_LINEAR"), overlay];
    }
    node.setPluginData("edgeFade", "1");
    n++;
  }
  return n;
}
// Resolved RGB of a colour token (for fades that must match a background).
async function tokenRGB(token) {
  let v = need(token);
  for (let k = 0; k < 5; k++) {
    const val = v.valuesByMode[Object.keys(v.valuesByMode)[0]];
    if (val && val.type === "VARIABLE_ALIAS") v = await figma.variables.getVariableByIdAsync(val.id);
    else return val;
  }
  throw new Error("cannot resolve " + token);
}
const round4 = (n) => Math.round(n / 4) * 4;

// SVG markup → one flattened VECTOR (region fills keep multi-colour artwork; clip-path/mask shapes are dropped so they
// do not flatten into solid boxes). o: {box: px (fits the SVG's longer side), h: px height, scale}. For logos and icons
// copied from the site's inline SVG or asset files — the real artwork, never redrawn.
function svgArt(svg, name, o = {}) {
  const f = figma.createNodeFromSvg(svg);
  if (o.scale) f.rescale(o.scale);
  else if (o.box) f.rescale(o.box / Math.max(f.width, f.height));
  else if (o.h) f.rescale(o.h / f.height);
  const paints = (x) => (Array.isArray(x) ? x : []).some((p) => p.visible !== false);
  const inMask = (n) => { for (let x = n; x && x !== f; x = x.parent) if (x.isMask) return true; return false; };
  const leaves = f.findAll((n) => ["VECTOR", "BOOLEAN_OPERATION", "RECTANGLE", "ELLIPSE", "POLYGON", "STAR", "LINE"].includes(n.type) && !inMask(n) && (paints(n.fills) || paints(n.strokes)));
  const v = figma.flatten(leaves, figma.currentPage);
  v.name = name;
  f.remove();
  return v;
}
