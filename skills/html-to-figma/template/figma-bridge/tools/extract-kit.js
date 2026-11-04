// Browser-side helpers for EXTRACT functions (injected into the rendered page before the layout files).
window.EXTRACT = window.EXTRACT || {};
window.BUILD = window.BUILD || {};
// Normalised textContent (keeps source casing; CSS text-transform is a style concern). Collapses ASCII whitespace
// only: U+00A0 (no-break glue, e.g. "10&nbsp;km", "Show all&nbsp;→") stays so Figma wraps like the site.
window.txt = (el) => (el ? el.textContent.replace(/[ \t\n\r\f\v]+/g, " ").replace(/^ | $/g, "") : "");
window.q = (root, sel) => (root ? root.querySelector(sel) : null);
window.qa = (root, sel) => (root ? [...root.querySelectorAll(sel)] : []);
// Rendered only: skips [hidden] panels, inactive tabs and display:none nodes.
window.visible = (el) => !!el && el.getClientRects().length > 0;
// Asset name of an URL: path under "assets/" joined with "--", no extension
// ("assets/photos/villa-moon/01.webp?v=3" → "photos--villa-moon--01"); stay photos share base names (01, 02…)
// across folders, so the folder is part of the name. figma-bridge/assets holds <name>.jpg|png.
window.assetName = (url) => {
  if (!url) return null;
  const path = decodeURIComponent(url.split(/[?#]/)[0]).replace(/\\/g, "/");
  const i = path.lastIndexOf("/assets/");
  const rel = i >= 0 ? path.slice(i + 8) : path.split("/").pop();
  return rel.replace(/\.\w+$/, "").split("/").join("--");
};
// Image slot → {img, alt} for a real image (<img>, <picture>, CSS background-image) or {img:null, caption} for a
// placeholder (caption = its text, e.g. an art-direction note).
window.mediaOf = (el) => {
  if (!el) return null;
  const im = el.matches("img") ? el : el.querySelector("img");
  if (im && (im.currentSrc || im.getAttribute("src"))) return { img: assetName(im.getAttribute("src") || im.currentSrc), alt: im.getAttribute("alt") || "" };
  for (const node of [el, ...el.querySelectorAll("*")]) {
    const bg = getComputedStyle(node).backgroundImage;
    const m = bg && bg.match(/url\(["']?([^"')]+)["']?\)/);
    if (m) return { img: assetName(m[1]), alt: node.getAttribute("aria-label") || "" };
  }
  return { img: null, caption: txt(el) };
};
// Breadcrumb trail inside a root, or [] if none: [{label, current}]. Reads text nodes in order, so a current page
// written as bare text ("<a>Home</a><span>›</span>Contact") is included; separators are skipped.
window.crumbs = (root) => {
  const nav = root && root.querySelector('.breadcrumb, nav[aria-label*="readcrumb" i]');
  if (!nav) return [];
  const out = [];
  const walker = document.createTreeWalker(nav, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const s = n.textContent.replace(/\s+/g, " ").trim();
    if (!s || /^[›>»\/|·]+$/.test(s) || !n.parentElement.getClientRects().length) continue;
    out.push({ label: s, current: !n.parentElement.closest("a") });
  }
  return out;
};
// Rich text: plain string plus the substrings that are links or bold, so BUILD can style ranges.
window.rich = (el) => ({ text: txt(el), links: qa(el, "a").map(txt).filter(Boolean), strong: qa(el, "strong, b").map(txt).filter(Boolean) });
