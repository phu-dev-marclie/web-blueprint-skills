/* browser-checks.js — Gate B probe. Evaluate this file's source in a loaded wireframe page
   (any driver: omp browser `tab.evaluate(src)`, Playwright `page.evaluate(src)`); it returns a
   Promise of a JSON report. Layout checks run first, then every widget on the page is
   exercised and its observed state asserted. Console errors are collected by the driver.

   Report: { page, width, overflow, offenders[], imgs, emptyPh, colour[], headerOut[], headings[],
             typeGrid[], container[], widgets: [{ type, ok, detail }] , ok }                          */
(async () => {
  const W = document.documentElement.clientWidth;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const shown = el => !!el && !el.hidden && !el.closest("[hidden]") && el.getClientRects().length > 0;
  const label = el => el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") +
    (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "");
  const out = { page: location.pathname.split("/").pop() || "index.html", width: W, widgets: [] };
  const widget = (type, ok, detail) => out.widgets.push({ type, ok: !!ok, detail });

  /* ---------- layout */
  out.overflow = document.documentElement.scrollWidth - W;
  const clipped = el => { for (let p = el.parentElement; p; p = p.parentElement) {
    const o = getComputedStyle(p).overflowX; if (o !== "visible") return true; } return false; };
  out.offenders = $$("body *").filter(el => shown(el) && el.getBoundingClientRect().right > W + 1 && !clipped(el))
    .slice(0, 6).map(el => label(el) + " right=" + Math.round(el.getBoundingClientRect().right));
  out.imgs = $$("img").length;
  out.emptyPh = $$(".w-photo").filter(el => !el.textContent.trim()).length;
  const colourful = v => { const m = v.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/);
    if (!m || (m[4] !== undefined && +m[4] === 0)) return false;
    const [r, g, b] = [+m[1], +m[2], +m[3]]; return Math.max(r, g, b) - Math.min(r, g, b) > 10; };
  // grayscale gate: the whole page, or only the image slots when the UI refine layer is declared
  // (<html data-style="on">, set by build.py from site.config.json "style": true)
  out.colour = [];
  const styleLayer = document.documentElement.getAttribute("data-style") === "on";
  for (const el of $$(styleLayer ? ".w-photo" : "body *").slice(0, 4000)) {
    const cs = getComputedStyle(el);
    for (const p of ["color", "backgroundColor", "borderTopColor"]) {
      if (colourful(cs[p]) && out.colour.length < 6) out.colour.push(label(el) + " " + p + "=" + cs[p]);
    }
  }
  // header dropdowns must stay inside the viewport when opened (hover/focus-within menus)
  out.headerOut = [];
  const header = document.querySelector("header");
  if (header) {
    for (const t of $$("a, button", header).filter(shown)) {
      t.focus();
      t.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      await sleep(0);
      for (const el of $$("*", header).filter(shown)) {
        const r = el.getBoundingClientRect();
        if (r.width && (r.right > W + 1 || r.left < -1) && out.headerOut.length < 6) {
          out.headerOut.push(label(t) + " opens " + label(el) + " [" + Math.round(r.left) + "," + Math.round(r.right) + "]");
        }
      }
      t.blur();
    }
  }
  // headings break by meaning (phase-5 rule 9): no lone last word under a fuller line, no line
  // that ends one sentence and starts the next, no word pushed past the heading box
  out.headings = [];
  for (const h of $$("h1, h2, h3, h4, h5, h6, p[class*='__title']").filter(el => shown(el) && !el.closest(".w-visually-hidden"))) {
    const words = [];
    const tw = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      for (const m of n.textContent.matchAll(/[^\s\u00a0]+/g)) {
        const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
        const rects = r.getClientRects();
        if (rects.length) words.push({ w: m[0], top: rects[0].top, right: rects[rects.length - 1].right });
      }
    }
    const lines = [];
    for (const w of words) {
      const l = lines[lines.length - 1];
      if (l && Math.abs(l.top - w.top) < 6) l.ws.push(w.w); else lines.push({ top: w.top, ws: [w.w] });
    }
    const n = lines.length, issues = [];
    if (n > 1 && lines[n - 1].ws.length === 1 && lines[n - 2].ws.length > 1) issues.push("lone last word");
    if (lines.slice(0, -1).some(l => l.ws.slice(0, -1).some(w => /[.?!]$/.test(w) && !/^\d+\.$/.test(w)))) issues.push("sentence split across lines");
    const right = h.getBoundingClientRect().right;
    if (words.some(w => w.right > right + 2)) issues.push("word overflows heading");
    if (issues.length && out.headings.length < 12) out.headings.push(label(h) + " [" + lines.map(l => l.ws.join(" ")).join(" / ") + "] " + issues.join(", "));
  }
  // type tokens: every visible text line height is font-size × one of the --line-height-* tokens (tokens.py)
  out.typeGrid = [];
  const rootCs = getComputedStyle(document.documentElement);
  const lhRatios = ["xs", "s", "m", "l", "xl"].map(s => parseFloat(rootCs.getPropertyValue("--line-height-" + s))).filter(n => !isNaN(n));
  const textTags = "h1, h2, h3, h4, h5, h6, p, li, a, button, label, summary, td, th, dt, dd, small, strong, span, legend, figcaption, blockquote";
  const seenType = new Set();
  for (const el of $$(textTags).filter(el => shown(el) && !el.closest(".w-visually-hidden, svg"))) {
    if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    const cs = getComputedStyle(el), lh = parseFloat(cs.lineHeight), fs = parseFloat(cs.fontSize);
    const key = cs.fontSize + "/" + cs.lineHeight;
    if ((isNaN(lh) || !lhRatios.some(r => Math.abs(lh - fs * r) < 0.6)) && !seenType.has(key) && out.typeGrid.length < 8) {
      seenType.add(key);
      out.typeGrid.push(label(el) + " " + key);
    }
  }

  // Bricks container theme style (base.css, tokens.py): 62.5 % root (1rem = 10px); every data-brx container is
  // min(viewport, --max-screen-width) wide with --container-padding at each side — sections never change either
  out.container = [];
  if (Math.abs(parseFloat(rootCs.fontSize) - 10) > 0.01) out.container.push("root font-size " + rootCs.fontSize + " (62.5 % = 10px)");
  const maxW = parseFloat(rootCs.getPropertyValue("--max-screen-width"));
  const probe = document.createElement("div");
  probe.style.cssText = "position:absolute;visibility:hidden;width:var(--container-padding)";
  document.body.appendChild(probe);
  const padW = probe.getBoundingClientRect().width;
  probe.remove();
  for (const c of $$('[data-brx="container"]').filter(shown)) {
    const cs = getComputedStyle(c), w = c.getBoundingClientRect().width, want = Math.min(W, maxW);
    const bad = Math.abs(w - want) > 1 ? "width " + Math.round(w) + " (want " + Math.round(want) + ")"
      : Math.abs(parseFloat(cs.paddingLeft) - padW) > 0.5 || Math.abs(parseFloat(cs.paddingRight) - padW) > 0.5
        ? "padding " + cs.paddingLeft + " / " + cs.paddingRight + " (want " + padW.toFixed(1) + "px)" : "";
    if (bad && out.container.length < 6) out.container.push(label(c) + " " + bad);
  }

  /* ---------- widgets */
  for (const root of $$("[data-slider]")) {
    const c = root.querySelector("[data-slider-counter]"), nx = root.querySelector("[data-slider-next]");
    if (!c || !nx) { widget("slider", false, "missing counter or next"); continue; }
    const before = c.textContent.trim(); nx.click(); await sleep(30);
    widget("slider", c.textContent.trim() !== before, before + " -> " + c.textContent.trim());
  }
  for (const nav of $$("[data-tabs]")) {
    const links = $$("a", nav); let ok = links.length > 1, detail = links.length + " tabs";
    for (const a of links) {
      a.click(); await sleep(10);
      const id = (a.getAttribute("href") || "").split("#")[1];
      const visible = links.map(l => document.getElementById((l.getAttribute("href") || "").split("#")[1]))
        .filter(p => p && !p.hidden);
      if (visible.length !== 1 || visible[0].id !== id) { ok = false; detail = "tab #" + id + " shows " + visible.length + " panels"; }
    }
    widget("tabs", ok, detail);
  }
  for (const root of $$("[data-gallery]")) {
    const thumbs = $$("[data-thumb]", root), main = root.querySelector("[data-gallery-main]");
    const t = thumbs[thumbs.length - 1];
    if (!t || !main) { widget("gallery", false, "missing thumbs or main"); continue; }
    t.click(); await sleep(10);
    const want = t.getAttribute("data-caption") || t.textContent.trim();
    widget("gallery", main.textContent.trim() === want.trim(), thumbs.length + " thumbs");
  }
  for (const root of $$("[data-chooser]")) {
    const results = $$("[data-when]", root), empty = root.querySelector("[data-chooser-empty]");
    const reset = root.querySelector("[data-chooser-reset]");
    let ok = results.length > 0, bad = [];
    for (const r of results) {
      $$("input", root).forEach(i => { i.checked = false; });
      for (const tok of r.getAttribute("data-when").trim().split(/\s+/)) {
        const [k, v] = tok.split("=");
        const inp = root.querySelector(`input[name="${k}"][value="${(v || "").split("|")[0]}"]`);
        if (inp) { inp.checked = true; inp.dispatchEvent(new Event("change", { bubbles: true })); }
        else bad.push("no input " + k + "=" + v);
      }
      await sleep(5);
      if (r.hidden) bad.push("result hidden for " + r.getAttribute("data-when"));
      if (empty && !empty.hidden) bad.push("empty state visible with answers");
    }
    if (reset) {
      reset.click(); await sleep(5);
      if (results.some(r => !r.hidden)) bad.push("reset leaves results visible");
      if (empty && empty.hidden) bad.push("reset hides the empty state");
    }
    widget("chooser", ok && !bad.length, bad.length ? bad.slice(0, 3).join("; ") : results.length + " results");
  }
  const fill = scope => $$("input, select, textarea", scope).forEach(el => {
    if (el.disabled || el.type === "hidden" || el.type === "file") return;
    if (el.type === "checkbox") { if (el.required) el.checked = true; return; }
    if (el.type === "radio") { if (el.required && !scope.querySelector(`input[name="${el.name}"]:checked`)) el.checked = true; return; }
    if (el.tagName === "SELECT") { const o = $$("option", el).find(o => o.value); if (o) el.value = o.value; return; }
    if (el.value) return;
    el.value = { email: "test@example.com", tel: "+1 555 0100", url: "https://example.com",
      number: el.min || "1", date: "2030-01-01" }[el.type] || "Test";
  });
  // forms inside inactive tab panels are hidden but must still confirm
  const confirmed = f => { const n = f.querySelector("[data-form-sent]"); return !!n && !n.hidden && !!n.textContent.trim(); };
  for (const f of $$("form[data-wizard]")) {
    const panels = $$("[data-wizard-panel]", f), nx = f.querySelector("[data-wizard-next]");
    const at = () => panels.findIndex(p => !p.hidden);
    let bad = [];
    const req = $$("[required]", panels[0]);
    // prefilled mockup values (a sample guest) are restored after the empty-field check
    if (req.length && nx) {
      const kept = req.map(el => el.type === "checkbox" || el.type === "radio" ? el.checked : el.value);
      req.forEach(el => { if (el.type === "checkbox" || el.type === "radio") el.checked = false; else el.value = ""; });
      nx.click(); await sleep(5); if (at() !== 0) bad.push("advanced with empty required fields");
      req.forEach((el, k) => { if (el.type === "checkbox" || el.type === "radio") el.checked = kept[k]; else el.value = kept[k]; });
    }
    for (let k = 0; k < panels.length - 1; k++) {
      fill(panels[at()]); nx.click(); await sleep(5);
      if (at() !== k + 1) { bad.push("stuck on step " + (k + 1)); break; }
    }
    // a recap "Edit" button ([data-wizard-goto]) must lead back to its step
    const edit = f.querySelector("[data-wizard-goto]");
    if (!bad.length && edit && shown(edit)) {
      const last = at(), to = parseInt(edit.getAttribute("data-wizard-goto"), 10) || 0;
      edit.click(); await sleep(5);
      if (at() !== to) bad.push("Edit does not return to step " + (to + 1));
      for (let k = at(); k < last; k++) { fill(panels[at()]); nx.click(); await sleep(5); }
    }
    // a wizard that posts to a real page (thank-you page for conversion tracking) is not submitted —
    // the probe would leave the page; it asserts the last step is valid and the action is a page
    const navigates = !f.hasAttribute("data-demo-form");
    if (!bad.length && navigates) {
      fill(panels[at()]);
      const act = f.getAttribute("action") || "";
      if (!f.checkValidity()) bad.push("last step invalid with filled fields");
      if (!/\.html(\?|#|$)/.test(act)) bad.push("no data-demo-form and no page in action");
    } else if (!bad.length) { fill(panels[at()]); f.requestSubmit(f.querySelector("[data-wizard-submit]") || undefined); await sleep(20);
      if (!confirmed(f)) bad.push("no confirmation after submit");
      const done = f.querySelector("[data-wizard-done]");
      if (done && (!shown(done) || panels.some(p => !p.hidden))) bad.push("done panel does not replace the steps"); }
    widget("wizard", !bad.length, bad.join("; ") || panels.length + " steps" + (navigates ? " → " + f.getAttribute("action") : ""));
  }
  // quiz (interactions-contract §18): an empty question does not advance; first answers to the end give
  // ranked items (≤ data-quiz-show, one best match), shows any reveals; a result submit button (formaction =
  // a page, e.g. "email me my matches") is valid once filled and carries the picks; Start again returns to question 1
  for (const f of $$("form[data-quiz]")) {
    const bad = [], steps = $$("[data-quiz-step]", f), result = f.querySelector("[data-quiz-result]");
    const nx = f.querySelector("[data-quiz-next]"), fin = f.querySelector("[data-quiz-finish]");
    const at = () => steps.findIndex(s => !s.hidden);
    $$("input", f).forEach(x => { if (x.type === "radio" || x.type === "checkbox") x.checked = false; });
    if (nx && steps.length > 1) { nx.click(); await sleep(5); if (at() !== 0) bad.push("advanced with no answer"); }
    for (let k = 0; k < steps.length && !bad.length; k++) {
      const first = steps[at()] && steps[at()].querySelector("input");
      if (!first) { bad.push("question " + (k + 1) + " has no input"); break; }
      first.checked = true; first.dispatchEvent(new Event("change", { bubbles: true }));
      const btn = k < steps.length - 1 ? nx : fin;
      if (!btn) { bad.push("no " + (k < steps.length - 1 ? "Continue" : "finish") + " button"); break; }
      btn.click(); await sleep(5);
      if (k < steps.length - 1 && at() !== k + 1) bad.push("stuck on question " + (k + 1));
    }
    let detail = "";
    if (!bad.length) {
      const items = $$("[data-quiz-item]", f).filter(el => !el.hidden), max = parseInt(f.getAttribute("data-quiz-show"), 10) || 3;
      const empty = f.querySelector("[data-quiz-empty]");
      if (!result || result.hidden) bad.push("no result after the last question");
      if (!items.length && !(empty && !empty.hidden)) bad.push("no items and no empty state");
      if (items.length > max) bad.push(items.length + " items shown, max " + max);
      const scores = items.map(el => +el.getAttribute("data-quiz-score"));
      if (scores.some((s, k) => k && s > scores[k - 1])) bad.push("items not ranked by score");
      if ($$("[data-quiz-best]", f).filter(b => !b.hidden).length > 1) bad.push("more than one best match");
      const reveals = f.id ? $$(`[data-quiz-reveal="${f.id}"]`) : [];
      reveals.filter(r => r.hidden).forEach(r => bad.push("reveal still hidden: " + label(r)));
      for (const rf of reveals.flatMap(r => r.tagName === "FORM" ? [r] : $$("form", r)).filter(x => !x.hasAttribute("data-demo-form"))) {
        fill(rf);
        if (!rf.checkValidity()) bad.push("revealed form invalid when filled");
        if (!/\.html(\?|#|$)/.test(rf.getAttribute("action") || "")) bad.push("revealed form posts to no page");
      }
      detail = steps.length + " questions → " + items.length + " items (" + scores.join("/") + ")" + (reveals.length ? ", " + reveals.length + " reveal" : "");
      for (const b of $$("button[formaction], input[type=submit][formaction]", result || f)) {
        const kept = $$("input:not([type=radio]):not([type=hidden]), textarea", result).map(el => el.type === "checkbox" ? el.checked : el.value);
        fill(result);
        if (!f.checkValidity()) bad.push("result form invalid when filled");
        if (!/\.html(\?|#|$)/.test(b.getAttribute("formaction") || "")) bad.push("result submit posts to no page");
        const pk = f.querySelector("[data-quiz-picks]");
        if (pk && pk.value.split(",").filter(Boolean).length !== items.length) bad.push("picks field does not list the shown items");
        $$("input:not([type=radio]):not([type=hidden]), textarea", result).forEach((el, k) => { if (el.type === "checkbox") el.checked = kept[k]; else el.value = kept[k]; });
        detail += " → " + b.getAttribute("formaction");
      }
      const reset = f.querySelector("[data-quiz-reset]");
      if (reset) { reset.click(); await sleep(5); if (at() !== 0 || !result.hidden) bad.push("Start again does not return to question 1"); }
    }
    widget("quiz", !bad.length, bad.join("; ") || detail);
  }
  // countdown (interactions-contract §19): a visible timer shows h:mm:ss and is lower a second later
  for (const c of $$("[data-countdown]").filter(shown)) {
    const read = () => $$("[data-countdown-h], [data-countdown-m], [data-countdown-s], [data-countdown-out]", c)
      .map(n => n.textContent.trim()).join(":").split(":").reduce((a, n) => a * 60 + (parseInt(n, 10) || 0), 0);
    const t0 = read(); await sleep(1100); const t1 = read();
    const ended = c.classList.contains("is-expired");
    widget("countdown", ended || (t0 > 0 && t1 < t0), ended ? "expired" : t0 + "s → " + t1 + "s");
  }
  // coupon (interactions-contract §15): Apply with a code shows the applied state and swaps every
  // [data-coupon-price]; Remove restores the full prices
  for (const c of $$("[data-coupon]").filter(shown)) {
    const bad = [], input = c.querySelector("input"), apply = c.querySelector("[data-coupon-apply]");
    const remove = c.querySelector("[data-coupon-remove]"), applied = c.querySelector("[data-coupon-applied]");
    if (!input || !apply || !applied) { widget("coupon", false, "missing input / apply / applied state"); continue; }
    const prices = $$("[data-coupon-price]");
    const kept = input.value;
    input.value = ""; apply.click(); await sleep(5);
    if (!applied.hidden) bad.push("empty code applied");
    input.value = kept || "TEST10"; apply.click(); await sleep(5);
    if (applied.hidden) bad.push("applied state hidden after Apply");
    if (prices.some(p => p.textContent.trim() !== p.getAttribute("data-coupon-price"))) bad.push("prices not switched");
    if (remove) { remove.click(); await sleep(5);
      if (!applied.hidden) bad.push("Remove keeps the coupon");
      if (prices.some(p => p.textContent.trim() !== p.getAttribute("data-coupon-full"))) bad.push("prices not restored"); }
    widget("coupon", !bad.length, bad.join("; ") || prices.length + " prices");
  }
  // table of contents (interactions-contract §17): every link has a target; scrolled to the last
  // section, its link is marked aria-current="true"; back at the top, the first one is
  for (const nav of $$("nav[data-toc]")) {
    const links = $$('a[href^="#"]', nav), bad = [];
    const targets = links.map(a => document.getElementById(decodeURIComponent(a.getAttribute("href").slice(1))));
    if (!links.length) { widget("toc", false, "no in-page links"); continue; }
    if (targets.some(t => !t)) bad.push("link without a target");
    const y0 = scrollY, last = targets[targets.length - 1];
    if (last) {
      window.scrollTo({ top: last.getBoundingClientRect().top + scrollY - 80, behavior: "instant" }); await sleep(80);
      if (links[links.length - 1].getAttribute("aria-current") !== "true") bad.push("last section read, its link not current");
      window.scrollTo({ top: 0, behavior: "instant" }); await sleep(80);
      if (links[0].getAttribute("aria-current") !== "true") bad.push("at the top, the first link is not current");
      window.scrollTo({ top: y0, behavior: "instant" }); await sleep(20);
    }
    widget("toc", !bad.length, bad.join("; ") || links.length + " links");
  }
  // date range picker (interactions-contract §14): the first visible pair opens one popover inside the
  // viewport (the field is scrolled into view first, as a user sees it; the picker may scroll the page
  // smoothly to fit, so wait); two clicks set check-in and check-out (ISO in hidden inputs) and close it
  for (const s of $$("input[data-date-end]").filter(el => shown(el) && !el.closest("dialog")).slice(0, 1)) {
    const bad = [], end = document.getElementById(s.getAttribute("data-date-end"));
    const hid = el => el.parentElement.querySelector('input[type="hidden"]');
    s.scrollIntoView({ block: "center", behavior: "instant" }); await sleep(30);
    s.click(); await sleep(700);
    const dp = $$(".w-datepicker:not(.w-datepicker--inline)").find(d => !d.hidden);
    if (!dp) { widget("date-range", false, "no popover after clicking " + label(s)); continue; }
    const r = dp.getBoundingClientRect();
    if (r.left < -1 || r.right > W + 1 || r.top < -1 || r.bottom > innerHeight + 1) bad.push("popover outside the viewport [" + [r.left, r.top, r.right, r.bottom].map(Math.round) + "]");
    let days = $$(".w-datepicker__day:not(:disabled)", dp);
    if (days.length < 9 && dp.querySelector(".w-datepicker__next")) { dp.querySelector(".w-datepicker__next").click(); await sleep(10); days = $$(".w-datepicker__day:not(:disabled)", dp); }
    if (days.length < 9) bad.push("fewer than 9 selectable days");
    else {
      days[2].click(); await sleep(10);
      const days2 = $$(".w-datepicker__day:not(:disabled)", dp);
      days2[8].click(); await sleep(30);
      if (!dp.hidden) bad.push("popover stays open after check-out");
      if (!/^\d{4}-\d{2}-\d{2}$/.test((hid(s) || {}).value || "") || !/^\d{4}-\d{2}-\d{2}$/.test((end && hid(end) || {}).value || "")) bad.push("hidden ISO values not set");
      if (!s.value || !end || !end.value) bad.push("fields show no dates");
    }
    if (!dp.hidden) { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); dp.querySelector("[data-dp-done]") && dp.querySelector("[data-dp-done]").click(); }
    widget("date-range", !bad.length, bad.join("; ") || (s.value + " – " + (end ? end.value : "")));
  }
  for (const f of $$("form[data-demo-form]:not([data-wizard])")) {
    const has = $$("input[type=file][required]", f).length;
    if (has) { widget("form", true, "skipped (required file input)"); continue; }
    fill(f); f.requestSubmit(); await sleep(20);
    widget("form", confirmed(f), (f.id || f.getAttribute("aria-label") || "form") + (confirmed(f) ? "" : " no confirmation"));
  }
  const toggle = document.querySelector("[data-nav-toggle]"), panel = document.querySelector("[data-nav-panel]");
  if (toggle && panel && shown(toggle)) {
    toggle.click(); await sleep(20);
    const opened = panel.classList.contains("is-open");
    const close = panel.querySelector("[data-nav-close]") || toggle;
    close.click(); await sleep(20);
    widget("mobile-nav", opened && !panel.classList.contains("is-open"), opened ? "open/close" : "did not open");
  }
  // header dropdowns (interactions-contract §10c): click opens the panel inside the viewport,
  // Escape closes it and returns focus to the toggle
  for (const t of $$("[data-menu-toggle][aria-controls]").filter(shown)) {
    const p = document.getElementById(t.getAttribute("aria-controls")), bad = [];
    if (!p) { widget("menu", false, "no panel #" + t.getAttribute("aria-controls")); continue; }
    if (shown(p)) bad.push("panel open before click");
    t.click(); await sleep(20);
    if (!shown(p) || t.getAttribute("aria-expanded") !== "true") bad.push("click does not open");
    else {
      const r = p.getBoundingClientRect();
      if (r.left < -1 || r.right > W + 1) bad.push("panel outside the viewport [" + Math.round(r.left) + "," + Math.round(r.right) + "]");
    }
    t.focus();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); await sleep(20);
    if (shown(p)) bad.push("Escape does not close");
    if (document.activeElement !== t) bad.push("focus not returned to the toggle");
    widget("menu", !bad.length, bad.join("; ") || (t.textContent.trim() || p.id));
  }
  // filter panel (interactions-contract §6b): a sidebar where its trigger is hidden, an off-canvas
  // dialog where the trigger shows; a facet narrows the results and "clear" restores them
  for (const fp of $$("[data-filter-panel]")) {
    const trigger = document.querySelector(`[data-filter-open][aria-controls="${fp.id}"]`);
    const bad = [];
    if (!trigger) { widget("filter-panel", false, "no [data-filter-open] for #" + fp.id); continue; }
    const onScreen = () => { const r = fp.getBoundingClientRect(); return getComputedStyle(fp).visibility !== "hidden" && r.width > 0 && r.right > 1 && r.left > -1 && r.right <= W + 1; };
    if (!shown(trigger)) {
      if (!onScreen()) bad.push("sidebar not visible while its trigger is hidden");
      if (fp.scrollHeight > fp.clientHeight + 1) bad.push("sidebar scrolls inside (" + fp.scrollHeight + " > " + fp.clientHeight + ")");
      const cs = getComputedStyle(fp);
      if (cs.position === "sticky" && parseFloat(cs.top) + fp.offsetHeight > innerHeight + 1) bad.push("sticky sidebar cut off below the viewport");
    } else {
      if (onScreen()) bad.push("drawer visible before opening");
      trigger.click(); await sleep(320);
      if (!fp.classList.contains("is-open") || !onScreen()) bad.push("drawer not on screen after opening");
      if (fp.getAttribute("role") !== "dialog" || !fp.contains(document.activeElement)) bad.push("open drawer is not a focused dialog");
      // nothing inside the open drawer may stick out sideways (it clips: e.g. a footer with two
      // nowrap buttons wider than a 342 px drawer) — measured as opened and with a filter on, which
      // reveals the footer's "Clear all"
      const sticksOut = () => { const pr = fp.getBoundingClientRect();
        return $$("*", fp).filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden" && (r.right > pr.right + 1 || r.left < pr.left - 1); })
          .map(el => el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/)[0] : "")).slice(0, 3); };
      let out = sticksOut();
      const box = $$('input[type="checkbox"][data-facet]', fp)[0];
      if (!out.length && box) { box.click(); await sleep(120); out = sticksOut(); box.click(); await sleep(120); }
      if (out.length) bad.push("drawer content wider than the drawer: " + out.join(", "));
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); await sleep(320);
      if (fp.classList.contains("is-open") || onScreen()) bad.push("Escape does not close the drawer");
      if (document.activeElement !== trigger) bad.push("focus not returned to the trigger");
      if (document.body.style.overflow) bad.push("page scroll still locked");
      trigger.click(); await sleep(320);
      const closer = $$("[data-filter-close]", fp).pop();
      if (!closer) bad.push("no [data-filter-close] in the drawer");
      else { closer.click(); await sleep(320); if (fp.classList.contains("is-open")) bad.push("[data-filter-close] does not close the drawer"); }
    }
    const root = fp.closest("[data-catalog]");
    if (root) {
      const cards = $$("[data-product]", root), visible = () => cards.filter(c => !c.hidden).length;
      const all = visible(), radios = $$('input[type="radio"][data-facet]', fp);
      const pick = radios[radios.length - 1] || $$("[data-facet]", fp)[0];
      if (pick) {
        pick.click(); await sleep(10);
        const narrowed = visible();
        const label = root.querySelector("[data-result-label]");
        if (label && narrowed > 0 && !label.textContent.includes(String(narrowed))) bad.push("result label does not show " + narrowed);
        const clear = root.querySelector("[data-clear-filters]");
        if (!clear || clear.hidden) bad.push("no visible clear-filters with a filter on");
        else {
          clear.click(); await sleep(10);
          if (visible() !== all) bad.push("clear leaves " + visible() + "/" + all + " results");
          if (pick.type === "radio" && !root.querySelector(`input[type="radio"][name="${pick.name}"]:checked`)) bad.push("clear leaves radio group '" + pick.name + "' empty");
        }
      }
    }
    widget("filter-panel", !bad.length, bad.join("; ") || (shown(trigger) ? "drawer" : "sidebar"));
  }
  // catalogue keyword search (interactions-contract §6c): a word from the first card narrows the
  // results and keeps that card, a nonsense term shows the empty state, clear-all restores all
  for (const s of $$("[data-catalog-search]")) {
    const root = s.closest("[data-catalog]"), bad = [];
    if (!root) { widget("catalog-search", false, "[data-catalog-search] outside [data-catalog]"); continue; }
    if (!s.labels || !s.labels.length) { if (!s.getAttribute("aria-label")) bad.push("search field has no label"); }
    const cards = $$("[data-product]", root), visible = () => cards.filter(c => !c.hidden);
    const all = visible().length, first = cards[0];
    const word = ((first.querySelector("h2, h3, [class*='__title']") || first).textContent.match(/[\p{L}]{5,}/u) || [""])[0];
    const type = v => { s.value = v; s.dispatchEvent(new Event("input", { bubbles: true })); };
    type(word); await sleep(10);
    if (!word || !visible().includes(first)) bad.push("searching '" + word + "' hides the card it came from");
    type("zzqxw"); await sleep(10);
    const empty = root.querySelector("[data-empty]");
    if (visible().length) bad.push("nonsense term still shows " + visible().length + " results");
    if (empty && empty.hidden) bad.push("empty state hidden with 0 results");
    const clear = $$("[data-clear-filters]", root).find(shown);
    if (!clear) bad.push("no visible clear-filters while searching");
    else { clear.click(); await sleep(10); if (s.value || visible().length !== all) bad.push("clear leaves '" + s.value + "', " + visible().length + "/" + all + " results"); }
    widget("catalog-search", !bad.length, bad.join("; ") || "'" + word + "'");
  }
  // modal dialogs (interactions-contract §10b): the visible opener shows a modal with focus inside,
  // fully on screen; its close control closes it and focus returns to the opener
  for (const d of $$("dialog[data-dialog]")) {
    const openers = $$(`[data-dialog-open="${d.id}"]`).filter(shown);
    // prefer an opener that targets a later slide, so "opens at the photo clicked" is exercised
    const opener = openers.slice().reverse().find(o => { const t = document.getElementById(o.getAttribute("data-dialog-show") || ""); return t && t.hasAttribute("data-slide") && t.previousElementSibling; }) || openers[0];
    if (!opener) continue;
    const bad = [];
    opener.click(); await sleep(30);
    const want = document.getElementById(opener.getAttribute("data-dialog-show") || "");
    if (want && want.hasAttribute("data-slide") && !want.classList.contains("is-active")) bad.push("lightbox did not open at #" + want.id);
    if (want && want.hasAttribute("data-slide") && $$("[data-slide]", want.closest("[data-slider]")).filter(s => s.getClientRects().length).length !== 1) bad.push("lightbox shows more than one slide");
    if (!d.open || !d.matches(":modal")) bad.push("does not open as a modal");
    else {
      const r = d.getBoundingClientRect();
      if (!d.contains(document.activeElement)) bad.push("focus not inside the dialog");
      if (r.left < -1 || r.right > W + 1 || r.top < -1 || r.bottom > innerHeight + 1) bad.push("dialog outside the viewport");
      if (d.scrollWidth > d.clientWidth + 1) bad.push("dialog scrolls sideways");
    }
    const c = d.querySelector("[data-dialog-close]");
    if (c) { c.click(); await sleep(30); } else bad.push("no [data-dialog-close]");
    if (d.open) { bad.push("close control does not close"); d.close(); }
    if (document.activeElement !== opener) bad.push("focus not returned to the opener");
    if (document.body.style.overflow) bad.push("page scroll still locked");
    widget("dialog", !bad.length, bad.join("; ") || d.id);
  }

  out.ok = out.overflow === 0 && !out.offenders.length && !out.imgs && !out.emptyPh &&
    !out.colour.length && !out.headerOut.length && !out.headings.length && !out.typeGrid.length && !out.container.length &&
    out.widgets.every(w => w.ok);
  return out;
})()
