// Content diff between the live HTML and the Figma frames built from it — finds what changed in a new site version.
//   await T.D.diffPage(tab, "index.html", "Home — Desktop 1512")
//   await T.D.diffAll(tab)   // every page in project.json → pages
import * as H from "./harness.js";

// Strings are compared "compact": lower case, without whitespace and separator glyphs, so line breaks in Figma, prices
// split into several text nodes (€306 · €360 · / night) and headings split into per-letter spans by reveal animations
// on the site do not count as differences.
const compact = (s) => s.toLowerCase().normalize("NFKC").replace(/[\s\u00a0\u200b\u2028→↗▾›»+−·•|×✓*]/g, "");

// Per section: rendered text strings (elements owning a direct text node), the section's full text (+ form values and
// aria-labels, which Figma shows as text), and the photos shown (img src + CSS background images, unique URLs).
// Skipped: hidden/collapsed content, text painted transparent (photo-slot captions behind a real photo), progress
// fallbacks, dialogs.
async function htmlSections(tab, file, { prepare = null, sections = null, device = null } = {}) {
  const mobile = device === "mobile";
  await tab.run(async ({ page }, w, h, m) => page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: m, hasTouch: m }),
    { args: [mobile ? H.TOKENS.gridMobile.page : H.TOKENS.grid.page, mobile ? 956 : 982, mobile] });
  await tab.goto(H.SITE + file);
  if (prepare) {
    await tab.evaluate(`(async () => { ${prepare}\n })()`);
    await new Promise((r) => setTimeout(r, 600));
  }
  const S = { ...H.PROJECT.sections, ...(sections || {}) };
  return tab.evaluate(`(() => {
    const layoutOf = (sec) => (${S.layout});
    return [...document.querySelectorAll(${JSON.stringify(S.selector)})].filter((s) => s.getClientRects().length).map((sec) => {
      const shown = (el) => { const cs = getComputedStyle(el); return cs.visibility !== "hidden" && cs.opacity !== "0" && !/rgba\\(\\d+, \\d+, \\d+, 0\\)|transparent/.test(cs.color); };
      const strings = new Set();
      for (const el of sec.querySelectorAll("*")) {
        if (!el.getClientRects().length || el.closest("[hidden], .visually-hidden, .sr-only, script, style, option, progress, dialog")) continue;
        if (el.closest("details:not([open])") && !el.closest("summary")) continue; // collapsed disclosure content
        if (!shown(el)) continue;
        if ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) strings.add(el.textContent.replace(/\\s+/g, " ").trim());
      }
      const full = sec.textContent + " " + [...sec.querySelectorAll("input, textarea, select")].map((i) => i.value || i.placeholder || "").join(" ") + " " + [...sec.querySelectorAll("[aria-label]")].map((e) => e.getAttribute("aria-label")).join(" ");
      const photos = new Set();
      for (const el of [sec, ...sec.querySelectorAll("*")]) {
        if (!el.getClientRects().length || el.closest("[hidden], [aria-hidden=true].slide")) continue;
        if (el.tagName === "IMG" && el.currentSrc && !/\\.svg/.test(el.currentSrc)) photos.add(el.currentSrc);
        const m = getComputedStyle(el).backgroundImage.match(/url\\(["']?([^"')]+)/);
        if (m && !/\\.svg|^data:/.test(m[1])) photos.add(m[1]);
      }
      return { layout: layoutOf(sec), strings: [...strings], full, imgs: [...photos] };
    });
  })()`);
}

// Per section of a Figma page frame (Header/Footer instances skipped): layout key (set by H.build), visible text
// strings, number of distinct images shown.
async function figmaSections(frameName) {
  return H.run(H.FIND_FRAME + `
await figma.loadAllPagesAsync();
const hit = findFrame(${JSON.stringify(frameName)});
if (!hit) return null;
const f = hit.f;
const shown = (n, top) => { for (let x = n; x && x !== top; x = x.parent) if (x.visible === false) return false; return true; };
return f.children.filter((s) => !(s.type === "INSTANCE" && /^(Header|Footer)/.test(s.name))).map((s) => {
  const strings = [];
  const hashes = new Set();
  for (const n of [s, ...s.findAll(() => true)]) {
    if (!shown(n, s)) continue;
    if (n.type === "TEXT") strings.push(...n.characters.split(/\\n\\n+/));
    if (Array.isArray(n.fills)) for (const p of n.fills) if (p.type === "IMAGE" && p.visible !== false) hashes.add(p.imageHash);
  }
  return { name: s.name, layout: s.getPluginData("layout") || null, strings, imgs: hashes.size };
});`);
}

// Per changed section: added = HTML strings missing in Figma, removed = Figma strings no longer in the HTML,
// imgs = [html count, figma count]. Sections are matched by layout key (n-th "faq-split" ↔ n-th "faq-split");
// a section only on one side is reported as missingInFigma / missingInHtml. Empty `sections` = frame matches HTML.
// opts: {prepare, sections} as in project.json → pages[] (same UI state as the build).
export async function diffPage(tab, file, frameName, opts = {}) {
  const html = await htmlSections(tab, file, opts);
  const fig = await figmaSections(frameName);
  if (!fig) return { file, frameName, missingFrame: true };
  const keyed = (list) => {
    const seen = {};
    return list.map((s, i) => ({ ...s, key: (s.layout || "#" + i) + ":" + (seen[s.layout || "#" + i] = (seen[s.layout || "#" + i] || 0) + 1) }));
  };
  const H2 = keyed(html), F2 = keyed(fig);
  const sections = [];
  for (const key of [...new Set([...H2.map((s) => s.key), ...F2.map((s) => s.key)])]) {
    const h = H2.find((s) => s.key === key), g = F2.find((s) => s.key === key);
    const hs = (h ? h.strings : []).filter((s) => compact(s).length > 1);
    const gs = (g ? g.strings : []).filter((s) => compact(s).length > 1);
    const gAll = compact(gs.join("")), hAll = compact(h ? h.full : "");
    const added = hs.filter((s) => !gAll.includes(compact(s)));
    const removed = gs.filter((s) => !hAll.includes(compact(s)));
    const imgs = [h ? h.imgs.length : 0, g ? g.imgs : 0];
    if (!h || !g || added.length || removed.length || imgs[0] !== imgs[1]) {
      sections.push({ key, layout: (h || g).layout, figma: g && g.name, missingInFigma: !g, missingInHtml: !h, added, removed, imgs, htmlImgs: h ? h.imgs : [] });
    }
  }
  return { file, frameName, sectionCount: [html.length, fig.length], sections };
}
// Every project.json → pages[] entry, in its own UI state (prepare) and device.
export async function diffAll(tab) {
  const out = [];
  for (const p of H.PROJECT.pages) out.push(await diffPage(tab, p.file, H.frameOf(p), { prepare: p.prepare, sections: p.sections, device: p.device }));
  return out;
}
