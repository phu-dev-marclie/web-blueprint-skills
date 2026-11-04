/* style-probe.js — phase 7 (UI refine) probe. Open the REFERENCE site in a real browser at 1440 and at
   390 wide, scroll the whole page (lazy content), then evaluate this file's source (omp browser
   `tab.evaluate(src)`, Playwright `page.evaluate(src)`). It returns a Promise of a JSON report of the
   measured design system, the evidence for `design.md`. Read-only: it changes nothing on the page.

   Report: { url, width, height, measuredAt, ms, truncated, elements,
     cssVars {name: value}, fonts [{family, weights, share}],
     type [{size, lineHeight, weight, family, letterSpacing, transform, count, chars, tags, sample}],
     roles {display, h1, h2, h3, body, small, button, nav, eyebrow},
     colours {text [{hex, share}], background [{hex, areaShare}], border [{hex, count}], accent [{hex, where, count}]},
     surfaces [{hex, areaShare, sections, canvas?}], radii [{px, count, where}], shadows [{value, count, where}],
     gradients [{value, count}], spacing {sectionPadY, gaps, paddings, container: [{px, count}]},
     components {buttons, links, inputs, cards, nav, footer}, images {count, ratios, radiusPx}, motion {transitions} }

   Units: px rounded to 0.5. Radius 9999 = fully rounded (pill/circle). letterSpacing in px.
   Colours: lower-case #rrggbb, #rrggbbaa when alpha < 1. Saturated = chroma (max − min channel) / 255
   > 0.15 and HSL saturation > 0.3 (keeps slate greys out); accent = saturated colours on interactive
   elements (colour, background, border, outline; icon fill inside links/buttons). The canvas surface
   counts full-width bands of the page background in `sections`. sectionPadY = vertical inset from a
   full-width band's edge to its first/last visible content (not the declared padding). Skipped: hidden / display:none /
   opacity 0 / zero-size / sr-only / off-canvas subtrees; aria-hidden subtrees count for boxes and images
   but not for text. The walk caps at 6000 elements or 2.6 s (`truncated: true`).                   */
(async () => {
  const T0 = performance.now();
  const MAX_EL = 6000, WALK_MS = 2600;
  const de = document.documentElement, body = document.body || de;
  const VW = de.clientWidth, VH = innerHeight, SX = scrollX, SY = scrollY;
  const DW = Math.max(de.scrollWidth, VW), DH = Math.max(de.scrollHeight, body.scrollHeight || 0, VH);
  const DOC_AREA = DW * DH;
  const px = v => Math.round(v * 2) / 2;
  const num = v => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
  const r3 = v => Math.round(v * 1000) / 1000;
  const inc = (m, k, by = 1) => m.set(k, (m.get(k) || 0) + by);
  const clean = s => (s || "").replace(/\s+/g, " ").trim();
  const cut = (s, n = 40) => { s = clean(s); return s.length > n ? s.slice(0, n - 1) + "…" : s; };

  /* ---------- colour */
  const cache = new Map();
  let ctx = null;
  const byte = n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  const alphaOf = s => s === undefined ? 1 : s.endsWith("%") ? parseFloat(s) / 100 : +s;
  const rgba = v => {                                   // css colour → [r, g, b, a] (0–255, a 0–1) or null
    if (!v || v === "transparent" || v === "none" || v === "currentcolor") return null;
    if (cache.has(v)) return cache.get(v);
    let out = null, m;
    if ((m = v.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*([\d.]+%?))?\s*\)$/))) {
      out = [+m[1], +m[2], +m[3], alphaOf(m[4])];
    } else if ((m = v.match(/^color\(srgb\s+([-\d.e]+)\s+([-\d.e]+)\s+([-\d.e]+)\s*(?:\/\s*([\d.]+%?))?\s*\)$/))) {
      out = [m[1] * 255, m[2] * 255, m[3] * 255, alphaOf(m[4])];
    } else {
      try {                                              // oklch / lab / display-p3 …: let canvas resolve it
        if (!ctx) { const c = document.createElement("canvas"); c.width = c.height = 1; ctx = c.getContext("2d", { willReadFrequently: true }); }
        ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = "rgba(0,0,0,0)"; ctx.fillStyle = v; ctx.fillRect(0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        out = [d[0], d[1], d[2], d[3] / 255];
      } catch (e) { out = null; }
    }
    if (out && !(out[3] > 0.004)) out = null;
    cache.set(v, out);
    return out;
  };
  const hex = c => c ? "#" + byte(c[0]) + byte(c[1]) + byte(c[2]) + (c[3] < 0.995 ? byte(c[3] * 255) : "") : null;
  const hexOf = v => hex(rgba(v));
  const saturated = c => {
    const mx = Math.max(c[0], c[1], c[2]) / 255, mn = Math.min(c[0], c[1], c[2]) / 255, l = (mx + mn) / 2, d = mx - mn;
    return d > 0.15 && d / (1 - Math.abs(2 * l - 1)) > 0.3;
  };
  const colourText = s => s.replace(/(?:rgba?|color|oklch|oklab|lab|lch|hsla?|hwb)\([^()]*\)/g, x => hexOf(x) || "transparent");

  /* ---------- walk: visible elements in document order */
  const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "HEAD", "META", "LINK", "IFRAME", "OBJECT", "EMBED", "BR", "WBR", "DIALOG"]);
  const items = [], byEl = new Map();
  let truncated = false;
  const stack = [[body, false]];
  while (stack.length) {
    if (items.length >= MAX_EL || performance.now() - T0 > WALK_MS) { truncated = true; break; }
    const [el, hiddenAncestor] = stack.pop();
    if (SKIP.has(el.tagName) && !(el.tagName === "DIALOG" && el.open)) continue;
    if (el.hidden || el.inert) continue;
    // aria-hidden subtrees stay in the visual measures (decorative images, boxes) but their text is ignored
    const ah = hiddenAncestor || el.getAttribute("aria-hidden") === "true";
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.visibility === "collapse" ||
        cs.opacity === "0" || cs.contentVisibility === "hidden") continue;
    const kids = el.tagName.toLowerCase() === "svg" ? [] : el.children;
    const descend = () => { for (let i = kids.length - 1; i >= 0; i--) stack.push([kids[i], ah]); };
    if (cs.display === "contents") { descend(); continue; }
    const b = el.getBoundingClientRect();
    if (b.width <= 1 || b.height <= 1) {                 // sr-only boxes are clipped; zero-height wrappers are not
      if (cs.overflow === "visible" && b.width * b.height === 0) descend();
      continue;
    }
    if (/^rect\(0/.test(cs.clip) || /inset\((50|100)%/.test(cs.clipPath)) continue;
    const r = { x: b.left + SX, y: b.top + SY, w: b.width, h: b.height };
    if (r.x + r.w <= 0 || r.x >= DW || r.y + r.h <= 0 || r.y >= DH) continue;   // off-canvas drawers
    const it = { el, cs, r, ah, tag: el.tagName.toLowerCase(), i: items.length };
    items.push(it); byEl.set(el, it);
    descend();
  }
  const parentItem = it => { for (let p = it.el.parentElement; p; p = p.parentElement) { const x = byEl.get(p); if (x) return x; } return null; };
  const endOf = it => { let j = it.i + 1; while (j < items.length && it.el.contains(items[j].el)) j++; return j; };
  const clipArea = r => Math.max(0, Math.min(DW, r.x + r.w) - Math.max(0, r.x)) * Math.max(0, Math.min(DH, r.y + r.h) - Math.max(0, r.y));

  /* ---------- per-element box facts */
  const borderOf = cs => {
    for (const s of ["Top", "Right", "Bottom", "Left"]) {
      const w = num(cs["border" + s + "Width"]), c = rgba(cs["border" + s + "Color"]);
      if (w > 0 && c && cs["border" + s + "Style"] !== "none") return { w: px(w), style: cs["border" + s + "Style"], hex: hex(c) };
    }
    return null;
  };
  const radiusOf = it => {
    const { cs, r } = it, half = Math.min(r.w, r.h) / 2;
    let max = 0;
    for (const k of ["borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius"]) {
      const v = cs[k].split(" ")[0];
      max = Math.max(max, v.endsWith("%") ? num(v) * Math.min(r.w, r.h) / 100 : num(v));
    }
    return max <= 0 ? 0 : max >= half - 0.5 ? 9999 : px(max);
  };
  const textLen = el => clean(el.textContent).length;
  const repeated = el => {
    const p = el.parentElement; if (!p) return false;
    let n = 0; const cn = typeof el.className === "string" ? el.className : "";
    for (const s of p.children) if (s.tagName === el.tagName && (typeof s.className === "string" ? s.className : "") === cn && ++n >= 2) return true;
    return false;
  };
  for (const it of items) {
    const { el, cs, r, tag } = it;
    it.bg = rgba(cs.backgroundColor);
    it.border = borderOf(cs);
    it.shadow = cs.boxShadow !== "none" ? colourText(cs.boxShadow) : null;
    it.grad = /gradient\(/.test(cs.backgroundImage) ? colourText(cs.backgroundImage) : null;
    it.radius = radiusOf(it);
    it.boxy = !!(it.bg || it.border || it.shadow || it.grad);
    const type = (el.getAttribute("type") || "").toLowerCase();
    const role = el.getAttribute("role");
    let kind;
    if (tag === "img" || tag === "picture" || tag === "video") kind = "image";
    else if (tag === "svg") kind = "icon";
    else if (tag === "input" && /^(submit|button|reset)$/.test(type)) kind = "button";
    else if (tag === "input" || tag === "select" || tag === "textarea") kind = "input";
    else if (tag === "button" || role === "button") kind = r.h <= 88 && r.w <= 480 ? "button" : "box";
    else if (tag === "a") kind = (it.boxy && r.h >= 24 && r.h <= 88 && r.w <= 480 && textLen(el) <= 40) ? "button" : "link";
    else if (tag === "header" || tag === "nav" || role === "banner" || role === "navigation") kind = "nav";
    else if (tag === "footer" || role === "contentinfo") kind = "footer";
    else if (r.w >= 0.9 * VW) kind = "section";
    else if (it.boxy && r.h < 40 && r.w < 240 && textLen(el) <= 30) kind = "badge";
    else kind = "box";
    it.kind = kind;
  }
  // cards: repeated, card-sized, carrying media or a heading; outermost wins
  const cardSet = new Set();
  for (const it of items) {
    const { el, r } = it;
    if (it.kind !== "box" && it.kind !== "link" && it.kind !== "button") continue;
    if (r.w < 120 || r.w > (VW >= 768 ? 0.7 : 1) * VW || r.h < 120) continue;
    if (!repeated(el) || textLen(el) < 8 || !el.querySelector("img, picture, video, h2, h3, h4, h5, h6, [role=heading]")) continue;
    let inside = false;
    for (let p = el.parentElement; p && !inside; p = p.parentElement) inside = cardSet.has(p);
    if (inside) continue;
    const pi = parentItem(it);
    if (pi && pi.r.w < r.w + 4 && repeated(pi.el)) continue;
    cardSet.add(el); it.kind = "card";
  }
  const isBtnEl = el => { const x = byEl.get(el); return x && x.kind === "button"; };

  /* ---------- text styles */
  const clusters = new Map();
  const fontsM = new Map();
  const textCol = new Map();
  let totalChars = 0;
  const firstFamily = f => clean(f.split(",")[0]).replace(/^["']|["']$/g, "");
  for (const it of items) {
    const { el, cs, r, tag } = it;
    if (it.ah) continue;
    let t = "";
    for (const n of el.childNodes) if (n.nodeType === 3) t += n.textContent;
    if (tag === "input" && it.kind === "button") t = el.value || "";
    t = clean(t);
    if (!t) continue;
    const col = rgba(cs.color);
    if (!col) continue;
    const size = px(num(cs.fontSize));
    if (size < 6) continue;
    const lh = cs.lineHeight === "normal" ? px(size * 1.2) : px(num(cs.lineHeight));
    const weight = num(cs.fontWeight) || 400;
    const family = firstFamily(cs.fontFamily);
    const ls = cs.letterSpacing === "normal" ? 0 : px(num(cs.letterSpacing) * 10) / 10;
    const tf = cs.textTransform === "none" ? "none" : cs.textTransform;
    const key = [size, lh, weight, family, ls, tf].join("|");
    let c = clusters.get(key);
    if (!c) clusters.set(key, c = { size, lineHeight: lh, weight, family, letterSpacing: ls, transform: tf,
      count: 0, chars: 0, tags: {}, sample: cut(t), top: r.y, hints: { button: 0, nav: 0, eyebrow: 0 } });
    c.count++; c.chars += t.length; c.top = Math.min(c.top, r.y);
    c.tags[tag] = (c.tags[tag] || 0) + 1;
    const ctl = el.closest("a, button, [role=button], input, label");
    const inBtn = isBtnEl(el) || (ctl && isBtnEl(ctl));
    if (inBtn) c.hints.button++;
    else if (ctl && el.closest("nav, header, [role=navigation], [role=banner]")) c.hints.nav++;
    else if (!ctl && size <= 16 && t.length <= 60 && (tf === "uppercase" || ls >= 0.05 * size)) c.hints.eyebrow++;
    totalChars += t.length;
    let f = fontsM.get(family);
    if (!f) fontsM.set(family, f = { family, weights: new Set(), chars: 0 });
    f.weights.add(weight); f.chars += t.length;
    inc(textCol, hex(col), t.length);
    it.text = t;
  }
  const cl = [...clusters.values()].sort((a, b) => b.chars - a.chars);
  const pick = c => c ? { size: c.size, lineHeight: c.lineHeight, weight: c.weight, family: c.family,
    letterSpacing: c.letterSpacing, transform: c.transform, sample: c.sample } : null;
  const byTag = tags => { let best = null, bc = 0;
    for (const c of cl) { const n = tags.reduce((s, t) => s + (c.tags[t] || 0), 0); if (n && (n > bc || (n === bc && c.chars > best.chars))) { best = c; bc = n; } }
    return best; };
  const most = (f, by = "chars") => cl.filter(f).sort((a, b) => b[by] - a[by])[0] || null;
  const bodyLike = maxW => c => c.size >= 13 && c.size <= 22 && c.weight <= maxW && c.transform === "none";
  const body0 = most(bodyLike(450)) || most(bodyLike(550)) || most(c => c.size >= 12) || cl[0] || null;
  const bs = body0 ? body0.size : 16;
  const bySize = cl.filter(c => c.chars >= 4).sort((a, b) => b.size - a.size || a.top - b.top);
  const h1 = byTag(["h1"]) || bySize[0] || null;
  const biggest = bySize[0] || null;
  const display = biggest && h1 && biggest.size > h1.size * 1.1 ? biggest : h1;
  const h2 = byTag(["h2"]) || most(c => c.size >= bs * 1.4 && (!h1 || c.size < h1.size));
  const h3 = byTag(["h3", "h4"]) || most(c => c.size >= bs * 1.1 && (!h2 || c.size < h2.size) && c.weight >= 500);
  const byHint = h => cl.filter(c => c.hints[h]).sort((a, b) => b.hints[h] - a.hints[h] || b.chars - a.chars)[0] || null;
  const roles = {
    display: pick(display), h1: pick(h1), h2: pick(h2), h3: pick(h3), body: pick(body0),
    small: pick(most(c => c.size < bs && c.size >= 10)),
    button: pick(byHint("button")),
    nav: pick(byHint("nav")),
    eyebrow: pick(byHint("eyebrow")),
  };
  const type = cl.slice(0, 30).map(c => ({ size: c.size, lineHeight: c.lineHeight, weight: c.weight, family: c.family,
    letterSpacing: c.letterSpacing, transform: c.transform, count: c.count, chars: c.chars, tags: c.tags, sample: c.sample }));
  const fonts = [...fontsM.values()].sort((a, b) => b.chars - a.chars)
    .map(f => ({ family: f.family, weights: [...f.weights].sort((a, b) => a - b), share: r3(f.chars / (totalChars || 1)) }));

  /* ---------- colours, surfaces, effects */
  const where = () => new Map();
  const addW = (m, k, w) => { let e = m.get(k); if (!e) m.set(k, e = { count: 0, where: new Map() }); e.count++; inc(e.where, w); };
  const outW = (m, keyName, n) => [...m.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, n)
    .map(([k, e]) => ({ [keyName]: keyName === "px" ? +k : k, count: e.count,
      where: [...e.where.entries()].sort((a, b) => b[1] - a[1]).map(x => x[0]) }));
  const bgArea = new Map(), borders = new Map(), accents = where(), radii = where(), shadows = where(), grads = new Map();
  const htmlCs = getComputedStyle(de), bodyCs = getComputedStyle(body);
  const canvasHex = hexOf(bodyCs.backgroundColor) || hexOf(htmlCs.backgroundColor) || "#ffffff";
  if (!rgba(bodyCs.backgroundColor)) inc(bgArea, canvasHex, DOC_AREA);
  const INTERACTIVE = { button: "button", link: "link", input: "input" };
  for (const it of items) {
    const { cs, r, kind } = it;
    if (it.bg) inc(bgArea, hex(it.bg), clipArea(r));
    if (it.border) inc(borders, it.border.hex);
    if (it.radius) addW(radii, String(it.radius), kind);
    if (it.shadow) addW(shadows, it.shadow, kind);
    if (it.grad) inc(grads, it.grad);
    const w = INTERACTIVE[kind];
    if (w) for (const v of [cs.color, cs.backgroundColor, cs.borderTopColor, cs.borderBottomColor, cs.outlineColor]) {
      const c = rgba(v); if (c && c[3] >= 0.5 && saturated(c)) addW(accents, hex(c), w);
    }
    if (kind === "icon") { const c = rgba(cs.fill) || rgba(cs.color); const a = it.el.closest("a, button"); if (c && a && saturated(c)) addW(accents, hex(c), "icon"); }
  }
  const share = (m, total, n, key, val) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ [key]: k, [val]: r3(v / total) }));
  const colours = {
    text: share(textCol, totalChars || 1, 12, "hex", "share"),
    background: share(bgArea, DOC_AREA, 12, "hex", "areaShare").map(x => ({ hex: x.hex, areaShare: Math.min(1, x.areaShare) })),
    border: [...borders.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => ({ hex: k, count: v })),
    accent: [...accents.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 10)
      .map(([k, e]) => ({ hex: k, where: [...e.where.keys()], count: e.count })),
  };
  // full-width bands
  const bands = items.filter(it => it.r.w >= 0.9 * VW && it.r.h >= 120 && it.el !== body);
  const surf = new Map();
  const bandHex = new Map();
  for (const it of bands) {
    if (!it.bg || it.bg[3] < 0.5) continue;
    const h = hex(it.bg); bandHex.set(it.el, h);
    let dup = false;
    for (let p = it.el.parentElement; p && !dup; p = p.parentElement) dup = bandHex.get(p) === h;
    if (dup) continue;
    let e = surf.get(h); if (!e) surf.set(h, e = { area: 0, sections: 0 });
    e.area += clipArea(it.r); e.sections++;
  }
  const canvasBands = surf.get(canvasHex);
  surf.delete(canvasHex);
  const surfaces = [{ hex: canvasHex, areaShare: 1, sections: canvasBands ? canvasBands.sections : 0, canvas: true },
    ...[...surf.entries()].sort((a, b) => b[1].area - a[1].area).slice(0, 10)
      .map(([h, e]) => ({ hex: h, areaShare: r3(Math.min(1, e.area / DOC_AREA)), sections: e.sections }))];

  /* ---------- spacing */
  const sectionPad = new Map(), gaps = new Map(), pads = new Map(), container = new Map();
  const leafBands = [];
  for (const it of bands) {
    if (["main", "html"].includes(it.tag)) continue;
    const end = endOf(it);
    let inner = false;
    for (let j = it.i + 1; j < end && !inner; j++) { const x = items[j]; inner = x.r.w >= 0.9 * VW && x.r.h >= 120 && !(Math.abs(x.r.y - it.r.y) < 1 && Math.abs(x.r.h - it.r.h) < 1); }
    if (!inner) leafBands.push([it, end]);
    if (leafBands.length >= 80) break;
  }
  for (const [it, end] of leafBands) {
    let top = Infinity, bot = -Infinity;
    for (let j = it.i + 1; j < end; j++) { const x = items[j]; if (x.text || x.kind === "image" || x.kind === "button" || x.kind === "input") { top = Math.min(top, x.r.y); bot = Math.max(bot, x.r.y + x.r.h); } }
    if (top === Infinity) continue;
    for (const v of [top - it.r.y, it.r.y + it.r.h - bot]) if (v >= 0 && v < it.r.h / 2) inc(sectionPad, px(v));
  }
  for (const it of items) {
    const { cs, r, el } = it;
    if (/flex|grid/.test(cs.display)) for (const g of [cs.rowGap, cs.columnGap]) { const v = num(g); if (v > 0) inc(gaps, px(v)); }
    if (it.boxy || it.kind === "button" || it.kind === "input" || it.kind === "card") {
      const s = new Set([cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(num).filter(v => v > 0).map(px));
      for (const v of s) inc(pads, v);
    }
    if (el.children.length && r.h >= 40 && r.w >= (VW >= 768 ? 0.4 : 0.7) * VW && r.w <= VW - 8 &&
        Math.abs(r.x - (VW - r.x - r.w)) <= 2 && it.kind !== "card" && it.kind !== "image") {
      const p = parentItem(it);
      if (p && p.r.w >= r.w + 16) inc(container, px(r.w));
    }
  }
  const top = (m, n = 12) => [...m.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, n).map(([k, v]) => ({ px: k, count: v }));
  const spacing = { sectionPadY: top(sectionPad), gaps: top(gaps), paddings: top(pads, 16), container: top(container, 8) };

  /* ---------- components */
  const fontStr = cs => `${num(cs.fontWeight) || 400} ${px(num(cs.fontSize))}/${cs.lineHeight === "normal" ? "normal" : px(num(cs.lineHeight))} ${firstFamily(cs.fontFamily)}` +
    (cs.letterSpacing !== "normal" && num(cs.letterSpacing) ? ` ls ${px(num(cs.letterSpacing) * 10) / 10}` : "") + (cs.textTransform !== "none" ? " " + cs.textTransform : "");
  const padStr = cs => [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(v => px(num(v))).join(" ");
  const bdStr = it => it.border ? `${it.border.w}px ${it.border.style} ${it.border.hex}` : "none";
  const undouble = s => { const h = s.length / 2; return s.length % 2 === 0 && s.slice(0, h) === s.slice(h) ? s.slice(0, h) : s; };  // "HomesHomes" (visible + reserve copy)
  const labelOf = el => undouble(cut(el.value && el.tagName === "INPUT" ? el.value : el.textContent, 80)).slice(0, 40) || cut(el.getAttribute("aria-label") || el.getAttribute("title") || "");
  const textItem = it => { if (it.text) return it; for (let j = it.i + 1, e = endOf(it); j < e; j++) if (items[j].text) return items[j]; return null; };
  const distinct = (list, sigOf, mk, n = 6) => {
    const m = new Map();
    for (const it of list) { const s = sigOf(it); const e = m.get(s); if (e) e.count++; else m.set(s, { ...mk(it), count: 1 }); }
    return [...m.values()].sort((a, b) => b.count - a.count).slice(0, n);
  };
  const zone = el => el.closest("header, [role=banner]") ? "header" : el.closest("nav, [role=navigation]") ? "nav" : el.closest("footer, [role=contentinfo]") ? "footer" : "content";
  const buttons = distinct(items.filter(it => it.kind === "button"),
    it => [hex(it.bg), hexOf(it.cs.color), bdStr(it), it.radius, fontStr(it.cs), Math.round(it.r.h / 4)].join("|"),
    it => ({ label: labelOf(it.el), bg: hex(it.bg) || "transparent", color: hexOf(it.cs.color), border: bdStr(it), radius: it.radius,
      padding: padStr(it.cs), height: px(it.r.h), font: fontStr(it.cs), shadow: it.shadow || undefined }));
  const links = distinct(items.filter(it => it.kind === "link" && (it.tx = textItem(it))),
    it => [hexOf(it.tx.cs.color), it.cs.textDecorationLine, it.tx.cs.textDecorationLine, fontStr(it.tx.cs), zone(it.el)].join("|"),
    it => ({ label: labelOf(it.el), color: hexOf(it.tx.cs.color), decoration: it.tx === it ? it.cs.textDecorationLine : it.tx.cs.textDecorationLine,
      font: fontStr(it.tx.cs), zone: zone(it.el) }));
  const inputs = distinct(items.filter(it => it.kind === "input" && !/^(checkbox|radio|hidden|range|file|color)$/i.test(it.el.type || "")),
    it => [it.tag, hex(it.bg), bdStr(it), it.radius, Math.round(it.r.h / 4), fontStr(it.cs)].join("|"),
    it => ({ type: it.tag === "input" ? (it.el.type || "text") : it.tag, placeholder: cut(it.el.getAttribute("placeholder") || ""), bg: hex(it.bg) || "transparent",
      color: hexOf(it.cs.color), border: bdStr(it), radius: it.radius, padding: padStr(it.cs), height: px(it.r.h), font: fontStr(it.cs) }));
  // media corner: its own radius, else that of a same-size wrapper (the usual overflow-clip pattern), up to 5 levels
  const mediaRadius = it => {
    let rad = it.radius;
    for (let p = parentItem(it), k = 0; !rad && p && k < 8; p = parentItem(p), k++) {
      if (p.r.w > it.r.w + 4 || p.r.h > it.r.h + 4) break;      // smaller parents are inline wrappers (<picture>)
      rad = p.radius;
    }
    return rad;
  };
  const cards = distinct(items.filter(it => it.kind === "card"),
    it => [hex(it.bg), bdStr(it), it.radius, it.shadow, Math.round(it.r.w / 20)].join("|"),
    it => {
      let ii = null;
      for (let j = it.i + 1, e = endOf(it); j < e; j++) if (items[j].kind === "image" && (!ii || items[j].r.w * items[j].r.h > ii.r.w * ii.r.h)) ii = items[j];
      const ib = ii && ii.r;
      const head = it.el.querySelector("h2, h3, h4, h5, h6, [role=heading]");
      return { bg: hex(it.bg) || "transparent", border: bdStr(it), radius: it.radius, shadow: it.shadow || "none", padding: padStr(it.cs),
        width: px(it.r.w), height: px(it.r.h), image: ib ? { ratio: Math.round(ib.w / ib.h * 100) / 100, radius: mediaRadius(ii) } : null,
        title: undouble(head ? cut(head.textContent, 80) : cut(it.el.textContent, 80)).slice(0, 40) };
    });
  const effBg = el => { for (let p = el; p; p = p.parentElement) { const c = rgba(getComputedStyle(p).backgroundColor); if (c) return hex(c); } return canvasHex; };
  const visible = el => { const x = byEl.get(el); return !!x; };
  let nav = null;
  const navs = [...document.querySelectorAll("header, [role=banner], nav, [role=navigation]")].filter(visible);
  const pinned = el => { for (let p = el; p && p !== body; p = p.parentElement) if (/fixed|sticky/.test(getComputedStyle(p).position)) return true; return false; };
  const isBanner = el => el.tagName === "HEADER" || el.getAttribute("role") === "banner";
  const hdr = navs.find(el => isBanner(el) && byEl.get(el).r.y < 300 && byEl.get(el).r.h > 20) ||
    navs.find(el => byEl.get(el).r.y < 200) || navs.find(pinned);   // last: a pinned (bottom) tab bar on mobile
  if (hdr) {
    const b = hdr.getBoundingClientRect();
    const sticky = pinned(hdr) || [...hdr.children].some(c => /fixed|sticky/.test(getComputedStyle(c).position));
    const labels = [];
    for (const a of hdr.querySelectorAll("a, button")) {
      if (!visible(a)) continue;
      const l = labelOf(a); if (l && l.length <= 30 && !labels.includes(l)) labels.push(l);
      if (labels.length >= 12) break;
    }
    nav = { height: px(b.height), bg: effBg(hdr), color: hexOf(getComputedStyle(hdr).color), sticky,
      position: b.top > VH / 2 ? "bottom" : "top", items: labels };
  }
  let footer = null;
  const ft = [...document.querySelectorAll("footer, [role=contentinfo]")].pop();
  if (ft) {
    let best = null, bestN = 0;
    for (const g of [ft, ...ft.querySelectorAll("*")].slice(0, 1500)) {
      if (!/flex|grid/.test(getComputedStyle(g).display)) continue;
      const cols = [...g.children].filter(c => c.querySelectorAll("a").length >= 2);
      if (cols.length > bestN) { best = cols; bestN = cols.length; }
    }
    const fcs = getComputedStyle(ft);
    footer = { bg: effBg(ft), color: hexOf(fcs.color), columns: bestN,
      titles: (best || []).slice(0, 8).map(c => { const h = c.querySelector("h2, h3, h4, h5, h6, strong, p, span"); return h ? cut(h.textContent, 30) : ""; }),
      height: px(ft.getBoundingClientRect().height) };
  }
  const components = { buttons, links, inputs, cards, nav, footer };

  /* ---------- images */
  const RATIOS = [[1, 1], [4, 3], [3, 4], [3, 2], [2, 3], [16, 9], [9, 16], [5, 4], [4, 5], [21, 9], [2, 1], [1, 2], [5, 3], [3, 5], [7, 5], [5, 7]];
  const ratioName = q => { for (const [a, b] of RATIOS) if (Math.abs(q / (a / b) - 1) < 0.025) return a + ":" + b; return (Math.round(q * 100) / 100).toFixed(2); };
  const ratios = new Map(), imgR = new Map();
  let imgCount = 0;
  for (const it of items) {
    const isImg = it.tag === "img" || it.tag === "video" || (/url\(/.test(it.cs.backgroundImage) && it.tag !== "a" && it.tag !== "button");
    if (!isImg || it.r.w < 40 || it.r.h < 40) continue;
    imgCount++;
    inc(ratios, ratioName(it.r.w / it.r.h));
    inc(imgR, mediaRadius(it));
  }
  const images = { count: imgCount, ratios: [...ratios.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([ratio, count]) => ({ ratio, count })),
    radiusPx: [...imgR.entries()].sort((a, b) => b[1] - a[1]).map(x => x[0]) };

  /* ---------- motion */
  const trans = new Map();
  for (const it of items) {
    const { cs } = it;
    if (!cs.transitionDuration.split(",").some(d => num(d) > 0)) continue;
    inc(trans, cs.transition.replace(/cubic-bezier\(([^)]*)\)/g, (m, a) => "cubic-bezier(" + a.replace(/\s+/g, "") + ")"));
  }
  const motion = { transitions: [...trans.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([value, count]) => ({ value, count })) };

  /* ---------- custom properties on :root / html / body */
  const names = new Set();
  for (let i = 0; i < htmlCs.length; i++) if (htmlCs[i].startsWith("--")) names.add(htmlCs[i]);
  for (let i = 0; i < bodyCs.length; i++) if (bodyCs[i].startsWith("--")) names.add(bodyCs[i]);
  const ROOTSEL = /(^|,)\s*(:root|html|body)(?=[\s,:.[{]|$)/;
  const visit = (rules, depth) => {
    if (!rules || depth > 6 || names.size >= 2000) return;
    for (const r of rules) {
      if (r.selectorText && ROOTSEL.test(r.selectorText) && r.style) for (let i = 0; i < r.style.length; i++) if (r.style[i].startsWith("--")) names.add(r.style[i]);
      if (r.cssRules) visit(r.cssRules, depth + 1);
    }
  };
  for (const sh of document.styleSheets) { try { visit(sh.cssRules, 0); } catch (e) { /* cross-origin sheet */ } }
  const cssVars = {};
  let nVars = 0;
  for (const n of names) {
    if (nVars >= 400) break;
    const v = (htmlCs.getPropertyValue(n) || bodyCs.getPropertyValue(n)).trim();
    if (v) { cssVars[n] = v.length > 200 ? v.slice(0, 199) + "…" : v; nVars++; }
  }

  return {
    url: location.href, width: VW, height: DH, measuredAt: new Date().toISOString(),
    ms: Math.round(performance.now() - T0), truncated, elements: items.length,
    cssVars, fonts, type, roles, colours, surfaces,
    radii: outW(radii, "px", 12), shadows: outW(shadows, "value", 8),
    gradients: [...grads.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([value, count]) => ({ value, count })),
    spacing, components, images, motion,
  };
})()
